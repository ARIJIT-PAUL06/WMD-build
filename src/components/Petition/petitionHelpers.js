/**
 * src/components/Petition/petitionHelpers.js
 * Pure helper functions for civic petitions contract compliance.
 * Part of Cognito Fix Plan v2 (A1).
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

export function buildSavePayload({
  selectedSchoolId,
  stationName,
  locality = '',
  currentAuthority = {},
  letterSubject,
  activeLetterText,
  selectedDemands = [],
  language = 'en',
  tone = 'formal',
  senderName = '',
  senderRole = '',
  senderEmail = '',
  senderPhone = '',
  saveRequestId,
  status = 'DRAFT_SAVED'
}) {
  const isSchool = selectedSchoolId && selectedSchoolId !== 'custom';
  if (!isSchool && !stationName) {
    throw new Error('Choose a school or a monitoring station before saving.');
  }

  return {
    clientRequestId: saveRequestId,
    targetType: isSchool ? 'school' : 'station',
    ...(isSchool ? { schoolId: selectedSchoolId } : { stationName }),
    locality,
    authorityName: currentAuthority.fullName || currentAuthority.name,
    authorityRole: currentAuthority.designation || '',
    authorityEmail: currentAuthority.email || '',
    authorityNodalAgency: currentAuthority.department || '',
    letterSubject,
    letterText: activeLetterText,
    demands: selectedDemands,
    language,
    tone,
    senderName,
    senderRole,
    senderContact: [senderEmail, senderPhone].filter(Boolean).join(' | '),
    status
  };
}
