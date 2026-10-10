import os
import boto3
import json
import dotenv

dotenv.load_dotenv('.env')
session = boto3.Session(
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name='ap-south-1'
)
ddb = session.client('dynamodb')

try:
    res = ddb.get_item(
        TableName='AirQualityReadings',
        Key={
            'city': {'S': 'SYSTEM_MONITOR_STATE'},
            'timestamp': {'S': 'LATEST'}
        }
    )
    item = res.get('Item')
    if item:
        print("FOUND SYSTEM_MONITOR_STATE in DynamoDB:")
        state_json_str = item.get('stateJson', {}).get('S')
        updated_at = item.get('updatedAt', {}).get('S')
        print(f"Updated At: {updated_at}")
        state = json.loads(state_json_str) if state_json_str else {}
        print(json.dumps(state, indent=2))
        with open('scripts/dynamodb_monitor_state.json', 'w', encoding='utf-8') as f:
            json.dump({'updatedAt': updated_at, 'state': state}, f, indent=2)
    else:
        print("No SYSTEM_MONITOR_STATE found in DynamoDB.")
except Exception as e:
    print(f"Error querying DynamoDB: {e}")
