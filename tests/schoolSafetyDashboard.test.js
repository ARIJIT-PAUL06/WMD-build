/**
 * Focused Component Tests for SchoolSafetyDashboard (Phase 3)
 *
 * Verifies all required UI states and behaviors:
 * 1. School selector rendering with predefined schools and custom option
 * 2. Loading state (skeleton, spinner, aria-live)
 * 3. Error state (error message, retry callback)
 * 4. Insufficient-data state (informative notice, no fabricated data)
 * 5. GO / MODIFY / INDOORS status rendering & mapping (MODIFY_STRICT -> MODIFY)
 * 6. Best outdoor window rendering (available vs unavailable)
 * 7. Modeling rule verification (Estimated around school, no "measured at school")
 * 8. Mobile-safe and accessible layout structure
 */

import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

describe('School Safety Dashboard - Phase 3 Component Tests', () => {
  let viteServer;
  let SchoolSafetyDashboard;
  let mapUserFacingStatus;

  before(async () => {
    // Spin up Vite SSR runtime to compile JSX and load the dashboard component
    viteServer = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    const mod = await viteServer.ssrLoadModule(
      './src/components/SchoolSafety/SchoolSafetyDashboard.jsx'
    );
    SchoolSafetyDashboard = mod.default;
    mapUserFacingStatus = mod.mapUserFacingStatus;
  });

  after(async () => {
    if (viteServer) {
      await viteServer.close();
    }
  });

  // ==========================================================================
  // 1. Status Mapping Verification
  // ==========================================================================
  describe('1. mapUserFacingStatus Mapping', () => {
    it('maps statuses strictly per Phase 3 rules', () => {
      assert.strictEqual(mapUserFacingStatus('GO'), 'GO');
      assert.strictEqual(mapUserFacingStatus('MODIFY'), 'MODIFY');
      assert.strictEqual(mapUserFacingStatus('MODIFY_STRICT'), 'MODIFY');
      assert.strictEqual(mapUserFacingStatus('INDOORS'), 'INDOORS');
      assert.strictEqual(mapUserFacingStatus('INSUFFICIENT_DATA'), 'INSUFFICIENT DATA');
      assert.strictEqual(mapUserFacingStatus(null), 'INSUFFICIENT DATA');
    });
  });

  // ==========================================================================
  // 2. School Selector Rendering
  // ==========================================================================
  describe('2. School Selector Rendering', () => {
    it('renders the school selector dropdown with predefined Delhi institutions', () => {
      const html = renderToString(React.createElement(SchoolSafetyDashboard));

      assert.ok(html.includes('id="school-selector"'), 'Must have school selector select element');
      assert.ok(html.includes('Delhi Public School, Rohini'), 'Must include DPS Rohini');
      assert.ok(html.includes('Modern School, Barakhamba Road'), 'Must include Modern School');
      assert.ok(html.includes('DAV Public School, Shreshtha Vihar'), 'Must include DAV');
      assert.ok(html.includes('Indian Institute of Technology (IIT) Delhi'), 'Must include IIT Delhi');
      assert.ok(html.includes('+ Enter Custom School / Campus...'), 'Must include custom school option');
    });

    it('renders selected school profile metadata pills', () => {
      const html = renderToString(
        React.createElement(SchoolSafetyDashboard, {
          selectedSchoolId: 'modern_barakhamba',
        })
      );

      assert.ok(html.includes('Barakhamba Road, Connaught Place'));
      assert.ok(html.includes('Hours: 07:45 - 14:00'));
      assert.ok(html.includes('2,900 Students'));
      assert.ok(html.includes('Mandir Marg'));
    });
  });

  // ==========================================================================
  // 3. Loading State Rendering
  // ==========================================================================
  describe('3. Loading State Rendering', () => {
    it('renders accessible loading skeleton when loading is true', () => {
      const html = renderToString(
        React.createElement(SchoolSafetyDashboard, {
          loading: true,
        })
      );

      assert.ok(html.includes('ssd-loading-container'), 'Must render loading container');
      assert.ok(html.includes('role="status"'), 'Must have accessible role=status');
      assert.ok(html.includes('aria-live="polite"'), 'Must have polite aria-live');
      assert.ok(html.includes('Loading campus environmental intelligence...'), 'Must render loading label');
      assert.ok(html.includes('ssd-skeleton-card'), 'Must render skeleton placeholders');
      // Main dashboard elements should not be rendered while loading
      assert.ok(!html.includes('Scheduled Activity Windows'), 'Must not render dashboard contents while loading');
    });
  });

  // ==========================================================================
  // 4. Error State Rendering
  // ==========================================================================
  describe('4. Error State Rendering', () => {
    it('renders clear error message and retry button when error is present', () => {
      const html = renderToString(
        React.createElement(SchoolSafetyDashboard, {
          error: 'Connection to monitoring stations timed out',
          onRetry: () => {},
        })
      );

      assert.ok(html.includes('ssd-error-container'), 'Must render error container');
      assert.ok(html.includes('role="alert"'), 'Must have accessible alert role');
      assert.ok(html.includes('Unable to load School Safety data'), 'Must render error header');
      assert.ok(html.includes('Connection to monitoring stations timed out'), 'Must render error message');
      assert.ok(html.includes('Retry'), 'Must render retry button');
    });
  });

  // ==========================================================================
  // 5. Insufficient Data State Rendering
  // ==========================================================================
  describe('5. Insufficient Data State Rendering', () => {
    it('renders insufficient data warning and unavailable window without fabricating values', () => {
      const html = renderToString(
        React.createElement(SchoolSafetyDashboard, {
          overallVerdict: {
            verdict: 'INSUFFICIENT_DATA',
            severity: 0,
            summary: 'Insufficient monitoring data in campus vicinity.',
          },
          schoolEstimate: {
            pm25: null,
            stationCount: 0,
            confidence: 'INSUFFICIENT',
          },
          bestOutdoorWindow: {
            found: false,
            reason: 'Insufficient continuous data points to cover requested duration.',
          },
        })
      );

      assert.ok(html.includes('INSUFFICIENT DATA'), 'Must render user-facing status tag INSUFFICIENT DATA');
      assert.ok(html.includes('Insufficient Regulatory Monitoring Telemetry'), 'Must render telemetry warning banner');
      assert.ok(html.includes('Best window unavailable'), 'Must indicate window is unavailable');
      assert.ok(html.includes('Insufficient continuous data points'), 'Must render exact explanation');
      assert.ok(html.includes('--'), 'Must show placeholder for missing PM2.5 rather than fabricated number');
    });
  });

  // ==========================================================================
  // 6. GO / MODIFY / INDOORS Verdict Rendering & Presentation Mapping
  // ==========================================================================
  describe('6. Verdict Rendering & Presentation Mapping', () => {
    it('renders GO status with green indicator and standard operational guidance', () => {
      const html = renderToString(
        React.createElement(SchoolSafetyDashboard, {
          overallVerdict: {
            verdict: 'GO',
            severity: 1,
            summary: 'All activity windows within operational baseline (≤ 60 µg/m³).',
          },
          schoolEstimate: {
            pm25: 48.0,
            confidence: 'HIGH',
            stationCount: 3,
          },
        })
      );

      assert.ok(html.includes('status-go'), 'Must have status-go CSS class');
      assert.ok(html.includes('GO</div>'), 'Must render user-facing GO badge');
      assert.ok(html.includes('48'), 'Must render estimated PM2.5 value');
      assert.ok(html.includes('HIGH Confidence'), 'Must render confidence pill');
    });

    it('renders MODIFY status for internal MODIFY verdict', () => {
      const html = renderToString(
        React.createElement(SchoolSafetyDashboard, {
          overallVerdict: {
            verdict: 'MODIFY',
            severity: 2,
            summary: 'Moderate particulate exposure projected.',
          },
        })
      );

      assert.ok(html.includes('status-modify'), 'Must have status-modify CSS class');
      assert.ok(html.includes('MODIFY</div>'), 'Must render user-facing MODIFY badge');
    });

    it('renders MODIFY status for internal MODIFY_STRICT verdict (Phase 3 mapping rule)', () => {
      const html = renderToString(
        React.createElement(SchoolSafetyDashboard, {
          overallVerdict: {
            verdict: 'MODIFY_STRICT',
            severity: 3,
            summary: 'Substantial particulate exposure projected.',
          },
        })
      );

      assert.ok(html.includes('status-modify'), 'Must have status-modify CSS class');
      assert.ok(html.includes('MODIFY</div>'), 'Must render user-facing MODIFY badge per Rule 3');
      assert.ok(html.includes('Strict Operational Caution'), 'Must provide strict operational context');
    });

    it('renders INDOORS status when outdoor threshold is exceeded', () => {
      const html = renderToString(
        React.createElement(SchoolSafetyDashboard, {
          overallVerdict: {
            verdict: 'INDOORS',
            severity: 4,
            summary: 'One or more activity windows exceed 120 µg/m³. Move indoors.',
          },
          schoolEstimate: {
            pm25: 145.0,
            confidence: 'HIGH',
          },
        })
      );

      assert.ok(html.includes('status-indoors'), 'Must have status-indoors CSS class');
      assert.ok(html.includes('INDOORS</div>'), 'Must render user-facing INDOORS badge');
      assert.ok(html.includes('145'), 'Must render evaluated PM2.5 value');
    });
  });

  // ==========================================================================
  // 7. Best Outdoor Window Card
  // ==========================================================================
  describe('7. Best Outdoor Window Card', () => {
    it('renders optimal window time, average PM2.5, and confidence badge when available', () => {
      const html = renderToString(
        React.createElement(SchoolSafetyDashboard, {
          bestOutdoorWindow: {
            found: true,
            window: '11:00 - 11:30',
            averagePm25: 51.0,
            confidence: 'HIGH',
          },
        })
      );

      assert.ok(html.includes('Best Outdoor Window'), 'Must include section title');
      assert.ok(html.includes('11:00 - 11:30'), 'Must render time window');
      assert.ok(html.includes('51'), 'Must render average PM2.5');
      assert.ok(html.includes('Optimal'), 'Must render Optimal badge');
    });
  });

  // ==========================================================================
  // 8. Modeling Rule & Medical Disclaimer Compliance
  // ==========================================================================
  describe('8. Modeling Rule Compliance', () => {
    it('clearly labels PM2.5 as "Estimated around school"', () => {
      const html = renderToString(React.createElement(SchoolSafetyDashboard));
      assert.ok(
        html.includes('Estimated around school'),
        'Must explicitly display "Estimated around school"'
      );
    });

    it('never says "measured at school" or "school sensor"', () => {
      const html = renderToString(React.createElement(SchoolSafetyDashboard));
      const lower = html.toLowerCase();
      assert.ok(
        !lower.includes('measured at school'),
        'Must NEVER say "measured at school"'
      );
      assert.ok(
        !lower.includes('school sensor'),
        'Must NEVER say "school sensor"'
      );
      assert.ok(
        !lower.includes('school-gate measurement'),
        'Must NEVER say "school-gate measurement"'
      );
    });

    it('contains operational guidance disclaimers and no medical claims', () => {
      const html = renderToString(React.createElement(SchoolSafetyDashboard));
      assert.ok(
        html.includes('Does not constitute medical advice') ||
        html.includes('does not constitute medical advice'),
        'Must explicitly state it is not medical advice'
      );
    });
  });

  // ==========================================================================
  // 9. Activity Timeline & Data-Driven Presentation
  // ==========================================================================
  describe('9. Activity Timeline Data-Driven Rendering', () => {
    it('renders each scheduled activity with time chip, PM2.5, and operational guidance', () => {
      const customActivities = [
        {
          activity: 'Morning Assembly',
          timeWindow: '08:00 - 08:30',
          evaluatedPm25: 55.0,
          verdict: 'GO',
          operationalGuidance: 'Permitted to proceed with standard hydration.',
        },
        {
          activity: 'Football Practice',
          timeWindow: '13:30 - 14:30',
          evaluatedPm25: 135.0,
          verdict: 'INDOORS',
          operationalGuidance: 'Transition session to indoor gymnasium.',
        },
      ];

      const html = renderToString(
        React.createElement(SchoolSafetyDashboard, {
          activityResults: customActivities,
        })
      );

      assert.ok(html.includes('Morning Assembly'));
      assert.ok(html.includes('08:00 - 08:30'));
      assert.ok(html.includes('Estimated: 55 µg/m³'));
      assert.ok(html.includes('Football Practice'));
      assert.ok(html.includes('13:30 - 14:30'));
      assert.ok(html.includes('Estimated: 135 µg/m³'));
      assert.ok(html.includes('Transition session to indoor gymnasium'));
    });
  });
});
