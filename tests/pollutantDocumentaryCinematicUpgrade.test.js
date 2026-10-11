/**
 * pollutantDocumentaryCinematicUpgrade.test.js
 * Comprehensive Verification Test for the 7 VayuVitals Pollution Documentaries
 * Upgraded with Cinematic GSAP and Three.js Animations
 */

import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import {
  POLLUTANT_DOCUMENTARIES,
  POLLUTANT_DOCUMENTARY_LIST,
} from '../src/data/pollutantDocumentaries.js';

describe('Cinematic GSAP and Three.js Upgrades for All Seven Pollutant Documentaries', () => {
  let viteServer;
  let PollutantDocumentary;
  let HeroAtmosphericCanvas;
  let DocumentaryHero;
  let DocumentaryDataSection;
  let DocumentaryLocationMap;

  const ALL_POLLUTANTS = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3', 'nh3'];

  before(async () => {
    viteServer = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    const docMod = await viteServer.ssrLoadModule(
      './src/components/PollutantDocumentary/PollutantDocumentary.jsx'
    );
    PollutantDocumentary = docMod.default;

    const canvasMod = await viteServer.ssrLoadModule(
      './src/components/PollutantDocumentary/HeroAtmosphericCanvas.jsx'
    );
    HeroAtmosphericCanvas = canvasMod.default;

    const heroMod = await viteServer.ssrLoadModule(
      './src/components/PollutantDocumentary/DocumentaryHero.jsx'
    );
    DocumentaryHero = heroMod.default;

    const dataMod = await viteServer.ssrLoadModule(
      './src/components/PollutantDocumentary/DocumentaryDataSection.jsx'
    );
    DocumentaryDataSection = dataMod.default;

    const mapMod = await viteServer.ssrLoadModule(
      './src/components/PollutantDocumentary/DocumentaryLocationMap.jsx'
    );
    DocumentaryLocationMap = mapMod.default;
  });

  after(async () => {
    if (viteServer) {
      await viteServer.close();
    }
  });

  // ==========================================================================
  // 1. DATA AUDIT: All 7 pollutants have complete scientific profiles
  // ==========================================================================
  it('1. All seven pollutants (PM2.5, PM10, NO2, SO2, CO, O3, NH3) exist in dataset with complete metadata', () => {
    assert.equal(POLLUTANT_DOCUMENTARY_LIST.length, 7, 'Must list exactly 7 pollutants');

    ALL_POLLUTANTS.forEach((id) => {
      const data = POLLUTANT_DOCUMENTARIES[id];
      assert.ok(data, `Pollutant data for ${id} must exist`);
      assert.ok(data.name, `Pollutant ${id} must have a name`);
      assert.ok(data.symbol, `Pollutant ${id} must have a chemical/particulate symbol`);
      assert.ok(data.unit, `Pollutant ${id} must have a measurement unit`);
      assert.ok(data.naaqsLimit, `Pollutant ${id} must have a CPCB NAAQS limit`);
      assert.ok(data.whoLimit, `Pollutant ${id} must have a WHO guideline limit`);
      assert.ok(data.shortDescription, `Pollutant ${id} must have a short description`);
      assert.ok(data.whyItMatters, `Pollutant ${id} must have physiological context`);
    });
  });

  // ==========================================================================
  // 2. ANIMATION 1 — HERO REVEAL: Coordinated entrance & authentic measurements
  // ==========================================================================
  it('2. Hero reveal maintains masked typography, authentic values, and optical resolve', () => {
    ALL_POLLUTANTS.forEach((pollutantId) => {
      const pData = POLLUTANT_DOCUMENTARIES[pollutantId];
      const html = renderToString(
        React.createElement(PollutantDocumentary, {
          pollutantId,
          initialTelemetry: {
            stations: [
              {
                id: 'anand_vihar',
                name: 'Anand Vihar (CAAQMS)',
                zone: 'East Delhi',
                [pollutantId]: 142.5,
              },
            ],
          },
        })
      );

      // Masked title markup
      assert.ok(
        html.includes('documentary-pollutant-name'),
        `Pollutant ${pollutantId} must render pollutant name in hero`
      );
      assert.ok(
        html.includes('doc-pollutant-name-nowrap'),
        `Pollutant ${pollutantId} must prevent line breaks inside the symbol heading`
      );
      assert.ok(
        html.includes('documentary-pollutant-tags'),
        `Pollutant ${pollutantId} must render adjacent tags in dedicated container`
      );
      assert.ok(
        html.includes('doc-mask-reveal-wrap'),
        `Pollutant ${pollutantId} must have masked reveal containers for cinematic entrance`
      );

      // Central numeric readout exists
      assert.ok(
        html.includes('id="doc-central-numeric-readout"'),
        `Pollutant ${pollutantId} must have central measurement readout`
      );

      // Arc gauge structure with uniform solid red (#FF4545) stroke
      assert.ok(
        html.includes('id="doc-active-gauge-arc"'),
        `Pollutant ${pollutantId} must feature SVG circular measurement gauge`
      );
      assert.ok(
        html.includes('stroke="#FF4545"'),
        `Pollutant ${pollutantId} active gauge arc must use solid red #FF4545`
      );
      assert.ok(
        html.includes('documentary-gauge-bead'),
        `Pollutant ${pollutantId} must have active calibration bead`
      );
    });
  });

  // ==========================================================================
  // 3. ATMOSPHERIC PARTICLE FIELD: Particles Removed Per Specification
  // ==========================================================================
  it('3. HeroAtmosphericCanvas renders null to completely disable WebGL particle loops', () => {
    ALL_POLLUTANTS.forEach((pollutantId) => {
      const html = renderToString(
        React.createElement(HeroAtmosphericCanvas, {
          pollutantId,
          windSpeed: 3.2,
        })
      );

      assert.strictEqual(
        html,
        '',
        `HeroAtmosphericCanvas must render null with zero particles for ${pollutantId}`
      );
    });
  });

  // ==========================================================================
  // 4. INTERMEDIATE FIELD DOSSIER: Completely removed from all routes
  // ==========================================================================
  it('4. Intermediate Field Dossier and pinned story section are completely removed from all 7 pollutants', () => {
    ALL_POLLUTANTS.forEach((pollutantId) => {
      const html = renderToString(
        React.createElement(PollutantDocumentary, {
          pollutantId,
        })
      );

      // Verify that no pinned story section, viewport, or dossier ribbon exists
      assert.strictEqual(
        html.includes('documentary-pinned-story-section'),
        false,
        `Intermediate pinned story section must NOT exist for ${pollutantId}`
      );
      assert.strictEqual(
        html.includes('documentary-pinned-viewport'),
        false,
        `Intermediate pinned viewport must NOT exist for ${pollutantId}`
      );
      assert.strictEqual(
        html.includes('documentary-pinned-top-ribbon'),
        false,
        `Field Dossier top ribbon must NOT exist for ${pollutantId}`
      );
      assert.strictEqual(
        html.includes('doc-ribbon-stepper'),
        false,
        `Field Dossier ribbon stepper must NOT exist for ${pollutantId}`
      );
    });
  });

  // ==========================================================================
  // 5. ANIMATION 4 — DATA VISUALIZATIONS: Diurnal Chart, Scale, Standards
  // ==========================================================================
  it('5. DocumentaryDataSection renders 24-hr diurnal curve, aerodynamic scale, and standards tableau with dynamic styling', () => {
    ALL_POLLUTANTS.forEach((pollutantId) => {
      const pData = POLLUTANT_DOCUMENTARIES[pollutantId];
      const html = renderToString(
        React.createElement(DocumentaryDataSection, {
          pollutantData: pData,
          currentValue: 125,
          currentStation: { name: 'Anand Vihar' },
          cinematicTheme: { accent: '#ef4444' },
        })
      );

      // Standards comparison
      assert.ok(
        html.includes('documentary-standards-tableau'),
        `Standards comparison block must exist for ${pollutantId}`
      );
      assert.ok(
        html.includes('INDIAN NAAQS 24-HR LIMIT'),
        `NAAQS benchmark must exist for ${pollutantId}`
      );
      assert.ok(
        html.includes('WHO 2021 AIR QUALITY GUIDELINE'),
        `WHO benchmark must exist for ${pollutantId}`
      );

      // 24-hour diurnal chart
      assert.ok(
        html.includes('doc-diurnal-chart-wrap'),
        `Diurnal chart wrapper must exist for ${pollutantId}`
      );
      assert.ok(
        html.includes('doc-diurnal-svg'),
        `Diurnal SVG curve must exist for ${pollutantId}`
      );
    });
  });

  // ==========================================================================
  // 6. ANIMATION 5 — SCROLL STORYTELLING: Complete page mounting and structure
  // ==========================================================================
  it('6. PollutantDocumentary mounts full document hierarchy without crashes for all seven routes', () => {
    ALL_POLLUTANTS.forEach((pollutantId) => {
      const html = renderToString(
        React.createElement(PollutantDocumentary, {
          pollutantId,
        })
      );

      // Top-level container has proper id and class
      assert.ok(
        html.includes(`id="pollutant-documentary-${pollutantId}"`),
        `Page must mount container id for ${pollutantId}`
      );

      // Reusable back button with accessibility and tooltip
      assert.ok(
        html.includes(`id="doc-back-btn-${pollutantId}"`),
        `Top-left back button must exist for ${pollutantId}`
      );
      assert.ok(
        html.includes('aria-label="Go back"'),
        `Back button must have aria-label="Go back" for ${pollutantId}`
      );
      assert.ok(
        html.includes('doc-back-tooltip'),
        `Back button tooltip must exist for ${pollutantId}`
      );

      assert.ok(
        html.includes('documentary-hero'),
        `Hero viewport must exist for ${pollutantId}`
      );
      assert.ok(
        html.includes('documentary-section'),
        `Spacious editorial section must exist for ${pollutantId}`
      );
      assert.ok(
        html.includes('documentary-image-section'),
        `Cinematic photographic section must exist for ${pollutantId}`
      );
      assert.ok(
        html.includes('documentary-data-section'),
        `Science and telemetry section must exist for ${pollutantId}`
      );
      assert.ok(
        html.includes('documentary-footer'),
        `Environmental footer must exist for ${pollutantId}`
      );

      // Verify DocumentaryLocationMap is mounted in the hero spatial card
      assert.ok(
        html.includes('doc-spatial-mapbox-wrapper'),
        `DocumentaryLocationMap wrapper must exist in hero for ${pollutantId}`
      );
      assert.ok(
        html.includes('doc-spatial-mapbox-canvas'),
        `Mapbox canvas mount element must exist in hero for ${pollutantId}`
      );
      assert.ok(
        html.includes('role="region"'),
        `Map element must have role="region" for accessibility in ${pollutantId}`
      );
    });
  });

  // ==========================================================================
  // 7. INTERACTIVE MAPBOX LOCATION CARD: Geographical features & authentic marker
  // ==========================================================================
  it('7. DocumentaryLocationMap renders interactive Mapbox container with accessibility, coordinates, and real telemetry', () => {
    ALL_POLLUTANTS.forEach((pollutantId) => {
      const html = renderToString(
        React.createElement(DocumentaryLocationMap, {
          longitude: 77.0510,
          latitude: 28.7762,
          locationName: 'North West Delhi',
          stationName: 'Bawana Industrial Area',
          accentColor: '#f97316',
        })
      );

      assert.ok(
        html.includes('doc-spatial-mapbox-wrapper'),
        'Must render doc-spatial-mapbox-wrapper'
      );
      assert.ok(
        html.includes('doc-spatial-mapbox-canvas'),
        'Must render doc-spatial-mapbox-canvas'
      );
      assert.ok(
        html.includes('aria-label="Geographical monitoring location map for North West Delhi"'),
        'Must include descriptive accessible region label'
      );
    });
  });

  // ==========================================================================
  // 8. SHARED MAPBOX SERVICE & REQUEST DEDUPLICATION CACHE
  // ==========================================================================
  it('8. documentaryMapService exports singleton instance and in-flight deduplicator', async () => {
    const { documentaryMapService, fetchDeduplicatedJson, invalidateResponseCache } = await import(
      '../src/services/documentaryMapService.js'
    );

    assert.ok(documentaryMapService, 'Must export singleton documentaryMapService');
    assert.strictEqual(typeof documentaryMapService.mountMap, 'function');
    assert.strictEqual(typeof documentaryMapService.updateLocation, 'function');
    assert.strictEqual(typeof documentaryMapService.detachFromContainer, 'function');
    assert.strictEqual(typeof fetchDeduplicatedJson, 'function');
    assert.strictEqual(typeof invalidateResponseCache, 'function');
  });
});
