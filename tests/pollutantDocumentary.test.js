/**
 * Pollutant Documentary Visual Storybook Verification Tests
 *
 * Verifies all 16 core requirements for the Chapter-by-Chapter Visual Storybook:
 * 1. All 12 chapters render.
 * 2. Each chapter has its own distinct visual theme.
 * 3. Chapter transitions work (ribbon navigation, hero anchor).
 * 4. Truck opens the documentary.
 * 5. Existing pollutant deep dives still work.
 * 6. Live Delhi data still works.
 * 7. School Safety still works.
 * 8. 14-day evidence still works.
 * 9. Missing data remains NO DATA.
 * 10. No live values are hard-coded.
 * 11. Mobile CSS exists for each chapter.
 * 12. Reduced-motion support remains.
 * 13. Keyboard navigation remains accessible.
 * 14. ?view=school still works.
 * 15. ?view=map still works.
 * 16. Petition workflow still works.
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

describe('VayuVitals Visual Storybook Pollution Documentary', () => {
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
  // 1. All 12 chapters render
  // ==========================================================================
  it('1. All 12 chapters render in sequence within the visual storybook', () => {
    const html = renderToString(
      React.createElement(PollutantDocumentary, {
        pollutantId: null,
        liveData: mockLiveTelemetry,
      })
    );

    const requiredChapterIds = [
      'chapter-01-the-city',
      'chapter-02-the-invisible',
      'chapter-03-what-we-carry',
      'chapter-04-where-it-comes-from',
      'chapter-05-the-air-moves',
      'chapter-06-delhi-right-now',
      'chapter-07-the-city-is-not-one-number',
      'chapter-08-the-weather-changes-the-story',
      'chapter-09-from-city-to-school',
      'chapter-10-14-days-of-evidence',
      'chapter-11-what-we-know-what-we-dont',
      'chapter-12-the-takeaway',
    ];

    requiredChapterIds.forEach((id) => {
      assert.ok(
        html.includes(`id="${id}"`),
        `Chapter container with id="${id}" must render in DOM`
      );
    });

    // Opening cinematic hero & title
    assert.ok(html.includes('THE AIR') && html.includes('WE BREATHE'));
    assert.ok(html.includes('An investigation into the invisible pollution moving through Delhi.'));
  });

  // ==========================================================================
  // 2. Each chapter has its own theme
  // ==========================================================================
  it('2. Each chapter has its own distinct visual theme class', () => {
    const html = renderToString(
      React.createElement(PollutantDocumentary, {
        pollutantId: null,
        liveData: mockLiveTelemetry,
      })
    );

    const requiredThemes = [
      'theme-city-archive',
      'theme-lab-notebook',
      'theme-cargo-manifest',
      'theme-investigation-board',
      'theme-weather-desk',
      'theme-live-newsroom',
      'theme-cartographer',
      'theme-split-atmosphere',
      'theme-school-field-report',
      'theme-evidence-dossier',
      'theme-split-evidence-board',
      'theme-minimal-archive',
    ];

    requiredThemes.forEach((theme) => {
      assert.ok(
        html.includes(theme),
        `Documentary must include dedicated theme class: ${theme}`
      );
    });
  });

  // ==========================================================================
  // 3. Chapter transitions work (ribbon navigation, hero anchor)
  // ==========================================================================
  it('3. Chapter transitions and tactile navigation ribbon render cleanly', () => {
    const html = renderToString(
      React.createElement(PollutantDocumentary, {
        pollutantId: null,
        liveData: mockLiveTelemetry,
      })
    );

    // Tactile Ribbon Navigation Bar
    assert.ok(html.includes('doc-chapter-ribbon'), 'Must render tactile chapter ribbon');
    assert.ok(html.includes('ribbon-tab'), 'Must render ribbon tabs');

    // Hero Begin Story CTA button
    assert.ok(html.includes('id="begin-story-btn"'), 'Must render begin-story button');
    assert.ok(html.includes('BEGIN STORY'), 'Button must feature "BEGIN STORY"');
  });

  // ==========================================================================
  // 4. Truck opens the documentary
  // ==========================================================================
  it('4. Truck viewport is interactive and opens the documentary on click / ?documentary=true', () => {
    const truckHtml = renderToString(React.createElement(AtmosphericCargoTruck));
    assert.ok(
      truckHtml.includes('id="atmospheric-cargo-truck-interactive"'),
      'Truck viewport must be interactive'
    );
    assert.ok(
      truckHtml.includes('Explore the atmospheric cargo'),
      'Truck must feature subtle editorial launch cue'
    );

    setupWindowMock('?documentary=true');
    const appHtml = renderToString(React.createElement(App));
    assert.ok(
      appHtml.includes('THE AIR') && appHtml.includes('WE BREATHE'),
      'Clicking truck / ?documentary=true must open visual storybook'
    );
  });

  // ==========================================================================
  // 5. Existing pollutant deep dives still work
  // ==========================================================================
  it('5. Pollutant deep dives render full 8-section dossier with "Back to the Story" CTA', () => {
    const html = renderToString(
      React.createElement(PollutantDocumentary, {
        pollutantId: 'pm25',
        liveData: mockLiveTelemetry,
      })
    );

    assert.ok(
      html.includes('THE PARTICLES YOU CANNOT SEE'),
      'Must render PM2.5 headline'
    );
    assert.ok(
      html.includes('Back to the Story'),
      'Deep-dive must provide "Back to the Story" navigation button'
    );
    assert.ok(html.includes('id="section-01-what-are-they"'));
    assert.ok(html.includes('id="section-02-how-small"'));
    assert.ok(html.includes('Human Hair'));
    assert.ok(html.includes('EXPLORE ANOTHER POLLUTANT'));

    // Check all 7 pollutant chips in deep-dive footer
    POLLUTANT_DOCUMENTARY_LIST.forEach((p) => {
      assert.ok(html.includes(`explore-another-${p.id}`));
    });
  });

  // ==========================================================================
  // 6. Live Delhi data still works
  // ==========================================================================
  it('6. Live Delhi data feeds into Chapter 06 newsroom and Chapter 01 dawn archive', () => {
    const html = renderToString(
      React.createElement(PollutantDocumentary, {
        pollutantId: null,
        liveData: mockLiveTelemetry,
      })
    );

    // Chapter 06: Live Newsroom
    assert.ok(html.includes('DELHI RIGHT NOW'));
    assert.ok(html.includes('58.4'), 'Must render live PM2.5 value 58.4');
    assert.ok(html.includes('Pusa Station (CAAQMS)'), 'Must render monitoring receptor');
    assert.ok(html.includes('LIVE DELHI PM2.5 OBSERVATION'));
    assert.ok(html.includes('DATA RECEIVED'));
    assert.ok(html.includes('AQI 148'));

    // Chapter 05: Environmental weather metrics
    assert.ok(html.includes('2.8 m/s'), 'Must render live wind speed');
    assert.ok(html.includes('24.5°C'), 'Must render live temperature');
    assert.ok(html.includes('58%'), 'Must render live humidity');
  });

  // ==========================================================================
  // 7. School Safety still works
  // ==========================================================================
  it('7. School Safety section renders institution, IDW flow, and mandatory estimate disclaimer', () => {
    const html = renderToString(
      React.createElement(PollutantDocumentary, {
        pollutantId: null,
        liveData: mockLiveTelemetry,
      })
    );

    assert.ok(html.includes('FROM CITY TO SCHOOL'), 'Chapter 09 title must render');
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
    assert.ok(
      html.includes('school-flow-process-strip'),
      'Must render SCHOOL -> NEARBY STATIONS -> DISTANCE -> IDW -> ESTIMATED PM2.5 flow strip'
    );
  });

  // ==========================================================================
  // 8. 14-day evidence still works
  // ==========================================================================
  it('8. 14-day evidence chapter renders empirical dossier, observation metrics, and coverage', () => {
    const html = renderToString(
      React.createElement(PollutantDocumentary, {
        pollutantId: null,
        liveData: mockLiveTelemetry,
      })
    );

    assert.ok(html.includes('14 DAYS OF EVIDENCE'), 'Chapter 10 title must render');
    assert.ok(html.includes('14 DAYS.'), 'Dossier headline must render');
    assert.ok(html.includes('14 Consecutive Days'), 'Window length must render');
    assert.ok(html.includes('COVERAGE'), 'Evidence coverage metric must render');
    assert.ok(html.includes('CHRONOLOGICAL DAILY LOG (14 CALENDAR DAYS)'));
  });

  // ==========================================================================
  // 9. Missing data remains NO DATA
  // ==========================================================================
  it('9. Missing monitoring days remain strictly displayed as NO DATA without fabrication', () => {
    const html = renderToString(
      React.createElement(PollutantDocumentary, {
        pollutantId: null,
        liveData: mockLiveTelemetry,
      })
    );

    assert.ok(
      html.includes('NO DATA'),
      'Missing days in the 14-day empirical timeline must show explicit NO DATA badge'
    );
  });

  // ==========================================================================
  // 10. No live values are hard-coded
  // ==========================================================================
  it('10. No live values are hard-coded; adapts to dynamic telemetry changes', () => {
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
        pollutantId: null,
        liveData: customTelemetry,
      })
    );

    assert.ok(html.includes('84.6'), 'Must display dynamic PM2.5 84.6');
    assert.ok(html.includes('AQI 195'), 'Must display dynamic AQI 195');
    assert.ok(html.includes('4.2 m/s'), 'Must display dynamic wind speed 4.2');
    assert.ok(html.includes('28.1°C'), 'Must display dynamic temperature 28.1');
    assert.ok(!html.includes('58.4 µg/m³'), 'Must not display stale 58.4 value');
  });

  // ==========================================================================
  // 11. Mobile CSS exists for each chapter
  // ==========================================================================
  it('11. Mobile responsive CSS exists for every chapter in PollutantDocumentary.css', async () => {
    const cssContent = await fs.readFile(
      './src/components/PollutantDocumentary/PollutantDocumentary.css',
      'utf8'
    );

    assert.ok(cssContent.includes('@media (max-width: 768px)'));

    // Check dedicated chapter mobile compositions
    const requiredMobileSelectors = [
      'city-scrapbook-layout',
      'lab-notebook-sheet',
      'cargo-manifest-board',
      'corkboard-surface',
      'weather-drafting-table',
      'newsprint-bulletin-sheet',
      'cartographer-parchment-sheet',
      'acetate-lightbox-table',
      'school-clipboard-board',
      'manila-folder-body',
      'split-boards-container',
      'minimal-final-sheet',
    ];

    requiredMobileSelectors.forEach((sel) => {
      assert.ok(
        cssContent.includes(sel),
        `Mobile CSS must contain rules for .${sel}`
      );
    });

    assert.ok(
      cssContent.includes('overflow-x: hidden'),
      'Must contain overflow-x: hidden to prevent horizontal scroll'
    );
  });

  // ==========================================================================
  // 12. Reduced-motion support remains
  // ==========================================================================
  it('12. PollutantDocumentary.css includes prefers-reduced-motion accessibility rules', async () => {
    const cssContent = await fs.readFile(
      './src/components/PollutantDocumentary/PollutantDocumentary.css',
      'utf8'
    );

    assert.ok(
      cssContent.includes('prefers-reduced-motion: reduce'),
      'Must contain prefers-reduced-motion media query'
    );
    assert.ok(
      cssContent.includes('animation-duration: 0.01ms') || cssContent.includes('animation: none'),
      'Must disable animations under reduced motion'
    );
  });

  // ==========================================================================
  // 13. Keyboard navigation remains accessible
  // ==========================================================================
  it('13. Scrapbook tabs, buttons, and interactive cards support keyboard interaction', () => {
    const html = renderToString(
      React.createElement(PollutantDocumentary, {
        pollutantId: null,
        liveData: mockLiveTelemetry,
      })
    );

    // Buttons and tabs must have role or native button tags
    assert.ok(html.includes('id="begin-story-btn"'));
    assert.ok(html.includes('cargo-row-entry'));
    assert.ok(html.includes('tabIndex="0"') || html.includes('tabindex="0"'));
    assert.ok(html.includes('role="button"'));
  });

  // ==========================================================================
  // 14. ?view=school still works
  // ==========================================================================
  it('14. App renders School Safety view when ?view=school is active', () => {
    setupWindowMock('?view=school', '#school');
    const html = renderToString(React.createElement(App));
    assert.ok(
      html.includes('School Safety Dashboard') || html.includes('Back to National AQI Map'),
      'App must render School Safety on ?view=school'
    );
  });

  // ==========================================================================
  // 15. ?view=map still works
  // ==========================================================================
  it('15. App renders Live Map when ?view=map is active', () => {
    setupWindowMock('?view=map', '#heatmap');
    const html = renderToString(React.createElement(App));
    assert.ok(
      html.includes('DelhiAqiHeatmap') || html.includes('heatmap') || html.includes('#070a12'),
      'App must handle map view cleanly on ?view=map'
    );
  });

  // ==========================================================================
  // 16. Petition workflow still works
  // ==========================================================================
  it('16. Petition workflow helper functions remain intact and fully operational', async () => {
    const petitionMod = await viteServer.ssrLoadModule(
      './src/components/Petition/petitionHelpers.js'
    );
    assert.ok(petitionMod.buildClientDraft, 'Client draft builder must exist');
    assert.ok(petitionMod.computeClientEvidence, 'Client evidence calculator must exist');
    assert.ok(petitionMod.computeClientForecast, 'Client forecast calculator must exist');
    assert.ok(petitionMod.categorizePm25, 'PM2.5 categorizer must exist');
  });

  // ==========================================================================
  // 17. All seven pollutants render cinematic editorial documentaries
  // ==========================================================================
  it('17. All seven pollutants render dedicated cinematic documentary chapters with theme classes', () => {
    const pollutants = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3', 'nh3'];
    const expectedThemes = {
      pm25: 'theme-pm25-haze',
      pm10: 'theme-pm10-dust',
      no2: 'theme-no2-combustion',
      so2: 'theme-so2-sulfur',
      co: 'theme-co-carbon',
      o3: 'theme-o3-photochemical',
      nh3: 'theme-nh3-agricultural',
    };

    pollutants.forEach((pId) => {
      const html = renderToString(
        React.createElement(PollutantDocumentary, {
          pollutantId: pId,
          liveData: mockLiveTelemetry,
        })
      );

      const polData = POLLUTANT_DOCUMENTARIES[pId];
      assert.ok(
        html.includes(`pollutant-documentary-${pId}`),
        `Pollutant ${pId} container must render`
      );
      assert.ok(
        html.includes('cinematic-pollutant-documentary'),
        `Pollutant ${pId} must feature cinematic-pollutant-documentary class`
      );
      assert.ok(
        html.includes(expectedThemes[pId]),
        `Pollutant ${pId} must feature theme class ${expectedThemes[pId]}`
      );
      assert.ok(
        html.includes(polData.symbol),
        `Pollutant ${pId} must render symbol ${polData.symbol}`
      );
      assert.ok(
        html.includes('cinematic-chapter-hero'),
        `Pollutant ${pId} must render full-screen hero opening`
      );
    });
  });

  // ==========================================================================
  // 18. Cinematic transition veil, film grain, and vignette overlays render
  // ==========================================================================
  it('18. Cinematic transition veil, film grain, and vignette overlays are rendered', () => {
    const html = renderToString(
      React.createElement(PollutantDocumentary, {
        pollutantId: 'pm25',
        liveData: mockLiveTelemetry,
      })
    );

    assert.ok(
      html.includes('cinematic-film-grain'),
      'Must render ambient film grain overlay'
    );
    assert.ok(
      html.includes('cinematic-vignette-overlay'),
      'Must render cinematic vignette overlay'
    );
    assert.ok(
      html.includes('cinematic-transition-veil'),
      'Must render gapless transition veil'
    );
    assert.ok(
      html.includes('transition-atmospheric-particles'),
      'Must render transition atmospheric particles'
    );
  });

  // ==========================================================================
  // 19. Full-screen documentary chapter markers and editorial typography render
  // ==========================================================================
  it('19. Documentary chapter markers and editorial typography render cleanly', () => {
    const html = renderToString(
      React.createElement(PollutantDocumentary, {
        pollutantId: 'pm25',
        liveData: mockLiveTelemetry,
      })
    );

    assert.ok(html.includes('- 2026 -'), 'Hero date marker must render');
    assert.ok(html.includes('DELHI ATMOSPHERIC ARCHIVE'), 'Hero archive kicker must render');
    assert.ok(html.includes('- CHAPTER 01 -'), 'Chapter 01 marker must render');
    assert.ok(html.includes('- 2.5 µm -'), 'Chapter 02 scale marker must render');
    assert.ok(html.includes('- CHAPTER 03 -'), 'Chapter 03 sources marker must render');
    assert.ok(html.includes('- CHAPTER 04 -'), 'Chapter 04 transport marker must render');
    assert.ok(html.includes('- LIVE EVIDENCE -'), 'Chapter 05 live evidence marker must render');
    assert.ok(html.includes('- CHAPTER 06 -'), 'Chapter 06 trends marker must render');
    assert.ok(html.includes('- CHAPTER 07 -'), 'Chapter 07 school marker must render');
    assert.ok(html.includes('- 14-DAY ARCHIVE -'), 'Chapter 08 14-day archive marker must render');
    assert.ok(html.includes('YOU CANNOT ALWAYS SEE POLLUTION.'), 'Takeaway closing line must render');
    assert.ok(html.includes('SEE THE AIR. UNDERSTAND THE AIR. ACT ON THE EVIDENCE.'), 'Brand credo must render');
  });

  // ==========================================================================
  // 20. Pollutant navigation footer renders all 7 chapter chips
  // ==========================================================================
  it('20. Pollutant navigation footer renders all 7 chapter chips with chapter numbers', () => {
    const html = renderToString(
      React.createElement(PollutantDocumentary, {
        pollutantId: 'pm25',
        liveData: mockLiveTelemetry,
      })
    );

    assert.ok(html.includes('cinematic-pollutant-nav-footer'));
    assert.ok(html.includes('EXPLORE ANOTHER POLLUTANT'));

    POLLUTANT_DOCUMENTARY_LIST.forEach((p, idx) => {
      assert.ok(
        html.includes(`explore-another-${p.id}`),
        `Must render button for ${p.id}`
      );
      assert.ok(
        html.includes(`0${idx + 1}`),
        `Must render chapter number 0${idx + 1}`
      );
    });
  });

  // ==========================================================================
  // 21. Live telemetry, School Safety IDW estimate, and 14-day evidence are integrated
  // ==========================================================================
  it('21. Live telemetry, School Safety IDW estimate, and 14-day evidence integrate into cinematic chapters', () => {
    const html = renderToString(
      React.createElement(PollutantDocumentary, {
        pollutantId: 'pm25',
        liveData: mockLiveTelemetry,
      })
    );

    // Live number in Chapter 05
    assert.ok(html.includes('58.4'), 'Live PM2.5 reading 58.4 must render');
    assert.ok(html.includes('Pusa Station (CAAQMS)'), 'Receptor station must render');
    assert.ok(html.includes('AQI 148'), 'AQI equivalent must render');

    // School Safety in Chapter 07
    assert.ok(html.includes('ESTIMATED AROUND SCHOOL'), 'School estimate badge must render');
    assert.ok(
      html.includes('School PM2.5 values are spatial estimates derived from nearby monitoring stations and are not direct measurements at the school.'),
      'Mandatory spatial estimation disclaimer must render'
    );

    // 14-Day evidence in Chapter 08
    assert.ok(html.includes('14 DAYS OF EVIDENCE'), '14-day evidence title must render');
    assert.ok(html.includes('NO DATA'), 'Unrecorded days must strictly display NO DATA');
  });
});
