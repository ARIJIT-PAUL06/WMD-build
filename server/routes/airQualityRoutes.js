import express from 'express';
import { environmentalProvider } from '../environmentalService.js';
import {
  saveReadingToDynamoDB,
  getHistoricalReadings,
  generateBedrockAdvisory
} from '../awsServices.js';
import { analyzeChemicalFingerprint, fetchLiveSourceAttribution } from '../sourceAttributionService.js';
import { computeLlmLimiter } from '../middleware/authAndRateLimit.js';

const router = express.Router();

/**
 * Main Air Quality Endpoint:
 * Sensor/OpenMeteo -> API Gateway -> Lambda -> DynamoDB -> Bedrock -> Response
 */
router.get('/api/air-quality', computeLlmLimiter, async (req, res) => {
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

    // 4. Return normalized response with authentic backend telemetry
    res.json({
      success: true,
      data: metrics,
      serverTelemetry: {
        environment: process.env.AWS_LAMBDA_FUNCTION_NAME ? 'AWS_LAMBDA' : 'LOCAL_EXPRESS_DEV',
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
          success: bedrockResult.success || false,
          error: bedrockResult.error || null,
        },
        region: process.env.AWS_REGION || 'ap-south-1',
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
router.get('/api/history', async (req, res) => {
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
 * Multi-Gas Chemical Source Attribution & Forensic Fingerprinting
 */
router.get('/api/source-attribution', async (req, res) => {
  try {
    const { lat, lon, pm25, pm10, no2, so2, o3, co, windSpeed, temp, month, day, hour } = req.query;

    if (pm10 !== undefined && no2 !== undefined) {
      // Direct analytical calculation if telemetry vectors provided
      const fingerprint = analyzeChemicalFingerprint({
        pm25: pm25 ? Number(pm25) : 145,
        pm10: Number(pm10),
        no2: Number(no2),
        so2: so2 ? Number(so2) : 12,
        o3: o3 ? Number(o3) : 35,
        co: co ? Number(co) : 1.0,
        windSpeed: windSpeed ? Number(windSpeed) : 2.2,
        temp: temp ? Number(temp) : 24,
        month: month ? Number(month) : new Date().getMonth() + 1,
        day: day ? Number(day) : new Date().getDate(),
        hour: hour ? Number(hour) : new Date().getHours()
      });
      return res.json({ success: true, mode: 'DIRECT_VECTOR_ANALYSIS', fingerprint });
    }

    // Otherwise, fetch live telemetry via Open-Meteo multi-gas sensor ingest
    const result = await fetchLiveSourceAttribution({
      lat: lat ? parseFloat(lat) : 28.6139,
      lon: lon ? parseFloat(lon) : 77.2090,
      currentPm25: pm25 ? Number(pm25) : null
    });

    res.json(result);
  } catch (err) {
    console.error('[API /api/source-attribution Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
