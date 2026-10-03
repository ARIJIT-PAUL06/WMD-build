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

const GRIDS_PATH = path.join(__dirname, '..', 'ml', 'data', 'spatial_grids.json');
const BUFFER_PATH = path.join(__dirname, '..', 'ml', 'data', 'grid_14day_buffer.json');
const THREE_YEAR_DAILY_CSV = path.join(__dirname, '..', 'ml', 'data', 'grid_3year_daily_train.csv');

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

// Load or initialize 14-day buffer
try {
  if (fs.existsSync(BUFFER_PATH)) {
    grid14DayBuffer = JSON.parse(fs.readFileSync(BUFFER_PATH, 'utf8'));
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
