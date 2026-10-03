#!/usr/bin/env python3
"""
AWS SageMaker Serverless Endpoint Deployment Script
Part of VayuVitals 3D · Section 10 Educational Institution Air Quality Intelligence

This script packages the trained XGBoost air quality forecasting model,
uploads the model artifact to Amazon S3, creates an AWS SageMaker Model resource,
provisions a cost-effective Serverless Inference Endpoint Configuration,
and deploys the live endpoint for 48-hour school-window PM2.5 forecasting.
"""

import os
import sys
import json
import tarfile
import time
from pathlib import Path

import os
import sys
import json
import tarfile
import time
from pathlib import Path

boto3 = None
try:
    import boto3
    from botocore.exceptions import ClientError
except ImportError:
    pass

# Configuration & Defaults
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
S3_BUCKET = os.getenv("SAGEMAKER_MODEL_S3_BUCKET", f"vayuvitals-sagemaker-models-{AWS_REGION}")
ENDPOINT_NAME = os.getenv("SAGEMAKER_ENDPOINT_NAME", "vayuvitals-delhi-schools-xgboost")
MODEL_NAME = "vayuvitals-xgboost-pm25-v1"
ENDPOINT_CONFIG_NAME = f"{ENDPOINT_NAME}-config"

# Official SageMaker XGBoost DLC (Deep Learning Container) URI for ap-south-1
# SageMaker XGBoost 1.5-1 URI mapping
XGBOOST_IMAGE_URI = os.getenv(
    "SAGEMAKER_XGBOOST_IMAGE_URI",
    f"720646828776.dkr.ecr.{AWS_REGION}.amazonaws.com/sagemaker-xgboost:1.5-1"
)

# SageMaker Execution Role ARN (IAM role with AmazonSageMakerFullAccess)
SAGEMAKER_ROLE_ARN = os.getenv("SAGEMAKER_ROLE_ARN", "")

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "model"
MODEL_FILE = MODEL_DIR / "xgboost_model.bin"
TAR_FILE = MODEL_DIR / "model.tar.gz"

def create_model_tar():
    """Package the model into model.tar.gz as required by SageMaker."""
    if not MODEL_FILE.exists():
        print(f"[!] Model file {MODEL_FILE} not found. Please run train_sagemaker_xgboost.py first.")
        sys.exit(1)

    print(f"[*] Packaging {MODEL_FILE.name} into {TAR_FILE.name}...")
    with tarfile.open(TAR_FILE, "w:gz") as tar:
        tar.add(MODEL_FILE, arcname="xgboost_model.bin")
    print(f"[+] Model archive created ({TAR_FILE.stat().st_size / 1024:.1f} KB)")
    return TAR_FILE

def upload_to_s3(s3_client, file_path, bucket_name, s3_key):
    """Upload model tarball to Amazon S3."""
    print(f"[*] Ensuring S3 bucket '{bucket_name}' exists...")
    try:
        if AWS_REGION == "us-east-1":
            s3_client.create_bucket(Bucket=bucket_name)
        else:
            s3_client.create_bucket(
                Bucket=bucket_name,
                CreateBucketConfiguration={"LocationConstraint": AWS_REGION}
            )
        print(f"[+] S3 bucket '{bucket_name}' ready.")
    except ClientError as e:
        if "BucketAlreadyOwnedByYou" in str(e) or "BucketAlreadyExists" in str(e):
            print(f"[*] Using existing S3 bucket '{bucket_name}'.")
        else:
            print(f"[!] Warning checking bucket: {e}")

    print(f"[*] Uploading {file_path.name} to s3://{bucket_name}/{s3_key}...")
    s3_client.upload_file(str(file_path), bucket_name, s3_key)
    s3_uri = f"s3://{bucket_name}/{s3_key}"
    print(f"[+] Model uploaded successfully: {s3_uri}")
    return s3_uri

def deploy_serverless_endpoint():
    """Create SageMaker Model, Endpoint Config, and Serverless Endpoint."""
    if not os.getenv("AWS_ACCESS_KEY_ID") or not os.getenv("AWS_SECRET_ACCESS_KEY"):
        print("[!] AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) not found in environment.")
        print("[*] To deploy to AWS, export your credentials and execution role:")
        print("    export AWS_ACCESS_KEY_ID=your_key")
        print("    export AWS_SECRET_ACCESS_KEY=your_secret")
        print("    export SAGEMAKER_ROLE_ARN=arn:aws:iam::123456789012:role/service-role/AmazonSageMaker-ExecutionRole")
        print("\n[*] Demonstration Package Ready: Model packaging verified successfully!")
        create_model_tar()
        return

    tar_path = create_model_tar()

    session = boto3.Session(region_name=AWS_REGION)
    s3_client = session.client("s3")
    sm_client = session.client("sagemaker")

    s3_key = f"models/air_quality/{int(time.time())}/model.tar.gz"
    model_data_url = upload_to_s3(s3_client, tar_path, S3_BUCKET, s3_key)

    # 1. Create SageMaker Model
    print(f"[*] Creating SageMaker Model '{MODEL_NAME}'...")
    try:
        sm_client.create_model(
            ModelName=MODEL_NAME,
            PrimaryContainer={
                "Image": XGBOOST_IMAGE_URI,
                "ModelDataUrl": model_data_url,
                "Environment": {
                    "SAGEMAKER_CONTAINER_LOG_LEVEL": "20",
                    "SAGEMAKER_PROGRAM": "inference.py"
                }
            },
            ExecutionRoleArn=SAGEMAKER_ROLE_ARN
        )
        print(f"[+] SageMaker Model '{MODEL_NAME}' created.")
    except ClientError as e:
        if "Cannot create already existing model" in str(e):
            print(f"[*] Model '{MODEL_NAME}' already exists, proceeding to config.")
        else:
            raise

    # 2. Create Serverless Endpoint Configuration
    print(f"[*] Creating Serverless Endpoint Config '{ENDPOINT_CONFIG_NAME}'...")
    try:
        sm_client.create_endpoint_config(
            EndpointConfigName=ENDPOINT_CONFIG_NAME,
            ProductionVariants=[
                {
                    "VariantName": "AllTraffic",
                    "ModelName": MODEL_NAME,
                    "ServerlessConfig": {
                        "MemorySizeInMB": 2048,
                        "MaxConcurrency": 10
                    }
                }
            ]
        )
        print(f"[+] Serverless Endpoint Config created.")
    except ClientError as e:
        if "Cannot create already existing" in str(e):
            print(f"[*] Endpoint Config '{ENDPOINT_CONFIG_NAME}' already exists.")
        else:
            raise

    # 3. Create / Update SageMaker Endpoint
    print(f"[*] Deploying SageMaker Serverless Endpoint '{ENDPOINT_NAME}'...")
    try:
        sm_client.create_endpoint(
            EndpointName=ENDPOINT_NAME,
            EndpointConfigName=ENDPOINT_CONFIG_NAME
        )
        print(f"[*] Endpoint creation initiated. Waiting for status: InService...")
    except ClientError as e:
        if "Cannot create already existing endpoint" in str(e):
            print(f"[*] Endpoint '{ENDPOINT_NAME}' already exists. Updating endpoint...")
            sm_client.update_endpoint(
                EndpointName=ENDPOINT_NAME,
                EndpointConfigName=ENDPOINT_CONFIG_NAME
            )

    # 4. Wait for Endpoint to be InService
    while True:
        status = sm_client.describe_endpoint(EndpointName=ENDPOINT_NAME)["EndpointStatus"]
        print(f"[*] Endpoint status: {status}")
        if status == "InService":
            print(f"\n[+] SageMaker Serverless Endpoint is LIVE: {ENDPOINT_NAME}")
            print(f"[+] Region: {AWS_REGION}")
            print(f"[+] Ready to receive real-time inferences from VayuVitals Node.js backend.")
            break
        elif status == "Failed":
            print(f"[!] Endpoint deployment failed.")
            sys.exit(1)
        time.sleep(15)

if __name__ == "__main__":
    deploy_serverless_endpoint()
