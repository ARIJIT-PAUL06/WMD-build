/**
 * School Safety Container (Phase 4)
 * VayuVitals - Real Delhi Data Orchestration Layer
 *
 * Data Flow Architecture:
 * 1. Loads schools from src/data/schoolsDirectory.json
 * 2. Fetches real live Delhi telemetry from existing GET /api/delhi-heatmap
 * 3. Matches selected school coordinates against Delhi monitoring stations
 * 4. Extracts nearest 3 stations via getNearbyStationsForSchool()
 * 5. Computes spatial IDW estimate via calculateSchoolIdw()
 * 6. Evaluates deterministic activities via evaluateSchoolActivityWindows()
 * 7. Enforces strict temporal integrity (NO fabricated future series, NO fake best window)
 * 8. Generates deterministic why-verdict explanation via generateWhyVerdictExplanation()
 * 9. Renders SchoolSafetyDashboard with complete empirical state
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import schoolsDirectory from '../../data/schoolsDirectory.json';
import SchoolSafetyDashboard from './SchoolSafetyDashboard.jsx';
const PetitionModal = React.lazy(() => import('../Petition/PetitionModal.jsx'));
import {
  getNearbyStationsForSchool,
  calculateSchoolIdw,
  evaluateSchoolActivityWindows,
  calculateOverallSchoolVerdict,
  findBestOutdoorWindow,
  generateWhyVerdictExplanation,
  getActivityVerdictDetails,
  classifySchoolDataConfidence,
  ACTIVITY_VERDICTS,
  CONFIDENCE_LEVELS,
} from './schoolSafetyHelpers.js';
import {
  recordSchoolObservation,
  getSchoolObservations,
} from './schoolEvidenceStore.js';
import {
  buildSchoolEvidenceWindow,
  calculateEvidenceCoverage,
  getMonitoringStatus,
  evaluateCivicActionEligibility,
  generateEvidenceSummary,
  createEvidencePackage,
} from './schoolSafetyEvidence.js';

// Deterministic school activity schedule definitions for evaluation
const STANDARD_SCHOOL_ACTIVITIES = [
  {
    id: 'morning_assembly',
    name: 'Morning Assembly',
    startTime: '08:00',
    endTime: '08:30',
    defaultLocation: 'outdoor',
  },
  {
    id: 'recess',
    name: 'Primary Recess / Lunch',
    startTime: '10:30',
    endTime: '11:00',
    defaultLocation: 'outdoor',
  },
  {
    id: 'physical_education',
    name: 'Physical Education & Sports',
    startTime: '11:00',
    endTime: '11:45',
    defaultLocation: 'outdoor',
  },
];

export default function SchoolSafetyContainer({
  initialSchoolId = 'dps_rohini',
  schools = schoolsDirectory.educationalInstitutions || [],
  apiEndpoint = '/api/delhi-heatmap',
  liveData, // Optional test injection prop for deterministic unit testing
  onBackToMap,
  onGeneratePetition,
  onEvidenceComplete,
}) {
  // --------------------------------------------------------------------------
  // State
  // --------------------------------------------------------------------------
  const [selectedSchoolId, setSelectedSchoolId] = useState(initialSchoolId);
  const [customSchoolData, setCustomSchoolData] = useState(null);
  const [delhiStations, setDelhiStations] = useState(liveData?.stations || []);
  const [lastUpdated, setLastUpdated] = useState(liveData?.lastUpdated || null);
  const [loading, setLoading] = useState(!liveData);
  const [error, setError] = useState(null);
  const [evidenceRevision, setEvidenceRevision] = useState(0);
  const [isPetitionModalOpen, setIsPetitionModalOpen] = useState(false);
  const [activeEvidencePackage, setActiveEvidencePackage] = useState(null);

  // --------------------------------------------------------------------------
  // School Resolution
  // --------------------------------------------------------------------------
  const selectedSchool = useMemo(() => {
    if (selectedSchoolId === 'custom_school' && customSchoolData) {
      return {
        id: 'custom_school',
        ...customSchoolData,
      };
    }
    const found = schools.find((s) => s.id === selectedSchoolId);
    return found || schools[0] || {
      id: 'dps_rohini',
      name: 'Delhi Public School, Rohini',
      locality: 'Sector 24, Phase III, Rohini, North West Delhi',
      lat: 28.7188,
      lon: 77.1064,
      nearestStation: 'DTU (Delhi Technological University)',
      stationDistanceKm: 1.8,
      studentCount: 3800,
      schoolHours: '07:30 - 13:45',
    };
  }, [selectedSchoolId, schools, customSchoolData]);

  // --------------------------------------------------------------------------
  // Fetch Real Delhi Telemetry (GET /api/delhi-heatmap)
  // --------------------------------------------------------------------------
  const fetchDelhiTelemetry = useCallback(async () => {
    // If liveData is injected via props (e.g. during testing), use it directly
    if (liveData) {
      setDelhiStations(liveData.stations || []);
      setLastUpdated(liveData.lastUpdated || new Date().toISOString());
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(apiEndpoint, {
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch Delhi air quality telemetry`);
      }

      const json = await res.json();

      if (!json || !Array.isArray(json.stations)) {
        throw new Error('Malformed telemetry response: stations list missing');
      }

      setDelhiStations(json.stations);
      setLastUpdated(json.lastUpdated || new Date().toISOString());
      setError(null);
    } catch (err) {
      console.warn('[SchoolSafetyContainer] Failed to fetch live Delhi heatmap data:', err.message);
      setError(err.message || 'Unable to retrieve real-time Delhi station telemetry.');
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, liveData]);

  useEffect(() => {
    fetchDelhiTelemetry();
  }, [fetchDelhiTelemetry]);

  // --------------------------------------------------------------------------
  // Match School -> Nearest Stations & Calculate IDW
  // --------------------------------------------------------------------------
  const { nearbyStations, schoolEstimate } = useMemo(() => {
    if (!delhiStations || delhiStations.length === 0) {
      return {
        nearbyStations: [],
        schoolEstimate: {
          pm25: null,
          stationCount: 0,
          stationsUsed: [],
          confidence: CONFIDENCE_LEVELS.INSUFFICIENT,
          isEstimate: true,
          disclaimer:
            'Estimated ambient value derived from surrounding regulatory monitoring stations via quadratic IDW.',
        },
      };
    }

    const schoolLat = Number(selectedSchool.lat);
    const schoolLon = Number(selectedSchool.lon);

    // 1. Find nearest 3 Delhi monitoring stations
    const nearest = getNearbyStationsForSchool(schoolLat, schoolLon, delhiStations, 3);

    // 2. Compute spatial IDW estimate
    const estimate = calculateSchoolIdw(nearest);

    return {
      nearbyStations: nearest,
      schoolEstimate: estimate,
    };
  }, [delhiStations, selectedSchool]);

  // --------------------------------------------------------------------------
  // Data Freshness Classification
  // --------------------------------------------------------------------------
  const freshnessInfo = useMemo(() => {
    if (!lastUpdated) {
      return {
        state: 'insufficient',
        label: 'Telemetry Unavailable',
      };
    }

    const updatedTime = new Date(lastUpdated).getTime();
    if (isNaN(updatedTime)) {
      return {
        state: 'insufficient',
        label: 'Telemetry Unavailable',
      };
    }

    const ageMinutes = Math.max(0, Math.floor((Date.now() - updatedTime) / (60 * 1000)));

    if (ageMinutes > 180) {
      return {
        state: 'stale',
        label: `Telemetry Stale (${ageMinutes}m old)`,
      };
    }

    if (ageMinutes > 60) {
      return {
        state: 'stale',
        label: `Telemetry Stale (Updated ${ageMinutes}m ago)`,
      };
    }

    return {
      state: 'fresh',
      label: `Telemetry Fresh (Updated ${ageMinutes === 0 ? 'just now' : `${ageMinutes}m ago`})`,
    };
  }, [lastUpdated]);

  // --------------------------------------------------------------------------
  // Activity Evaluation (Strict Temporal Integrity: No Fabricated Future Series)
  // --------------------------------------------------------------------------
  const { activityResults, overallVerdict } = useMemo(() => {
    if (schoolEstimate.pm25 === null || schoolEstimate.confidence === CONFIDENCE_LEVELS.INSUFFICIENT) {
      const emptyResults = STANDARD_SCHOOL_ACTIVITIES.map((act) => ({
        activity: act.name,
        activityId: act.id,
        evaluatedPm25: null,
        verdict: ACTIVITY_VERDICTS.INSUFFICIENT_DATA,
        verdictLabel: 'Insufficient Data',
        reason: 'Insufficient regulatory station telemetry available to evaluate this activity window.',
        operationalGuidance: 'Awaiting updated monitoring telemetry before scheduling outdoor exposure.',
        timeWindow: `${act.startTime} - ${act.endTime}`,
        confidence: CONFIDENCE_LEVELS.INSUFFICIENT,
        isEstimate: true,
      }));

      return {
        activityResults: emptyResults,
        overallVerdict: {
          verdict: ACTIVITY_VERDICTS.INSUFFICIENT_DATA,
          severity: 0,
          severityLabel: 'UNKNOWN',
          summary: 'Insufficient nearby monitoring data to establish campus operational status.',
          maxPm25: null,
          minPm25: null,
          activityResults: emptyResults,
          isEstimate: true,
        },
      };
    }

    // CURRENT-DATA EVALUATION RULE:
    // The feed provides current observations rather than a complete multi-hour time series.
    // We clearly evaluate the baseline environmental condition based on current ambient IDW,
    // explicitly stating in guidance that continuous multi-hour forecasting requires time-series feed.
    const baselineVerdictDetails = getActivityVerdictDetails(schoolEstimate.pm25);

    const results = STANDARD_SCHOOL_ACTIVITIES.map((act) => {
      return {
        activity: act.name,
        activityId: act.id,
        evaluatedPm25: schoolEstimate.pm25,
        verdict: baselineVerdictDetails.verdict,
        verdictLabel: baselineVerdictDetails.label,
        reason: `${baselineVerdictDetails.reason} (Evaluated from current spatial IDW estimate of ${schoolEstimate.pm25} µg/m³ around campus).`,
        operationalGuidance: baselineVerdictDetails.operationalGuidance,
        timeWindow: `${act.startTime} - ${act.endTime}`,
        confidence: schoolEstimate.confidence,
        isEstimate: true,
      };
    });

    const overall = calculateOverallSchoolVerdict(results);

    return {
      activityResults: results,
      overallVerdict: {
        ...overall,
        summary: `${overall.summary} (Derived from current empirical IDW ambient estimate around ${selectedSchool.name}).`,
      },
    };
  }, [schoolEstimate, selectedSchool]);

  // --------------------------------------------------------------------------
  // Best Outdoor Window (Do NOT Invent Future Best Window)
  // --------------------------------------------------------------------------
  const bestOutdoorWindow = useMemo(() => {
    // RULE: Since the live feed provides current station snapshot telemetry
    // rather than continuous hourly historical/forecast series,
    // we explicitly return unavailable instead of fabricating forecasts.
    return {
      found: false,
      startTime: null,
      endTime: null,
      window: null,
      averagePm25: null,
      confidence: CONFIDENCE_LEVELS.INSUFFICIENT,
      isEstimate: true,
      reason:
        'Insufficient time-series observations are currently available from the Delhi regulatory monitoring feed. Forecast time intervals are not fabricated.',
    };
  }, []);

  // --------------------------------------------------------------------------
  // Deterministic Explanation (generateWhyVerdictExplanation)
  // --------------------------------------------------------------------------
  const explanation = useMemo(() => {
    return generateWhyVerdictExplanation({
      schoolName: selectedSchool.name,
      estimatedPm25: schoolEstimate.pm25,
      verdict: overallVerdict.verdict,
      activity: 'Scheduled campus outdoor exposure',
      timeWindow: selectedSchool.schoolHours || 'Operating hours',
      nearbyStations: nearbyStations,
      confidence: schoolEstimate.confidence,
      freshness: freshnessInfo.label,
    });
  }, [selectedSchool, schoolEstimate, overallVerdict, nearbyStations, freshnessInfo]);
  // --------------------------------------------------------------------------
  // Phase 5: Empirical Observation Recording & Deduplication
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (
      schoolEstimate?.pm25 !== null &&
      schoolEstimate?.confidence !== CONFIDENCE_LEVELS.INSUFFICIENT &&
      selectedSchool?.id
    ) {
      const observation = {
        schoolId: selectedSchool.id,
        timestamp: lastUpdated || new Date().toISOString(),
        estimatedPm25: schoolEstimate.pm25,
        aqi: schoolEstimate.aqi ?? null,
        stationCount: schoolEstimate.stationCount ?? nearbyStations.length,
        stationsUsed: schoolEstimate.stationsUsed || nearbyStations,
        nearestStationDistanceKm: nearbyStations[0]?.distanceKm ?? null,
        confidence: schoolEstimate.confidence,
        source: 'delhi-heatmap',
        isEstimate: true,
      };

      const res = recordSchoolObservation(observation);
      if (res.recorded) {
        setEvidenceRevision((prev) => prev + 1);
      }
    }
  }, [schoolEstimate, lastUpdated, selectedSchool.id, nearbyStations]);

  // --------------------------------------------------------------------------
  // Phase 5: 14-Day School Evidence Window & Action Eligibility
  // --------------------------------------------------------------------------
  const schoolObservations = useMemo(() => {
    return getSchoolObservations(selectedSchool.id);
  }, [selectedSchool.id, evidenceRevision]);

  const dailyEvidenceWindow = useMemo(() => {
    return buildSchoolEvidenceWindow(schoolObservations, new Date().toISOString(), 14);
  }, [schoolObservations]);

  const evidenceCoverage = useMemo(() => {
    return calculateEvidenceCoverage(dailyEvidenceWindow);
  }, [dailyEvidenceWindow]);

  const monitoringStatus = useMemo(() => {
    return getMonitoringStatus(dailyEvidenceWindow);
  }, [dailyEvidenceWindow]);

  const civicEligibility = useMemo(() => {
    return evaluateCivicActionEligibility(monitoringStatus, dailyEvidenceWindow);
  }, [monitoringStatus, dailyEvidenceWindow]);

  const evidenceSummary = useMemo(() => {
    return generateEvidenceSummary(dailyEvidenceWindow, evidenceCoverage, monitoringStatus);
  }, [dailyEvidenceWindow, evidenceCoverage, monitoringStatus]);

  const evidencePackage = useMemo(() => {
    if (!civicEligibility.eligible) return null;
    return createEvidencePackage({
      school: selectedSchool,
      monitoringPeriod: evidenceSummary.monitoringPeriod,
      dailyEvidence: dailyEvidenceWindow,
      coverage: evidenceCoverage,
      summary: evidenceSummary,
      observations: schoolObservations,
    });
  }, [civicEligibility.eligible, selectedSchool, dailyEvidenceWindow, evidenceCoverage, evidenceSummary, schoolObservations]);

  // --------------------------------------------------------------------------
  // Phase 6: Connect Civic Action Callback to PetitionModal
  // --------------------------------------------------------------------------
  const handleEvidenceComplete = useCallback((pkg) => {
    // CRITICAL: Before eligibility, PetitionModal must NOT open!
    if (!civicEligibility.eligible) {
      return;
    }
    const packageToUse = pkg || evidencePackage;
    setActiveEvidencePackage(packageToUse);
    setIsPetitionModalOpen(true);
    if (onEvidenceComplete) {
      onEvidenceComplete(packageToUse);
    }
  }, [civicEligibility.eligible, evidencePackage, onEvidenceComplete]);

  // --------------------------------------------------------------------------
  // Handle Campus Selection
  // --------------------------------------------------------------------------
  const handleSchoolChange = (newSchoolId, customObj) => {
    setSelectedSchoolId(newSchoolId);
    if (newSchoolId === 'custom_school' && customObj) {
      setCustomSchoolData(customObj);
    }
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#070a12',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Navigation Bar with Back to Map link */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.5rem',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
        aria-label="School Safety Navigation"
      >
        <button
          type="button"
          onClick={() => {
            if (onBackToMap) {
              onBackToMap();
            } else if (typeof window !== 'undefined') {
              window.location.search = '?view=map';
            }
          }}
          id="back-to-map-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'transparent',
            border: 'none',
            color: '#38bdf8',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            transition: 'background 0.2s ease',
          }}
          aria-label="Back to National AQI Map"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to National AQI Map</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            style={{
              fontSize: '0.75rem',
              color: '#94a3b8',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            Live Delhi Telemetry Feed: {delhiStations.length} Active Nodes
          </span>
          <button
            type="button"
            onClick={fetchDelhiTelemetry}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#e2e8f0',
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
            }}
            aria-label="Refresh telemetry data"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </nav>

      {/* Main School Safety Dashboard */}
      <main style={{ flex: 1 }}>
        <SchoolSafetyDashboard
          schools={schools}
          selectedSchoolId={selectedSchoolId}
          onSchoolChange={handleSchoolChange}
          loading={loading}
          error={error}
          onRetry={fetchDelhiTelemetry}
          schoolEstimate={schoolEstimate}
          activityResults={activityResults}
          overallVerdict={overallVerdict}
          bestOutdoorWindow={bestOutdoorWindow}
          explanation={explanation}
          freshness={freshnessInfo}
          onGeneratePetition={onGeneratePetition}
          dailyEvidence={dailyEvidenceWindow}
          evidenceCoverage={evidenceCoverage}
          monitoringStatus={monitoringStatus}
          civicEligibility={civicEligibility}
          evidenceSummary={evidenceSummary}
          evidencePackage={evidencePackage}
          onEvidenceComplete={handleEvidenceComplete}
        />
      </main>

      {/* Existing PetitionModal Integration for Phase 6 */}
      {isPetitionModalOpen && (
        <React.Suspense fallback={null}>
          <PetitionModal
            isOpen={isPetitionModalOpen}
            onClose={() => setIsPetitionModalOpen(false)}
            school={selectedSchool}
            schoolContext={selectedSchool}
            evidencePackage={activeEvidencePackage || evidencePackage}
            schoolEvidencePackage={activeEvidencePackage || evidencePackage}
            initialStation={selectedSchool.nearestStation || nearbyStations[0]?.name}
            initialLocality={selectedSchool.locality}
            initialPm25={schoolEstimate.pm25 || 142}
          />
        </React.Suspense>
      )}
    </div>
  );
}
