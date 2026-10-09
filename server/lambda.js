import serverlessExpress from '@codegenie/serverless-express';
import app from './index.js';
import { runAutonomousMonitoringCycle } from './autonomousAtmosphericMonitor.js';

const httpHandler = serverlessExpress({ app });

export const handler = async (event, context) => {
  // Check if triggered by Amazon EventBridge (Scheduled Cron Rule)
  if (
    event.source === 'aws.events' ||
    event['detail-type'] === 'Scheduled Event' ||
    event.action === 'run-cycle'
  ) {
    console.log('[Lambda] Triggered by Amazon EventBridge Cron: Executing Autonomous Monitoring Cycle...');

    // STRICT KILL-SWITCH: Automated email dispatch is DISABLED by default.
    // It requires explicit opt-in (ENABLE_AUTONOMOUS_EMAIL_DISPATCH === 'true') AND DISABLE_AUTOMATIC_MAILING !== 'true'.
    const isAutoEmailEnabled =
      process.env.ENABLE_AUTONOMOUS_EMAIL_DISPATCH === 'true' &&
      process.env.DISABLE_AUTOMATIC_MAILING !== 'true';

    if (!isAutoEmailEnabled) {
      console.log('🛑 [Lambda] Automated email dispatch is DISABLED via safety configuration. Running zero-email monitoring cycle.');
    }

    try {
      const result = await runAutonomousMonitoringCycle({ dispatchViaSes: isAutoEmailEnabled, isSandbox: false });
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          trigger: 'EVENTBRIDGE_CRON',
          emailsDispatched: isAutoEmailEnabled,
          result
        })
      };
    } catch (err) {
      console.error('[Lambda] Error during EventBridge cycle execution:', err);
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, error: err.message })
      };
    }
  }

  // Check if standard HTTP API request (API Gateway or Lambda Function URL)
  const isHttpRequest = Boolean(
    event.requestContext ||
    event.rawPath ||
    event.httpMethod ||
    (event.version && event.version.startsWith('2.'))
  );

  if (isHttpRequest) {
    return httpHandler(event, context);
  }

  // Unknown non-HTTP, non-cron event: log error cleanly without crashing
  console.error('[Lambda] Received unrecognized invocation event format:', JSON.stringify(event));
  return {
    statusCode: 400,
    body: JSON.stringify({ error: 'unrecognized_event_type', message: 'Event did not match HTTP or EventBridge formats.' })
  };
};
