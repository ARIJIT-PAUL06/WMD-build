import os
import boto3
import json
import datetime
import dotenv

dotenv.load_dotenv('.env')
region = os.getenv('AWS_REGION', 'ap-south-1')
aws_key = os.getenv('AWS_ACCESS_KEY_ID')
aws_secret = os.getenv('AWS_SECRET_ACCESS_KEY')

session = boto3.Session(
    aws_access_key_id=aws_key,
    aws_secret_access_key=aws_secret,
    region_name=region
)

print("=" * 60)
print("1. AWS IDENTITY & REGION")
print("=" * 60)
sts = session.client('sts')
identity = sts.get_caller_identity()
print(f"Region: {region}")
print(f"Account: {identity.get('Account')}")
print(f"UserId:  {identity.get('UserId')}")
print(f"Arn:     {identity.get('Arn')}")

print("\n" + "=" * 60)
print("2. SAGEMAKER ENDPOINTS")
print("=" * 60)
sagemaker = session.client('sagemaker')
endpoints = sagemaker.list_endpoints()
ep_list = endpoints.get("Endpoints", [])
print(f"Total SageMaker Endpoints Found: {len(ep_list)}")
for ep in ep_list:
    name = ep["EndpointName"]
    status = ep["EndpointStatus"]
    print(f"\nEndpoint Name: {name}")
    print(f"Status:        {status}")
    print(f"Created:       {ep.get('CreationTime')}")
    print(f"Last Modified: {ep.get('LastModifiedTime')}")
    try:
        desc = sagemaker.describe_endpoint(EndpointName=name)
        cfg_name = desc.get("EndpointConfigName")
        print(f"Config Name:   {cfg_name}")
        for pv in desc.get("ProductionVariants", []):
            var_name = pv.get("VariantName")
            weight = pv.get("CurrentWeight")
            instances = pv.get("CurrentInstanceCount")
            serverless = pv.get("ServerlessConfig")
            print(f"Variant: {var_name} | Weight: {weight} | Instances: {instances} | Serverless: {serverless}")
    except Exception as e:
        print(f"Error describing endpoint config: {e}")

print("\n" + "=" * 60)
print("3. AWS LAMBDA ('wmd-backend') CONFIGURATION")
print("=" * 60)
lam = session.client('lambda')
try:
    fn = lam.get_function(FunctionName='wmd-backend')
    conf = fn['Configuration']
    print(f"Function Name:  {conf['FunctionName']}")
    print(f"Runtime:        {conf['Runtime']}")
    print(f"Handler:        {conf['Handler']}")
    print(f"Timeout:        {conf['Timeout']} seconds")
    print(f"Memory:         {conf['MemorySize']} MB")
    print(f"Last Modified:  {conf['LastModified']}")
    print(f"State:          {conf.get('State')}")
    print(f"Code Size:      {conf.get('CodeSize')} bytes ({conf.get('CodeSize', 0)/(1024*1024):.2f} MB)")
    print(f"Role ARN:       {conf.get('Role')}")
    
    env_vars = conf.get('Environment', {}).get('Variables', {})
    print(f"\nLambda Environment Variables ({len(env_vars)} total):")
    for k in sorted(env_vars.keys()):
        val = env_vars[k]
        if any(sec in k.lower() for sec in ['key', 'secret', 'password', 'token']):
            val = '***REDACTED***'
        print(f"  {k} = {val}")
except Exception as e:
    print(f"Error checking Lambda: {e}")

print("\n" + "=" * 60)
print("4. EVENTBRIDGE SCHEDULING RULES")
print("=" * 60)
events = session.client('events')
rules_res = events.list_rules()
rules = rules_res.get('Rules', [])
print(f"Total EventBridge Rules Found: {len(rules)}")
for r in rules:
    print(f"\nRule Name:           {r['Name']}")
    print(f"State:               {r['State']}")
    print(f"Schedule Expression: {r.get('ScheduleExpression')}")
    print(f"Event Pattern:       {r.get('EventPattern')}")
    print(f"Description:         {r.get('Description')}")
    targets = events.list_targets_by_rule(Rule=r['Name'])
    target_list = targets.get('Targets', [])
    print(f"Targets ({len(target_list)}):")
    for t in target_list:
        print(f"  - Target ID: {t.get('Id')}")
        print(f"    Arn:       {t.get('Arn')}")
        print(f"    Input:     {t.get('Input')}")

print("\n" + "=" * 60)
print("5. AMAZON SES CONFIGURATION")
print("=" * 60)
ses = session.client('ses')
try:
    quota = ses.get_send_quota()
    print(f"Max 24-Hour Send Quota: {quota.get('Max24HourSend')}")
    print(f"Max Send Rate:          {quota.get('MaxSendRate')} emails/second")
    print(f"Sent Last 24 Hours:     {quota.get('SentLast24Hours')}")
    
    enabled = ses.get_account_sending_enabled()
    print(f"Account Sending Enabled: {enabled.get('Enabled')}")
    
    identities_res = ses.list_identities()
    identities = identities_res.get('Identities', [])
    print(f"\nVerified / Pending Identities ({len(identities)}):")
    if identities:
        attrs = ses.get_identity_verification_attributes(Identities=identities).get('VerificationAttributes', {})
        for ident in identities:
            ver = attrs.get(ident, {})
            print(f"  - {ident}: Status = {ver.get('VerificationStatus')}")
except Exception as e:
    print(f"Error checking SES: {e}")

print("\n" + "=" * 60)
print("6. DYNAMODB TABLES")
print("=" * 60)
ddb = session.client('dynamodb')
try:
    tables = ddb.list_tables().get('TableNames', [])
    print(f"DynamoDB Tables Found: {tables}")
    for t in tables:
        desc = ddb.describe_table(TableName=t)['Table']
        print(f"  - Table: {t}, Status: {desc.get('TableStatus')}, ItemCount: {desc.get('ItemCount')}")
except Exception as e:
    print(f"Error checking DynamoDB: {e}")
