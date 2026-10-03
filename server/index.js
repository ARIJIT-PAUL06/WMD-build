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
import { aggregateSchoolEvidence, generateDraftPetition } from './evidenceService.js';
import { getSchoolAqiForecast } from './sagemakerService.js';
import {
  getAllDirectoryFacilities,
  getFacilityById,
  getFacilitiesInGrid,
  generate630Advisory,
  testDispatch630Advisory
} from './advisoryDispatchService.js';

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
    sagemakerEndpoint: process.env.SAGEMAKER_ENDPOINT_NAME || 'vayuvitals-delhi-schools-xgboost',
    availableCities: Object.keys(CITIES_CONFIG),
    features: {
      s3AndCloudFrontReady: true,
      apiGatewayLambdaReady: true,
      dynamoDbHistoricalTracking: true,
      bedrockHumanExplanationLayer: true,
      sagemakerPredictiveInference: true,
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
    const lat = req.query.lat ? Number(req.query.lat) : null;
    const lon = req.query.lon ? Number(req.query.lon) : null;
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

/**
 * ============================================================================
 * Petition & Action Module Endpoints (Evidence to Action - Section 10)
 * ============================================================================
 */

/**
 * Step 1: Pull empirical evidence & school-hour exceedance metrics
 */
app.get('/api/petition/evidence', async (req, res) => {
  try {
    const { schoolName, locality, stationName, stationDistanceKm, days, threshold, basePm25 } = req.query;
    const evidence = aggregateSchoolEvidence({
      schoolName,
      locality,
      stationName,
      stationDistanceKm,
      days,
      threshold,
      basePm25: basePm25 ? Number(basePm25) : 142
    });
    res.json(evidence);
  } catch (err) {
    console.error('[API /api/petition/evidence Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Step 1b: 48-Hour Machine Learning & SageMaker Air Quality Forecast
 * Provides forward predictive intelligence for morning school hours (07:00 - 13:00)
 */
app.get('/api/petition/forecast', async (req, res) => {
  try {
    const { schoolId, schoolName, lat, lon, basePm25, threshold } = req.query;
    const forecast = await getSchoolAqiForecast({
      schoolId: schoolId || 'dps_rohini',
      schoolName: schoolName || 'Delhi Public School, Rohini',
      lat: lat ? parseFloat(lat) : 28.7188,
      lon: lon ? parseFloat(lon) : 77.1064,
      basePm25: basePm25 ? parseInt(basePm25, 10) : 145,
      threshold: threshold ? parseInt(threshold, 10) : 60
    });
    res.json(forecast);
  } catch (err) {
    console.error('[API /api/petition/forecast Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Step 2: Generate bilingual draft complaint from verified numbers
 */
app.post('/api/petition/generate-draft', (req, res) => {
  try {
    const { evidence, authority, forecast, senderName, senderRole, senderContact, selectedDemands } = req.body;
    if (!evidence || !authority) {
      return res.status(400).json({ success: false, error: 'evidence and authority objects are required' });
    }
    const result = generateDraftPetition({
      evidence,
      authority,
      forecast,
      senderName,
      senderRole,
      senderContact,
      selectedDemands
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[API /api/petition/generate-draft Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Step 2 (Optional): Tone adjustment via Bedrock (Claude 3 Haiku) or Gemini
 */
app.post('/api/petition/polish-draft', async (req, res) => {
  try {
    const { draftText, tone = 'formal', language = 'en', schoolName = 'School' } = req.body;
    if (!draftText) {
      return res.status(400).json({ success: false, error: 'draftText is required' });
    }

    const toneDescriptions = {
      formal: 'Strictly formal, respectful, and administrative according to official Indian government grievance etiquette.',
      urgent: 'Urgent and impassioned public health alert emphasizing child respiratory vulnerability and immediate morning action, while maintaining administrative decorum.',
      collaborative: 'Constructive and partnership-oriented, offering school collaboration and civil society coordination with authorities.'
    };

    const toneInstruction = toneDescriptions[tone] || toneDescriptions.formal;
    const langInstruction = language === 'hi'
      ? 'The text is in formal administrative Hindi. Maintain correct Rajbhasha administrative vocabulary and respectful salutations.'
      : 'The text is in English. Maintain standard bureaucratic memorandum style.';

    const systemPrompt = `You are a specialized legal and environmental administrative drafting assistant for educational institutions in India.
Your task is to refine the tone of an official civic grievance letter addressed to municipal and pollution control authorities.

Tone requested: ${toneInstruction}
Language: ${langInstruction}

Strict Guardrails (DO NOT VIOLATE):
1. Do NOT alter, fabricate, or exaggerate any dates, numbers, PM2.5 levels, or station statistics in the draft. Keep all empirical data 100% exact.
2. Do NOT make unsupported medical diagnoses or catastrophic clinical claims (e.g. do not say "causing irreversible cancer/death"). Refer instead to "acute respiratory distress, particulate inhalation risk, and vulnerable pediatric pulmonary health".
3. Maintain the recipient address, subject, specific demands, and sender closing intact.
4. Output ONLY the polished letter text. No meta-commentary, no conversational filler, no markdown wrappers like \`\`\`.`;

    // Try Bedrock first if AWS credentials present
    const hasAws = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
    if (hasAws) {
      try {
        const { BedrockRuntimeClient, InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');
        const region = process.env.AWS_REGION || 'ap-south-1';
        const client = new BedrockRuntimeClient({ region });
        const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';

        const requestBody = JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 1500,
          system: systemPrompt,
          messages: [{ role: 'user', content: draftText }],
          temperature: 0.2
        });

        const command = new InvokeModelCommand({
          modelId,
          contentType: 'application/json',
          accept: 'application/json',
          body: new TextEncoder().encode(requestBody)
        });

        const response = await client.send(command);
        const respData = JSON.parse(new TextDecoder().decode(response.body));
        const polishedText = respData.content?.[0]?.text?.trim();
        if (polishedText) {
          return res.json({
            success: true,
            polishedText,
            mode: 'AWS_BEDROCK_LIVE',
            model: modelId
          });
        }
      } catch (bedrockErr) {
        console.warn('[Bedrock polish-draft failed, trying Gemini]:', bedrockErr.message);
      }
    }

    // Try Gemini if GEMINI_API_KEY present
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const gRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: draftText }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 1500
            }
          }),
          signal: AbortSignal.timeout(8000)
        });
        if (gRes.ok) {
          const gData = await gRes.json();
          const polishedText = gData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (polishedText) {
            return res.json({
              success: true,
              polishedText,
              mode: 'GEMINI_AI_LIVE',
              model: 'gemini-2.5-flash'
            });
          }
        }
      } catch (geminiErr) {
        console.warn('[Gemini polish-draft failed]:', geminiErr.message);
      }
    }

    // Fallback: rule-based tone enhancement
    let transformedText = draftText;
    if (tone === 'urgent') {
      transformedText = draftText
        .replace(/Subject: (.*)/i, 'Subject: [CRITICAL CITIZEN HEALTH ALERT] Urgent Request for Administrative Intervention on Hazardous Morning Air at ' + schoolName)
        .replace(/Respected Sir\/Madam,/i, 'Respected Sir/Madam,\n\n[URGENT: CHILD RESPIRATORY SAFETY ACTION REQUIRED]')
        .replace(/महोदय\/महोदया,/i, 'महोदय/महोदया,\n\n[अति-आवश्यक: बाल स्वास्थ्य एवं श्वसन सुरक्षा आपात सूचना]');
    } else if (tone === 'collaborative') {
      transformedText = draftText
        .replace(/Subject: (.*)/i, 'Subject: Joint Civic Representation & Request for Collaborative Air Quality Action at ' + schoolName)
        .replace(/We respectfully request the competent authority/i, 'In the spirit of active civic partnership and public school welfare, we warmly urge the competent authority')
        .replace(/अतः आपसे सविनय अनुरोध है/i, 'नागरिक सहभागिता एवं बाल कल्याण की भावना से हम सक्षम प्राधिकारी से सादर आग्रह करते हैं');
    }

    res.json({
      success: true,
      polishedText: transformedText,
      mode: 'INTELLIGENT_RULE_POLISHER',
      model: 'deterministic-rules'
    });
  } catch (err) {
    console.error('[API /api/petition/polish-draft Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ============================================================================
 * 6:30 AM Advisory & Institutional Directory Endpoints
 * ============================================================================
 */

/**
 * Get all Delhi schools, universities, and hospitals with verified emails & grid blocks
 */
app.get('/api/directory/facilities', (req, res) => {
  try {
    const { district, facilityClass, gridId } = req.query;
    let data = getAllDirectoryFacilities();
    let facilities = data.facilities;

    if (district) {
      facilities = facilities.filter(f => f.district && f.district.toLowerCase().includes(district.toLowerCase()));
    }
    if (facilityClass) {
      facilities = facilities.filter(f => f.facilityClass === facilityClass);
    }
    if (gridId) {
      facilities = facilities.filter(f => f.gridId === gridId);
    }

    res.json({
      success: true,
      totalCount: facilities.length,
      nodalAuthorities: data.nodalAuthorities,
      facilities
    });
  } catch (err) {
    console.error('[API /api/directory/facilities Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Preview 6:30 AM Advisory bulletin for any facility
 */
app.get('/api/advisory/preview-630', async (req, res) => {
  try {
    const { facilityId = 'dps_rk_puram', basePm25 } = req.query;
    const advisory = await generate630Advisory({
      facilityId,
      basePm25: basePm25 ? parseInt(basePm25, 10) : 175
    });
    res.json({ success: true, advisory });
  } catch (err) {
    console.error('[API /api/advisory/preview-630 Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Test or simulate dispatching the 6:30 AM bulletin
 */
app.post('/api/advisory/test-dispatch', async (req, res) => {
  try {
    const { facilityId = 'dps_rk_puram', testEmail = 'tester@wmd-civic.in', isSandbox = true } = req.body;
    const result = await testDispatch630Advisory({
      facilityId,
      testEmail,
      isSandbox: isSandbox !== false
    });
    res.json(result);
  } catch (err) {
    console.error('[API /api/advisory/test-dispatch Error]:', err);
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
