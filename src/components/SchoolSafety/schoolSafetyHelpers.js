/**
 * School Safety Environmental Decision Support Helpers
 * VayuVitals - Phase 2 Reusable Deterministic Data & Decision Logic
 *
 * IMPORTANT MODELING & SAFETY RULES:
 * 1. School-level pollution is an ESTIMATED ambient value derived via quadratic
 *    Inverse Distance Weighting (IDW) from nearby official monitoring stations.
 *    It is NEVER represented as a direct school-gate measurement.
 * 2. Thresholds and verdicts are deterministic operational engineering defaults
 *    designed for school scheduling and facilities management. They are NOT
 *    medical safety limits and do NOT provide medical advice.
 * 3. Fully deterministic: no LLMs or stochastic predictions are used here.
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

export const ACTIVITY_VERDICTS = {
  GO: 'GO',
  MODIFY: 'MODIFY',
  MODIFY_STRICT: 'MODIFY_STRICT',
  INDOORS: 'INDOORS',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
};

export const CONFIDENCE_LEVELS = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INSUFFICIENT: 'INSUFFICIENT',
};

export const DEFAULT_ACTIVITY_THRESHOLDS = {
  goodMax: 60.0,
  modifyMax: 90.0,
  modifyStrictMax: 120.0,
};

export const DEFAULT_CONFIDENCE_CONFIG = {
  highMinStations: 3,
  highMaxDistanceKm: 5.0,
  mediumMinStations: 2,
  mediumMaxDistanceKm: 12.0,
  lowMaxDistanceKm: 25.0,
  staleMaxAgeMinutes: 120,
};

export const DEFAULT_SCHOOL_ACTIVITIES = [
  { id: 'morning_assembly', name: 'Morning Assembly', startTime: '07:45', endTime: '08:15', type: 'outdoor' },
  { id: 'morning_pe', name: 'Morning Physical Education', startTime: '08:30', endTime: '09:15', type: 'outdoor' },
  { id: 'midday_recess', name: 'Midday Recess / Lunch Break', startTime: '10:30', endTime: '11:15', type: 'outdoor' },
  { id: 'afternoon_sports', name: 'After-School Sports Practice', startTime: '13:30', endTime: '14:30', type: 'outdoor' },
];

// ============================================================================
// TIME UTILITIES
// ============================================================================

/**
 * Parse time representation into minutes from midnight (0..1439).
 * Supports "HH:MM", ISO date strings, Date objects, and minutes numbers.
 *
 * @param {string|number|Date} val
 * @returns {number|null} Minutes from midnight or null if invalid
 */
export function parseTimeToMinutes(val) {
  if (val === null || val === undefined) return null;

  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return null;
    if (val >= 0 && val < 1440) return Math.floor(val);
    // Treat as epoch millisecond timestamp
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.getHours() * 60 + d.getMinutes();
    }
    return null;
  }

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.getHours() * 60 + val.getMinutes();
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    const hhMmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (hhMmMatch) {
      const hours = parseInt(hhMmMatch[1], 10);
      const minutes = parseInt(hhMmMatch[2], 10);
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return hours * 60 + minutes;
      }
      return null;
    }

    // Try parsing as ISO date string
    const parsedDate = new Date(trimmed);
    if (!isNaN(parsedDate.getTime()) && trimmed.includes('T')) {
      return parsedDate.getHours() * 60 + parsedDate.getMinutes();
    }
  }

  return null;
}

/**
 * Format minutes from midnight to "HH:MM".
 *
 * @param {number} totalMinutes
 * @returns {string}
 */
export function formatMinutesToTime(totalMinutes) {
  if (!Number.isFinite(totalMinutes)) return '--:--';
  const clamped = Math.max(0, Math.min(1439, Math.floor(totalMinutes)));
  const hours = String(Math.floor(clamped / 60)).padStart(2, '0');
  const mins = String(clamped % 60).padStart(2, '0');
  return `${hours}:${mins}`;
}

// ============================================================================
// 1. DISTANCE & NEARBY STATIONS
// ============================================================================

/**
 * Calculate Great-Circle distance between two coordinates in kilometers using Haversine formula.
 * Reuses the project's exact distance calculation convention (R = 6371 km, rounded to 1 decimal place).
 *
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number|null} Distance in km or null if invalid
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (
    lat1 === null || lat1 === undefined || typeof lat1 === 'boolean' ||
    lon1 === null || lon1 === undefined || typeof lon1 === 'boolean' ||
    lat2 === null || lat2 === undefined || typeof lat2 === 'boolean' ||
    lon2 === null || lon2 === undefined || typeof lon2 === 'boolean'
  ) {
    return null;
  }

  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);

  if (
    !Number.isFinite(nLat1) ||
    !Number.isFinite(nLon1) ||
    !Number.isFinite(nLat2) ||
    !Number.isFinite(nLon2)
  ) {
    return null;
  }

  const R = 6371;
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
  const dLon = ((nLon2 - nLon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) *
      Math.cos((nLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Alias for compatibility with backend fusion service convention
export const getDistanceKm = calculateDistanceKm;

/**
 * Find the nearest monitoring stations to a school campus.
 *
 * @param {number} schoolLat - School campus latitude
 * @param {number} schoolLon - School campus longitude
 * @param {Array<Object>} allStations - List of monitoring stations
 * @param {number} [limit=3] - Maximum number of stations to return
 * @returns {Array<Object>} Nearest stations sorted ascending by distanceKm
 */
export function getNearbyStationsForSchool(schoolLat, schoolLon, allStations, limit = 3) {
  if (
    schoolLat === null || schoolLat === undefined || typeof schoolLat === 'boolean' ||
    schoolLon === null || schoolLon === undefined || typeof schoolLon === 'boolean'
  ) {
    return [];
  }

  const sLat = Number(schoolLat);
  const sLon = Number(schoolLon);

  if (
    !Number.isFinite(sLat) ||
    !Number.isFinite(sLon) ||
    !Array.isArray(allStations) ||
    allStations.length === 0
  ) {
    return [];
  }

  const validLimit = typeof limit === 'number' && limit >= 0 ? Math.floor(limit) : 3;
  if (validLimit === 0) return [];

  const candidates = [];

  for (const st of allStations) {
    if (!st || typeof st !== 'object') continue;
    const stLat = Number(st.lat ?? st.latitude);
    const stLon = Number(st.lon ?? st.lng ?? st.longitude);

    if (!Number.isFinite(stLat) || !Number.isFinite(stLon)) continue;

    const dist = calculateDistanceKm(sLat, sLon, stLat, stLon);
    if (dist === null) continue;

    candidates.push({
      ...st,
      distanceKm: dist,
      distance: dist,
    });
  }

  candidates.sort((a, b) => a.distanceKm - b.distanceKm);
  return candidates.slice(0, validLimit);
}

// ============================================================================
// 7. DETERMINISTIC DATA QUALITY & CONFIDENCE CLASSIFICATION
// ============================================================================

/**
 * Deterministically classify data confidence into HIGH, MEDIUM, LOW, or INSUFFICIENT.
 * Based on:
 * - Number of usable nearby stations (with valid PM2.5)
 * - Proximity of nearest station
 * - Missing values
 * - Freshness/availability flags
 *
 * @param {Array<Object>} stationsUsed - Usable stations with distance and PM2.5
 * @param {Object} [options={}] - Configurable options and thresholds
 * @returns {string} One of CONFIDENCE_LEVELS (HIGH, MEDIUM, LOW, INSUFFICIENT)
 */
export function classifySchoolDataConfidence(stationsUsed, options = {}) {
  const config = { ...DEFAULT_CONFIDENCE_CONFIG, ...options };
  const stations = Array.isArray(stationsUsed) ? stationsUsed : [];

  // Filter only stations that actually possess valid, non-negative PM2.5 readings
  const usable = stations.filter(
    (st) => st && typeof st.pm25 === 'number' && Number.isFinite(st.pm25) && st.pm25 >= 0
  );

  if (usable.length === 0) {
    return CONFIDENCE_LEVELS.INSUFFICIENT;
  }

  // Determine nearest distance among usable stations
  let minDistance = Infinity;
  for (const st of usable) {
    const d = st.distanceKm ?? st.distance ?? st.distanceFromUserKm;
    if (typeof d === 'number' && Number.isFinite(d) && d >= 0) {
      if (d < minDistance) minDistance = d;
    }
  }

  // If distance is missing, assume low confidence
  if (minDistance === Infinity) {
    return CONFIDENCE_LEVELS.LOW;
  }

  // Hard distance cutoff for any reliable local estimate
  if (minDistance > config.lowMaxDistanceKm) {
    return CONFIDENCE_LEVELS.INSUFFICIENT;
  }

  // Check freshness flags if provided
  const isStale = Boolean(options.isStale);
  const dataAgeMinutes =
    typeof options.dataAgeMinutes === 'number' && Number.isFinite(options.dataAgeMinutes)
      ? options.dataAgeMinutes
      : null;
  const isExpired = dataAgeMinutes !== null && dataAgeMinutes > config.staleMaxAgeMinutes;

  if (isStale || isExpired) {
    if (usable.length >= config.highMinStations && minDistance <= config.highMaxDistanceKm) {
      return CONFIDENCE_LEVELS.LOW;
    }
    return CONFIDENCE_LEVELS.INSUFFICIENT;
  }

  // HIGH: at least highMinStations AND nearest station <= highMaxDistanceKm
  if (usable.length >= config.highMinStations && minDistance <= config.highMaxDistanceKm) {
    return CONFIDENCE_LEVELS.HIGH;
  }

  // MEDIUM: at least mediumMinStations with nearest <= mediumMaxDistanceKm
  // OR 1 usable station very close (<= 3.0 km)
  if (
    (usable.length >= config.mediumMinStations && minDistance <= config.mediumMaxDistanceKm) ||
    (usable.length >= 1 && minDistance <= 3.0)
  ) {
    return CONFIDENCE_LEVELS.MEDIUM;
  }

  // LOW: usable station within lowMaxDistanceKm
  if (minDistance <= config.lowMaxDistanceKm) {
    return CONFIDENCE_LEVELS.LOW;
  }

  return CONFIDENCE_LEVELS.INSUFFICIENT;
}

// ============================================================================
// 2. IDW CALCULATION FOR SCHOOL PM2.5 ESTIMATE
// ============================================================================

/**
 * Estimate school-area PM2.5 using the project's quadratic Inverse Distance Weighting (IDW, p=2.0).
 * Matches the weighting formula in server/fusionAqiService.js:
 *   safeDist = Math.max(0.3, dist)
 *   w = 1 / (safeDist * safeDist)
 *
 * IMPORTANT:
 * This is an ESTIMATE based on nearby monitoring stations.
 * It is never represented internally as a direct school-gate measurement.
 *
 * @param {Array<Object>} nearbyStations - Stations with distanceKm (or distance) and pm25
 * @param {Object} [config={}] - Optional confidence/threshold overrides
 * @returns {{
 *   pm25: number|null,
 *   stationCount: number,
 *   stationsUsed: Array<Object>,
 *   confidence: string,
 *   isEstimate: boolean,
 *   disclaimer: string
 * }}
 */
export function calculateSchoolIdw(nearbyStations, config = {}) {
  const DISCLAIMER =
    'Estimated ambient value derived from surrounding regulatory monitoring stations via quadratic IDW. Not a direct school-gate sensor measurement.';

  if (!Array.isArray(nearbyStations) || nearbyStations.length === 0) {
    return {
      pm25: null,
      stationCount: 0,
      stationsUsed: [],
      confidence: CONFIDENCE_LEVELS.INSUFFICIENT,
      isEstimate: true,
      disclaimer: DISCLAIMER,
    };
  }

  // Filter stations that have valid, finite PM2.5 values
  const usable = nearbyStations.filter(
    (st) => st && typeof st.pm25 === 'number' && Number.isFinite(st.pm25) && st.pm25 >= 0
  );

  if (usable.length === 0) {
    return {
      pm25: null,
      stationCount: 0,
      stationsUsed: [],
      confidence: CONFIDENCE_LEVELS.INSUFFICIENT,
      isEstimate: true,
      disclaimer: DISCLAIMER,
    };
  }

  let totalWeight = 0;
  let weightedPm25 = 0;

  for (const st of usable) {
    const rawDist =
      typeof st.distanceKm === 'number'
        ? st.distanceKm
        : typeof st.distance === 'number'
        ? st.distance
        : typeof st.distanceFromUserKm === 'number'
        ? st.distanceFromUserKm
        : 0.3;

    const dist = Number.isFinite(rawDist) && rawDist >= 0 ? rawDist : 0.3;
    const safeDist = Math.max(0.3, dist);
    const w = 1 / (safeDist * safeDist);

    totalWeight += w;
    weightedPm25 += st.pm25 * w;
  }

  const estimatedPm25 =
    totalWeight > 0 ? Math.round((weightedPm25 / totalWeight) * 10) / 10 : null;

  const confidence = classifySchoolDataConfidence(usable, config);

  return {
    pm25: estimatedPm25,
    stationCount: usable.length,
    stationsUsed: usable.map((s) => ({
      id: s.id,
      name: s.name,
      distanceKm: s.distanceKm ?? s.distance ?? null,
      pm25: s.pm25,
    })),
    confidence,
    isEstimate: true,
    disclaimer: DISCLAIMER,
  };
}

// ============================================================================
// 3. ACTIVITY WINDOW EVALUATION
// ============================================================================

/**
 * Return verdict details and operational guidance for a specific PM2.5 value.
 *
 * Deterministic Threshold Boundaries:
 *   PM2.5 <= 60          -> GO
 *   PM2.5 > 60 and <= 90 -> MODIFY
 *   PM2.5 > 90 and <= 120 -> MODIFY_STRICT
 *   PM2.5 > 120          -> INDOORS
 *
 * @param {number|null} pm25
 * @param {Object} [config={}]
 * @returns {Object}
 */
export function getActivityVerdictDetails(pm25, config = {}) {
  const thresholds = { ...DEFAULT_ACTIVITY_THRESHOLDS, ...(config.thresholds || {}) };

  if (pm25 === null || pm25 === undefined || !Number.isFinite(Number(pm25))) {
    return {
      verdict: ACTIVITY_VERDICTS.INSUFFICIENT_DATA,
      label: 'Insufficient Data',
      severity: 0,
      reason: 'Insufficient environmental monitoring data available to determine operational status for this window.',
      operationalGuidance: 'Awaiting updated monitoring telemetry before scheduling outdoor exposure.',
    };
  }

  const val = Number(pm25);

  if (val <= thresholds.goodMax) {
    return {
      verdict: ACTIVITY_VERDICTS.GO,
      label: 'Good / Go',
      severity: 1,
      reason: `Estimated PM2.5 (${val} µg/m³) is within standard operational baseline (≤ ${thresholds.goodMax} µg/m³).`,
      operationalGuidance: 'Outdoor activity may proceed normally with standard student hydration.',
    };
  }

  if (val <= thresholds.modifyMax) {
    return {
      verdict: ACTIVITY_VERDICTS.MODIFY,
      label: 'Modify Activity',
      severity: 2,
      reason: `Estimated PM2.5 (${val} µg/m³) indicates elevated particulate pollution (> ${thresholds.goodMax} to ≤ ${thresholds.modifyMax} µg/m³).`,
      operationalGuidance: 'Operational guidance: reduce session duration, lower physical exertion intensity, and incorporate rest intervals.',
    };
  }

  if (val <= thresholds.modifyStrictMax) {
    return {
      verdict: ACTIVITY_VERDICTS.MODIFY_STRICT,
      label: 'Modify Strictly',
      severity: 3,
      reason: `Estimated PM2.5 (${val} µg/m³) indicates substantial particulate pollution (> ${thresholds.modifyMax} to ≤ ${thresholds.modifyStrictMax} µg/m³).`,
      operationalGuidance: 'Operational guidance: restrict vigorous aerobic exertion, avoid prolonged outdoor exposure, or relocate activities to covered/sheltered areas.',
    };
  }

  return {
    verdict: ACTIVITY_VERDICTS.INDOORS,
    label: 'Move Indoors',
    severity: 4,
    reason: `Estimated PM2.5 (${val} µg/m³) exceeds outdoor operational threshold (> ${thresholds.modifyStrictMax} µg/m³).`,
    operationalGuidance: 'Operational guidance: transition all planned outdoor activities indoors into enclosed, air-filtered facilities.',
  };
}

/**
 * Evaluate school activities against deterministic PM2.5 thresholds.
 *
 * @param {Array<Object>|number|Object} pm25Series - Time-series points, single number, or IDW object
 * @param {Array<Object>} [activities] - List of activity objects
 * @param {Object} [config={}] - Optional configuration
 * @returns {Array<Object>} Evaluated activity results
 */
export function evaluateSchoolActivityWindows(pm25Series, activities, config = {}) {
  const acts =
    Array.isArray(activities) && activities.length > 0
      ? activities
      : DEFAULT_SCHOOL_ACTIVITIES;

  // Case A: pm25Series is a single number or IDW result object with a scalar PM2.5
  let scalarPm25 = null;
  let scalarConfidence = CONFIDENCE_LEVELS.HIGH;

  if (typeof pm25Series === 'number' && Number.isFinite(pm25Series)) {
    scalarPm25 = pm25Series;
  } else if (
    pm25Series &&
    typeof pm25Series === 'object' &&
    !Array.isArray(pm25Series) &&
    typeof pm25Series.pm25 === 'number' &&
    Number.isFinite(pm25Series.pm25)
  ) {
    scalarPm25 = pm25Series.pm25;
    if (pm25Series.confidence) scalarConfidence = pm25Series.confidence;
  }

  // Pre-parse time-series points if array provided
  const parsedSeries = Array.isArray(pm25Series)
    ? pm25Series
        .map((pt) => {
          if (typeof pt === 'number' && Number.isFinite(pt)) {
            return { mins: null, pm25: pt, confidence: CONFIDENCE_LEVELS.HIGH };
          }
          if (pt && typeof pt === 'object') {
            const mins = parseTimeToMinutes(pt.time ?? pt.timestamp ?? pt.hour);
            const val = Number(pt.pm25 ?? pt.value);
            return {
              mins,
              pm25: Number.isFinite(val) ? val : null,
              confidence: pt.confidence || CONFIDENCE_LEVELS.HIGH,
            };
          }
          return null;
        })
        .filter((pt) => pt && pt.pm25 !== null)
    : [];

  return acts.map((act) => {
    const actName = act.name || act.activity || act.id || 'Scheduled Activity';
    const actId = act.id || null;
    const windowStr =
      act.timeWindow ||
      (act.startTime && act.endTime ? `${act.startTime} - ${act.endTime}` : 'School Hours');

    // 1. If activity has explicit pm25 override:
    if (typeof act.pm25 === 'number' && Number.isFinite(act.pm25)) {
      const details = getActivityVerdictDetails(act.pm25, config);
      return {
        activity: actName,
        activityId: actId,
        evaluatedPm25: act.pm25,
        verdict: details.verdict,
        verdictLabel: details.label,
        reason: details.reason,
        operationalGuidance: details.operationalGuidance,
        timeWindow: windowStr,
        confidence: act.confidence || CONFIDENCE_LEVELS.HIGH,
        isEstimate: true,
      };
    }

    // 2. If scalar PM2.5 provided:
    if (scalarPm25 !== null) {
      const details = getActivityVerdictDetails(scalarPm25, config);
      return {
        activity: actName,
        activityId: actId,
        evaluatedPm25: scalarPm25,
        verdict: details.verdict,
        verdictLabel: details.label,
        reason: details.reason,
        operationalGuidance: details.operationalGuidance,
        timeWindow: windowStr,
        confidence: scalarConfidence,
        isEstimate: true,
      };
    }

    // 3. Match against time series if start/end times exist:
    const startMins = parseTimeToMinutes(act.startTime);
    const endMins = parseTimeToMinutes(act.endTime);

    if (startMins !== null && endMins !== null && parsedSeries.length > 0) {
      const matchingPoints = parsedSeries.filter(
        (p) => p.mins !== null && p.mins >= startMins && p.mins <= endMins
      );

      if (matchingPoints.length > 0) {
        const sum = matchingPoints.reduce((acc, curr) => acc + curr.pm25, 0);
        const avg = Math.round((sum / matchingPoints.length) * 10) / 10;
        const details = getActivityVerdictDetails(avg, config);

        // Derive confidence from constituent points
        let conf = CONFIDENCE_LEVELS.HIGH;
        if (matchingPoints.some((p) => p.confidence === CONFIDENCE_LEVELS.INSUFFICIENT)) {
          conf = CONFIDENCE_LEVELS.LOW;
        } else if (matchingPoints.some((p) => p.confidence === CONFIDENCE_LEVELS.LOW)) {
          conf = CONFIDENCE_LEVELS.LOW;
        } else if (matchingPoints.some((p) => p.confidence === CONFIDENCE_LEVELS.MEDIUM)) {
          conf = CONFIDENCE_LEVELS.MEDIUM;
        }

        return {
          activity: actName,
          activityId: actId,
          evaluatedPm25: avg,
          verdict: details.verdict,
          verdictLabel: details.label,
          reason: details.reason,
          operationalGuidance: details.operationalGuidance,
          timeWindow: windowStr,
          confidence: conf,
          isEstimate: true,
          dataPointsCount: matchingPoints.length,
        };
      }
    }

    // 4. Fallback if series is untimed numbers or no matching timed points:
    if (parsedSeries.length > 0) {
      // Use average of entire series if untimed
      const sum = parsedSeries.reduce((acc, curr) => acc + curr.pm25, 0);
      const avg = Math.round((sum / parsedSeries.length) * 10) / 10;
      const details = getActivityVerdictDetails(avg, config);
      return {
        activity: actName,
        activityId: actId,
        evaluatedPm25: avg,
        verdict: details.verdict,
        verdictLabel: details.label,
        reason: details.reason,
        operationalGuidance: details.operationalGuidance,
        timeWindow: windowStr,
        confidence: CONFIDENCE_LEVELS.MEDIUM,
        isEstimate: true,
      };
    }

    // 5. Insufficient data:
    const details = getActivityVerdictDetails(null, config);
    return {
      activity: actName,
      activityId: actId,
      evaluatedPm25: null,
      verdict: details.verdict,
      verdictLabel: details.label,
      reason: details.reason,
      operationalGuidance: details.operationalGuidance,
      timeWindow: windowStr,
      confidence: CONFIDENCE_LEVELS.INSUFFICIENT,
      isEstimate: true,
    };
  });
}

// ============================================================================
// 4. OVERALL SCHOOL VERDICT
// ============================================================================

/**
 * Combine activity results into one deterministic school-level status.
 *
 * Severity Hierarchy:
 *   4 - INDOORS (Critical)
 *   3 - MODIFY_STRICT (Warning)
 *   2 - MODIFY (Caution)
 *   1 - GO (Normal)
 *   0 - INSUFFICIENT_DATA (Unknown)
 *
 * @param {Array<Object>} activityResults - Results from evaluateSchoolActivityWindows
 * @returns {{
 *   verdict: string,
 *   severity: number,
 *   severityLabel: string,
 *   summary: string,
 *   maxPm25: number|null,
 *   minPm25: number|null,
 *   activityResults: Array<Object>,
 *   isEstimate: boolean
 * }}
 */
export function calculateOverallSchoolVerdict(activityResults) {
  if (!Array.isArray(activityResults) || activityResults.length === 0) {
    return {
      verdict: ACTIVITY_VERDICTS.INSUFFICIENT_DATA,
      severity: 0,
      severityLabel: 'UNKNOWN',
      summary: 'No activity results available to evaluate school operational status.',
      maxPm25: null,
      minPm25: null,
      activityResults: [],
      isEstimate: true,
    };
  }

  const validResults = activityResults.filter(
    (r) => r && r.verdict && r.verdict !== ACTIVITY_VERDICTS.INSUFFICIENT_DATA
  );

  if (validResults.length === 0) {
    return {
      verdict: ACTIVITY_VERDICTS.INSUFFICIENT_DATA,
      severity: 0,
      severityLabel: 'UNKNOWN',
      summary: 'Insufficient environmental monitoring data across all evaluated activity windows.',
      maxPm25: null,
      minPm25: null,
      activityResults,
      isEstimate: true,
    };
  }

  const hasIndoors = validResults.some((r) => r.verdict === ACTIVITY_VERDICTS.INDOORS);
  const hasModifyStrict = validResults.some((r) => r.verdict === ACTIVITY_VERDICTS.MODIFY_STRICT);
  const hasModify = validResults.some((r) => r.verdict === ACTIVITY_VERDICTS.MODIFY);

  let overallVerdict;
  let severity;
  let severityLabel;
  let summary;

  if (hasIndoors) {
    overallVerdict = ACTIVITY_VERDICTS.INDOORS;
    severity = 4;
    severityLabel = 'CRITICAL';
    summary =
      'One or more scheduled activity windows exceed the outdoor threshold (> 120 µg/m³). All outdoor activities must be transitioned indoors to filtered spaces.';
  } else if (hasModifyStrict) {
    overallVerdict = ACTIVITY_VERDICTS.MODIFY_STRICT;
    severity = 3;
    severityLabel = 'WARNING';
    summary =
      'Substantial particulate pollution estimated during scheduled windows. Strenuous outdoor exertion should be restricted or moved to covered/sheltered areas.';
  } else if (hasModify) {
    overallVerdict = ACTIVITY_VERDICTS.MODIFY;
    severity = 2;
    severityLabel = 'CAUTION';
    summary =
      'Elevated particulate pollution estimated during scheduled windows. Reduce outdoor duration and lower physical exertion intensity.';
  } else {
    overallVerdict = ACTIVITY_VERDICTS.GO;
    severity = 1;
    severityLabel = 'NORMAL';
    summary =
      'Estimated particulate air quality is within operational baseline (≤ 60 µg/m³) across all evaluated activity windows.';
  }

  const pm25Values = validResults
    .map((r) => r.evaluatedPm25)
    .filter((v) => typeof v === 'number' && Number.isFinite(v));

  const maxPm25 = pm25Values.length > 0 ? Math.max(...pm25Values) : null;
  const minPm25 = pm25Values.length > 0 ? Math.min(...pm25Values) : null;

  return {
    verdict: overallVerdict,
    severity,
    severityLabel,
    summary,
    maxPm25,
    minPm25,
    activityResults,
    isEstimate: true,
  };
}

// ============================================================================
// 5. BEST OUTDOOR WINDOW FINDER
// ============================================================================

/**
 * Find the lowest-pollution continuous outdoor window during the school's operating hours.
 *
 * Requirements:
 * - Only uses values actually present in pm25Series.
 * - Never fabricates forecast values.
 * - Respects schoolDayStart and schoolDayEnd.
 * - Returns explicit insufficient-data result when data is inadequate.
 *
 * @param {Array<Object>} pm25Series - Time series array with time and pm25
 * @param {string|number} [schoolDayStart='07:30'] - School day start time (e.g. "07:30")
 * @param {string|number} [schoolDayEnd='14:00'] - School day end time (e.g. "14:00")
 * @param {number} [durationMinutes=30] - Desired continuous window duration in minutes
 * @param {number} [stepMinutes=15] - Search step in minutes
 * @returns {{
 *   found: boolean,
 *   startTime: string|null,
 *   endTime: string|null,
 *   window: string|null,
 *   averagePm25: number|null,
 *   confidence: string,
 *   dataPointsCount?: number,
 *   isEstimate: boolean,
 *   reason?: string
 * }}
 */
export function findBestOutdoorWindow(
  pm25Series,
  schoolDayStart = '07:30',
  schoolDayEnd = '14:00',
  durationMinutes = 30,
  stepMinutes = 15
) {
  const insufficientResult = (reason) => ({
    found: false,
    startTime: null,
    endTime: null,
    window: null,
    averagePm25: null,
    confidence: CONFIDENCE_LEVELS.INSUFFICIENT,
    isEstimate: true,
    reason,
  });

  const startMins = parseTimeToMinutes(schoolDayStart);
  const endMins = parseTimeToMinutes(schoolDayEnd);

  if (startMins === null || endMins === null || endMins <= startMins) {
    return insufficientResult(
      'Invalid school operating hours: end time must be strictly after start time.'
    );
  }

  const duration =
    typeof durationMinutes === 'number' && durationMinutes > 0
      ? Math.floor(durationMinutes)
      : 30;
  const step =
    typeof stepMinutes === 'number' && stepMinutes > 0 ? Math.floor(stepMinutes) : 15;

  if (endMins - startMins < duration) {
    return insufficientResult(
      'Requested activity duration exceeds total school operating hours.'
    );
  }

  if (!Array.isArray(pm25Series) || pm25Series.length === 0) {
    return insufficientResult('No environmental monitoring time series data provided.');
  }

  // Parse and filter data points strictly within operating hours
  const filteredPoints = [];

  for (const pt of pm25Series) {
    if (!pt || typeof pt !== 'object') continue;
    const mins = parseTimeToMinutes(pt.time ?? pt.timestamp ?? pt.hour);
    const pm25 = Number(pt.pm25 ?? pt.value);

    if (
      mins !== null &&
      Number.isFinite(pm25) &&
      pm25 >= 0 &&
      mins >= startMins &&
      mins <= endMins
    ) {
      filteredPoints.push({
        mins,
        pm25,
        confidence: pt.confidence || CONFIDENCE_LEVELS.HIGH,
      });
    }
  }

  if (filteredPoints.length === 0) {
    return insufficientResult(
      'No empirical monitoring data points found within specified school operating hours.'
    );
  }

  filteredPoints.sort((a, b) => a.mins - b.mins);

  // Generate candidate window start times strictly from empirical observation timestamps
  // present in filteredPoints that can accommodate durationMinutes within operating hours.
  const candidateStarts = new Set();

  for (const pt of filteredPoints) {
    if (pt.mins <= endMins - duration) {
      candidateStarts.add(pt.mins);
    }
  }

  // If no points fall early enough to start a window, check if a window ending at endMins covers any points
  if (candidateStarts.size === 0 && endMins - duration >= startMins) {
    const candidateEndStart = endMins - duration;
    const hasPoints = filteredPoints.some(
      (p) => p.mins >= candidateEndStart && p.mins <= endMins
    );
    if (hasPoints) {
      candidateStarts.add(candidateEndStart);
    }
  }

  const sortedStarts = Array.from(candidateStarts).sort((a, b) => a - b);

  let bestWindow = null;

  for (const wStart of sortedStarts) {
    const wEnd = wStart + duration;
    // Points falling inside [wStart, wEnd]
    const ptsInWindow = filteredPoints.filter((p) => p.mins >= wStart && p.mins <= wEnd);

    if (ptsInWindow.length === 0) continue;

    const sum = ptsInWindow.reduce((acc, curr) => acc + curr.pm25, 0);
    const avgPm25 = Math.round((sum / ptsInWindow.length) * 10) / 10;

    // Aggregate confidence from points
    let conf = CONFIDENCE_LEVELS.HIGH;
    if (ptsInWindow.some((p) => p.confidence === CONFIDENCE_LEVELS.INSUFFICIENT)) {
      conf = CONFIDENCE_LEVELS.LOW;
    } else if (ptsInWindow.some((p) => p.confidence === CONFIDENCE_LEVELS.LOW)) {
      conf = CONFIDENCE_LEVELS.LOW;
    } else if (ptsInWindow.some((p) => p.confidence === CONFIDENCE_LEVELS.MEDIUM)) {
      conf = CONFIDENCE_LEVELS.MEDIUM;
    }

    if (!bestWindow || avgPm25 < bestWindow.avgPm25) {
      bestWindow = {
        start: wStart,
        end: wEnd,
        avgPm25,
        confidence: conf,
        count: ptsInWindow.length,
      };
    }
  }

  if (!bestWindow) {
    return insufficientResult(
      'Insufficient continuous monitoring data points to cover requested window duration.'
    );
  }

  const startTimeStr = formatMinutesToTime(bestWindow.start);
  const endTimeStr = formatMinutesToTime(bestWindow.end);

  return {
    found: true,
    startTime: startTimeStr,
    endTime: endTimeStr,
    window: `${startTimeStr} - ${endTimeStr}`,
    averagePm25: bestWindow.avgPm25,
    confidence: bestWindow.confidence,
    dataPointsCount: bestWindow.count,
    isEstimate: true,
  };
}

// ============================================================================
// 6. WHY VERDICT EXPLANATION GENERATOR (DETERMINISTIC, NO LLM)
// ============================================================================

/**
 * Generate a deterministic human-readable explanation from supplied facts.
 * Explains:
 * - Estimated PM2.5
 * - Nearby station evidence
 * - Activity and window being evaluated
 * - Resulting verdict and rationale
 * - Data freshness and confidence
 *
 * Does NOT use an LLM.
 *
 * @param {Object} context
 * @returns {string} Human-readable explanation text
 */
export function generateWhyVerdictExplanation(context = {}) {
  const {
    schoolName = 'School campus',
    activity = 'Scheduled outdoor session',
    timeWindow = 'Operating hours',
    verdict = 'UNKNOWN',
    confidence = CONFIDENCE_LEVELS.INSUFFICIENT,
    freshness,
  } = context;

  const rawPm25 = context.estimatedPm25 ?? context.pm25;
  const hasPm25 = typeof rawPm25 === 'number' && Number.isFinite(rawPm25);
  const pm25 = hasPm25 ? Math.round(rawPm25 * 10) / 10 : null;

  const stations = Array.isArray(context.nearbyStations)
    ? context.nearbyStations
    : Array.isArray(context.stationsUsed)
    ? context.stationsUsed
    : [];

  const sentences = [];

  // 1. Activity & Estimated PM2.5
  if (hasPm25) {
    sentences.push(
      `For "${activity}" during ${timeWindow} at ${schoolName}, the estimated ambient PM2.5 concentration is ${pm25} µg/m³.`
    );
  } else {
    sentences.push(
      `For "${activity}" during ${timeWindow} at ${schoolName}, no reliable PM2.5 estimate could be established.`
    );
  }

  // 2. Station Evidence
  if (stations.length > 0) {
    const stationEvidence = stations
      .map((st) => {
        const name = st.name || st.id || 'Monitoring Station';
        const d = st.distanceKm ?? st.distance;
        const distStr = typeof d === 'number' ? ` at ${d} km` : '';
        const pmStr = typeof st.pm25 === 'number' ? ` (${st.pm25} µg/m³)` : '';
        return `${name}${distStr}${pmStr}`;
      })
      .join('; ');
    sentences.push(
      `Evidence base: Derived via quadratic inverse distance weighting from ${stations.length} nearby regulatory monitoring station(s): ${stationEvidence}.`
    );
  } else {
    sentences.push(
      `Evidence base: No surrounding regulatory monitoring stations with usable PM2.5 telemetry were available.`
    );
  }

  // 3. Verdict Rationale & Operational Guidance
  switch (verdict) {
    case ACTIVITY_VERDICTS.GO:
      sentences.push(
        `Operational Verdict: GO. Because estimated PM2.5 (${pm25} µg/m³) is at or below the 60 µg/m³ operational threshold, standard outdoor activities may proceed.`
      );
      break;
    case ACTIVITY_VERDICTS.MODIFY:
      sentences.push(
        `Operational Verdict: MODIFY. Because estimated PM2.5 (${pm25} µg/m³) is between 60 and 90 µg/m³, activities should be modified by shortening duration and reducing physical exertion.`
      );
      break;
    case ACTIVITY_VERDICTS.MODIFY_STRICT:
      sentences.push(
        `Operational Verdict: MODIFY_STRICT. Because estimated PM2.5 (${pm25} µg/m³) is between 90 and 120 µg/m³, vigorous aerobic exercise must be avoided and activities should be relocated to sheltered or covered areas.`
      );
      break;
    case ACTIVITY_VERDICTS.INDOORS:
      sentences.push(
        `Operational Verdict: INDOORS. Because estimated PM2.5 (${pm25} µg/m³) exceeds 120 µg/m³, all planned outdoor activities must transition indoors into filtered facilities.`
      );
      break;
    default:
      sentences.push(
        `Operational Verdict: INSUFFICIENT DATA. Incomplete monitoring data prevents establishing an operational status.`
      );
      break;
  }

  // 4. Data Quality & Confidence
  const freshnessText = freshness ? ` (Freshness: ${freshness})` : '';
  sentences.push(`Data Confidence: Classified as ${confidence}${freshnessText}.`);

  // 5. Mandatory Modeling Rule & Engineering Boundary
  sentences.push(
    `Note: This is an estimated ambient value derived from surrounding regulatory monitoring stations, not a direct school-gate measurement. Operational guidance is for facilities planning and does not constitute medical advice.`
  );

  return sentences.join(' ');
}
