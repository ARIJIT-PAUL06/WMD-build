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
    try {
      const result = await runAutonomousMonitoringCycle({ dispatchViaSes: true, isSandbox: false });
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          trigger: 'EVENTBRIDGE_CRON',
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

  // Standard HTTP API request (routed through Express)
  return httpHandler(event, context);
};
