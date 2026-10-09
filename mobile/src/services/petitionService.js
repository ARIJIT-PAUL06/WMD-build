/**
 * Mobile Petition Service (Expo / React Native)
 * Handles civic grievance workflows, remote evidence fetching, and local on-device docket CRUD.
 * Strictly adheres to 100% Transparency and Zero-Faking Directive (AGENTS.md).
 */

import AsyncStorage from './storageAdapter.js';
import { getApiBaseUrl } from './apiConfig.js';
import { getAccessToken } from './authService.js';
import fallbackAuthorities from '../data/authoritiesConfig.json' with { type: 'json' };
import fallbackSchools from '../data/schoolsDirectory.json' with { type: 'json' };

export const DOCKET_STATUS = {
  DRAFT: 'Draft',
  OPENED_IN_MAIL: 'Opened in mail',
  SHARED: 'Shared',
  MARKED_AS_SENT: 'Marked as sent'
};

export const DOCKET_STORAGE_KEY = '@vayuvitals_petition_dockets_v1';
export const SENDER_PROFILE_KEY = '@vayuvitals_sender_profile_v1';

const FETCH_TIMEOUT_MS = 15000;

const authPromptListeners = new Set();
export function onAuthRequired(listener) {
  authPromptListeners.add(listener);
  return () => authPromptListeners.delete(listener);
}
function notifyAuthRequired() {
  for (const fn of authPromptListeners) {
    try { fn(); } catch (e) { console.warn('[PetitionService] Auth listener error:', e); }
  }
}

/**
 * Helper to execute fetch with timeout and attach Bearer token
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const token = await getAccessToken();
    const headers = { ...options.headers };
    if (token && !headers['Authorization'] && !headers['authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });

    if (res.status === 401) {
      notifyAuthRequired();
    }

    return res;
  } catch (err) {
    if (err.name === 'AbortError' || controller.signal.aborted) {
      throw new Error('Server did not respond in 15 s');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch government authorities and standard remediation demands
 */
export async function getAuthorities() {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/petition/authorities`, {
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.authorities)) {
        return {
          authorities: (data.authorities || []).map(a => ({ ...a, sourceLabel: 'live server' })),
          standardDemands: data.standardDemands || [],
          dpdpaDisclaimer: data.dpdpaDisclaimer || '',
          isOfflineFallback: false
        };
      }
    }
  } catch (_err) {
    // Fall back to bundled offline copy
  }

  return {
    authorities: (fallbackAuthorities.authorities || []).map(a => ({ ...a, sourceLabel: 'offline copy, unverified' })),
    standardDemands: fallbackAuthorities.standardDemands || [],
    dpdpaDisclaimer: fallbackAuthorities.dpdpaDisclaimer || '',
    isOfflineFallback: true
  };
}

/**
 * Search educational institutions in the schools directory
 */
export async function searchSchools(query = '') {
  const q = query.trim().toLowerCase();
  const baseUrl = getApiBaseUrl();
  try {
    const encoded = encodeURIComponent(query.trim());
    const res = await fetchWithTimeout(`${baseUrl}/api/petition/schools?q=${encoded}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.schools)) {
        const rawFallback = Array.isArray(fallbackSchools)
          ? fallbackSchools
          : (fallbackSchools.educationalInstitutions || fallbackSchools.schools || []);
        return data.schools.map(s => {
          const match = rawFallback.find(f => f.id === s.id || (f.name && f.name.toLowerCase() === s.name?.toLowerCase()));
          const nearestStation = s.nearestStation || match?.nearestStation || null;
          const dist = s.nearestStationDistanceKm !== undefined
            ? s.nearestStationDistanceKm
            : (s.stationDistanceKm !== undefined
              ? s.stationDistanceKm
              : (match?.nearestStationDistanceKm !== undefined
                ? match.nearestStationDistanceKm
                : (match?.stationDistanceKm != null ? match.stationDistanceKm : null)));
          return {
            ...s,
            nearestStation,
            nearestStationDistanceKm: dist,
            sourceLabel: 'live server'
          };
        });
      }
    }
  } catch (_err) {
    // Fall back to bundled offline copy
  }

  const rawList = Array.isArray(fallbackSchools)
    ? fallbackSchools
    : (fallbackSchools.educationalInstitutions || fallbackSchools.schools || []);

  const schools = rawList.map(s => ({
    ...s,
    nearestStationDistanceKm: s.nearestStationDistanceKm !== undefined ? s.nearestStationDistanceKm : (s.stationDistanceKm != null ? s.stationDistanceKm : null),
    sourceLabel: 'offline copy, unverified',
    isOfflineFallback: true
  }));

  if (!q) return schools.slice(0, 50);
  return schools.filter(s =>
    (s.name && s.name.toLowerCase().includes(q)) ||
    (s.locality && s.locality.toLowerCase().includes(q)) ||
    (s.district && s.district.toLowerCase().includes(q)) ||
    (s.nearestStation && s.nearestStation.toLowerCase().includes(q))
  ).slice(0, 50);
}

/**
 * Pull empirical school-hours continuous telemetry evidence
 * Strictly throws on network failure - NEVER fabricates telemetry
 */
export async function fetchEvidence({
  schoolName,
  locality,
  stationName,
  stationDistanceKm,
  days = 14,
  threshold = 60,
  gridId
}) {
  const baseUrl = getApiBaseUrl();
  const params = new URLSearchParams();
  if (schoolName) params.append('schoolName', schoolName);
  if (locality) params.append('locality', locality);
  if (stationName) params.append('stationName', stationName);
  if (stationDistanceKm) params.append('stationDistanceKm', stationDistanceKm.toString());
  if (days) params.append('days', days.toString());
  if (threshold) params.append('threshold', threshold.toString());
  if (gridId) params.append('gridId', gridId);

  const res = await fetchWithTimeout(`${baseUrl}/api/petition/evidence?${params.toString()}`, {
    headers: { 'Accept': 'application/json' }
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Telemetry request failed with status ${res.status}`);
  }
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Telemetry evidence unavailable');
  }

  // Normalize evidence representation for both root-spread and nested structures
  const evidenceObj = data.evidence || data;

  const logs = evidenceObj.dailyLogs || [];
  const daysWithData = evidenceObj.daysWithData !== undefined
    ? evidenceObj.daysWithData
    : logs.filter(l => l.source !== 'NO_DATA').length;
  const daysMissing = evidenceObj.daysMissing !== undefined
    ? evidenceObj.daysMissing
    : logs.filter(l => l.source === 'NO_DATA').length;
  const totalDays = evidenceObj.totalDays || evidenceObj.timeHorizonDays || logs.length || days;

  const normalized = {
    ...evidenceObj,
    daysWithData,
    daysMissing,
    totalDays,
    averageMorningPm25: evidenceObj.averageMorningPm25 || evidenceObj.avgMorningPm25,
    exceedCount: evidenceObj.exceedCount !== undefined ? evidenceObj.exceedCount : (evidenceObj.exceedanceCount || 0)
  };

  return {
    success: true,
    evidence: normalized
  };
}

/**
 * Fetch 48-Hour Machine Learning Air Quality Forecast from live AWS SageMaker
 */
export async function fetchForecast({
  schoolId,
  schoolName,
  lat,
  lon,
  threshold = 60
}) {
  const baseUrl = getApiBaseUrl();
  const params = new URLSearchParams();
  if (schoolId) params.append('schoolId', schoolId);
  if (schoolName) params.append('schoolName', schoolName);
  if (lat !== undefined && lat !== null) params.append('lat', lat.toString());
  if (lon !== undefined && lon !== null) params.append('lon', lon.toString());
  if (threshold) params.append('threshold', threshold.toString());

  const res = await fetchWithTimeout(`${baseUrl}/api/petition/forecast?${params.toString()}`, {
    headers: { 'Accept': 'application/json' }
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Forecast endpoint returned HTTP ${res.status}`);
  }
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'ML forecast unavailable');
  }
  return data;
}

/**
 * Generate official bilingual civic grievance draft text
 */
export async function generateDraft({
  evidence,
  authority,
  forecast = null,
  senderName = '[YOUR NAME]',
  senderRole = '[YOUR ROLE / DESIGNATION]',
  senderContact = '[YOUR PHONE / EMAIL]',
  selectedDemands = [],
  userActionNote = undefined,
  targetType = undefined
}) {
  const baseUrl = getApiBaseUrl();
  const token = await getAccessToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetchWithTimeout(`${baseUrl}/api/petition/generate-draft`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      evidence,
      authority,
      forecast,
      senderName,
      senderRole,
      senderContact,
      selectedDemands,
      userActionNote,
      targetType: targetType || evidence?.targetType
    })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Draft generation failed: HTTP ${res.status}`);
  }
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to generate draft');
  }
  return data;
}

/**
 * Polish draft tone using live cloud AI (Claude / Gemini)
 * Transparently reports if AI is unavailable without rule-based faking
 */
export async function polishDraft({
  draftText,
  tone = 'formal',
  language = 'en',
  schoolName = 'School'
}) {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/petition/polish-draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftText, tone, language, schoolName })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || `AI polish service unavailable (HTTP ${res.status})`,
        mode: data.mode || 'UNAVAILABLE'
      };
    }
    return {
      success: true,
      polishedText: data.polishedText,
      mode: data.mode,
      model: data.model
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || 'AI polish service unavailable',
      mode: 'UNAVAILABLE'
    };
  }
}

// ============================================================================
// ON-DEVICE DOCKET STORAGE (AsyncStorage CRUD)
// Strictly stored on-device per DPDP Act 2023. No remote data storage.
// ============================================================================

/**
 * Retrieve all dockets (loaded from server when authenticated, cached in AsyncStorage).
 */
export async function getAllDockets() {
  const baseUrl = getApiBaseUrl();
  try {
    const token = await getAccessToken();
    if (token) {
      const res = await fetchWithTimeout(`${baseUrl}/api/petitions`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.petitions)) {
          const mapped = data.petitions.map(p => ({
            id: p.petitionId,
            referenceId: `VV-${p.petitionId.substring(0, 8).toUpperCase()}`,
            createdAt: new Date(p.createdAt).getTime(),
            updatedAt: new Date(p.updatedAt || p.createdAt).getTime(),
            status: p.status === 'DRAFT_SAVED' ? DOCKET_STATUS.DRAFT
                  : p.status === 'OPENED_IN_MAIL' ? DOCKET_STATUS.OPENED_IN_MAIL
                  : p.status === 'SHARED' ? DOCKET_STATUS.SHARED
                  : p.status === 'MARKED_AS_SENT' ? DOCKET_STATUS.MARKED_AS_SENT
                  : p.status || DOCKET_STATUS.DRAFT,
            targetType: p.targetType,
            targetName: p.targetName,
            schoolId: p.schoolId,
            stationName: p.stationName,
            authorityId: p.authorityId,
            authorityName: p.authorityName,
            authorityEmail: p.authorityEmail,
            subject: p.letterSubject,
            activeDraftText: p.letterText || '',
            sentDraftText: p.letterText || '',
            senderName: p.senderName || '',
            senderRole: p.senderRole || '',
            senderContact: p.senderContact || '',
            demands: p.demands || [],
            source: 'cloud'
          }));
          await AsyncStorage.setItem(DOCKET_STORAGE_KEY, JSON.stringify(mapped));
          return mapped;
        }
      }
    }
  } catch (err) {
    console.warn('[PetitionService] Remote docket fetch error, using cache:', err.message);
  }

  const raw = await AsyncStorage.getItem(DOCKET_STORAGE_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.sort((a, b) => b.createdAt - a.createdAt) : [];
  } catch (err) {
    console.error('[PetitionService] Local docket storage corrupted:', err);
    throw new Error(`Local docket storage corrupted: ${err.message}. Storage preserved without overwrite.`);
  }
}

/**
 * Save new docket with immutable snapshot of evidence and letter
 * Posts to cloud /api/petitions when authenticated.
 */
export async function saveDocket(docketData) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Please sign in to save petitions.');
  }

  // 1. Validate caller required fields
  const targetType = docketData.targetType;
  if (!targetType) {
    throw new Error('targetType is missing');
  }

  const schoolId = targetType === 'school' ? (docketData.schoolId || docketData.targetId) : undefined;
  const stationName = targetType === 'station' ? (docketData.stationName || docketData.targetName) : undefined;
  const gridId = targetType === 'grid' ? (docketData.gridId || docketData.targetId) : undefined;

  if (targetType === 'school' && !schoolId) {
    throw new Error('schoolId is missing');
  }
  if (targetType === 'station' && !stationName) {
    throw new Error('stationName is missing');
  }
  if (targetType === 'grid' && !gridId) {
    throw new Error('gridId is missing');
  }

  const authority = docketData.authority;
  const authorityName = authority?.fullName || authority?.name || docketData.authorityName;
  if (!authorityName) {
    throw new Error('authority is missing');
  }
  const authorityEmail = authority?.email || docketData.authorityEmail || '';

  const subject = docketData.subject;
  if (!subject) {
    throw new Error('subject is missing');
  }

  const activeDraftText = docketData.activeDraftText || docketData.sentDraftText;
  if (!activeDraftText) {
    throw new Error('activeDraftText is missing');
  }

  if (!docketData.clientRequestId) {
    throw new Error('clientRequestId is missing');
  }

  const statusMap = {
    'Opened in mail': 'OPENED_IN_MAIL',
    'Marked as sent': 'MARKED_AS_SENT',
    'Shared': 'SHARED',
    'Draft': 'DRAFT_SAVED'
  };

  const payload = {
    clientRequestId: docketData.clientRequestId,
    targetType,
    ...(schoolId ? { schoolId } : {}),
    ...(stationName ? { stationName } : {}),
    ...(gridId ? { gridId } : {}),
    locality: docketData.locality || '',
    authorityName,
    authorityRole: authority?.designation || docketData.authorityRole || '',
    authorityEmail,
    authorityNodalAgency: authority?.department || docketData.authorityNodalAgency || '',
    letterSubject: subject,
    letterText: activeDraftText,
    demands: docketData.selectedDemands || docketData.demands || [],
    language: docketData.selectedLanguage || 'en',
    tone: docketData.tone || 'formal',
    senderName: docketData.senderName || '',
    senderRole: docketData.senderRole || '',
    senderContact: docketData.senderContact || '',
    status: statusMap[docketData.status] || docketData.status || 'DRAFT_SAVED'
  };

  const baseUrl = getApiBaseUrl();
  const res = await fetchWithTimeout(`${baseUrl}/api/petitions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const resData = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(resData.error || `Server save failed with status ${res.status}`);
  }

  const savedCloudPetition = resData.petition;
  if (!savedCloudPetition || !savedCloudPetition.petitionId) {
    throw new Error('Invalid server response: petitionId not returned');
  }

  // Only cache locally after successful server save
  const dockets = await getAllDockets();
  const now = Date.now();
  const petitionId = savedCloudPetition.petitionId;
  const newDocket = {
    id: petitionId,
    referenceId: `VV-${petitionId.substring(0, 8).toUpperCase()}`,
    createdAt: savedCloudPetition.createdAt ? new Date(savedCloudPetition.createdAt).getTime() : now,
    updatedAt: savedCloudPetition.updatedAt ? new Date(savedCloudPetition.updatedAt).getTime() : now,
    status: docketData.status || DOCKET_STATUS.DRAFT,
    targetType,
    targetName: savedCloudPetition.targetName || docketData.targetName || (schoolId || stationName || gridId),
    locality: savedCloudPetition.locality || docketData.locality || '',
    schoolId: savedCloudPetition.schoolId || schoolId,
    stationName: savedCloudPetition.stationName || stationName,
    authorityId: authority?.id || docketData.authorityId || '',
    authorityName,
    authorityEmail,
    evidenceSnapshot: docketData.evidence || null,
    subject,
    letterTextEn: docketData.letterTextEn || (docketData.selectedLanguage === 'en' ? activeDraftText : ''),
    letterTextHi: docketData.letterTextHi || (docketData.selectedLanguage === 'hi' ? activeDraftText : ''),
    activeDraftText,
    sentDraftText: activeDraftText,
    selectedLanguage: docketData.selectedLanguage || 'en',
    tone: docketData.tone || 'formal',
    polishMode: docketData.polishMode || 'ORIGINAL_VERIFIED',
    senderName: docketData.senderName || '',
    senderRole: docketData.senderRole || '',
    senderContact: docketData.senderContact || '',
    notes: docketData.notes || '',
    cloudSynced: true
  };

  const updated = [newDocket, ...dockets.filter(d => d.id !== newDocket.id)];
  await AsyncStorage.setItem(DOCKET_STORAGE_KEY, JSON.stringify(updated));
  return newDocket;
}

/**
 * Update docket status truthfully (e.g. Draft -> Opened in mail -> Marked as sent)
 */
export async function updateDocketStatus(docketId, newStatus) {
  const baseUrl = getApiBaseUrl();
  const token = await getAccessToken();
  if (token) {
    try {
      const statusMap = {
        'Draft': 'DRAFT_SAVED',
        'Opened in mail': 'OPENED_IN_MAIL',
        'Shared': 'SHARED',
        'Marked as sent': 'MARKED_AS_SENT'
      };
      await fetchWithTimeout(`${baseUrl}/api/petitions/${docketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusMap[newStatus] || newStatus })
      });
    } catch (err) {
      console.warn('[PetitionService] Remote status update failed:', err.message);
    }
  }
  return updateDocket(docketId, { status: newStatus });
}

/**
 * Update docket with partial properties (e.g. status, sent draft text, subject)
 */
export async function updateDocket(docketId, updates = {}) {
  const dockets = await getAllDockets();
  const idx = dockets.findIndex(d => d.id === docketId);
  if (idx === -1) {
    throw new Error(`Docket with ID ${docketId} not found`);
  }
  dockets[idx] = {
    ...dockets[idx],
    ...updates,
    updatedAt: Date.now()
  };
  await AsyncStorage.setItem(DOCKET_STORAGE_KEY, JSON.stringify(dockets));
  return dockets[idx];
}

/**
 * Delete a specific docket (Right to Erasure)
 */
export async function deleteDocket(docketId) {
  const baseUrl = getApiBaseUrl();
  const token = await getAccessToken();
  if (token) {
    try {
      await fetchWithTimeout(`${baseUrl}/api/petitions/${docketId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('[PetitionService] Remote delete failed:', err.message);
    }
  }
  const dockets = await getAllDockets();
  const filtered = dockets.filter(d => d.id !== docketId);
  await AsyncStorage.setItem(DOCKET_STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Delete all dockets on device (Complete Erasure per DPDP Act)
 */
export async function deleteAllDockets() {
  const baseUrl = getApiBaseUrl();
  const token = await getAccessToken();
  if (token) {
    try {
      await fetchWithTimeout(`${baseUrl}/api/petitions`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('[PetitionService] Remote delete all failed:', err.message);
    }
  }
  await AsyncStorage.removeItem(DOCKET_STORAGE_KEY);
  return true;
}

/**
 * Warn if a grievance was already prepared for the same school/authority recently (within 7 days)
 */
export async function checkRecentDuplicate(targetName, authorityId) {
  if (!targetName || !authorityId) return { isDuplicate: false };
  const dockets = await getAllDockets();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const match = dockets.find(d =>
    d.targetName?.toLowerCase() === targetName.toLowerCase() &&
    (d.authorityId === authorityId || d.authorityName?.toLowerCase() === authorityId.toLowerCase()) &&
    (now - d.createdAt) < SEVEN_DAYS_MS
  );

  if (match) {
    return {
      isDuplicate: true,
      id: match.id,
      referenceId: match.referenceId,
      existingDocket: match,
      daysAgo: Math.max(0, Math.round((now - match.createdAt) / (24 * 60 * 60 * 1000)))
    };
  }
  return { isDuplicate: false };
}

/**
 * On-device Sender Profile (saved in AsyncStorage for user convenience)
 */
export async function getSenderProfile() {
  try {
    const raw = await AsyncStorage.getItem(SENDER_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

export async function saveSenderProfile(profile) {
  try {
    await AsyncStorage.setItem(SENDER_PROFILE_KEY, JSON.stringify(profile));
    return true;
  } catch (err) {
    return false;
  }
}
