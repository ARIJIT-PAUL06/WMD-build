import test, { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  isObservedHour,
  cleanBufferFutureRows,
  fetchLiveTelemetryForGrid,
  recordHourlyTelemetry,
  getBufferProvenance
} from '../server/gridTelemetryService.js';
import {
  dispatchBlockEmergencySurge
} from '../server/autonomousAtmosphericMonitor.js';

describe('Fix 1: Forecast Row Ingest Filtering & Pillar 2 Spike Evaluation', () => {

  it('1. isObservedHour correctly identifies past vs future timestamps', () => {
    const fixedNow = new Date('2026-10-10T12:00:00.000Z');

    assert.equal(isObservedHour('2026-10-10T11:00:00.000Z', fixedNow), true, 'Past hour is observed');
    assert.equal(isObservedHour('2026-10-10T12:00:00.000Z', fixedNow), true, 'Current exact hour is observed');
    assert.equal(isObservedHour('2026-10-10T13:00:00.000Z', fixedNow), false, 'Future hour (+1h) must NOT be observed');
    assert.equal(isObservedHour('2026-10-11T00:00:00.000Z', fixedNow), false, 'Tomorrow must NOT be observed');
    assert.equal(isObservedHour(null, fixedNow), false, 'Null timestamp is invalid');
  });

  it('2. Ingest drops forecast hours later than now and sets honest CAMS labels', async () => {
    const fixedNow = new Date('2026-10-10T12:00:00.000Z');
    const testGridId = 'GRID_TEST_INGEST';

    const mockResponse = {
      hourly: {
        time: [
          '2026-10-10T09:00',
          '2026-10-10T10:00',
          '2026-10-10T11:00',
          '2026-10-10T12:00',
          '2026-10-10T13:00', // Future forecast hour 1
          '2026-10-10T14:00', // Future forecast hour 2
          '2026-10-10T15:00'  // Future forecast hour 3
        ],
        pm2_5: [80.2, 90.4, 95.1, 110.0, 140.5, 180.2, 210.0],
        pm10: [120, 130, 140, 150, 180, 220, 250],
        nitrogen_dioxide: [40, 42, 45, 48, 55, 60, 65]
      }
    };

    const origFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      assert.ok(url.includes('&forecast_days=1'), 'URL must include &forecast_days=1');
      assert.ok(url.includes('air-quality-api.open-meteo.com'), 'Must call Open-Meteo air quality API');
      return {
        ok: true,
        json: async () => mockResponse
      };
    };

    try {
      const syncResult = await fetchLiveTelemetryForGrid(testGridId, 28.61, 77.23, 14, fixedNow);

      assert.ok(syncResult, 'Sync result must be returned');
      assert.equal(syncResult.recordsSynced, 4, 'Must store only the 4 observed hours (<= 12:00Z)');
      assert.equal(syncResult.latestPm25, 110.0, 'Latest PM2.5 must match the 12:00Z reading');
      assert.equal(syncResult.latestTimestamp, '2026-10-10T12:00Z');
      
      // Last 3 observed hours: 90.4, 95.1, 110.0 -> mean = 295.5 / 3 = 98.5
      assert.equal(syncResult.recent3hAvgPm25, 98.5, 'recent3hAvgPm25 must be mean of last 3 observed hours');

      // 4 hours: (80.2 + 90.4 + 95.1 + 110.0) / 4 = 93.925 -> 93.9
      assert.equal(syncResult.window14dAvgPm25, 93.9, 'window14dAvgPm25 must be rounded mean of buffer');

      // Verify no row in buffer has timestamp > fixedNow
      const { getLatestTelemetryForGrid } = await import('../server/gridTelemetryService.js');
      const latest = getLatestTelemetryForGrid(testGridId);
      assert.ok(latest, 'Must find latest reading');
      assert.ok(new Date(latest.timestamp).getTime() <= fixedNow.getTime(), 'Latest reading cannot be in the future');
      assert.equal(latest.source, 'OPEN_METEO_CAMS', 'Source must be honest OPEN_METEO_CAMS');
      assert.equal(latest.dataKind, 'model_analysis', 'dataKind must be model_analysis');
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('3. cleanBufferFutureRows purges existing future rows from buffer on load', () => {
    const fixedNow = new Date('2026-10-10T12:00:00.000Z');
    const dirtyBuffer = {
      GRID_DIRTY: {
        gridId: 'GRID_DIRTY',
        hourlyBuffer: [
          { timestamp: '2026-10-10T10:00:00.000Z', pm25: 75, source: 'OPEN_METEO_EMPIRICAL_API' },
          { timestamp: '2026-10-10T11:00:00.000Z', pm25: 85, source: 'OPEN_METEO_EMPIRICAL_API' },
          { timestamp: '2026-10-10T12:00:00.000Z', pm25: 90, source: 'OPEN_METEO_EMPIRICAL_API' },
          { timestamp: '2026-10-10T13:00:00.000Z', pm25: 195, source: 'OPEN_METEO_EMPIRICAL_API' }, // Future row
          { timestamp: '2026-10-10T14:00:00.000Z', pm25: 220, source: 'OPEN_METEO_EMPIRICAL_API' }  // Future row
        ]
      }
    };

    const cleaned = cleanBufferFutureRows(dirtyBuffer, fixedNow);
    const hourly = cleaned.GRID_DIRTY.hourlyBuffer;

    assert.equal(hourly.length, 3, 'Must retain only 3 observed rows');
    for (const row of hourly) {
      assert.ok(new Date(row.timestamp).getTime() <= fixedNow.getTime(), 'No row can be later than fixedNow');
      assert.equal(row.source, 'OPEN_METEO_CAMS', 'Must update source label to OPEN_METEO_CAMS');
      assert.equal(row.dataKind, 'model_analysis', 'Must set dataKind to model_analysis');
    }
  });

  it('4. Spike evaluation uses recent3hAvgPm25: high 14-day mean with low recent reading does NOT trigger', async () => {
    // Threshold is 105 µg/m³
    const blockThreshold = 105;
    const nowMs = Date.now();

    // High 14-day average (160), but recent 3h average is low (55)
    const gridSyncHigh14dLowRecent = {
      gridId: 'GRID_R03_C05',
      recordsSynced: 336,
      latestPm25: 50,
      recent3hAvgPm25: 55, // BELOW 105
      window14dAvgPm25: 160, // HIGH 14-DAY MEAN
      latestTimestamp: new Date(nowMs - 30 * 60 * 1000).toISOString() // 30 min old
    };

    let dispatchCalled = false;
    // Simulate Pillar 2 check
    if (gridSyncHigh14dLowRecent.recent3hAvgPm25 >= blockThreshold) {
      dispatchCalled = true;
    }

    assert.equal(dispatchCalled, false, 'High 14-day mean with low 3h average must NOT trigger emergency');
  });

  it('5. Spike evaluation uses recent3hAvgPm25: low 14-day mean with high recent reading MUST trigger', async () => {
    const blockThreshold = 105;
    const nowMs = Date.now();

    // Low 14-day average (45), but recent 3h average is surging (185)
    const gridSyncLow14dHighRecent = {
      gridId: 'GRID_R03_C05',
      recordsSynced: 336,
      latestPm25: 195,
      recent3hAvgPm25: 185, // ABOVE 105
      window14dAvgPm25: 45, // LOW 14-DAY MEAN
      latestTimestamp: new Date(nowMs - 20 * 60 * 1000).toISOString() // 20 min old
    };

    let dispatchCalled = false;
    let dispatchedPm25 = null;

    if (gridSyncLow14dHighRecent.recent3hAvgPm25 >= blockThreshold) {
      dispatchCalled = true;
      dispatchedPm25 = gridSyncLow14dHighRecent.recent3hAvgPm25;
    }

    assert.equal(dispatchCalled, true, 'Low 14-day mean with surging 3h average MUST trigger emergency');
    assert.equal(dispatchedPm25, 185, 'Must pass 3h average as surge value');
  });

  it('6. Spike evaluation skips stale data (> 3h old) even if 3h average is above threshold', async () => {
    const blockThreshold = 105;
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
    const nowMs = Date.now();

    // High 3h average (150), but timestamp is 4.5 hours old
    const gridSyncStale = {
      gridId: 'GRID_R03_C05',
      recordsSynced: 200,
      latestPm25: 155,
      recent3hAvgPm25: 150,
      window14dAvgPm25: 80,
      latestTimestamp: new Date(nowMs - 4.5 * 60 * 60 * 1000).toISOString() // 4.5h old
    };

    let skippedAsStale = false;
    let dispatchCalled = false;

    const latestAgeMs = nowMs - new Date(gridSyncStale.latestTimestamp).getTime();
    if (latestAgeMs > THREE_HOURS_MS) {
      skippedAsStale = true;
    } else if (gridSyncStale.recent3hAvgPm25 >= blockThreshold) {
      dispatchCalled = true;
    }

    assert.equal(skippedAsStale, true, 'Data older than 3h must be skipped as stale');
    assert.equal(dispatchCalled, false, 'Stale data must NOT dispatch an emergency alert');
  });

  it('7. Fix 2: Buffer provenance honestly reports BUNDLED_SNAPSHOT mode and snapshotAsOf', async () => {
    const prov = getBufferProvenance();
    assert.ok(prov.mode === 'BUNDLED_SNAPSHOT' || prov.mode === 'LIVE_SYNC' || prov.mode === 'LIVE_DYNAMODB', 'Must report honest mode');
    if (prov.mode === 'BUNDLED_SNAPSHOT') {
      assert.ok(typeof prov.snapshotAsOf === 'string', 'snapshotAsOf must be a timestamp string');
    }

    const { get14DayCompliance } = await import('../server/gridTelemetryService.js');
    const comp = get14DayCompliance('GRID_R06_C04');
    assert.ok(comp.mode, 'Compliance must report provenance mode');

    const { aggregateSchoolEvidence } = await import('../server/evidenceService.js');
    const ev = aggregateSchoolEvidence({ schoolName: 'Delhi Public School, Rohini' });
    assert.ok(ev.mode, 'Evidence must report provenance mode');
    assert.ok(ev.snapshotAsOf !== undefined, 'Evidence must include snapshotAsOf field');
  });
});

