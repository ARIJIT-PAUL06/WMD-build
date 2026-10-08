import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
  testDispatch630Advisory,
  evaluateMorningAdvisories,
  craftAndDispatchMidDayEmergency,
  FACILITY_TEST_MAPPINGS
} from './advisoryDispatchService.js';
import { getSesHealth, sendEmailViaSES, triggerEmailVerification } from './sesService.js';
import { analyzeChemicalFingerprint, fetchLiveSourceAttribution } from './sourceAttributionService.js';
import { syncAllPopulatedGrids, fetchLiveTelemetryForGrid, get14DayCompliance, findGridForCoordinates } from './gridTelemetryService.js';
import {
  startAutonomousDaemon,
  runAutonomousMonitoringCycle,
  dispatchBlockEmergencySurge,
  runPredictiveAdvisoryEvaluation,
  evaluate14DayChronicBlockPetitions,
  getMonitorStatus,
  clearMonitorDebounces
} from './autonomousAtmosphericMonitor.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8081',
  'http://localhost:19006',
  'https://wmd-civic.in',
  'https://vayuvitals.in'
];
if (process.env.VERCEL_URL) {
  const vercelOrigin = process.env.VERCEL_URL.startsWith('http')
    ? process.env.VERCEL_URL
    : `https://${process.env.VERCEL_URL}`;
  allowedOrigins.push(vercelOrigin);
}
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Non-browser callers (mobile app via Expo/fetch) send no origin
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true
}));
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// Root & Health check endpoints
app.get('/', (req, res) => {
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

app.get('/api/health', (req, res) => {
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
app.get('/api/aws-status', async (req, res) => {
  const accessKey = process.env.APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.APP_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const hasCreds = Boolean(accessKey && secretKey);
  const region = process.env.AWS_REGION || 'ap-south-1';
  const dynamoDbTable = process.env.DYNAMODB_TABLE_NAME || 'AirQualityReadings';
  const sagemakerEndpoint = process.env.SAGEMAKER_ENDPOINT_NAME || 'wmd-delhi-48h-forecast-endpoint';
  const bedrockModel = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';

  let dynamoStatus = 'NOT_CHECKED';
  let sagemakerStatus = 'OFFLINE_NO_ENDPOINT';
  let bedrockStatus = 'UNAUTHORIZED_OR_NOT_CONFIGURED';

  if (hasCreds) {
    const sessionToken = accessKey?.startsWith('ASIA') ? process.env.AWS_SESSION_TOKEN : undefined;
    const credentials = {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      ...(sessionToken ? { sessionToken } : {})
    };

    try {
      const { DynamoDBClient, DescribeTableCommand } = await import('@aws-sdk/client-dynamodb');
      const ddbClient = new DynamoDBClient({ region, credentials });
      const tableDesc = await ddbClient.send(new DescribeTableCommand({ TableName: dynamoDbTable }));
      dynamoStatus = tableDesc?.Table?.TableStatus === 'ACTIVE' ? 'ONLINE_ACTIVE' : tableDesc?.Table?.TableStatus || 'UNKNOWN';
    } catch (e) {
      dynamoStatus = `ERROR: ${e.message}`;
    }

    try {
      const { SageMakerClient, DescribeEndpointCommand } = await import('@aws-sdk/client-sagemaker');
      const smClient = new SageMakerClient({ region, credentials });
      const epDesc = await smClient.send(new DescribeEndpointCommand({ EndpointName: sagemakerEndpoint }));
      sagemakerStatus = epDesc?.EndpointStatus || 'UNKNOWN';
    } catch (e) {
      sagemakerStatus = `NOT_DEPLOYED (${e.name || e.message})`;
    }
  }

  res.json({
    status: 'ONLINE',
    awsConnected: hasCreds,
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
      source: `Edge Device HTTP Ingest: ${deviceId || 'esp32-delhi-01'}`,
    };

    // Save to DynamoDB
    const ddbResult = await saveReadingToDynamoDB(reading);

    res.json({
      success: true,
      message: 'Edge sensor telemetry ingested and stored in DynamoDB',
      ingestProtocol: 'HTTP_REST',
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

// Bounded sliding window rate limiter for petition endpoints
const petitionRateLimits = new Map();
const MAX_RATE_LIMIT_ENTRIES = 5000;

function rateLimitPetition(maxReqs = 60, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'client';
    const now = Date.now();

    // Bounded cleanup to prevent memory exhaustion
    if (petitionRateLimits.size > MAX_RATE_LIMIT_ENTRIES) {
      for (const [k, times] of petitionRateLimits.entries()) {
        const fresh = times.filter(t => now - t < windowMs);
        if (fresh.length === 0) {
          petitionRateLimits.delete(k);
        } else {
          petitionRateLimits.set(k, fresh);
        }
      }
      if (petitionRateLimits.size > MAX_RATE_LIMIT_ENTRIES) {
        petitionRateLimits.clear();
      }
    }

    const records = petitionRateLimits.get(ip) || [];
    const valid = records.filter(t => now - t < windowMs);
    if (valid.length >= maxReqs) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests on petition endpoints. Please slow down.'
      });
    }
    valid.push(now);
    petitionRateLimits.set(ip, valid);
    next();
  };
}

/**
 * Ensures AI polishing did not alter, add, or strip empirical numbers or calendar dates.
 * Enforces exact bidirectional whole-number match per P5.1.
 */
export function verifyNumbersPreserved(originalText, polishedText) {
  if (!originalText || !polishedText) return false;
  const origMatches = originalText.match(/\b\d+\b/g) || [];
  const polishedMatches = polishedText.match(/\b\d+\b/g) || [];

  const origCounts = {};
  for (const n of origMatches) {
    origCounts[n] = (origCounts[n] || 0) + 1;
  }

  const polishedCounts = {};
  for (const n of polishedMatches) {
    polishedCounts[n] = (polishedCounts[n] || 0) + 1;
  }

  // Reject if any number in original disappeared or count changed
  for (const [num, count] of Object.entries(origCounts)) {
    if ((polishedCounts[num] || 0) !== count) {
      return false;
    }
  }

  // Reject if any new number was added in polished text
  for (const [num, count] of Object.entries(polishedCounts)) {
    if ((origCounts[num] || 0) !== count) {
      return false;
    }
  }

  return true;
}

export const SENDER_PLACEHOLDERS = [
  '[YOUR NAME]',
  '[YOUR ROLE / DESIGNATION]',
  '[YOUR PHONE / EMAIL]'
];

export function verifyPlaceholdersPreserved(originalText, polishedText) {
  if (!originalText || !polishedText) return false;
  for (const placeholder of SENDER_PLACEHOLDERS) {
    if (originalText.includes(placeholder) && !polishedText.includes(placeholder)) {
      return false;
    }
  }
  return true;
}

/**
 * Step 0: Read-only authorities directory
 */
app.get('/api/petition/authorities', rateLimitPetition(60, 60000), (req, res) => {
  try {
    const pCandidates = [
      path.join(__dirname, '../src/data/authoritiesConfig.json'),
      path.join(process.cwd(), 'src/data/authoritiesConfig.json'),
      path.join('/tmp', 'authoritiesConfig.json')
    ];
    for (const p of pCandidates) {
      if (fs.existsSync(p)) {
        const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
        return res.json({ success: true, ...raw });
      }
    }
    res.status(404).json({ success: false, error: 'Authorities configuration not found on server' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Step 0b: Read-only schools directory search
 */
app.get('/api/petition/schools', rateLimitPetition(60, 60000), (req, res) => {
  try {
    const q = (req.query.q || '').trim().toLowerCase();
    const pCandidates = [
      path.join(__dirname, '../src/data/schoolsDirectory.json'),
      path.join(process.cwd(), 'src/data/schoolsDirectory.json'),
      path.join('/tmp', 'schoolsDirectory.json')
    ];
    let schools = [];
    for (const p of pCandidates) {
      if (fs.existsSync(p)) {
        const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
        schools = raw.educationalInstitutions || [];
        break;
      }
    }

    // Whitelist fields per Fix 11: id, name, locality, district, lat, lon, gridId
    // Strictly removes emails, primaryEmail, phone, and nodalOfficerEmail
    const cleanSchools = schools.map(s => {
      let cellId = s.gridId || null;
      if (!cellId && s.lat != null && s.lon != null) {
        const g = findGridForCoordinates(s.lat, s.lon);
        cellId = g?.grid_id || g?.id || null;
      }
      return {
        id: s.id,
        name: s.name,
        locality: s.locality || '',
        district: s.district || '',
        lat: s.lat,
        lon: s.lon,
        gridId: cellId
      };
    });

    if (!q) {
      return res.json({ success: true, count: cleanSchools.length, schools: cleanSchools.slice(0, 50) });
    }
    const filtered = cleanSchools.filter(s =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.locality && s.locality.toLowerCase().includes(q)) ||
      (s.district && s.district.toLowerCase().includes(q))
    );
    res.json({ success: true, count: filtered.length, schools: filtered.slice(0, 50) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Step 1: Pull empirical evidence & school-hour exceedance metrics
 */
app.get('/api/petition/evidence', rateLimitPetition(60, 60000), async (req, res) => {
  try {
    const { schoolName, locality, stationName, stationDistanceKm, days, threshold, gridId } = req.query;
    if (!schoolName && !stationName && !gridId) {
      return res.status(400).json({
        success: false,
        error: 'schoolName or stationName parameter is required'
      });
    }
    const evidence = aggregateSchoolEvidence({
      schoolName,
      locality,
      stationName,
      stationDistanceKm,
      days,
      threshold,
      gridId
    });
    res.json(evidence);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

/**
 * Step 1b: 48-Hour Machine Learning & SageMaker Air Quality Forecast
 * Provides forward predictive intelligence for morning school hours (07:00 - 13:00)
 */
app.get('/api/petition/forecast', rateLimitPetition(60, 60000), async (req, res) => {
  try {
    const { schoolId, schoolName, lat, lon, threshold } = req.query;

    let targetLat = (lat !== undefined && lat !== null && lat !== '') ? parseFloat(lat) : null;
    let targetLon = (lon !== undefined && lon !== null && lon !== '') ? parseFloat(lon) : null;
    let targetSchoolName = schoolName;

    // If coordinates omitted, resolve schoolId or schoolName against institutional directory
    if ((!targetLat || !targetLon) && (schoolId || schoolName)) {
      const pCandidates = [
        path.join(__dirname, '../src/data/schoolsDirectory.json'),
        path.join(process.cwd(), 'src/data/schoolsDirectory.json'),
        path.join('/tmp', 'schoolsDirectory.json')
      ];
      let schools = [];
      for (const p of pCandidates) {
        if (fs.existsSync(p)) {
          const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
          schools = raw.educationalInstitutions || [];
          break;
        }
      }
      const qId = (schoolId || '').toLowerCase();
      const qName = (schoolName || '').toLowerCase();
      const matched = schools.find(s =>
        (s.id && s.id.toLowerCase() === qId) ||
        (s.name && s.name.toLowerCase() === qName)
      );
      if (matched && matched.lat && matched.lon) {
        targetLat = parseFloat(matched.lat);
        targetLon = parseFloat(matched.lon);
        targetSchoolName = matched.name;
      }
    }

    if (!targetLat || !targetLon || isNaN(targetLat) || isNaN(targetLon)) {
      return res.status(400).json({
        success: false,
        error: 'GPS coordinates (lat, lon) or a valid schoolId resolving to coordinates are required. Rohini fallback removed.'
      });
    }

    const forecast = await getSchoolAqiForecast({
      schoolId: schoolId || 'school',
      schoolName: targetSchoolName || 'School Area',
      lat: targetLat,
      lon: targetLon,
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
app.post('/api/petition/generate-draft', rateLimitPetition(60, 60000), (req, res) => {
  try {
    const {
      evidence,
      authority,
      forecast,
      senderName,
      senderRole,
      senderContact,
      selectedDemands,
      schoolEvidencePackage,
      userActionNote,
      schoolActionNote,
      targetType
    } = req.body || {};
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
      selectedDemands,
      schoolEvidencePackage,
      userActionNote: userActionNote || schoolActionNote,
      targetType: targetType || evidence?.targetType
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[API /api/petition/generate-draft Error]:', err);
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

/**
 * Step 2 (Optional): Tone adjustment via Bedrock (Claude 3 Haiku) or Gemini
 * Returns 503 if no AI provider is configured; preserves all empirical data.
 */
app.post('/api/petition/polish-draft', rateLimitPetition(15, 60000), async (req, res) => {
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
2. Do NOT make unsupported medical diagnoses or catastrophic clinical claims. Refer instead to "acute respiratory distress, particulate inhalation risk, and vulnerable pediatric pulmonary health".
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
          if (!verifyNumbersPreserved(draftText, polishedText)) {
            return res.status(422).json({
              success: false,
              error: 'AI generated draft altered empirical numbers or dates. Polish rejected per AGENTS.md guardrails.',
              mode: 'INTEGRITY_CHECK_FAILED'
            });
          }
          if (!verifyPlaceholdersPreserved(draftText, polishedText)) {
            return res.status(422).json({
              success: false,
              error: 'AI generated draft dropped sender placeholders. Polish rejected per AGENTS.md guardrails.',
              mode: 'INTEGRITY_CHECK_FAILED'
            });
          }
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
            if (!verifyNumbersPreserved(draftText, polishedText)) {
              return res.status(422).json({
                success: false,
                error: 'AI generated draft altered empirical numbers or dates. Polish rejected per AGENTS.md guardrails.',
                mode: 'INTEGRITY_CHECK_FAILED'
              });
            }
            if (!verifyPlaceholdersPreserved(draftText, polishedText)) {
              return res.status(422).json({
                success: false,
                error: 'AI generated draft dropped sender placeholders. Polish rejected per AGENTS.md guardrails.',
                mode: 'INTEGRITY_CHECK_FAILED'
              });
            }
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

    // Per Phase 1b: Return 503 instead of fabricating text with rule-based banners
    return res.status(503).json({
      success: false,
      error: 'AI polishing service is currently unavailable. No AI provider is configured or authorized.',
      mode: 'AI_PROVIDER_UNAVAILABLE'
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
 * 48-Hour Continuous Atmospheric Forecasting Engine
 * Physics-grounded machine learning inference (SageMaker / Local fallback)
 */
app.get('/api/sagemaker/forecast', async (req, res) => {
  try {
    const {
      schoolId,
      schoolName,
      facilityId,
      facilityName,
      lat,
      lon,
      basePm25,
      threshold
    } = req.query;

    const forecast = await getSchoolAqiForecast({
      schoolId: schoolId || facilityId || 'dps_rk_puram',
      schoolName: schoolName || facilityName || 'Delhi Public School, R.K. Puram',
      facilityId: facilityId || schoolId || 'dps_rk_puram',
      facilityName: facilityName || schoolName || 'Delhi Public School, R.K. Puram',
      lat: lat ? parseFloat(lat) : 28.5672,
      lon: lon ? parseFloat(lon) : 77.1741,
      basePm25: basePm25 ? parseInt(basePm25, 10) : 145,
      threshold: threshold ? parseInt(threshold, 10) : 60
    });

    res.json({ success: true, ...forecast });
  } catch (err) {
    console.error('[API /api/sagemaker/forecast Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Multi-Gas Chemical Source Attribution & Forensic Fingerprinting
 */
app.get('/api/source-attribution', async (req, res) => {
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

/**
 * Synchronize 14-Day Empirical Multi-Gas Telemetry across Delhi-NCR Grids from Open-Meteo
 */
app.post('/api/telemetry/sync-grids', async (req, res) => {
  try {
    const daysPast = parseInt(req.body?.daysPast, 10) || 14;
    const synced = await syncAllPopulatedGrids(daysPast);
    res.json({
      success: true,
      message: `Synchronized empirical telemetry across ${synced.length} spatial grid blocks`,
      syncedGrids: synced
    });
  } catch (err) {
    console.error('[API /api/telemetry/sync-grids Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Query 14-Day Compliance Status for a Spatial Grid Block
 */
app.get('/api/telemetry/compliance/:gridId', (req, res) => {
  try {
    const { gridId } = req.params;
    const compliance = get14DayCompliance(gridId);
    res.json({ success: true, gridId, compliance });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/spatial-grids/facilities', (req, res) => {
  try {
    const facilities = getAllDirectoryFacilities().facilities;
    res.json({ success: true, facilitiesCount: facilities.length, facilities });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/spatial-grids/directory', (req, res) => {
  try {
    const directory = getAllDirectoryFacilities();
    res.json({ success: true, ...directory, testMappings: FACILITY_TEST_MAPPINGS });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/spatial-grids/mappings', (req, res) => {
  res.json({ success: true, mappings: FACILITY_TEST_MAPPINGS });
});

app.get('/api/spatial-grids/:gridId/compliance', (req, res) => {
  try {
    const { gridId } = req.params;
    const compliance = get14DayCompliance(gridId);
    res.json({ success: true, gridId, compliance });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ============================================================================
 * AUTONOMOUS ATMOSPHERIC MONITOR & EMERGENCY DAEMON ENDPOINTS
 * ============================================================================
 */
app.get('/api/monitor/status', (req, res) => {
  try {
    const status = getMonitorStatus();
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/monitor/run-cycle', async (req, res) => {
  try {
    const { dispatchViaSes = true, isSandbox = true } = req.body || {};
    const report = await runAutonomousMonitoringCycle({ dispatchViaSes, isSandbox });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/monitor/clear-debounces', (req, res) => {
  try {
    const result = clearMonitorDebounces();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/monitor/block-emergency', async (req, res) => {
  try {
    const { gridId, currentPm25 = 245, anomalyType, dispatchViaSes = true, isSandbox = true, ignoreDebounce = false } = req.body;
    if (!gridId) {
      return res.status(400).json({ success: false, error: 'gridId is required' });
    }
    const result = await dispatchBlockEmergencySurge({
      gridId,
      currentPm25: Number(currentPm25),
      anomalyType,
      dispatchViaSes: Boolean(dispatchViaSes),
      isSandbox: Boolean(isSandbox),
      ignoreDebounce: Boolean(ignoreDebounce)
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/monitor/predictive-advisories', async (req, res) => {
  try {
    const {
      facilityId,
      thresholdPm25 = parseInt(process.env.ADVISORY_THRESHOLD_PM25, 10) || 75,
      dispatchViaSes = true,
      isSandbox = true,
      maxFacilities = 15,
      ignoreDebounce = false,
      simulatedPm25
    } = req.body || {};
    const results = await runPredictiveAdvisoryEvaluation({
      facilityId,
      thresholdPm25: Number(thresholdPm25),
      dispatchViaSes: Boolean(dispatchViaSes),
      isSandbox: Boolean(isSandbox),
      maxFacilities: Number(maxFacilities),
      ignoreDebounce: Boolean(ignoreDebounce),
      simulatedPm25: simulatedPm25 !== undefined ? Number(simulatedPm25) : null
    });
    res.json({ success: true, resultsCount: results.length, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/monitor/chronic-petitions', async (req, res) => {
  try {
    const { gridId, dispatchViaSes = true, isSandbox = true, ignoreDebounce = false, forcePetition = false } = req.body || {};
    const results = await evaluate14DayChronicBlockPetitions({
      gridId,
      dispatchViaSes: Boolean(dispatchViaSes),
      isSandbox: Boolean(isSandbox),
      ignoreDebounce: Boolean(ignoreDebounce),
      forcePetition: Boolean(forcePetition)
    });
    res.json({ success: true, resultsCount: results.length, results });
  } catch (err) {
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
    const { facilityId = 'dps_rk_puram', testEmail = 'tester@wmd-civic.in', isSandbox = true, dispatchViaSes = false } = req.body;
    const result = await testDispatch630Advisory({
      facilityId,
      testEmail,
      isSandbox: isSandbox !== false,
      dispatchViaSes: Boolean(dispatchViaSes)
    });
    res.json(result);
  } catch (err) {
    console.error('[API /api/advisory/test-dispatch Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Threshold-gated 6:30 AM Advisory check (suppressed on clean summer/monsoon days)
 */
app.post('/api/advisory/evaluate-morning', async (req, res) => {
  try {
    const { facilityId = 'dps_rk_puram', thresholdPm25 = parseInt(process.env.ADVISORY_THRESHOLD_PM25, 10) || 75, basePm25, testEmail, isSandbox = true } = req.body;
    const result = await evaluateMorningAdvisories({
      facilityId,
      thresholdPm25: Number(thresholdPm25),
      basePm25: basePm25 ? Number(basePm25) : null,
      testEmail,
      isSandbox
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[API /api/advisory/evaluate-morning Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Gemini-Crafted 12:00 PM Mid-Day Emergency Flash Alert (for sudden unexpected spikes)
 */
app.post('/api/advisory/emergency-midday', async (req, res) => {
  try {
    const { facilityId = 'dps_rk_puram', currentPm25 = 295, anomalyType, testEmail, isSandbox = true, dispatchViaSes = false } = req.body;
    const result = await craftAndDispatchMidDayEmergency({
      facilityId,
      currentPm25: Number(currentPm25),
      anomalyType: anomalyType || 'Sudden Mid-Day Dust & Local Thermal Stagnation',
      testEmail,
      isSandbox,
      dispatchViaSes: Boolean(dispatchViaSes)
    });
    res.json(result);
  } catch (err) {
    console.error('[API /api/advisory/emergency-midday Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ============================================================================
 * Amazon SES (Simple Email Service) Endpoints
 * ============================================================================
 */
app.get('/api/ses/health', async (req, res) => {
  const health = await getSesHealth();
  res.json(health);
});

app.post('/api/ses/send-test', async (req, res) => {
  try {
    const { to, subject = 'WMD Environmental Alert Test', htmlBody, fromEmail } = req.body;
    if (!to) {
      return res.status(400).json({ success: false, error: 'Recipient email "to" is required' });
    }
    const result = await sendEmailViaSES({
      to,
      subject,
      htmlBody: htmlBody || '<p>This is a test notification from WMD Air Intelligence via Amazon SES.</p>',
      fromEmail
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/ses/verify-identity', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required' });
    }
    const result = await triggerEmailVerification(email);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Catch-all 404 handler (prevents unhandled serverless-express on-finished error)
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🌿 AWS Environmental Hacks API Server running on port ${PORT}`);
    console.log(`📡 Endpoints:`);
    console.log(`   - GET  /api/air-quality?city=Delhi`);
    console.log(`   - GET  /api/history?city=Delhi`);
    console.log(`   - POST /api/bedrock-advisory`);
    console.log(`   - POST /api/sensor-ingest (IoT Core simulation)`);
    console.log(`   - GET  /api/aws-status`);
    console.log(`   - GET  /api/monitor/status`);
    console.log(`   - POST /api/monitor/run-cycle`);
    console.log(`   - POST /api/monitor/block-emergency`);
    console.log(`=======================================================`);

    // Start background atmospheric monitoring daemon only if explicitly enabled locally
    if (process.env.ENABLE_LOCAL_DAEMON === 'true') {
      startAutonomousDaemon(30);
    } else {
      console.log('☁️  Local background daemon idle — AWS EventBridge handles scheduled monitoring in the cloud.');
    }
  });
}

export default app;
