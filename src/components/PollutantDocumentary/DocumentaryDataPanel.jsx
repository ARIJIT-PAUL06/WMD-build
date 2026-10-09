/**
 * DocumentaryDataPanel.jsx
 * VayuVitals - Elegant Horizontal Translucent Data Panel
 *
 * Implements Section 6 of the new unified UI system:
 * - ONE horizontal translucent panel (NOT 10 floating cards)
 * - Left: Pollutant switcher with current values (PM2.5, PM10, NO2, SO2, CO, O3, NH3)
 * - Middle: 24-hr diurnal trend mini sparkline with • Live indicator
 * - Right: Risk level scale legend (Green -> Good, Yellow -> Moderate, Orange -> Unhealthy, Red -> Very Unhealthy, Purple -> Hazardous)
 * - Subtle vertical separators, beautiful dark glassmorphism
 */

import React, { useMemo } from 'react';
import { POLLUTANT_DOCUMENTARY_LIST } from '../../data/pollutantDocumentaries.js';

export default function DocumentaryDataPanel({
  activePollutantId = 'pm25',
  onSelectPollutant,
  currentStation = null,
  diurnalPoints = [],
  pollutantUnit = 'µg/m³',
  accentColor = '#f97316',
}) {
  // Sparkline calculation for 24-hr diurnal trend
  const sparklineData = useMemo(() => {
    // If diurnal points exist, use them; otherwise, create a gentle realistic curve from standard baseline
    const points = diurnalPoints && diurnalPoints.length > 0
      ? diurnalPoints
      : [
        { label: '03 hrs', value: 165 },
        { label: '08 hrs', value: 215 },
        { label: '12 hrs', value: 110 },
        { label: '16 hrs', value: 92 },
        { label: '20 hrs', value: 178 },
        { label: '24 hrs', value: 195 },
      ];

    const maxVal = Math.max(...points.map((p) => p.value || 100), 1) * 1.15;
    const minVal = Math.min(...points.map((p) => p.value || 50), 0);
    const range = maxVal - minVal || 1;

    const width = 220;
    const height = 48;
    const padding = 6;
    const innerW = width - padding * 2;
    const innerH = height - padding * 2;

    const coords = points.map((p, idx) => {
      const x = padding + (idx / (points.length - 1)) * innerW;
      const normalizedY = ((p.value - minVal) / range);
      const y = height - padding - (normalizedY * innerH);
      return { x, y };
    });

    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      // Smooth cubic bezier spline
      const prev = coords[i - 1];
      const curr = coords[i];
      const cx1 = prev.x + (curr.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (curr.x - prev.x) / 2;
      const cy2 = curr.y;
      pathD += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
    }

    const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;

    return { pathD, areaD, points };
  }, [diurnalPoints]);

  return (
    <div className="documentary-data-panel" id="documentary-bottom-data-bar">
      {/* SECTION 1: POLLUTANT INTELLIGENCE SWITCHER & VALUES */}
      <div className="documentary-data-col documentary-data-col-pollutants">
        <div className="doc-col-title-row">
          <span className="doc-col-heading">ATMOSPHERIC PARAMETERS</span>
        </div>

        <div className="doc-pollutants-grid">
          {POLLUTANT_DOCUMENTARY_LIST.map((p) => {
            const isActive = p.id === activePollutantId;
            const stationVal = currentStation?.[p.id];
            const formattedVal = stationVal != null
              ? (Number(stationVal) >= 10 ? Math.round(stationVal) : Number(stationVal).toFixed(1))
              : null;

            return (
              <button
                key={p.id}
                type="button"
                id={`doc-tab-${p.id}`}
                className={`doc-pollutant-chip ${isActive ? 'active' : ''}`}
                onClick={() => onSelectPollutant && onSelectPollutant(p.id)}
                title={`Switch to ${p.name} documentary`}
              >
                <span className="doc-chip-symbol">{p.symbol}</span>
                {formattedVal && (
                  <span className="doc-chip-val">{formattedVal}</span>
                )}
                {isActive && <span className="doc-chip-active-dot" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="documentary-data-separator" aria-hidden="true" />

      {/* SECTION 2: 24-HR PROGRESSION MINI SPARKLINE */}
      <div className="documentary-data-col documentary-data-col-trend">
        <div className="doc-col-title-row">
          <span className="doc-col-heading">24-HR DIURNAL TREND</span>
          <span className="doc-col-live-tag">
            <span className="doc-live-dot" /> Live
          </span>
        </div>

        <div className="doc-sparkline-box">
          <svg
            className="doc-sparkline-svg"
            viewBox="0 0 220 48"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="docSparkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity="0.35" />
                <stop offset="100%" stopColor={accentColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path d={sparklineData.areaD} fill="url(#docSparkGradient)" />
            <path
              d={sparklineData.pathD}
              fill="none"
              stroke={accentColor}
              strokeWidth="2"
              strokeLinecap="round"
              className="doc-sparkline-path"
              style={{ filter: `drop-shadow(0 0 4px ${accentColor})` }}
            />
          </svg>

          <div className="doc-sparkline-labels">
            <span>03 hrs</span>
            <span>12 hrs</span>
            <span>24 hrs</span>
          </div>
        </div>
      </div>

      <div className="documentary-data-separator" aria-hidden="true" />

      {/* SECTION 3: RISK SCALE LEGEND */}
      <div className="documentary-data-col documentary-data-col-legend">
        <div className="doc-col-title-row">
          <span className="doc-col-heading">CPCB AIR QUALITY INDEX</span>
        </div>

        <div className="doc-risk-legend-list">
          <div className="doc-legend-item">
            <span className="doc-legend-indicator" style={{ backgroundColor: '#10b981' }} />
            <span className="doc-legend-color-name" style={{ color: '#10b981' }}>Green</span>
            <span className="doc-legend-arrow">→</span>
            <span className="doc-legend-label">Good</span>
          </div>

          <div className="doc-legend-item">
            <span className="doc-legend-indicator" style={{ backgroundColor: '#eab308' }} />
            <span className="doc-legend-color-name" style={{ color: '#eab308' }}>Yellow</span>
            <span className="doc-legend-arrow">→</span>
            <span className="doc-legend-label">Moderate</span>
          </div>

          <div className="doc-legend-item">
            <span className="doc-legend-indicator" style={{ backgroundColor: '#f97316' }} />
            <span className="doc-legend-color-name" style={{ color: '#f97316' }}>Orange</span>
            <span className="doc-legend-arrow">→</span>
            <span className="doc-legend-label">Unhealthy</span>
          </div>

          <div className="doc-legend-item">
            <span className="doc-legend-indicator" style={{ backgroundColor: '#ef4444' }} />
            <span className="doc-legend-color-name" style={{ color: '#ef4444' }}>Red</span>
            <span className="doc-legend-arrow">→</span>
            <span className="doc-legend-label">Very Unhealthy</span>
          </div>

          <div className="doc-legend-item">
            <span className="doc-legend-indicator" style={{ backgroundColor: '#a855f7' }} />
            <span className="doc-legend-color-name" style={{ color: '#a855f7' }}>Purple</span>
            <span className="doc-legend-arrow">→</span>
            <span className="doc-legend-label">Hazardous</span>
          </div>
        </div>
      </div>
    </div>
  );
}
