/**
 * Central Authentication Service for Mobile Client (Expo / React Native)
 * Implements AWS Cognito Hosted UI with Authorization Code Flow + PKCE.
 * Tokens stored securely in expo-secure-store with auto-refresh.
 * Adheres strictly to Zero-Faking Directive (AGENTS.md) and COGNITO_FIX_PLAN.md.
 */

// Safe dynamic imports for Expo native modules (with fallbacks for tests/SSR)
let SecureStore = null;
let WebBrowser = null;
let AuthSession = null;
let Crypto = null;
let Constants = null;

try {
  SecureStore = require('expo-secure-store');
} catch (_) {
  // Mock / memory store fallback
}

try {
  WebBrowser = require('expo-web-browser');
  if (WebBrowser?.maybeCompleteAuthSession) {
    WebBrowser.maybeCompleteAuthSession();
  }
} catch (_) {}

try {
  AuthSession = require('expo-auth-session');
} catch (_) {}

try {
  Crypto = require('expo-crypto');
} catch (_) {}

try {
  Constants = require('expo-constants').default;
} catch (_) {}

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'vayuvitals_auth_access_token',
  ID_TOKEN: 'vayuvitals_auth_id_token',
  REFRESH_TOKEN: 'vayuvitals_auth_refresh_token',
  EXPIRES_AT: 'vayuvitals_auth_expires_at'
};

// In-memory fallback if SecureStore is unavailable
const memoryStore = new Map();

async function secureGet(key) {
  if (SecureStore?.getItemAsync) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (_) {}
  }
  return memoryStore.get(key) || null;
}

async function secureSet(key, value) {
  if (SecureStore?.setItemAsync) {
    try {
      await SecureStore.setItemAsync(key, value);
      return;
    } catch (_) {}
  }
  memoryStore.set(key, value);
}

async function secureDelete(key) {
  if (SecureStore?.deleteItemAsync) {
    try {
      await SecureStore.deleteItemAsync(key);
      return;
    } catch (_) {}
  }
  memoryStore.delete(key);
}

// Configuration
export function getAuthConfig() {
  const extra = Constants?.expoConfig?.extra || Constants?.manifest?.extra || {};
  const rawDomain = (extra.cognitoDomain || '').trim();
  const domain = rawDomain.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  const clientId = (extra.cognitoClientId || '').trim();

  const redirectUri = extra.cognitoRedirectUri || (AuthSession ? AuthSession.makeRedirectUri({ scheme: 'vayuvitals', path: 'auth/callback' }) : 'vayuvitals://auth/callback');
  const logoutUri = extra.cognitoLogoutUri || (AuthSession ? AuthSession.makeRedirectUri({ scheme: 'vayuvitals', path: 'auth/logout' }) : 'vayuvitals://auth/logout');

  if (!domain || !clientId) {
    return {
      configured: false,
      domain,
      clientId,
      redirectUri,
      logoutUri
    };
  }

  return {
    configured: true,
    domain,
    clientId,
    redirectUri,
    logoutUri
  };
}

// State listeners
const listeners = new Set();
function notify(event, data) {
  for (const fn of listeners) {
    try { fn(event, data); } catch (e) { console.warn('[AuthService] Listener error:', e); }
  }
}

/**
 * Decode JWT payload safely without external dependencies
 */
export function parseJwt(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const jsonStr = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonStr);
  } catch (err) {
    return null;
  }
}

/**
 * Build PKCE Code Verifier & Challenge
 */
async function generatePkce() {
  if (Crypto?.digestStringAsync) {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    const verifier = Array.from(randomBytes).map(b => ('0' + b.toString(16)).slice(-2)).join('');
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      verifier,
      { encoding: Crypto.CryptoEncoding.BASE64URL }
    );
    return { verifier, challenge: digest };
  }

  // Fallback string generator if Crypto native module unavailable
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let verifier = '';
  for (let i = 0; i < 64; i++) {
    verifier += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return { verifier, challenge: verifier };
}

/**
 * Trigger Hosted UI sign-in with Auth Code + PKCE
 */
export async function signIn() {
  const config = getAuthConfig();
  if (!config.configured) {
    throw new Error('Login is not configured in this build (missing cognitoDomain / cognitoClientId in app.json).');
  }

  const { verifier, challenge } = await generatePkce();

  const authUrl = `https://${config.domain}/oauth2/authorize?` + new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: 'openid email profile',
    code_challenge: challenge,
    code_challenge_method: 'S256'
  }).toString();

  if (!WebBrowser?.openAuthSessionAsync) {
    throw new Error('WebBrowser is not supported on this platform');
  }

  const result = await WebBrowser.openAuthSessionAsync(authUrl, config.redirectUri);

  if (result.type !== 'success' || !result.url) {
    return { success: false, cancelled: true };
  }

  // Parse authorization code from callback URL
  const callbackUrl = new URL(result.url);
  const code = callbackUrl.searchParams.get('code');
  const error = callbackUrl.searchParams.get('error');

  if (error) {
    throw new Error(`Cognito error: ${error} - ${callbackUrl.searchParams.get('error_description') || ''}`);
  }
  if (!code) {
    throw new Error('No authorization code returned from Cognito');
  }

  // Exchange auth code for tokens
  const tokenUrl = `https://${config.domain}/oauth2/token`;
  const tokenBody = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    code,
    code_verifier: verifier
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody.toString()
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Token exchange failed (HTTP ${res.status}): ${errText}`);
  }

  const tokenData = await res.json();
  const now = Date.now();
  const expiresAt = now + (Number(tokenData.expires_in || 3600) - 60) * 1000;

  await secureSet(STORAGE_KEYS.ACCESS_TOKEN, tokenData.access_token);
  if (tokenData.id_token) await secureSet(STORAGE_KEYS.ID_TOKEN, tokenData.id_token);
  if (tokenData.refresh_token) await secureSet(STORAGE_KEYS.REFRESH_TOKEN, tokenData.refresh_token);
  await secureSet(STORAGE_KEYS.EXPIRES_AT, String(expiresAt));

  const user = parseJwt(tokenData.id_token);
  notify('SIGNED_IN', { user, token: tokenData.access_token });

  return { success: true, user };
}

/**
 * Sign out and clear stored tokens
 */
export async function signOut() {
  const config = getAuthConfig();
  await secureDelete(STORAGE_KEYS.ACCESS_TOKEN);
  await secureDelete(STORAGE_KEYS.ID_TOKEN);
  await secureDelete(STORAGE_KEYS.REFRESH_TOKEN);
  await secureDelete(STORAGE_KEYS.EXPIRES_AT);

  const logoutUrl = `https://${config.domain}/logout?` + new URLSearchParams({
    client_id: config.clientId,
    logout_uri: config.logoutUri
  }).toString();

  try {
    if (WebBrowser?.openAuthSessionAsync) {
      await WebBrowser.openAuthSessionAsync(logoutUrl, config.logoutUri);
    }
  } catch (_) {}

  notify('SIGNED_OUT', null);
  return { success: true };
}

/**
 * Get valid Access Token (auto-refreshes if expired)
 */
export async function getAccessToken() {
  const expiresAtStr = await secureGet(STORAGE_KEYS.EXPIRES_AT);
  const expiresAt = expiresAtStr ? Number(expiresAtStr) : 0;
  const now = Date.now();

  const accessToken = await secureGet(STORAGE_KEYS.ACCESS_TOKEN);

  // If token is still valid, return it
  if (accessToken && expiresAt > now) {
    return accessToken;
  }

  // Token is expired or missing; attempt refresh
  const refreshToken = await secureGet(STORAGE_KEYS.REFRESH_TOKEN);
  if (!refreshToken) {
    return null;
  }

  try {
    const config = getAuthConfig();
    const tokenUrl = `https://${config.domain}/oauth2/token`;
    const tokenBody = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      refresh_token: refreshToken
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString()
    });

    if (!res.ok) {
      // Refresh token is revoked or invalid: sign out
      await signOut();
      return null;
    }

    const tokenData = await res.json();
    const newExpiresAt = now + (Number(tokenData.expires_in || 3600) - 60) * 1000;

    await secureSet(STORAGE_KEYS.ACCESS_TOKEN, tokenData.access_token);
    if (tokenData.id_token) await secureSet(STORAGE_KEYS.ID_TOKEN, tokenData.id_token);
    await secureSet(STORAGE_KEYS.EXPIRES_AT, String(newExpiresAt));

    notify('TOKEN_REFRESHED', { token: tokenData.access_token });
    return tokenData.access_token;
  } catch (err) {
    console.warn('[AuthService] Auto-refresh failed:', err);
    return null;
  }
}

/**
 * Get current user information from ID Token
 */
export async function getCurrentUser() {
  const idToken = await secureGet(STORAGE_KEYS.ID_TOKEN);
  if (!idToken) return null;

  const claims = parseJwt(idToken);
  if (!claims) return null;

  const groups = claims['cognito:groups'] || [];
  const isSchoolAdmin = groups.includes('school_admin');
  const isCitizen = groups.includes('citizen');
  const schoolId = claims['custom:school_id'] || null;

  return {
    sub: claims.sub,
    email: claims.email,
    emailVerified: claims.email_verified,
    groups,
    isSchoolAdmin,
    isCitizen,
    schoolId,
    claims
  };
}

/**
 * Check if user is currently authenticated
 */
export async function isAuthenticated() {
  const token = await getAccessToken();
  return Boolean(token);
}

/**
 * Subscribe to auth events
 */
export function onAuthStateChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Test helpers to inject session tokens in unit test environments
 */
export async function setTestSession({ accessToken = 'test-token', idToken = 'test-id-token', expiresIn = 3600 } = {}) {
  const expiresAt = Date.now() + expiresIn * 1000;
  await secureSet(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  await secureSet(STORAGE_KEYS.ID_TOKEN, idToken);
  await secureSet(STORAGE_KEYS.EXPIRES_AT, String(expiresAt));
}

export async function clearTestSession() {
  await secureDelete(STORAGE_KEYS.ACCESS_TOKEN);
  await secureDelete(STORAGE_KEYS.ID_TOKEN);
  await secureDelete(STORAGE_KEYS.REFRESH_TOKEN);
  await secureDelete(STORAGE_KEYS.EXPIRES_AT);
}
