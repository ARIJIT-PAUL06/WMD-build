import os
import sys
import re

# Ensure stdout uses utf-8 with replacement for any problematic chars
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='backslashreplace')

with open('scripts/cloudwatch_inspection_report.txt', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Split streams
streams = text.split("======================================================")

print(f"Total stream blocks: {len(streams)}")

cron_streams = []
for s in streams:
    if "Triggered by Amazon EventBridge" in s or "Autonomous Monitoring Cycle" in s:
        cron_streams.append(s)

print(f"Streams with Cron execution: {len(cron_streams)}")

# Print summaries of recent cron streams
with open('scripts/parsed_cron_analysis.txt', 'w', encoding='utf-8') as out:
    out.write(f"Found {len(cron_streams)} streams with EventBridge Cron executions.\n\n")
    for idx, cs in enumerate(cron_streams[:15]):
        out.write(f"--- CRON STREAM #{idx+1} ---\n")
        out.write(cs.strip() + "\n\n")

print("Saved top 15 cron streams to scripts/parsed_cron_analysis.txt")
