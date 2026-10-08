"""
Deploy pure single-file xgboost-model to SageMaker Serverless.
"""
import os
import shutil
import tarfile
import time
import boto3
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '..', '.env'))

MODEL_DIR = os.path.join(BASE_DIR, 'model')
JSON_FILE = os.path.join(MODEL_DIR, 'xgboost_forecast_model.json')
XGB_FILE = os.path.join(MODEL_DIR, 'xgboost-model')
TAR_FILE = os.path.join(MODEL_DIR, 'pure_model.tar.gz')

AWS_REGION = os.getenv('AWS_REGION', 'ap-south-1')
S3_BUCKET = os.getenv('SAGEMAKER_MODEL_S3_BUCKET', 'wmd-aqi-dataset-594650681179')
ROLE_ARN = os.getenv('SAGEMAKER_ROLE_ARN', 'arn:aws:iam::594650681179:role/sagemakerexecutionrole03102026')
ENDPOINT_NAME = os.getenv('SAGEMAKER_ENDPOINT_NAME', 'wmd-delhi-48h-forecast-endpoint')
MODEL_NAME = 'wmd-delhi-48h-forecast-xgboost-v3'
ENDPOINT_CONFIG_NAME = f"{ENDPOINT_NAME}-config-v3"

# 1. Ensure xgboost-model is the valid JSON model
shutil.copyfile(JSON_FILE, XGB_FILE)

# 2. Package into tar.gz with ONLY the model file
with tarfile.open(TAR_FILE, 'w:gz') as tar:
    tar.add(XGB_FILE, arcname='xgboost-model')
print(f"[*] Created pure {TAR_FILE} with ONLY xgboost-model (size: {os.path.getsize(TAR_FILE):,} bytes)")

session = boto3.Session(
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=AWS_REGION
)
s3 = session.client('s3')
sm = session.client('sagemaker')

# Delete any existing/failed endpoint
try:
    print(f"[*] Deleting existing endpoint {ENDPOINT_NAME}...")
    sm.delete_endpoint(EndpointName=ENDPOINT_NAME)
    time.sleep(5)
except Exception:
    pass

# Upload to S3
s3_key = 'models/forecast-48h/v3/model.tar.gz'
print(f"[*] Uploading to s3://{S3_BUCKET}/{s3_key}...")
s3.upload_file(TAR_FILE, S3_BUCKET, s3_key)
print("[OK] S3 Upload complete.")

# Register Model
image_uri = f"720646828776.dkr.ecr.{AWS_REGION}.amazonaws.com/sagemaker-xgboost:1.7-1"
print(f"[*] Registering Model {MODEL_NAME}...")
sm.create_model(
    ModelName=MODEL_NAME,
    PrimaryContainer={
        'Image': image_uri,
        'ModelDataUrl': f"s3://{S3_BUCKET}/{s3_key}"
    },
    ExecutionRoleArn=ROLE_ARN
)
print(f"[OK] Model registered: {MODEL_NAME}")

# Create Endpoint Config
print(f"[*] Creating Endpoint Config {ENDPOINT_CONFIG_NAME}...")
sm.create_endpoint_config(
    EndpointConfigName=ENDPOINT_CONFIG_NAME,
    ProductionVariants=[{
        'VariantName': 'AllTraffic',
        'ModelName': MODEL_NAME,
        'ServerlessConfig': {
            'MemorySizeInMB': 1024,
            'MaxConcurrency': 5
        }
    }]
)
print(f"[OK] Endpoint Config created: {ENDPOINT_CONFIG_NAME}")

# Create Endpoint
print(f"[*] Creating Endpoint {ENDPOINT_NAME}...")
sm.create_endpoint(
    EndpointName=ENDPOINT_NAME,
    EndpointConfigName=ENDPOINT_CONFIG_NAME
)
print(f"[OK] Endpoint creation started for {ENDPOINT_NAME}!")

print("[*] Polling endpoint status until InService...")
for i in range(35):
    desc = sm.describe_endpoint(EndpointName=ENDPOINT_NAME)
    status = desc['EndpointStatus']
    print(f"  [{i*10}s] Status: {status}")
    if status == 'InService':
        print(f"\n🎉 LIVE SUCCESS: Endpoint {ENDPOINT_NAME} is IN-SERVICE!")
        break
    elif status == 'Failed':
        print(f"\n❌ Endpoint Failed: {desc.get('FailureReason')}")
        break
    time.sleep(10)
