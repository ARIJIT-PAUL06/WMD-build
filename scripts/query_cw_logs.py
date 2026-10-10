import os
import boto3
import json
import datetime
import dotenv

dotenv.load_dotenv('.env')
session = boto3.Session(
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name='ap-south-1'
)
logs = session.client('logs')
log_group = '/aws/lambda/wmd-backend'

streams = logs.describe_log_streams(
    logGroupName=log_group,
    orderBy='LastEventTime',
    descending=True,
    limit=30
).get('logStreams', [])

print(f"Retrieved {len(streams)} streams.")

with open('scripts/detailed_morning_investigation.txt', 'w', encoding='utf-8') as out:
    for s in streams:
        s_name = s['logStreamName']
        ts = s.get('lastEventTimestamp')
        dt_str = datetime.datetime.fromtimestamp(ts/1000, tz=datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC') if ts else 'N/A'
        
        events = logs.get_log_events(
            logGroupName=log_group,
            logStreamName=s_name,
            startFromHead=True
        ).get('events', [])
        
        has_cron = any('EventBridge' in e['message'] or 'Autonomous' in e['message'] for e in events)
        has_error = any('ERROR' in e['message'] or 'Exception' in e['message'] for e in events)
        has_ses = any('SES' in e['message'] or 'email' in e['message'].lower() for e in events)
        
        out.write(f"\n======================================================\n")
        out.write(f"STREAM: {s_name}\nLAST EVENT: {dt_str}\nTOTAL EVENTS: {len(events)} (Cron: {has_cron}, Error: {has_error}, SES: {has_ses})\n")
        out.write(f"======================================================\n")
        
        for e in events:
            e_dt = datetime.datetime.fromtimestamp(e['timestamp']/1000, tz=datetime.timezone.utc).strftime('%H:%M:%S')
            msg = e['message'].strip()
            out.write(f"[{e_dt}] {msg}\n")

print("Saved detailed stream logs to scripts/detailed_morning_investigation.txt")
