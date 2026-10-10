/**
 * pollutantDocumentaryCleanliness.test.js
 *
 * Verifies that ALL SEVEN pollutant documentary pages:
 * 1. Have ZERO automotive configurator, dealership, or technical vehicle spec UI
 * 2. Keep the authentic Indian vehicle imagery as cinematic visual protagonists
 * 3. Preserve verified pollution measurements, NAAQS limits, and atmospheric behavior
 * 4. Are completely clean of configurator tabs, powertrain, displacement, and chassis mechanics
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { POLLUTANT_DOCUMENTARIES } from '../src/data/pollutantDocumentaries.js';

describe('Pollutant Documentary Pages - Configurator Cleanliness & Environmental Storytelling', () => {
  const TARGET_POLLUTANTS = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3', 'nh3'];
  const COMPONENT_DIR = path.resolve('src/components/PollutantDocumentary');
  const VEHICLE_ASSETS_DIR = path.resolve('public/assets/documentary/vehicles');

  it('1. verifies that all seven target pollutants exist in data registry', () => {
    for (const key of TARGET_POLLUTANTS) {
      assert.ok(POLLUTANT_DOCUMENTARIES[key], `Pollutant ${key} must exist`);
      assert.ok(POLLUTANT_DOCUMENTARIES[key].naaqsLimit > 0, `${key} must have valid NAAQS limit`);
      assert.ok(POLLUTANT_DOCUMENTARIES[key].unit, `${key} must have unit`);
      assert.ok(POLLUTANT_DOCUMENTARIES[key].atmosphericBehavior, `${key} must have atmospheric behavior`);
    }
  });

  it('2. verifies that obsolete VehicleShowcase.jsx has been deleted', () => {
    const showcasePath = path.join(COMPONENT_DIR, 'VehicleShowcase.jsx');
    assert.strictEqual(
      fs.existsSync(showcasePath),
      false,
      'VehicleShowcase.jsx must be deleted completely'
    );
  });

  it('3. verifies that all 7 authentic Indian vehicle images exist in public assets', () => {
    const expectedImages = [
      'indian_pm25_truck.webp',
      'indian_pm10_tipper.webp',
      'indian_no2_traffic.webp',
      'indian_so2_industrial.webp',
      'indian_co_underpass.webp',
      'indian_o3_sky.webp',
      'indian_nh3_tractor.webp',
    ];

    for (const img of expectedImages) {
      const fullPath = path.join(VEHICLE_ASSETS_DIR, img);
      assert.ok(fs.existsSync(fullPath), `Vehicle image ${img} must exist on disk`);
      const stat = fs.statSync(fullPath);
      assert.ok(stat.size > 10000, `Vehicle image ${img} must be non-empty image file`);
    }
  });

  it('4. verifies that PollutantDocumentary.jsx contains zero car configurator terminology', () => {
    const content = fs.readFileSync(path.join(COMPONENT_DIR, 'PollutantDocumentary.jsx'), 'utf-8');

    const forbiddenTerms = [
      'POWERTRAIN & CYCLE',
      'EXHAUST CLASS',
      'DISPLACEMENT // COMBUSTION',
      '5.9L Cummins',
      'Cummins 6BT',
      'Tata 2518',
      'Ashok Leyland 1618',
      'Mahindra 575 DI',
      'Multi-Axle Construction Tipper',
      'displacement:',
      'exhaustClass:',
      'horsepower',
      'gearbox',
      'drivetrain',
      'VehicleShowcase',
    ];

    for (const term of forbiddenTerms) {
      assert.ok(
        !content.includes(term),
        `PollutantDocumentary.jsx must not contain forbidden car-configurator term: "${term}"`
      );
    }
  });

  it('5. verifies that CinematicSourceExposure.jsx contains zero vehicle specification tabs', () => {
    const content = fs.readFileSync(path.join(COMPONENT_DIR, 'CinematicSourceExposure.jsx'), 'utf-8');

    assert.ok(content.includes('doc-source-exposure-section'), 'Must mount doc-source-exposure-section');
    assert.ok(content.includes('CONTINUOUS RECEPTOR OBSERVATION'), 'Must show continuous receptor observation');
    assert.ok(content.includes('CPCB 24-HR NAAQS STANDARD'), 'Must show CPCB NAAQS standard');
    assert.ok(content.includes('ATMOSPHERIC BEHAVIOR IN DELHI BASIN'), 'Must show verified atmospheric behavior');

    // Ensure zero configurator UI
    assert.ok(!content.includes('POWERTRAIN'), 'Must not contain POWERTRAIN');
    assert.ok(!content.includes('activeTab'), 'Must not have tabbed spec navigation');
    assert.ok(!content.includes('displacement'), 'Must not contain displacement');
    assert.ok(!content.includes('chassis'), 'Must not contain chassis specs');
  });

  it('6. verifies that VehicleHero.jsx communicates environmental emission context instead of car specs', () => {
    const content = fs.readFileSync(path.join(COMPONENT_DIR, 'VehicleHero.jsx'), 'utf-8');

    assert.ok(content.includes('EMISSION SOURCE CONTEXT'), 'Must display emission source context');
    assert.ok(content.includes('REGIONAL AIRSHED'), 'Must display regional airshed');
    assert.ok(content.includes('LIVE RECEPTOR VALUE'), 'Must display live receptor value');

    // Forbidden vehicle spec elements
    assert.ok(!content.includes('vehicle-spec-card'), 'Must not have vehicle-spec-card');
    assert.ok(!content.includes('vehicleProfile.vehicleName'), 'Must not display vehicle model name');
    assert.ok(!content.includes('vehicleProfile.vehicleCategory'), 'Must not display vehicle classification');
  });

  it('7. verifies that PinnedScrollStory.jsx has removed vehicle classification ribbon', () => {
    const content = fs.readFileSync(path.join(COMPONENT_DIR, 'PinnedScrollStory.jsx'), 'utf-8');

    assert.ok(!content.includes('vehicleProfile.vehicleCategory'), 'Must not render vehicleCategory');
    assert.ok(content.includes('OBSERVATION EVIDENCE // DELHI NCR'), 'Must render observation evidence tag');
  });

  it('8. verifies that PollutantDocumentary.css contains zero configurator tab styles', () => {
    const css = fs.readFileSync(path.join(COMPONENT_DIR, 'PollutantDocumentary.css'), 'utf-8');

    assert.ok(!css.includes('.specs-nav-tabs'), 'Must not contain .specs-nav-tabs');
    assert.ok(!css.includes('.spec-tab-btn'), 'Must not contain .spec-tab-btn');
    assert.ok(!css.includes('.spec-atelier-footer'), 'Must not contain .spec-atelier-footer');
    assert.ok(css.includes('.doc-source-exposure-section'), 'Must contain .doc-source-exposure-section');
    assert.ok(css.includes('.exposure-body-grid'), 'Must contain .exposure-body-grid');
    assert.ok(css.includes('.exposure-behavior-box'), 'Must contain .exposure-behavior-box');
  });

  it('9. verifies that hero vignette is significantly reduced and photographs remain bright', () => {
    const css = fs.readFileSync(path.join(COMPONENT_DIR, 'PollutantDocumentary.css'), 'utf-8');

    // Hero image filter must maintain natural brightness (not darkened down to 0.82)
    assert.ok(css.includes('brightness(0.98)'), 'Hero vehicle image must retain natural high brightness (~0.98)');
    assert.ok(!css.includes('brightness(0.82)'), 'Must not heavily dim raw photograph brightness to 0.82');

    // Scrim must be directional without heavy 0.75-0.98 viewport-wide blackouts
    assert.ok(!css.includes('rgba(6, 8, 13, 0.75) 0%'), 'Must not have 75% black overlay at top of scrim');
    assert.ok(!css.includes('rgba(6, 8, 13, 0.98) 100%'), 'Must not have 98% black overlay at bottom of scrim');
    assert.ok(css.includes('transparent 80%'), 'Scrim must fall off horizontally to transparent over the vehicle area');

    // Road depth gradient must be subtle, not a 35% tall opaque black wall
    assert.ok(!css.includes('height: 35%'), 'Road gradient must not consume 35% of the viewport');
    assert.ok(css.includes('height: 18%'), 'Road gradient must be reduced to subtle 18% height');
  });

  it('10. verifies that documentary navigation enforces instant scroll reset to top (scrollY = 0)', () => {
    const appContent = fs.readFileSync(path.resolve('src/App.jsx'), 'utf-8');
    const docContent = fs.readFileSync(path.join(COMPONENT_DIR, 'PollutantDocumentary.jsx'), 'utf-8');
    const animContent = fs.readFileSync(path.join(COMPONENT_DIR, 'documentaryAnimations.js'), 'utf-8');

    // App.jsx must use instant scrollTo when opening documentary
    assert.ok(
      appContent.includes("window.scrollTo({ top: 0, left: 0, behavior: 'instant' })"),
      'App.jsx must use instant scrollTo(0,0) when opening documentary'
    );

    // PollutantDocumentary must manage history scrollRestoration and reset in useLayoutEffect
    assert.ok(
      docContent.includes("window.history.scrollRestoration = 'manual'"),
      'PollutantDocumentary must set scrollRestoration to manual'
    );
    assert.ok(
      docContent.includes('useLayoutEffect'),
      'PollutantDocumentary must use useLayoutEffect for synchronous scroll reset'
    );

    // documentaryAnimations must clear scroll memory and reset scroll before ScrollTrigger measures
    assert.ok(
      animContent.includes('ScrollTrigger.clearScrollMemory()'),
      'documentaryAnimations must clear ScrollTrigger scroll memory'
    );
    assert.ok(
      animContent.includes("behavior: 'instant'"),
      'documentaryAnimations must enforce instant scroll reset'
    );
  });
});
