/**
 * aboutPageVerification.test.js
 * Verification Test for Environmental Poster Sequence About Page
 * Redesigned to closely match the visual storytelling style of the air-pollution infographic
 */

import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import { POLLUTANT_DOCUMENTARY_LIST } from '../src/data/pollutantDocumentaries.js';

describe('VayuVitals Environmental Poster Redesign About Page Verification', () => {
  let viteServer;
  let AboutPage;

  before(async () => {
    viteServer = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    const aboutMod = await viteServer.ssrLoadModule(
      './src/components/About/AboutPage.jsx'
    );
    AboutPage = aboutMod.default;
  });

  after(async () => {
    if (viteServer) {
      await viteServer.close();
    }
  });

  it('1. AboutPage renders successfully without throwing errors', () => {
    const html = renderToString(
      React.createElement(AboutPage, {
        onBack: () => {},
        onSelectPollutant: () => {},
        onOpenDashboard: () => {},
      })
    );

    assert.ok(html.includes('about-page'), 'Should render root about-page container');
    assert.ok(html.includes('about-ambient-background'), 'Should render ambient background');
  });

  it('2. Section 01 (Hero) contains "THE AIR WE BREATHE.", supporting line, and back button', () => {
    const html = renderToString(
      React.createElement(AboutPage, {
        onBack: () => {},
        onSelectPollutant: () => {},
        onOpenDashboard: () => {},
      })
    );

    assert.ok(html.includes('THE AIR'), 'Hero must contain "THE AIR"');
    assert.ok(html.includes('WE BREATHE.'), 'Hero must contain "WE BREATHE."');
    assert.ok(html.includes('Every breath tells a story.'), 'Hero must include supporting line "Every breath tells a story."');
    assert.ok(html.includes('delhi_photochemical_smog.webp'), 'Hero must use atmospheric pollution photography');
    assert.ok(html.includes('about-back-button'), 'Hero must include top-left circular back button');
    assert.ok(html.includes('Scroll'), 'Hero must include minimal scroll indicator');
  });

  it('3. Section 02 (The Scale of the Problem) renders "DID YOU KNOW?", huge "76%", "Indians", fact, and CSE source attribution', () => {
    const html = renderToString(
      React.createElement(AboutPage, {
        onBack: () => {},
        onSelectPollutant: () => {},
        onOpenDashboard: () => {},
      })
    );

    assert.ok(html.includes('DID YOU KNOW?'), 'Section must contain "DID YOU KNOW?" matching reference infographic');
    assert.ok(html.includes('76%'), 'Section must feature massive 76% statistic');
    assert.ok(html.includes('Indians'), 'Section must feature "Indians" label');
    assert.ok(html.includes('do not meet national air quality standards.'), 'Must display verified environmental fact');
    assert.ok(html.includes('No Indian state achieves pollution levels at or below the WHO limits.'), 'Must display WHO context');
    assert.ok(html.includes('Source: CSE Report, 2019'), 'Must cite authoritative CSE source attribution');
    assert.ok(html.includes('billowing_smoke_infographic.jpg'), 'Must feature dramatic billowing smoke photographic background');
  });

  it('4. Section 03 (What We Breathe) showcases all 7 pollutants with large typography and documentary links', () => {
    const html = renderToString(
      React.createElement(AboutPage, {
        onBack: () => {},
        onSelectPollutant: () => {},
        onOpenDashboard: () => {},
      })
    );

    assert.ok(html.includes('WHAT WE BREATHE.'), 'Section headline must be "WHAT WE BREATHE."');
    const requiredPollutants = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3', 'nh3'];
    for (const polId of requiredPollutants) {
      assert.ok(html.includes(`aria-label="Open interactive documentary for`), 'Pollutant cards must have accessible aria-labels');
      const pollutantData = POLLUTANT_DOCUMENTARY_LIST.find((p) => p.id === polId);
      assert.ok(pollutantData, `Pollutant ${polId} must exist in data layer`);
      assert.ok(html.includes(pollutantData.name), `HTML must contain pollutant name: ${pollutantData.name}`);
      assert.ok(html.includes(pollutantData.symbol), `HTML must display chemical symbol for ${polId}`);
      assert.ok(html.includes(`NAAQS · ${pollutantData.naaqsLimit}`), `HTML must display authentic CPCB NAAQS limit for ${polId}`);
    }
  });

  it('5. Section 04 (The Invisible Threat) features the 3 short cinematic statements', () => {
    const html = renderToString(
      React.createElement(AboutPage, {
        onBack: () => {},
        onSelectPollutant: () => {},
        onOpenDashboard: () => {},
      })
    );

    assert.ok(html.includes('INVISIBLE DOESN&#x27;T MEAN HARMLESS.') || html.includes("INVISIBLE DOESN'T MEAN HARMLESS."), 'Statement 1: "INVISIBLE DOESN\'T MEAN HARMLESS."');
    assert.ok(html.includes('THE AIR CHANGES. EVERY DAY.'), 'Statement 2: "THE AIR CHANGES. EVERY DAY."');
    assert.ok(html.includes('WHAT YOU CAN MEASURE, YOU CAN UNDERSTAND.'), 'Statement 3: "WHAT YOU CAN MEASURE, YOU CAN UNDERSTAND."');
  });

  it('6. Section 05 (Why VayuVitals) presents MONITOR., UNDERSTAND., MAKE INFORMED DECISIONS. as visual compositions', () => {
    const html = renderToString(
      React.createElement(AboutPage, {
        onBack: () => {},
        onSelectPollutant: () => {},
        onOpenDashboard: () => {},
      })
    );

    assert.ok(html.includes('WHY VAYUVITALS.'), 'Section headline must be "WHY VAYUVITALS."');
    assert.ok(html.includes('MONITOR.'), 'Composition 01 must feature "MONITOR."');
    assert.ok(html.includes('about-map-mesh-visual'), 'Composition 01 must render air-quality map visual');
    assert.ok(html.includes('UNDERSTAND.'), 'Composition 02 must feature "UNDERSTAND."');
    assert.ok(html.includes('about-spectral-visual'), 'Composition 02 must render pollutant visualization');
    assert.ok(html.includes('MAKE INFORMED DECISIONS.'), 'Composition 03 must feature "MAKE INFORMED DECISIONS."');
    assert.ok(html.includes('about-trend-graph-visual'), 'Composition 03 must render environmental data and trends visual');
  });

  it('7. Section 06 (The Closing Frame) renders "THE FIRST STEP IS AWARENESS." and button "EXPLORE LIVE AIR"', () => {
    const html = renderToString(
      React.createElement(AboutPage, {
        onBack: () => {},
        onSelectPollutant: () => {},
        onOpenDashboard: () => {},
      })
    );

    assert.ok(html.includes('THE FIRST STEP'), 'Closing headline must contain "THE FIRST STEP"');
    assert.ok(html.includes('IS AWARENESS.'), 'Closing headline must contain "IS AWARENESS."');
    assert.ok(html.includes('Explore the air around you.'), 'Supporting line must read "Explore the air around you."');
    assert.ok(html.includes('EXPLORE LIVE AIR'), 'CTA button must read "EXPLORE LIVE AIR"');
    assert.strictEqual(html.includes('about-footer'), false, 'Footer section must be completely removed from About page');
  });
});
