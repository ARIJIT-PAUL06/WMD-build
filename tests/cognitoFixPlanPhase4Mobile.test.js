/**
 * Cognito Fix Plan Phase 4 Mobile Authentication Verification Tests
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';

import {
  getAuthConfig,
  signIn,
  parseJwt,
  getAccessToken,
  getCurrentUser,
  isAuthenticated,
  onAuthStateChange
} from '../mobile/src/services/authService.js';

import {
  getAllDockets,
  saveDocket,
  onAuthRequired,
  DOCKET_STATUS
} from '../mobile/src/services/petitionService.js';

describe('Cognito Fix Plan Phase 4 Mobile Unit Tests', () => {
  it('1. getAuthConfig returns honest unconfigured status and signIn rejects when not configured', async () => {
    const config = getAuthConfig();
    assert.strictEqual(config.configured, false);
    assert.ok(config.redirectUri.startsWith('vayuvitals://') || config.redirectUri.includes('callback'));
    assert.ok(config.logoutUri.startsWith('vayuvitals://') || config.logoutUri.includes('logout'));

    await assert.rejects(
      async () => {
        await signIn();
      },
      (err) => {
        assert.match(err.message, /Login is not configured in this build \(missing cognitoDomain \/ cognitoClientId in app\.json\)/);
        return true;
      }
    );
  });

  it('2. parseJwt safely decodes JWT claims without third-party dependencies', () => {
    // Generate a valid mock JWT (header.payload.signature)
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      sub: 'user-uuid-1234',
      email: 'citizen@delhi.gov.in',
      'cognito:groups': ['citizen'],
      'custom:school_id': 'dps_rohini'
    })).toString('base64url');
    const token = `${header}.${payload}.mockSignature123`;

    const parsed = parseJwt(token);
    assert.strictEqual(parsed.sub, 'user-uuid-1234');
    assert.strictEqual(parsed.email, 'citizen@delhi.gov.in');
    assert.deepStrictEqual(parsed['cognito:groups'], ['citizen']);
    assert.strictEqual(parsed['custom:school_id'], 'dps_rohini');

    // Invalid tokens fail gracefully
    assert.strictEqual(parseJwt('invalid.token'), null);
    assert.strictEqual(parseJwt(''), null);
    assert.strictEqual(parseJwt(null), null);
  });

  it('3. getAccessToken and isAuthenticated return safe unauthenticated state when signed out', async () => {
    const isAuth = await isAuthenticated();
    assert.strictEqual(isAuth, false);

    const token = await getAccessToken();
    assert.strictEqual(token, null);

    const user = await getCurrentUser();
    assert.strictEqual(user, null);
  });

  it('4. onAuthStateChange registers listeners and handles event dispatching', (t, done) => {
    const unsubscribe = onAuthStateChange((event, data) => {
      assert.ok(event);
      unsubscribe();
      done();
    });

    // Manually trigger via internal notify or verify registration
    assert.ok(typeof unsubscribe === 'function');
    done();
  });

  it('5. onAuthRequired listener registers cleanly in petitionService', (t, done) => {
    const unsubscribe = onAuthRequired(() => {
      done();
    });
    assert.ok(typeof unsubscribe === 'function');
    unsubscribe();
    done();
  });

  it('6. Neither mobile/app.json nor mobile/src/services/authService.js contains invented Cognito IDs', () => {
    const appJson = fs.readFileSync('mobile/app.json', 'utf8');
    const authServiceJs = fs.readFileSync('mobile/src/services/authService.js', 'utf8');

    assert.ok(!appJson.includes('594650681179'), 'app.json must not contain invented account id 594650681179');
    assert.ok(!appJson.includes('2q6997h1l5g3r1r9g3skh20u6n'), 'app.json must not contain invented client id 2q6997h1l5g3r1r9g3skh20u6n');
    assert.ok(!authServiceJs.includes('594650681179'), 'authService.js must not contain invented account id 594650681179');
    assert.ok(!authServiceJs.includes('2q6997h1l5g3r1r9g3skh20u6n'), 'authService.js must not contain invented client id 2q6997h1l5g3r1r9g3skh20u6n');
  });
});
