/**
 * PollutantValue.jsx
 * VayuVitals - Central Pollutant Value & Arc Measurement Visualization
 *
 * Implements Section 4 of the new unified UI system:
 * - Large central pollutant measurement inspired by the reference AQI circle
 * - Subtle circular/arc visualization (NOT a speedometer, but an environmental measurement)
 * - Exact real value derived from existing application telemetry data
 * - Pollutant symbol, large value, unit, risk status, and station location
 */

import React, { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { getPollutantRiskAssessment } from './documentaryHelpers.js';

export default function PollutantValue({
  pollutantData,
  currentValue,
  locationName = 'Delhi NCR Airshed',
  stationName = 'Anand Vihar (CAAQMS BAM-1020)',
}) {
  const symbol = pollutantData.symbol || 'PM2.5';
  const unit = pollutantData.unit || 'µg/m³';

  // Evaluate risk assessment and gauge position
  const assessment = useMemo(() => {
    return getPollutantRiskAssessment(pollutantData.id, currentValue);
  }, [pollutantData.id, currentValue]);

  // Format value for display
  const displayValue = useMemo(() => {
    if (currentValue == null || isNaN(currentValue)) {
      return '—';
    }
    const num = Number(currentValue);
    // Integer for numbers > 10, one decimal for smaller values like CO
    return num >= 10 ? Math.round(num) : num.toFixed(1);
  }, [currentValue]);

  // Arc calculation for SVG
  // 240-degree arc spanning from 150 deg (bottom-left) to 390 deg (bottom-right)
  const arcRadius = 140;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * arcRadius;
  // 240 degrees out of 360 degrees = 2/3 of circle
  const arcLength = (240 / 360) * circumference;
  const clampedPercent = Math.max(5, Math.min(100, assessment.percent || 50));
  const activeLength = (clampedPercent / 100) * arcLength;
  const strokeDashoffset = arcLength - activeLength;

  // Calculate endpoint coordinates for the glowing indicator bead
  // Angle in radians: starts at 150 deg (5pi/6), sweeps 240 deg (4pi/3)
  const sweepAngleDeg = 150 + (clampedPercent / 100) * 240;
  const sweepAngleRad = (sweepAngleDeg * Math.PI) / 180;
  const centerCoord = 160;
  const beadX = centerCoord + arcRadius * Math.cos(sweepAngleRad);
  const beadY = centerCoord + arcRadius * Math.sin(sweepAngleRad);

  return (
    <div
      className="documentary-value-container"
      id="documentary-central-measurement"
      style={{
        '--val-risk-color': assessment.color,
        '--val-risk-glow': assessment.glow,
      }}
    >
      {/* Ambient Atmospheric Cloud behind gauge */}
      <div className="documentary-value-atmospheric-glow" aria-hidden="true" />

      {/* Circular Measurement Arc Gauge */}
      <div className="documentary-value-gauge-wrapper">
        <svg
          className="documentary-value-arc-svg"
          viewBox="0 0 320 320"
          aria-hidden="true"
        >
          <defs>
            {/* Subtle glow filter */}
            <filter id="docGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Track Arc */}
          <path
            d="M 38.6 230 A 140 140 0 1 1 281.4 230"
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Scientific Calibration Pips */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const angleDeg = 150 + pct * 240;
            const angleRad = (angleDeg * Math.PI) / 180;
            const x1 = centerCoord + 134 * Math.cos(angleRad);
            const y1 = centerCoord + 134 * Math.sin(angleRad);
            const x2 = centerCoord + 146 * Math.cos(angleRad);
            const y2 = centerCoord + 146 * Math.sin(angleRad);
            return (
              <line
                key={idx}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(255, 255, 255, 0.14)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            );
          })}

          {/* Active Colored Arc - Solid Red #FF4545 */}
          <path
            id="doc-active-gauge-arc"
            d="M 38.6 230 A 140 140 0 1 1 281.4 230"
            fill="none"
            stroke="#FF4545"
            strokeWidth={strokeWidth + 1}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter="url(#docGlowFilter)"
            className="documentary-gauge-progress-path"
          />

          {/* Active Position Indicator Bead */}
          <circle
            cx={beadX}
            cy={beadY}
            r="6"
            fill="#ffffff"
            stroke={assessment.color}
            strokeWidth="3"
            filter="url(#docGlowFilter)"
            className="documentary-gauge-bead"
          />
        </svg>

        {/* Central Typographic Measurement Stack */}
        <div className="documentary-value-content">
          <div className="documentary-value-kicker-symbol">
            <span className="doc-symbol-txt">{symbol}</span>
            <span className="doc-symbol-dot">•</span>
            <span className="doc-symbol-ctx">CURRENT LEVEL</span>
          </div>

          <div className="documentary-value-number-row">
            <span
              className="documentary-value-number"
              id="doc-central-numeric-readout"
            >
              {displayValue}
            </span>
          </div>

          <div className="documentary-value-unit-row">
            <span className="documentary-value-unit">{unit}</span>
          </div>

          <div className="documentary-value-status-badge">
            <span
              className="documentary-status-pill"
              style={{
                color: assessment.color,
                borderColor: `color-mix(in srgb, ${assessment.color} 40%, transparent)`,
                backgroundColor: `color-mix(in srgb, ${assessment.color} 12%, transparent)`,
              }}
            >
              <span
                className="documentary-status-dot"
                style={{ backgroundColor: assessment.color }}
              />
              <span className="documentary-status-text">{assessment.label}</span>
            </span>
          </div>

          {/* Location Receptor Pin */}
          <div className="documentary-value-location">
            <MapPin size={13} className="doc-loc-pin" />
            <span className="doc-loc-text" title={stationName}>
              {stationName.split(',')[0]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
