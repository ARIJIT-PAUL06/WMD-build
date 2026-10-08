import React from 'react';
import { ArrowRight, CheckCircle2, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

/**
 * ComparisonSplitPanel
 * Visual side-by-side or stacked comparative panel for benchmarks:
 * Current Reading vs CPCB Statutory Limit vs WHO Health Guideline.
 */
export default function ComparisonSplitPanel({
  currentValue = 0,
  limitValue = 60,
  whoValue = 15,
  unit = 'µg/m³',
  pollutantName = 'PM2.5',
  stationName = 'Delhi CAAQMS Ground Network',
}) {
  const cur = typeof currentValue === 'number' ? currentValue : parseFloat(currentValue) || 0;
  const lim = typeof limitValue === 'number' ? limitValue : parseFloat(limitValue) || 60;
  const who = typeof whoValue === 'number' ? whoValue : parseFloat(whoValue) || 15;

  const naaqsRatio = lim > 0 ? (cur / lim).toFixed(1) : '1.0';
  const whoRatio = who > 0 ? (cur / who).toFixed(1) : '1.0';
  const deltaNaaqs = Math.round(cur - lim);

  const isExceeded = deltaNaaqs > 0;

  return (
    <div className="comparison-split-panel-root" id="comparison-split-panel">
      <div className="comp-panel-header">
        <div className="comp-header-left">
          <Activity size={14} className="comp-header-icon" />
          <span className="comp-header-title">STATUTORY & EPIDEMIOLOGICAL THRESHOLD COMPARISON</span>
        </div>
        <div className="comp-header-badge">
          <span className={`comp-status-chip ${isExceeded ? 'exceeded' : 'safe'}`}>
            {isExceeded ? `${naaqsRatio}x NAAQS LIMIT` : 'WITHIN LEGAL THRESHOLD'}
          </span>
        </div>
      </div>

      <div className="comp-columns-grid">
        {/* Column 1: Current Verified Telemetry */}
        <div className="comp-column primary-obs">
          <div className="comp-col-top">
            <span className="comp-col-tag">LIVE OBSERVATION</span>
            <span className="comp-col-station">{stationName}</span>
          </div>
          <div className="comp-value-display">
            <span className="comp-big-num">
              <AnimatedCounter value={cur} decimals={0} />
            </span>
            <span className="comp-unit">{unit}</span>
          </div>
          <div className="comp-col-bar">
            <div
              className={`comp-bar-fill ${isExceeded ? 'critical' : 'nominal'}`}
              style={{ width: `${Math.min(100, Math.round((cur / (lim * 2.5)) * 100))}%` }}
            />
          </div>
          <div className="comp-col-footer">
            <span>Continuous Beta Attenuation Sensor</span>
          </div>
        </div>

        {/* Column 2: Indian NAAQS Standard (CPCB) */}
        <div className="comp-column standard-naaqs">
          <div className="comp-col-top">
            <span className="comp-col-tag">INDIAN NAAQS 24-HR</span>
            <span className="comp-col-station">Central Pollution Control Board</span>
          </div>
          <div className="comp-value-display">
            <span className="comp-big-num">{lim}</span>
            <span className="comp-unit">{unit}</span>
          </div>
          <div className="comp-col-bar">
            <div
              className="comp-bar-fill standard"
              style={{ width: `${Math.min(100, Math.round((lim / (lim * 2.5)) * 100))}%` }}
            />
          </div>
          <div className="comp-col-footer">
            <span className="diff-tag">
              Variance: <strong>{deltaNaaqs > 0 ? `+${deltaNaaqs}` : deltaNaaqs} {unit}</strong>
            </span>
          </div>
        </div>

        {/* Column 3: WHO 2021 Global Guideline */}
        <div className="comp-column standard-who">
          <div className="comp-col-top">
            <span className="comp-col-tag">WHO 2021 GUIDELINE</span>
            <span className="comp-col-station">Epidemiological Protection</span>
          </div>
          <div className="comp-value-display">
            <span className="comp-big-num">{who}</span>
            <span className="comp-unit">{unit}</span>
          </div>
          <div className="comp-col-bar">
            <div
              className="comp-bar-fill who"
              style={{ width: `${Math.min(100, Math.round((who / (lim * 2.5)) * 100))}%` }}
            />
          </div>
          <div className="comp-col-footer">
            <span className="diff-tag">
              Exposure: <strong>{whoRatio}x Health Guideline</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
