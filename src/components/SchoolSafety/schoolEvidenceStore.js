/**
 * School Safety Evidence Store (Phase 5)
 * VayuVitals - Client-Side Evidence Persistence & Deduplication Layer
 *
 * Provides a clean abstraction for recording and retrieving actual observations
 * for educational institutions, with strict duplicate protection and safe storage fallback.
 *
 * STORAGE RULES:
 * 1. Only store actual observations received from the live endpoint.
 * 2. Never fabricate observations to artificially fill missing days.
 * 3. Deduplicate: do not record the same schoolId + telemetry timestamp more than once.
 * 4. Handle missing, disabled, full, or corrupted localStorage safely via in-memory fallback.
 */

const STORAGE_KEY = 'vayuvitals_school_evidence_v1';

// In-memory fallback store to ensure zero runtime exceptions in Node, SSR, or private mode
let memoryStore = {};

/**
 * Safely read store from localStorage with fallback to memoryStore
 * @returns {Object} Stored observations mapped by schoolId
 */
function readStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return memoryStore;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryStore;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return memoryStore;
    }
    return parsed;
  } catch (err) {
    console.warn('[schoolEvidenceStore] Storage read failed or corrupted, falling back to memory:', err?.message);
    return memoryStore;
  }
}

/**
 * Safely persist store to localStorage with fallback to memoryStore
 * @param {Object} data - Store data
 */
function writeStorage(data) {
  memoryStore = data;
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('[schoolEvidenceStore] Storage write failed, retaining in memory:', err?.message);
  }
}

/**
 * Retrieve all recorded observations for a given schoolId, sorted chronologically.
 *
 * @param {string} schoolId - School identifier
 * @returns {Array<Object>} Array of actual observations
 */
export function getSchoolObservations(schoolId) {
  if (!schoolId) return [];
  const store = readStorage();
  const list = store[schoolId];
  if (!Array.isArray(list)) return [];

  // Return a sorted copy (chronological order)
  return [...list].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Record a single live empirical observation for a school with duplicate protection.
 *
 * @param {Object} observation - Raw observation object
 * @returns {Object} { recorded: boolean, reason?: string, observation: Object }
 */
export function recordSchoolObservation(observation) {
  if (!observation || typeof observation !== 'object') {
    return { recorded: false, reason: 'INVALID_OBSERVATION' };
  }

  const { schoolId, timestamp } = observation;
  if (!schoolId || !timestamp) {
    return { recorded: false, reason: 'MISSING_REQUIRED_FIELDS' };
  }

  const obsTime = new Date(timestamp).getTime();
  if (isNaN(obsTime)) {
    return { recorded: false, reason: 'INVALID_TIMESTAMP' };
  }

  const store = readStorage();
  const existingList = Array.isArray(store[schoolId]) ? store[schoolId] : [];

  // Deduplication: prevent recording the exact same schoolId + telemetry timestamp
  const isDuplicate = existingList.some((existing) => {
    const existingTime = new Date(existing.timestamp).getTime();
    return existingTime === obsTime;
  });

  if (isDuplicate) {
    return {
      recorded: false,
      reason: 'DUPLICATE',
      observation,
    };
  }

  // Sanitize observation record, strictly maintaining modeling rules
  const sanitized = {
    schoolId,
    timestamp: new Date(obsTime).toISOString(),
    estimatedPm25: typeof observation.estimatedPm25 === 'number' ? observation.estimatedPm25 : null,
    aqi: typeof observation.aqi === 'number' ? observation.aqi : null,
    stationCount: typeof observation.stationCount === 'number' ? observation.stationCount : 0,
    stationsUsed: Array.isArray(observation.stationsUsed) ? observation.stationsUsed : [],
    nearestStationDistanceKm:
      typeof observation.nearestStationDistanceKm === 'number' ? observation.nearestStationDistanceKm : null,
    confidence: observation.confidence || 'HIGH',
    source: observation.source || 'delhi-heatmap',
    isEstimate: true, // Always true - spatial IDW estimate
  };

  const updatedList = [...existingList, sanitized];
  const updatedStore = {
    ...store,
    [schoolId]: updatedList,
  };

  writeStorage(updatedStore);

  return {
    recorded: true,
    observation: sanitized,
  };
}

/**
 * Clear recorded observations for a given schoolId (or all schools if schoolId omitted).
 *
 * @param {string} [schoolId] - Optional school identifier
 * @returns {boolean} Success status
 */
export function clearSchoolObservations(schoolId) {
  const store = readStorage();
  if (schoolId) {
    const updatedStore = { ...store };
    delete updatedStore[schoolId];
    writeStorage(updatedStore);
  } else {
    writeStorage({});
  }
  return true;
}
