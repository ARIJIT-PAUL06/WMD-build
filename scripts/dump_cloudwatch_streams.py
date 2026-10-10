import os
import boto3
import json
import datetime
import dotenv

dotenv.load_dotenv('.env')
aws_key = os.getenv('AWS_ACCESS_KEY_ID')
aws_secret = os.getenv('AWS_SECRET_ACCESS_KEY')

session = boto3.Session(
    aws_access_key_id=aws_key,
    aws_secret_access_key=aws_secret,
    region_name='ap-south-1'
)
logs = session.client('logs')
log_group = '/aws/lambda/wmd-backend'

streams_res = logs.describe_log_streams(
    logGroupName=log_group,
    orderBy='LastEventTime',
    descending=True,
    limit=50
)
streams = streams_res.get('logStreams', [])

# Write output to a text file with utf-8 encoding so there are no console encoding errors
with open('scripts/cloudwatch_inspection_report.txt', 'w', encoding='utf-8') as out:
    out.write(f"Total streams retrieved: {len(streams)}\n")
    for s in streams:
        s_name = s['logStreamName']
        last_event_ts = s.get('lastEventTimestamp')
        last_dt = datetime.datetime.fromtimestamp(last_event_ts / 1000, tz=datetime.timezone.utc) if last_event_ts else 'N/A'
        
        events_res = logs.get_log_events(
            logGroupName=log_group,
            logStreamName=s_name,
            limit=40,
            startFromHead=False
        )
        events = events_res.get('events', [])
        
        # Check if this stream has EventBridge cron or monitoring messages
        has_cron = any('EventBridge' in ev['message'] or 'Autonomous' in ev['message'] or 'Advisory' in ev['message'] for ev in events)
        
        out.write(f"\n======================================================\n")
        out.write(f"Stream: {s_name}\nLast Event (UTC): {last_dt}\nEvents Count: {len(events)}\n")
        out.write(f"======================================================\n")
        for ev in events:
            ev_dt = datetime.datetime.fromtimestamp(ev['timestamp'] / 1000, tz=datetime.timezone.utc)
            # Clean message
            msg = ev['message'].strip()
            out.write(f"[{ev_dt.strftime('%Y-%m-%d %H:%M:%S UTC')}] {msg}\n")

print("Dumped 50 streams to scripts/cloudwatch_inspection_report.txt")
