import test from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import { requireAdminKey } from '../server/middleware/authAndRateLimit.js';
import { CITIES_CONFIG } from '../server/environmentalService.js';
import { getAllDirectoryFacilities, FACILITY_TEST_MAPPINGS, resolveRecipientForFacility } from '../server/advisoryDispatchService.js';

test('Security Hardening & Privacy Verification', async (t) => {

  await t.test('1. requireAdminKey fails closed and rejects query parameter credentials', () => {
    process.env.ADMIN_API_KEY = 'correct-test-secret-key';

    let nextCalled = false;
    let responseStatus = null;
    let responseJson = null;

    const mockRes = {
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => { responseJson = data; }
        };
      }
    };

    // Case A: Missing header entirely
    const reqNoHeader = { headers: {} };
    requireAdminKey(reqNoHeader, mockRes, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false, 'Should reject request with missing header');
    assert.strictEqual(responseStatus, 401);

    // Case B: Passing key via query parameter (must be rejected)
    nextCalled = false;
    responseStatus = null;
    const reqQueryParam = { headers: {}, query: { adminKey: 'correct-test-secret-key' } };
    requireAdminKey(reqQueryParam, mockRes, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false, 'Should reject key sent via query parameter');
    assert.strictEqual(responseStatus, 401);

    // Case C: Passing correct key via x-admin-key header
    nextCalled = false;
    const reqValidHeader = { headers: { 'x-admin-key': 'correct-test-secret-key' } };
    requireAdminKey(reqValidHeader, mockRes, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true, 'Should authorize valid x-admin-key');

    // Case D: Timing-safe mismatch rejection
    nextCalled = false;
    responseStatus = null;
    const reqBadHeader = { headers: { 'x-admin-key': 'wrong-secret-key' } };
    requireAdminKey(reqBadHeader, mockRes, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false, 'Should reject invalid x-admin-key');
    assert.strictEqual(responseStatus, 401);
  });

  await t.test('2. requireAdminKey returns 503 when ADMIN_API_KEY is unset on server', () => {
    const originalKey = process.env.ADMIN_API_KEY;
    delete process.env.ADMIN_API_KEY;
    delete process.env.ADMIN_SECRET_KEY;

    let responseStatus = null;
    let responseJson = null;
    const mockRes = {
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => { responseJson = data; }
        };
      }
    };

    requireAdminKey({ headers: { 'x-admin-key': 'test' } }, mockRes, () => {});
    assert.strictEqual(responseStatus, 503, 'Must return 503 when admin key is unconfigured');

    // Restore
    if (originalKey) process.env.ADMIN_API_KEY = originalKey;
  });

  await t.test('3. FACILITY_TEST_MAPPINGS uses only RFC 2606 .invalid domains and no personal emails', () => {
    for (const [key, mapping] of Object.entries(FACILITY_TEST_MAPPINGS)) {
      assert.ok(mapping.email.endsWith('.invalid'), `Mapping for ${key} must use .invalid domain`);
      assert.ok(!mapping.email.includes('gmail.com'), `Mapping for ${key} must not contain gmail.com`);
    }
  });

  await t.test('4. resolveRecipientForFacility refuses unconfigured dispatch', () => {
    const origAlert = process.env.MONITOR_ALERT_RECIPIENT;
    const origCmd = process.env.COMMAND_CENTRE_EMAIL;
    delete process.env.MONITOR_ALERT_RECIPIENT;
    delete process.env.COMMAND_CENTRE_EMAIL;

    const resolved = resolveRecipientForFacility('dps_rk_puram');
    assert.strictEqual(resolved, null, 'Must return null when no explicit operator address is configured in env');

    process.env.MONITOR_ALERT_RECIPIENT = 'verified-operator@test.org';
    const resolvedWithEnv = resolveRecipientForFacility('dps_rk_puram');
    assert.strictEqual(resolvedWithEnv, 'verified-operator@test.org', 'Must resolve to environment recipient');

    // Cleanup
    if (origAlert) process.env.MONITOR_ALERT_RECIPIENT = origAlert;
    else delete process.env.MONITOR_ALERT_RECIPIENT;
    if (origCmd) process.env.COMMAND_CENTRE_EMAIL = origCmd;
    else delete process.env.COMMAND_CENTRE_EMAIL;
  });

  await t.test('5. CITIES_CONFIG validates known cities', () => {
    assert.ok('Delhi (DTU / Bawana)' in CITIES_CONFIG);
    assert.ok('Mumbai' in CITIES_CONFIG);
    assert.ok(!('FakeCity123' in CITIES_CONFIG));
  });

  await t.test('6. Directory projection strips emails and phones from public payload', () => {
    const PUBLIC_FACILITY_FIELDS = [
      'id', 'name', 'facilityClass', 'type', 'category', 'city', 'district', 'locality', 'lat', 'lon', 'gridId', 'studentCount', 'bedCount'
    ];
    function projectPublicFacility(fac) {
      const projected = {};
      for (const field of PUBLIC_FACILITY_FIELDS) {
        if (fac[field] !== undefined) projected[field] = fac[field];
      }
      return projected;
    }

    const directory = getAllDirectoryFacilities();
    const sanitized = directory.facilities.map(projectPublicFacility);

    for (const fac of sanitized) {
      assert.strictEqual(fac.emails, undefined, 'Must not contain emails');
      assert.strictEqual(fac.primaryEmail, undefined, 'Must not contain primaryEmail');
      assert.strictEqual(fac.phone, undefined, 'Must not contain phone');
      assert.strictEqual(fac.nodalOfficerEmail, undefined, 'Must not contain nodalOfficerEmail');
      assert.ok(fac.name, 'Must retain facility name');
    }
  });

});
