"""
Prepare the live backend (Lambda wmd-backend) for login + saved petitions,
for a Cognito user pool that was created by hand in the console.

  python scripts/setup_petitions_backend.py           -> preview only (reads AWS, changes nothing)
  python scripts/setup_petitions_backend.py --apply   -> make the changes

What --apply does (each step is skipped if already done):
  1. Creates the DynamoDB table "Petitions" exactly as in aws/template.yaml
     (key userSub + petitionId, LSI userSub-createdAt-index, GSI schoolId-createdAt-index
     with only non-personal fields, on-demand billing, point-in-time recovery).
  2. Adds an inline policy to the Lambda's execution role: read/write on Petitions and its
     indexes, and cognito-idp:AdminGetUser on the user pool.
  3. Adds COGNITO_USER_POOL_ID, COGNITO_WEB_CLIENT_ID, COGNITO_MOBILE_CLIENT_ID and
     PETITIONS_TABLE_NAME to the Lambda's environment, keeping every existing variable.

It does NOT deploy code. Afterwards run: python scripts/deploy_lambda.py
Values come from .env (pool + web client) and mobile/app.json (mobile client).
Never prints secret values.
"""
import json
import os
import sys

import boto3
import dotenv

APPLY = '--apply' in sys.argv
FUNCTION = 'wmd-backend'
TABLE = 'Petitions'
POLICY_NAME = 'wmd-petitions-auth-access'

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
dotenv.load_dotenv(os.path.join(project_root, '.env'))

region = os.getenv('AWS_REGION', 'ap-south-1')
session_kwargs = {'region_name': region}
key = os.getenv('APP_AWS_ACCESS_KEY_ID') or os.getenv('AWS_ACCESS_KEY_ID')
secret = os.getenv('APP_AWS_SECRET_ACCESS_KEY') or os.getenv('AWS_SECRET_ACCESS_KEY')
if key and secret:
    session_kwargs['aws_access_key_id'] = key
    session_kwargs['aws_secret_access_key'] = secret
    if os.getenv('AWS_SESSION_TOKEN'):
        session_kwargs['aws_session_token'] = os.getenv('AWS_SESSION_TOKEN')
session = boto3.Session(**session_kwargs)
ddb = session.client('dynamodb')
lam = session.client('lambda')
iam = session.client('iam')


def fail(msg):
    raise SystemExit(f'\nSTOP: {msg}')


def env_value(*names):
    for n in names:
        v = (os.getenv(n) or '').strip().strip('"')
        if v:
            return v
    return ''


# ---------------------------------------------------------------- inputs
pool_id = env_value('COGNITO_USER_POOL_ID', 'VITE_COGNITO_USER_POOL_ID')
web_client_id = env_value('COGNITO_WEB_CLIENT_ID', 'VITE_COGNITO_WEB_CLIENT_ID')
with open(os.path.join(project_root, 'mobile', 'app.json'), encoding='utf-8') as f:
    mobile_client_id = (json.load(f)['expo'].get('extra', {}).get('cognitoClientId') or '').strip()

if not pool_id or not web_client_id:
    fail('COGNITO_USER_POOL_ID / COGNITO_WEB_CLIENT_ID (or the VITE_ versions) missing in .env')
if not mobile_client_id:
    fail('expo.extra.cognitoClientId missing in mobile/app.json')
if not pool_id.startswith(f'{region}_'):
    fail(f'User pool {pool_id} is not in region {region}')

print(f'Mode: {"APPLY" if APPLY else "PREVIEW (no changes)"}   region: {region}')
print(f'User pool: {pool_id}   web client: {web_client_id}   mobile client: {mobile_client_id}')

# ---------------------------------------------------------------- 1. table
print('\n1. DynamoDB table "Petitions"')
table_arn = None
try:
    t = ddb.describe_table(TableName=TABLE)['Table']
    table_arn = t['TableArn']
    lsis = {i['IndexName'] for i in t.get('LocalSecondaryIndexes', [])}
    gsis = {i['IndexName'] for i in t.get('GlobalSecondaryIndexes', [])}
    keys = {k['AttributeName']: k['KeyType'] for k in t['KeySchema']}
    print(f'   exists ({t["TableStatus"]}), items: {t.get("ItemCount", "?")}')
    if keys != {'userSub': 'HASH', 'petitionId': 'RANGE'}:
        fail(f'existing Petitions table has a different key schema {keys}. Not touching it.')
    if 'userSub-createdAt-index' not in lsis or 'schoolId-createdAt-index' not in gsis:
        fail('existing Petitions table is missing userSub-createdAt-index (LSI) or schoolId-createdAt-index (GSI). '
             'A local index can only be added when a table is created. If the table is empty, delete it '
             '(aws dynamodb delete-table --table-name Petitions --region ap-south-1) and run this script again.')
except ddb.exceptions.ResourceNotFoundException:
    print('   missing -> will be created')
    if APPLY:
        ddb.create_table(
            TableName=TABLE,
            BillingMode='PAY_PER_REQUEST',
            AttributeDefinitions=[
                {'AttributeName': 'userSub', 'AttributeType': 'S'},
                {'AttributeName': 'petitionId', 'AttributeType': 'S'},
                {'AttributeName': 'schoolId', 'AttributeType': 'S'},
                {'AttributeName': 'createdAt', 'AttributeType': 'S'},
            ],
            KeySchema=[
                {'AttributeName': 'userSub', 'KeyType': 'HASH'},
                {'AttributeName': 'petitionId', 'KeyType': 'RANGE'},
            ],
            LocalSecondaryIndexes=[{
                'IndexName': 'userSub-createdAt-index',
                'KeySchema': [
                    {'AttributeName': 'userSub', 'KeyType': 'HASH'},
                    {'AttributeName': 'createdAt', 'KeyType': 'RANGE'},
                ],
                'Projection': {'ProjectionType': 'ALL'},
            }],
            GlobalSecondaryIndexes=[{
                'IndexName': 'schoolId-createdAt-index',
                'KeySchema': [
                    {'AttributeName': 'schoolId', 'KeyType': 'HASH'},
                    {'AttributeName': 'createdAt', 'KeyType': 'RANGE'},
                ],
                'Projection': {
                    'ProjectionType': 'INCLUDE',
                    'NonKeyAttributes': ['authorityName', 'letterSubject', 'status', 'evidenceSummary'],
                },
            }],
        )
        print('   creating... (about a minute)')
        ddb.get_waiter('table_exists').wait(TableName=TABLE)
        ddb.update_continuous_backups(
            TableName=TABLE,
            PointInTimeRecoverySpecification={'PointInTimeRecoveryEnabled': True},
        )
        table_arn = ddb.describe_table(TableName=TABLE)['Table']['TableArn']
        print('   created, point-in-time recovery on')

# ---------------------------------------------------------------- 2. permissions
print('\n2. Lambda execution role permissions')
cfg = lam.get_function_configuration(FunctionName=FUNCTION)
role_name = cfg['Role'].split('/')[-1]
account_id = cfg['FunctionArn'].split(':')[4]
table_arn = table_arn or f'arn:aws:dynamodb:{region}:{account_id}:table/{TABLE}'
policy = {
    'Version': '2012-10-17',
    'Statement': [
        {
            'Effect': 'Allow',
            'Action': ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem',
                       'dynamodb:DeleteItem', 'dynamodb:Query'],
            'Resource': [table_arn, f'{table_arn}/index/*'],
        },
        {
            'Effect': 'Allow',
            'Action': ['cognito-idp:AdminGetUser'],
            'Resource': f'arn:aws:cognito-idp:{region}:{account_id}:userpool/{pool_id}',
        },
    ],
}
print(f'   role: {role_name}  -> inline policy "{POLICY_NAME}"')
existing_env = (cfg.get('Environment') or {}).get('Variables') or {}
if existing_env.get('APP_AWS_ACCESS_KEY_ID'):
    print('   NOTE: the Lambda has APP_AWS_ACCESS_KEY_ID set, so the code uses that IAM user, not the role.')
    print('         Give that IAM user the same permissions (policy printed below), or remove those variables.')
    print(json.dumps(policy, indent=2))
if APPLY:
    iam.put_role_policy(RoleName=role_name, PolicyName=POLICY_NAME, PolicyDocument=json.dumps(policy))
    print('   policy attached')

# ---------------------------------------------------------------- 3. environment
print('\n3. Lambda environment variables (existing ones are kept)')
wanted = {
    'COGNITO_USER_POOL_ID': pool_id,
    'COGNITO_WEB_CLIENT_ID': web_client_id,
    'COGNITO_MOBILE_CLIENT_ID': mobile_client_id,
    'PETITIONS_TABLE_NAME': TABLE,
}
changes = {k: v for k, v in wanted.items() if existing_env.get(k) != v}
print(f'   existing variables kept: {len(existing_env)}')
print(f'   to add/update: {sorted(changes) or "nothing"}')
if APPLY and changes:
    merged = {**existing_env, **changes}
    lam.update_function_configuration(FunctionName=FUNCTION, Environment={'Variables': merged})
    lam.get_waiter('function_updated_v2').wait(FunctionName=FUNCTION)
    after = (lam.get_function_configuration(FunctionName=FUNCTION).get('Environment') or {}).get('Variables') or {}
    missing = [k for k in existing_env if k not in after]
    if missing:
        fail(f'variables lost during update: {missing}')
    print(f'   updated; variables now: {len(after)}')

print('\nDone.' if APPLY else '\nPreview only. Run again with --apply to make these changes.')
if APPLY:
    print('Next: python scripts/deploy_lambda.py')
