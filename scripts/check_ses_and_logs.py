import os
import boto3
import json
import datetime
import dotenv

dotenv.load_dotenv('.env')
aws_key = os.getenv('AWS_ACCESS_KEY_ID')
aws_secret = os.getenv('AWS_SECRET_ACCESS_KEY')

# 1. Check SES in us-east-1
session_us_east_1 = boto3.Session(
    aws_access_key_id=aws_key,
    aws_secret_access_key=aws_secret,
    region_name='us-east-1'
)
ses_east = session_us_east_1.client('ses')
print("=" * 60)
print("SES IN US-EAST-1 (Configured Region in Lambda)")
print("=" * 60)
try:
    quota = ses_east.get_send_quota()
    print(f"Max 24-Hour Send Quota: {quota.get('Max24HourSend')}")
    print(f"Max Send Rate:          {quota.get('MaxSendRate')} emails/second")
    print(f"Sent Last 24 Hours:     {quota.get('SentLast24Hours')}")
    
    enabled = ses_east.get_account_sending_enabled()
    print(f"Account Sending Enabled: {enabled.get('Enabled')}")
    
    identities_res = ses_east.list_identities()
    identities = identities_res.get('Identities', [])
    print(f"Verified / Pending Identities in us-east-1 ({len(identities)}):")
    if identities:
        attrs = ses_east.get_identity_verification_attributes(Identities=identities).get('VerificationAttributes', {})
        for ident in identities:
            ver = attrs.get(ident, {})
            print(f"  - {ident}: Status = {ver.get('VerificationStatus')}")
except Exception as e:
    print(f"Error checking SES us-east-1: {e}")

# 2. Check CloudWatch Logs for Lambda wmd-backend
session_ap_south_1 = boto3.Session(
    aws_access_key_id=aws_key,
    aws_secret_access_key=aws_secret,
    region_name='ap-south-1'
)
logs = session_ap_south_1.client('logs')
print("\n" + "=" * 60)
print("CLOUDWATCH LOGS FOR LAMBDA /aws/lambda/wmd-backend")
print("=" * 60)
log_group = '/aws/lambda/wmd-backend'

try:
    streams_res = logs.describe_log_streams(
        logGroupName=log_group,
        orderBy='LastEventTime',
        descending=True,
        limit=10
    )
    streams = streams_res.get('logStreams', [])
    print(f"Recent Log Streams ({len(streams)} found):")
    for s in streams:
        s_name = s['logStreamName']
        last_event_ts = s.get('lastEventTimestamp')
        last_dt = datetime.datetime.fromtimestamp(last_event_ts / 1000, tz=datetime.timezone.utc) if last_event_ts else 'N/A'
        print(f"\nStream: {s_name} | Last Event: {last_dt} UTC")
        
        # Get last 20 log events from this stream
        events_res = logs.get_log_events(
            logGroupName=log_group,
            logStreamName=s_name,
            limit=25,
            startFromHead=False
        )
        for ev in events_res.get('events', []):
            ev_dt = datetime.datetime.fromtimestamp(ev['timestamp'] / 1000, tz=datetime.timezone.utc)
            msg = ev['message'].strip()
            print(f"  [{ev_dt.strftime('%H:%M:%S')}] {msg}")
except Exception as e:
    print(f"Error reading CloudWatch logs: {e}")
