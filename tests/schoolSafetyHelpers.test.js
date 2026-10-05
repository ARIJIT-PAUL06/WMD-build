/**
 * Focused Unit Tests for School Safety Helpers (Phase 2)
 *
 * Tests all required deterministic logic:
 * 1. Station distance calculation
 * 2. Nearest-station ordering
 * 3. IDW calculation
 * 4. IDW with missing station data
 * 5. Threshold boundaries (60, 60.01, 90, 90.01, 120, 120.01)
 * 6. Overall school verdict aggregation
 * 7. Best outdoor window finder
 * 8. Insufficient data handling
 * 9. Confidence classification (HIGH, MEDIUM, LOW, INSUFFICIENT)
 * 10. Explanation generation (deterministic, no LLM)
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateDistanceKm,
  getNearbyStationsForSchool,
  calculateSchoolIdw,
  evaluateSchoolActivityWindows,
  calculateOverallSchoolVerdict,
  findBestOutdoorWindow,
  generateWhyVerdictExplanation,
  classifySchoolDataConfidence,
  getActivityVerdictDetails,
  parseTimeToMinutes,
  formatMinutesToTime,
  ACTIVITY_VERDICTS,
  CONFIDENCE_LEVELS,
  DEFAULT_ACTIVITY_THRESHOLDS,
} from '../src/components/SchoolSafety/schoolSafetyHelpers.js';

describe('School Safety Helpers - Phase 2 Unit Tests', () => {

  // ==========================================================================
  // 1. Station Distance Calculation
  // ==========================================================================
  describe('1. calculateDistanceKm (Haversine)', () => {
    it('calculates distance between two Delhi coordinates accurately', () => {
      // Connaught Place (28.6315, 77.2167) to Anand Vihar (28.6476, 77.3160)
      const dist = calculateDistanceKm(28.6315, 77.2167, 28.6476, 77.3160);
      assert.ok(typeof dist === 'number');
      // Great circle distance is ~9.8 km
      assert.ok(dist >= 9.5 && dist <= 10.2, `Expected ~9.8 km, got ${dist}`);
    });

    it('returns 0.0 for identical coordinates', () => {
      const dist = calculateDistanceKm(28.7188, 77.1064, 28.7188, 77.1064);
      assert.strictEqual(dist, 0.0);
    });

    it('handles invalid or non-numeric coordinates safely by returning null', () => {
      assert.strictEqual(calculateDistanceKm(null, 77.1, 28.7, 77.2), null);
      assert.strictEqual(calculateDistanceKm(undefined, 77.1, 28.7, 77.2), null);
      assert.strictEqual(calculateDistanceKm('invalid', 77.1, 28.7, 77.2), null);
      assert.strictEqual(calculateDistanceKm(NaN, 77.1, 28.7, 77.2), null);
    });

    it('rounds result to exactly one decimal place', () => {
      const dist = calculateDistanceKm(28.7041, 77.1025, 28.6139, 77.2090);
      const str = dist.toString();
      const parts = str.split('.');
      if (parts.length > 1) {
        assert.ok(parts[1].length <= 1, 'Should have at most 1 decimal place');
      }
    });
  });

  // ==========================================================================
  // 2. Nearest-Station Ordering
  // ==========================================================================
  describe('2. getNearbyStationsForSchool', () => {
    const mockStations = [
      { id: 'st_far', name: 'Far Station', lat: 28.5000, lon: 77.0000, pm25: 120 },
      { id: 'st_near', name: 'Near Station', lat: 28.7150, lon: 77.1050, pm25: 75 },
      { id: 'st_mid', name: 'Mid Station', lat: 28.7500, lon: 77.1200, pm25: 85 },
      { id: 'st_closest', name: 'Closest Station', lat: 28.7190, lon: 77.1065, pm25: 68 },
    ];

    it('returns stations sorted from nearest to farthest', () => {
      // School at (28.7188, 77.1064)
      const nearby = getNearbyStationsForSchool(28.7188, 77.1064, mockStations, 4);
      assert.strictEqual(nearby.length, 4);
      assert.strictEqual(nearby[0].id, 'st_closest');
      assert.strictEqual(nearby[1].id, 'st_near');
      assert.strictEqual(nearby[2].id, 'st_mid');
      assert.strictEqual(nearby[3].id, 'st_far');

      // Verify distanceKm is monotonically non-decreasing
      for (let i = 0; i < nearby.length - 1; i++) {
        assert.ok(
          nearby[i].distanceKm <= nearby[i + 1].distanceKm,
          `Station ${i} distance ${nearby[i].distanceKm} should be <= ${nearby[i + 1].distanceKm}`
        );
      }
    });

    it('respects limit parameter', () => {
      const nearby = getNearbyStationsForSchool(28.7188, 77.1064, mockStations, 2);
      assert.strictEqual(nearby.length, 2);
      assert.strictEqual(nearby[0].id, 'st_closest');
      assert.strictEqual(nearby[1].id, 'st_near');
    });

    it('safely skips stations with missing or invalid coordinates', () => {
      const dirtyStations = [
        { id: 'st_valid', name: 'Valid', lat: 28.7200, lon: 77.1000, pm25: 50 },
        { id: 'st_missing_lat', name: 'No Lat', lon: 77.1000, pm25: 50 },
        { id: 'st_nan_lon', name: 'NaN Lon', lat: 28.7200, lon: NaN, pm25: 50 },
        null,
        undefined,
      ];
      const res = getNearbyStationsForSchool(28.7188, 77.1064, dirtyStations);
      assert.strictEqual(res.length, 1);
      assert.strictEqual(res[0].id, 'st_valid');
    });

    it('returns empty array when school coordinates are invalid', () => {
      assert.deepStrictEqual(getNearbyStationsForSchool(NaN, 77.1064, mockStations), []);
      assert.deepStrictEqual(getNearbyStationsForSchool(null, 77.1064, mockStations), []);
      assert.deepStrictEqual(getNearbyStationsForSchool(28.7188, undefined, mockStations), []);
      assert.deepStrictEqual(getNearbyStationsForSchool(28.7188, 77.1064, []), []);
    });
  });

  // ==========================================================================
  // 3. IDW Calculation
  // ==========================================================================
  describe('3. calculateSchoolIdw (Quadratic IDW)', () => {
    it('estimates school PM2.5 using quadratic inverse distance weighting', () => {
      // 3 stations at known distances
      const stations = [
        { id: 'st1', name: 'Station 1', distanceKm: 1.0, pm25: 50 },
        { id: 'st2', name: 'Station 2', distanceKm: 2.0, pm25: 80 },
        { id: 'st3', name: 'Station 3', distanceKm: 3.0, pm25: 110 },
      ];

      // Hand calculation:
      // w1 = 1 / (1.0^2) = 1.0
      // w2 = 1 / (2.0^2) = 0.25
      // w3 = 1 / (3.0^2) = 0.1111...
      // totalW = 1.0 + 0.25 + 0.1111... = 1.3611...
      // weightedPm25 = (50 * 1.0) + (80 * 0.25) + (110 * 0.1111...)
      //              = 50 + 20 + 12.222... = 82.222...
      // expected = 82.222... / 1.3611... = 60.407... -> 60.4
      const result = calculateSchoolIdw(stations);

      assert.strictEqual(result.stationCount, 3);
      assert.strictEqual(result.pm25, 60.4);
      assert.strictEqual(result.isEstimate, true);
      assert.strictEqual(result.confidence, CONFIDENCE_LEVELS.HIGH);
      assert.ok(result.stationsUsed.length === 3);
      assert.ok(result.disclaimer.includes('Not a direct school-gate sensor measurement'));
    });

    it('safely clamps distance to 0.3 km minimum to avoid division by zero', () => {
      const stations = [
        { id: 'st_super_close', name: 'Right Next Door', distanceKm: 0.05, pm25: 75.0 },
      ];
      const result = calculateSchoolIdw(stations);
      assert.strictEqual(result.pm25, 75.0);
      assert.strictEqual(result.stationCount, 1);
      assert.strictEqual(result.isEstimate, true);
    });
  });

  // ==========================================================================
  // 4. IDW With Missing Station Data
  // ==========================================================================
  describe('4. calculateSchoolIdw with Missing Data', () => {
    it('ignores stations with missing, null, or NaN PM2.5 values', () => {
      const stations = [
        { id: 'st1', name: 'Station 1', distanceKm: 1.0, pm25: 50 },
        { id: 'st_null', name: 'Station Null', distanceKm: 0.8, pm25: null },
        { id: 'st_undef', name: 'Station Undefined', distanceKm: 0.9, pm25: undefined },
        { id: 'st_nan', name: 'Station NaN', distanceKm: 1.2, pm25: NaN },
        { id: 'st_neg', name: 'Station Negative', distanceKm: 1.5, pm25: -10 },
        { id: 'st2', name: 'Station 2', distanceKm: 2.0, pm25: 80 },
      ];

      const result = calculateSchoolIdw(stations);
      assert.strictEqual(result.stationCount, 2);
      assert.strictEqual(result.stationsUsed.length, 2);
      assert.strictEqual(result.stationsUsed[0].id, 'st1');
      assert.strictEqual(result.stationsUsed[1].id, 'st2');

      // Hand calculation for 2 stations:
      // w1 = 1 / 1 = 1
      // w2 = 1 / 4 = 0.25
      // pm25 = (50*1 + 80*0.25) / 1.25 = 70 / 1.25 = 56.0
      assert.strictEqual(result.pm25, 56.0);
    });

    it('returns pm25: null and confidence: INSUFFICIENT when no valid stations exist', () => {
      const resultEmpty = calculateSchoolIdw([]);
      assert.strictEqual(resultEmpty.pm25, null);
      assert.strictEqual(resultEmpty.stationCount, 0);
      assert.strictEqual(resultEmpty.confidence, CONFIDENCE_LEVELS.INSUFFICIENT);

      const resultAllMissing = calculateSchoolIdw([
        { id: 'st1', distanceKm: 1.0, pm25: null },
        { id: 'st2', distanceKm: 2.0, pm25: NaN },
      ]);
      assert.strictEqual(resultAllMissing.pm25, null);
      assert.strictEqual(resultAllMissing.stationCount, 0);
      assert.strictEqual(resultAllMissing.confidence, CONFIDENCE_LEVELS.INSUFFICIENT);
    });
  });

  // ==========================================================================
  // 5. Threshold Boundaries (60, 60.01, 90, 90.01, 120, 120.01)
  // ==========================================================================
  describe('5. Threshold Boundaries Evaluation', () => {
    it('evaluates boundary at PM2.5 = 60 as GO', () => {
      const details = getActivityVerdictDetails(60.0);
      assert.strictEqual(details.verdict, ACTIVITY_VERDICTS.GO);
      assert.strictEqual(details.severity, 1);
      assert.ok(details.reason.includes('≤ 60'));
    });

    it('evaluates boundary at PM2.5 = 60.01 as MODIFY', () => {
      const details = getActivityVerdictDetails(60.01);
      assert.strictEqual(details.verdict, ACTIVITY_VERDICTS.MODIFY);
      assert.strictEqual(details.severity, 2);
      assert.ok(details.reason.includes('> 60 to ≤ 90'));
      assert.ok(details.operationalGuidance.includes('reduce session duration'));
    });

    it('evaluates boundary at PM2.5 = 90 as MODIFY', () => {
      const details = getActivityVerdictDetails(90.0);
      assert.strictEqual(details.verdict, ACTIVITY_VERDICTS.MODIFY);
      assert.strictEqual(details.severity, 2);
    });

    it('evaluates boundary at PM2.5 = 90.01 as MODIFY_STRICT', () => {
      const details = getActivityVerdictDetails(90.01);
      assert.strictEqual(details.verdict, ACTIVITY_VERDICTS.MODIFY_STRICT);
      assert.strictEqual(details.severity, 3);
      assert.ok(details.reason.includes('> 90 to ≤ 120'));
      assert.ok(details.operationalGuidance.includes('restrict vigorous aerobic exertion'));
    });

    it('evaluates boundary at PM2.5 = 120 as MODIFY_STRICT', () => {
      const details = getActivityVerdictDetails(120.0);
      assert.strictEqual(details.verdict, ACTIVITY_VERDICTS.MODIFY_STRICT);
      assert.strictEqual(details.severity, 3);
    });

    it('evaluates boundary at PM2.5 = 120.01 as INDOORS', () => {
      const details = getActivityVerdictDetails(120.01);
      assert.strictEqual(details.verdict, ACTIVITY_VERDICTS.INDOORS);
      assert.strictEqual(details.severity, 4);
      assert.ok(details.reason.includes('> 120'));
      assert.ok(details.operationalGuidance.includes('transition all planned outdoor activities indoors'));
    });

    it('does not generate medical claims in any verdict details', () => {
      const values = [50, 60, 60.01, 75, 90, 90.01, 105, 120, 120.01, 250];
      for (const val of values) {
        const d = getActivityVerdictDetails(val);
        const lower = (d.reason + ' ' + d.operationalGuidance).toLowerCase();
        assert.ok(!lower.includes('patient'), 'Must not claim patient advice');
        assert.ok(!lower.includes('diagnosis'), 'Must not claim diagnosis');
        assert.ok(!lower.includes('cure'), 'Must not claim medical cure');
        assert.ok(!lower.includes('prescribe'), 'Must not claim prescription');
      }
    });

    it('evaluates activity windows using evaluateSchoolActivityWindows', () => {
      const activities = [
        { id: 'act1', name: 'Assembly', startTime: '08:00', endTime: '08:30' },
        { id: 'act2', name: 'PE Class', startTime: '11:00', endTime: '11:45' },
      ];
      const series = [
        { time: '08:15', pm25: 55.0, confidence: CONFIDENCE_LEVELS.HIGH },
        { time: '11:15', pm25: 125.0, confidence: CONFIDENCE_LEVELS.HIGH },
      ];

      const evaluated = evaluateSchoolActivityWindows(series, activities);
      assert.strictEqual(evaluated.length, 2);

      assert.strictEqual(evaluated[0].activityId, 'act1');
      assert.strictEqual(evaluated[0].evaluatedPm25, 55.0);
      assert.strictEqual(evaluated[0].verdict, ACTIVITY_VERDICTS.GO);

      assert.strictEqual(evaluated[1].activityId, 'act2');
      assert.strictEqual(evaluated[1].evaluatedPm25, 125.0);
      assert.strictEqual(evaluated[1].verdict, ACTIVITY_VERDICTS.INDOORS);
    });
  });

  // ==========================================================================
  // 6. Overall School Verdict
  // ==========================================================================
  describe('6. calculateOverallSchoolVerdict', () => {
    it('sets overall verdict to INDOORS (critical) if any activity requires INDOORS', () => {
      const activities = [
        { activity: 'Assembly', evaluatedPm25: 50, verdict: ACTIVITY_VERDICTS.GO },
        { activity: 'Recess', evaluatedPm25: 85, verdict: ACTIVITY_VERDICTS.MODIFY },
        { activity: 'Sports', evaluatedPm25: 135, verdict: ACTIVITY_VERDICTS.INDOORS },
      ];
      const overall = calculateOverallSchoolVerdict(activities);
      assert.strictEqual(overall.verdict, ACTIVITY_VERDICTS.INDOORS);
      assert.strictEqual(overall.severity, 4);
      assert.strictEqual(overall.severityLabel, 'CRITICAL');
      assert.strictEqual(overall.maxPm25, 135);
    });

    it('sets overall verdict to MODIFY_STRICT if worst is MODIFY_STRICT', () => {
      const activities = [
        { activity: 'Assembly', evaluatedPm25: 50, verdict: ACTIVITY_VERDICTS.GO },
        { activity: 'PE', evaluatedPm25: 105, verdict: ACTIVITY_VERDICTS.MODIFY_STRICT },
      ];
      const overall = calculateOverallSchoolVerdict(activities);
      assert.strictEqual(overall.verdict, ACTIVITY_VERDICTS.MODIFY_STRICT);
      assert.strictEqual(overall.severity, 3);
    });

    it('sets overall verdict to GO if all activities are GO', () => {
      const activities = [
        { activity: 'Assembly', evaluatedPm25: 45, verdict: ACTIVITY_VERDICTS.GO },
        { activity: 'Recess', evaluatedPm25: 55, verdict: ACTIVITY_VERDICTS.GO },
      ];
      const overall = calculateOverallSchoolVerdict(activities);
      assert.strictEqual(overall.verdict, ACTIVITY_VERDICTS.GO);
      assert.strictEqual(overall.severity, 1);
    });

    it('handles empty or all-insufficient activity lists gracefully', () => {
      const empty = calculateOverallSchoolVerdict([]);
      assert.strictEqual(empty.verdict, ACTIVITY_VERDICTS.INSUFFICIENT_DATA);
      assert.strictEqual(empty.severity, 0);

      const allInsufficient = calculateOverallSchoolVerdict([
        { activity: 'Recess', verdict: ACTIVITY_VERDICTS.INSUFFICIENT_DATA },
      ]);
      assert.strictEqual(allInsufficient.verdict, ACTIVITY_VERDICTS.INSUFFICIENT_DATA);
    });
  });

  // ==========================================================================
  // 7. Best Outdoor Window Finder
  // ==========================================================================
  describe('7. findBestOutdoorWindow', () => {
    const series = [
      { time: '07:30', pm25: 140 },
      { time: '08:00', pm25: 120 },
      { time: '08:30', pm25: 95 },
      { time: '09:00', pm25: 75 },
      { time: '09:30', pm25: 70 },
      { time: '10:00', pm25: 65 },
      { time: '10:30', pm25: 55 },
      { time: '11:00', pm25: 50 },
      { time: '11:30', pm25: 52 },
      { time: '12:00', pm25: 58 },
      { time: '12:30', pm25: 85 },
      { time: '13:00', pm25: 110 },
      { time: '13:30', pm25: 130 },
      { time: '14:00', pm25: 145 },
    ];

    it('identifies the lowest-pollution continuous 30-minute window', () => {
      const res = findBestOutdoorWindow(series, '07:30', '14:00', 30, 15);
      assert.strictEqual(res.found, true);
      assert.strictEqual(res.startTime, '11:00');
      assert.strictEqual(res.endTime, '11:30');
      assert.strictEqual(res.window, '11:00 - 11:30');
      // Points in [11:00, 11:30] are 50 and 52 -> average 51.0
      assert.strictEqual(res.averagePm25, 51.0);
      assert.strictEqual(res.confidence, CONFIDENCE_LEVELS.HIGH);
      assert.strictEqual(res.isEstimate, true);
    });

    it('strictly respects school hours bounds', () => {
      // Limit operating hours from 07:30 to 09:30 (before the clean 11:00 midday dip)
      const res = findBestOutdoorWindow(series, '07:30', '09:30', 30, 15);
      assert.strictEqual(res.found, true);
      assert.strictEqual(res.startTime, '09:00');
      assert.strictEqual(res.endTime, '09:30');
      assert.ok(res.averagePm25 <= 75.0);
    });

    it('does not fabricate forecast values', () => {
      const sparseSeries = [
        { time: '08:00', pm25: 60 },
        { time: '13:00', pm25: 90 },
      ];
      // A 30-minute window at 10:00 has no data, so it must not be chosen or fabricated
      const res = findBestOutdoorWindow(sparseSeries, '07:30', '14:00', 30, 15);
      assert.strictEqual(res.found, true);
      // Selected window must be based only on real points at 08:00 or 13:00
      assert.ok(res.startTime === '08:00' || res.startTime === '07:45');
      assert.strictEqual(res.averagePm25, 60.0);
    });
  });

  // ==========================================================================
  // 8. Insufficient Data Handling
  // ==========================================================================
  describe('8. Insufficient Data Handling', () => {
    it('returns explicit insufficient-data result when series is empty', () => {
      const res = findBestOutdoorWindow([], '07:30', '14:00', 30);
      assert.strictEqual(res.found, false);
      assert.strictEqual(res.averagePm25, null);
      assert.strictEqual(res.confidence, CONFIDENCE_LEVELS.INSUFFICIENT);
      assert.ok(res.reason.includes('No environmental monitoring'));
    });

    it('returns explicit insufficient-data result when operating hours are invalid', () => {
      const series = [{ time: '08:00', pm25: 50 }];
      const res = findBestOutdoorWindow(series, '14:00', '07:30', 30);
      assert.strictEqual(res.found, false);
      assert.strictEqual(res.confidence, CONFIDENCE_LEVELS.INSUFFICIENT);
      assert.ok(res.reason.includes('Invalid school operating hours'));
    });

    it('returns explicit insufficient-data result when duration exceeds hours', () => {
      const series = [{ time: '08:00', pm25: 50 }];
      const res = findBestOutdoorWindow(series, '08:00', '08:30', 60);
      assert.strictEqual(res.found, false);
      assert.strictEqual(res.confidence, CONFIDENCE_LEVELS.INSUFFICIENT);
      assert.ok(res.reason.includes('exceeds total school operating hours'));
    });

    it('handles activity evaluation with insufficient data', () => {
      const evaluated = evaluateSchoolActivityWindows([], [
        { id: 'act1', name: 'Assembly', startTime: '08:00', endTime: '08:30' }
      ]);
      assert.strictEqual(evaluated.length, 1);
      assert.strictEqual(evaluated[0].verdict, ACTIVITY_VERDICTS.INSUFFICIENT_DATA);
      assert.strictEqual(evaluated[0].evaluatedPm25, null);
      assert.strictEqual(evaluated[0].confidence, CONFIDENCE_LEVELS.INSUFFICIENT);
    });
  });

  // ==========================================================================
  // 9. Confidence Classification
  // ==========================================================================
  describe('9. classifySchoolDataConfidence', () => {
    it('classifies as HIGH when >= 3 stations with nearest <= 5 km', () => {
      const stations = [
        { distanceKm: 1.5, pm25: 60 },
        { distanceKm: 3.2, pm25: 65 },
        { distanceKm: 4.8, pm25: 70 },
      ];
      assert.strictEqual(classifySchoolDataConfidence(stations), CONFIDENCE_LEVELS.HIGH);
    });

    it('classifies as MEDIUM when 2 stations with nearest <= 12 km', () => {
      const stations = [
        { distanceKm: 6.0, pm25: 80 },
        { distanceKm: 9.0, pm25: 85 },
      ];
      assert.strictEqual(classifySchoolDataConfidence(stations), CONFIDENCE_LEVELS.MEDIUM);
    });

    it('classifies as MEDIUM when 1 station is very close (<= 3.0 km)', () => {
      const stations = [
        { distanceKm: 2.1, pm25: 70 },
      ];
      assert.strictEqual(classifySchoolDataConfidence(stations), CONFIDENCE_LEVELS.MEDIUM);
    });

    it('classifies as LOW when 1 station is between 3 km and 25 km', () => {
      const stations = [
        { distanceKm: 14.0, pm25: 90 },
      ];
      assert.strictEqual(classifySchoolDataConfidence(stations), CONFIDENCE_LEVELS.LOW);
    });

    it('classifies as INSUFFICIENT when no stations or distance > 25 km', () => {
      assert.strictEqual(classifySchoolDataConfidence([]), CONFIDENCE_LEVELS.INSUFFICIENT);
      assert.strictEqual(
        classifySchoolDataConfidence([{ distanceKm: 30.0, pm25: 100 }]),
        CONFIDENCE_LEVELS.INSUFFICIENT
      );
      assert.strictEqual(
        classifySchoolDataConfidence([{ distanceKm: 2.0, pm25: null }]),
        CONFIDENCE_LEVELS.INSUFFICIENT
      );
    });

    it('degrades confidence when data is marked stale or expired', () => {
      const stations = [
        { distanceKm: 1.5, pm25: 60 },
        { distanceKm: 3.2, pm25: 65 },
        { distanceKm: 4.8, pm25: 70 },
      ];
      const confStale = classifySchoolDataConfidence(stations, { isStale: true });
      assert.strictEqual(confStale, CONFIDENCE_LEVELS.LOW);

      const confExpired = classifySchoolDataConfidence(stations, { dataAgeMinutes: 180 });
      assert.strictEqual(confExpired, CONFIDENCE_LEVELS.LOW);
    });
  });

  // ==========================================================================
  // 10. Explanation Generation (Deterministic, No LLM)
  // ==========================================================================
  describe('10. generateWhyVerdictExplanation', () => {
    it('generates a factual human-readable explanation from provided context', () => {
      const context = {
        schoolName: 'Delhi Public School, Rohini',
        estimatedPm25: 78.4,
        verdict: ACTIVITY_VERDICTS.MODIFY,
        activity: 'Morning Physical Education',
        timeWindow: '08:30 - 09:15',
        nearbyStations: [
          { name: 'DTU / Rohini, Delhi', distanceKm: 1.8, pm25: 82.0 },
          { name: 'Satyawati College, Delhi', distanceKm: 4.2, pm25: 74.0 },
        ],
        confidence: CONFIDENCE_LEVELS.HIGH,
        freshness: 'Within last 15 minutes',
      };

      const explanation = generateWhyVerdictExplanation(context);
      assert.ok(typeof explanation === 'string');

      // Check key required facts
      assert.ok(explanation.includes('Delhi Public School, Rohini'), 'Must include school name');
      assert.ok(explanation.includes('78.4 µg/m³'), 'Must include estimated PM2.5');
      assert.ok(explanation.includes('Morning Physical Education'), 'Must include activity name');
      assert.ok(explanation.includes('08:30 - 09:15'), 'Must include time window');
      assert.ok(explanation.includes('DTU / Rohini, Delhi at 1.8 km (82 µg/m³)'), 'Must include station evidence');
      assert.ok(explanation.includes('Operational Verdict: MODIFY'), 'Must include verdict');
      assert.ok(explanation.includes('Data Confidence: Classified as HIGH'), 'Must include confidence');
      assert.ok(explanation.includes('Within last 15 minutes'), 'Must include freshness');
      assert.ok(
        explanation.includes('Not a direct school-gate measurement') ||
        explanation.includes('not a direct school-gate measurement'),
        'Must include explicit modeling rule disclaimer'
      );
    });

    it('generates a clean explanation when PM2.5 or station data is missing', () => {
      const context = {
        schoolName: 'Modern School, Barakhamba',
        estimatedPm25: null,
        verdict: ACTIVITY_VERDICTS.INSUFFICIENT_DATA,
        activity: 'Recess',
        timeWindow: '10:30 - 11:00',
        nearbyStations: [],
        confidence: CONFIDENCE_LEVELS.INSUFFICIENT,
      };

      const explanation = generateWhyVerdictExplanation(context);
      assert.ok(typeof explanation === 'string');
      assert.ok(explanation.includes('no reliable PM2.5 estimate could be established'));
      assert.ok(explanation.includes('No surrounding regulatory monitoring stations'));
      assert.ok(explanation.includes('Operational Verdict: INSUFFICIENT DATA'));
    });
  });

  // ==========================================================================
  // 11. Time Utilities
  // ==========================================================================
  describe('11. Time Utilities', () => {
    it('parses various time formats accurately', () => {
      assert.strictEqual(parseTimeToMinutes('07:30'), 450);
      assert.strictEqual(parseTimeToMinutes('14:45'), 885);
      assert.strictEqual(parseTimeToMinutes('00:00'), 0);
      assert.strictEqual(parseTimeToMinutes('23:59'), 1439);
      assert.strictEqual(parseTimeToMinutes('invalid'), null);
      assert.strictEqual(parseTimeToMinutes(null), null);
    });

    it('formats minutes to HH:MM format', () => {
      assert.strictEqual(formatMinutesToTime(450), '07:30');
      assert.strictEqual(formatMinutesToTime(885), '14:45');
      assert.strictEqual(formatMinutesToTime(0), '00:00');
    });
  });
});
