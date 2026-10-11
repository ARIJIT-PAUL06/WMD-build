import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import fs from 'node:fs/promises';

describe('Pollutant Data Availability & Hero Button Positioning Verification', () => {
  let viteServer;
  let PollutantDocumentary;
  let DEFAULT_DELHI_BASELINE;

  before(async () => {
    viteServer = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    const docModule = await viteServer.ssrLoadModule(
      '/src/components/PollutantDocumentary/PollutantDocumentary.jsx'
    );
    PollutantDocumentary = docModule.default;
    DEFAULT_DELHI_BASELINE = docModule.DEFAULT_DELHI_BASELINE;
  });

  after(async () => {
    if (viteServer) await viteServer.close();
  });

  it('verifies that WmdDocumentary.css fixes hero editorial and watch button cutoff', async () => {
    const css = await fs.readFile(
      'src/components/PollutantDocumentary/wmd/WmdDocumentary.css',
      'utf8'
    );

    // Hero container has clamp height
    assert.match(css, /\.wmd-hero\s*\{[^}]*height:\s*clamp\(740px,\s*94vh,\s*940px\);/s);

    // Editorial top position is clamped to 165px-215px instead of static 310px
    assert.match(css, /\.wmd-hero__editorial\s*\{[^}]*top:\s*clamp\(165px,\s*20vh,\s*215px\);/s);

    // Watch pill height is 64px and has reduced margin to prevent pushing content down
    assert.match(css, /\.wmd-hero__watch-pill\s*\{[^}]*height:\s*64px;/s);
    assert.match(css, /\.wmd-hero__cta-row\s*\{[^}]*margin-bottom:\s*16px;/s);

    // Spatial circular portal is anchored from bottom rather than rigid top: 670px
    assert.match(css, /\.wmd-hero__circle-portal-container\s*\{[^}]*bottom:\s*clamp\(30px,\s*6vh,\s*70px\);/s);
  });

  it('verifies all 7 pollutants render with their dedicated documentary content', () => {
    const pollutants = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3', 'nh3'];
    for (const p of pollutants) {
      const html = renderToString(React.createElement(PollutantDocumentary, { pollutantId: p }));
      assert.ok(html.includes('WATCH DOCUMENTARY'), `Expected WATCH DOCUMENTARY on ${p}`);
      assert.ok(html.includes('wmd-hero__watch-pill'), `Expected watch pill on ${p}`);
      assert.ok(html.includes('wmd-coverage-band'), `Expected coverage band on ${p}`);
      assert.ok(html.includes('wmd-impact-row'), `Expected impact row on ${p}`);
    }
  });

  it('verifies SO2 page renders full editorial without missing data or broken layouts', () => {
    const html = renderToString(React.createElement(PollutantDocumentary, { pollutantId: 'so2' }));
    assert.ok(html.includes('SO2') || html.includes('SO₂'), 'Expected SO2 symbol in HTML');
    assert.ok(html.includes('WATCH DOCUMENTARY'), 'Expected Watch Documentary CTA');
    assert.ok(html.includes('KEY STATISTICS'), 'Expected Key Statistics table');
  });

  it('verifies NH3 page resolves baseline CPCB data when live feed omits ammonia', () => {
    // Simulated live feed where Open-Meteo returns null for ammonia across all stations
    const liveWithoutNh3 = {
      isBaseline: false,
      stations: [
        { id: 'bawana', name: 'Bawana', lat: 28.77, lon: 77.05, pm25: 140, pm10: 220, no2: 50, so2: 15, co: 2, o3: 35, nh3: null },
        { id: 'dtu', name: 'DTU', lat: 28.75, lon: 77.11, pm25: 130, pm10: 210, no2: 45, so2: 12, co: 1.8, o3: 30, nh3: null },
      ],
    };

    const html = renderToString(
      React.createElement(PollutantDocumentary, {
        pollutantId: 'nh3',
        liveData: liveWithoutNh3,
      })
    );

    // Verify NH3 falls back to authentic CPCB baseline station (Anand Vihar: 38.6 µg/m³)
    assert.ok(html.includes('38.6'), 'Expected baseline NH3 reading of 38.6 µg/m³ to be rendered');
    assert.ok(html.includes('Anand Vihar') || html.includes('DPCC'), 'Expected CPCB station name');
    assert.ok(html.includes('not live') || html.includes('Static fallback'), 'Expected non-live transparency label');
  });

  it('verifies awsServices.js and environmentalService.js retain and query nh3', async () => {
    const awsSrc = await fs.readFile('server/awsServices.js', 'utf8');
    assert.ok(awsSrc.includes('nh3: reading.pollutants?.nh3 ?? null'), 'Expected nh3 in DynamoDB schema');

    const envSrc = await fs.readFile('server/environmentalService.js', 'utf8');
    assert.ok(envSrc.includes('ammonia'), 'Expected ammonia in Open-Meteo URL');
    assert.ok(envSrc.includes('nh3: current.ammonia != null'), 'Expected nh3 mapped in environmentalService');

    const fusionSrc = await fs.readFile('server/fusionAqiService.js', 'utf8');
    assert.ok(fusionSrc.includes('ammonia'), 'Expected ammonia in fusionAqiService Open-Meteo URL');
    assert.ok(fusionSrc.includes('nh3: live.ammonia'), 'Expected nh3 mapped in fusionAqiService');
  });
});
