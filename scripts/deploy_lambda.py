import boto3
import os
import dotenv
import zipfile
import io
import subprocess

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
dotenv.load_dotenv(os.path.join(project_root, '.env'))

region = os.getenv('AWS_REGION', 'ap-south-1')
aws_key = os.getenv('APP_AWS_ACCESS_KEY_ID') or os.getenv('AWS_ACCESS_KEY_ID')
aws_secret = os.getenv('APP_AWS_SECRET_ACCESS_KEY') or os.getenv('AWS_SECRET_ACCESS_KEY')
aws_session = os.getenv('AWS_SESSION_TOKEN')

session_kwargs = {'region_name': region}
if aws_key and aws_secret:
    session_kwargs['aws_access_key_id'] = aws_key
    session_kwargs['aws_secret_access_key'] = aws_secret
    if aws_session:
        session_kwargs['aws_session_token'] = aws_session

session = boto3.Session(**session_kwargs)
lam = session.client('lambda')

print("0. Building Lambda bundle via scripts/build_lambda.mjs...")
subprocess.run('node scripts/build_lambda.mjs', shell=True, check=True, cwd=project_root)

dist_dir = os.path.join(project_root, 'lambda-dist')
print("1. Packaging Lambda bundle from lambda-dist/ recursively...")
buf = io.BytesIO()
with zipfile.ZipFile(buf, 'w', compression=zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(dist_dir):
        for f in files:
            full_path = os.path.join(root, f)
            arcname = os.path.relpath(full_path, dist_dir).replace('\\', '/')
            z.write(full_path, arcname=arcname)

buf.seek(0)
zip_bytes = buf.read()
print(f"   Bundle size: {len(zip_bytes) / 1024 / 1024:.2f} MB")

print("2. Checking guard: verifying COGNITO_USER_POOL_ID in wmd-backend environment...")
cfg = lam.get_function_configuration(FunctionName='wmd-backend')
env = (cfg.get('Environment') or {}).get('Variables') or {}
if not env.get('COGNITO_USER_POOL_ID'):
    raise SystemExit('ABORT: wmd-backend has no COGNITO_USER_POOL_ID. This code requires login and would make drafting return 503. Deploy the CloudFormation stack first (docs/COGNITO_FIX_PLAN_V2.md, Phase C).')

print("3. Code-only deployment to Lambda function 'wmd-backend' (Publishing new version)...")
update_res = lam.update_function_code(
    FunctionName='wmd-backend',
    ZipFile=zip_bytes,
    Publish=True
)

waiter = lam.get_waiter('function_updated_v2')
waiter.wait(FunctionName='wmd-backend')

new_version = update_res.get('Version', 'LATEST')
function_arn = update_res.get('FunctionArn', '')
code_sha256 = update_res.get('CodeSha256', '')

print(f"\n✅ Lambda code deployed successfully!")
print(f"   Published Version: {new_version}")
print(f"   Function ARN:      {function_arn}")
print(f"   Code SHA256:       {code_sha256}")
print("\nℹ️ Environment variables and configuration are managed solely by CloudFormation (aws/template.yaml).")
print(f"🔄 Rollback: If you need to roll back, use AWS CLI:")
print(f"   aws lambda update-function-code --function-name wmd-backend ...")
print(f"   or update an alias pointing to the previous stable version.\n")
