import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateSchoolEvidence, generateDraftPetition } from '../server/evidenceService.js';

describe('Petition Phase 1b Backend Integrity & Zero-Faking Unit Tests', () => {
  it('1. aggregateSchoolEvidence throws 400 when required parameters are missing', () => {
    assert.throws(
      () => aggregateSchoolEvidence({}),
      (err) => err.statusCode === 400 && err.message.includes('required'),
      'Must reject missing station/school with 400'
    );
  });

  it('2. Days without telemetry are reported as NO_DATA without fabrication', () => {
    const evidence = aggregateSchoolEvidence({
      schoolName: 'Delhi Public School, Rohini',
      days: 14,
      threshold: 60
    });

    assert.ok(evidence.success);
    assert.strictEqual(evidence.dailyLogs.length, 14);
    assert.strictEqual(typeof evidence.daysWithData, 'number');
    assert.strictEqual(typeof evidence.daysMissing, 'number');
    assert.strictEqual(evidence.daysWithData + evidence.daysMissing, 14);

    // Days with no data must have null values, not baseline 142
    const missingDays = evidence.dailyLogs.filter(d => d.source === 'NO_DATA');
    for (const d of missingDays) {
      assert.strictEqual(d.morningAvgPm25, null);
      assert.strictEqual(d.peakPm25, null);
      assert.strictEqual(d.category, 'NO DATA');
      assert.strictEqual(d.disruption, null);
    }
  });

  it('3. maeError formula is removed and not fabricated', () => {
    const evidence = aggregateSchoolEvidence({
      schoolName: 'Delhi Public School, Rohini',
      days: 7
    });

    assert.strictEqual(evidence.maeError, null, 'maeError must be null when no real metric exists');
  });

  it('4. generateDraftPetition uses honest placeholders when sender is omitted', () => {
    const evidence = {
      schoolName: 'Delhi Public School, Rohini',
      locality: 'Rohini Sector 16',
      threshold: 60,
      schoolDaysTotal: 5,
      exceedanceCount: 3,
      startDate: 'Mon, 5 Oct',
      endDate: 'Fri, 9 Oct',
      peakPm25: 125,
      peakDate: 'Wed, 7 Oct',
      stationName: 'DTU',
      stationDistanceKm: 1.8,
      compiledBy: 'VayuVitals',
      compilationDate: '9 October 2026',
      daysWithData: 5,
      timeHorizonDays: 7
    };
    const authority = {
      designation: 'The Member Secretary',
      fullName: 'Delhi Pollution Control Committee (DPCC)',
      address: 'Kashmere Gate, Delhi - 110006'
    };

    const draft = generateDraftPetition({ evidence, authority });
    assert.ok(draft.englishText.includes('[YOUR NAME]'), 'Must use placeholder instead of Dr. Sunita Sharma');
    assert.ok(draft.englishText.includes('[YOUR ROLE / DESIGNATION]'));
    assert.ok(draft.englishText.includes('[YOUR PHONE / EMAIL]'));
    assert.ok(draft.englishText.includes('Observation Window: Mon, 5 Oct to Fri, 9 Oct (5 of 7 days with hours with modelled data available)'));

    assert.ok(draft.hindiText.includes('[YOUR NAME]'));
    assert.ok(draft.hindiText.includes('[YOUR ROLE / DESIGNATION]'));
    assert.ok(!draft.hindiText.includes('CAAQMS'), 'Must not mislabel data source as CAAQMS');
    assert.ok(draft.hindiText.includes('ओपन-मेटियो') || draft.hindiText.includes('Open-Meteo'));
  });
});
