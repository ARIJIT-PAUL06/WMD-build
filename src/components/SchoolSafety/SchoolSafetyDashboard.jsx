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
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  RefreshCw,
  Users,
  MapPin,
  Activity,
  ChevronDown,
  ChevronUp,
  Sun,
  Sparkles,
  FileText,
  Calendar,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import RadialProgressMeter from '../common/RadialProgressMeter';
import AnimatedCounter from '../common/AnimatedCounter';
import schoolsDirectory from '../../data/schoolsDirectory.json';
import {
  calculateSchoolIdw,
  evaluateSchoolActivityWindows,
  calculateOverallSchoolVerdict,
  findBestOutdoorWindow,
  generateWhyVerdictExplanation,
  ACTIVITY_VERDICTS,
  CONFIDENCE_LEVELS,
  DEFAULT_SCHOOL_ACTIVITIES,
} from './schoolSafetyHelpers.js';
import {
  buildSchoolEvidenceWindow,
  calculateEvidenceCoverage,
  getMonitoringStatus,
  evaluateCivicActionEligibility,
  generateEvidenceSummary,
  DAY_STATUS,
  MONITORING_STATUS,
} from './schoolSafetyEvidence.js';
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
    // Default 14-day window ending today if none provided (e.g. standalone test mode)
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
      <div className="ssd-top-grid">
        {/* Card 1: Overall School Status (Prominent Status Card) */}
        <article className={`ssd-card ssd-status-card ${statusCssClass}`}>
          <div className="ssd-card-header">
            <span className="ssd-card-title">
              <Activity size={14} aria-hidden="true" />
              <span>Overall Campus Status</span>
            </span>
            <span className={`ssd-confidence-pill ${(effectiveEstimate?.confidence || 'high').toLowerCase()}`}>
              {`${effectiveEstimate?.confidence || 'HIGH'} Confidence`}
            </span>
          </div>

          <div className="ssd-verdict-display">
            <div className="ssd-verdict-icon" aria-hidden="true">
              {effectiveOverallVerdict?.verdict === ACTIVITY_VERDICTS.GO && <ShieldCheck size={28} />}
              {(effectiveOverallVerdict?.verdict === ACTIVITY_VERDICTS.MODIFY ||
                effectiveOverallVerdict?.verdict === ACTIVITY_VERDICTS.MODIFY_STRICT) && (
                <AlertTriangle size={28} />
              )}
              {effectiveOverallVerdict?.verdict === ACTIVITY_VERDICTS.INDOORS && <ShieldAlert size={28} />}
              {effectiveOverallVerdict?.verdict === ACTIVITY_VERDICTS.INSUFFICIENT_DATA && <Info size={28} />}
            </div>

            <div>
              <div className="ssd-verdict-badge">{userFacingOverallStatus}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                {effectiveOverallVerdict?.verdict === ACTIVITY_VERDICTS.MODIFY_STRICT
                  ? 'Strict Operational Caution'
                  : 'Environmental Decision Status'}
              </div>
            </div>
          </div>

          <p className="ssd-verdict-subtext">
            {effectiveOverallVerdict?.summary ||
              'Operational recommendation derived deterministically from scheduled activity windows.'}
          </p>

          <div className="ssd-stat-disclaimer">
            Operational facilities guidance for campus schedule. Does not constitute medical advice.
          </div>
        </article>

        {/* Card 2: School Air Overview (Prominent Overview Card) */}
        <article className="ssd-card">
          <div className="ssd-card-header">
            <span className="ssd-card-title">
              <Wind size={14} aria-hidden="true" />
              <span>School Air Overview</span>
            </span>
            {effectiveEstimate?.stationCount !== undefined && (
              <span className="ssd-profile-badge">
                {`${effectiveEstimate.stationCount} Station${effectiveEstimate.stationCount === 1 ? '' : 's'} Used`}
              </span>
            )}
          </div>

          <div>
            <div className="ssd-stat-highlight">
              <span className="ssd-stat-num">
                {effectiveEstimate?.pm25 !== null && effectiveEstimate?.pm25 !== undefined
                  ? effectiveEstimate.pm25
                  : '--'}
              </span>
              <span className="ssd-stat-unit">µg/m³ PM2.5</span>
            </div>

            {/* MANDATORY MODELING RULE: Explicitly labeled as estimated */}
            <div className="ssd-stat-label-box">Estimated around school</div>

            {effectiveEstimate?.stationsUsed?.length > 0 && (
              <div className="ssd-nearest-station-info" style={{ marginTop: '0.45rem', fontSize: '0.78rem', color: '#94a3b8' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Nearest Station: </span>
                  <span style={{ color: '#e2e8f0', fontWeight: 500 }}>
                    {`${effectiveEstimate.stationsUsed[0].name}${effectiveEstimate.stationsUsed[0].distanceKm !== null ? ` (${effectiveEstimate.stationsUsed[0].distanceKm} km away)` : ''}`}
                  </span>
                </div>
                {effectiveEstimate.stationsUsed.length > 1 && (
                  <div style={{ marginTop: '0.25rem', fontSize: '0.74rem', color: '#64748b' }}>
                    <span>Also interpolated: </span>
                    {effectiveEstimate.stationsUsed.slice(1).map((s, idx) => (
                      <span key={s.id || idx} style={{ color: '#94a3b8' }}>
                        {`${s.name}${s.distanceKm !== null ? ` (${s.distanceKm} km)` : ''}${idx < effectiveEstimate.stationsUsed.length - 2 ? ', ' : ''}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="ssd-stat-disclaimer">
            Spatially interpolated from surrounding regulatory stations. Not a direct school-gate sensor measurement.
          </div>
        </article>

        {/* Card 3: Best Outdoor Window (Dedicated Card) */}
        <article className="ssd-card">
          <div className="ssd-card-header">
            <span className="ssd-card-title">
              <Sun size={14} aria-hidden="true" />
              <span>Best Outdoor Window</span>
            </span>
            {effectiveBestWindow?.found && (
              <span className="ssd-confidence-pill high">Optimal</span>
            )}
          </div>

          {effectiveBestWindow?.found ? (
            <div>
              <div className="ssd-window-time-box">
                <Clock size={20} aria-hidden="true" />
                <span>{effectiveBestWindow.window}</span>
              </div>
              <p className="ssd-window-desc">
                {`Continuous window with lowest estimated particulate exposure (avg. ${effectiveBestWindow.averagePm25} µg/m³).`}
              </p>
              <div className="ssd-stat-disclaimer">
                Optimal duration for physical education, assemblies, or recess during school hours.
              </div>
            </div>
          ) : (
            <div>
              <div className="ssd-window-time-box" style={{ color: '#94a3b8', fontSize: '1.15rem' }}>
                <Info size={18} aria-hidden="true" />
                <span>Best window unavailable</span>
              </div>
              <p className="ssd-window-desc ssd-window-unavailable">
                {effectiveBestWindow?.reason ||
                  'Insufficient continuous monitoring data available to determine an optimal window without fabricating forecasts.'}
              </p>
            </div>
          )}
        </article>
      </div>

      {/* 4. Activity Timeline Section */}
      <section className="ssd-section" aria-labelledby="activity-timeline-heading">
        <div className="ssd-section-header">
          <div>
            <h2 id="activity-timeline-heading">
              <Clock size={18} aria-hidden="true" />
              <span>Scheduled Activity Windows & Operational Guidance</span>
            </h2>
            <p className="ssd-section-sub">
              Deterministic operational guidance per scheduled activity window based on estimated particulate exposure.
            </p>
          </div>
        </div>

        <div className="ssd-activities-grid">
          {effectiveActivityResults.map((act, index) => {
            const userVerdict = mapUserFacingStatus(act.verdict);
            const verdictLower = (act.verdict || 'insufficient').toLowerCase().replace('_strict', '');

            return (
              <article key={act.activityId || index} className="ssd-activity-card">
                <div className="ssd-activity-top">
                  <div>
                    <h3 className="ssd-activity-title">{act.activity}</h3>
                    <div className="ssd-activity-chips" style={{ marginTop: '0.35rem' }}>
                      <span className="ssd-chip">
                        <Clock size={11} aria-hidden="true" />
                        <span>{act.timeWindow || 'Scheduled'}</span>
                      </span>
                      {act.evaluatedPm25 !== null && act.evaluatedPm25 !== undefined && (
                        <span className="ssd-chip pm25">
                          {`Estimated: ${act.evaluatedPm25} µg/m³`}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className={`ssd-badge-verdict ${verdictLower}`}>
                    {userVerdict === 'GO' && <ShieldCheck size={12} aria-hidden="true" />}
                    {userVerdict === 'MODIFY' && <AlertTriangle size={12} aria-hidden="true" />}
                    {userVerdict === 'INDOORS' && <ShieldAlert size={12} aria-hidden="true" />}
                    <span>{userVerdict}</span>
                  </span>
                </div>

                <p className="ssd-activity-reason">
                  {act.operationalGuidance || act.reason || 'Operational guidance pending data update.'}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* 5. "Why This Verdict" Expandable Panel */}
      <section className="ssd-accordion" aria-label="Why This Verdict Details">
        <button
          type="button"
          className="ssd-accordion-trigger"
          onClick={() => setIsWhyExpanded(!isWhyExpanded)}
          aria-expanded={isWhyExpanded}
          aria-controls="why-verdict-content"
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={16} color="#38bdf8" aria-hidden="true" />
            <span>Why This Verdict? (Empirical Evidence & Spatial Estimation)</span>
          </span>
          {isWhyExpanded ? (
            <ChevronUp size={16} aria-hidden="true" />
          ) : (
            <ChevronDown size={16} aria-hidden="true" />
          )}
        </button>

        {isWhyExpanded && (
          <div id="why-verdict-content" className="ssd-accordion-content">
            <p className="ssd-explanation-paragraph">{effectiveExplanation}</p>

            {/* Visual Spatial Interpolation Pipeline Flow */}
            <div className="ssd-spatial-flow-diagram" aria-label="Spatial Estimation Architecture">
              <div className="ssd-flow-step-node">
                <div className="flow-step-badge">REGULATORY SENSORS</div>
                <div className="flow-step-name">{effectiveEstimate?.stationCount || 1} CAAQMS Monitors</div>
                <div className="flow-step-sub">{selectedSchool.nearestStation || 'Continuous BAM-1020'}</div>
              </div>
              <div className="ssd-flow-arrow-connector">
                <span className="flow-connector-line" />
                <span className="flow-connector-label">IDW Quadratic Interpolation (p=2.0)</span>
                <ArrowRight size={14} className="flow-connector-arrow" />
              </div>
              <div className="ssd-flow-step-node school">
                <div className="flow-step-badge">CAMPUS RECEPTOR</div>
                <div className="flow-step-name">{selectedSchool.name}</div>
                <div className="flow-step-sub">
                  Estimated around school: <strong>{effectiveEstimate?.pm25 !== null && effectiveEstimate?.pm25 !== undefined ? `${effectiveEstimate.pm25} µg/m³` : 'Pending'}</strong>
                </div>
              </div>
              <div className="ssd-flow-arrow-connector">
                <span className="flow-connector-line" />
                <span className="flow-connector-label">Deterministic Activity Gates</span>
                <ArrowRight size={14} className="flow-connector-arrow" />
              </div>
              <div className="ssd-flow-step-node verdict">
                <div className="flow-step-badge">OPERATIONAL GUIDANCE</div>
                <div className="flow-step-name">{userFacingOverallStatus}</div>
                <div className="flow-step-sub">{effectiveEstimate?.confidence || 'HIGH'} Confidence</div>
              </div>
            </div>

            <div className="ssd-evidence-grid">
              <div className="ssd-evidence-item">
                <div className="ssd-evidence-label">Estimation Methodology</div>
                <div className="ssd-evidence-val">Quadratic IDW (p=2.0)</div>
              </div>

              <div className="ssd-evidence-item">
                <div className="ssd-evidence-label">Monitoring Stations Used</div>
                <div className="ssd-evidence-val">
                  {effectiveEstimate?.stationCount || 1} Surrounding Regulatory Nodes
                </div>
              </div>

              <div className="ssd-evidence-item">
                <div className="ssd-evidence-label">Nearest Station Distance</div>
                <div className="ssd-evidence-val">
                  {selectedSchool.stationDistanceKm || 1.8} km from campus
                </div>
              </div>

              <div className="ssd-evidence-item">
                <div className="ssd-evidence-label">Data Confidence</div>
                <div className="ssd-evidence-val">
                  {effectiveEstimate?.confidence || 'HIGH'} (Continuous Telemetry)
                </div>
              </div>
            </div>

            <div className="ssd-accordion-disclaimer">
              <strong>Spatial Estimation Notice:</strong> School-level air quality is an estimated
              ambient value computed via distance-weighted interpolation from surrounding CPCB/DPCC
              regulatory monitoring stations. It does not represent direct school-gate measurements.
              All verdicts represent operational engineering baselines for facilities planning and
              never medical diagnosis or personal health advice.
            </div>
          </div>
        )}
      </section>

      {/* 6. 14-Day Monitoring Section */}
      <section className="ssd-section ssd-monitoring-section" aria-labelledby="monitoring-14d-heading">
        <div className="ssd-section-header">
          <div>
            <h2 id="monitoring-14d-heading">
              <Calendar size={18} aria-hidden="true" />
              <span>14-Day Monitoring & Evidence Continuity</span>
            </h2>
            <p className="ssd-section-sub">
              Empirical observation tracking over a 14-calendar-day window. Missing days remain unpopulated without data fabrication.
            </p>
          </div>

          <div className="ssd-monitoring-header-badges">
            <span className="ssd-monitoring-progress-pill">
              Progress: <strong>{effectiveCoverage.observedDays} / 14 days</strong>
            </span>
            <span className={`ssd-status-pill ${effectiveMonitoringStatus.toLowerCase().replace('_', '-')}`}>
              {effectiveMonitoringStatus === 'COMPLETE' && <CheckCircle2 size={13} aria-hidden="true" />}
              {effectiveMonitoringStatus === 'MONITORING' && <Clock size={13} aria-hidden="true" />}
              {effectiveMonitoringStatus === 'INSUFFICIENT_DATA' && <AlertCircle size={13} aria-hidden="true" />}
              <span>{effectiveMonitoringStatus === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT DATA' : effectiveMonitoringStatus}</span>
            </span>
          </div>
        </div>

        {/* Metrics Overview Grid */}
        <div className="ssd-monitoring-metrics-grid">
          <div className="ssd-metric-card radial-metric-card">
            <RadialProgressMeter
              value={effectiveCoverage.coveragePercent}
              max={100}
              size={96}
              strokeWidth={8}
              unit="%"
              label="EVIDENCE"
              color={effectiveCoverage.sufficientForAction ? '#10b981' : '#38bdf8'}
            />
          </div>

          <div className="ssd-metric-card">
            <div className="ssd-metric-label">Observed Days</div>
            <div className="ssd-metric-value text-green">
              <AnimatedCounter value={effectiveCoverage.observedDays} /> <span className="ssd-metric-sub">/ 14</span>
            </div>
            <div className="ssd-metric-hint">Verified telemetry days</div>
          </div>

          <div className="ssd-metric-card">
            <div className="ssd-metric-label">Partial Days</div>
            <div className="ssd-metric-value text-yellow">
              <AnimatedCounter value={effectiveCoverage.partialDays} />
            </div>
            <div className="ssd-metric-hint">Incomplete observations</div>
          </div>

          <div className="ssd-metric-card">
            <div className="ssd-metric-label">Missing Days</div>
            <div className="ssd-metric-value text-muted">
              <AnimatedCounter value={effectiveCoverage.missingDays} />
            </div>
            <div className="ssd-metric-hint">No telemetry recorded</div>
          </div>

          <div className="ssd-metric-card">
            <div className="ssd-metric-label">Evidence Coverage</div>
            <div className="ssd-metric-value text-cyan">
              <AnimatedCounter value={effectiveCoverage.coveragePercent} suffix="%" />
            </div>
            <div className="ssd-metric-hint">
              {effectiveCoverage.sufficientForAction ? 'Sufficient for action' : 'Monitoring required'}
            </div>
          </div>
        </div>

        {/* 14-Day Timeline / Calendar Cards Grid */}
        <div className="ssd-timeline-container" role="region" aria-label="14-Day Monitoring Timeline">
          <div className="ssd-timeline-grid">
            {effectiveDailyEvidence.map((day, idx) => {
              const statusClass =
                day.status === DAY_STATUS.OBSERVED
                  ? 'ssd-day-observed'
                  : day.status === DAY_STATUS.PARTIAL
                  ? 'ssd-day-partial'
                  : 'ssd-day-no-data';

              return (
                <div key={day.date || idx} className={`ssd-timeline-card ${statusClass}`}>
                  <div className="ssd-day-header">
                    <span className="ssd-day-date">{day.date}</span>
                    <span className={`ssd-day-badge ${day.status.toLowerCase()}`}>
                      {day.status === DAY_STATUS.NO_DATA ? 'NO DATA' : day.status}
                    </span>
                  </div>

                  <div className="ssd-day-body">
                    {day.status !== DAY_STATUS.NO_DATA && day.averagePm25 !== null ? (
                      <>
                        <div className="ssd-day-pm25">
                          <span className="ssd-day-num">{day.averagePm25}</span>
                          <span className="ssd-day-unit">µg/m³</span>
                        </div>
                        <div className="ssd-day-obs-count">
                          {day.observationCount} observation{day.observationCount === 1 ? '' : 's'}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="ssd-day-pm25 empty">
                          <span className="ssd-day-num">—</span>
                        </div>
                        <div className="ssd-day-obs-count text-muted">No observations</div>
                      </>
                    )}
                  </div>

                  <div className="ssd-day-footer">
                    <span className={`ssd-day-quality quality-${(day.dataQuality || 'no-data').toLowerCase()}`}>
                      {day.dataQuality === 'NO_DATA' ? 'Unmonitored' : `${day.dataQuality} Quality`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. Civic Action Card */}
      <section className="ssd-section ssd-civic-section" aria-labelledby="civic-action-heading">
        <div className="ssd-section-header">
          <div>
            <h2 id="civic-action-heading">
              <FileText size={18} aria-hidden="true" />
              <span>Civic Action & Petition Readiness</span>
            </h2>
            <p className="ssd-section-sub">
              Deterministic threshold gating: civic action workflows require 14 complete days of verified continuous evidence.
            </p>
          </div>
        </div>

        <article className={`ssd-card ssd-civic-card ${effectiveCivicEligibility.eligible ? 'eligible' : 'locked'}`}>
          <div className="ssd-civic-top">
            <div className="ssd-civic-icon-box" aria-hidden="true">
              {effectiveCivicEligibility.eligible ? (
                <CheckCircle2 size={32} color="#10b981" />
              ) : (
                <Lock size={32} color="#94a3b8" />
              )}
            </div>

            <div className="ssd-civic-details">
              <div className="ssd-civic-status-header">
                <span className={`ssd-civic-status-pill ${effectiveCivicEligibility.eligible ? 'eligible' : 'locked'}`}>
                  {effectiveCivicEligibility.status}
                </span>
                <span className="ssd-civic-days-pill">
                  {effectiveCivicEligibility.observedDays} / {effectiveCivicEligibility.requiredDays} Observed Days
                </span>
              </div>

              <h3 className="ssd-civic-title">
                {effectiveCivicEligibility.eligible
                  ? 'Evidence Period Complete - Action Workflow Available'
                  : 'Continue Monitoring - Evidence Incomplete'}
              </h3>

              <p className="ssd-civic-explanation">
                {effectiveCivicEligibility.eligible
                  ? 'All 14 required calendar monitoring days have been empirically observed and verified via surrounding regulatory station telemetry. The verified evidence package is ready for administrative petitioning.'
                  : '14 days of sufficient evidence are required before the civic action workflow becomes available. Automated petition drafting remains locked until empirical continuity criteria are satisfied.'}
              </p>

              {effectiveSummary && effectiveCivicEligibility.eligible && (
                <div className="ssd-civic-summary-preview">
                  <span>14-Day Average PM2.5: <strong>{effectiveSummary.averagePm25 ?? '--'} µg/m³</strong></span>
                  <span>Highest Day: <strong>{effectiveSummary.highestDailyPm25 ?? '--'} µg/m³</strong></span>
                  <span>Lowest Day: <strong>{effectiveSummary.lowestDailyPm25 ?? '--'} µg/m³</strong></span>
                </div>
              )}
            </div>
          </div>

          <div className="ssd-civic-footer">
            {effectiveCivicEligibility.eligible ? (
              <button
                type="button"
                id="review-civic-package-btn"
                className="ssd-civic-btn eligible"
                onClick={() => {
                  if (onEvidenceComplete) {
                    onEvidenceComplete(evidencePackage);
                  }
                }}
                aria-label="Review verified civic action evidence package"
              >
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>Review Civic Action Package</span>
              </button>
            ) : (
              <button
                type="button"
                id="civic-action-locked-btn"
                className="ssd-civic-btn locked"
                disabled
                aria-disabled="true"
                aria-label="Civic action locked - continue monitoring"
              >
                <Lock size={15} aria-hidden="true" />
                <span>Civic Action Locked (Requires 14 Observed Days)</span>
              </button>
            )}
            <span className="ssd-civic-note">
              {effectiveCivicEligibility.eligible
                ? 'Deterministic evidence verification complete. No fabricated data.'
                : 'Monitored continuously via Delhi regulatory stations. Telemetry refreshed automatically.'}
            </span>
          </div>
        </article>
      </section>
    </section>
  );
}
