import React from 'react';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Info,
  Wind,
  Sun,
  Clock
} from 'lucide-react';
import { ACTIVITY_VERDICTS } from './schoolSafetyHelpers.js';

/**
 * Top Metrics Grid: Overall Campus Status, School Air Overview, and Best Outdoor Window
 */
export default function SchoolSafetyTopGrid({
  effectiveOverallVerdict,
  statusCssClass,
  effectiveEstimate,
  userFacingOverallStatus,
  effectiveBestWindow
}) {
  return (
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
  );
}
