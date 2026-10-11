/**
 * petitionHelpers.js
 * Helpers for PM2.5 categorization and civic petition workflows.
 */

export function categorizePm25(pm25) {
  if (pm25 == null || isNaN(pm25)) return 'Unknown';
  if (pm25 <= 30) return 'Good';
  if (pm25 <= 60) return 'Satisfactory';
  if (pm25 <= 90) return 'Moderate';
  if (pm25 <= 120) return 'Poor';
  if (pm25 <= 250) return 'Very Poor';
  return 'Severe';
}
