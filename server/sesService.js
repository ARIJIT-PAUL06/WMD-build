/**
 * Amazon Simple Email Service (AWS SES) Dispatcher
 * Dispatches automated 6:30 AM morning advisories and 12:00 PM emergency flash alerts
 * via AWS SES in ap-south-1 (Mumbai) or configured region.
 */

import { SESClient, SendEmailCommand, VerifyEmailIdentityCommand, GetSendQuotaCommand } from '@aws-sdk/client-ses';
import dotenv from 'dotenv';

dotenv.config();

const region = process.env.AWS_SES_REGION || 'us-east-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const defaultSender = process.env.SES_SENDER_EMAIL || 'vayuvitals@gmail.com';

let sesClient = null;

const sessionToken = process.env.AWS_SESSION_TOKEN;

if (accessKeyId && secretAccessKey) {
  try {
    sesClient = new SESClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
        ...(sessionToken ? { sessionToken } : {})
      }
    });
  } catch (err) {
    console.warn('[SES Service] Could not initialize SESClient:', err.message);
  }
}

if (!sesClient) {
  try {
    sesClient = new SESClient({ region });
  } catch (err) {
    console.warn('[SES Service] Could not initialize default SESClient:', err.message);
  }
}

// Rate limiting & quota safety guards
let lastSendTimestamp = 0;
const MIN_SEND_INTERVAL_MS = 1200; // Enforces < 1 email per second (AWS SES Sandbox maxSendRate = 1.0/sec)
const DAILY_SAFETY_BUFFER = 15;    // Keep 15 emails in reserve for emergency flash alerts

/**
 * Send an email via Amazon SES
 */
export async function sendEmailViaSES({
  to,
  cc = [],
  subject,
  htmlBody,
  textBody = '',
  fromEmail = defaultSender
}) {
  if (!sesClient) {
    throw new Error('AWS SES Client is not initialized. Please verify AWS credentials in .env.');
  }

  // 1. Quota Safety Guard: Check remaining daily quota before sending
  try {
    const quotaCmd = new GetSendQuotaCommand({});
    const quota = await sesClient.send(quotaCmd);
    const maxSend = quota.Max24HourSend || 200;
    const sentCount = quota.SentLast24Hours || 0;
    const remaining = maxSend - sentCount;

    if (remaining <= DAILY_SAFETY_BUFFER) {
      console.warn(`[SES Service] Daily safety buffer reached (${sentCount}/${maxSend} used). Suppressing non-critical dispatch.`);
      return {
        success: false,
        error: 'SES_DAILY_SAFETY_CAP_REACHED',
        diagnosticHint: `SES free-tier daily cap is ${maxSend} emails. ${sentCount} emails already sent in the last 24h. Dispatch paused to protect quota.`,
        quota
      };
    }
  } catch (quotaErr) {
    console.warn('[SES Service] Could not verify send quota, proceeding with rate limiter:', quotaErr.message);
  }

  // 2. Per-Second Rate Limiter: Enforce at least 1.2s delay between sends
  const now = Date.now();
  const elapsed = now - lastSendTimestamp;
  if (elapsed < MIN_SEND_INTERVAL_MS) {
    const waitTime = MIN_SEND_INTERVAL_MS - elapsed;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastSendTimestamp = Date.now();

  const toAddresses = Array.isArray(to) ? to : [to];
  const ccAddresses = Array.isArray(cc) ? cc : (cc ? [cc] : []);

  const params = {
    Source: fromEmail,
    Destination: {
      ToAddresses: toAddresses,
      CcAddresses: ccAddresses
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8'
        },
        Text: {
          Data: textBody || 'Please view this message in an HTML-compatible email client.',
          Charset: 'UTF-8'
        }
      }
    }
  };

  try {
    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);
    return {
      success: true,
      messageId: response.MessageId,
      sentTo: toAddresses,
      copiedTo: ccAddresses,
      source: fromEmail,
      mode: 'AWS_SES_LIVE',
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('[SES Service] Error sending email via SES:', err.message);
    
    // Provide diagnostic hints for common AWS SES errors
    let diagnosticHint = err.message;
    if (err.name === 'MessageRejected') {
      diagnosticHint = `Email rejected by Amazon SES. Ensure the sender address '${fromEmail}' is verified in AWS SES Console (or account is moved out of sandbox).`;
    } else if (err.message?.includes('not authorized') || err.name === 'AccessDeniedException') {
      diagnosticHint = `IAM permission 'ses:SendEmail' is missing for user 'Arijit_Paul'. Attach 'AmazonSESFullAccess' policy in the AWS IAM Console.`;
    }

    return {
      success: false,
      error: err.message,
      code: err.name,
      diagnosticHint,
      mode: 'AWS_SES_FAILED'
    };
  }
}

/**
 * Send an email verification request to an address via SES
 */
export async function triggerEmailVerification(emailAddress) {
  if (!sesClient) {
    throw new Error('AWS SES Client is not initialized.');
  }

  try {
    const command = new VerifyEmailIdentityCommand({ EmailAddress: emailAddress });
    await sesClient.send(command);
    return {
      success: true,
      message: `Verification email sent by AWS SES to: ${emailAddress}. Please open your inbox and click the verification link.`
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      diagnosticHint: "Requires 'ses:VerifyEmailIdentity' permission on IAM user."
    };
  }
}

/**
 * Check SES Service Status & Send Quota
 */
export async function getSesHealth() {
  if (!sesClient) {
    return {
      connected: false,
      reason: 'AWS credentials not configured'
    };
  }

  try {
    const command = new GetSendQuotaCommand({});
    const quota = await sesClient.send(command);
    return {
      connected: true,
      region,
      max24HourSend: quota.Max24HourSend,
      maxSendRate: quota.MaxSendRate,
      sentLast24Hours: quota.SentLast24Hours,
      defaultSender
    };
  } catch (err) {
    return {
      connected: false,
      region,
      error: err.message,
      diagnosticHint: "IAM user lacks 'ses:GetSendQuota' or 'AmazonSESFullAccess'."
    };
  }
}
