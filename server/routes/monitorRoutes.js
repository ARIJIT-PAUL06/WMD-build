import express from 'express';
import { environmentalProvider } from '../environmentalService.js';
import { saveReadingToDynamoDB } from '../awsServices.js';
import {
  syncAllPopulatedGrids,
  get14DayCompliance
} from '../gridTelemetryService.js';
import {
  getAllDirectoryFacilities,
  FACILITY_TEST_MAPPINGS
} from '../advisoryDispatchService.js';
import {
  runAutonomousMonitoringCycle,
  dispatchBlockEmergencySurge,
  runPredictiveAdvisoryEvaluation,
  evaluate14DayChronicBlockPetitions,
  getMonitorStatus,
  clearMonitorDebounces
} from '../autonomousAtmosphericMonitor.js';
import { requireAdminKey } from '../middleware/authAndRateLimit.js';

const router = express.Router();

/**
 * AWS IoT Core Ingestion Endpoint:
 * Simulates physical air-quality sensors pushing via MQTT/IoT Core:
 * Sensor -> IoT Core -> Lambda -> DynamoDB
 */
router.post('/api/sensor-ingest', requireAdminKey, async (req, res) => {
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
 * Synchronize 14-Day Empirical Multi-Gas Telemetry across Delhi-NCR Grids from Open-Meteo
 */
router.post('/api/telemetry/sync-grids', requireAdminKey, async (req, res) => {
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
router.get('/api/telemetry/compliance/:gridId', (req, res) => {
  try {
    const { gridId } = req.params;
    const compliance = get14DayCompliance(gridId);
    res.json({ success: true, gridId, compliance });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/spatial-grids/facilities', (req, res) => {
  try {
    const facilities = getAllDirectoryFacilities().facilities;
    res.json({ success: true, facilitiesCount: facilities.length, facilities });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/spatial-grids/directory', (req, res) => {
  try {
    const directory = getAllDirectoryFacilities();
    res.json({ success: true, ...directory, testMappings: FACILITY_TEST_MAPPINGS });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/spatial-grids/mappings', (req, res) => {
  res.json({ success: true, mappings: FACILITY_TEST_MAPPINGS });
});

router.get('/api/spatial-grids/:gridId/compliance', (req, res) => {
  try {
    const { gridId } = req.params;
    const compliance = get14DayCompliance(gridId);
    res.json({ success: true, gridId, compliance });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Autonomous Atmospheric Monitor Status
 */
router.get('/api/monitor/status', (req, res) => {
  try {
    const status = getMonitorStatus();
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/monitor/run-cycle', requireAdminKey, async (req, res) => {
  try {
    const { dispatchViaSes = true, isSandbox = true } = req.body || {};
    const report = await runAutonomousMonitoringCycle({ dispatchViaSes, isSandbox });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/monitor/clear-debounces', requireAdminKey, (req, res) => {
  try {
    const result = clearMonitorDebounces();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/monitor/block-emergency', requireAdminKey, async (req, res) => {
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

router.post('/api/monitor/predictive-advisories', requireAdminKey, async (req, res) => {
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

router.post('/api/monitor/chronic-petitions', requireAdminKey, async (req, res) => {
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

export default router;
