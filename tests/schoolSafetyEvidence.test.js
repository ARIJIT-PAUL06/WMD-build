/**
 * Comprehensive Unit and Integration Tests for Phase 5
 * School Safety Evidence, Monitoring Continuity & Civic Action Gating
 *
 * Covers all 20 required Phase 5 scenarios:
 * 1. Daily aggregation
 * 2. Multiple observations on same day
 * 3. Missing day (no interpolation)
 * 4. Partial day (insufficient observations within day)
 * 5. 14-day window construction
 * 6. Exactly 14 observed days -> COMPLETE
 * 7. Less than 14 observed days -> MONITORING
 * 8. 14 calendar days with missing observations -> INSUFFICIENT_DATA
 * 9. Coverage percentage calculation
 * 10. Monitoring status resolution
 * 11. Civic action eligibility gating
 * 12. Factual evidence summary (no unsupported causal claims)
 * 13. Duplicate observation protection
 * 14. Same telemetry timestamp does not create duplicates
 * 15. Evidence package contains only real observations
 * 16. No fabricated missing-day values
 * 17. Local persistence failure handling (safe in-memory fallback)
 * 18. Dashboard monitoring timeline rendering
 * 19. Civic Action locked before eligibility
 * 20. Civic Action callback exposed only after eligibility
 */

import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

import {
  aggregateDailySchoolEvidence,
  buildSchoolEvidenceWindow,
  calculateEvidenceCoverage,
  getMonitoringStatus,
  evaluateCivicActionEligibility,
  generateEvidenceSummary,
  createEvidencePackage,
  DAY_STATUS,
  MONITORING_STATUS,
  DATA_QUALITY,
} from '../src/components/SchoolSafety/schoolSafetyEvidence.js';

import {
  recordSchoolObservation,
  getSchoolObservations,
  clearSchoolObservations,
} from '../src/components/SchoolSafety/schoolEvidenceStore.js';

describe('School Safety Evidence & 14-Day Monitoring (Phase 5 Tests)', () => {
  let viteServer;
  let SchoolSafetyDashboard;

  before(async () => {
    viteServer = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    const dashMod = await viteServer.ssrLoadModule(
      './src/components/SchoolSafety/SchoolSafetyDashboard.jsx'
    );
    SchoolSafetyDashboard = dashMod.default;
  });

  after(async () => {
    if (viteServer) {
      await viteServer.close();
    }
  });

  // ==========================================================================
  // 1. Daily Aggregation
  // ==========================================================================
  it('1. aggregateDailySchoolEvidence groups observations by calendar day with correct PM2.5 metrics', () => {
    const observations = [
      {
        schoolId: 'dps_rohini',
        timestamp: '2026-10-01T08:00:00.000Z',
        estimatedPm25: 75.0,
        aqi: 160,
        confidence: 'HIGH',
        stationsUsed: [{ name: 'DTU' }],
        isEstimate: true,
      },
      {
        schoolId: 'dps_rohini',
        timestamp: '2026-10-02T08:00:00.000Z',
        estimatedPm25: 85.0,
        aqi: 175,
        confidence: 'HIGH',
        stationsUsed: [{ name: 'DTU' }],
        isEstimate: true,
      },
    ];

    const daily = aggregateDailySchoolEvidence(observations);
    assert.strictEqual(daily.length, 2);
    assert.strictEqual(daily[0].date, '2026-10-01');
    assert.strictEqual(daily[0].observationCount, 1);
    assert.strictEqual(daily[0].averagePm25, 75.0);
    assert.strictEqual(daily[0].isEstimate, true);
    assert.strictEqual(daily[1].date, '2026-10-02');
    assert.strictEqual(daily[1].averagePm25, 85.0);
  });

  // ==========================================================================
  // 2. Multiple Observations on Same Day
  // ==========================================================================
  it('2. handles multiple observations on the same day with correct averaging and min/max', () => {
    const observations = [
      {
        schoolId: 'dps_rohini',
        timestamp: '2026-10-01T08:00:00.000Z',
        estimatedPm25: 60.0,
        aqi: 150,
        confidence: 'HIGH',
        stationsUsed: ['DTU'],
      },
      {
        schoolId: 'dps_rohini',
        timestamp: '2026-10-01T11:00:00.000Z',
        estimatedPm25: 80.0,
        aqi: 170,
        confidence: 'HIGH',
        stationsUsed: ['DTU', 'Rohini'],
      },
      {
        schoolId: 'dps_rohini',
        timestamp: '2026-10-01T14:00:00.000Z',
        estimatedPm25: 100.0,
        aqi: 190,
        confidence: 'HIGH',
        stationsUsed: ['Pitampura'],
      },
    ];

    const daily = aggregateDailySchoolEvidence(observations);
    assert.strictEqual(daily.length, 1);
    assert.strictEqual(daily[0].observationCount, 3);
    assert.strictEqual(daily[0].minPm25, 60.0);
    assert.strictEqual(daily[0].maxPm25, 100.0);
    assert.strictEqual(daily[0].averagePm25, 80.0);
    assert.strictEqual(daily[0].averageAqi, 170);
    assert.strictEqual(daily[0].firstObservationAt, '2026-10-01T08:00:00.000Z');
    assert.strictEqual(daily[0].lastObservationAt, '2026-10-01T14:00:00.000Z');
    assert.deepStrictEqual(daily[0].stationsObserved.sort(), ['DTU', 'Pitampura', 'Rohini'].sort());
  });

  // ==========================================================================
  // 3. Missing Day (No Interpolation)
  // ==========================================================================
  it('3. does not interpolate or fabricate observations for missing calendar days in daily aggregation', () => {
    const observations = [
      {
        schoolId: 'dps_rohini',
        timestamp: '2026-10-01T08:00:00.000Z',
        estimatedPm25: 70.0,
      },
      {
        schoolId: 'dps_rohini',
        timestamp: '2026-10-05T08:00:00.000Z',
        estimatedPm25: 90.0,
      },
    ];

    const daily = aggregateDailySchoolEvidence(observations);
    // Only the 2 actual days should exist
    assert.strictEqual(daily.length, 2);
    assert.strictEqual(daily[0].date, '2026-10-01');
    assert.strictEqual(daily[1].date, '2026-10-05');
  });

  // ==========================================================================
  // 4. Partial Day
  // ==========================================================================
  it('4. classifies day as PARTIAL when observation count is below configured threshold', () => {
    const observations = [
      {
        schoolId: 'dps_rohini',
        timestamp: '2026-10-01T08:00:00.000Z',
        estimatedPm25: 65.0,
      },
    ];

    const window = buildSchoolEvidenceWindow(observations, '2026-10-01', 1, {
      minObservationsForFull: 3,
    });

    assert.strictEqual(window.length, 1);
    assert.strictEqual(window[0].status, DAY_STATUS.PARTIAL);
    assert.strictEqual(window[0].observationCount, 1);
  });

  // ==========================================================================
  // 5. 14-Day Window Construction
  // ==========================================================================
  it('5. buildSchoolEvidenceWindow produces exactly 14 chronological calendar days ending on target date', () => {
    const window = buildSchoolEvidenceWindow([], '2026-10-14', 14);
    assert.strictEqual(window.length, 14);
    assert.strictEqual(window[0].date, '2026-10-01');
    assert.strictEqual(window[13].date, '2026-10-14');
    // Chronological order verification
    for (let i = 1; i < 14; i++) {
      assert.ok(new Date(window[i].date) > new Date(window[i - 1].date));
    }
  });

  // ==========================================================================
  // 6. Exactly 14 Observed Days -> COMPLETE
  // ==========================================================================
  it('6. achieves COMPLETE monitoring status when exactly 14 calendar days have verified observations', () => {
    const observations = [];
    for (let day = 1; day <= 14; day++) {
      const dayStr = String(day).padStart(2, '0');
      observations.push({
        schoolId: 'dps_rohini',
        timestamp: `2026-10-${dayStr}T08:00:00.000Z`,
        estimatedPm25: 70 + day,
        aqi: 150 + day,
        confidence: 'HIGH',
      });
    }

    const window = buildSchoolEvidenceWindow(observations, '2026-10-14', 14, {
      minObservationsForFull: 1,
    });
    const coverage = calculateEvidenceCoverage(window, { requiredDays: 14 });
    const status = getMonitoringStatus(window, { requiredDays: 14 });

    assert.strictEqual(coverage.observedDays, 14);
    assert.strictEqual(coverage.missingDays, 0);
    assert.strictEqual(coverage.coveragePercent, 100);
    assert.strictEqual(coverage.sufficientForAction, true);
    assert.strictEqual(status, MONITORING_STATUS.COMPLETE);
  });

  // ==========================================================================
  // 7. Less than 14 Observed Days -> MONITORING
  // ==========================================================================
  it('7. returns MONITORING status when less than 14 days are observed and window is ongoing', () => {
    const observations = [
      {
        schoolId: 'dps_rohini',
        timestamp: '2026-10-10T08:00:00.000Z',
        estimatedPm25: 80.0,
      },
      {
        schoolId: 'dps_rohini',
        timestamp: '2026-10-11T08:00:00.000Z',
        estimatedPm25: 82.0,
      },
    ];

    const window = buildSchoolEvidenceWindow(observations, '2026-10-14', 14);
    const coverage = calculateEvidenceCoverage(window);
    const status = getMonitoringStatus(window);

    assert.strictEqual(coverage.observedDays, 2);
    assert.strictEqual(coverage.sufficientForAction, false);
    assert.strictEqual(status, MONITORING_STATUS.MONITORING);
  });

  // ==========================================================================
  // 8. 14 Calendar Days with Missing Observations -> INSUFFICIENT_DATA
  // ==========================================================================
  it('8. returns INSUFFICIENT_DATA when the 14-day calendar period has elapsed with missing observations', () => {
    // Monitoring began on Oct 1 and ended on Oct 14, but only 3 days had telemetry
    const observations = [
      { schoolId: 'dps_rohini', timestamp: '2026-10-01T08:00:00.000Z', estimatedPm25: 75.0 },
      { schoolId: 'dps_rohini', timestamp: '2026-10-07T08:00:00.000Z', estimatedPm25: 80.0 },
      { schoolId: 'dps_rohini', timestamp: '2026-10-14T08:00:00.000Z', estimatedPm25: 85.0 },
    ];

    const window = buildSchoolEvidenceWindow(observations, '2026-10-14', 14);
    const status = getMonitoringStatus(window, { isPeriodElapsed: true });

    assert.strictEqual(status, MONITORING_STATUS.INSUFFICIENT_DATA);
  });

  // ==========================================================================
  // 9. Coverage Percentage Calculation
  // ==========================================================================
  it('9. calculateEvidenceCoverage computes precise coverage percentage and metrics', () => {
    const mockWindow = [
      { status: DAY_STATUS.OBSERVED },
      { status: DAY_STATUS.OBSERVED },
      { status: DAY_STATUS.OBSERVED },
      { status: DAY_STATUS.OBSERVED },
      { status: DAY_STATUS.OBSERVED },
      { status: DAY_STATUS.OBSERVED },
      { status: DAY_STATUS.OBSERVED }, // 7 observed
      { status: DAY_STATUS.PARTIAL },
      { status: DAY_STATUS.PARTIAL }, // 2 partial
      { status: DAY_STATUS.NO_DATA },
      { status: DAY_STATUS.NO_DATA },
      { status: DAY_STATUS.NO_DATA },
      { status: DAY_STATUS.NO_DATA },
      { status: DAY_STATUS.NO_DATA }, // 5 missing
    ];

    const coverage = calculateEvidenceCoverage(mockWindow, { requiredDays: 14 });
    assert.strictEqual(coverage.daysInWindow, 14);
    assert.strictEqual(coverage.observedDays, 7);
    assert.strictEqual(coverage.partialDays, 2);
    assert.strictEqual(coverage.missingDays, 5);
    assert.strictEqual(coverage.coveragePercent, 50); // 7 / 14 = 50%
    assert.strictEqual(coverage.sufficientForAction, false);
  });

  // ==========================================================================
  // 10. Monitoring Status Resolution
  // ==========================================================================
  it('10. getMonitoringStatus cleanly distinguishes COMPLETE, MONITORING, and INSUFFICIENT_DATA', () => {
    // COMPLETE case
    const completeWindow = Array.from({ length: 14 }, () => ({ status: DAY_STATUS.OBSERVED }));
    assert.strictEqual(getMonitoringStatus(completeWindow), MONITORING_STATUS.COMPLETE);

    // Ongoing MONITORING case
    const ongoingWindow = [
      ...Array.from({ length: 10 }, () => ({ status: DAY_STATUS.NO_DATA })),
      ...Array.from({ length: 4 }, () => ({ status: DAY_STATUS.OBSERVED })),
    ];
    assert.strictEqual(getMonitoringStatus(ongoingWindow), MONITORING_STATUS.MONITORING);

    // INSUFFICIENT_DATA case (explicitly elapsed)
    assert.strictEqual(
      getMonitoringStatus(ongoingWindow, { isPeriodElapsed: true }),
      MONITORING_STATUS.INSUFFICIENT_DATA
    );
  });

  // ==========================================================================
  // 11. Civic Action Eligibility Gating
  // ==========================================================================
  it('11. evaluateCivicActionEligibility gates action workflow strictly until 14 days complete', () => {
    // Incomplete monitoring
    const ongoingWindow = Array.from({ length: 14 }, (_, i) => ({
      status: i < 5 ? DAY_STATUS.OBSERVED : DAY_STATUS.NO_DATA,
    }));
    const lockedResult = evaluateCivicActionEligibility(MONITORING_STATUS.MONITORING, ongoingWindow);
    assert.strictEqual(lockedResult.eligible, false);
    assert.strictEqual(lockedResult.status, 'Continue monitoring');
    assert.ok(lockedResult.reason.includes('14 days of sufficient evidence are required'));
    assert.ok(!lockedResult.reason.includes('denied'));

    // Complete monitoring
    const completeWindow = Array.from({ length: 14 }, () => ({ status: DAY_STATUS.OBSERVED }));
    const eligibleResult = evaluateCivicActionEligibility(MONITORING_STATUS.COMPLETE, completeWindow);
    assert.strictEqual(eligibleResult.eligible, true);
    assert.strictEqual(eligibleResult.status, 'Evidence period complete');
    assert.ok(eligibleResult.reason.includes('verified'));
  });

  // ==========================================================================
  // 12. Factual Evidence Summary (No Unsupported Causal Claims)
  // ==========================================================================
  it('12. generateEvidenceSummary returns factual metrics without causal speculation', () => {
    const dailyWindow = [
      { date: '2026-10-01', status: DAY_STATUS.OBSERVED, averagePm25: 60.0, averageAqi: 140, observationCount: 2 },
      { date: '2026-10-02', status: DAY_STATUS.OBSERVED, averagePm25: 90.0, averageAqi: 180, observationCount: 3 },
      { date: '2026-10-03', status: DAY_STATUS.NO_DATA, averagePm25: null, averageAqi: null, observationCount: 0 },
    ];

    const summary = generateEvidenceSummary(dailyWindow);
    assert.strictEqual(summary.averagePm25, 75.0); // (60 + 90) / 2
    assert.strictEqual(summary.highestDailyPm25, 90.0);
    assert.strictEqual(summary.lowestDailyPm25, 60.0);
    assert.strictEqual(summary.averageAqi, 160);
    assert.strictEqual(summary.totalObservations, 5);
    assert.strictEqual(summary.isEstimate, true);

    // Verify absence of forbidden ungrounded claims
    const jsonStr = JSON.stringify(summary).toLowerCase();
    assert.ok(!jsonStr.includes('traffic'));
    assert.ok(!jsonStr.includes('school is unsafe'));
    assert.ok(!jsonStr.includes('culprit'));
  });

  // ==========================================================================
  // 13. Duplicate Observation Protection
  // ==========================================================================
  it('13. recordSchoolObservation prevents duplicate entries for the same schoolId and timestamp', () => {
    clearSchoolObservations('dps_test');

    const obs1 = {
      schoolId: 'dps_test',
      timestamp: '2026-10-03T12:00:00.000Z',
      estimatedPm25: 75.0,
      isEstimate: true,
    };

    const res1 = recordSchoolObservation(obs1);
    assert.strictEqual(res1.recorded, true);

    const res2 = recordSchoolObservation(obs1);
    assert.strictEqual(res2.recorded, false);
    assert.strictEqual(res2.reason, 'DUPLICATE');

    const stored = getSchoolObservations('dps_test');
    assert.strictEqual(stored.length, 1);
  });

  // ==========================================================================
  // 14. Same Telemetry Timestamp Does Not Create Duplicates
  // ==========================================================================
  it('14. repeated telemetry snapshots with identical timestamp do not inflate observation count', () => {
    clearSchoolObservations('modern_test');

    const timestamp = '2026-10-03T10:30:00.000Z';

    for (let i = 0; i < 5; i++) {
      recordSchoolObservation({
        schoolId: 'modern_test',
        timestamp,
        estimatedPm25: 85.5,
        isEstimate: true,
      });
    }

    const observations = getSchoolObservations('modern_test');
    assert.strictEqual(observations.length, 1);
  });

  // ==========================================================================
  // 15. Evidence Package Contains Only Real Observations
  // ==========================================================================
  it('15. createEvidencePackage packages only real observations and retains isEstimate flag', () => {
    const realObs = [
      {
        timestamp: '2026-10-01T09:00:00.000Z',
        estimatedPm25: 77.2,
        aqi: 162,
        stationCount: 3,
        confidence: 'HIGH',
        source: 'cpcb',
      },
    ];

    const pkg = createEvidencePackage({
      school: { id: 'dps_rohini', name: 'DPS Rohini' },
      observations: realObs,
    });

    assert.strictEqual(pkg.isEstimate, true);
    assert.strictEqual(pkg.observations.length, 1);
    assert.strictEqual(pkg.observations[0].estimatedPm25, 77.2);
    assert.strictEqual(pkg.observations[0].isEstimate, true);
    assert.ok(pkg.methodology.includes('IDW'));
  });

  // ==========================================================================
  // 16. No Fabricated Missing-Day Values
  // ==========================================================================
  it('16. buildSchoolEvidenceWindow ensures missing days have null PM2.5 and NO_DATA status', () => {
    const window = buildSchoolEvidenceWindow([], '2026-10-05', 3);
    assert.strictEqual(window.length, 3);
    for (const day of window) {
      assert.strictEqual(day.status, DAY_STATUS.NO_DATA);
      assert.strictEqual(day.averagePm25, null);
      assert.strictEqual(day.averageAqi, null);
      assert.strictEqual(day.observationCount, 0);
      assert.strictEqual(day.dataQuality, DATA_QUALITY.NO_DATA);
    }
  });

  // ==========================================================================
  // 17. Local Persistence Failure Handling (Safe In-Memory Fallback)
  // ==========================================================================
  it('17. schoolEvidenceStore handles missing/failing localStorage gracefully without throwing', () => {
    // Save original localStorage if present
    const origLocalStorage = global.localStorage;
    try {
      // Simulate broken or disabled localStorage
      global.localStorage = {
        getItem: () => {
          throw new Error('QuotaExceeded / SecurityError');
        },
        setItem: () => {
          throw new Error('QuotaExceeded / SecurityError');
        },
      };

      assert.doesNotThrow(() => {
        recordSchoolObservation({
          schoolId: 'fallback_school',
          timestamp: '2026-10-03T15:00:00.000Z',
          estimatedPm25: 68.0,
        });
        const obs = getSchoolObservations('fallback_school');
        assert.ok(Array.isArray(obs));
      });
    } finally {
      global.localStorage = origLocalStorage;
    }
  });

  // ==========================================================================
  // 18. Dashboard Monitoring Timeline Rendering
  // ==========================================================================
  it('18. SchoolSafetyDashboard renders 14-day monitoring section and progress indicators', () => {
    const dailyEvidence = buildSchoolEvidenceWindow(
      [
        {
          schoolId: 'dps_rohini',
          timestamp: '2026-10-14T08:00:00.000Z',
          estimatedPm25: 84.0,
        },
      ],
      '2026-10-14',
      14
    );

    const html = renderToString(
      React.createElement(SchoolSafetyDashboard, {
        dailyEvidence,
        selectedSchoolId: 'dps_rohini',
      })
    );

    assert.ok(html.includes('14-Day Monitoring &amp; Evidence Continuity') || html.includes('14-Day Monitoring'));
    assert.ok(html.includes('ssd-timeline-grid'));
    assert.ok(html.includes('ssd-timeline-card'));
    assert.ok(html.includes('Progress:'));
    assert.ok(html.includes('Observed Days'));
    assert.ok(html.includes('Missing Days'));
  });

  // ==========================================================================
  // 19. Civic Action Locked Before Eligibility
  // ==========================================================================
  it('19. renders locked Civic Action card and disabled button when monitoring is incomplete', () => {
    const incompleteWindow = buildSchoolEvidenceWindow([], '2026-10-14', 14);

    const html = renderToString(
      React.createElement(SchoolSafetyDashboard, {
        dailyEvidence: incompleteWindow,
        monitoringStatus: MONITORING_STATUS.MONITORING,
        civicEligibility: {
          eligible: false,
          status: 'Continue monitoring',
          reason: '14 days of sufficient evidence are required before the civic action workflow becomes available.',
          requiredDays: 14,
          observedDays: 0,
          missingDays: 14,
        },
      })
    );

    assert.ok(html.includes('Civic Action &amp; Petition Readiness') || html.includes('Civic Action'));
    assert.ok(html.includes('Continue monitoring'));
    assert.ok(html.includes('14 days of sufficient evidence are required'));
    assert.ok(html.includes('id="civic-action-locked-btn"'));
    assert.ok(html.includes('disabled=""') || html.includes('disabled'));
    assert.ok(!html.includes('id="review-civic-package-btn"'));
  });

  // ==========================================================================
  // 20. Civic Action Callback Exposed Only After Eligibility
  // ==========================================================================
  it('20. renders active review button with callback exposed when civic action eligibility is met', () => {
    const completeWindow = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      status: DAY_STATUS.OBSERVED,
      observationCount: 3,
      averagePm25: 75.0,
      averageAqi: 155,
      confidence: 'HIGH',
      dataQuality: DATA_QUALITY.HIGH,
    }));

    const html = renderToString(
      React.createElement(SchoolSafetyDashboard, {
        dailyEvidence: completeWindow,
        monitoringStatus: MONITORING_STATUS.COMPLETE,
        civicEligibility: {
          eligible: true,
          status: 'Evidence period complete',
          reason: '14-day continuous monitoring evidence verified.',
          requiredDays: 14,
          observedDays: 14,
          missingDays: 0,
        },
      })
    );

    assert.ok(html.includes('Evidence period complete'));
    assert.ok(html.includes('id="review-civic-package-btn"'));
    assert.ok(html.includes('Review Civic Action Package'));
    assert.ok(!html.includes('id="civic-action-locked-btn"'));
  });
});
