"""
Deploy 100% compatible XGBoost model to SageMaker Serverless.
Ensures base_score scalar string and feature_names: [] for native 1.7-1 container compatibility.
"""
import os
import json
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
MODEL_NAME = 'wmd-delhi-48h-forecast-xgboost-v4'
ENDPOINT_CONFIG_NAME = f"{ENDPOINT_NAME}-config-v4"

# 1. Prepare compatible model JSON
with open(JSON_FILE, 'r', encoding='utf-8') as f:
    m = json.load(f)

# Ensure base_score is scalar string compatible with XGBoost 1.7
m['learner']['learner_model_param']['base_score'] = '4.909675'
m['learner']['feature_names'] = []

with open(XGB_FILE, 'w', encoding='utf-8') as f:
    json.dump(m, f)

print(f"[*] Prepared compatible model in {XGB_FILE}")

# Also update the local xgboost_forecast_model.json so local node inference is 100% in sync
with open(JSON_FILE, 'w', encoding='utf-8') as f:
    json.dump(m, f, indent=2)

# 2. Package into tar.gz
with tarfile.open(TAR_FILE, 'w:gz') as tar:
    tar.add(XGB_FILE, arcname='xgboost-model')
print(f"[*] Created {TAR_FILE} (size: {os.path.getsize(TAR_FILE):,} bytes)")

# 3. Upload to S3
session = boto3.Session(
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=AWS_REGION
)
s3 = session.client('s3')
sm = session.client('sagemaker')

s3_key = 'models/forecast-48h/v4/model.tar.gz'
print(f"[*] Uploading to s3://{S3_BUCKET}/{s3_key}...")
s3.upload_file(TAR_FILE, S3_BUCKET, s3_key)
print("[OK] S3 Upload complete.")

# 4. Register Model
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
        print(f"[OK] Config {ENDPOINT_CONFIG_NAME} already exists.")
    else:
        raise e

# 6. Update Endpoint
print(f"[*] Updating Live SageMaker Endpoint {ENDPOINT_NAME} with config {ENDPOINT_CONFIG_NAME}...")
sm.update_endpoint(
    EndpointName=ENDPOINT_NAME,
    EndpointConfigName=ENDPOINT_CONFIG_NAME
)
print("[OK] Update initiated. Polling status until InService...")

for i in range(35):
    desc = sm.describe_endpoint(EndpointName=ENDPOINT_NAME)
    status = desc['EndpointStatus']
    print(f"  [{i*10}s] Status: {status}")
    if status == 'InService':
        print(f"\n🎉 LIVE SUCCESS: Endpoint {ENDPOINT_NAME} is UPDATED and IN-SERVICE!")
        break
    elif status == 'Failed':
        print(f"\n❌ Endpoint Failed: {desc.get('FailureReason')}")
        break
    time.sleep(10)
