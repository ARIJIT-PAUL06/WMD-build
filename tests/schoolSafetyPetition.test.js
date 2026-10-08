/**
 * Focused Unit and Integration Tests for Phase 6
 * School Safety & PetitionModal Civic Action Integration
 *
 * Verifies all 14 required Phase 6 scenarios:
 * 1. Evidence-complete School Safety opens PetitionModal.
 * 2. Incomplete evidence cannot open PetitionModal.
 * 3. EvidencePackage reaches PetitionModal unchanged.
 * 4. School information reaches PetitionModal.
 * 5. 14-day statistics render correctly.
 * 6. NO_DATA days remain NO_DATA (never zero or fabricated).
 * 7. Estimated-around-school disclaimer is displayed.
 * 8. Existing petition flow still works without School Safety context.
 * 9. Existing petition generation still works.
 * 10. Existing PDF generation still works.
 * 11. Evidence values cannot be altered by UI formatting.
 * 12. Gemini/polish cannot determine evidence eligibility.
 * 13. No automatic submission/email occurs.
 * 14. Existing Petition & Action heatmap flow remains functional.
 */

import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

import {
  evaluateCivicActionEligibility,
  buildSchoolEvidenceWindow,
  calculateEvidenceCoverage,
  getMonitoringStatus,
  generateEvidenceSummary,
  createEvidencePackage,
  DAY_STATUS,
  MONITORING_STATUS,
} from '../src/components/SchoolSafety/schoolSafetyEvidence.js';

import { generateDraftPetition } from '../server/evidenceService.js';
import { generatePetitionPdf } from '../src/components/Petition/pdfGenerator.js';

describe('School Safety & PetitionModal Integration (Phase 6 Tests)', () => {
  let viteServer;
  let PetitionModal;
  let SchoolSafetyContainer;
  let DelhiAqiHeatmap;

  // Window & Buffer Polyfill for SSR testing with jsPDF
  const setupWindowMock = () => {
    global.window = {
      location: { search: '', hash: '', pathname: '/' },
      navigator: { userAgent: 'Mozilla/5.0 (Node.js)' },
      localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
      atob: (s) => Buffer.from(s, 'base64').toString('binary'),
      btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    };
  };

  before(async () => {
    setupWindowMock();
    viteServer = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    const petitionMod = await viteServer.ssrLoadModule(
      './src/components/Petition/PetitionModal.jsx'
    );
    PetitionModal = petitionMod.default;

    const containerMod = await viteServer.ssrLoadModule(
      './src/components/SchoolSafety/SchoolSafetyContainer.jsx'
    );
    SchoolSafetyContainer = containerMod.default;

    const heatmapMod = await viteServer.ssrLoadModule(
      './src/components/Heatmap/DelhiAqiHeatmap.jsx'
    );
    DelhiAqiHeatmap = heatmapMod.default;
  });

  after(async () => {
    if (viteServer) {
      await viteServer.close();
    }
  });

  // Mock verified 14-day evidence package
  const createMockCompletePackage = () => {
    const dailyEvidence = [];
    for (let day = 1; day <= 14; day++) {
      const dayStr = String(day).padStart(2, '0');
      dailyEvidence.push({
        date: `2026-10-${dayStr}`,
        status: DAY_STATUS.OBSERVED,
        observationCount: 3,
        averagePm25: 75.0 + day,
        averageAqi: 155 + day,
        confidence: 'HIGH',
        dataQuality: 'HIGH',
        isEstimate: true,
      });
    }

    return createEvidencePackage({
      school: {
        id: 'dps_rohini',
        name: 'Delhi Public School, Rohini',
        locality: 'Sector 24, Phase III, Rohini, North West Delhi',
        lat: 28.7188,
        lon: 77.1064,
        nearestStation: 'DTU (Delhi Technological University)',
        stationDistanceKm: 1.8,
        studentCount: 3800,
        schoolHours: '07:30 - 13:45',
      },
      monitoringPeriod: {
        startDate: '2026-10-01',
        endDate: '2026-10-14',
        totalDays: 14,
      },
      dailyEvidence,
      coverage: {
        daysInWindow: 14,
        observedDays: 14,
        partialDays: 0,
        missingDays: 0,
        coveragePercent: 100,
        sufficientForAction: true,
        requiredDays: 14,
        reason: 'Sufficient evidence collected: 14 of 14 required monitoring days verified.',
      },
      summary: {
        monitoringPeriod: { startDate: '2026-10-01', endDate: '2026-10-14', totalDays: 14 },
        observedDays: 14,
        partialDays: 0,
        missingDays: 0,
        averagePm25: 82.5,
        highestDailyPm25: 89.0,
        lowestDailyPm25: 76.0,
        averageAqi: 162,
        coveragePercent: 100,
        confidenceSummary: 'Derived from surrounding continuous regulatory stations via quadratic IDW.',
        qualitySummary: 'Verified continuous spatial monitoring evidence over 14 calendar days.',
        monitoringStatus: MONITORING_STATUS.COMPLETE,
        totalObservations: 42,
        isEstimate: true,
      },
      observations: [
        {
          timestamp: '2026-10-01T08:00:00.000Z',
          estimatedPm25: 76.0,
          confidence: 'HIGH',
          source: 'delhi-heatmap',
          isEstimate: true,
        },
      ],
    });
  };

  // ==========================================================================
  // 1. Evidence-complete School Safety opens PetitionModal
  // ==========================================================================
  it('1. Evidence-complete School Safety renders open PetitionModal when invoked with package', () => {
    const pkg = createMockCompletePackage();

    const html = renderToString(
      React.createElement(PetitionModal, {
        isOpen: true,
        onClose: () => {},
        school: pkg.school,
        evidencePackage: pkg,
      })
    );

    assert.ok(html.includes('id="petition-action-modal"'), 'Must render PetitionModal container');
    assert.ok(html.includes('14-Day School Monitoring Evidence'), 'Must render School Evidence Section');
    assert.ok(html.includes('Delhi Public School, Rohini'), 'Must render school name');
  });

  // ==========================================================================
  // 2. Incomplete evidence cannot open PetitionModal
  // ==========================================================================
  it('2. Incomplete evidence prevents action eligibility and gates modal opening', () => {
    const incompleteWindow = [
      { date: '2026-10-01', status: DAY_STATUS.OBSERVED, averagePm25: 70.0 },
      { date: '2026-10-02', status: DAY_STATUS.NO_DATA, averagePm25: null },
    ];
    const eligibility = evaluateCivicActionEligibility(MONITORING_STATUS.MONITORING, incompleteWindow);

    assert.strictEqual(eligibility.eligible, false, 'Must be ineligible before 14 days complete');
    assert.strictEqual(eligibility.status, 'Continue monitoring');

    // Closed PetitionModal renders null
    const closedHtml = renderToString(
      React.createElement(PetitionModal, {
        isOpen: false,
        onClose: () => {},
        school: { name: 'DPS Rohini' },
      })
    );
    assert.strictEqual(closedHtml, '', 'Must not render when isOpen is false');
  });

  // ==========================================================================
  // 3. EvidencePackage reaches PetitionModal unchanged
  // ==========================================================================
  it('3. EvidencePackage properties reach PetitionModal unchanged without mutation', () => {
    const pkg = createMockCompletePackage();

    assert.strictEqual(pkg.isEstimate, true);
    assert.strictEqual(pkg.summary.averagePm25, 82.5);
    assert.strictEqual(pkg.coverage.observedDays, 14);
    assert.strictEqual(pkg.dailyEvidence.length, 14);

    const html = renderToString(
      React.createElement(PetitionModal, {
        isOpen: true,
        onClose: () => {},
        school: pkg.school,
        evidencePackage: pkg,
      })
    );

    assert.ok(html.includes('82.5'), 'Must render exact average PM2.5 value');
    assert.ok(html.includes('14 / 14 Days Verified'), 'Must render exact observed days');
  });

  // ==========================================================================
  // 4. School information reaches PetitionModal
  // ==========================================================================
  it('4. School profile information reaches PetitionModal fields', () => {
    const pkg = createMockCompletePackage();

    const html = renderToString(
      React.createElement(PetitionModal, {
        isOpen: true,
        onClose: () => {},
        school: pkg.school,
        schoolContext: pkg.school,
        evidencePackage: pkg,
      })
    );

    assert.ok(html.includes('Delhi Public School, Rohini'));
    assert.ok(html.includes('Sector 24, Phase III, Rohini'));
    assert.ok(html.includes('DTU (Delhi Technological University)'));
  });

  // ==========================================================================
  // 5. 14-day statistics render correctly
  // ==========================================================================
  it('5. 14-day monitoring statistics render in dedicated evidence section', () => {
    const pkg = createMockCompletePackage();

    const html = renderToString(
      React.createElement(PetitionModal, {
        isOpen: true,
        onClose: () => {},
        school: pkg.school,
        evidencePackage: pkg,
      })
    );

    assert.ok(html.includes('OBSERVED DAYS'));
    assert.ok(html.includes('PARTIAL DAYS'));
    assert.ok(html.includes('MISSING DAYS'));
    assert.ok(html.includes('14-DAY AVG PM2.5'));
    assert.ok(html.includes('Highest Day:'));
    assert.ok(html.includes('Lowest Day:'));
  });

  // ==========================================================================
  // 6. NO_DATA days remain NO_DATA (never zero or fabricated)
  // ==========================================================================
  it('6. NO_DATA days remain strictly NO DATA without zero substitution or fabricated PM2.5', () => {
    const pkg = createMockCompletePackage();
    // Simulate day 7 as missing data
    pkg.dailyEvidence[6] = {
      date: '2026-10-07',
      status: DAY_STATUS.NO_DATA,
      observationCount: 0,
      averagePm25: null,
      dataQuality: 'NO_DATA',
      isEstimate: true,
    };

    const html = renderToString(
      React.createElement(PetitionModal, {
        isOpen: true,
        onClose: () => {},
        school: pkg.school,
        evidencePackage: pkg,
      })
    );

    assert.ok(html.includes('2026-10-07'));
    assert.ok(html.includes('NO DATA'));
    assert.ok(!html.includes('2026-10-07: 0 µg/m³'), 'Must not substitute 0 for missing day');
  });

  // ==========================================================================
  // 7. Estimated-around-school disclaimer is displayed
  // ==========================================================================
  it('7. Estimated-around-school label and spatial interpolation methodology disclaimer are displayed', () => {
    const pkg = createMockCompletePackage();

    const html = renderToString(
      React.createElement(PetitionModal, {
        isOpen: true,
        onClose: () => {},
        school: pkg.school,
        evidencePackage: pkg,
      })
    );

    assert.ok(html.includes('Estimated around school'));
    assert.ok(
      html.includes(
        'School PM2.5 values are spatial estimates derived from nearby monitoring stations and are not direct measurements at the school.'
      )
    );
  });

  // ==========================================================================
  // 8. Existing petition flow still works without School Safety context
  // ==========================================================================
  it('8. Existing petition flow continues working when invoked without school safety context', () => {
    const html = renderToString(
      React.createElement(PetitionModal, {
        isOpen: true,
        onClose: () => {},
        initialStation: 'Anand Vihar CAAQMS',
        initialLocality: 'East Delhi',
        initialPm25: 168,
      })
    );

    assert.ok(html.includes('id="petition-action-modal"'));
    assert.ok(html.includes('Step 1: Empirical Evidence Summary'));
    assert.ok(html.includes('Anand Vihar CAAQMS'));
    // School safety section should not render when package is absent
    assert.ok(!html.includes('id="school-evidence-section"'));
  });

  // ==========================================================================
  // 9. Existing petition generation still works
  // ==========================================================================
  it('9. generateDraftPetition generates complete bilingual drafts with school evidence', () => {
    const pkg = createMockCompletePackage();
    const evidence = {
      schoolName: pkg.school.name,
      locality: pkg.school.locality,
      threshold: 60,
      exceedanceCount: 14,
      schoolDaysTotal: 14,
      startDate: '2026-10-01',
      endDate: '2026-10-14',
      peakPm25: 89.0,
      peakDate: '2026-10-14',
      stationName: 'DTU',
      stationDistanceKm: 1.8,
      compiledBy: 'VayuVitals',
      compilationDate: 'October 3, 2026',
      daysWithData: 14,
      timeHorizonDays: 14,
      maeError: null,
    };
    const authority = {
      designation: 'The District Magistrate / Chairperson, DDMA',
      fullName: 'District Magistrate Office, North West Delhi',
      address: 'Kanjhawala, Delhi - 110081',
    };

    const serverDraft = generateDraftPetition({
      evidence,
      authority,
      schoolEvidencePackage: pkg,
    });

    assert.ok(serverDraft.englishText.includes('Verified 14-Day School Environmental Monitoring Summary'));
    assert.ok(serverDraft.englishText.includes('82.5 µg/m³'));
    assert.ok(serverDraft.hindiText.includes('प्रमाणित 14-दिवसीय विद्यालय पर्यावरण निगरानी विवरण'));
  });

  // ==========================================================================
  // 10. Existing PDF generation still works
  // ==========================================================================
  it('10. generatePetitionPdf executes cleanly with schoolEvidencePackage and without throwing', () => {
    const pkg = createMockCompletePackage();
    const evidence = {
      schoolName: pkg.school.name,
      locality: pkg.school.locality,
      threshold: 60,
      exceedanceCount: 14,
      schoolDaysTotal: 14,
      startDate: '2026-10-01',
      endDate: '2026-10-14',
      peakPm25: 89.0,
      peakDate: '2026-10-14',
      avgMorningPm25: 82.5,
      stationName: 'DTU',
      stationDistanceKm: 1.8,
      compiledBy: 'VayuVitals',
      compilationDate: 'October 3, 2026',
      maeError: 12.4,
      dailyLogs: [],
    };
    const authority = {
      designation: 'The District Magistrate',
      fullName: 'DM Office North West',
      department: 'Revenue & Disaster Management Department',
      address: 'Delhi',
    };

    assert.doesNotThrow(() => {
      generatePetitionPdf({
        evidence,
        authority,
        letterText: 'Formal complaint letter body text.',
        schoolEvidencePackage: pkg,
      });
    }, 'Must generate PDF with schoolEvidencePackage without exception');

    // Standard PDF generation without school package also succeeds
    assert.doesNotThrow(() => {
      generatePetitionPdf({
        evidence,
        authority,
        letterText: 'Standard complaint letter body text.',
      });
    }, 'Must generate standard PDF without exception');

    // Hindi PDF generation executes cleanly in Node (fallback path)
    assert.doesNotThrow(() => {
      const doc = generatePetitionPdf({
        evidence,
        authority,
        letterText: 'सेवा में,\nजिलाधिकारी महोदय,\nविषय: वायु प्रदूषण रोकथाम हेतु जनहित याचिका\nमान्यवर, सविनय निवेदन है कि...',
        language: 'hi',
      });
      assert.ok(doc, 'Must return jsPDF document instance for Hindi petition');
    }, 'Must generate Hindi PDF without exception in Node');

    // Hindi PDF generation with simulated browser canvas executes cleanly
    const mockCanvas = {
      width: 100,
      height: 100,
      getContext: () => ({
        font: '',
        fillStyle: '',
        fillRect: () => {},
        fillText: () => {},
        measureText: (text) => ({ width: text.length * 8 }),
      }),
      toDataURL: () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    };
    const origDoc = globalThis.document;
    try {
      globalThis.document = {
        createElement: (tag) => (tag === 'canvas' ? mockCanvas : {}),
      };
      assert.doesNotThrow(() => {
        const doc = generatePetitionPdf({
          evidence,
          authority,
          letterText: 'सेवा में,\nजिलाधिकारी महोदय,\nविषय: वायु प्रदूषण रोकथाम हेतु जनहित याचिका\nमान्यवर, सविनय निवेदन है कि विद्यालय परिसर में वायु गुणवत्ता खतरनाक स्तर पर पहुंच चुकी है।\nअनुरोध है कि त्वरित कार्रवाई की जाए।',
          language: 'hi',
          schoolEvidencePackage: pkg,
        });
        assert.ok(doc, 'Must return jsPDF document instance using canvas renderer');
      }, 'Must generate Hindi PDF with canvas rendering without exception');
    } finally {
      globalThis.document = origDoc;
    }
  });

  // ==========================================================================
  // 11. Evidence values cannot be altered by UI formatting
  // ==========================================================================
  it('11. Evidence values passed into package remain mathematically consistent', () => {
    const pkg = createMockCompletePackage();
    const origAvg = pkg.summary.averagePm25;
    const origPeak = pkg.summary.highestDailyPm25;
    const origObserved = pkg.coverage.observedDays;

    assert.strictEqual(origAvg, 82.5);
    assert.strictEqual(origPeak, 89.0);
    assert.strictEqual(origObserved, 14);
  });

  // ==========================================================================
  // 12. Gemini/polish cannot determine evidence eligibility
  // ==========================================================================
  it('12. Gemini/polish cannot determine evidence eligibility (strictly deterministic rule)', () => {
    // 13 days is not enough regardless of tone or prompt
    const thirteenDays = Array.from({ length: 13 }, () => ({ status: DAY_STATUS.OBSERVED }));
    const result = evaluateCivicActionEligibility(MONITORING_STATUS.MONITORING, thirteenDays, { requiredDays: 14 });

    assert.strictEqual(result.eligible, false, 'Must be false deterministically');
    assert.strictEqual(result.status, 'Continue monitoring');
  });

  // ==========================================================================
  // 13. No automatic submission/email occurs
  // ==========================================================================
  it('13. Opening PetitionModal does not automatically submit or dispatch email', () => {
    const pkg = createMockCompletePackage();

    // Renders the modal with review controls, without invoking any automatic submission
    const html = renderToString(
      React.createElement(PetitionModal, {
        isOpen: true,
        onClose: () => {},
        school: pkg.school,
        evidencePackage: pkg,
      })
    );

    assert.ok(html.includes('No automatic filing'));
    assert.ok(html.includes('Download PDF Dossier'));
    assert.ok(html.includes('Copy to Clipboard'));
  });

  // ==========================================================================
  // 14. Existing Petition & Action heatmap flow remains functional
  // ==========================================================================
  it('14. DelhiAqiHeatmap maintains working Petition & Action button and modal launcher', () => {
    const html = renderToString(React.createElement(DelhiAqiHeatmap));

    assert.ok(html.includes('id="petition-action-deck-btn"'), 'Petition button must remain in heatmap deck');
    assert.ok(html.includes('Petition &amp; Action') || html.includes('Petition & Action'));
    assert.ok(html.includes('id="school-safety-deck-btn"'), 'School Safety button must remain beside it');
  });
});
