/**
 * Central Authentication Service for Mobile Client (Expo / React Native)
 * Implements Amazon Cognito direct authentication (Sign In, Sign Up, Verify, Reset Password)
 * matching the VayuVitals web application.
 * Tokens stored securely in expo-secure-store with auto-refresh.
 * Adheres strictly to Zero-Faking Directive (AGENTS.md).
 */

// Safe dynamic imports for Expo native modules (with fallbacks for tests/SSR)
let SecureStore = null;
let WebBrowser = null;
let AuthSession = null;
let Crypto = null;
let Constants = null;

try {
  SecureStore = require('expo-secure-store');
} catch (_) {}

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
  const clientId = (
    extra.cognitoClientId ||
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_COGNITO_CLIENT_ID) ||
    '4tvdv2buva9p70i7q9e0r04jqu'
  ).trim();

  const userPoolId = (
    extra.cognitoUserPoolId ||
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_COGNITO_USER_POOL_ID) ||
    'ap-south-1_QzcIN9DYx'
  ).trim();

  const region = (
    extra.cognitoRegion ||
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_AWS_REGION) ||
    'ap-south-1'
  ).trim();

  const redirectUri = extra.cognitoRedirectUri || (AuthSession ? AuthSession.makeRedirectUri({ scheme: 'vayuvitals', path: 'auth/callback' }) : 'vayuvitals://auth/callback');
  const logoutUri = extra.cognitoLogoutUri || (AuthSession ? AuthSession.makeRedirectUri({ scheme: 'vayuvitals', path: 'auth/logout' }) : 'vayuvitals://auth/logout');

  const configured = Boolean(clientId && userPoolId);

  return {
    configured,
    domain,
    clientId,
    userPoolId,
    region,
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
 * Decode base64 string safely across mobile/web engines
 */
function decodeBase64(str) {
  if (typeof atob === 'function') {
    return atob(str);
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  str = String(str).replace(/=+$/, '');
  for (let bc = 0, bs, buffer, idx = 0; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
    buffer = chars.indexOf(buffer);
  }
  return output;
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
    const decoded = decodeBase64(base64);
    const jsonStr = decodeURIComponent(
      decoded
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
 * Helper to call AWS Cognito Identity Provider Service directly
 */
async function cognitoRequest(target, body) {
  const config = getAuthConfig();
  const region = config.region || 'ap-south-1';
  const endpoint = `https://cognito-idp.${region}.amazonaws.com/`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`
    },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const rawType = data.__type || '';
    const errName = rawType.includes('#') ? rawType.split('#')[1] : rawType || 'CognitoError';
    const err = new Error(data.message || errName || `Cognito error ${res.status}`);
    err.name = errName;
    err.code = errName;
    err.raw = data;
    throw err;
  }

  return data;
}

/**
 * In-App Direct Email/Password Login (Matches Website Amplify Auth)
 */
export async function login({ email, password }) {
  const config = getAuthConfig();
  if (!config.configured) {
    throw new Error('Authentication is not configured in this build.');
  }

  const cleanEmail = email.trim();
  const data = await cognitoRequest('InitiateAuth', {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: config.clientId,
    AuthParameters: {
      USERNAME: cleanEmail,
      PASSWORD: password
    }
  });

  if (data.AuthenticationResult) {
    const { AccessToken, IdToken, RefreshToken, ExpiresIn } = data.AuthenticationResult;
    const now = Date.now();
    const expiresAt = now + (Number(ExpiresIn || 3600) - 60) * 1000;

    await secureSet(STORAGE_KEYS.ACCESS_TOKEN, AccessToken);
    if (IdToken) await secureSet(STORAGE_KEYS.ID_TOKEN, IdToken);
    if (RefreshToken) await secureSet(STORAGE_KEYS.REFRESH_TOKEN, RefreshToken);
    await secureSet(STORAGE_KEYS.EXPIRES_AT, String(expiresAt));

    const user = await getCurrentUser();
    notify('SIGNED_IN', { user, token: AccessToken });
    return { success: true, isSignedIn: true, user };
  }

  if (data.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
    return {
      success: false,
      isSignedIn: false,
      nextStep: { signInStep: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD' },
      session: data.Session
    };
  }

  return { success: false, isSignedIn: false, data };
}

/**
 * In-App Citizen Registration (Matches Website Amplify Auth)
 */
export async function register({ email, password }) {
  const config = getAuthConfig();
  if (!config.configured) {
    throw new Error('Authentication is not configured in this build.');
  }

  const cleanEmail = email.trim();
  const data = await cognitoRequest('SignUp', {
    ClientId: config.clientId,
    Username: cleanEmail,
    Password: password,
    UserAttributes: [
      { Name: 'email', Value: cleanEmail }
    ]
  });

  return {
    success: true,
    isSignUpComplete: Boolean(data.UserConfirmed),
    userSub: data.UserSub,
    codeDeliveryDetails: data.CodeDeliveryDetails
  };
}

/**
 * Confirm Citizen Registration with 6-digit Code (Matches Website Amplify Auth)
 */
export async function confirmRegistration({ email, code }) {
  const config = getAuthConfig();
  if (!config.configured) {
    throw new Error('Authentication is not configured.');
  }

  const cleanEmail = email.trim();
  await cognitoRequest('ConfirmSignUp', {
    ClientId: config.clientId,
    Username: cleanEmail,
    ConfirmationCode: code.trim()
  });

  return { success: true };
}

/**
 * Resend Email Verification Code
 */
export async function resendConfirmationCode({ email }) {
  const config = getAuthConfig();
  if (!config.configured) {
    throw new Error('Authentication is not configured.');
  }

  const cleanEmail = email.trim();
  const data = await cognitoRequest('ResendConfirmationCode', {
    ClientId: config.clientId,
    Username: cleanEmail
  });

  return { success: true, codeDeliveryDetails: data.CodeDeliveryDetails };
}

/**
 * Request Password Reset Code (Matches Website Amplify Auth)
 */
export async function requestPasswordReset({ email }) {
  const config = getAuthConfig();
  if (!config.configured) {
    throw new Error('Authentication is not configured.');
  }

  const cleanEmail = email.trim();
  const data = await cognitoRequest('ForgotPassword', {
    ClientId: config.clientId,
    Username: cleanEmail
  });

  return { success: true, codeDeliveryDetails: data.CodeDeliveryDetails };
}

/**
 * Confirm New Password with Verification Code (Matches Website Amplify Auth)
 */
export async function confirmNewPassword({ email, code, newPassword }) {
  const config = getAuthConfig();
  if (!config.configured) {
    throw new Error('Authentication is not configured.');
  }

  const cleanEmail = email.trim();
  await cognitoRequest('ConfirmForgotPassword', {
    ClientId: config.clientId,
    Username: cleanEmail,
    ConfirmationCode: code.trim(),
    Password: newPassword
  });

  return { success: true };
}

/**
 * General signIn dispatcher (supports both in-app credentials and Hosted UI fallback)
 */
export async function signIn(credentials) {
  if (credentials && credentials.email && credentials.password) {
    return login(credentials);
  }

  // Fallback to Hosted UI if called without arguments
  const config = getAuthConfig();
  if (!config.domain || !config.clientId) {
    throw new Error('Hosted login is not configured (missing cognitoDomain in app.json).');
  }

  if (!Crypto?.digestStringAsync || !WebBrowser?.openAuthSessionAsync) {
    throw new Error('Please enter your email and password to sign in directly.');
  }

  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const verifier = Array.from(randomBytes).map(b => ('0' + b.toString(16)).slice(-2)).join('');
  const challenge = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64URL }
  );

  const authUrl = `https://${config.domain}/oauth2/authorize?` + new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: 'openid email profile',
    code_challenge: challenge,
    code_challenge_method: 'S256'
  }).toString();

  const result = await WebBrowser.openAuthSessionAsync(authUrl, config.redirectUri);
  if (result.type !== 'success' || !result.url) {
    return { success: false, cancelled: true };
  }

  const query = (result.url.split('?')[1] || '').split('#')[0];
  const params = {};
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const [k, v = ''] = pair.split('=');
    params[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
  }

  if (params.error) {
    throw new Error(`Cognito error: ${params.error} - ${params.error_description || ''}`);
  }
  if (!params.code) {
    throw new Error('No authorization code returned from Cognito');
  }

  const tokenUrl = `https://${config.domain}/oauth2/token`;
  const tokenBody = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    code: params.code,
    code_verifier: verifier
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody.toString()
  });

  if (!res.ok) {
    throw new Error(`Token exchange failed (HTTP ${res.status}): ${await res.text()}`);
  }

  const tokenData = await res.json();
  const now = Date.now();
  const expiresAt = now + (Number(tokenData.expires_in || 3600) - 60) * 1000;

  await secureSet(STORAGE_KEYS.ACCESS_TOKEN, tokenData.access_token);
  if (tokenData.id_token) await secureSet(STORAGE_KEYS.ID_TOKEN, tokenData.id_token);
  if (tokenData.refresh_token) await secureSet(STORAGE_KEYS.REFRESH_TOKEN, tokenData.refresh_token);
  await secureSet(STORAGE_KEYS.EXPIRES_AT, String(expiresAt));

  const user = await getCurrentUser();
  notify('SIGNED_IN', { user, token: tokenData.access_token });
  return { success: true, user };
}

/**
 * Sign out and clear stored tokens
 */
export async function signOut() {
  await secureDelete(STORAGE_KEYS.ACCESS_TOKEN);
  await secureDelete(STORAGE_KEYS.ID_TOKEN);
  await secureDelete(STORAGE_KEYS.REFRESH_TOKEN);
  await secureDelete(STORAGE_KEYS.EXPIRES_AT);

  notify('SIGNED_OUT', null);
  return { success: true };
}

/**
 * Get valid Access Token (auto-refreshes via Cognito if expired)
 */
export async function getAccessToken() {
  const expiresAtStr = await secureGet(STORAGE_KEYS.EXPIRES_AT);
  const expiresAt = expiresAtStr ? Number(expiresAtStr) : 0;
  const now = Date.now();

  const accessToken = await secureGet(STORAGE_KEYS.ACCESS_TOKEN);
  if (accessToken && expiresAt > now) {
    return accessToken;
  }

  const refreshToken = await secureGet(STORAGE_KEYS.REFRESH_TOKEN);
  if (!refreshToken) {
    return null;
  }

  try {
    const config = getAuthConfig();
    const data = await cognitoRequest('InitiateAuth', {
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: config.clientId,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken
      }
    });

    if (data.AuthenticationResult) {
      const { AccessToken, IdToken, ExpiresIn } = data.AuthenticationResult;
      const newExpiresAt = now + (Number(ExpiresIn || 3600) - 60) * 1000;

      await secureSet(STORAGE_KEYS.ACCESS_TOKEN, AccessToken);
      if (IdToken) await secureSet(STORAGE_KEYS.ID_TOKEN, IdToken);
      await secureSet(STORAGE_KEYS.EXPIRES_AT, String(newExpiresAt));

      notify('TOKEN_REFRESHED', { token: AccessToken });
      return AccessToken;
    }

    await signOut();
    return null;
  } catch (err) {
    console.warn('[AuthService] Auto-refresh failed:', err.message);
    await signOut();
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
 * Test helpers
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
