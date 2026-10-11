/**
 * appFooterVerification.test.js
 * Comprehensive Verification Test for Shared VayuVitals Environmental Intelligence Footer
 */

import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

describe('VayuVitals Shared Environmental Intelligence Footer Verification', () => {
  let viteServer;
  let AppFooter;
  let AboutPage;
  let StatsPage;

  before(async () => {
    viteServer = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    const footerMod = await viteServer.ssrLoadModule(
      './src/components/Footer/AppFooter.jsx'
    );
    AppFooter = footerMod.default;

    const aboutMod = await viteServer.ssrLoadModule(
      './src/components/About/AboutPage.jsx'
    );
    AboutPage = aboutMod.default;

    const statsMod = await viteServer.ssrLoadModule(
      './src/components/Stats/StatsPage.jsx'
    );
    StatsPage = statsMod.default;
  });

  after(async () => {
    if (viteServer) {
      await viteServer.close();
    }
  });

  it('1. AppFooter renders successfully without errors', () => {
    const html = renderToString(
      React.createElement(AppFooter, {
        onHome: () => {},
        onMap: () => {},
        onPollutants: () => {},
        onStats: () => {},
        onAbout: () => {},
        onBackToCargo: () => {},
      })
    );

    assert.ok(html.includes('vayu-footer'), 'Must render root .vayu-footer container');
    assert.ok(html.includes('vayu-footer__container'), 'Must render .vayu-footer__container');
  });

  it('2. Solid Black (#000000) background without active mountain imagery or gradients', () => {
    const cssPath = path.resolve('src/components/Footer/AppFooter.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    assert.ok(css.includes('#000000'), 'Must set solid black #000000 background');
    assert.ok(css.includes('display: none !important'), 'Backdrop and vignette overlays must be disabled');
  });

  it('3. Renders Left Side branding, uppercase tagline, and corner-bracket supporting statement', () => {
    const html = renderToString(React.createElement(AppFooter));

    assert.ok(html.includes('VayuVitals'), 'Must display VayuVitals brand logo');
    assert.ok(html.includes('ENVIRONMENTAL INTELLIGENCE'), 'Must display ENVIRONMENTAL INTELLIGENCE tagline');
    assert.ok(html.includes('THE AIR'), 'Must include "THE AIR" in supporting statement');
    assert.ok(html.includes('WE BREATHE'), 'Must include "WE BREATHE" in supporting statement');
    assert.ok(html.includes('SHAPES TOMORROW.'), 'Must include "SHAPES TOMORROW." in supporting statement');
    assert.ok(html.includes('vayu-footer__lines-accent'), 'Must render corner hairline accent container');
    assert.ok(html.includes('vayu-footer__line-horiz'), 'Must render horizontal corner hairline');
    assert.ok(html.includes('vayu-footer__line-vert'), 'Must render vertical corner hairline');
  });

  it('4. Renders all 5 Left Sidebar navigation destinations with exact labels', () => {
    const html = renderToString(React.createElement(AppFooter));

    assert.ok(html.includes('id="app-footer-nav-home"'), 'Must render Home navigation link');
    assert.ok(html.includes('Home'), 'Must display "Home" label');

    assert.ok(html.includes('id="app-footer-nav-map"'), 'Must render Live AQI Map navigation link');
    assert.ok(html.includes('Live AQI Map'), 'Must display "Live AQI Map" label');

    assert.ok(html.includes('id="app-footer-nav-pollutants"'), 'Must render Pollutants navigation link');
    assert.ok(html.includes('Pollutants'), 'Must display "Pollutants" label');

    assert.ok(html.includes('id="app-footer-nav-stats"'), 'Must render Statistics navigation link');
    assert.ok(html.includes('Statistics'), 'Must display "Statistics" label');

    assert.ok(html.includes('id="app-footer-nav-about"'), 'Must render About navigation link');
    assert.ok(html.includes('About'), 'Must display "About" label');
  });

  it('5. Renders Right Side italic quote and Back to Atmospheric Cargo button', () => {
    const html = renderToString(React.createElement(AppFooter));

    assert.ok(html.includes('KNOWLEDGE TODAY.'), 'Must display "KNOWLEDGE TODAY."');
    assert.ok(html.includes('A SAFER TOMORROW.'), 'Must display "A SAFER TOMORROW."');
    assert.ok(html.includes('id="doc-back-cargo-btn"'), 'Must render Atmospheric Cargo button');
    assert.ok(html.includes('Back to Atmospheric Cargo'), 'Must render "Back to Atmospheric Cargo" CTA text');
    assert.ok(html.includes('id="doc-return-to-story-cta"'), 'Must maintain CTA span ID for test compatibility');
  });

  it('6. Synchronizes active navigation state with currentRoute prop', () => {
    const html = renderToString(
      React.createElement(AppFooter, {
        currentRoute: 'statistics',
      })
    );

    assert.ok(
      html.includes('id="app-footer-nav-stats"') && html.includes('active'),
      'Statistics link must be active when currentRoute is statistics'
    );
  });

  it('7. CSS specifies compact 1250px container width and bounded desktop height (~75px, 50% reduction)', () => {
    const cssPath = path.resolve('src/components/Footer/AppFooter.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    assert.ok(css.includes('max-width: 1250px'), 'Content container width must be 1250px');
    assert.ok(css.includes('margin: 0 auto'), 'Container must be centered horizontally');
    assert.ok(css.includes('height: 75px'), 'Desktop height must be compact 75px (50% reduction)');
    assert.ok(!css.includes('height: 100vh'), 'Footer must not use 100vh height');
    assert.ok(css.includes('prefers-reduced-motion'), 'Must support prefers-reduced-motion');
  });

  it('8. AboutPage renders the shared VayuVitals footer exactly once', () => {
    const html = renderToString(
      React.createElement(AboutPage, {
        onBack: () => {},
        onSelectPollutant: () => {},
        onOpenDashboard: () => {},
      })
    );

    const matches = (html.match(/id="app-footer"/g) || []).length;
    assert.strictEqual(matches, 1, 'AboutPage must render AppFooter exactly once');
    assert.ok(html.includes('vayu-footer'), 'AboutPage must contain vayu-footer');
  });

  it('9. StatsPage renders the shared VayuVitals footer exactly once', () => {
    const html = renderToString(
      React.createElement(StatsPage, {
        onBack: () => {},
        onOpenDashboard: () => {},
      })
    );

    const matches = (html.match(/id="app-footer"/g) || []).length;
    assert.strictEqual(matches, 1, 'StatsPage must render AppFooter exactly once');
    assert.ok(html.includes('vayu-footer'), 'StatsPage must contain vayu-footer');
  });

  it('10. AwsServicesPage renders the shared VayuVitals footer exactly once', async () => {
    const awsMod = await viteServer.ssrLoadModule(
      './src/components/AwsServices/AwsServicesPage.jsx'
    );
    const AwsServicesPage = awsMod.default;

    const html = renderToString(
      React.createElement(AwsServicesPage, {
        onBack: () => {},
        onOpenDashboard: () => {},
      })
    );

    const matches = (html.match(/id="app-footer"/g) || []).length;
    assert.strictEqual(matches, 1, 'AwsServicesPage must render AppFooter exactly once');
    assert.ok(html.includes('vayu-footer'), 'AwsServicesPage must contain vayu-footer');
  });
});
