"""
AWS SageMaker Cloud Training Pipeline for Grid-Level 3-Year Daily AQI Models
1. Uploads grid_3year_daily_train.csv to an AWS S3 Bucket (s3://<bucket>/aqi-grids/train/)
2. Uses AWS SageMaker Python SDK / Boto3 to launch an official SageMaker Managed Training Job
   using AWS's optimized XGBoost Container.
3. If AWS credentials / S3 bucket are provided in .env, triggers cloud execution.
   Otherwise, generates the ready-to-run AWS CLI and Boto3 submission payload.
"""

import os
import sys
import json
import csv
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Load project root .env
load_dotenv(os.path.join(BASE_DIR, '..', '.env'))

DATA_FILE = os.path.join(BASE_DIR, 'data', 'grid_3year_daily_train.csv')

# Load environment configuration
AWS_REGION = os.getenv('AWS_REGION', 'ap-south-1')
S3_BUCKET = os.getenv('AWS_S3_BUCKET', 'wmd-airquality-sagemaker-dataset')
SAGEMAKER_ROLE = os.getenv('SAGEMAKER_ROLE_ARN', 'arn:aws:iam::594650681179:role/sagemakerexecutionrole03102026')
TRAINING_JOB_NAME = os.getenv('SAGEMAKER_TRAINING_JOB_NAME', 'wmd-grid-3yr-daily-xgboost')

def prepare_sagemaker_train_csv():
    """
    SageMaker XGBoost expects CSV where the FIRST column is the target variable (daily_avg_pm25),
    with NO header row.
    """
    if not os.path.exists(DATA_FILE):
        print(f"[!] Data file not found: {DATA_FILE}")
        return None

    sagemaker_csv = os.path.join(BASE_DIR, 'data', 'sagemaker_train_noheader.csv')
    
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"[*] Formatting {len(rows)} records for SageMaker XGBoost algorithm container...")
    
    # Target: daily_avg_pm25
    # Features: doy_sin, doy_cos, month, day, is_winter, is_stubble_burning, morning_rush_avg_pm25, daily_peak_pm25
    processed = []
    for r in rows:
        target = r['daily_avg_pm25']
        features = [
            r['doy_sin'],
            r['doy_cos'],
            r['month'],
            r['day'],
            r['is_winter'],
            r['is_stubble_burning'],
            r['morning_rush_avg_pm25'],
            r['daily_peak_pm25']
        ]
        processed.append([target] + features)

    with open(sagemaker_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerows(processed)

    print(f"[OK] SageMaker ready training file created: {sagemaker_csv}")
    return sagemaker_csv

def launch_sagemaker_job():
    train_file = prepare_sagemaker_train_csv()
    if not train_file:
        return

    print("\n" + "="*60)
    print("      AWS SAGEMAKER MANAGED TRAINING JOB CONFIGURATION")
    print("="*60)
    print(f"[*] Target Region:         {AWS_REGION}")
    print(f"[*] S3 Training Bucket:    s3://{S3_BUCKET}/aqi-grids/train/")
    print(f"[*] S3 Model Output:       s3://{S3_BUCKET}/aqi-grids/output/")
    print(f"[*] SageMaker IAM Role:    {SAGEMAKER_ROLE}")
    print(f"[*] Algorithm Container:   AWS Managed XGBoost (1.7-1)")
    print(f"[*] Compute Instance:      ml.m5.xlarge (4 vCPU, 16 GB Memory)")
    print("="*60)

    # Check for live boto3 credentials
    has_aws_creds = os.getenv('AWS_ACCESS_KEY_ID') and os.getenv('AWS_SECRET_ACCESS_KEY')
    
    if has_aws_creds:
        print("[*] Detected AWS credentials. Initializing Boto3 SageMaker & S3 clients...")
        try:
            import boto3
            s3 = boto3.client('s3', region_name=AWS_REGION)
            sm = boto3.client('sagemaker', region_name=AWS_REGION)

            s3_key = 'aqi-grids/train/sagemaker_train_noheader.csv'
            print(f"[*] Uploading training dataset to s3://{S3_BUCKET}/{s3_key}...")
            s3.upload_file(train_file, S3_BUCKET, s3_key)
            print("[OK] S3 Upload completed successfully!")

            # Trigger training job
            import time
            job_name = f"{TRAINING_JOB_NAME}-{int(time.time())}"
            print(f"[*] Submitting SageMaker Training Job: {job_name}...")
            
            # Use official AWS XGBoost image URI for ap-south-1
            image_uri = "720646828776.dkr.ecr.ap-south-1.amazonaws.com/sagemaker-xgboost:1.7-1"

            training_params = {
                "TrainingJobName": job_name,
                "AlgorithmSpecification": {
                    "TrainingImage": image_uri,
                    "TrainingInputMode": "File"
                },
                "RoleArn": SAGEMAKER_ROLE,
                "InputDataConfig": [
                    {
                        "ChannelName": "train",
                        "DataSource": {
                            "S3DataSource": {
                                "S3DataType": "S3Prefix",
                                "S3Uri": f"s3://{S3_BUCKET}/aqi-grids/train/",
                                "S3DataDistributionType": "FullyReplicated"
                            }
                        },
                        "ContentType": "text/csv"
                    }
                ],
                "OutputDataConfig": {
                    "S3OutputPath": f"s3://{S3_BUCKET}/aqi-grids/output/"
                },
                "ResourceConfig": {
                    "InstanceType": "ml.m5.xlarge",
                    "InstanceCount": 1,
                    "VolumeSizeInGB": 20
                },
                "StoppingCondition": {
                    "MaxRuntimeInSeconds": 3600
                },
                "HyperParameters": {
                    "max_depth": "6",
                    "eta": "0.08",
                    "objective": "reg:squarederror",
                    "num_round": "150"
                }
            }

            response = sm.create_training_job(**training_params)
            print(f"[OK] Training job submitted to SageMaker! ARN: {response['TrainingJobArn']}")
            return response
            
        except Exception as e:
            print(f"[!] Boto3 SageMaker execution failed: {e}")
            print("[*] Providing AWS CLI alternative command below.\n")

    # If credentials not yet configured in .env, print the exact AWS CLI submission command
    print("[INFO] To run this SageMaker training job on your AWS account, configure:")
    print("       AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET, SAGEMAKER_ROLE_ARN in .env")
    print("\nOr run directly via AWS CLI:")
    print(f"  1. aws s3 cp ml/data/sagemaker_train_noheader.csv s3://{S3_BUCKET}/aqi-grids/train/")
    print(f"  2. aws sagemaker create-training-job --training-job-name {TRAINING_JOB_NAME}-1 ...")

if __name__ == '__main__':
    launch_sagemaker_job()
