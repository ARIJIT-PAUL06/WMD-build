/**
 * School Safety Dashboard UI
 * VayuVitals - Phase 3 Reusable Component
 *
 * Designed for Phase 4 live data injection via props without requiring any redesign.
 *
 * IMPORTANT MODELING & SAFETY RULES:
 * 1. School pollution is always labeled as "Estimated around school", derived via
 *    spatial Inverse Distance Weighting from nearby regulatory monitoring stations.
 * 2. It is NEVER represented as a direct school-gate sensor measurement.
 * 3. Operational guidance is for facilities/scheduling only and does NOT constitute medical advice.
 * 4. User-facing status mapping:
 *    - GO → GO
 *    - MODIFY → MODIFY
 *    - MODIFY_STRICT → MODIFY
 *    - INDOORS → INDOORS
 *    - INSUFFICIENT_DATA → INSUFFICIENT DATA
 */

import React, { useState, useMemo } from 'react';
import {
  School,
  Wind,
  Clock,
  Info,
  RefreshCw,
  Users,
  MapPin,
  ChevronDown,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import schoolsDirectory from '../../data/schoolsDirectory.json';
import {
  generateWhyVerdictExplanation,
  ACTIVITY_VERDICTS,
  CONFIDENCE_LEVELS,
} from './schoolSafetyHelpers.js';
import {
  buildSchoolEvidenceWindow,
  calculateEvidenceCoverage,
  getMonitoringStatus,
  evaluateCivicActionEligibility,
  generateEvidenceSummary,
} from './schoolSafetyEvidence.js';
import SchoolSafetyTopGrid from './SchoolSafetyTopGrid';
import SchoolActivityTimeline from './SchoolActivityTimeline';
import SchoolWhyVerdictAccordion from './SchoolWhyVerdictAccordion';
import SchoolEvidence14DaySection from './SchoolEvidence14DaySection';
import SchoolCivicActionCard from './SchoolCivicActionCard';
import './SchoolSafetyDashboard.css';

/**
 * Map internal deterministic statuses to user-facing display text
 * Rule: MODIFY_STRICT displays to users as "MODIFY"
 */
export function mapUserFacingStatus(internalStatus) {
  if (!internalStatus) return 'INSUFFICIENT DATA';
  switch (internalStatus) {
    case ACTIVITY_VERDICTS.GO:
      return 'GO';
    case ACTIVITY_VERDICTS.MODIFY:
    case ACTIVITY_VERDICTS.MODIFY_STRICT:
      return 'MODIFY';
    case ACTIVITY_VERDICTS.INDOORS:
      return 'INDOORS';
    case ACTIVITY_VERDICTS.INSUFFICIENT_DATA:
    default:
      return 'INSUFFICIENT DATA';
  }
}

/**
 * Return CSS status variant class based on internal status
 */
function getStatusCssClass(status) {
  switch (status) {
    case ACTIVITY_VERDICTS.GO:
      return 'status-go';
    case ACTIVITY_VERDICTS.MODIFY:
    case ACTIVITY_VERDICTS.MODIFY_STRICT:
      return 'status-modify';
    case ACTIVITY_VERDICTS.INDOORS:
      return 'status-indoors';
    default:
      return 'status-insufficient';
  }
}

export default function SchoolSafetyDashboard({
  schools = schoolsDirectory.educationalInstitutions,
  selectedSchoolId = 'dps_rohini',
  onSchoolChange,
  loading = false,
  error = null,
  onRetry,
  schoolEstimate,
  activityResults,
  overallVerdict,
  bestOutdoorWindow,
  explanation,
  freshness,
  onGeneratePetition,
  // Phase 5 props:
  dailyEvidence,
  evidenceCoverage,
  monitoringStatus,
  civicEligibility,
  evidenceSummary,
  evidencePackage,
  onEvidenceComplete,
}) {
  // --------------------------------------------------------------------------
  // Internal State
  // --------------------------------------------------------------------------
  const [activeSchoolId, setActiveSchoolId] = useState(selectedSchoolId);
  const [isWhyExpanded, setIsWhyExpanded] = useState(false);

  // Custom school state when "custom_school" is selected
  const [customSchoolData, setCustomSchoolData] = useState({
    name: 'Custom Delhi Campus',
    locality: 'Central Delhi',
    lat: 28.6304,
    lon: 77.2177,
    schoolHours: '07:30 - 13:45',
    studentCount: 2500,
    nearestStation: 'Mandir Marg CAAQMS',
    stationDistanceKm: 1.5,
  });

  // Keep activeSchoolId in sync if prop changes
  const effectiveSchoolId = selectedSchoolId || activeSchoolId;

  // Selected School Resolution
  const selectedSchool = useMemo(() => {
    if (effectiveSchoolId === 'custom_school') {
      return {
        id: 'custom_school',
        ...customSchoolData,
      };
    }
    const found = schools.find((s) => s.id === effectiveSchoolId);
    return found || schools[0] || customSchoolData;
  }, [effectiveSchoolId, schools, customSchoolData]);

  // Handle school dropdown change
  const handleSchoolSelectChange = (e) => {
    const newId = e.target.value;
    setActiveSchoolId(newId);
    if (onSchoolChange) {
      const match = newId === 'custom_school'
        ? { id: 'custom_school', ...customSchoolData }
        : schools.find((s) => s.id === newId);
      onSchoolChange(newId, match);
    }
  };

  // --------------------------------------------------------------------------
  // Default Pipeline (Returns explicit uninitialized state when props are omitted)
  // --------------------------------------------------------------------------
  const fallbackEstimate = useMemo(() => {
    return {
      pm25: null,
      stationCount: 0,
      stationsUsed: [],
      confidence: 'INSUFFICIENT',
      isEstimate: true,
      disclaimer: 'Awaiting regulatory monitoring telemetry before computing spatial campus estimate.',
    };
  }, []);

  const effectiveEstimate = schoolEstimate ?? fallbackEstimate;

  const fallbackActivityResults = useMemo(() => {
    return [];
  }, []);

  const effectiveActivityResults = activityResults ?? fallbackActivityResults;

  const fallbackOverallVerdict = useMemo(() => {
    return {
      verdict: 'INSUFFICIENT_DATA',
      severity: 0,
      severityLabel: 'UNKNOWN',
      summary: 'Insufficient nearby monitoring data to establish campus operational status.',
      maxPm25: null,
      minPm25: null,
      activityResults: [],
      isEstimate: true,
    };
  }, []);

  const effectiveOverallVerdict = overallVerdict ?? fallbackOverallVerdict;

  const fallbackBestWindow = useMemo(() => {
    return {
      found: false,
      startTime: null,
      endTime: null,
      window: null,
      averagePm25: null,
      confidence: 'INSUFFICIENT',
      isEstimate: true,
      reason: 'No continuous hourly observations available to determine optimal outdoor window.',
    };
  }, []);

  const effectiveBestWindow = bestOutdoorWindow ?? fallbackBestWindow;

  // Freshness parsing
  const freshnessInfo = useMemo(() => {
    if (typeof freshness === 'string') {
      const lower = freshness.toLowerCase();
      if (lower.includes('stale')) return { state: 'stale', label: freshness };
      if (lower.includes('insufficient')) return { state: 'insufficient', label: freshness };
      return { state: 'fresh', label: freshness };
    }
    if (freshness && typeof freshness === 'object') {
      return {
        state: freshness.state || 'fresh',
        label: freshness.label || 'Telemetry Active',
      };
    }
    return { state: 'fresh', label: 'Telemetry Active (Within 15 mins)' };
  }, [freshness]);

  // Deterministic explanation
  const effectiveExplanation = useMemo(() => {
    if (explanation) return explanation;
    return generateWhyVerdictExplanation({
      schoolName: selectedSchool.name,
      estimatedPm25: effectiveEstimate?.pm25,
      verdict: effectiveOverallVerdict?.verdict,
      activity: 'Scheduled outdoor campus activities',
      timeWindow: selectedSchool.schoolHours || 'Operating hours',
      nearbyStations: effectiveEstimate?.stationsUsed || [],
      confidence: effectiveEstimate?.confidence || CONFIDENCE_LEVELS.HIGH,
      freshness: freshnessInfo.label,
    });
  }, [explanation, selectedSchool, effectiveEstimate, effectiveOverallVerdict, freshnessInfo]);

  // Status mapping
  const userFacingOverallStatus = mapUserFacingStatus(effectiveOverallVerdict?.verdict);
  const statusCssClass = getStatusCssClass(effectiveOverallVerdict?.verdict);

  // --------------------------------------------------------------------------
  // Phase 5: 14-Day Monitoring & Civic Action Fallbacks
  // --------------------------------------------------------------------------
  const effectiveDailyEvidence = useMemo(() => {
    if (dailyEvidence && Array.isArray(dailyEvidence) && dailyEvidence.length > 0) {
      return dailyEvidence;
    }
    return buildSchoolEvidenceWindow([], new Date().toISOString(), 14);
  }, [dailyEvidence]);

  const effectiveCoverage = useMemo(() => {
    if (evidenceCoverage) return evidenceCoverage;
    return calculateEvidenceCoverage(effectiveDailyEvidence);
  }, [evidenceCoverage, effectiveDailyEvidence]);

  const effectiveMonitoringStatus = useMemo(() => {
    if (monitoringStatus) return monitoringStatus;
    return getMonitoringStatus(effectiveDailyEvidence);
  }, [monitoringStatus, effectiveDailyEvidence]);

  const effectiveCivicEligibility = useMemo(() => {
    if (civicEligibility) return civicEligibility;
    return evaluateCivicActionEligibility(effectiveMonitoringStatus, effectiveDailyEvidence);
  }, [civicEligibility, effectiveMonitoringStatus, effectiveDailyEvidence]);

  const effectiveSummary = useMemo(() => {
    if (evidenceSummary) return evidenceSummary;
    return generateEvidenceSummary(effectiveDailyEvidence, effectiveCoverage, effectiveMonitoringStatus);
  }, [evidenceSummary, effectiveDailyEvidence, effectiveCoverage, effectiveMonitoringStatus]);

  // --------------------------------------------------------------------------
  // Loading State
  // --------------------------------------------------------------------------
  if (loading) {
    return (
      <section
        className="school-safety-dashboard"
        aria-label="School Safety Dashboard"
        role="region"
      >
        <div className="ssd-loading-container" role="status" aria-live="polite">
          <div className="ssd-spinner-box">
            <RefreshCw size={28} className="animate-spin" aria-hidden="true" />
          </div>
          <p className="ssd-loading-text">Loading campus environmental intelligence...</p>
          <div className="ssd-skeleton-grid" aria-hidden="true">
            <div className="ssd-skeleton-card" />
            <div className="ssd-skeleton-card" />
            <div className="ssd-skeleton-card" />
          </div>
        </div>
      </section>
    );
  }

  // --------------------------------------------------------------------------
  // Error State
  // --------------------------------------------------------------------------
  if (error) {
    return (
      <section
        className="school-safety-dashboard"
        aria-label="School Safety Dashboard"
        role="region"
      >
        <div className="ssd-error-container" role="alert">
          <div className="ssd-error-top">
            <AlertTriangle size={20} aria-hidden="true" />
            <span>Unable to load School Safety data</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.86rem' }}>
            {typeof error === 'string' ? error : error.message || 'An unexpected error occurred.'}
          </p>
          {onRetry && (
            <div>
              <button
                type="button"
                className="ssd-btn ssd-btn-secondary"
                onClick={onRetry}
                aria-label="Retry loading school safety data"
              >
                <RefreshCw size={14} aria-hidden="true" />
                <span>Retry</span>
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  // --------------------------------------------------------------------------
  // Render Main Dashboard
  // --------------------------------------------------------------------------
  return (
    <section
      className="school-safety-dashboard"
      aria-label="SafeRecess School Safety Dashboard"
      role="region"
    >
      {/* 1. Header & Campus Selector */}
      <header className="ssd-header">
        <div className="ssd-header-glow" aria-hidden="true" />
        <div className="ssd-header-top">
          <div className="ssd-title-group">
            <h1>
              <School size={28} aria-hidden="true" />
              <span>SafeRecess™ School Safety Dashboard</span>
            </h1>
            <p className="ssd-subtitle">
              Continuous spatial particulate estimation & schedule optimization for Delhi-NCR
              educational institutions. Providing empirical environmental operational guidance.
            </p>
          </div>

          {/* School Selector Dropdown */}
          <div className="ssd-selector-container">
            <label htmlFor="school-selector" className="ssd-selector-label">
              <MapPin size={12} aria-hidden="true" />
              <span>Select Institution / Campus</span>
            </label>
            <div className="ssd-select-wrapper">
              <select
                id="school-selector"
                className="ssd-select"
                value={effectiveSchoolId}
                onChange={handleSchoolSelectChange}
                aria-label="Select educational institution"
              >
                {schools.map((sch) => (
                  <option key={sch.id} value={sch.id}>
                    {sch.name} ({sch.city || 'Delhi'})
                  </option>
                ))}
                <option value="custom_school">+ Enter Custom School / Campus...</option>
              </select>
              <ChevronDown size={14} className="ssd-select-icon" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Custom School Inline Editor */}
        {effectiveSchoolId === 'custom_school' && (
          <div className="ssd-custom-school-box" role="form" aria-label="Custom school parameters">
            <div className="ssd-input-group">
              <label htmlFor="custom-school-name">School Name</label>
              <input
                id="custom-school-name"
                className="ssd-input"
                type="text"
                value={customSchoolData.name}
                onChange={(e) =>
                  setCustomSchoolData({ ...customSchoolData, name: e.target.value })
                }
                placeholder="e.g. Sardar Patel Vidyalaya"
              />
            </div>
            <div className="ssd-input-group">
              <label htmlFor="custom-school-locality">Locality</label>
              <input
                id="custom-school-locality"
                className="ssd-input"
                type="text"
                value={customSchoolData.locality}
                onChange={(e) =>
                  setCustomSchoolData({ ...customSchoolData, locality: e.target.value })
                }
                placeholder="e.g. Lodi Estate, New Delhi"
              />
            </div>
            <div className="ssd-input-group">
              <label htmlFor="custom-school-hours">Operating Hours</label>
              <input
                id="custom-school-hours"
                className="ssd-input"
                type="text"
                value={customSchoolData.schoolHours}
                onChange={(e) =>
                  setCustomSchoolData({ ...customSchoolData, schoolHours: e.target.value })
                }
                placeholder="07:30 - 13:45"
              />
            </div>
            <div className="ssd-input-group">
              <label htmlFor="custom-school-students">Approx. Student Count</label>
              <input
                id="custom-school-students"
                className="ssd-input"
                type="number"
                value={customSchoolData.studentCount}
                onChange={(e) =>
                  setCustomSchoolData({
                    ...customSchoolData,
                    studentCount: Number(e.target.value) || 1000,
                  })
                }
                placeholder="2500"
              />
            </div>
          </div>
        )}

        {/* Selected School Profile Pills */}
        <div className="ssd-campus-profile">
          <span className="ssd-profile-badge highlight">
            <MapPin size={12} aria-hidden="true" />
            <span>{selectedSchool.locality || 'Delhi-NCR'}</span>
          </span>

          {selectedSchool.lat && selectedSchool.lon && (
            <span className="ssd-profile-badge">
              <span>{`${Number(selectedSchool.lat).toFixed(4)}°N, ${Number(selectedSchool.lon).toFixed(4)}°E`}</span>
            </span>
          )}

          <span className="ssd-profile-badge">
            <Clock size={12} aria-hidden="true" />
            <span>{`Hours: ${selectedSchool.schoolHours || '07:30 - 14:00'}`}</span>
          </span>

          {selectedSchool.studentCount && (
            <span className="ssd-profile-badge">
              <Users size={12} aria-hidden="true" />
              <span>{`${Number(selectedSchool.studentCount).toLocaleString('en-IN')} Students`}</span>
            </span>
          )}

          {selectedSchool.nearestStation && (
            <span className="ssd-profile-badge">
              <Wind size={12} aria-hidden="true" />
              <span>
                {`Nearest Monitor: ${selectedSchool.nearestStation}${selectedSchool.stationDistanceKm ? ` (${selectedSchool.stationDistanceKm} km)` : ''}`}
              </span>
            </span>
          )}
        </div>
      </header>

      {/* 2. Telemetry & Freshness Bar */}
      <div className="ssd-telemetry-bar">
        <div className="ssd-freshness-indicator">
          <span className={`ssd-freshness-dot ${freshnessInfo.state}`} aria-hidden="true" />
          <span>{freshnessInfo.label}</span>
        </div>

        <div className="ssd-action-btns">
          {onRetry && (
            <button
              type="button"
              className="ssd-btn ssd-btn-secondary"
              onClick={onRetry}
              aria-label="Refresh environmental telemetry"
            >
              <RefreshCw size={13} aria-hidden="true" />
              <span>Refresh</span>
            </button>
          )}

          {onGeneratePetition && (
            <button
              type="button"
              className="ssd-btn ssd-btn-petition"
              onClick={() => onGeneratePetition(selectedSchool)}
              aria-label="Generate formal civic grievance petition for this school"
            >
              <FileText size={13} aria-hidden="true" />
              <span>Generate Civic Petition</span>
            </button>
          )}
        </div>
      </div>

      {/* Insufficient Data Warning Banner if applicable */}
      {effectiveOverallVerdict?.verdict === ACTIVITY_VERDICTS.INSUFFICIENT_DATA && (
        <div className="ssd-insufficient-banner" role="status">
          <Info size={18} color="#94a3b8" style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
          <div>
            <strong>Insufficient Regulatory Monitoring Telemetry:</strong> There are currently not
            enough nearby continuous monitoring stations reporting valid PM2.5 measurements to compute a
            statistically reliable spatial estimate for {selectedSchool.name}. No forecast values have
            been fabricated.
          </div>
        </div>
      )}

      {/* 3. Top Metrics Grid: Status, Overview & Best Window */}
      <SchoolSafetyTopGrid
        effectiveOverallVerdict={effectiveOverallVerdict}
        statusCssClass={statusCssClass}
        effectiveEstimate={effectiveEstimate}
        userFacingOverallStatus={userFacingOverallStatus}
        effectiveBestWindow={effectiveBestWindow}
      />

      {/* 4. Activity Timeline Section */}
      <SchoolActivityTimeline
        effectiveActivityResults={effectiveActivityResults}
        mapUserFacingStatus={mapUserFacingStatus}
      />

      {/* 5. "Why This Verdict" Expandable Panel */}
      <SchoolWhyVerdictAccordion
        isWhyExpanded={isWhyExpanded}
        setIsWhyExpanded={setIsWhyExpanded}
        effectiveExplanation={effectiveExplanation}
        effectiveEstimate={effectiveEstimate}
        selectedSchool={selectedSchool}
        userFacingOverallStatus={userFacingOverallStatus}
      />

      {/* 6. 14-Day Monitoring Section */}
      <SchoolEvidence14DaySection
        effectiveCoverage={effectiveCoverage}
        effectiveMonitoringStatus={effectiveMonitoringStatus}
        effectiveDailyEvidence={effectiveDailyEvidence}
      />

      {/* 7. Civic Action Card */}
      <SchoolCivicActionCard
        effectiveCivicEligibility={effectiveCivicEligibility}
        effectiveSummary={effectiveSummary}
        onEvidenceComplete={onEvidenceComplete}
        evidencePackage={evidencePackage}
      />
    </section>
  );
}
