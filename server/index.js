import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { environmentalProvider, CITIES_CONFIG } from './environmentalService.js';
import {
  saveReadingToDynamoDB,
  getHistoricalReadings,
  generateBedrockAdvisory,
} from './awsServices.js';
import { getDelhiHeatmapData, getUniversalHeatmapData, getIndiaNationalHeatmapData } from './fusionAqiService.js';
import { generateGeminiAdvisory } from './geminiService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

/**
 * Health check & AWS Configuration Status
 */
app.get('/api/aws-status', (req, res) => {
  const hasCreds = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  res.json({
    status: 'ONLINE',
    awsConnected: hasCreds,
    region: process.env.AWS_REGION || 'ap-south-1',
    dynamoDbTable: process.env.DYNAMODB_TABLE_NAME || 'AirQualityReadings',
    bedrockModel: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0',
    availableCities: Object.keys(CITIES_CONFIG),
    features: {
      s3AndCloudFrontReady: true,
      apiGatewayLambdaReady: true,
      dynamoDbHistoricalTracking: true,
      bedrockHumanExplanationLayer: true,
      iotCoreReady: true,
    }
  });
});

/**
 * Real-Time India National Subcontinent Spatial Heatmap Endpoint
 * Integrates 77 CAAQMS & ground monitoring stations spanning all states and territories
 */
app.get('/api/india-heatmap', async (req, res) => {
  try {
    const lat = req.query.lat ? Number(req.query.lat) : 28.6139;
    const lon = req.query.lon ? Number(req.query.lon) : 77.2090;
    const data = await getIndiaNationalHeatmapData(lat, lon);
    res.json(data);
  } catch (err) {
    console.error('[API /api/india-heatmap Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Real-Time Delhi Spatial Heatmap & Fusion Algorithm Endpoint
 */
app.get('/api/delhi-heatmap', async (req, res) => {
  try {
    const lat = req.query.lat ? Number(req.query.lat) : 28.7495;
    const lon = req.query.lon ? Number(req.query.lon) : 77.1171;
    const data = await getDelhiHeatmapData(lat, lon);
    res.json(data);
  } catch (err) {
    console.error('[API /api/delhi-heatmap Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Universal Multi-City & Global Regional Heatmap Endpoint
 * Works for any city, urban basin, or arbitrary GPS coordinate worldwide
 */
app.get('/api/region-heatmap', async (req, res) => {
  try {
    const lat = req.query.lat ? Number(req.query.lat) : 28.7495;
    const lon = req.query.lon ? Number(req.query.lon) : 77.1171;
    const city = req.query.city || 'Delhi';
    const data = await getUniversalHeatmapData(lat, lon, city);
    res.json(data);
  } catch (err) {
    console.error('[API /api/region-heatmap Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Main Air Quality Endpoint:
 * Simulates: Sensor/OpenMeteo -> API Gateway -> Lambda -> DynamoDB -> Bedrock -> Response
 */
app.get('/api/air-quality', async (req, res) => {
  try {
    const city = req.query.city || 'Delhi (DTU / Bawana)';
    const simulateAqi = req.query.simulateAqi !== undefined ? Number(req.query.simulateAqi) : null;
    const skipBedrock = req.query.skipBedrock === 'true';

    // 1. Fetch live or calibrated environmental metrics
    const metrics = await environmentalProvider.getMetrics(city, simulateAqi);

    // 2. Generate Bedrock AI explanation & health recommendations
    let bedrockResult = { advisory: '', modelId: 'none', latencyMs: 0 };
    if (!skipBedrock) {
      bedrockResult = await generateBedrockAdvisory(metrics);
    }
    metrics.advisory = bedrockResult.advisory;

    // 3. Persist to AWS DynamoDB
    const ddbResult = await saveReadingToDynamoDB(metrics);

    // 4. Return normalized response with full AWS execution telemetry
    res.json({
      success: true,
      data: metrics,
      awsTelemetry: {
        lambdaExecutionTimeMs: Math.round(15 + Math.random() * 10),
        dynamoDb: {
          mode: ddbResult.mode,
          tableName: ddbResult.tableName,
          latencyMs: ddbResult.latencyMs,
          success: ddbResult.success,
        },
        bedrock: {
          mode: bedrockResult.mode,
          modelId: bedrockResult.modelId,
          latencyMs: bedrockResult.latencyMs,
        },
        region: process.env.AWS_REGION || 'ap-south-1',
        requestId: `aws-req-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      }
    });
  } catch (err) {
    console.error('[API /api/air-quality Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Historical Data Endpoint:
 * Queries DynamoDB for 24-hour trends
 */
app.get('/api/history', async (req, res) => {
  try {
    const city = req.query.city || 'Delhi (DTU / Bawana)';
    const limit = Math.min(Number(req.query.limit) || 24, 48);

    const historyResult = await getHistoricalReadings(city, limit);
    res.json(historyResult);
  } catch (err) {
    console.error('[API /api/history Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Token-Optimized Google Gemini AI Health & Commute Advisory
 */
app.post('/api/gemini-advisory', async (req, res) => {
  try {
    const metrics = req.body;
    if (!metrics || metrics.aqi === undefined) {
      return res.status(400).json({ success: false, error: 'Metrics payload with aqi is required' });
    }
    const result = await generateGeminiAdvisory(metrics);
    res.json(result);
  } catch (err) {
    console.error('[API /api/gemini-advisory Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Standalone Amazon Bedrock Advisory Generator
 */
app.post('/api/bedrock-advisory', async (req, res) => {
  try {
    const metrics = req.body;
    if (!metrics || !metrics.city) {
      return res.status(400).json({ success: false, error: 'Metrics payload with city is required' });
    }

    const result = await generateBedrockAdvisory(metrics);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[API /api/bedrock-advisory Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * AWS IoT Core Ingestion Endpoint:
 * Simulates physical air-quality sensors pushing via MQTT/IoT Core:
 * Sensor -> IoT Core -> Lambda -> DynamoDB
 */
app.post('/api/sensor-ingest', async (req, res) => {
  try {
    const { deviceId, city, aqi, pm25, pm10, temp, humidity } = req.body;

    if (!city || aqi === undefined) {
      return res.status(400).json({ error: 'deviceId, city, and aqi are required' });
    }

    const statusInfo = environmentalProvider.categorizeAqi(aqi);
    const reading = {
      city,
      timestamp: Date.now(),
      aqi,
      status: statusInfo.label,
      categoryColor: statusInfo.color,
      dominantPollutant: 'PM2.5',
      pollutants: {
        pm25: pm25 ?? Math.round(aqi * 0.6),
        pm10: pm10 ?? Math.round(aqi * 1.1),
        no2: 25,
        so2: 12,
        o3: 30,
        co: 0.9,
      },
      weather: {
        temp: temp ?? 28,
        humidity: humidity ?? 50,
      },
      source: `AWS IoT Core Topic: sensors/${deviceId || 'esp32-delhi-01'}`,
    };

    // Save to DynamoDB
    const ddbResult = await saveReadingToDynamoDB(reading);

    res.json({
      success: true,
      message: 'IoT Telemetry successfully ingested and stored in DynamoDB',
      deviceId: deviceId || 'esp32-delhi-01',
      dynamoDb: ddbResult,
    });
  } catch (err) {
    console.error('[API /api/sensor-ingest Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🌿 AWS Environmental Hacks API Server running on port ${PORT}`);
    console.log(`📡 Endpoints:`);
    console.log(`   - GET  /api/air-quality?city=Delhi`);
    console.log(`   - GET  /api/history?city=Delhi`);
    console.log(`   - POST /api/bedrock-advisory`);
    console.log(`   - POST /api/sensor-ingest (IoT Core simulation)`);
    console.log(`   - GET  /api/aws-status`);
    console.log(`=======================================================`);
  });
}

export default app;
