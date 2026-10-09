import { CognitoJwtVerifier } from 'aws-jwt-verify';

let activeVerifier = null;
let configuredPoolId = null;
let configuredClientIdsKey = null;

// Test override hook for unit testing (only allowed in test environment)
let testVerifierOverride = null;
let testAdminGetUserMock = null;

export function setTestVerifier(verifier) {
  if (process.env.NODE_ENV === 'test') {
    testVerifierOverride = verifier;
  }
}

export function clearTestVerifier() {
  if (process.env.NODE_ENV === 'test') {
    testVerifierOverride = null;
    testAdminGetUserMock = null;
  }
}

export function setTestAdminGetUser(fn) {
  if (process.env.NODE_ENV === 'test') {
    testAdminGetUserMock = fn;
  }
}

// 5-minute TTL cache for school_admin school lookup
const schoolIdCache = new Map();
const SCHOOL_CACHE_TTL_MS = 5 * 60 * 1000;

export function clearSchoolCache() {
  schoolIdCache.clear();
}

/**
 * Returns a configured CognitoJwtVerifier instance, or null if configuration is missing.
 */
export function getJwtVerifier() {
  if (process.env.NODE_ENV === 'test' && testVerifierOverride) {
    return testVerifierOverride;
  }

  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  if (!userPoolId) {
    return null;
  }

  const clientIds = [
    process.env.COGNITO_WEB_CLIENT_ID,
    process.env.COGNITO_MOBILE_CLIENT_ID,
    process.env.COGNITO_INGEST_CLIENT_ID
  ].filter(Boolean);

  if (clientIds.length === 0) {
    return null;
  }

  const clientIdsKey = clientIds.sort().join(',');

  if (activeVerifier && configuredPoolId === userPoolId && configuredClientIdsKey === clientIdsKey) {
    return activeVerifier;
  }

  activeVerifier = CognitoJwtVerifier.create({
    userPoolId,
    tokenUse: 'access',
    clientId: clientIds.length === 1 ? clientIds[0] : clientIds
  });

  configuredPoolId = userPoolId;
  configuredClientIdsKey = clientIdsKey;

  return activeVerifier;
}

/**
 * Resolves the custom:school_id attribute for a school_admin user via AdminGetUser (cached 5 min).
 */
async function resolveSchoolIdForUser(username) {
  const cached = schoolIdCache.get(username);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.schoolId;
  }

  if (process.env.NODE_ENV === 'test' && testAdminGetUserMock) {
    const schoolId = await testAdminGetUserMock(username);
    if (schoolId) {
      schoolIdCache.set(username, { schoolId, expiresAt: Date.now() + SCHOOL_CACHE_TTL_MS });
    }
    return schoolId;
  }

  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  if (!userPoolId) return null;

  try {
    const { CognitoIdentityProviderClient, AdminGetUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'ap-south-1' });
    const res = await client.send(new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: username
    }));

    const attr = (res.UserAttributes || []).find(a => a.Name === 'custom:school_id');
    const schoolId = attr?.Value || null;

    if (schoolId) {
      schoolIdCache.set(username, { schoolId, expiresAt: Date.now() + SCHOOL_CACHE_TTL_MS });
    }

    return schoolId;
  } catch (err) {
    console.error(`[authMiddleware] Failed to resolve school_id for ${username}:`, err.message);
    return null;
  }
}

/**
 * Base JWT verification handler
 */
async function verifyRequestToken(req, res) {
  const verifier = getJwtVerifier();

  // FAIL CLOSED: If Cognito User Pool ID or client IDs are missing, return 503
  if (!verifier) {
    res.status(503).json({
      success: false,
      error: 'auth_not_configured',
      message: 'Cognito authentication is not configured on server. Please check COGNITO_USER_POOL_ID and client credentials.'
    });
    return null;
  }

  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: 'unauthorized',
      message: 'Authorization header is required.'
    });
    return null;
  }

  // Case-insensitive 'Bearer' token matching
  const match = authHeader.match(/^bearer\s+(.+)$/i);
  if (!match || !match[1].trim()) {
    res.status(401).json({
      success: false,
      error: 'unauthorized',
      message: 'Bearer token format required.'
    });
    return null;
  }

  const token = match[1].trim();

  try {
    const payload = await verifier.verify(token);

    if (payload.token_use !== 'access') {
      res.status(401).json({
        success: false,
        error: 'invalid_token',
        message: 'Access token required.'
      });
      return null;
    }

    return payload;
  } catch (err) {
    res.status(401).json({
      success: false,
      error: 'unauthorized',
      message: 'Invalid, expired, or untrusted access token.'
    });
    return null;
  }
}

/**
 * Require a human citizen or admin user token (blocks machine ingest tokens from citizen routes).
 * Does not require group membership for citizens.
 */
export function requireUser() {
  return async (req, res, next) => {
    const payload = await verifyRequestToken(req, res);
    if (!payload) return;

    const clientId = payload.client_id;
    const humanClientIds = [
      process.env.COGNITO_WEB_CLIENT_ID,
      process.env.COGNITO_MOBILE_CLIENT_ID
    ].filter(Boolean);

    // In non-test mode or when human client IDs are configured, block ingest machine tokens
    if (humanClientIds.length > 0 && !humanClientIds.includes(clientId)) {
      return res.status(403).json({
        success: false,
        error: 'forbidden',
        message: 'Citizen or school admin user token required. Machine tokens cannot access this route.'
      });
    }

    req.user = {
      sub: payload.sub,
      username: payload.username || payload.sub,
      clientId,
      groups: Array.isArray(payload['cognito:groups']) ? payload['cognito:groups'] : []
    };

    next();
  };
}

/**
 * Require a verified school administrator.
 * Validates 'school_admin' group and resolves custom:school_id server-side via AdminGetUser.
 */
export function requireSchoolAdmin() {
  return async (req, res, next) => {
    const payload = await verifyRequestToken(req, res);
    if (!payload) return;

    const userGroups = Array.isArray(payload['cognito:groups']) ? payload['cognito:groups'] : [];
    if (!userGroups.includes('school_admin')) {
      return res.status(403).json({
        success: false,
        error: 'forbidden',
        message: 'User does not belong to the school_admin group.'
      });
    }

    const username = payload.username || payload.sub;
    const schoolId = await resolveSchoolIdForUser(username);

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        error: 'no_school_assigned',
        message: 'No institutional school ID is assigned to this school administrator account.'
      });
    }

    req.user = {
      sub: payload.sub,
      username,
      clientId: payload.client_id,
      groups: userGroups,
      schoolId
    };

    next();
  };
}

/**
 * Require a specific OAuth scope (e.g. 'ingest/write' for edge IoT sensors and telemetry sync).
 */
export function requireScope(requiredScope) {
  return async (req, res, next) => {
    const payload = await verifyRequestToken(req, res);
    if (!payload) return;

    const userScopes = typeof payload.scope === 'string' ? payload.scope.split(' ') : [];
    if (!userScopes.includes(requiredScope)) {
      return res.status(403).json({
        success: false,
        error: 'forbidden',
        message: `Token lacks required scope: ${requiredScope}`
      });
    }

    req.user = {
      sub: payload.sub,
      username: payload.username || payload.sub,
      clientId: payload.client_id,
      scopes: userScopes
    };

    next();
  };
}

/**
 * Backwards-compatible generic requireAuth middleware
 */
export function requireAuth(options = {}) {
  const { groups = null, scope = null, requireHuman = false } = options;

  if (groups && groups.includes('school_admin')) {
    return requireSchoolAdmin();
  }

  if (scope) {
    return requireScope(scope);
  }

  return requireUser();
}
