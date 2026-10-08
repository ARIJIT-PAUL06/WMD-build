import dotenv from 'dotenv';

dotenv.config();

const region = process.env.AWS_REGION || 'ap-south-1';
const accessKey = process.env.APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const secretKey = process.env.APP_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const hasAwsCredentials = Boolean(accessKey && secretKey);

// In-memory fallback database for local hackathon demo when AWS credentials are not yet configured
const localHistoryStore = new Map();

let ddbDocClient = null;
let bedrockClient = null;
let isAwsInitialized = false;

async function initAwsClientsIfNeeded() {
  if (isAwsInitialized) return;
  isAwsInitialized = true;

  if (hasAwsCredentials) {
    try {
      const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
      const { DynamoDBDocumentClient } = await import('@aws-sdk/lib-dynamodb');
      const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');

      const awsCreds = {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
        ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {})
      };

      const ddbClient = new DynamoDBClient({ region, credentials: awsCreds });
      ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
      bedrockClient = new BedrockRuntimeClient({ region, credentials: awsCreds });
      console.log(`[AWS Services] Initialized with live AWS credentials in region: ${region}`);
    } catch (err) {
      console.warn(`[AWS Services] Error initializing AWS SDK, falling back to local simulation:`, err.message);
    }
  } else {
    console.log(`[AWS Services] Running in local simulation mode (No AWS_ACCESS_KEY_ID provided). Live fallback active.`);
  }
}

/**
 * Save an air quality reading to DynamoDB (or local store)
 */
export async function saveReadingToDynamoDB(reading) {
  await initAwsClientsIfNeeded();
  const startTime = Date.now();
  const tableName = process.env.DYNAMODB_TABLE_NAME || 'AirQualityReadings';

  const rawTs = reading.timestamp || Date.now();
  const item = {
    city: reading.city,
    timestamp: String(rawTs),
    numericTimestamp: Number(rawTs),
    dateStr: new Date(rawTs).toISOString(),
    aqi: reading.aqi,
    status: reading.status,
    pm25: reading.pollutants?.pm25 ?? 0,
    pm10: reading.pollutants?.pm10 ?? 0,
    no2: reading.pollutants?.no2 ?? 0,
    so2: reading.pollutants?.so2 ?? 0,
    o3: reading.pollutants?.o3 ?? 0,
    co: reading.pollutants?.co ?? 0,
    temp: reading.weather?.temp ?? 0,
    humidity: reading.weather?.humidity ?? 0,
    advisory: reading.advisory || '',
    source: reading.source || 'Sensors / Open-Meteo',
  };

  // Always keep in local memory store for fast local trend retrieval
  if (!localHistoryStore.has(reading.city)) {
    localHistoryStore.set(reading.city, []);
  }
  const cityHistory = localHistoryStore.get(reading.city);
  cityHistory.push(item);
  if (cityHistory.length > 48) {
    cityHistory.shift();
  }

  if (hasAwsCredentials && ddbDocClient) {
    try {
      const { PutCommand } = await import('@aws-sdk/lib-dynamodb');
      await ddbDocClient.send(new PutCommand({
        TableName: tableName,
        Item: item,
      }));
      return {
        success: true,
        mode: 'AWS_DYNAMODB',
        latencyMs: Date.now() - startTime,
        tableName,
        item,
      };
    } catch (err) {
      console.warn(`[DynamoDB] Failed to write item to table "${tableName}":`, err.message);
      return {
        success: false,
        mode: 'LOCAL_FALLBACK',
        latencyMs: Date.now() - startTime,
        error: err.message,
        item,
      };
    }
  }

  return {
    success: true,
    mode: 'LOCAL_EMULATED',
    latencyMs: Date.now() - startTime,
    tableName: `${tableName} (Local In-Memory)`,
    item,
  };
}

/**
 * Fetch historical readings for a city
 */
export async function getHistoricalReadings(city, limit = 24) {
  await initAwsClientsIfNeeded();
  const startTime = Date.now();
  const tableName = process.env.DYNAMODB_TABLE_NAME || 'AirQualityReadings';

  if (hasAwsCredentials && ddbDocClient) {
    try {
      const { QueryCommand } = await import('@aws-sdk/lib-dynamodb');
      const result = await ddbDocClient.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'city = :city',
        ExpressionAttributeValues: {
          ':city': city,
        },
        ScanIndexForward: false,
        Limit: limit,
      }));

      if (result.Items && result.Items.length > 0) {
        return {
          success: true,
          mode: 'AWS_DYNAMODB',
          latencyMs: Date.now() - startTime,
          data: result.Items.reverse().map(it => ({
            ...it,
            timestamp: Number(it.numericTimestamp || it.timestamp)
          })),
        };
      }
    } catch (err) {
      console.warn(`[DynamoDB] Query failed for table "${tableName}":`, err.message);
      return {
        success: false,
        mode: 'DYNAMODB_ERROR',
        error: err.message,
        latencyMs: Date.now() - startTime,
        data: []
      };
    }
  }

  // Return live readings captured in local memory during current session if DynamoDB has no records yet
  const sessionItems = localHistoryStore.get(city) || [];
  return {
    success: true,
    mode: sessionItems.length > 0 ? 'LOCAL_SESSION_STORE' : 'EMPTY_NO_RECORDS',
    latencyMs: Date.now() - startTime,
    data: sessionItems.slice(-limit),
    totalCount: sessionItems.length
  };
}

/**
 * Generate human-readable explanation & actionable advisory using Amazon Bedrock
 * Transparently invokes live Amazon Bedrock Foundation Models.
 */
export async function generateBedrockAdvisory(metrics) {
  await initAwsClientsIfNeeded();
  const startTime = Date.now();
  const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';

  const prompt = `You are an atmospheric scientist and environmental health advisor for the Bharat Builds Environmental Hacks platform.
Given the following environmental sensor telemetry:
- City: ${metrics.city}
- AQI: ${metrics.aqi} (${metrics.status})
- PM2.5: ${metrics.pollutants?.pm25 || 'N/A'} µg/m³
- PM10: ${metrics.pollutants?.pm10 || 'N/A'} µg/m³
- Dominant Pollutant: ${metrics.dominantPollutant || 'PM2.5'}
- Weather: ${metrics.weather?.temp || 28}°C, ${metrics.weather?.humidity || 60}% Humidity

Task:
Provide a concise, direct, 2 to 3 sentence health advisory for citizens and students.
Include:
1. One sentence explaining the biological impact on human lungs/respiratory tract today.
2. One specific actionable recommendation for school commutes, outdoor activities, or air filtration.
Format: Return ONLY the explanation and recommendation. No preamble or meta commentary.`;

  if (hasAwsCredentials && bedrockClient) {
    try {
      const { InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');
      let requestBody;
      if (modelId.includes('anthropic.claude')) {
        requestBody = JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 250,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        });
      } else {
        requestBody = JSON.stringify({
          inputText: prompt,
          textGenerationConfig: {
            maxTokenCount: 250,
            stopSequences: [],
            temperature: 0.3,
            topP: 0.9,
          },
        });
      }

      const response = await bedrockClient.send(new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: new TextEncoder().encode(requestBody),
      }));

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      let explanation = '';

      if (modelId.includes('anthropic.claude')) {
        explanation = responseBody.content?.[0]?.text?.trim() || '';
      } else {
        explanation = responseBody.results?.[0]?.outputText?.trim() || '';
      }

      if (explanation) {
        return {
          success: true,
          advisory: explanation,
          modelId,
          mode: 'AWS_BEDROCK_LIVE',
          latencyMs: Date.now() - startTime,
        };
      }
    } catch (err) {
      console.warn(`[Bedrock] Live invocation failed:`, err.message);
      return {
        success: false,
        advisory: null,
        error: err.message,
        modelId,
        mode: 'AWS_BEDROCK_UNAVAILABLE',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  return {
    success: false,
    advisory: null,
    error: 'AWS_BEDROCK_NOT_INITIALIZED_OR_CREDENTIALS_MISSING',
    modelId,
    mode: 'AWS_BEDROCK_UNAVAILABLE',
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Deterministic clinical health advice based strictly on ICMR / CPCB standards.
 * Explicitly identified as statutory clinical rules, NEVER masquerading as AI.
 */
export function getClinicalHealthGuidelines(metrics) {
  const aqi = metrics.aqi;
  const city = metrics.city;
  const pm25 = metrics.pollutants?.pm25 || 85;

  if (aqi <= 50) {
    return `Air quality in ${city} is optimal (AQI ${aqi}). Atmospheric particulate levels pose virtually no oxidative stress on alveolar lung tissue. Ideal conditions for outdoor workouts, school sports, and natural indoor ventilation.`;
  } else if (aqi <= 100) {
    return `Air quality in ${city} is moderate (AQI ${aqi}). Mild particulate concentrations are acceptable for most, though hyper-sensitive individuals may experience subtle bronchial irritation. No restrictions required for regular daily commuting.`;
  } else if (aqi <= 150) {
    return `Air quality is unhealthy for sensitive groups in ${city} (AQI ${aqi}, PM2.5: ${pm25} µg/m³). Children, elderly citizens, and asthmatics will face elevated airway resistance. Sensitive individuals should wear protective masks and limit prolonged outdoor sports.`;
  } else if (aqi <= 200) {
    return `Air quality in ${city} is unhealthy across the urban basin (AQI ${aqi}). Elevated fine particulates (PM2.5) penetrate deep into the lower bronchial tree, triggering respiratory inflammation. Outdoor physical exertion should be avoided, and school morning assemblies moved indoors.`;
  } else if (aqi <= 300) {
    return `Air quality in ${city} is very unhealthy (AQI ${aqi}, PM2.5: ${pm25} µg/m³). Inhalation of these particulate levels causes severe bronchial constriction. All residents must wear certified N95 respirators outdoors and run HEPA air purifiers indoors.`;
  } else {
    return `CRITICAL HEALTH ALERT: Air quality in ${city} is Hazardous (AQI ${aqi}). Toxic atmospheric smog and micro-particulates cause acute pulmonary distress and systemic vascular stress. Outdoor exposure must be strictly prohibited, schools should transition to hybrid mode, and sealed indoor air filtration is mandatory.`;
  }
}

/**
 * Retrieve persistent autonomous monitor state from DynamoDB
 */
export async function getMonitorStateFromDynamoDB() {
  await initAwsClientsIfNeeded();
  const tableName = process.env.DYNAMODB_TABLE_NAME || 'AirQualityReadings';
  if (hasAwsCredentials && ddbDocClient) {
    try {
      const { GetCommand } = await import('@aws-sdk/lib-dynamodb');
      const res = await ddbDocClient.send(new GetCommand({
        TableName: tableName,
        Key: { city: 'SYSTEM_MONITOR_STATE', timestamp: 'LATEST' }
      }));
      if (res && res.Item && res.Item.stateJson) {
        return JSON.parse(res.Item.stateJson);
      }
    } catch (err) {
      console.warn('[DynamoDB] Failed reading monitor state:', err.message);
    }
  }
  return null;
}

/**
 * Persist autonomous monitor state into DynamoDB across all Lambda cold starts
 */
export async function saveMonitorStateToDynamoDB(state) {
  await initAwsClientsIfNeeded();
  const tableName = process.env.DYNAMODB_TABLE_NAME || 'AirQualityReadings';
  if (hasAwsCredentials && ddbDocClient) {
    try {
      const { PutCommand } = await import('@aws-sdk/lib-dynamodb');
      await ddbDocClient.send(new PutCommand({
        TableName: tableName,
        Item: {
          city: 'SYSTEM_MONITOR_STATE',
          timestamp: 'LATEST',
          stateJson: JSON.stringify(state),
          updatedAt: new Date().toISOString()
        }
      }));
      return true;
    } catch (err) {
      console.warn('[DynamoDB] Failed saving monitor state:', err.message);
    }
  }
  return false;
}


