import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAbsolutePollutantT,
  getCalibratedPollutantT,
  getPollutantMeta,
  calculateUncappedAqi,
  interpolateSeamlessRgb,
} from '../src/components/Heatmap/heatmapRasterUtils.js';

test('Adaptive Heatmap Color Calibration & Health-Safe Thresholds', async (t) => {
  await t.test('1. AQI 156 is strictly Moderate (Warm Yellow/Amber) and NEVER Green when zoomed in', () => {
    // Simulated zoomed-in viewport on Delhi NCR (localMin: 145, localMax: 235, zoom: 10)
    const activeRangeZoomed = {
      min: 145,
      max: 235,
      localMin: 145,
      localMax: 235,
      zoomFactor: 1.0,
      isZoomed: true,
      zoom: 10,
    };

    const metaZoomed = getPollutantMeta(156, 'aqi', activeRangeZoomed);
    const metaNational = getPollutantMeta(156, 'aqi', null);

    // Verify label is Moderate
    assert.strictEqual(metaZoomed.label, 'Moderate');
    assert.strictEqual(metaNational.label, 'Moderate');

    // Verify t is in Warm Yellow / Amber band (t >= 0.38 and t < 0.60)
    const tZoomed = getCalibratedPollutantT(156, 'aqi', activeRangeZoomed);
    const tNational = getCalibratedPollutantT(156, 'aqi', null);

    assert.ok(
      tZoomed >= 0.38,
      `Expected tZoomed (${tZoomed}) to be >= 0.38 (Warm Yellow floor), NEVER Green (< 0.25)`
    );
    assert.ok(
      tZoomed <= 0.60,
      `Expected tZoomed (${tZoomed}) to be <= 0.60 (not severe/red)`
    );

    // Green hues have G significantly higher than R (e.g. #10b981 has R=16, G=185, B=129)
    // Warm Yellow has R > 200 and G > 150 with R >= G
    const rgbZoomed = interpolateSeamlessRgb(tZoomed);
    const [r, g, b] = rgbZoomed;

    assert.ok(
      r > 180,
      `Expected Red component (${r}) to be > 180 for Warm Yellow/Amber, got ${r}`
    );
    assert.ok(
      r >= g - 10,
      `Expected Red (${r}) to be >= Green (${g}) - 10 for Yellow/Amber, not dominant green`
    );
    assert.ok(
      metaZoomed.hex !== '#10b981',
      'AQI 156 must NOT be #10b981 (Pristine Green)'
    );
    assert.ok(
      metaZoomed.hex !== '#34d399',
      'AQI 156 must NOT be #34d399 (Emerald Mint)'
    );
  });

  await t.test('2. Clean air (AQI 30) maps to Pristine Green and is never red', () => {
    const activeRangeClean = {
      min: 15,
      max: 50,
      localMin: 15,
      localMax: 50,
      zoomFactor: 1.0,
      isZoomed: true,
      zoom: 10,
    };

    const meta = getPollutantMeta(30, 'aqi', activeRangeClean);
    assert.strictEqual(meta.label, 'Good / Pristine');

    const tVal = getCalibratedPollutantT(30, 'aqi', activeRangeClean);
    assert.ok(tVal < 0.20, `Clean air t (${tVal}) must be in Green band (< 0.20)`);

    const [r, g, b] = interpolateSeamlessRgb(tVal);
    assert.ok(g > r, `Clean air Green component (${g}) must exceed Red (${r})`);
  });

  await t.test('3. Satisfactory air (AQI 80) maps to Lime', () => {
    const meta = getPollutantMeta(80, 'aqi', null);
    assert.strictEqual(meta.label, 'Satisfactory');

    const tVal = getCalibratedPollutantT(80, 'aqi', null);
    assert.ok(tVal >= 0.20 && tVal < 0.35, `Satisfactory t (${tVal}) must be in Lime band`);
  });

  await t.test('4. Poor air (AQI 250) maps to Orange/Burnt Ochre', () => {
    const meta = getPollutantMeta(250, 'aqi', null);
    assert.strictEqual(meta.label, 'Poor');

    const tVal = getCalibratedPollutantT(250, 'aqi', null);
    assert.ok(tVal >= 0.60 && tVal < 0.78, `Poor air t (${tVal}) must be in Orange band`);
  });

  await t.test('5. Very Poor air (AQI 350) maps to Scarlet Red', () => {
    const meta = getPollutantMeta(350, 'aqi', null);
    assert.strictEqual(meta.label, 'Very Poor');

    const tVal = getCalibratedPollutantT(350, 'aqi', null);
    assert.ok(tVal >= 0.78 && tVal < 0.92, `Very Poor air t (${tVal}) must be in Red band`);
  });

  await t.test('6. Severe air (AQI 450) maps to Deep Crimson', () => {
    const meta = getPollutantMeta(450, 'aqi', null);
    assert.strictEqual(meta.label, 'Severe / Hazardous');

    const tVal = getCalibratedPollutantT(450, 'aqi', null);
    assert.ok(tVal >= 0.90, `Severe air t (${tVal}) must be in Crimson band`);
  });

  await t.test('7. Micro-contrast provides gradient distinction without violating category bounds', () => {
    const activeRange = {
      min: 145,
      max: 235,
      localMin: 145,
      localMax: 235,
      zoomFactor: 1.0,
      isZoomed: true,
      zoom: 10,
    };

    const t145 = getCalibratedPollutantT(145, 'aqi', activeRange);
    const t156 = getCalibratedPollutantT(156, 'aqi', activeRange);
    const t190 = getCalibratedPollutantT(190, 'aqi', activeRange);
    const t235 = getCalibratedPollutantT(235, 'aqi', activeRange);

    // Monotonic progression
    assert.ok(t145 <= t156, 't145 <= t156');
    assert.ok(t156 < t190, 't156 < t190');
    assert.ok(t190 < t235, 't190 < t235');

    // Both 145 and 156 respect the Warm Yellow floor
    assert.ok(t145 >= 0.38, 't145 >= 0.38');
    assert.ok(t156 >= 0.38, 't156 >= 0.38');
  });
});
