import { fetchAuthSession } from 'aws-amplify/auth';

/**
 * Authenticated API Fetch Wrapper
 *
 * Automatically inspects the current Cognito authentication session.
 * Injects `VITE_API_BASE_URL` when calling Lambda directly in production.
 * If an active access token is present, it injects the Authorization: Bearer <token> header.
 * Dispatches 'auth:unauthorized' on 401 response to prompt modal login.
 */
export async function apiFetch(url, options = {}) {
  const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')
    : '';

  const fullUrl = (baseUrl && url.startsWith('/')) ? `${baseUrl}${url}` : url;
  const headers = { ...(options.headers || {}) };

  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.accessToken?.toString();
    if (token && !headers['Authorization'] && !headers['authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (err) {
    // Unauthenticated caller or guest request
  }

  const response = await fetch(fullUrl, {
    ...options,
    headers
  });

  if (response.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }

  return response;
}
