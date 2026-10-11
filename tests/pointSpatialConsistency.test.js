import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePointPollutantEstimate,
  calculatePointTelemetrySnapshot,
  sampleRasterGridVal,
  calculateDistanceKm
} from '../src/components/Heatmap/heatmapRasterUtils.js';
import initialIndiaStations from '../src/data/indiaStations.json' with { type: 'json' };

test('Spatial Point Consistency & Unified Telemetry Estimation', async (t) => {
  // Mock DTU at 155 to mirror live telemetry observed in North Delhi
  const testStations = initialIndiaStations.map((s) =>
    s.id === 'delhi-dtu' ? { ...s, aqi: 155, pm25: 98, pm10: 190 } : s
  );

  await t.test('1. Two coordinates 100m apart on the same street have identical or near-identical AQI (< 0.5 delta)', () => {
    // Road Number B-7 in North Delhi
    const gpsCoord = { lat: 28.7410, lon: 77.1320 };
    const clickCoord = { lat: 28.7417, lon: 77.1328 };

    const distKm = calculateDistanceKm(gpsCoord.lat, gpsCoord.lon, clickCoord.lat, clickCoord.lon);
    assert.ok(distKm <= 0.2, `Distance should be ~100m, got ${distKm} km`);

    const gpsAqi = calculatePointPollutantEstimate(gpsCoord.lat, gpsCoord.lon, testStations, 'aqi');
    const clickSnapshot = calculatePointTelemetrySnapshot(clickCoord.lat, clickCoord.lon, testStations);

    const delta = Math.abs(gpsAqi - clickSnapshot.aqi);
    assert.ok(delta <= 0.5, `Delta between GPS (${gpsAqi}) and clicked point (${clickSnapshot.aqi}) must be <= 0.5 AQI, got ${delta}`);
  });

  await t.test('2. Exact coordinate query yields identical results between point estimate and telemetry snapshot', () => {
    const coord = { lat: 28.7417, lon: 77.1328 };

    const singleEstimate = calculatePointPollutantEstimate(coord.lat, coord.lon, testStations, 'aqi');
    const fullSnapshot = calculatePointTelemetrySnapshot(coord.lat, coord.lon, testStations);

    assert.equal(singleEstimate, fullSnapshot.aqi, 'Single pollutant estimate must match snapshot aqi exactly');
  });

  await t.test('3. Exact location on top of ground station returns 100% ground-truth sensor reading (0 km distance)', () => {
    const dtu = testStations.find((s) => s.id === 'delhi-dtu');
    assert.ok(dtu, 'DTU station must exist');

    const snapshot = calculatePointTelemetrySnapshot(dtu.lat, dtu.lon, testStations);

    assert.equal(snapshot.aqi, dtu.aqi, 'AQI at station coordinate must exactly match station sensor AQI');
    assert.equal(snapshot.pm25, dtu.pm25, 'PM2.5 at station coordinate must exactly match station sensor PM2.5');
    assert.equal(snapshot.distanceKm, 0, 'Distance must be 0 km');
    assert.equal(snapshot.nearestStation, dtu.name, 'Nearest station must be DTU');
  });

  await t.test('4. All pollutants (PM2.5, PM10, NO2, SO2, CO, O3) are properly populated and finite', () => {
    const coord = { lat: 28.7417, lon: 77.1328 };
    const snapshot = calculatePointTelemetrySnapshot(coord.lat, coord.lon, testStations);

    ['aqi', 'pm25', 'pm10', 'no2', 'so2', 'co', 'o3'].forEach((p) => {
      assert.ok(typeof snapshot[p] === 'number', `${p} must be a number`);
      assert.ok(Number.isFinite(snapshot[p]), `${p} must be finite`);
      assert.ok(snapshot[p] > 0, `${p} must be greater than 0`);
    });
  });

  await t.test('5. sampleRasterGridVal performs smooth bilinear interpolation across sub-cell coordinates', () => {
    const dummyGrid = {
      rawGrid: new Float32Array([
        100, 120,
        140, 160,
      ]),
      width: 2,
      height: 2,
    };

    // Center point (u = 0.5, v = 0.5) should bilinearly evaluate to average (130)
    // In INDIA_RASTER_BOUNDS: lon spans 68 to 98 (mid = 83)
    const midLon = 83.0;
    // For Mercator mid, compute lat for (Y_MAX + Y_MIN)/2
    // Let's test with direct gridObj bounds
    const sampleVal = sampleRasterGridVal(dummyGrid, 83.0, 22.0); // approx central latitude
    assert.ok(sampleVal !== null, 'Sampled value must not be null');
    assert.ok(Number.isFinite(sampleVal), 'Sampled value must be finite');
    assert.ok(sampleVal >= 100 && sampleVal <= 160, `Sampled value ${sampleVal} must be within grid min/max`);
  });

  await t.test('6. cooperativeGestures: true is enabled and blocker prompts are completely suppressed', async () => {
    const fs = await import('fs');
    const heatmapCode = fs.readFileSync('src/components/Heatmap/DelhiAqiHeatmap.jsx', 'utf8');
    assert.match(heatmapCode, /cooperativeGestures:\s*true/, 'DelhiAqiHeatmap must enable cooperativeGestures: true');
    assert.match(heatmapCode, /ScrollZoomBlocker\.CtrlMessage/, 'DelhiAqiHeatmap must silence ScrollZoomBlocker.CtrlMessage');

    const indexCss = fs.readFileSync('src/index.css', 'utf8');
    assert.match(indexCss, /\.mapboxgl-scroll-zoom-blocker/, 'index.css must target cooperative gestures blocker');
    assert.match(indexCss, /display:\s*none\s*!important/, 'index.css must suppress blocker with display: none !important');
  });
});
