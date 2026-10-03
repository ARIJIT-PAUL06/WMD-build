import boto3
import os
from dotenv import load_dotenv

load_dotenv()

session = boto3.Session(
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name='us-east-1'
)

ses = session.client('ses')

html_content = """
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 28px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
            <span style="font-size: 24px;">🌿</span>
            <h2 style="color: #0284c7; margin: 0; font-size: 20px;">VayuVitals • Amazon SES Activated</h2>
        </div>
        <p style="font-size: 15px; color: #334155; line-height: 1.6;">
            Amazon Simple Email Service (SES) is now <strong>successfully connected, verified, and live</strong> for <code>vayuvitals@gmail.com</code>!
        </p>
        <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 14px 18px; border-radius: 4px; margin: 18px 0;">
            <div style="font-weight: 700; color: #15803d; font-size: 13px; text-transform: uppercase; margin-bottom: 4px;">✅ Active Capabilities</div>
            <ul style="margin: 0; padding-left: 18px; font-size: 13.5px; color: #166534; line-height: 1.6;">
                <li><strong>6:30 AM Predictive Morning Advisories</strong> with high-danger and solar dispersion windows.</li>
                <li><strong>12:00 PM Gemini-Crafted Emergency Flash Alerts</strong> for sudden mid-day spikes.</li>
                <li><strong>Section 10 Statutory Grievance Notices</strong> after 14 days of sustained non-compliance.</li>
            </ul>
        </div>
        <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
            AWS Region: <code>us-east-1 (N. Virginia)</code> • Sender: <code>vayuvitals@gmail.com</code>
        </p>
    </div>
</div>
"""

try:
    response = ses.send_email(
        Source='vayuvitals@gmail.com',
        Destination={'ToAddresses': ['vayuvitals@gmail.com']},
        Message={
            'Subject': {'Data': '🌿 VayuVitals / WMD • AWS SES Activation Confirmation', 'Charset': 'UTF-8'},
            'Body': {'Html': {'Data': html_content, 'Charset': 'UTF-8'}}
        }
    )
    print('[SUCCESS] Email sent successfully! MessageId:', response['MessageId'])
except Exception as e:
    print('[!] Error sending email:', e)
