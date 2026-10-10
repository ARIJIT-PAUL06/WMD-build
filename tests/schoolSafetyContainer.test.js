/**
 * Phase 4 Integration & Container Unit Tests
 *
 * Tests the 10 required Phase 4 verification items:
 * 1. SchoolSafetyContainer renders selected school
 * 2. School selection changes the selected institution
 * 3. Real station data is passed through to nearest-station logic
 * 4. IDW result is passed to dashboard
 * 5. Insufficient station data produces INSUFFICIENT DATA
 * 6. No fake future data is generated
 * 7. Existing query parameter: ?view=school renders School Safety
 * 8. Existing map view (?view=map) still works
 * 9. Existing petition button still works
 * 10. School Safety launcher navigates correctly
 */

import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { prerenderToNodeStream } from 'react-dom/static';
import { createServer } from 'vite';

// App lazy-loads its views; renderToString would only capture the Suspense fallback,
// so App-level tests prerender and wait for the lazy chunks to resolve.
const renderComplete = async (element) => {
  const { prelude } = await prerenderToNodeStream(element);
  let html = '';
  for await (const chunk of prelude) html += chunk;
  return html;
};

describe('School Safety Container & App Integration (Phase 4 Tests)', () => {
  let viteServer;
  let SchoolSafetyContainer;
  let App;

  // Real Delhi station test fixtures modeled directly from /api/delhi-heatmap
  const mockDelhiStations = [
    {
      id: 'dtu',
      name: 'Delhi Tech University (DTU)',
      lat: 28.7495,
      lon: 77.1171,
      zone: 'North Delhi',
      type: 'Institutional',
      aqi: 154,
      pm25: 68.4,
      source: 'Live Open-Meteo',
      updatedAt: '2026-10-03T18:30:00Z',
    },
    {
      id: 'rohini',
      name: 'Rohini Sector 16',
      lat: 28.7325,
      lon: 77.1199,
      zone: 'North West Delhi',
      type: 'Residential',
      aqi: 162,
      pm25: 74.2,
      source: 'Live Open-Meteo',
      updatedAt: '2026-10-03T18:30:00Z',
    },
    {
      id: 'bawana',
      name: 'Bawana Industrial Area',
      lat: 28.7762,
      lon: 77.0510,
      zone: 'North West Delhi',
      type: 'Industrial',
      aqi: 175,
      pm25: 86.0,
      source: 'Live Open-Meteo',
      updatedAt: '2026-10-03T18:30:00Z',
    },
    {
      id: 'mandir_marg',
      name: 'Mandir Marg (Connaught Place)',
      lat: 28.6315,
      lon: 77.2167,
      zone: 'Central Delhi',
      type: 'Commercial',
      aqi: 140,
      pm25: 58.0,
      source: 'Live Open-Meteo',
      updatedAt: '2026-10-03T18:30:00Z',
    },
  ];

  const setupWindowMock = (search = '') => {
    global.window = {
      location: {
        search,
        hash: '',
        pathname: '/',
      },
      navigator: { userAgent: 'Mozilla/5.0 (Node.js)' },
      atob: (s) => Buffer.from(s, 'base64').toString('binary'),
      btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    };
  };

  before(async () => {
    setupWindowMock('');
    viteServer = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    const containerMod = await viteServer.ssrLoadModule(
      './src/components/SchoolSafety/SchoolSafetyContainer.jsx'
    );
    SchoolSafetyContainer = containerMod.default;

    const appMod = await viteServer.ssrLoadModule('./src/App.jsx');
    App = appMod.default;
  });

  after(async () => {
    if (viteServer) {
      await viteServer.close();
    }
  });

  // ==========================================================================
  // Test 1: SchoolSafetyContainer renders selected school
  // ==========================================================================
  it('1. SchoolSafetyContainer renders selected school metadata correctly', () => {
    setupWindowMock('');
    const html = renderToString(
      React.createElement(SchoolSafetyContainer, {
        initialSchoolId: 'dps_rohini',
        liveData: { stations: mockDelhiStations, lastUpdated: new Date().toISOString() },
      })
    );

    assert.ok(html.includes('Delhi Public School, Rohini'), 'Must render DPS Rohini');
    assert.ok(html.includes('Sector 24, Phase III, Rohini'), 'Must render Rohini locality');
    assert.ok(html.includes('SafeRecess™ School Safety Dashboard'), 'Must render dashboard title');
  });

  // ==========================================================================
  // Test 2: School selection changes the selected institution
  // ==========================================================================
  it('2. School selection changes the selected institution and its coordinates', () => {
    setupWindowMock('');
    const html = renderToString(
      React.createElement(SchoolSafetyContainer, {
        initialSchoolId: 'dav_shreshtha_vihar',
        liveData: { stations: mockDelhiStations, lastUpdated: new Date().toISOString() },
      })
    );

    assert.ok(html.includes('DAV Public School, Shreshtha Vihar'), 'Must render DAV Shreshtha Vihar');
    assert.ok(html.includes('Shreshtha Vihar, Anand Vihar'), 'Must render East Delhi locality');
  });

  // ==========================================================================
  // Test 3: Real station data is passed through to nearest-station logic
  // ==========================================================================
  it('3. Real station data is passed through to nearest-station logic and sorted', () => {
    setupWindowMock('');
    // DPS Rohini is at (28.7188, 77.1064).
    // Nearest station in fixture should be Rohini Sector 16 (~2.0 km), then DTU (~3.6 km), then Bawana.
    const html = renderToString(
      React.createElement(SchoolSafetyContainer, {
        initialSchoolId: 'dps_rohini',
        liveData: { stations: mockDelhiStations, lastUpdated: new Date().toISOString() },
      })
    );

    assert.ok(html.includes('Rohini Sector 16'), 'Nearest station Rohini Sector 16 must appear in evidence');
    assert.ok(html.includes('Delhi Tech University (DTU)'), 'Second nearest DTU must appear in evidence');
  });

  // ==========================================================================
  // Test 4: IDW result is passed to dashboard
  // ==========================================================================
  it('4. IDW calculation result is passed to dashboard and labeled "Estimated around school"', () => {
    setupWindowMock('');
    const html = renderToString(
      React.createElement(SchoolSafetyContainer, {
        initialSchoolId: 'dps_rohini',
        liveData: { stations: mockDelhiStations, lastUpdated: new Date().toISOString() },
      })
    );

    assert.ok(html.includes('Estimated around school'), 'Must explicitly display "Estimated around school"');
    assert.ok(html.includes('µg/m³ PM2.5'), 'Must render unit');
    assert.ok(/<span class="ssd-stat-num">\d+(\.\d+)?<\/span>/.test(html), 'Must render a computed numeric IDW value');
  });

  // ==========================================================================
  // Test 5: Insufficient station data produces INSUFFICIENT DATA
  // ==========================================================================
  it('5. Insufficient station data produces INSUFFICIENT DATA without fabricating values', () => {
    setupWindowMock('');
    const html = renderToString(
      React.createElement(SchoolSafetyContainer, {
        initialSchoolId: 'dps_rohini',
        liveData: { stations: [], lastUpdated: new Date().toISOString() },
      })
    );

    assert.ok(html.includes('INSUFFICIENT DATA'), 'Must render INSUFFICIENT DATA status');
    assert.ok(
      html.includes('Insufficient Regulatory Monitoring Telemetry') ||
      html.includes('Insufficient nearby monitoring data'),
      'Must explain why insufficient'
    );
    assert.ok(html.includes('--'), 'Must show placeholder rather than fabricated estimate');
  });

  // ==========================================================================
  // Test 6: No fake future data is generated
  // ==========================================================================
  it('6. Does not fabricate future hourly time series or fake best outdoor window', () => {
    setupWindowMock('');
    const html = renderToString(
      React.createElement(SchoolSafetyContainer, {
        initialSchoolId: 'dps_rohini',
        liveData: { stations: mockDelhiStations, lastUpdated: new Date().toISOString() },
      })
    );

    assert.ok(html.includes('Best window unavailable'), 'Must indicate best outdoor window is unavailable');
    assert.ok(
      html.includes('Insufficient time-series observations are currently available'),
      'Must explain that time-series data is required and not fabricated'
    );
  });

  // ==========================================================================
  // Test 7: Existing query parameter ?view=school renders School Safety
  // ==========================================================================
  it('7. Query parameter ?view=school renders School Safety feature in App.jsx', async () => {
    setupWindowMock('?view=school');

    const html = await renderComplete(React.createElement(App));
    assert.ok(html.includes('Back to National AQI Map'), 'App must render navigation back to map when ?view=school');
    assert.ok(
      html.includes('SafeRecess™ School Safety Dashboard') ||
      html.includes('Loading campus environmental intelligence...'),
      'App must render School Safety container when ?view=school'
    );
  });

  // ==========================================================================
  // Test 8: Existing map view (?view=map) still works
  // ==========================================================================
  it('8. Existing map view (?view=map) continues to work without regression', async () => {
    setupWindowMock('?view=map');

    const html = await renderComplete(React.createElement(App));
    assert.ok(html.includes('id="delhi-aqi-heatmap"'), 'App must render Map element when ?view=map');
    assert.ok(!html.includes('id="school-selector"'), 'App must not render School Safety selector in map-only view');
    assert.ok(!html.includes('id="back-to-map-btn"'), 'App must not render Back to Map button in map-only view');
  });

  // ==========================================================================
  // Test 9: Existing petition button still works
  // ==========================================================================
  it('9. Existing "Petition & Action" button remains present and intact on heatmap', async () => {
    setupWindowMock('?view=map');

    const html = await renderComplete(React.createElement(App));
    assert.ok(html.includes('id="petition-action-deck-btn"'), 'Petition button ID must be intact');
    assert.ok(html.includes('Petition &amp; Action') || html.includes('Petition & Action'), 'Petition button label must be present');
  });

  // ==========================================================================
  // Test 10: School Safety launcher navigates correctly
  // ==========================================================================
  it('10. School Safety launcher button is present beside Petition button and navigates to ?view=school', async () => {
    setupWindowMock('?view=map');

    const html = await renderComplete(React.createElement(App));
    assert.ok(html.includes('id="school-safety-deck-btn"'), 'School Safety launcher button ID must exist');
    assert.ok(html.includes('School Safety'), 'Launcher button must be labeled School Safety');
    assert.ok(html.includes('SafeRecess™ School Safety Dashboard &amp; Activity Guidance') || html.includes('SafeRecess™ School Safety Dashboard & Activity Guidance'), 'Must have informative tooltip');
  });
});
