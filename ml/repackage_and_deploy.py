"""
Repackage XGBoost model as standard text-JSON and deploy to SageMaker Serverless.
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
TAR_FILE = os.path.join(MODEL_DIR, 'forecast_model.tar.gz')
METADATA_FILE = os.path.join(MODEL_DIR, 'sagemaker_forecast_metadata.json')

AWS_REGION = os.getenv('AWS_REGION', 'ap-south-1')
S3_BUCKET = os.getenv('SAGEMAKER_MODEL_S3_BUCKET', 'wmd-aqi-dataset-594650681179')
ROLE_ARN = os.getenv('SAGEMAKER_ROLE_ARN', 'arn:aws:iam::594650681179:role/sagemakerexecutionrole03102026')
ENDPOINT_NAME = os.getenv('SAGEMAKER_ENDPOINT_NAME', 'wmd-delhi-48h-forecast-endpoint')
MODEL_NAME = 'wmd-delhi-48h-forecast-xgboost-v2'
ENDPOINT_CONFIG_NAME = f"{ENDPOINT_NAME}-config-v2"

# 1. Copy text JSON to xgboost-model
shutil.copyfile(JSON_FILE, XGB_FILE)
print(f"[*] Copied {JSON_FILE} to {XGB_FILE} (size: {os.path.getsize(XGB_FILE):,} bytes)")

# 2. Package into tar.gz
with tarfile.open(TAR_FILE, 'w:gz') as tar:
    tar.add(XGB_FILE, arcname='xgboost-model')
    tar.add(METADATA_FILE, arcname='sagemaker_forecast_metadata.json')
print(f"[*] Created {TAR_FILE} (size: {os.path.getsize(TAR_FILE):,} bytes)")

# 3. Upload to S3
session = boto3.Session(
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=AWS_REGION
)
s3 = session.client('s3')
sm = session.client('sagemaker')

s3_key = 'models/forecast-48h/v2/model.tar.gz'
print(f"[*] Uploading to s3://{S3_BUCKET}/{s3_key}...")
s3.upload_file(TAR_FILE, S3_BUCKET, s3_key)
print("[OK] S3 Upload complete.")

# 4. Register SageMaker Model
image_uri = f"720646828776.dkr.ecr.{AWS_REGION}.amazonaws.com/sagemaker-xgboost:1.7-1"
print(f"[*] Registering Model {MODEL_NAME}...")
try:
    sm.create_model(
        ModelName=MODEL_NAME,
        PrimaryContainer={
            'Image': image_uri,
            'ModelDataUrl': f"s3://{S3_BUCKET}/{s3_key}"
        },
        ExecutionRoleArn=ROLE_ARN
    )
    print(f"[OK] Model registered: {MODEL_NAME}")
except Exception as e:
    if 'Cannot create already existing model' in str(e):
        print(f"[OK] Model {MODEL_NAME} already exists.")
    else:
        raise e

# 5. Create Endpoint Config
print(f"[*] Creating Endpoint Config {ENDPOINT_CONFIG_NAME}...")
try:
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
except Exception as e:
    if 'Cannot create already existing endpoint config' in str(e):
        print(f"[OK] Config {ENDPOINT_CONFIG_NAME} exists.")
    else:
        raise e

# 6. Create Endpoint
print(f"[*] Creating Endpoint {ENDPOINT_NAME}...")
try:
    sm.create_endpoint(
        EndpointName=ENDPOINT_NAME,
        EndpointConfigName=ENDPOINT_CONFIG_NAME
    )
    print(f"[OK] Endpoint creation started for {ENDPOINT_NAME}!")
except Exception as e:
    raise e

print("[*] Polling endpoint status...")
for i in range(35):
    desc = sm.describe_endpoint(EndpointName=ENDPOINT_NAME)
    status = desc['EndpointStatus']
    print(f"  [{i*10}s] Endpoint Status: {status}")
    if status == 'InService':
        print(f"\n🎉 LIVE SUCCESS: Endpoint {ENDPOINT_NAME} is IN-SERVICE!")
        break
    elif status == 'Failed':
        print(f"\n❌ Endpoint Failed: {desc.get('FailureReason')}")
        break
    time.sleep(10)
