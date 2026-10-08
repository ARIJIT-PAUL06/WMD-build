/**
 * Client-Side Evidence & Draft Helpers
 * Strictly adheres to 100% Transparency and Zero-Faking Directive (AGENTS.md).
 */

/**
 * Categorize PM2.5 in Indian National Air Quality Index (NAQI) standards
 */
export function categorizePm25(pm25) {
  if (pm25 <= 30) return { label: 'Good', color: '#10b981' };
  if (pm25 <= 60) return { label: 'Satisfactory', color: '#84cc16' };
  if (pm25 <= 90) return { label: 'Moderate', color: '#f59e0b' };
  if (pm25 <= 120) return { label: 'Poor', color: '#f97316' };
  if (pm25 <= 250) return { label: 'Very Poor', color: '#ef4444' };
  return { label: 'Severe', color: '#7f1d1d' };
}
