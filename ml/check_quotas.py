import boto3
import os
from dotenv import load_dotenv

load_dotenv()

session = boto3.Session(
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name='ap-south-1'
)

sq = session.client('service-quotas')
found = False
try:
    paginator = sq.get_paginator('list_service_quotas')
    for page in paginator.paginate(ServiceCode='sagemaker'):
        for q in page['Quotas']:
            if 'training' in q['QuotaName'].lower() and q['Value'] > 0:
                print(f"AVAILABLE: {q['QuotaName']} -> Limit: {q['Value']}")
                found = True
except Exception as e:
    print("Service Quotas check note:", e)

if not found:
    print("No non-zero SageMaker training instance quotas found in ap-south-1 (typical for default new AWS accounts).")
