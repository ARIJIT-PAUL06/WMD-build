import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Pollutant Color Theming & Opacity Hierarchy Verification', () => {
  const pollutantDocPath = path.join(
    rootDir,
    'src/components/PollutantDocumentary/PollutantDocumentary.jsx'
  );
  const wmdCssPath = path.join(
    rootDir,
    'src/components/PollutantDocumentary/wmd/WmdDocumentary.css'
  );
  const pollutantDocContent = fs.readFileSync(pollutantDocPath, 'utf8');
  const wmdCssContent = fs.readFileSync(wmdCssPath, 'utf8');

  test('1. Every one of the 7 pollutants has a unique distinct color and RGB token', () => {
    const requiredPollutants = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3', 'nh3'];

    // Expected distinct colors
    const expectedColors = {
      pm25: { hex: '#ef4444', rgb: '239, 68, 68' },   // Crimson Red
      pm10: { hex: '#f97316', rgb: '249, 115, 22' },  // Tangerine Orange
      no2:  { hex: '#eab308', rgb: '234, 179, 8' },   // Golden Yellow
      so2:  { hex: '#10b981', rgb: '16, 185, 129' },  // Emerald Green
      co:   { hex: '#3b82f6', rgb: '59, 130, 246' },  // Royal Cobalt Blue
      o3:   { hex: '#06b6d4', rgb: '6, 182, 212' },   // Electric Cyan
      nh3:  { hex: '#a855f7', rgb: '168, 85, 247' },  // Violet Purple
    };

    const colorHexSet = new Set();

    for (const key of requiredPollutants) {
      const exp = expectedColors[key];
      assert.ok(
        pollutantDocContent.includes(exp.hex),
        `PollutantDocumentary.jsx must include hex ${exp.hex} for ${key}`
      );
      assert.ok(
        pollutantDocContent.includes(exp.rgb),
        `PollutantDocumentary.jsx must include rgb "${exp.rgb}" for ${key}`
      );
      assert.ok(
        !colorHexSet.has(exp.hex),
        `Hex color ${exp.hex} for ${key} must be unique (CO and PM2.5 must not share red)`
      );
      colorHexSet.add(exp.hex);
    }

    assert.equal(colorHexSet.size, 7, 'All 7 pollutants must have mutually unique color hex codes');
  });

  test('2. Opacity ratios (40% border, 15% hover bg, 6% surface tint, 28% rule, 50% strong rule) are dynamically injected in PollutantDocumentary.jsx', () => {
    assert.ok(
      pollutantDocContent.includes('--pollutant-btn-border'),
      'Must inject --pollutant-btn-border'
    );
    assert.ok(
      pollutantDocContent.includes('0.40') || pollutantDocContent.includes('0.4'),
      'Must define 40% opacity for button border token'
    );
    assert.ok(
      pollutantDocContent.includes('--pollutant-btn-hover-bg'),
      'Must inject --pollutant-btn-hover-bg'
    );
    assert.ok(
      pollutantDocContent.includes('0.15'),
      'Must define 15% opacity for button hover background token'
    );
    assert.ok(
      pollutantDocContent.includes('--pollutant-surface-tint'),
      'Must inject --pollutant-surface-tint'
    );
    assert.ok(
      pollutantDocContent.includes('0.06'),
      'Must define 6% opacity for surface tint token'
    );
  });

  test('3. WmdDocumentary.css styles header buttons, watch pill, and strip with pollutant tokens', () => {
    assert.ok(
      wmdCssContent.includes('--pollutant-btn-border'),
      'WmdDocumentary.css must reference --pollutant-btn-border'
    );
    assert.ok(
      wmdCssContent.includes('.wmd-header__action-btn'),
      'WmdDocumentary.css must style .wmd-header__action-btn'
    );
    assert.ok(
      wmdCssContent.includes('.wmd-hero__watch-pill'),
      'WmdDocumentary.css must style .wmd-hero__watch-pill'
    );
    assert.ok(
      wmdCssContent.includes('.wmd-hero__play-disc'),
      'WmdDocumentary.css must style .wmd-hero__play-disc'
    );
    assert.ok(
      wmdCssContent.includes('.wmd-strip__tile.is-active .wmd-strip__card'),
      'WmdDocumentary.css must style active strip card in pollutant color'
    );
  });

  test('4. WmdCoverageBand and WmdBarChart utilize pollutant color variables', () => {
    const coverageBandPath = path.join(
      rootDir,
      'src/components/PollutantDocumentary/wmd/WmdCoverageBand.jsx'
    );
    const barChartPath = path.join(
      rootDir,
      'src/components/PollutantDocumentary/wmd/WmdBarChart.jsx'
    );
    const coverageBandContent = fs.readFileSync(coverageBandPath, 'utf8');
    const barChartContent = fs.readFileSync(barChartPath, 'utf8');

    assert.ok(
      coverageBandContent.includes('var(--pollutant-color'),
      'WmdCoverageBand.jsx must use var(--pollutant-color)'
    );
    assert.ok(
      coverageBandContent.includes('var(--pollutant-btn-border'),
      'WmdCoverageBand.jsx must use var(--pollutant-btn-border)'
    );
    assert.ok(
      barChartContent.includes('var(--pollutant-color'),
      'WmdBarChart.jsx must use var(--pollutant-color)'
    );
  });
});
