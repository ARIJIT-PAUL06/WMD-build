/**
 * School Safety Evidence & Monitoring Data Model (Phase 5)
 * VayuVitals - 14-Day School Environmental Monitoring & Evidence Aggregation
 *
 * CRITICAL MODELING & EVIDENCE RULES:
 * 1. School pollution is strictly labeled as "Estimated around school" (spatial IDW).
 * 2. It is NEVER represented as direct school sensor data.
 * 3. Daily aggregation uses ONLY actual observations supplied.
 * 4. Missing calendar days are never interpolated, manufactured, or populated with fake data.
 * 5. A 14-day monitoring window represents an evidence collection workflow rule,
 *    not an official government regulation unless explicitly established.
 * 6. Continuous monitoring status is deterministically computed from actual evidence coverage.
 * 7. Civic action workflow is unlocked ONLY when the 14-day monitoring period is complete
 *    and verified with sufficient coverage. Before that, status is "Continue monitoring".
 */

export const DAY_STATUS = {
  OBSERVED: 'OBSERVED',
  PARTIAL: 'PARTIAL',
  NO_DATA: 'NO_DATA',
};

export const MONITORING_STATUS = {
  MONITORING: 'MONITORING',
  COMPLETE: 'COMPLETE',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
};

export const DATA_QUALITY = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INSUFFICIENT: 'INSUFFICIENT',
  NO_DATA: 'NO_DATA',
};

/**
 * Format a Date object or timestamp into YYYY-MM-DD
 * @param {Date|string|number} input
 * @returns {string|null}
 */
export function formatCalendarDate(input) {
  if (!input) return null;
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Deterministically aggregate actual observations by calendar day.
 *
 * @param {Array<Object>} observations - Array of raw school observations
 * @param {Object} options - Aggregation options
 * @returns {Array<Object>} Chronologically sorted daily evidence summaries
 */
export function aggregateDailySchoolEvidence(observations = [], options = {}) {
  if (!Array.isArray(observations) || observations.length === 0) {
    return [];
  }

  // Filter valid observations with a parseable timestamp
  const validObservations = observations.filter((obs) => {
    if (!obs || typeof obs !== 'object') return false;
    const dateStr = formatCalendarDate(obs.timestamp);
    return dateStr !== null;
  });

  if (validObservations.length === 0) {
    return [];
  }

  // Group by YYYY-MM-DD calendar day
  const grouped = new Map();
  for (const obs of validObservations) {
    const dateStr = formatCalendarDate(obs.timestamp);
    if (!grouped.has(dateStr)) {
      grouped.set(dateStr, []);
    }
    grouped.get(dateStr).push(obs);
  }

  // Sort calendar dates chronologically
  const sortedDates = Array.from(grouped.keys()).sort();

  return sortedDates.map((dateStr) => {
    const dayObs = grouped.get(dateStr);

    // Sort observations in this day chronologically
    dayObs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const observationCount = dayObs.length;
    const firstObservationAt = dayObs[0].timestamp;
    const lastObservationAt = dayObs[dayObs.length - 1].timestamp;

    // PM2.5 metrics across supplied observations
    const validPm25 = dayObs
      .map((o) => (typeof o.estimatedPm25 === 'number' && !isNaN(o.estimatedPm25) ? o.estimatedPm25 : null))
      .filter((v) => v !== null);

    let averagePm25 = null;
    let minPm25 = null;
    let maxPm25 = null;

    if (validPm25.length > 0) {
      minPm25 = Math.min(...validPm25);
      maxPm25 = Math.max(...validPm25);
      const sum = validPm25.reduce((acc, v) => acc + v, 0);
      averagePm25 = Math.round((sum / validPm25.length) * 10) / 10;
    }

    // AQI metrics across supplied observations
    const validAqi = dayObs
      .map((o) => (typeof o.aqi === 'number' && !isNaN(o.aqi) ? o.aqi : null))
      .filter((v) => v !== null);

    let averageAqi = null;
    if (validAqi.length > 0) {
      const sum = validAqi.reduce((acc, v) => acc + v, 0);
      averageAqi = Math.round(sum / validAqi.length);
    }

    // Distinct monitoring stations observed
    const stationSet = new Set();
    for (const o of dayObs) {
      if (Array.isArray(o.stationsUsed)) {
        for (const st of o.stationsUsed) {
          const name = typeof st === 'string' ? st : st?.name;
          if (name) stationSet.add(name);
        }
      }
    }
    const stationsObserved = Array.from(stationSet);

    // Confidence and data quality resolution
    const confidences = dayObs.map((o) => o.confidence).filter(Boolean);
    let confidence = 'INSUFFICIENT';
    if (confidences.includes('HIGH')) {
      confidence = 'HIGH';
    } else if (confidences.includes('MEDIUM')) {
      confidence = 'MEDIUM';
    } else if (confidences.includes('LOW')) {
      confidence = 'LOW';
    }

    // Quality determination based on count and confidence
    let dataQuality = DATA_QUALITY.INSUFFICIENT;
    if (observationCount >= (options.minObservationsPerDay || 1) && averagePm25 !== null) {
      if (confidence === 'HIGH') dataQuality = DATA_QUALITY.HIGH;
      else if (confidence === 'MEDIUM') dataQuality = DATA_QUALITY.MEDIUM;
      else dataQuality = DATA_QUALITY.LOW;
    }

    return {
      date: dateStr,
      observationCount,
      firstObservationAt,
      lastObservationAt,
      averagePm25,
      minPm25,
      maxPm25,
      averageAqi,
      confidence,
      stationsObserved,
      dataQuality,
      isEstimate: true,
    };
  });
}

/**
 * Build a chronological 14-day school evidence window.
 *
 * Missing days remain explicit NO_DATA entries without fabricating values.
 *
 * @param {Array<Object>} observations - Raw observations
 * @param {string|Date} endDate - End date of the window (defaults to latest obs date or today)
 * @param {number} days - Window length in calendar days (default 14)
 * @param {Object} options - Threshold options
 * @returns {Array<Object>} Chronological array of daily window objects
 */
export function buildSchoolEvidenceWindow(observations = [], endDate = null, days = 14, options = {}) {
  const dailyAggregates = aggregateDailySchoolEvidence(observations, options);
  const aggregateMap = new Map(dailyAggregates.map((d) => [d.date, d]));

  // Determine the window reference end date
  let referenceEnd;
  if (endDate) {
    referenceEnd = new Date(endDate);
  } else if (dailyAggregates.length > 0) {
    referenceEnd = new Date(dailyAggregates[dailyAggregates.length - 1].date);
  } else {
    referenceEnd = new Date();
  }

  if (isNaN(referenceEnd.getTime())) {
    referenceEnd = new Date();
  }

  // Minimum observations required for a day to be classified as full OBSERVED vs PARTIAL
  const minObsForFull = options.minObservationsForFull ?? options.minObservationsPerDay ?? 1;

  const windowDays = [];
  for (let i = days - 1; i >= 0; i--) {
    const cur = new Date(referenceEnd);
    cur.setDate(cur.getDate() - i);
    const dateStr = formatCalendarDate(cur);

    if (aggregateMap.has(dateStr)) {
      const agg = aggregateMap.get(dateStr);
      let status = DAY_STATUS.OBSERVED;
      if (agg.observationCount < minObsForFull) {
        status = DAY_STATUS.PARTIAL;
      }

      windowDays.push({
        date: dateStr,
        status,
        observationCount: agg.observationCount,
        firstObservationAt: agg.firstObservationAt,
        lastObservationAt: agg.lastObservationAt,
        averagePm25: agg.averagePm25,
        minPm25: agg.minPm25,
        maxPm25: agg.maxPm25,
        averageAqi: agg.averageAqi,
        confidence: agg.confidence,
        stationsObserved: agg.stationsObserved,
        dataQuality: agg.dataQuality,
        isEstimate: true,
      });
    } else {
      // Explicit NO_DATA entry — NO fabricated values
      windowDays.push({
        date: dateStr,
        status: DAY_STATUS.NO_DATA,
        observationCount: 0,
        firstObservationAt: null,
        lastObservationAt: null,
        averagePm25: null,
        minPm25: null,
        maxPm25: null,
        averageAqi: null,
        confidence: 'INSUFFICIENT',
        stationsObserved: [],
        dataQuality: DATA_QUALITY.NO_DATA,
        isEstimate: true,
      });
    }
  }

  return windowDays;
}

/**
 * Calculate evidence coverage metrics over the monitoring window.
 *
 * @param {Array<Object>} dailyEvidence - Daily window array
 * @param {Object} options - Coverage calculation options
 * @returns {Object} Coverage metrics
 */
export function calculateEvidenceCoverage(dailyEvidence = [], options = {}) {
  const daysInWindow = dailyEvidence.length || (options.days ?? 14);
  const requiredDays = options.requiredDays ?? 14;

  const observedDays = dailyEvidence.filter((d) => d.status === DAY_STATUS.OBSERVED).length;
  const partialDays = dailyEvidence.filter((d) => d.status === DAY_STATUS.PARTIAL).length;
  const missingDays = dailyEvidence.filter((d) => d.status === DAY_STATUS.NO_DATA).length;

  const coveragePercent = daysInWindow > 0 ? Math.round((observedDays / daysInWindow) * 100) : 0;
  const sufficientForAction = observedDays >= requiredDays;

  let reason = '';
  if (sufficientForAction) {
    reason = `Sufficient evidence collected: ${observedDays} of ${requiredDays} required monitoring days verified.`;
  } else if (observedDays === 0 && partialDays === 0) {
    reason = `No empirical monitoring observations recorded yet for this 14-day window.`;
  } else {
    reason = `Incomplete evidence coverage: ${observedDays} observed, ${partialDays} partial, ${missingDays} missing out of ${daysInWindow} calendar days. ${requiredDays} observed days required.`;
  }

  return {
    daysInWindow,
    observedDays,
    partialDays,
    missingDays,
    coveragePercent,
    sufficientForAction,
    requiredDays,
    reason,
  };
}

/**
 * Evaluate the overall monitoring status for the evidence window.
 *
 * Rules:
 * - COMPLETE: required period has elapsed AND sufficient evidence coverage achieved
 * - INSUFFICIENT_DATA: monitoring period has elapsed but required coverage was NOT met
 * - MONITORING: evidence window is actively in progress; continue collecting observations
 *
 * @param {Array<Object>} dailyEvidence - Array of 14-day evidence items
 * @param {Object} options - Status options
 * @returns {string} One of MONITORING_STATUS
 */
export function getMonitoringStatus(dailyEvidence = [], options = {}) {
  const coverage = calculateEvidenceCoverage(dailyEvidence, options);
  const requiredDays = options.requiredDays ?? 14;

  // 1. If sufficient observed days are met, it is COMPLETE
  if (coverage.observedDays >= requiredDays) {
    return MONITORING_STATUS.COMPLETE;
  }

  // 2. If the period has elapsed explicitly or through historical window evaluation
  if (options.isPeriodElapsed === true || options.periodElapsed === true) {
    return MONITORING_STATUS.INSUFFICIENT_DATA;
  }

  // Check if 14 calendar days have passed between the first observation and the window end
  const daysWithData = dailyEvidence.filter((d) => d.status !== DAY_STATUS.NO_DATA);
  if (daysWithData.length > 0) {
    const firstDate = new Date(daysWithData[0].date);
    const lastDate = new Date(dailyEvidence[dailyEvidence.length - 1].date);
    const elapsedDays = Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1;

    // If 14 or more calendar days have elapsed since monitoring started, but coverage wasn't met
    if (elapsedDays >= requiredDays && coverage.observedDays < requiredDays) {
      return MONITORING_STATUS.INSUFFICIENT_DATA;
    }
  }

  // 3. Otherwise monitoring is ongoing
  return MONITORING_STATUS.MONITORING;
}

/**
 * Determine eligibility for the civic action / petition workflow.
 *
 * Rule:
 * Action workflow is AVAILABLE only when the 14-day monitoring status is COMPLETE
 * and sufficient evidence coverage is verified.
 *
 * @param {string} monitoringStatus - Status from getMonitoringStatus()
 * @param {Array<Object>} dailyEvidence - Window array
 * @param {Object} options - Evaluation options
 * @returns {Object} Eligibility decision
 */
export function evaluateCivicActionEligibility(monitoringStatus, dailyEvidence = [], options = {}) {
  const coverage = calculateEvidenceCoverage(dailyEvidence, options);
  const requiredDays = options.requiredDays ?? 14;

  const isComplete =
    monitoringStatus === MONITORING_STATUS.COMPLETE && coverage.sufficientForAction;

  if (isComplete) {
    return {
      eligible: true,
      status: 'Evidence period complete',
      reason: `14-day continuous monitoring evidence period is complete and verified (${coverage.observedDays}/${requiredDays} days). Civic action workflow is available.`,
      requiredDays,
      observedDays: coverage.observedDays,
      missingDays: coverage.missingDays,
    };
  }

  // Before evidence is complete: locked state
  return {
    eligible: false,
    status: 'Continue monitoring',
    reason: `14 days of sufficient evidence are required before the civic action workflow becomes available. Currently ${coverage.observedDays}/${requiredDays} days observed.`,
    requiredDays,
    observedDays: coverage.observedDays,
    missingDays: coverage.missingDays,
  };
}

/**
 * Generate a deterministic summary of the 14-day school monitoring evidence.
 *
 * @param {Array<Object>} dailyEvidence - Daily window array
 * @param {Object} coverage - Coverage object
 * @param {string} monitoringStatus - Status string
 * @returns {Object} Factual evidence summary
 */
export function generateEvidenceSummary(dailyEvidence = [], coverage = null, monitoringStatus = null) {
  const cov = coverage || calculateEvidenceCoverage(dailyEvidence);
  const status = monitoringStatus || getMonitoringStatus(dailyEvidence);

  const daysWithPm25 = dailyEvidence.filter((d) => typeof d.averagePm25 === 'number' && !isNaN(d.averagePm25));

  let averagePm25 = null;
  let highestDailyPm25 = null;
  let lowestDailyPm25 = null;

  if (daysWithPm25.length > 0) {
    const pm25List = daysWithPm25.map((d) => d.averagePm25);
    highestDailyPm25 = Math.max(...pm25List);
    lowestDailyPm25 = Math.min(...pm25List);
    const sum = pm25List.reduce((acc, v) => acc + v, 0);
    averagePm25 = Math.round((sum / pm25List.length) * 10) / 10;
  }

  const daysWithAqi = dailyEvidence.filter((d) => typeof d.averageAqi === 'number' && !isNaN(d.averageAqi));
  let averageAqi = null;
  if (daysWithAqi.length > 0) {
    const aqiList = daysWithAqi.map((d) => d.averageAqi);
    const sum = aqiList.reduce((acc, v) => acc + v, 0);
    averageAqi = Math.round(sum / aqiList.length);
  }

  const totalObservations = dailyEvidence.reduce((acc, d) => acc + (d.observationCount || 0), 0);

  const startDate = dailyEvidence[0]?.date || null;
  const endDate = dailyEvidence[dailyEvidence.length - 1]?.date || null;

  return {
    monitoringPeriod: {
      startDate,
      endDate,
      totalDays: dailyEvidence.length,
    },
    observedDays: cov.observedDays,
    partialDays: cov.partialDays,
    missingDays: cov.missingDays,
    averagePm25,
    highestDailyPm25,
    lowestDailyPm25,
    averageAqi,
    coveragePercent: cov.coveragePercent,
    confidenceSummary:
      daysWithPm25.length > 0
        ? 'Derived from surrounding continuous regulatory monitoring stations via quadratic IDW.'
        : 'Awaiting sufficient regulatory monitoring observations.',
    qualitySummary:
      cov.observedDays >= 14
        ? 'Verified continuous spatial monitoring evidence over 14 calendar days.'
        : `Monitoring in progress (${cov.observedDays}/14 verified days).`,
    monitoringStatus: status,
    totalObservations,
    isEstimate: true,
  };
}

/**
 * Assemble a structured evidence package when civic action becomes eligible.
 *
 * @param {Object} params
 * @returns {Object} Structured civic evidence package
 */
export function createEvidencePackage({
  school,
  monitoringPeriod,
  dailyEvidence = [],
  coverage,
  summary,
  observations = [],
}) {
  return {
    school: {
      id: school?.id || 'unknown_school',
      name: school?.name || 'Unnamed Institution',
      locality: school?.locality || 'Delhi NCR',
      lat: school?.lat ?? null,
      lon: school?.lon ?? null,
      nearestStation: school?.nearestStation || null,
      stationDistanceKm: school?.stationDistanceKm ?? null,
      studentCount: school?.studentCount ?? null,
      schoolHours: school?.schoolHours || '08:00 - 14:00',
    },
    monitoringPeriod: monitoringPeriod || {
      startDate: dailyEvidence[0]?.date || null,
      endDate: dailyEvidence[dailyEvidence.length - 1]?.date || null,
      totalDays: dailyEvidence.length,
    },
    dailyEvidence: dailyEvidence.map((d) => ({
      date: d.date,
      status: d.status,
      observationCount: d.observationCount,
      averagePm25: d.averagePm25,
      averageAqi: d.averageAqi,
      confidence: d.confidence,
      dataQuality: d.dataQuality,
      isEstimate: true,
    })),
    coverage: coverage || calculateEvidenceCoverage(dailyEvidence),
    summary: summary || generateEvidenceSummary(dailyEvidence),
    observations: observations.map((o) => ({
      timestamp: o.timestamp,
      estimatedPm25: o.estimatedPm25,
      aqi: o.aqi,
      stationCount: o.stationCount,
      confidence: o.confidence,
      source: o.source,
      isEstimate: true,
    })),
    generatedAt: new Date().toISOString(),
    isEstimate: true,
    methodology: 'Quadratic Inverse Distance Weighting (IDW) from nearest CPCB/DPCC regulatory monitoring stations',
  };
}
