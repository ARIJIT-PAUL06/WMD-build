import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DOCKET_STATUS,
  saveDocket,
  getAllDockets,
  updateDocketStatus,
  deleteDocket,
  deleteAllDockets,
  checkRecentDuplicate,
  saveSenderProfile,
  getSenderProfile,
  fetchEvidence
} from '../mobile/src/services/petitionService.js';

describe('Mobile Petition Service Unit Tests (Phase 3)', () => {
  beforeEach(async () => {
    await deleteAllDockets();
  });

  it('1. DOCKET_STATUS defines strictly honest statuses', () => {
    assert.strictEqual(DOCKET_STATUS.DRAFT, 'Draft');
    assert.strictEqual(DOCKET_STATUS.OPENED_IN_MAIL, 'Opened in mail');
    assert.strictEqual(DOCKET_STATUS.SHARED, 'Shared');
    assert.strictEqual(DOCKET_STATUS.MARKED_AS_SENT, 'Marked as sent');
    assert.strictEqual(DOCKET_STATUS.UNDER_REVIEW, undefined, 'Under Review must not exist per §3.2');
    assert.strictEqual(DOCKET_STATUS.DISPATCHED, undefined, 'Dispatched must not exist per §3.2');
  });

  it('2. saveDocket stores an immutable evidence snapshot and generates a local referenceId', async () => {
    const docketData = {
      targetType: 'school',
      targetName: 'Delhi Public School, Rohini',
      locality: 'Rohini Sector 16',
      authorityId: 'dpcc',
      authorityName: 'Delhi Pollution Control Committee',
      authorityEmail: 'msdpcc@nic.in',
      evidence: {
        schoolName: 'Delhi Public School, Rohini',
        stationName: 'DTU',
        daysWithData: 10,
        peakPm25: 180
      },
      subject: 'Urgent Grievance on Morning Air Quality',
      letterTextEn: 'Dear Authority, verified data indicates...',
      letterTextHi: 'सेवा में, प्रमाणित डेटा...',
      senderName: 'Sanjay Kumar',
      senderRole: 'PTA Representative',
      senderContact: 'sanjay@example.com'
    };

    const saved = await saveDocket(docketData);
    assert.ok(saved.id);
    assert.ok(saved.referenceId.startsWith('VV-2026-'));
    assert.strictEqual(saved.status, DOCKET_STATUS.DRAFT);
    assert.strictEqual(saved.targetName, 'Delhi Public School, Rohini');
    assert.strictEqual(saved.evidenceSnapshot.peakPm25, 180);

    const all = await getAllDockets();
    assert.strictEqual(all.length, 1);
    assert.strictEqual(all[0].id, saved.id);
  });

  it('3. updateDocketStatus transitions statuses truthfully', async () => {
    const saved = await saveDocket({
      targetName: 'Springdales School, Dhaula Kuan',
      authorityId: 'doe_delhi',
      subject: 'School Recess Air Quality Grievance'
    });

    const updated = await updateDocketStatus(saved.id, DOCKET_STATUS.OPENED_IN_MAIL);
    assert.strictEqual(updated.status, 'Opened in mail');

    const sent = await updateDocketStatus(saved.id, DOCKET_STATUS.MARKED_AS_SENT);
    assert.strictEqual(sent.status, 'Marked as sent');

    const all = await getAllDockets();
    assert.strictEqual(all[0].status, 'Marked as sent');
  });

  it('4. deleteDocket and deleteAllDockets enforce right to erasure (DPDP Act)', async () => {
    const d1 = await saveDocket({ targetName: 'School A', authorityId: 'mcd' });
    const d2 = await saveDocket({ targetName: 'School B', authorityId: 'dpcc' });

    let all = await getAllDockets();
    assert.strictEqual(all.length, 2);

    await deleteDocket(d1.id);
    all = await getAllDockets();
    assert.strictEqual(all.length, 1);
    assert.strictEqual(all[0].id, d2.id);

    await deleteAllDockets();
    all = await getAllDockets();
    assert.strictEqual(all.length, 0);
  });

  it('5. checkRecentDuplicate detects filings within 7 days', async () => {
    await saveDocket({
      targetName: 'Delhi Public School, Rohini',
      authorityId: 'dpcc'
    });

    const duplicateCheck = await checkRecentDuplicate('Delhi Public School, Rohini', 'dpcc');
    assert.strictEqual(duplicateCheck.isDuplicate, true);

    const differentAuthCheck = await checkRecentDuplicate('Delhi Public School, Rohini', 'doe_delhi');
    assert.strictEqual(differentAuthCheck.isDuplicate, false);
  });

  it('6. Sender Profile persists on device', async () => {
    const profile = {
      name: 'Dr. Ramesh Sharma',
      role: 'Principal',
      email: 'principal@school.ac.in',
      phone: '+91 98100 12345'
    };
    await saveSenderProfile(profile);
    const loaded = await getSenderProfile();
    assert.deepStrictEqual(loaded, profile);
  });

  it('7. fetchEvidence throws on network failure without synthesizing data', async () => {
    const originalFetch = globalThis.fetch;
    try {
      // Simulate network disconnection
      globalThis.fetch = async () => {
        throw new Error('Network request failed');
      };

      await assert.rejects(
        async () => {
          await fetchEvidence({ schoolName: 'Delhi Public School' });
        },
        /Network request failed/,
        'Must reject with network error instead of synthesizing fake telemetry'
      );

      // Simulate 500 server error
      globalThis.fetch = async () => ({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      });

      await assert.rejects(
        async () => {
          await fetchEvidence({ schoolName: 'Delhi Public School' });
        },
        /Internal server error/,
        'Must reject with server error instead of falling back to Math.sin formulas'
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
