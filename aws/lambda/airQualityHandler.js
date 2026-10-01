/**
 * AWS Lambda Handler: AirQualityFunction
 * Handles GET /api/air-quality and GET /api/history via API Gateway.
 * Persists data to Amazon DynamoDB and invokes Amazon Bedrock for AI explanations.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const region = process.env.AWS_REGION || 'ap-south-1';
const tableName = process.env.DYNAMODB_TABLE_NAME || 'AirQualityReadings';
const bedrockModelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
const bedrockClient = new BedrockRuntimeClient({ region });

export const handler = async (event) => {
  console.log('Incoming Event:', JSON.stringify(event));
  const path = event.path || event.rawPath || '';
  const query = event.queryStringParameters || {};
  const city = query.city || 'Delhi (DTU / Bawana)';

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    if (path.includes('/history')) {
      // Query DynamoDB for historical readings
      const ddbResponse = await ddbDocClient.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'city = :city',
        ExpressionAttributeValues: { ':city': city },
        ScanIndexForward: false,
        Limit: 24,
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          mode: 'AWS_DYNAMODB',
          data: (ddbResponse.Items || []).reverse(),
        }),
      };
    }

    // 1. Fetch live environmental data from Open-Meteo
    const coords = getCityCoords(city);
    const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coords.lat}&longitude=${coords.lon}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,uv_index`;
    
    const apiRes = await fetch(airQualityUrl);
    const apiData = await apiRes.json();
    const current = apiData.current || {};

    const pm25 = current.pm2_5 ?? 65;
    const pm10 = current.pm10 ?? 110;
    const aqi = current.us_aqi || Math.round(pm25 * 1.5);
    const status = getAqiStatus(aqi);

    const metrics = {
      city,
      timestamp: Date.now(),
      dateStr: new Date().toISOString(),
      aqi,
      status: status.label,
      dominantPollutant: 'PM2.5',
      pollutants: {
        pm25,
        pm10,
        no2: current.nitrogen_dioxide ?? 28,
        so2: current.sulphur_dioxide ?? 12,
        o3: current.ozone ?? 35,
        co: 0.9,
      },
      weather: { temp: 30, humidity: 52 },
      source: 'Open-Meteo / Sensor Network via AWS Lambda',
    };

    // 2. Call Amazon Bedrock for AI Health Explanation
    try {
      const prompt = `Environmental Alert for ${city}: AQI is ${aqi} (${status.label}), PM2.5: ${pm25} µg/m³. Provide a concise 2-sentence health advisory on respiratory impact and student commute recommendation.`;
      const bedrockRes = await bedrockClient.send(new InvokeModelCommand({
        modelId: bedrockModelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: new TextEncoder().encode(JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 180,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
        })),
      }));

      const bedrockBody = JSON.parse(new TextDecoder().decode(bedrockRes.body));
      metrics.advisory = bedrockBody.content?.[0]?.text?.trim() || '';
    } catch (bedrockErr) {
      console.warn('Bedrock invocation fallback:', bedrockErr.message);
      metrics.advisory = `Air quality is currently ${status.label} in ${city}. Sensitive individuals should limit outdoor activities and use N95 filtration.`;
    }

    // 3. Save to DynamoDB
    await ddbDocClient.send(new PutCommand({
      TableName: tableName,
      Item: metrics,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: metrics,
        awsTelemetry: {
          region,
          runtime: 'nodejs20.x',
          dynamoDbTable: tableName,
          bedrockModel: bedrockModelId,
        }
      }),
    };
  } catch (error) {
    console.error('Lambda Execution Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};

function getCityCoords(city) {
  if (city.includes('Delhi')) return { lat: 28.7495, lon: 77.1171 };
  if (city.includes('Mumbai')) return { lat: 19.0760, lon: 72.8777 };
  if (city.includes('Bengaluru')) return { lat: 12.9716, lon: 77.5946 };
  return { lat: 28.6139, lon: 77.2090 };
}

function getAqiStatus(aqi) {
  if (aqi <= 50) return { label: 'Good' };
  if (aqi <= 100) return { label: 'Moderate' };
  if (aqi <= 150) return { label: 'Unhealthy for Sensitive Groups' };
  if (aqi <= 200) return { label: 'Unhealthy' };
  if (aqi <= 300) return { label: 'Very Unhealthy' };
  return { label: 'Hazardous' };
}
