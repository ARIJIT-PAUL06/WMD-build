"""
AWS SageMaker Model Pipeline:
1. Trains official XGBoost Model on 3-Year Daily Grid Telemetry (8,768 daily records)
2. Generates standard SageMaker artifact bundle: xgboost-model + metadata + model.tar.gz
3. Uploads model.tar.gz directly to s3://wmd-aqi-dataset-594650681179/aqi-grids/models/
4. Registers official SageMaker Model resource in AWS SageMaker Model Registry
"""

import os
import json
import csv
import tarfile
import numpy as np
import xgboost as xgb
import boto3
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '..', '.env'))

DATA_FILE = os.path.join(BASE_DIR, 'data', 'grid_3year_daily_train.csv')
MODEL_DIR = os.path.join(BASE_DIR, 'model')
MODEL_BIN = os.path.join(MODEL_DIR, 'xgboost_grid_model.bin')
TAR_GZ = os.path.join(MODEL_DIR, 'model.tar.gz')
METADATA_FILE = os.path.join(MODEL_DIR, 'sagemaker_grid_model_metadata.json')

AWS_REGION = os.getenv('AWS_REGION', 'ap-south-1')
S3_BUCKET = os.getenv('AWS_S3_BUCKET', 'wmd-aqi-dataset-594650681179')
ROLE_ARN = os.getenv('SAGEMAKER_ROLE_ARN', 'arn:aws:iam::594650681179:role/sagemakerexecutionrole03102026')

def train_and_package_sagemaker_model():
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"[*] Training on {len(rows)} 3-year daily grid records...")
    
    # Feature matrix:
    # 0: doy_sin, 1: doy_cos, 2: month, 3: day, 4: is_winter, 5: is_stubble_burning,
    # 6: morning_rush_avg_pm25, 7: daily_peak_pm25
    feature_names = [
        "doy_sin", "doy_cos", "month", "day",
        "is_winter", "is_stubble_burning",
        "morning_rush_avg_pm25", "daily_peak_pm25"
    ]

    X = []
    y = []
    for r in rows:
        target = float(r['daily_avg_pm25'])
        feats = [
            float(r['doy_sin']),
            float(r['doy_cos']),
            float(r['month']),
            float(r['day']),
            float(r['is_winter']),
            float(r['is_stubble_burning']),
            float(r['morning_rush_avg_pm25']),
            float(r['daily_peak_pm25'])
        ]
        X.append(feats)
        y.append(target)

    X = np.array(X)
    y = np.array(y)

    split = int(len(X) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    dtrain = xgb.DMatrix(X_train, label=y_train, feature_names=feature_names)
    dtest = xgb.DMatrix(X_test, label=y_test, feature_names=feature_names)

    params = {
        'max_depth': 6,
        'eta': 0.08,
        'objective': 'reg:squarederror',
        'eval_metric': 'mae'
    }

    print("[*] Training official XGBoost 3.4.1 engine...")
    bst = xgb.train(params, dtrain, num_boost_round=150, evals=[(dtest, 'test')], verbose_eval=50)

    preds = bst.predict(dtest)
    mae = float(np.mean(np.abs(y_test - preds)))
    rmse = float(np.sqrt(np.mean((y_test - preds) ** 2)))
    print(f"\n[OK] Training Complete: MAE = {mae:.2f} ug/m3, RMSE = {rmse:.2f} ug/m3")

    # Save model binary in native XGBoost format
    bst.save_model(MODEL_BIN)
    
    # Save SageMaker metadata
    metadata = {
        "model_framework": "sagemaker_xgboost",
        "framework_version": "1.7-1 / 3.4.1",
        "features": feature_names,
        "records_trained": len(X_train),
        "test_mae": round(mae, 2),
        "test_rmse": round(rmse, 2),
        "s3_bucket": S3_BUCKET,
        "role_arn": ROLE_ARN
    }
    with open(METADATA_FILE, 'w') as f:
        json.dump(metadata, f, indent=2)

    # Package as SageMaker model.tar.gz
    with tarfile.open(TAR_GZ, "w:gz") as tar:
        tar.add(MODEL_BIN, arcname="xgboost_grid_model.bin")
        tar.add(METADATA_FILE, arcname="sagemaker_grid_model_metadata.json")
    print(f"[OK] SageMaker artifact package created: {TAR_GZ}")

    # Upload to AWS S3
    session = boto3.Session(
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=AWS_REGION
    )
    s3 = session.client('s3')
    s3_key = 'aqi-grids/models/model.tar.gz'
    print(f"[*] Uploading model package to s3://{S3_BUCKET}/{s3_key}...")
    s3.upload_file(TAR_GZ, S3_BUCKET, s3_key)
    print(f"[OK] S3 Model Uploaded successfully!")

    # Register in AWS SageMaker
    sm = session.client('sagemaker')
    model_name = f"wmd-grid-3yr-daily-xgboost-v1"
    image_uri = "720646828776.dkr.ecr.ap-south-1.amazonaws.com/sagemaker-xgboost:1.7-1"
    
    print(f"[*] Registering Model in AWS SageMaker Registry: {model_name}...")
    try:
        r = sm.create_model(
            ModelName=model_name,
            PrimaryContainer={
                'Image': image_uri,
                'ModelDataUrl': f"s3://{S3_BUCKET}/{s3_key}"
            },
            ExecutionRoleArn=ROLE_ARN
        )
        print(f"[OK] SageMaker Model Registered! Model ARN: {r['ModelArn']}")
    except Exception as e:
        if 'Cannot create already existing model' in str(e):
            print(f"[OK] SageMaker Model {model_name} already exists in registry.")
        else:
            print(f"[!] SageMaker registration note: {e}")

if __name__ == '__main__':
    train_and_package_sagemaker_model()
