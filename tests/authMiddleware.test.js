import test, { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  requireAuth,
  requireUser,
  requireSchoolAdmin,
  requireScope,
  setTestVerifier,
  clearTestVerifier,
  setTestAdminGetUser,
  clearSchoolCache
} from '../server/authMiddleware.js';

describe('Cognito Authentication & Authorization Middleware Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: 'test' };
    clearTestVerifier();
    clearSchoolCache();
  });

  afterEach(() => {
    clearTestVerifier();
    clearSchoolCache();
    process.env = { ...originalEnv };
  });

  it('1. Fails closed with 503 when COGNITO_USER_POOL_ID is unset', async () => {
    delete process.env.COGNITO_USER_POOL_ID;
    delete process.env.COGNITO_WEB_CLIENT_ID;

    const middleware = requireAuth();

    let statusCode = null;
    let jsonBody = null;

    const req = { headers: { authorization: 'Bearer mock.jwt.token' } };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonBody = data;
        return this;
      }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await middleware(req, res, next);

    assert.strictEqual(statusCode, 503);
    assert.strictEqual(jsonBody.error, 'auth_not_configured');
    assert.strictEqual(nextCalled, false);
  });

  it('2. Fails closed with 401 when Authorization header is missing', async () => {
    setTestVerifier({
      verify: async () => ({ sub: 'dummy' })
    });

    const middleware = requireAuth();
    let statusCode = null;
    let jsonBody = null;
    const req = { headers: {} };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonBody = data;
        return this;
      }
    };
    let nextCalled = false;

    await middleware(req, res, () => { nextCalled = true; });

    assert.strictEqual(statusCode, 401);
    assert.strictEqual(jsonBody.error, 'unauthorized');
    assert.strictEqual(nextCalled, false);
  });

  it('3. Successfully verifies valid citizen JWT and attaches user to request', async () => {
    const mockPayload = {
      sub: 'usr-12345-uuid',
      username: 'usr-12345-uuid',
      client_id: 'mock-web-client-id',
      token_use: 'access',
      'cognito:groups': ['citizen'],
      scope: 'openid email'
    };

    setTestVerifier({
      verify: async (token) => {
        if (token === 'valid-citizen-jwt') return mockPayload;
        throw new Error('Invalid token');
      }
    });

    const middleware = requireAuth();

    const req = { headers: { authorization: 'Bearer valid-citizen-jwt' } };
    let nextCalled = false;
    const res = {
      status() { return this; },
      json() { return this; }
    };

    await middleware(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, true);
    assert.ok(req.user);
    assert.strictEqual(req.user.sub, 'usr-12345-uuid');
    assert.deepStrictEqual(req.user.groups, ['citizen']);
  });

  it('4. Accepts Bearer token in any letter case (case-insensitive)', async () => {
    setTestVerifier({
      verify: async (token) => {
        if (token === 'my-access-token') {
          return {
            sub: 'user-case-test',
            token_use: 'access',
            client_id: 'mock-web-client-id'
          };
        }
        throw new Error('Invalid token');
      }
    });

    const middleware = requireAuth();
    const cases = ['bearer my-access-token', 'BEARER my-access-token', 'Bearer my-access-token', 'bEaReR my-access-token'];

    for (const authHeader of cases) {
      let nextCalled = false;
      const req = { headers: { authorization: authHeader } };
      const res = {
        status() { return this; },
        json() { return this; }
      };

      await middleware(req, res, () => { nextCalled = true; });
      assert.strictEqual(nextCalled, true, `Failed for authorization header: ${authHeader}`);
      assert.strictEqual(req.user.sub, 'user-case-test');
    }
  });

  it('5. Rejects token when token_use is not access', async () => {
    setTestVerifier({
      verify: async () => ({
        sub: 'usr-id',
        token_use: 'id' // ID token instead of access token
      })
    });

    const middleware = requireAuth();
    let statusCode = null;
    let jsonBody = null;
    const req = { headers: { authorization: 'Bearer id-token' } };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonBody = data;
        return this;
      }
    };
    let nextCalled = false;

    await middleware(req, res, () => { nextCalled = true; });

    assert.strictEqual(statusCode, 401);
    assert.strictEqual(jsonBody.error, 'invalid_token');
    assert.strictEqual(nextCalled, false);
  });

  it('6. Enforces group membership and resolves school_id via server-side AdminGetUser lookup', async () => {
    // Note: Cognito access tokens DO NOT include custom:school_id.
    // The middleware looks it up via AdminGetUser and caches it.
    setTestVerifier({
      verify: async (token) => {
        if (token === 'citizen-token') {
          return {
            sub: 'user-1',
            username: 'user-1',
            token_use: 'access',
            client_id: 'mock-web-client-id',
            'cognito:groups': ['citizen']
          };
        }
        if (token === 'admin-token') {
          return {
            sub: 'user-admin-sub',
            username: 'principal@school.edu',
            token_use: 'access',
            client_id: 'mock-web-client-id',
            'cognito:groups': ['school_admin']
          };
        }
        throw new Error('Unknown token');
      }
    });

    let lookupCount = 0;
    setTestAdminGetUser(async (username) => {
      lookupCount++;
      if (username === 'principal@school.edu' || username === 'user-admin-sub') {
        return 'SCH_DEL_0001';
      }
      return null;
    });

    const schoolAdminMiddleware = requireSchoolAdmin();

    // 6a: Citizen user trying to access school_admin route -> 403 Forbidden
    let statusCode = null;
    let jsonBody = null;
    const reqCitizen = { headers: { authorization: 'Bearer citizen-token' } };
    const resCitizen = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonBody = data;
        return this;
      }
    };
    let citizenNext = false;
    await schoolAdminMiddleware(reqCitizen, resCitizen, () => { citizenNext = true; });

    assert.strictEqual(statusCode, 403);
    assert.strictEqual(jsonBody.error, 'forbidden');
    assert.strictEqual(citizenNext, false);

    // 6b: School admin user -> 200 OK with server-resolved schoolId
    const reqAdmin = { headers: { authorization: 'Bearer admin-token' } };
    let adminNext = false;
    await schoolAdminMiddleware(reqAdmin, resCitizen, () => { adminNext = true; });

    assert.strictEqual(adminNext, true);
    assert.strictEqual(reqAdmin.user.schoolId, 'SCH_DEL_0001');
    assert.strictEqual(lookupCount, 1);

    // 6c: Subsequent call uses the 5-minute cache without invoking lookup again
    const reqAdminCached = { headers: { authorization: 'Bearer admin-token' } };
    let cachedNext = false;
    await schoolAdminMiddleware(reqAdminCached, resCitizen, () => { cachedNext = true; });

    assert.strictEqual(cachedNext, true);
    assert.strictEqual(reqAdminCached.user.schoolId, 'SCH_DEL_0001');
    assert.strictEqual(lookupCount, 1); // Cached! Did not call lookup again
  });

  it('7. Enforces OAuth scope (ingest/write)', async () => {
    setTestVerifier({
      verify: async (token) => {
        if (token === 'iot-token') {
          return {
            sub: 'iot-client',
            client_id: 'ingest-client-id',
            token_use: 'access',
            scope: 'ingest/write'
          };
        }
        if (token === 'unscoped-token') {
          return {
            sub: 'generic-client',
            client_id: 'web-client-id',
            token_use: 'access',
            scope: 'openid email'
          };
        }
        throw new Error('Invalid token');
      }
    });

    const ingestMiddleware = requireScope('ingest/write');

    // Unscoped token -> 403
    let statusCode = null;
    let jsonBody = null;
    const reqUnscoped = { headers: { authorization: 'Bearer unscoped-token' } };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonBody = data;
        return this;
      }
    };
    let nextCalled = false;
    await ingestMiddleware(reqUnscoped, res, () => { nextCalled = true; });

    assert.strictEqual(statusCode, 403);
    assert.strictEqual(jsonBody.error, 'forbidden');
    assert.strictEqual(nextCalled, false);

    // Valid ingest token -> next()
    const reqIot = { headers: { authorization: 'Bearer iot-token' } };
    let iotNext = false;
    await ingestMiddleware(reqIot, res, () => { iotNext = true; });

    assert.strictEqual(iotNext, true);
    assert.strictEqual(reqIot.user.sub, 'iot-client');
  });

  it('8. requireUser blocks machine ingest token from citizen routes', async () => {
    process.env.COGNITO_WEB_CLIENT_ID = 'client_web_123';
    process.env.COGNITO_MOBILE_CLIENT_ID = 'client_mobile_456';
    process.env.COGNITO_INGEST_CLIENT_ID = 'client_ingest_789';

    setTestVerifier({
      verify: async (token) => {
        if (token === 'ingest-machine-token') {
          return {
            sub: 'iot-machine',
            client_id: 'client_ingest_789',
            token_use: 'access',
            scope: 'ingest/write'
          };
        }
        if (token === 'human-citizen-token') {
          return {
            sub: 'citizen-sub',
            client_id: 'client_web_123',
            token_use: 'access',
            scope: 'openid'
          };
        }
        throw new Error('Unknown token');
      }
    });

    const userMiddleware = requireUser();

    // Machine token attempting citizen route -> 403 Forbidden
    let statusCode = null;
    let jsonBody = null;
    const reqMachine = { headers: { authorization: 'Bearer ingest-machine-token' } };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonBody = data;
        return this;
      }
    };
    let machineNext = false;
    await userMiddleware(reqMachine, res, () => { machineNext = true; });

    assert.strictEqual(statusCode, 403);
    assert.strictEqual(jsonBody.error, 'forbidden');
    assert.strictEqual(machineNext, false);

    // Human token -> next()
    const reqHuman = { headers: { authorization: 'Bearer human-citizen-token' } };
    let humanNext = false;
    await userMiddleware(reqHuman, res, () => { humanNext = true; });

    assert.strictEqual(humanNext, true);
    assert.strictEqual(reqHuman.user.sub, 'citizen-sub');
  });
});
