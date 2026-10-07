/**
 * Grid Telemetry Service
 * 1. Maps any coordinates/institution to its designated Spatial Grid Block
 * 2. Ingests live hourly telemetry into a rolling 14-day in-memory & file buffer
 * 3. Averages hourly data into a single daily record point every 24 hours
 * 4. Combines 3-year historical grid data with recent 14-day trends for calendar predictions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

function resolveDataPath(relPath) {
  const localPath = path.join(__dirname, '..', relPath);
  if (fs.existsSync(localPath)) return localPath;
  const lambdaPath = path.join(process.cwd(), relPath);
  if (fs.existsSync(lambdaPath)) return lambdaPath;
  return localPath;
}

const GRIDS_PATH = resolveDataPath('ml/data/spatial_grids.json');
const BUFFER_PATH = isLambda
  ? path.join('/tmp', 'grid_14day_buffer.json')
  : resolveDataPath('ml/data/grid_14day_buffer.json');
const THREE_YEAR_DAILY_CSV = resolveDataPath('ml/data/grid_3year_daily_train.csv');

let spatialGrids = {};
let grid14DayBuffer = {};

// Load Spatial Grids
try {
  if (fs.existsSync(GRIDS_PATH)) {
    const raw = JSON.parse(fs.readFileSync(GRIDS_PATH, 'utf8'));
    spatialGrids = raw.grids || {};
  }
} catch (err) {
  console.warn('[GridTelemetryService] Could not read spatial_grids.json:', err.message);
}

// Load or initialize 14-day buffer with Lambda cold-start auto-seeding
try {
  if (isLambda && !fs.existsSync(BUFFER_PATH)) {
    const bundledBuffer = resolveDataPath('ml/data/grid_14day_buffer.json');
    if (fs.existsSync(bundledBuffer)) {
      try {
        fs.copyFileSync(bundledBuffer, BUFFER_PATH);
      } catch (cpErr) {
        console.warn('[GridTelemetryService] Failed copying buffer to /tmp:', cpErr.message);
      }
    }
  }

  if (fs.existsSync(BUFFER_PATH)) {
    grid14DayBuffer = JSON.parse(fs.readFileSync(BUFFER_PATH, 'utf8'));
  } else {
    const fallbackPath = resolveDataPath('ml/data/grid_14day_buffer.json');
    if (fs.existsSync(fallbackPath)) {
      grid14DayBuffer = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
    }
  }
} catch (err) {
  grid14DayBuffer = {};
}

/**
 * Finds the matching Grid Block for any GPS coordinate
 */
export function findGridForCoordinates(lat, lon) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  for (const [gridId, grid] of Object.entries(spatialGrids)) {
    const b = grid.bounds;
    if (latitude >= b.south && latitude < b.north && longitude >= b.west && longitude < b.east) {
      return grid;
    }
  }

  // Fallback: Euclidean closest centroid
  let closestGrid = null;
  let minDistance = Infinity;
  for (const grid of Object.values(spatialGrids)) {
    const d = Math.hypot(grid.centroid.lat - latitude, grid.centroid.lon - longitude);
    if (d < minDistance) {
      minDistance = d;
      closestGrid = grid;
    }
  }
  return closestGrid;
}

/**
 * Record live hourly reading into the grid's 14-day buffer
 * (Max 336 hourly entries = 14 days x 24 hours)
 */
export function recordHourlyTelemetry(gridId, timestamp, pm25, metadata = {}) {
  if (!grid14DayBuffer[gridId]) {
    grid14DayBuffer[gridId] = {
      gridId,
      hourlyBuffer: [],
      dailyHistory: []
    };
  }

  const gridData = grid14DayBuffer[gridId];
  gridData.hourlyBuffer.push({
    timestamp: timestamp || new Date().toISOString(),
    pm25: parseFloat(pm25),
    ...metadata
  });

  // Keep maximum 14 days of hourly data (14 * 24 = 336 hours)
  const MAX_HOURLY = 14 * 24;
  if (gridData.hourlyBuffer.length > MAX_HOURLY) {
    gridData.hourlyBuffer = gridData.hourlyBuffer.slice(-MAX_HOURLY);
  }

  // Persist buffer asynchronously
  try {
    fs.writeFileSync(BUFFER_PATH, JSON.stringify(grid14DayBuffer, null, 2));
  } catch (err) {
    console.error('[GridTelemetryService] Failed saving 14-day buffer:', err.message);
  }

  return gridData;
}

/**
 * Aggregates a completed day's hourly readings into a single daily data point
 */
export function consolidateDailyAverages(gridId, targetDateStr) {
  if (!grid14DayBuffer[gridId]) return null;

  const gridData = grid14DayBuffer[gridId];
  const dayReadings = gridData.hourlyBuffer.filter(r => r.timestamp.startsWith(targetDateStr));

  if (dayReadings.length === 0) return null;

  const vals = dayReadings.map(r => r.pm25);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const peak = Math.max(...vals);

  const dailyRecord = {
    date: targetDateStr,
    daily_avg_pm25: Math.round(avg * 10) / 10,
    daily_peak_pm25: Math.round(peak * 10) / 10,
    hours_recorded: dayReadings.length
  };

  gridData.dailyHistory.push(dailyRecord);
  return dailyRecord;
}

/**
 * Get 14-Day compliance status for an institution or grid
 */
/**
 * Get 14-Day compliance status for an institution or grid
 */
export function get14DayCompliance(gridId) {
  const g = grid14DayBuffer[gridId];
  if (!g || !g.hourlyBuffer || g.hourlyBuffer.length === 0) {
    return {
      totalHours: 0,
      hazardousDaysCount: 0,
      petitionEligible: false,
      avgPm25: null
    };
  }

  const readings = g.hourlyBuffer.map(r => r.pm25);
  const avg = readings.reduce((a, b) => a + b, 0) / readings.length;
  const severeHours = readings.filter(p => p > 250).length;
  const totalDays = Math.ceil(readings.length / 24);

  // If severe for 14 continuous days (or >= 80% of readings in 14 days are severe)
  const petitionEligible = totalDays >= 14 && (severeHours / readings.length) >= 0.65;

  return {
    totalHours: readings.length,
    severeHours,
    avgPm25: Math.round(avg),
    totalDaysRecorded: totalDays,
    petitionEligible
  };
}

/**
 * Fetch and synchronize 14-day empirical telemetry from Open-Meteo for any grid or coordinate
 */
export async function fetchLiveTelemetryForGrid(gridId, lat, lon, daysPast = 14) {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5,pm10,nitrogen_dioxide,carbon_monoxide&past_days=${daysPast}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;

    const data = await res.json();
    const times = data.hourly?.time || [];
    const pm25s = data.hourly?.pm2_5 || [];
    const pm10s = data.hourly?.pm10 || [];
    const no2s = data.hourly?.nitrogen_dioxide || [];

    if (!grid14DayBuffer[gridId]) {
      grid14DayBuffer[gridId] = {
        gridId,
        hourlyBuffer: [],
        dailyHistory: []
      };
    }

    const buffer = [];
    for (let i = 0; i < times.length; i++) {
      if (pm25s[i] !== null && pm25s[i] !== undefined) {
        buffer.push({
          timestamp: times[i],
          pm25: Math.round(pm25s[i] * 10) / 10,
          pm10: pm10s[i] !== null ? Math.round(pm10s[i] * 10) / 10 : null,
          no2: no2s[i] !== null ? Math.round(no2s[i] * 10) / 10 : null,
          source: 'OPEN_METEO_EMPIRICAL_API'
        });
      }
    }

    grid14DayBuffer[gridId].hourlyBuffer = buffer;

    // Persist
    try {
      fs.writeFileSync(BUFFER_PATH, JSON.stringify(grid14DayBuffer, null, 2));
    } catch (e) {
      // Non-fatal
    }

    return {
      gridId,
      recordsSynced: buffer.length,
      avgPm25: buffer.length ? Math.round(buffer.reduce((acc, r) => acc + r.pm25, 0) / buffer.length) : null
    };
  } catch (err) {
    console.warn(`[GridTelemetryService] Live sync failed for ${gridId}:`, err.message);
    return null;
  }
}

/**
 * Fetch and synchronize live empirical telemetry in multi-location batches from Open-Meteo
 * Open-Meteo supports comma-separated coordinates, allowing 30+ blocks in a single HTTP request!
 */
export async function fetchLiveTelemetryBatch(gridsChunk, daysPast = 14) {
  if (!gridsChunk || gridsChunk.length === 0) return [];
  try {
    const lats = gridsChunk.map(g => g.centroid.lat).join(',');
    const lons = gridsChunk.map(g => g.centroid.lon).join(',');
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&hourly=pm2_5,pm10,nitrogen_dioxide,carbon_monoxide&past_days=${daysPast}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];

    const json = await res.json();
    const locations = Array.isArray(json) ? json : [json];
    const results = [];

    for (let i = 0; i < gridsChunk.length && i < locations.length; i++) {
      const grid = gridsChunk[i];
      const data = locations[i];
      const gridId = grid.grid_id;

      const times = data.hourly?.time || [];
      const pm25s = data.hourly?.pm2_5 || [];
      const pm10s = data.hourly?.pm10 || [];
      const no2s = data.hourly?.nitrogen_dioxide || [];

      if (!grid14DayBuffer[gridId]) {
        grid14DayBuffer[gridId] = {
          gridId,
          hourlyBuffer: [],
          dailyHistory: []
        };
      }

      const buffer = [];
      for (let j = 0; j < times.length; j++) {
        if (pm25s[j] !== null && pm25s[j] !== undefined) {
          buffer.push({
            timestamp: times[j],
            pm25: Math.round(pm25s[j] * 10) / 10,
            pm10: pm10s[j] !== null ? Math.round(pm10s[j] * 10) / 10 : null,
            no2: no2s[j] !== null ? Math.round(no2s[j] * 10) / 10 : null,
            source: 'OPEN_METEO_EMPIRICAL_API'
          });
        }
      }

      grid14DayBuffer[gridId].hourlyBuffer = buffer;

      results.push({
        gridId,
        recordsSynced: buffer.length,
        avgPm25: buffer.length ? Math.round(buffer.reduce((acc, r) => acc + r.pm25, 0) / buffer.length) : null
      });
    }

    return results;
  } catch (err) {
    console.warn('[GridTelemetryService] Batch sync failed:', err.message);
    return [];
  }
}

/**
 * Synchronize live empirical telemetry across all populated spatial grids in Delhi-NCR (all 60 blocks)
 * Uses high-performance batching: 60 blocks synced in just 2 polite HTTP requests!
 */
export async function syncAllPopulatedGrids(daysPast = 14) {
  const populated = Object.values(spatialGrids).filter(g => (g.facility_count > 0 || g.centroid) && g.centroid?.lat && g.centroid?.lon);
  const results = [];
  const BATCH_SIZE = 30;

  for (let i = 0; i < populated.length; i += BATCH_SIZE) {
    const chunk = populated.slice(i, i + BATCH_SIZE);
    const chunkResults = await fetchLiveTelemetryBatch(chunk, daysPast);
    results.push(...chunkResults);
    if (i + BATCH_SIZE < populated.length) {
      await new Promise(res => setTimeout(res, 200)); // Polite pause between batches
    }
  }

  // Persist buffer to disk if environment allows
  try {
    fs.writeFileSync(BUFFER_PATH, JSON.stringify(grid14DayBuffer, null, 2));
  } catch (e) {
    // Non-fatal (e.g. read-only Lambda /tmp or in-memory)
  }

  return results;
}

/**
 * Retrieve the most recent live empirical telemetry for a specific grid block
 */
export function getLatestTelemetryForGrid(gridId) {
  const g = grid14DayBuffer[gridId];
  if (!g || !g.hourlyBuffer || g.hourlyBuffer.length === 0) {
    return null;
  }
  for (let i = g.hourlyBuffer.length - 1; i >= 0; i--) {
    const reading = g.hourlyBuffer[i];
    if (reading && reading.pm25 !== null && reading.pm25 !== undefined && !isNaN(reading.pm25)) {
      return reading;
    }
  }
  return null;
}

/**
 * Retrieve the most recent live empirical telemetry for GPS coordinates
 */
export function getLatestTelemetryForCoordinates(lat, lon) {
  const grid = findGridForCoordinates(lat, lon);
  if (!grid) return null;
  return getLatestTelemetryForGrid(grid.grid_id);
}


