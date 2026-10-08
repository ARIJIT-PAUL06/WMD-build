import boto3
import os
import dotenv
import zipfile
import io
import json

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
dotenv.load_dotenv(os.path.join(project_root, '.env'))

region = os.getenv('AWS_REGION', 'ap-south-1')
aws_key = os.getenv('AWS_ACCESS_KEY_ID')
aws_secret = os.getenv('AWS_SECRET_ACCESS_KEY')

session = boto3.Session(
    aws_access_key_id=aws_key,
    aws_secret_access_key=aws_secret,
    region_name=region
)
lam = session.client('lambda')

import subprocess

print("0. Building lambda-dist/index.mjs via esbuild...")
dist_dir = os.path.join(project_root, 'lambda-dist')
os.makedirs(dist_dir, exist_ok=True)
subprocess.run(
    'npx esbuild server/lambda.js --bundle --platform=node --target=node20 --format=esm --outfile=lambda-dist/index.mjs --external:@aws-sdk/*',
    shell=True,
    check=True,
    cwd=project_root
)

print("1. Packaging Lambda bundle from lambda-dist/index.mjs and model/data files...")
buf = io.BytesIO()
with zipfile.ZipFile(buf, 'w', compression=zipfile.ZIP_DEFLATED) as z:
    z.write(os.path.join(project_root, 'lambda-dist', 'index.mjs'), arcname='index.mjs')
    z.write(os.path.join(project_root, 'ml', 'data', 'spatial_grids.json'), arcname='ml/data/spatial_grids.json')
    z.write(os.path.join(project_root, 'src', 'data', 'schoolsDirectory.json'), arcname='src/data/schoolsDirectory.json')
    z.write(os.path.join(project_root, 'src', 'data', 'authoritiesConfig.json'), arcname='src/data/authoritiesConfig.json')
    z.write(os.path.join(project_root, 'ml', 'model', 'sagemaker_forecast_metadata.json'), arcname='ml/model/sagemaker_forecast_metadata.json')
    z.write(os.path.join(project_root, 'ml', 'model', 'xgboost_forecast_model.json'), arcname='ml/model/xgboost_forecast_model.json')
    buf_path = os.path.join(project_root, 'ml', 'data', 'grid_14day_buffer.json')
    if os.path.exists(buf_path):
        z.write(buf_path, arcname='ml/data/grid_14day_buffer.json')

buf.seek(0)
zip_bytes = buf.read()
print(f"   Bundle size: {len(zip_bytes) / 1024 / 1024:.2f} MB")

print("2. Uploading code to Lambda function 'wmd-backend'...")
lam.update_function_code(FunctionName='wmd-backend', ZipFile=zip_bytes)
waiter = lam.get_waiter('function_updated_v2')
waiter.wait(FunctionName='wmd-backend')
print("   Code updated successfully.")

print("3. Updating environment variables and timeouts...")
updated_env = {
    'ENABLE_AUTONOMOUS_EMAIL_DISPATCH': 'true',
    'DISABLE_AUTOMATIC_MAILING': 'false',
    'COMMAND_CENTRE_EMAIL': 'psubai2006@gmail.com',
    'MONITOR_ALERT_RECIPIENT': 'psubai2006@gmail.com',
    'AWS_SES_VERIFIED_SENDER': 'vayuvitals@gmail.com',
    'SES_SENDER_EMAIL': 'vayuvitals@gmail.com',
    'AWS_SES_REGION': 'us-east-1',
    'SAGEMAKER_REGION': 'ap-south-1',
    'SAGEMAKER_ENDPOINT_NAME': 'wmd-delhi-48h-forecast-endpoint',
    'ADVISORY_THRESHOLD_PM25': '75',
    'BLOCK_EMERGENCY_THRESHOLD_PM25': '105',
    'DYNAMODB_TABLE_NAME': 'AirQualityReadings',
    'NODE_ENV': 'production',
    'APP_AWS_ACCESS_KEY_ID': aws_key,
    'APP_AWS_SECRET_ACCESS_KEY': aws_secret,
    'GEMINI_API_KEY': os.getenv('GEMINI_API_KEY', '')
}

lam.update_function_configuration(
    FunctionName='wmd-backend',
    Timeout=180,
    MemorySize=512,
    Environment={'Variables': updated_env}
)
waiter.wait(FunctionName='wmd-backend')
print("   Configuration updated successfully.")

print("4. Ensuring EventBridge invoke permissions...")
try:
    lam.add_permission(
        FunctionName='wmd-backend',
        StatementId='EventBridgeInvokePermission',
        Action='lambda:InvokeFunction',
        Principal='events.amazonaws.com'
    )
    print("   Permission added for events.amazonaws.com.")
except Exception as e:
    if 'ResourceConflictException' in str(e):
        print("   Permission already exists.")
    else:
        print(f"   Note: {e}")

print("=== Deployment to AWS Lambda Complete ===")
