import test, { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createPetition,
  getPetitionById,
  updatePetitionStatus,
  deletePetition,
  deleteAllPetitionsForUser,
  listPetitionsByUser,
  listPetitionsBySchool,
  setTestDocClient,
  resetTestDocClient,
  VALID_PETITION_STATUSES
} from '../server/petitionsService.js';
import { handler } from '../server/lambda.js';

describe('Cognito Fix Plan Phase 1 Verification Tests', () => {
  let mockStore = [];

  // In-memory DynamoDB Document Client mock for robust unit testing
  const createMockDdbClient = () => {
    return {
      send: async (command) => {
        const cmdName = command.constructor.name;

        if (cmdName === 'PutCommand' || command.input?.Item) {
          const item = command.input.Item;
          // Replace or insert
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

        if (cmdName === 'UpdateCommand') {
          const { userSub, petitionId } = command.input.Key;
          const found = mockStore.find(x => x.userSub === userSub && x.petitionId === petitionId);
          if (!found) {
            const err = new Error('The conditional request failed');
            err.name = 'ConditionalCheckFailedException';
            throw err;
          }
          found.status = command.input.ExpressionAttributeValues[':status'];
          found.updatedAt = command.input.ExpressionAttributeValues[':updatedAt'];
          return { Attributes: { ...found } };
        }

        if (cmdName === 'DeleteCommand') {
          const { userSub, petitionId } = command.input.Key;
          const idx = mockStore.findIndex(x => x.userSub === userSub && x.petitionId === petitionId);
          if (idx < 0) {
            const err = new Error('The conditional request failed');
            err.name = 'ConditionalCheckFailedException';
            throw err;
          }
          mockStore.splice(idx, 1);
          return {};
        }

        if (cmdName === 'QueryCommand') {
          const { KeyConditionExpression, ExpressionAttributeValues, FilterExpression, IndexName } = command.input;
          let results = [];

          if (IndexName === 'schoolId-createdAt-index') {
            const sId = ExpressionAttributeValues[':sId'];
            results = mockStore.filter(x => x.schoolId === sId);
          } else {
            const sub = ExpressionAttributeValues[':sub'];
            results = mockStore.filter(x => x.userSub === sub);
          }

          if (FilterExpression && FilterExpression.includes('clientRequestId = :crid')) {
            const crid = ExpressionAttributeValues[':crid'];
            results = results.filter(x => x.clientRequestId === crid);
          }

          // Order newest first
          results.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

          return { Items: results.map(r => ({ ...r })) };
        }

        return {};
      }
    };
  };

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    mockStore = [];
    setTestDocClient(createMockDdbClient());
  });

  afterEach(() => {
    resetTestDocClient();
    mockStore = [];
  });

  // =========================================================================
  // Target validation tests
  // =========================================================================
  it('1. Rejects missing or invalid targetType with 400', async () => {
    await assert.rejects(
      async () => {
        await createPetition({
          userSub: 'user-sub-1',
          petitionData: { letterSubject: 'Test' }
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /targetType is required/);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await createPetition({
          userSub: 'user-sub-1',
          petitionData: { targetType: 'space_station', targetName: 'ISS' }
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /Invalid targetType/);
        return true;
      }
    );
  });

  it('2. Rejects unknown schoolId with 400', async () => {
    await assert.rejects(
      async () => {
        await createPetition({
          userSub: 'user-sub-1',
          petitionData: {
            targetType: 'school',
            schoolId: 'UNKNOWN_NONEXISTENT_SCHOOL_999'
          }
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /Unknown schoolId/);
        return true;
      }
    );
  });

  it('3. Rejects unknown stationName with 400', async () => {
    await assert.rejects(
      async () => {
        await createPetition({
          userSub: 'user-sub-1',
          petitionData: {
            targetType: 'station',
            stationName: 'Antarctica Remote Base 01'
          }
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /Unknown stationName/);
        return true;
      }
    );
  });

  it('4. Rejects unknown gridId with 400', async () => {
    await assert.rejects(
      async () => {
        await createPetition({
          userSub: 'user-sub-1',
          petitionData: {
            targetType: 'grid',
            gridId: 'grid_9999_nonexistent'
          }
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /Unknown gridId/);
        return true;
      }
    );
  });

  // =========================================================================
  // Size limit tests (413)
  // =========================================================================
  it('5. Enforces size limits: letterSubject <= 300, letterText <= 20000, demands <= 20 of <= 300 (413)', async () => {
    // Subject too long
    await assert.rejects(
      async () => {
        await createPetition({
          userSub: 'user-sub-1',
          petitionData: {
            targetType: 'school',
            schoolId: 'SCH_DEL_0001',
            letterSubject: 'A'.repeat(301)
          }
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 413);
        assert.match(err.message, /letterSubject/);
        return true;
      }
    );

    // Letter text too long
    await assert.rejects(
      async () => {
        await createPetition({
          userSub: 'user-sub-1',
          petitionData: {
            targetType: 'school',
            schoolId: 'SCH_DEL_0001',
            letterText: 'B'.repeat(20001)
          }
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 413);
        assert.match(err.message, /letterText/);
        return true;
      }
    );

    // Too many demands
    await assert.rejects(
      async () => {
        await createPetition({
          userSub: 'user-sub-1',
          petitionData: {
            targetType: 'school',
            schoolId: 'SCH_DEL_0001',
            demands: Array(21).fill('Demand item')
          }
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 413);
        assert.match(err.message, /demands array exceeds/);
        return true;
      }
    );

    // Single demand too long
    await assert.rejects(
      async () => {
        await createPetition({
          userSub: 'user-sub-1',
          petitionData: {
            targetType: 'school',
            schoolId: 'SCH_DEL_0001',
            demands: ['Valid demand', 'C'.repeat(301)]
          }
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 413);
        assert.match(err.message, /300 characters/);
        return true;
      }
    );
  });

  // =========================================================================
  // Status and Evidence Computation
  // =========================================================================
  it('6. Rejects dishonest status "FILED" and defaults to honest "DRAFT_SAVED"', async () => {
    // Dishonest status rejected
    await assert.rejects(
      async () => {
        await createPetition({
          userSub: 'user-sub-1',
          petitionData: {
            targetType: 'school',
            schoolId: 'SCH_DEL_0001',
            status: 'FILED'
          }
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /Invalid status/);
        return true;
      }
    );

    // Default status is DRAFT_SAVED
    const created = await createPetition({
      userSub: 'user-sub-1',
      petitionData: {
        targetType: 'school',
        schoolId: 'dps_rk_puram',
        letterSubject: 'Air Quality Safety in R.K. Puram',
        letterText: 'Respected Authority, please take urgent action on campus air quality.',
        authorityName: 'Delhi Directorate of Education',
        clientRequestId: 'req-draft-saved-test-1'
      }
    });

    assert.strictEqual(created.status, 'DRAFT_SAVED');
    assert.strictEqual(created.schoolId, 'dps_rk_puram');
    assert.strictEqual(created.schoolName, 'Delhi Public School, R.K. Puram');
    assert.ok(created.evidenceSummary, 'Evidence summary must be server-computed');
    assert.strictEqual(typeof created.evidenceSummary.threshold, 'number');
  });

  // =========================================================================
  // Idempotency (repeat requests with clientRequestId)
  // =========================================================================
  it('7. Idempotent repeat requests with same clientRequestId return existing petition', async () => {
    const requestId = 'req-unique-token-abc-123';

    const p1 = await createPetition({
      userSub: 'user-idempotent-sub',
      petitionData: {
        targetType: 'school',
        schoolId: 'dps_rk_puram',
        letterSubject: 'First attempt',
        letterText: 'First attempt draft text',
        authorityName: 'Central Board'
      },
      clientRequestId: requestId
    });

    assert.ok(p1.petitionId);
    assert.strictEqual(p1.isDuplicate, undefined);

    const p2 = await createPetition({
      userSub: 'user-idempotent-sub',
      petitionData: {
        targetType: 'school',
        schoolId: 'dps_rk_puram',
        letterSubject: 'Second retry',
        letterText: 'Second retry draft text',
        authorityName: 'Central Board'
      },
      clientRequestId: requestId
    });

    assert.strictEqual(p2.petitionId, p1.petitionId);
    assert.strictEqual(p2.isDuplicate, true);
    assert.strictEqual(mockStore.length, 1, 'Store must not duplicate the item');
  });

  // =========================================================================
  // Owner-only status updates, deletion, and right to erasure
  // =========================================================================
  it('8. Only the owner can update status or delete, and right to erasure works', async () => {
    const p = await createPetition({
      userSub: 'user-owner-1',
      petitionData: {
        targetType: 'school',
        schoolId: 'dps_rk_puram',
        letterSubject: 'Owner petition subject',
        letterText: 'Owner petition letter body',
        authorityName: 'DPCC',
        clientRequestId: 'req-owner-test-01'
      }
    });

    // Owner updates status to OPENED_IN_MAIL
    const updated = await updatePetitionStatus({
      userSub: 'user-owner-1',
      petitionId: p.petitionId,
      status: 'OPENED_IN_MAIL'
    });
    assert.strictEqual(updated.status, 'OPENED_IN_MAIL');

    // Non-owner cannot update status -> 404
    await assert.rejects(
      async () => {
        await updatePetitionStatus({
          userSub: 'imposter-user-2',
          petitionId: p.petitionId,
          status: 'MARKED_AS_SENT'
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );

    // Non-owner cannot delete -> 404
    await assert.rejects(
      async () => {
        await deletePetition({
          userSub: 'imposter-user-2',
          petitionId: p.petitionId
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );

    // Owner can delete -> success
    const delResult = await deletePetition({
      userSub: 'user-owner-1',
      petitionId: p.petitionId
    });
    assert.strictEqual(delResult.success, true);
    assert.strictEqual(mockStore.length, 0);

    // Right to erasure: creates multiple petitions then deletes all for user
    await createPetition({ userSub: 'user-owner-1', petitionData: { targetType: 'school', schoolId: 'dps_rk_puram', letterSubject: 'Sub 1', letterText: 'Text 1', authorityName: 'DPCC', clientRequestId: 'req-erase-01' } });
    await createPetition({ userSub: 'user-owner-1', petitionData: { targetType: 'school', schoolId: 'dps_rk_puram', letterSubject: 'Sub 2', letterText: 'Text 2', authorityName: 'DPCC', clientRequestId: 'req-erase-02' } });
    await createPetition({ userSub: 'other-user', petitionData: { targetType: 'school', schoolId: 'dps_rk_puram', letterSubject: 'Sub 3', letterText: 'Text 3', authorityName: 'DPCC', clientRequestId: 'req-erase-03' } });

    assert.strictEqual(mockStore.length, 3);
    const eraseResult = await deleteAllPetitionsForUser('user-owner-1');
    assert.strictEqual(eraseResult.deletedCount, 2);
    assert.strictEqual(mockStore.length, 1);
    assert.strictEqual(mockStore[0].userSub, 'other-user');
  });

  // =========================================================================
  // School Admin View: Privacy and No Personal Details
  // =========================================================================
  it('9. School admin query returns safe fields only, strictly omitting personal details and letter text', async () => {
    await createPetition({
      userSub: 'sub-citizen-with-pii',
      petitionData: {
        targetType: 'school',
        schoolId: 'dps_rk_puram',
        senderName: 'John Citizen',
        senderRole: 'Concerned Parent',
        senderContact: '+91 98765 43210',
        authorityName: 'District Education Officer',
        letterSubject: 'Urgent action required on morning AQI',
        letterText: 'My personal confidential letter text containing full details...',
        clientRequestId: 'req-school-admin-query-01'
      }
    });

    const { items } = await listPetitionsBySchool('dps_rk_puram');

    assert.strictEqual(items.length, 1);
    const adminRecord = items[0];

    // Safe fields present
    assert.ok(adminRecord.petitionId);
    assert.ok(adminRecord.createdAt);
    assert.strictEqual(adminRecord.authorityName, 'District Education Officer');
    assert.strictEqual(adminRecord.letterSubject, 'Urgent action required on morning AQI');
    assert.strictEqual(adminRecord.status, 'DRAFT_SAVED');
    assert.ok(adminRecord.evidenceSummary);

    // PII & sensitive fields MUST BE STRIPPED
    assert.strictEqual(adminRecord.senderName, undefined);
    assert.strictEqual(adminRecord.senderRole, undefined);
    assert.strictEqual(adminRecord.senderContact, undefined);
    assert.strictEqual(adminRecord.letterText, undefined);
    assert.strictEqual(adminRecord.userSub, undefined);
  });

  // =========================================================================
  // Station Petitions Do Not Set schoolId (Sparse GSI Indexing)
  // =========================================================================
  it('10. Station petitions do not set schoolId so they never appear in the school admin GSI', async () => {
    const stationPet = await createPetition({
      userSub: 'sub-station-user',
      petitionData: {
        targetType: 'station',
        stationName: 'R.K. Puram CAAQMS',
        letterSubject: 'Station grievance',
        letterText: 'Station grievance letter text',
        authorityName: 'CPCB',
        clientRequestId: 'req-station-query-01'
      }
    });

    assert.strictEqual(stationPet.targetType, 'station');
    assert.strictEqual(stationPet.schoolId, undefined, 'station petitions must not have schoolId');

    // Querying school admin index finds 0 items
    const { items } = await listPetitionsBySchool('unassigned');
    assert.strictEqual(items.length, 0);
  });

  // =========================================================================
  // Lambda Handler Events
  // =========================================================================
  it('11. Lambda handler cleanly distinguishes HTTP, EventBridge cron, and unknown events', async () => {
    // 11a: EventBridge Cron event
    const ebEvent = {
      source: 'aws.events',
      'detail-type': 'Scheduled Event',
      time: '2026-10-09T12:00:00Z'
    };
    const ebResult = await handler(ebEvent, {});
    assert.strictEqual(ebResult.statusCode, 200);
    const ebBody = JSON.parse(ebResult.body);
    assert.strictEqual(ebBody.trigger, 'EVENTBRIDGE_CRON');

    // 11b: Unknown non-HTTP, non-cron event
    const unknownEvent = {
      foo: 'bar',
      unexpectedPayload: true
    };
    const unknownResult = await handler(unknownEvent, {});
    assert.strictEqual(unknownResult.statusCode, 400);
    const unkBody = JSON.parse(unknownResult.body);
    assert.strictEqual(unkBody.error, 'unrecognized_event_type');
  });

  // =========================================================================
  // CloudFormation Template Integrity (A2 & A8)
  // =========================================================================
  it('12. CloudFormation templates enforce mutable school_id, admin-only write, and nodejs22.x runtime', () => {
    const templateYaml = fs.readFileSync('aws/template.yaml', 'utf8');
    const importYaml = fs.readFileSync('aws/template-import.yaml', 'utf8');

    // A2: school_id Mutable: true
    const schoolIdBlockMatch = templateYaml.match(/Name:\s*school_id[\s\S]*?Mutable:\s*(true|false)/);
    assert.ok(schoolIdBlockMatch, 'school_id attribute must exist in template.yaml');
    assert.strictEqual(schoolIdBlockMatch[1], 'true', 'school_id must have Mutable: true in Cognito User Pool Schema');

    // A2: Neither WriteAttributes contains custom:school_id
    const writeAttrMatches = templateYaml.match(/WriteAttributes:\s*\n(\s*-\s*[^\n]+\n)+/g) || [];
    for (const match of writeAttrMatches) {
      assert.ok(!match.includes('custom:school_id') && !match.includes('school_id'), 'WriteAttributes must not allow client writing of school_id');
    }

    // A8: No nodejs20.x in either template
    assert.ok(!templateYaml.includes('nodejs20.x'), 'template.yaml must not contain nodejs20.x');
    assert.ok(!importYaml.includes('nodejs20.x'), 'template-import.yaml must not contain nodejs20.x');
    assert.ok(templateYaml.includes('nodejs22.x'), 'template.yaml must use nodejs22.x');
    assert.ok(importYaml.includes('nodejs22.x'), 'template-import.yaml must use nodejs22.x');
  });
});
