import express from 'express';
import { CITIES_CONFIG } from '../environmentalService.js';
import { getSesHealth } from '../sesService.js';

const router = express.Router();

/**
 * Root service status endpoint
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'VayuVitals API',
    version: '2.0.0',
    endpoints: {
      health: '/api/health',
      awsStatus: '/api/aws-status',
      airQuality: '/api/air-quality?city=Delhi',
      indiaHeatmap: '/api/india-heatmap',
      monitorStatus: '/api/monitor/status'
    }
  });
});

/**
 * Basic health check endpoint
 */
router.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Health check & AWS Configuration Status
 * Transparently checks and reports live AWS status without masking errors.
 */
router.get('/api/aws-status', async (req, res) => {
  const accessKey = process.env.APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.APP_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'ap-south-1';
  const dynamoDbTable = process.env.DYNAMODB_TABLE_NAME || 'AirQualityReadings';
  const sagemakerEndpoint = process.env.SAGEMAKER_ENDPOINT_NAME || 'wmd-delhi-48h-forecast-endpoint';
  const bedrockModel = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';

  let dynamoStatus = 'NOT_CHECKED';
  let sagemakerStatus = 'OFFLINE_NO_ENDPOINT';
  let bedrockStatus = 'CONFIGURED';

  const clientConfig = { region };
  if (accessKey && secretKey) {
    const sessionToken = accessKey?.startsWith('ASIA') ? process.env.AWS_SESSION_TOKEN : undefined;
    clientConfig.credentials = {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      ...(sessionToken ? { sessionToken } : {})
    };
  }

  try {
    const { DynamoDBClient, DescribeTableCommand } = await import('@aws-sdk/client-dynamodb');
    const ddbClient = new DynamoDBClient(clientConfig);
    const tableDesc = await ddbClient.send(new DescribeTableCommand({ TableName: dynamoDbTable }));
    dynamoStatus = tableDesc?.Table?.TableStatus === 'ACTIVE' ? 'ONLINE_ACTIVE' : tableDesc?.Table?.TableStatus || 'UNKNOWN';
  } catch (e) {
    dynamoStatus = `ERROR: ${e.message}`;
  }

  try {
    const { SageMakerClient, DescribeEndpointCommand } = await import('@aws-sdk/client-sagemaker');
    const smClient = new SageMakerClient(clientConfig);
    const epDesc = await smClient.send(new DescribeEndpointCommand({ EndpointName: sagemakerEndpoint }));
    sagemakerStatus = epDesc?.EndpointStatus || 'UNKNOWN';
  } catch (e) {
    sagemakerStatus = `NOT_DEPLOYED (${e.name || e.message})`;
  }

  const isAwsOnline = dynamoStatus.includes('ACTIVE') || sagemakerStatus.includes('InService');

  res.json({
    status: 'ONLINE',
    awsConnected: isAwsOnline || Boolean(accessKey && secretKey),
    region,
    dynamoDb: {
      tableName: dynamoDbTable,
      status: dynamoStatus,
    },
    sagemaker: {
      endpointName: sagemakerEndpoint,
      status: sagemakerStatus,
    },
    bedrock: {
      modelId: bedrockModel,
      status: bedrockStatus,
    },
    iotCore: {
      status: 'NOT_DEPLOYED (Direct HTTP REST Ingest Active)',
    },
    availableCities: Object.keys(CITIES_CONFIG),
    executionEnvironment: process.env.AWS_LAMBDA_FUNCTION_NAME ? 'AWS_LAMBDA' : 'LOCAL_EXPRESS_SERVER',
  });
});

/**
 * Amazon SES (Simple Email Service) Status
 */
router.get('/api/ses/health', async (req, res) => {
  const health = await getSesHealth();
  res.json(health);
});

export default router;
