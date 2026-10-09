/**
 * tests/petitionSaveContract.test.js
 * Verification of flat save contract, deduplication, LSI index, and mobile clean fallbacks.
 * Part of Cognito Fix Plan v2 (A1 & A5).
 */

import test, { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import {
  createPetition,
  listPetitionsByUser,
  setTestDocClient,
  resetTestDocClient
} from '../server/petitionsService.js';

import { buildSavePayload } from '../src/components/Petition/petitionHelpers.js';

import {
  saveDocket
} from '../mobile/src/services/petitionService.js';

import {
  setTestSession,
  clearTestSession
} from '../mobile/src/services/authService.js';

describe('Petition Save Contract & Deduplication (A1 & A5)', () => {
  let mockStore = [];
  let lastQueryCommand = null;

  const createMockDdb = () => {
    return {
      send: async (command) => {
        const cmdName = command.constructor.name;

        if (cmdName === 'PutCommand' || command.input?.Item) {
          const item = command.input.Item;
          const idx = mockStore.findIndex(
            x => x.userSub === item.userSub && x.petitionId === item.petitionId
          );
          if (idx >= 0) {
            if (command.input?.ConditionExpression?.includes('attribute_not_exists')) {
              const err = new Error('The conditional request failed');
              err.name = 'ConditionalCheckFailedException';
              throw err;
            }
            mockStore[idx] = { ...item };
          } else {
            mockStore.push({ ...item });
          }
          return {};
        }

        if (cmdName === 'GetCommand') {
          const { userSub, petitionId } = command.input.Key;
          const found = mockStore.find(x => x.userSub === userSub && x.petitionId === petitionId);
          return { Item: found ? { ...found } : undefined };
        }

        if (cmdName === 'QueryCommand') {
          lastQueryCommand = command.input;
          const { KeyConditionExpression, ExpressionAttributeValues, IndexName, ScanIndexForward } = command.input;
          let results = [];

          if (IndexName === 'userSub-createdAt-index') {
            const sub = ExpressionAttributeValues[':sub'];
            results = mockStore.filter(x => x.userSub === sub);
            if (ScanIndexForward === false) {
              results.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            } else {
              results.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
            }
          } else if (IndexName === 'schoolId-createdAt-index') {
            const sId = ExpressionAttributeValues[':sId'];
            results = mockStore.filter(x => x.schoolId === sId);
          } else {
            const sub = ExpressionAttributeValues[':sub'];
            results = mockStore.filter(x => x.userSub === sub);
          }

          return { Items: results.map(r => ({ ...r })) };
        }

        return {};
      }
    };
  };

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    mockStore = [];
    lastQueryCommand = null;
    setTestDocClient(createMockDdb());
  });

  afterEach(async () => {
    resetTestDocClient();
    mockStore = [];
    await clearTestSession();
  });

  it('1. buildSavePayload creates valid flat school and station payloads', () => {
    // School payload
    const schoolPayload = buildSavePayload({
      selectedSchoolId: 'dps_rk_puram',
      currentAuthority: {
        fullName: 'Directorate of Education',
        designation: 'Director',
        email: 'diredu@nic.in',
        department: 'DoE'
      },
      letterSubject: 'Air Quality Emergency',
      activeLetterText: 'Honorable Director, our students are suffering...',
      saveRequestId: 'req-school-12345678',
      status: 'DRAFT_SAVED'
    });

    assert.strictEqual(schoolPayload.targetType, 'school');
    assert.strictEqual(schoolPayload.schoolId, 'dps_rk_puram');
    assert.strictEqual(schoolPayload.stationName, undefined);
    assert.strictEqual(schoolPayload.target, undefined);
    assert.strictEqual(schoolPayload.letterBody, undefined);
    assert.strictEqual(schoolPayload.authorityName, 'Directorate of Education');
    assert.strictEqual(schoolPayload.clientRequestId, 'req-school-12345678');

    // Station payload
    const stationPayload = buildSavePayload({
      stationName: 'R.K. Puram, Delhi - DPCC',
      currentAuthority: {
        name: 'DPCC',
        designation: 'Member Secretary',
        email: 'dpcc@nic.in'
      },
      letterSubject: 'CAAQMS Inversion Notice',
      activeLetterText: 'Station levels exceed statutory limits...',
      saveRequestId: 'req-station-12345678',
      status: 'OPENED_IN_MAIL'
    });

    assert.strictEqual(stationPayload.targetType, 'station');
    assert.strictEqual(stationPayload.stationName, 'R.K. Puram, Delhi - DPCC');
    assert.strictEqual(stationPayload.schoolId, undefined);
    assert.strictEqual(stationPayload.target, undefined);
    assert.strictEqual(stationPayload.authorityName, 'DPCC');

    // Neither throws error
    assert.throws(
      () => buildSavePayload({ currentAuthority: { name: 'CPCB' } }),
      /Choose a school or a monitoring station before saving\./
    );
  });

  it('2. createPetition accepts output of buildSavePayload for school and station', async () => {
    const schoolPayload = buildSavePayload({
      selectedSchoolId: 'dps_rk_puram',
      locality: 'R.K. Puram',
      currentAuthority: { name: 'DoE' },
      letterSubject: 'School Recess Action Request',
      activeLetterText: 'Please halt recess outdoors during peak AQI.',
      saveRequestId: 'req-school-saved-8888',
      status: 'DRAFT_SAVED'
    });

    const schoolResult = await createPetition({
      userSub: 'user-sub-school-1',
      petitionData: schoolPayload
    });

    assert.ok(schoolResult.petitionId.startsWith('pet_'));
    assert.strictEqual(schoolResult.targetType, 'school');
    assert.strictEqual(schoolResult.schoolId, 'dps_rk_puram');
    assert.strictEqual(schoolResult.authorityName, 'DoE');

    const stationPayload = buildSavePayload({
      stationName: 'R.K. Puram',
      locality: 'South West Delhi',
      currentAuthority: { name: 'CPCB' },
      letterSubject: 'Station Notice',
      activeLetterText: 'Peak readings violate statutory standards.',
      saveRequestId: 'req-station-saved-9999',
      status: 'DRAFT_SAVED'
    });

    const stationResult = await createPetition({
      userSub: 'user-sub-station-1',
      petitionData: stationPayload
    });

    assert.ok(stationResult.petitionId.startsWith('pet_'));
    assert.strictEqual(stationResult.targetType, 'station');
    assert.strictEqual(stationResult.stationName, 'R.K. Puram');
  });

  it('3. Bodies with legacy target or letterBody are rejected with 400', async () => {
    await assert.rejects(
      async () => {
        await createPetition({
          userSub: 'sub-legacy-1',
          petitionData: {
            clientRequestId: 'req-leg-12345678',
            targetType: 'school',
            schoolId: 'dps_rohini',
            target: { type: 'school', id: 'dps_rohini' },
            letterSubject: 'Subject',
            letterText: 'Text',
            authorityName: 'Authority'
          }
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /flat format/);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await createPetition({
          userSub: 'sub-legacy-2',
          petitionData: {
            clientRequestId: 'req-leg-87654321',
            targetType: 'school',
            schoolId: 'dps_rohini',
            letterBody: 'Legacy letter body',
            letterSubject: 'Subject',
            letterText: 'Text',
            authorityName: 'Authority'
          }
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /flat format/);
        return true;
      }
    );
  });

  it('4. Missing letterText, letterSubject, or authorityName rejected with 400', async () => {
    const base = {
      clientRequestId: 'req-fields-12345678',
      targetType: 'school',
      schoolId: 'dps_rohini'
    };

    // Missing authorityName
    await assert.rejects(
      async () => {
        await createPetition({
          userSub: 'sub-fields-1',
          petitionData: { ...base, letterSubject: 'Subj', letterText: 'Text' }
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /authorityName is required/);
        return true;
      }
    );

    // Missing letterSubject
    await assert.rejects(
      async () => {
        await createPetition({
          userSub: 'sub-fields-2',
          petitionData: { ...base, authorityName: 'DoE', letterText: 'Text' }
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /letterSubject is required/);
        return true;
      }
    );

    // Missing letterText
    await assert.rejects(
      async () => {
        await createPetition({
          userSub: 'sub-fields-3',
          petitionData: { ...base, authorityName: 'DoE', letterSubject: 'Subj' }
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /letterText is required/);
        return true;
      }
    );
  });

  it('5. Missing or malformed clientRequestId rejected with 400', async () => {
    const base = {
      targetType: 'school',
      schoolId: 'dps_rohini',
      authorityName: 'DoE',
      letterSubject: 'Subj',
      letterText: 'Text'
    };

    // Missing
    await assert.rejects(
      async () => {
        await createPetition({ userSub: 'sub-req-1', petitionData: { ...base } });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /clientRequestId is required and must match/);
        return true;
      }
    );

    // Too short (< 8 chars)
    await assert.rejects(
      async () => {
        await createPetition({ userSub: 'sub-req-2', petitionData: { ...base, clientRequestId: 'short' } });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /clientRequestId is required and must match/);
        return true;
      }
    );

    // Invalid characters
    await assert.rejects(
      async () => {
        await createPetition({ userSub: 'sub-req-3', petitionData: { ...base, clientRequestId: 'invalid_spaces and chars!' } });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /clientRequestId is required and must match/);
        return true;
      }
    );
  });

  it('6. Same clientRequestId twice triggers atomic duplicate detection with same petitionId', async () => {
    const userSub = 'sub-dup-user-123';
    const clientRequestId = 'unique-request-id-12345678';

    const payload = {
      clientRequestId,
      targetType: 'school',
      schoolId: 'dps_rohini',
      authorityName: 'DoE',
      letterSubject: 'Grievance',
      letterText: 'Detailed complaint'
    };

    const first = await createPetition({ userSub, petitionData: payload });
    assert.strictEqual(first.isDuplicate, undefined);
    assert.ok(first.petitionId.startsWith('pet_'));

    // Expected deterministic ID
    const expectedId = 'pet_' + crypto.createHash('sha256').update(`${userSub}:${clientRequestId}`).digest('hex').slice(0, 32);
    assert.strictEqual(first.petitionId, expectedId);

    // Second call with same clientRequestId
    const second = await createPetition({ userSub, petitionData: payload });
    assert.strictEqual(second.isDuplicate, true);
    assert.strictEqual(second.petitionId, first.petitionId);
    assert.strictEqual(mockStore.length, 1, 'DynamoDB must only have 1 record stored');
  });

  it('7. listPetitionsByUser queries userSub-createdAt-index with ScanIndexForward: false', async () => {
    const userSub = 'sub-list-user-123';

    await createPetition({
      userSub,
      petitionData: {
        clientRequestId: 'req-item-1-12345678',
        targetType: 'school',
        schoolId: 'dps_rohini',
        authorityName: 'DoE',
        letterSubject: 'One',
        letterText: 'Text 1'
      }
    });

    await createPetition({
      userSub,
      petitionData: {
        clientRequestId: 'req-item-2-12345678',
        targetType: 'school',
        schoolId: 'dps_rohini',
        authorityName: 'DoE',
        letterSubject: 'Two',
        letterText: 'Text 2'
      }
    });

    const result = await listPetitionsByUser(userSub);
    assert.strictEqual(result.items.length, 2);
    assert.ok(lastQueryCommand, 'QueryCommand must have been executed');
    assert.strictEqual(lastQueryCommand.IndexName, 'userSub-createdAt-index');
    assert.strictEqual(lastQueryCommand.ScanIndexForward, false);
  });

  it('8. Mobile saveDocket throws informative error when signed out and on 400 server response', async () => {
    await clearTestSession();

    // Signed out check
    await assert.rejects(
      async () => {
        await saveDocket({
          targetType: 'school',
          schoolId: 'dps_rohini',
          authority: { name: 'DoE' },
          subject: 'Subj',
          activeDraftText: 'Text',
          clientRequestId: 'req-signedout-123'
        });
      },
      /Please sign in to save petitions\./
    );

    // Signed in with server 400 error
    await setTestSession();
    const origFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => ({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid school ID provided.' })
      });

      await assert.rejects(
        async () => {
          await saveDocket({
            targetType: 'school',
            schoolId: 'dps_rohini',
            authority: { name: 'DoE' },
            subject: 'Subj',
            activeDraftText: 'Text',
            clientRequestId: 'req-fail-12345678'
          });
        },
        /Invalid school ID provided\./
      );
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('9. mobile/src/services/petitionService.js does not contain deleted fallback strings', () => {
    const filePath = path.join(process.cwd(), 'mobile', 'src', 'services', 'petitionService.js');
    const content = fs.readFileSync(filePath, 'utf8');

    const forbiddenStrings = [
      'dps_rohini',
      'R.K. Puram CAAQMS',
      'cpcb@nic.in',
      'Central Pollution Control Board',
      'Community Zone',
      'Delhi NCR'
    ];

    for (const str of forbiddenStrings) {
      assert.strictEqual(
        content.includes(str),
        false,
        `mobile/src/services/petitionService.js must not contain deleted fallback: "${str}"`
      );
    }
  });
});
