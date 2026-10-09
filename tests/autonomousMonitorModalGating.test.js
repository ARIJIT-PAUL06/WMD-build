/**
 * tests/autonomousMonitorModalGating.test.js
 * Verification of Autonomous Monitor modal manual dispatch gating in production (A7).
 * Strictly adheres to AGENTS.md zero-faking directive and Cognito Fix Plan v2.
 */

import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

import express from 'express';
import monitorRoutes from '../server/routes/monitorRoutes.js';

describe('Autonomous Monitor Modal Button Gating (A7)', () => {
  let viteServer;
  let MonitorStatusTab;
  let MonitorPillar1Tab;
  let MonitorPillar2Tab;
  let MonitorPillar3Tab;

  before(async () => {
    viteServer = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    const statusMod = await viteServer.ssrLoadModule('./src/components/Dashboard/MonitorStatusTab.jsx');
    MonitorStatusTab = statusMod.default;

    const p1Mod = await viteServer.ssrLoadModule('./src/components/Dashboard/MonitorPillar1Tab.jsx');
    MonitorPillar1Tab = p1Mod.default;

    const p2Mod = await viteServer.ssrLoadModule('./src/components/Dashboard/MonitorPillar2Tab.jsx');
    MonitorPillar2Tab = p2Mod.default;

    const p3Mod = await viteServer.ssrLoadModule('./src/components/Dashboard/MonitorPillar3Tab.jsx');
    MonitorPillar3Tab = p3Mod.default;
  });

  after(async () => {
    if (viteServer) {
      await viteServer.close();
    }
  });

  it('1. GET /api/monitor/status returns httpDispatchEnabled based on NODE_ENV', async () => {
    const app = express();
    app.use(monitorRoutes);

    // Test in non-production
    const oldEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'development';
      const server = app.listen(0);
      const port = server.address().port;
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/monitor/status`);
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.success, true);
        assert.strictEqual(data.httpDispatchEnabled, true);
      } finally {
        server.close();
      }

      // Test in production
      process.env.NODE_ENV = 'production';
      const prodServer = app.listen(0);
      const prodPort = prodServer.address().port;
      try {
        const resProd = await fetch(`http://127.0.0.1:${prodPort}/api/monitor/status`);
        assert.strictEqual(resProd.status, 200);
        const prodData = await resProd.json();
        assert.strictEqual(prodData.success, true);
        assert.strictEqual(prodData.httpDispatchEnabled, false);
      } finally {
        prodServer.close();
      }
    } finally {
      process.env.NODE_ENV = oldEnv;
    }
  });

  it('2. When httpDispatchEnabled is false, no dispatch buttons render across all tabs and production notice is shown', () => {
    const notice = 'Monitoring runs automatically every 30 minutes (Amazon EventBridge). Manual dispatch is disabled in production.';

    // Status Tab
    const statusHtml = renderToString(
      React.createElement(MonitorStatusTab, {
        daemonStatus: {},
        setActiveTab: () => {},
        handleRunFullCycle: () => {},
        cycleLoading: false,
        handleClearDebounces: () => {},
        cycleReport: null,
        httpDispatchEnabled: false
      })
    );
    assert.strictEqual(statusHtml.includes('Run Full Autonomous Cycle Now'), false);
    assert.strictEqual(statusHtml.includes('Clear Cooldowns'), false);
    assert.ok(statusHtml.includes(notice));

    // Pillar 1 Tab
    const p1Html = renderToString(
      React.createElement(MonitorPillar1Tab, {
        p1Search: '',
        setP1Search: () => {},
        p1FacilityId: 'dps_rk_puram',
        setP1FacilityId: () => {},
        filteredFacilities: [],
        p1Scenario: 'hazardous',
        setP1Scenario: () => {},
        p1SimulatedPm25: 245,
        setP1SimulatedPm25: () => {},
        selectedFacility: { name: 'DPS', gridId: 'GRID_R03_C05' },
        handleTestPillar1: () => {},
        p1Loading: false,
        p1Result: null,
        httpDispatchEnabled: false
      })
    );
    assert.strictEqual(p1Html.includes('Evaluate &amp; Test Morning Advisory') || p1Html.includes('Evaluate & Test Morning Advisory'), false);
    assert.ok(p1Html.includes(notice));

    // Pillar 2 Tab
    const p2Html = renderToString(
      React.createElement(MonitorPillar2Tab, {
        p2GridId: 'GRID_R03_C05',
        setP2GridId: () => {},
        grids: [],
        p2CurrentPm25: 265,
        setP2CurrentPm25: () => {},
        facilitiesInP2Grid: [],
        p2IgnoreDebounce: true,
        setP2IgnoreDebounce: () => {},
        handleTestPillar2: () => {},
        p2Loading: false,
        p2Result: null,
        httpDispatchEnabled: false
      })
    );
    assert.strictEqual(p2Html.includes('Trigger Block Emergency Surge'), false);
    assert.ok(p2Html.includes(notice));

    // Pillar 3 Tab
    const p3Html = renderToString(
      React.createElement(MonitorPillar3Tab, {
        p3GridId: 'GRID_R03_C05',
        setP3GridId: () => {},
        grids: [],
        p3Compliance: null,
        p3ForcePetition: true,
        setP3ForcePetition: () => {},
        handleTestPillar3: () => {},
        p3Loading: false,
        p3Result: null,
        httpDispatchEnabled: false
      })
    );
    assert.strictEqual(p3Html.includes('Dispatch Section 10 Legal Notice'), false);
    assert.ok(p3Html.includes(notice));
  });

  it('3. When httpDispatchEnabled is true, manual testbench buttons render normally', () => {
    // Status Tab
    const statusHtml = renderToString(
      React.createElement(MonitorStatusTab, {
        daemonStatus: {},
        setActiveTab: () => {},
        handleRunFullCycle: () => {},
        cycleLoading: false,
        handleClearDebounces: () => {},
        cycleReport: null,
        httpDispatchEnabled: true
      })
    );
    assert.ok(statusHtml.includes('Run Full Autonomous Cycle Now'));
    assert.ok(statusHtml.includes('Clear Cooldowns'));

    // Pillar 1 Tab
    const p1Html = renderToString(
      React.createElement(MonitorPillar1Tab, {
        p1Search: '',
        setP1Search: () => {},
        p1FacilityId: 'dps_rk_puram',
        setP1FacilityId: () => {},
        filteredFacilities: [],
        p1Scenario: 'hazardous',
        setP1Scenario: () => {},
        p1SimulatedPm25: 245,
        setP1SimulatedPm25: () => {},
        selectedFacility: { name: 'DPS', gridId: 'GRID_R03_C05' },
        handleTestPillar1: () => {},
        p1Loading: false,
        p1Result: null,
        httpDispatchEnabled: true
      })
    );
    assert.ok(p1Html.includes('Evaluate &amp; Test Morning Advisory') || p1Html.includes('Evaluate & Test Morning Advisory'));

    // Pillar 2 Tab
    const p2Html = renderToString(
      React.createElement(MonitorPillar2Tab, {
        p2GridId: 'GRID_R03_C05',
        setP2GridId: () => {},
        grids: [],
        p2CurrentPm25: 265,
        setP2CurrentPm25: () => {},
        facilitiesInP2Grid: [],
        p2IgnoreDebounce: true,
        setP2IgnoreDebounce: () => {},
        handleTestPillar2: () => {},
        p2Loading: false,
        p2Result: null,
        httpDispatchEnabled: true
      })
    );
    assert.ok(p2Html.includes('Trigger Block Emergency Surge'));

    // Pillar 3 Tab
    const p3Html = renderToString(
      React.createElement(MonitorPillar3Tab, {
        p3GridId: 'GRID_R03_C05',
        setP3GridId: () => {},
        grids: [],
        p3Compliance: null,
        p3ForcePetition: true,
        setP3ForcePetition: () => {},
        handleTestPillar3: () => {},
        p3Loading: false,
        p3Result: null,
        httpDispatchEnabled: true
      })
    );
    assert.ok(p3Html.includes('Dispatch Section 10 Legal Notice'));
  });
});
