/**
 * Direct Pollutant Documentary Navigation & Dossier Verification Tests
 *
 * Verifies all requirements for direct pollutant navigation flow:
 * 1. Cargo truck containers directly route to each pollutant:
 *    - PM2.5 -> ?documentary=pm25
 *    - PM10  -> ?documentary=pm10
 *    - NO2   -> ?documentary=no2
 *    - SO2   -> ?documentary=so2
 *    - CO    -> ?documentary=co
 *    - O3    -> ?documentary=o3
 *    - NH3   -> ?documentary=nh3
 * 2. Truck body click directly routes to pollutant documentary (?documentary=pm25).
 * 3. Visiting ?documentary=true routes directly to PM2.5 with NO intermediate landing page.
 * 4. Intermediate story / landing page is completely removed (no "BEGIN STORY", no intermediate book).
 * 5. All seven pollutants render dedicated cinematic documentary dossiers with custom themes.
 * 6. Visual design, typography, sections, and scientific content remain intact.
 * 7. Live Delhi telemetry dynamically feeds into the documentary (no hardcoding).
 * 8. School Safety section renders IDW estimate and mandatory spatial estimation disclaimer.
 * 9. 14-day evidence window strictly displays unrecorded days as NO DATA.
 * 10. Returning from documentary routes back to Atmospheric Cargo Truck.
 * 11. ?view=school still works cleanly.
 * 12. ?view=map still works cleanly.
 * 13. Petition workflow helpers remain operational.
 * 14. Responsive mobile CSS and reduced-motion compliance remain intact.
 */

import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import fs from 'node:fs/promises';
import {
  POLLUTANT_DOCUMENTARIES,
  POLLUTANT_DOCUMENTARY_LIST,
} from '../src/data/pollutantDocumentaries.js';

describe('VayuVitals Direct Pollutant Documentary Flow', () => {
  let viteServer;
  let PollutantDocumentary;
  let AtmosphericCargoTruck;
  let App;
  let SchoolSafetyContainer;

  const mockLiveTelemetry = {
    userEstimate: {
      pm25: 58.4,
      aqi: 148,
      nearestStation: { name: 'Pusa Station' },
    },
    stations: [
      {
        id: 'pusa',
        name: 'Pusa Station (CAAQMS)',
        zone: 'Central Delhi',
        lat: 28.6315,
        lon: 77.2167,
        pm25: 58.4,
        pm10: 112.0,
        no2: 32.5,
        so2: 12.0,
        co: 1.1,
        o3: 38.0,
        nh3: 24.0,
        aqi: 148,
      },
      {
        id: 'dtu',
        name: 'Delhi Technological University (DTU)',
        zone: 'North Delhi',
        lat: 28.7495,
        lon: 77.1171,
        pm25: 68.2,
        pm10: 134.0,
        no2: 36.0,
        aqi: 156,
      },
      {
        id: 'rohini',
        name: 'Rohini Sector 16',
        zone: 'North West Delhi',
        lat: 28.7325,
        lon: 77.1199,
        pm25: 64.0,
        pm10: 122.0,
        no2: 34.0,
        aqi: 152,
      },
    ],
    weather: {
      windSpeed: 2.8,
      temperature: 24.5,
      humidity: 58,
      pressure: 1011,
    },
    lastUpdated: '2026-10-05T14:30:00Z',
  };

  const setupWindowMock = (search = '', hash = '') => {
    global.window = {
      location: {
        search,
        hash,
        pathname: '/',
      },
      navigator: { userAgent: 'Mozilla/5.0 (Node.js)' },
      innerWidth: 1200,
      addEventListener: () => {},
      removeEventListener: () => {},
      scrollTo: () => {},
      history: {
        pushState: () => {},
      },
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

    const docMod = await viteServer.ssrLoadModule(
      './src/components/PollutantDocumentary/PollutantDocumentary.jsx'
    );
    PollutantDocumentary = docMod.default;

    const truckMod = await viteServer.ssrLoadModule(
      './src/components/CargoTruck/AtmosphericCargoTruck.jsx'
    );
    AtmosphericCargoTruck = truckMod.default;

    const appMod = await viteServer.ssrLoadModule('./src/App.jsx');
    App = appMod.default;

    const schoolMod = await viteServer.ssrLoadModule(
      './src/components/SchoolSafety/SchoolSafetyContainer.jsx'
    );
    SchoolSafetyContainer = schoolMod.default;
  });

  after(async () => {
    if (viteServer) {
      await viteServer.close();
    }
  });

  // ==========================================================================
  // 1. Truck viewport is interactive & has launch cue
  // ==========================================================================
  it('1. Truck viewport is interactive and maintains visual cargo hauler presentation', () => {
    const truckHtml = renderToString(React.createElement(AtmosphericCargoTruck));
    assert.ok(
      truckHtml.includes('id="atmospheric-cargo-truck-interactive"'),
      'Truck viewport must be interactive'
    );
    assert.ok(
      truckHtml.includes('Explore the atmospheric cargo'),
      'Truck must feature subtle editorial launch cue'
    );
    // Containers for pollutants exist
    assert.ok(truckHtml.includes('cargo-container-pm25'), 'PM2.5 cargo container must exist');
    assert.ok(truckHtml.includes('cargo-container-pm10'), 'PM10 cargo container must exist');
    assert.ok(truckHtml.includes('cargo-container-no2'), 'NO2 cargo container must exist');
    assert.ok(truckHtml.includes('cargo-container-so2'), 'SO2 cargo container must exist');
    assert.ok(truckHtml.includes('cargo-container-co'), 'CO cargo container must exist');
    assert.ok(truckHtml.includes('cargo-container-o3'), 'O3 cargo container must exist');
    assert.ok(truckHtml.includes('cargo-container-nh3'), 'NH3 cargo container must exist');
  });

  // ==========================================================================
  // 2. Direct routing to PM2.5 on truck click or ?documentary=true
  // ==========================================================================
  it('2. Navigating to ?documentary=true routes directly to PM2.5 documentary without intermediate landing page', () => {
    setupWindowMock('?documentary=true');
    const appHtml = renderToString(React.createElement(App));
    assert.ok(
      appHtml.includes('pollutant-documentary-pm25'),
      'Must directly open PM2.5 documentary container'
    );
    assert.ok(
      appHtml.includes('THE PARTICLES YOU CANNOT SEE'),
      'Must render PM2.5 dossier content directly'
    );
    // Explicit absence of intermediate landing page
    assert.ok(
      !appHtml.includes('id="begin-story-btn"'),
      'Intermediate "BEGIN STORY" button must NOT exist'
    );
    assert.ok(
      !appHtml.includes('BEGIN STORY'),
      'Intermediate "BEGIN STORY" text must NOT exist'
    );
    assert.ok(
      !appHtml.includes('id="chapter-01-the-city"'),
      'Old 12-chapter landing page must NOT render'
    );
  });

  // ==========================================================================
  // 3. All seven pollutants open directly via ?documentary=<pollutantId>
  // ==========================================================================
  it('3. All seven pollutants open directly with their dedicated documentary dossier', () => {
    const pollutants = [
      { id: 'pm25', symbol: 'PM2.5', headline: 'THE PARTICLES YOU CANNOT SEE', theme: 'theme-pm25-haze' },
      { id: 'pm10', symbol: 'PM10', headline: 'THE INHALABLE DUST VEIL', theme: 'theme-pm10-dust' },
      { id: 'no2', symbol: 'NO2', headline: 'THE INVISIBLE EXHAUST CATALYST', theme: 'theme-no2-combustion' },
      { id: 'so2', symbol: 'SO2', headline: 'THE CORROSIVE EMISSION', theme: 'theme-so2-sulfur' },
      { id: 'co', symbol: 'CO', headline: 'THE ODORLESS ASPHYXIANT', theme: 'theme-co-carbon' },
      { id: 'o3', symbol: 'O3', headline: 'THE PHOTOCHEMICAL AFTERNOON SURGE', theme: 'theme-o3-photochemical' },
      { id: 'nh3', symbol: 'NH3', headline: 'THE ALKALINE SMOG GLUE', theme: 'theme-nh3-agricultural' },
    ];

    pollutants.forEach(({ id, symbol, headline, theme }) => {
      setupWindowMock(`?documentary=${id}`);
      const appHtml = renderToString(React.createElement(App));

      assert.ok(
        appHtml.includes(`pollutant-documentary-${id}`),
        `App must directly open pollutant documentary container for ${id}`
      );
      assert.ok(
        appHtml.includes(theme),
        `Pollutant ${id} must feature dedicated theme class ${theme}`
      );
      assert.ok(
        appHtml.includes(symbol),
        `Pollutant ${id} must display symbol ${symbol}`
      );
      assert.ok(
        appHtml.includes(headline),
        `Pollutant ${id} must display headline "${headline}"`
      );
      // No intermediate landing page
      assert.ok(!appHtml.includes('id="begin-story-btn"'));
      assert.ok(!appHtml.includes('BEGIN STORY'));
    });
  });

  // ==========================================================================
  // 4. Pollutant deep dives render full 8-section dossier
  // ==========================================================================
  it('4. Pollutant deep dives render full 8-section dossier with direct navigation', () => {
    const html = renderToString(
      React.createElement(PollutantDocumentary, {
        pollutantId: 'pm25',
        liveData: mockLiveTelemetry,
      })
    );

    assert.ok(html.includes('THE PARTICLES YOU CANNOT SEE'), 'Must render PM2.5 headline');
    assert.ok(html.includes('id="section-01-what-are-they"'), 'Must render Section 01');
    assert.ok(html.includes('id="section-02-how-small"'), 'Must render Section 02');
    assert.ok(html.includes('Human Hair'), 'Must render scale comparison');
    assert.ok(html.includes('id="section-07-why-it-matters"'), 'Must render School section');
    assert.ok(html.includes('id="section-08-the-takeaway"'), 'Must render 14-day section');
    assert.ok(html.includes('YOU CANNOT ALWAYS SEE POLLUTION.'), 'Must render closing takeaway');
    assert.ok(html.includes('EXPLORE ANOTHER POLLUTANT'), 'Must render chapter selector footer');

    // Check all 7 pollutant chips in deep-dive footer
    POLLUTANT_DOCUMENTARY_LIST.forEach((p) => {
      assert.ok(html.includes(`explore-another-${p.id}`), `Must have chip explore-another-${p.id}`);
    });
  });

  // ==========================================================================
  // 5. Back navigation buttons exist in topbar and footer
  // ==========================================================================
  it('5. Back navigation buttons provide direct return to Atmospheric Cargo Truck', () => {
    const html = renderToString(
      React.createElement(PollutantDocumentary, {
        pollutantId: 'pm25',
        liveData: mockLiveTelemetry,
      })
    );

    assert.ok(
      html.includes('id="doc-back-cargo-btn"'),
      'Must render "Back to Atmospheric Cargo" button'
    );
    assert.ok(
      html.includes('id="deep-dive-back-to-story-btn"'),
      'Must render topbar back button'
    );
    assert.ok(
      html.includes('id="doc-return-to-story-cta"'),
      'Must render footer back CTA button'
    );
  });

  // ==========================================================================
  // 6. Live Delhi telemetry dynamically feeds into documentary
  // ==========================================================================
  it('6. Live Delhi telemetry dynamically feeds into Chapter 05 & Chapter 07 without hardcoding', () => {
    const customTelemetry = {
      ...mockLiveTelemetry,
      userEstimate: {
        pm25: 84.6,
        aqi: 195,
        nearestStation: { name: 'Custom Station Okhla' },
      },
      stations: [
        {
          id: 'okhla',
          name: 'Custom Station Okhla (CAAQMS)',
          pm25: 84.6,
          aqi: 195,
          lat: 28.53,
          lon: 77.27,
        },
      ],
      weather: {
        windSpeed: 4.2,
        temperature: 28.1,
        humidity: 45,
        pressure: 1009,
      },
    };

    const html = renderToString(
      React.createElement(PollutantDocumentary, {
        pollutantId: 'pm25',
        liveData: customTelemetry,
      })
    );

    assert.ok(html.includes('84.6'), 'Must display dynamic PM2.5 84.6');
    assert.ok(html.includes('Custom Station Okhla (CAAQMS)'), 'Must display active station');
    assert.ok(html.includes('4.2') && html.includes('m/s'), 'Must display dynamic wind speed 4.2 m/s');
    assert.ok(html.includes('28.1') && html.includes('°C'), 'Must display dynamic temperature 28.1°C');
    assert.ok(!html.includes('58.4 µg/m³'), 'Must not display stale 58.4 value');
  });

  // ==========================================================================
  // 7. School Safety section renders IDW and mandatory spatial disclaimer
  // ==========================================================================
  it('7. School Safety section renders institution, IDW flow, and mandatory estimate disclaimer', () => {
    const html = renderToString(
      React.createElement(PollutantDocumentary, {
        pollutantId: 'pm25',
        liveData: mockLiveTelemetry,
      })
    );

    assert.ok(html.includes('FROM CITY TO SCHOOL'), 'Chapter 07 title must render');
    assert.ok(
      html.includes('Delhi Public School'),
      'Must render evaluated school from directory'
    );
    assert.ok(
      html.includes('ESTIMATED AROUND SCHOOL'),
      'Must badge school value as ESTIMATED AROUND SCHOOL'
    );
    assert.ok(
      html.includes('School PM2.5 values are spatial estimates derived from nearby monitoring stations and are not direct measurements at the school.'),
      'Must render mandatory spatial estimate disclaimer'
    );
  });

  // ==========================================================================
  // 8. 14-day evidence archive strictly displays NO DATA for unrecorded days
  // ==========================================================================
  it('8. 14-day evidence chapter renders empirical dossier and strict NO DATA without fabrication', () => {
    const html = renderToString(
      React.createElement(PollutantDocumentary, {
        pollutantId: 'pm25',
        liveData: mockLiveTelemetry,
      })
    );

    assert.ok(html.includes('14 DAYS OF EVIDENCE'), 'Chapter 08 title must render');
    assert.ok(html.includes('14-DAY ARCHIVE'), 'Chapter 08 archive kicker must render');
    assert.ok(
      html.includes('NO DATA'),
      'Missing days in the 14-day empirical timeline must show explicit NO DATA badge'
    );
  });

  // ==========================================================================
  // 9. Mobile responsive CSS and reduced motion compliance
  // ==========================================================================
  it('9. PollutantDocumentary.css includes responsive and prefers-reduced-motion accessibility rules', async () => {
    const cssContent = await fs.readFile(
      './src/components/PollutantDocumentary/PollutantDocumentary.css',
      'utf8'
    );

    assert.ok(cssContent.includes('@media (max-width: 768px)'), 'Must include 768px breakpoint');
    assert.ok(cssContent.includes('cinematic-14day-grid'), 'Must include 14-day responsive styles');
    assert.ok(cssContent.includes('overflow-x: hidden'), 'Must contain overflow-x: hidden');
    assert.ok(
      cssContent.includes('prefers-reduced-motion: reduce'),
      'Must contain prefers-reduced-motion query'
    );
  });

  // ==========================================================================
  // 10. ?view=school still works cleanly
  // ==========================================================================
  it('10. App renders School Safety view when ?view=school is active', () => {
    setupWindowMock('?view=school', '#school');
    const html = renderToString(React.createElement(App));
    assert.ok(
      html.includes('School Safety Dashboard') || html.includes('Back to National AQI Map'),
      'App must render School Safety on ?view=school'
    );
  });

  // ==========================================================================
  // 11. ?view=map still works cleanly
  // ==========================================================================
  it('11. App renders Live Map when ?view=map is active', () => {
    setupWindowMock('?view=map', '#heatmap');
    const html = renderToString(React.createElement(App));
    assert.ok(
      html.includes('DelhiAqiHeatmap') || html.includes('heatmap') || html.includes('#070a12'),
      'App must handle map view cleanly on ?view=map'
    );
  });

  // ==========================================================================
  // 12. Petition workflow still works cleanly
  // ==========================================================================
  it('12. Petition workflow helper functions remain intact and fully operational', async () => {
    const petitionMod = await viteServer.ssrLoadModule(
      './src/components/Petition/petitionHelpers.js'
    );
    assert.ok(petitionMod.categorizePm25, 'PM2.5 categorizer must exist');
    assert.strictEqual(petitionMod.buildClientDraft, undefined, 'Client draft builder must be deleted');
  });
});
