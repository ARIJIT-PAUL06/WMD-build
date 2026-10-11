/**
 * caseDossierNavigation.test.js
 *
 * Verifies that:
 * 1. The Case Dossier bar is rendered as a sticky element inside the dossier wrapper
 * 2. Stepper steps (01 SOURCE, 02 MOVEMENT, 03 EXPOSURE, 04 IMPACT) are interactive buttons
 * 3. WmdHeader MAP and Globe buttons smoothly navigate to #wmd-coverage-band without page reload
 * 4. The #map anchor exists on the coverage band
 * 5. CSS defines position: sticky and scroll-margin-top for all section targets
 */

import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

describe('Case Dossier Sticky Stepper & Click Navigation Integrity', () => {
  let viteServer;
  let PollutantDocumentary;
  let CaseDossierBar;
  let WmdCoverageBand;

  before(async () => {
    global.window = {
      location: { search: '', hash: '', pathname: '/' },
      navigator: { userAgent: 'Mozilla/5.0 (Node.js)' },
      innerWidth: 1200,
      addEventListener: () => {},
      removeEventListener: () => {},
      scrollTo: () => {},
      history: { pushState: () => {}, scrollRestoration: 'auto' },
    };

    viteServer = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    const docMod = await viteServer.ssrLoadModule(
      './src/components/PollutantDocumentary/PollutantDocumentary.jsx'
    );
    PollutantDocumentary = docMod.default;

    const barMod = await viteServer.ssrLoadModule(
      './src/components/PollutantDocumentary/CaseDossierBar.jsx'
    );
    CaseDossierBar = barMod.default;

    const bandMod = await viteServer.ssrLoadModule(
      './src/components/PollutantDocumentary/wmd/WmdCoverageBand.jsx'
    );
    WmdCoverageBand = bandMod.default;
  });

  after(async () => {
    if (viteServer) {
      await viteServer.close();
    }
  });

  it('1. verifies that PollutantDocumentary renders the Case Dossier sticky bar within the wrapper', () => {
    const html = renderToString(
      React.createElement(PollutantDocumentary, { pollutantId: 'pm10' })
    );

    assert.ok(
      html.includes('id="documentary-case-dossier-wrapper"'),
      'Must render documentary-case-dossier-wrapper'
    );
    assert.ok(
      html.includes('id="documentary-case-dossier-bar"'),
      'Must render documentary-case-dossier-bar'
    );
    assert.ok(
      html.includes('documentary-pinned-top-ribbon'),
      'Must maintain documentary-pinned-top-ribbon class for aesthetics and styling'
    );
  });

  it('2. verifies that CaseDossierBar contains interactive buttons for all four phases', () => {
    const html = renderToString(
      React.createElement(CaseDossierBar, {
        pollutantData: { symbol: 'PM10' },
      })
    );

    assert.ok(html.includes('01'), 'Must include 01');
    assert.ok(html.includes('SOURCE'), 'Must include SOURCE');
    assert.ok(html.includes('02'), 'Must include 02');
    assert.ok(html.includes('MOVEMENT'), 'Must include MOVEMENT');
    assert.ok(html.includes('03'), 'Must include 03');
    assert.ok(html.includes('EXPOSURE'), 'Must include EXPOSURE');
    assert.ok(html.includes('04'), 'Must include 04');
    assert.ok(html.includes('IMPACT'), 'Must include IMPACT');

    // Must be button elements
    assert.ok(html.includes('doc-ribbon-step-item'), 'Step items must exist');
    assert.ok(html.includes('doc-ribbon-tag-btn'), 'Tag must be interactive button');
    assert.ok(html.includes('doc-ribbon-spec-btn'), 'Spec must be interactive button');
  });

  it('3. verifies that WmdHeader does not contain window.location.search = \'?view=map\'', () => {
    const headerPath = path.resolve('src/components/PollutantDocumentary/wmd/WmdHeader.jsx');
    const content = fs.readFileSync(headerPath, 'utf-8');

    assert.ok(
      !content.includes("window.location.search = '?view=map'"),
      'Must NOT reload page on MAP click'
    );
    assert.ok(
      content.includes("scrollToSection('wmd-coverage-band')"),
      'MAP button must scroll to wmd-coverage-band'
    );
  });

  it('4. verifies that WmdCoverageBand contains #map scroll anchor', () => {
    const html = renderToString(
      React.createElement(WmdCoverageBand, { stations: [] })
    );

    assert.ok(html.includes('id="map"'), 'Must render id="map" scroll anchor for #map URLs');
  });

  it('5. verifies that PollutantDocumentary.css contains position: sticky and scroll-margin-top rules', () => {
    const cssPath = path.resolve('src/components/PollutantDocumentary/PollutantDocumentary.css');
    const content = fs.readFileSync(cssPath, 'utf-8');

    assert.ok(
      content.includes('.documentary-case-dossier-sticky-bar'),
      'Must style .documentary-case-dossier-sticky-bar'
    );
    assert.ok(
      content.includes('position: sticky'),
      'Must have position: sticky for dossier bar'
    );
    assert.ok(
      content.includes('scroll-margin-top:'),
      'Must have scroll-margin-top for anchor offset breathing room'
    );
  });
});
