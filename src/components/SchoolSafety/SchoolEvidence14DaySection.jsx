import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import RadialProgressMeter from '../common/RadialProgressMeter';
import AnimatedCounter from '../common/AnimatedCounter';
import { DAY_STATUS } from './schoolSafetyEvidence.js';

/**
 * 14-Day Continuous Monitoring & Empirical Evidence Timeline Section
 */
export default function SchoolEvidence14DaySection({
  effectiveCoverage,
  effectiveMonitoringStatus,
  effectiveDailyEvidence
}) {
  return (
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
  );
}
