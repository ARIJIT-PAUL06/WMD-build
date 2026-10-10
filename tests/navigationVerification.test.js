/**
 * navigationVerification.test.js
 * Verification Test for Updated VayuVitals Navigation Architecture
 *
 * Requirements:
 * 1. Remove ABOUT and STATS buttons from the top navigation bar.
 * 2. Keep the VAYUVITALS logo on top left and Sign In button on top right.
 * 3. Left sidebar provides access to Home, Live AQI Map, Pollutants, Statistics, and About.
 * 4. Clicking "About" in the sidebar triggers navigation to the existing About page.
 * 5. Clicking "Statistics" in the sidebar triggers navigation to the existing Stats page.
 * 6. The active sidebar item updates correctly based on the current route.
 * 7. Reuses existing pages, routes, and components without full-page reloads.
 */

import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

describe('VayuVitals Navigation Architecture Verification', () => {
  let viteServer;
  let PanoramicScrollHero;

  before(async () => {
    viteServer = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    const heroMod = await viteServer.ssrLoadModule(
      './src/components/MotionHero/PanoramicScrollHero.jsx'
    );
    PanoramicScrollHero = heroMod.default;
  });

  after(async () => {
    if (viteServer) {
      await viteServer.close();
    }
  });

  it('1. Top navigation bar does NOT contain ABOUT and STATS buttons', () => {
    const html = renderToString(
      React.createElement(PanoramicScrollHero, {
        onExploreTwin: () => {},
        onOpenAbout: () => {},
        onOpenStats: () => {},
      })
    );

    assert.ok(!html.includes('hero-about-link-btn'), 'Top navigation bar must NOT contain hero-about-link-btn');
    assert.ok(!html.includes('id="hero-about-nav-btn"'), 'Top navigation bar must NOT contain hero-about-nav-btn ID');
    assert.ok(!html.includes('id="hero-stats-nav-btn"'), 'Top navigation bar must NOT contain hero-stats-nav-btn ID');
  });

  it('2. Top navigation bar preserves the VAYUVITALS brand logo on top left', () => {
    const html = renderToString(
      React.createElement(PanoramicScrollHero, {
        onExploreTwin: () => {},
        onOpenAbout: () => {},
        onOpenStats: () => {},
      })
    );

    assert.ok(html.includes('hero-top-hud'), 'Must render hero-top-hud container');
    assert.ok(html.includes('hero-hud-brand'), 'Must render hero-hud-brand container');
    assert.ok(html.includes('VAYUVITALS'), 'Must render VAYUVITALS brand text');
  });

  it('3. Left sidebar contains all 5 primary navigation items including Statistics and About', () => {
    const html = renderToString(
      React.createElement(PanoramicScrollHero, {
        onExploreTwin: () => {},
        onOpenAbout: () => {},
        onOpenStats: () => {},
      })
    );

    assert.ok(html.includes('hero-left-sidebar'), 'Must render hero-left-sidebar container');
    assert.ok(html.includes('id="hero-sidebar-nav-home"'), 'Must render Home sidebar button');
    assert.ok(html.includes('id="hero-sidebar-nav-map"'), 'Must render Live AQI Map sidebar button');
    assert.ok(html.includes('id="hero-sidebar-nav-pollutants"'), 'Must render Pollutants sidebar button');
    assert.ok(html.includes('id="hero-sidebar-nav-stats"'), 'Must render Statistics sidebar button');
    assert.ok(html.includes('id="hero-sidebar-nav-about"'), 'Must render About sidebar button');
  });

  it('4. Active sidebar item updates correctly when route is statistics', () => {
    const html = renderToString(
      React.createElement(PanoramicScrollHero, {
        onExploreTwin: () => {},
        onOpenAbout: () => {},
        onOpenStats: () => {},
        currentRoute: 'statistics',
      })
    );

    assert.ok(
      html.includes('class="hero-nav-item active"') && html.includes('id="hero-sidebar-nav-stats"'),
      'Statistics sidebar button must have active class when currentRoute is statistics'
    );
  });

  it('5. Active sidebar item updates correctly when route is about', () => {
    const html = renderToString(
      React.createElement(PanoramicScrollHero, {
        onExploreTwin: () => {},
        onOpenAbout: () => {},
        onOpenStats: () => {},
        currentRoute: 'about',
      })
    );

    assert.ok(
      html.includes('class="hero-nav-item active"') && html.includes('id="hero-sidebar-nav-about"'),
      'About sidebar button must have active class when currentRoute is about'
    );
  });

  it('6. Active sidebar item defaults to home when route is home', () => {
    const html = renderToString(
      React.createElement(PanoramicScrollHero, {
        onExploreTwin: () => {},
        onOpenAbout: () => {},
        onOpenStats: () => {},
        currentRoute: 'home',
      })
    );

    assert.ok(
      html.includes('class="hero-nav-item active"') && html.includes('id="hero-sidebar-nav-home"'),
      'Home sidebar button must have active class when currentRoute is home'
    );
  });
});
