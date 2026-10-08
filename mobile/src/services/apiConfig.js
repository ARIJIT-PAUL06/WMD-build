/**
 * Central API Configuration for Mobile Client
 * Uses verified live AWS Lambda URL
 */

export const DEFAULT_API_BASE_URL = 'https://vtcmfkzdfyd5sy3ugjfwdhlqsy0lcxaj.lambda-url.ap-south-1.on.aws';

export function getApiBaseUrl() {
  try {
    // Check if Constants or app.json extra has configured URL
    const Constants = require('expo-constants').default;
    const configured = Constants?.expoConfig?.extra?.apiUrl || Constants?.manifest?.extra?.apiUrl;
    if (configured) return configured.replace(/\/+$/, '');
  } catch (e) {
    // Fall back to default
  }
  return DEFAULT_API_BASE_URL;
}
