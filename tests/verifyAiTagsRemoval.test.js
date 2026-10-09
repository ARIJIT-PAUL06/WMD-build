import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

describe('AI Tags Removal Verification', () => {
  let viteServer;
  let PanoramicScrollHero;
  let AtmosphericCargoTruck;

  before(async () => {
    viteServer = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    const heroMod = await viteServer.ssrLoadModule('./src/components/MotionHero/PanoramicScrollHero.jsx');
    PanoramicScrollHero = heroMod.default;

    const truckMod = await viteServer.ssrLoadModule('./src/components/CargoTruck/AtmosphericCargoTruck.jsx');
    AtmosphericCargoTruck = truckMod.default;
  });

  after(async () => {
    if (viteServer) {
      await viteServer.close();
    }
  });

  it('verifies hero section has removed 108 CAAQMS STATIONS and AIRSHED: WINTER INVERSION pills', () => {
    const heroHtml = renderToString(React.createElement(PanoramicScrollHero));

    assert.equal(heroHtml.includes('CAAQMS STATIONS'), false, '108 CAAQMS STATIONS tag must be removed');
    assert.equal(heroHtml.includes('WINTER INVERSION'), false, 'WINTER INVERSION tag must be removed');
    assert.equal(heroHtml.includes('AIRSHED:'), false, 'AIRSHED tag must be removed');
    assert.equal(heroHtml.includes('hero-hud-pill'), false, 'hero-hud-pill classes must be removed');
    assert.equal(heroHtml.includes('hero-hud-telemetry-cluster'), false, 'hero-hud-telemetry-cluster must be removed');
    assert.equal(heroHtml.includes('VAYUVITALS'), true, 'VAYUVITALS brand must remain intact');
  });

  it('verifies cargo truck section has removed telemetry HUD cards and active inspector card', () => {
    const truckHtml = renderToString(React.createElement(AtmosphericCargoTruck));

    assert.equal(truckHtml.includes('Gross Payload Mass'), false, 'Gross Payload Mass must be removed');
    assert.equal(truckHtml.includes('Trailer Load'), false, 'Trailer Load must be removed');
    assert.equal(truckHtml.includes('Dominant Hazard'), false, 'Dominant Hazard must be removed');
    assert.equal(truckHtml.includes('cargo-telemetry-hud'), false, 'cargo-telemetry-hud must be removed');
    assert.equal(truckHtml.includes('SELECTED CRATE CONCENTRATION'), false, 'SELECTED CRATE CONCENTRATION must be removed');
    assert.equal(truckHtml.includes('TARGET PHYSIOLOGICAL SYSTEMS'), false, 'TARGET PHYSIOLOGICAL SYSTEMS must be removed');
    assert.equal(truckHtml.includes('Primary Airshed Vector'), false, 'Primary Airshed Vector must be removed');
    assert.equal(truckHtml.includes('cargo-active-inspector-card'), false, 'cargo-active-inspector-card must be removed');

    // Confirm truck & containers remain intact
    assert.equal(truckHtml.includes('id="atmospheric-cargo-truck-interactive"'), true, 'Truck interactive viewport must remain');
    assert.equal(truckHtml.includes('cargo-container-pm25'), true, 'PM 2.5 container must remain');
  });
});
