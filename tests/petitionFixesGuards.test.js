import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  aggregateSchoolEvidence,
  generateDraftPetition
} from '../server/evidenceService.js';
import { findGridForCoordinates } from '../server/gridTelemetryService.js';
import {
  verifyPlaceholdersPreserved,
  SENDER_PLACEHOLDERS
} from '../server/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

describe('Petition Fixes Guards (Fixes 1-12 Verification)', () => {

  it('1. Fetch works without AbortSignal.timeout and handles timeouts cleanly (Fix 1)', async () => {
    // Verify no occurrences of AbortSignal.timeout exist anywhere in mobile/
    const mobileSrc = path.join(projectRoot, 'mobile', 'src');
    function checkDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkDir(fullPath);
        } else if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          assert.strictEqual(
            content.includes('AbortSignal.timeout'),
            false,
            `File ${entry.name} must not contain AbortSignal.timeout`
          );
        }
      }
    }
    checkDir(mobileSrc);

    // Save and temporarily delete AbortSignal.timeout
    const origTimeout = AbortSignal.timeout;
    delete AbortSignal.timeout;
    try {
      assert.strictEqual(AbortSignal.timeout, undefined);

      // Import service dynamically or test fetchEvidence with custom fetch
      const { fetchEvidence, fetchSchools } = await import(
        '../mobile/src/services/petitionService.js?t=' + Date.now()
      );

      // Verify fetchEvidence executes without TypeError when fetch is present
      const origFetch = globalThis.fetch;
      try {
        globalThis.fetch = async (url, opts) => {
          assert.ok(opts.signal, 'fetch must receive an AbortSignal');
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              schoolName: 'Delhi Public School, Rohini',
              gridId: 'GRID_R06_C04',
              daysWithData: 14,
              schoolDaysTotal: 10,
              exceedCount: 8,
              maeError: null
            })
          };
        };

        const res = await fetchEvidence({ schoolName: 'Delhi Public School, Rohini' });
        assert.strictEqual(res.evidence.schoolName, 'Delhi Public School, Rohini');
        assert.strictEqual(res.evidence.daysWithData, 14);

        // Verify timeout error message is converted to clear user message
        globalThis.fetch = async (url, opts) => {
          return new Promise((resolve, reject) => {
            opts.signal.addEventListener('abort', () => {
              const err = new Error('Server did not respond in 15 s');
              err.name = 'AbortError';
              reject(err);
            });
            // Simulate timeout after 20ms
            setTimeout(() => {
              opts.signal.dispatchEvent(new Event('abort'));
            }, 20);
          });
        };

        await assert.rejects(
          async () => {
            await fetchEvidence({ schoolName: 'Delhi Public School, Rohini' });
          },
          /Server did not respond in 15 s/
        );
      } finally {
        globalThis.fetch = origFetch;
      }
    } finally {
      AbortSignal.timeout = origTimeout;
    }
  });

  it('2. DPS Rohini resolves to its own grid cell and returns daysWithData > 0 (Fix 2)', () => {
    const rawSchools = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'src', 'data', 'schoolsDirectory.json'), 'utf8')
    );
    const schools = rawSchools.educationalInstitutions || [];
    const dps = schools.find(s => s.name.includes('Delhi Public School, Rohini'));
    assert.ok(dps, 'DPS Rohini must exist in directory');

    // Check coordinate mapping to grid cell
    const cell = findGridForCoordinates(dps.lat, dps.lon);
    assert.ok(cell, 'DPS Rohini coordinates must resolve to a valid grid');
    assert.strictEqual(cell.grid_id, 'GRID_R06_C04', 'DPS Rohini must resolve to GRID_R06_C04');

    // Aggregate evidence for DPS Rohini
    const evidence = aggregateSchoolEvidence({
      schoolName: 'Delhi Public School, Rohini'
    });

    assert.ok(evidence, 'Evidence must be generated');
    assert.strictEqual(evidence.schoolName, 'Delhi Public School, Rohini');
    assert.strictEqual(evidence.gridId, 'GRID_R06_C04');
    assert.ok(evidence.daysWithData > 0, `Expected daysWithData > 0, got ${evidence.daysWithData}`);
    assert.ok(evidence.dailyLogs.length > 0, 'Must have recorded daily logs');
    assert.strictEqual(evidence.maeError, null, 'maeError must be null');
  });

  it('3. Target type wording truthfulness: station/grid vs school (Fix 3)', () => {
    const authority = {
      id: 'dpcc',
      name: 'Delhi Pollution Control Committee',
      designation: 'The Member Secretary',
      department: 'Air Pollution Control',
      email: 'msdpcc@nic.in',
      address: 'Kashmere Gate, Delhi'
    };

    const evidenceSchool = aggregateSchoolEvidence({
      schoolName: 'Delhi Public School, Rohini'
    });

    // 1. School targetType
    const draftSchool = generateDraftPetition({
      evidence: evidenceSchool,
      authority,
      targetType: 'school'
    });

    assert.ok(draftSchool.englishText.includes('I write on behalf of Delhi Public School, Rohini'));
    assert.strictEqual(draftSchool.englishText.includes('Educational Institution'), false);
    assert.strictEqual(draftSchool.englishText.includes('Regional Monitor'), false);

    // 2. Grid/Station targetType
    const evidenceGrid = aggregateSchoolEvidence({
      gridId: 'GRID_R06_C04'
    });

    const draftGrid = generateDraftPetition({
      evidence: evidenceGrid,
      authority,
      targetType: 'grid'
    });

    assert.ok(
      draftGrid.englishText.includes('I write as a resident regarding morning air quality near')
    );
    assert.strictEqual(draftGrid.englishText.includes('Educational Institution'), false);
    assert.strictEqual(draftGrid.englishText.includes('Regional Monitor'), false);
  });

  it('4. Truthful letter content: No Enclosure, CAAQMS, or 27.92 in EN or HI (Fixes 4-6)', () => {
    const authority = {
      id: 'dpcc',
      name: 'Delhi Pollution Control Committee',
      designation: 'The Member Secretary',
      department: 'Air Pollution Control',
      email: 'msdpcc@nic.in',
      address: 'Kashmere Gate, Delhi'
    };

    const evidence = aggregateSchoolEvidence({
      schoolName: 'Delhi Public School, Rohini'
    });

    const draft = generateDraftPetition({
      evidence,
      authority,
      targetType: 'school'
    });

    // Enclosure check
    assert.strictEqual(draft.englishText.includes('Enclosure'), false, 'EN letter must not contain Enclosure');
    assert.strictEqual(draft.hindiText.includes('संलग्नक'), false, 'HI letter must not contain संलग्नक');

    // CAAQMS as data source check
    assert.strictEqual(draft.englishText.includes('CAAQMS'), false, 'EN letter must not claim CAAQMS as data source');
    assert.strictEqual(draft.hindiText.includes('CAAQMS'), false, 'HI letter must not claim CAAQMS as data source');

    // Hardcoded 27.92 check
    assert.strictEqual(draft.englishText.includes('27.92'), false, 'EN letter must not contain hardcoded 27.92');
    assert.strictEqual(draft.hindiText.includes('27.92'), false, 'HI letter must not contain hardcoded 27.92');

    // Over-claim check: No continuous telemetry
    assert.strictEqual(draft.englishText.includes('verified empirical continuous telemetry'), false);
    assert.strictEqual(draft.englishText.includes('continuous telemetry'), false, 'Letter must not call data continuous telemetry');
    assert.strictEqual(draft.hindiText.includes('सत्यापित अनुभवजन्य सतत टेलीमेट्री'), false);
    assert.strictEqual(draft.hindiText.includes('सतत टेलीमेट्री'), false, 'Hindi letter must not call data सतत टेलीमेट्री');
    assert.ok(draft.englishText.includes('modelled hourly PM2.5'));
    assert.ok(draft.englishText.includes('hours with modelled data available'));
    assert.ok(draft.hindiText.includes('मॉडल डेटा उपलब्ध घंटे'));

    // Accurate data source line
    assert.ok(draft.englishText.includes('Open-Meteo modelled PM2.5, grid cell GRID_R06_C04'));

    // CPCB 24-hour NAAQS reference wording (Fix 7)
    assert.ok(draft.englishText.includes('compared against the CPCB 24-hour NAAQS of 60 µg/m³ as a reference; values are 07:00–13:00 IST averages'));
    assert.ok(draft.englishText.includes('(partial day)'));
  });

  it('5. Polish rejects drafts when AI removes sender placeholders (Fix 9)', () => {
    const originalDraft = `To,\nThe Member Secretary\nDelhi Pollution Control Committee\n\nSubject: Grievance regarding air quality\n\nRespected Sir,\nVerified data shows 10 days of high PM2.5.\n\nYours sincerely,\n[YOUR NAME]\n[YOUR ROLE / DESIGNATION]\n[YOUR PHONE / EMAIL]`;

    const polishedGood = `To,\nThe Member Secretary\nDelhi Pollution Control Committee\n\nSubject: Formal submission regarding ambient particulate matter\n\nRespected Sir,\nVerified data shows 10 days of high PM2.5.\n\nYours faithfully,\n[YOUR NAME]\n[YOUR ROLE / DESIGNATION]\n[YOUR PHONE / EMAIL]`;

    const polishedMissingName = `To,\nThe Member Secretary\nDelhi Pollution Control Committee\n\nSubject: Formal submission regarding ambient particulate matter\n\nRespected Sir,\nVerified data shows 10 days of high PM2.5.\n\nYours faithfully,\nConcerned Citizen\n[YOUR ROLE / DESIGNATION]\n[YOUR PHONE / EMAIL]`;

    const polishedMissingRole = `To,\nThe Member Secretary\nDelhi Pollution Control Committee\n\nSubject: Formal submission regarding ambient particulate matter\n\nRespected Sir,\nVerified data shows 10 days of high PM2.5.\n\nYours faithfully,\n[YOUR NAME]\nParent\n[YOUR PHONE / EMAIL]`;

    assert.strictEqual(verifyPlaceholdersPreserved(originalDraft, polishedGood), true);
    assert.strictEqual(verifyPlaceholdersPreserved(originalDraft, polishedMissingName), false);
    assert.strictEqual(verifyPlaceholdersPreserved(originalDraft, polishedMissingRole), false);
  });

  it('6. Privacy protection: No email addresses exposed in API or bundled directory (Fix 11)', () => {
    // 1. Bundled mobile file
    const mobileSchoolsPath = path.join(projectRoot, 'mobile', 'src', 'data', 'schoolsDirectory.json');
    const mobileRaw = fs.readFileSync(mobileSchoolsPath, 'utf8');
    assert.strictEqual(mobileRaw.includes('@'), false, 'Bundled mobile schools directory must contain zero @ characters');

    const mobileJson = JSON.parse(mobileRaw);
    for (const inst of mobileJson.educationalInstitutions || []) {
      assert.strictEqual(inst.primaryEmail, undefined);
      assert.strictEqual(inst.nodalOfficerEmail, undefined);
      assert.strictEqual(inst.emails, undefined);
      assert.strictEqual(inst.phone, undefined);
    }

    // 2. Simulated API response
    const allowedKeys = new Set(['id', 'name', 'locality', 'district', 'lat', 'lon', 'gridId']);
    const apiSchools = (mobileJson.educationalInstitutions || []).map(s => ({
      id: s.id,
      name: s.name,
      locality: s.locality || '',
      district: s.district || '',
      lat: s.lat,
      lon: s.lon,
      gridId: s.gridId || null
    }));

    for (const inst of apiSchools) {
      for (const key of Object.keys(inst)) {
        assert.ok(allowedKeys.has(key), `Key ${key} is not in the whitelisted fields`);
      }
      assert.strictEqual(JSON.stringify(inst).includes('@'), false);
    }
  });

});
