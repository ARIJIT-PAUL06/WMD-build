/**
 * CinematicSourceExposure.jsx
 * VayuVitals - Cinematic Environmental Source & Exposure Scene
 *
 * Grounded in Forge Automotive-level cinematic presentation, with realistic
 * Indian vehicles acting strictly as visual storytelling protagonists.
 * Zero automotive configurator, dealership, or technical vehicle spec UI.
 *
 * Strictly scoped to the seven pollutant documentary pages.
 */

import React from 'react';
import { Compass, Wind, AlertCircle } from 'lucide-react';

export default function CinematicSourceExposure({
  pollutantData,
  cinematicTheme,
  environmentData,
  currentReading,
  unit,
  currentStation,
}) {
  const sourcesList = pollutantData.typicalSources || [];
  const primarySource = sourcesList[0] || {
    category: 'Urban Combustion & Transport',
    description: 'Emissions from vehicular transit and industrial activity across the Delhi basin.',
  };

  return (
    <section className="doc-source-exposure-section" id="doc-source-exposure-scene">
      {/* Background Cinematic Vehicle Canvas */}
      <div className="doc-source-exposure-backdrop">
        <div className="exposure-atmosphere-gradient" />
        <div className="exposure-photo-container">
          <img
            src={environmentData.vehicleImage}
            alt={`${pollutantData.name} emission context in ${environmentData.environmentContext}`}
            className="exposure-vehicle-image"
            loading="lazy"
          />
          <div className="exposure-photo-scrim" />
        </div>
      </div>

      {/* Foreground Documentary Editorial Deck */}
      <div className="doc-source-exposure-inner">
        {/* Top Documentary Kicker */}
        <div className="exposure-kicker-header">
          <div className="kicker-brand">
            <span className="exposure-badge-pill">
              <span className="exposure-dot" style={{ backgroundColor: cinematicTheme.accent }} />
              <span>SOURCE INVESTIGATION // FIELD EVIDENCE</span>
            </span>
          </div>

          <div className="kicker-location-tag">
            <Compass size={13} />
            <span>{environmentData.environmentContext}</span>
          </div>
        </div>

        {/* Centerpiece Split Layout */}
        <div className="exposure-body-grid">
          {/* Left Column: Large Headline & Verified Atmospheric Statement */}
          <div className="exposure-statement-col">
            <div className="exposure-category-kicker" style={{ color: cinematicTheme.accent }}>
              {environmentData.sourceContext}
            </div>

            <h2 className="exposure-headline">
              {pollutantData.sections?.section03?.title || `${pollutantData.name} in the Urban Airshed`}
            </h2>

            <p className="exposure-lead">
              {primarySource.description}
            </p>

            <div className="exposure-behavior-box">
              <div className="behavior-header">
                <Wind size={14} style={{ color: cinematicTheme.accent }} />
                <span>ATMOSPHERIC BEHAVIOR IN DELHI BASIN</span>
              </div>
              <p className="behavior-text">
                {pollutantData.atmosphericBehavior}
              </p>
            </div>

            <div className="exposure-caption-note">
              <span className="caption-tag">EXHIBIT //</span>
              <span className="caption-body">{environmentData.visualCaption}</span>
            </div>
          </div>

          {/* Right Column: Real Live Telemetry & Emission Measurement */}
          <div className="exposure-telemetry-col">
            <div className="exposure-telemetry-card">
              <div className="card-top-row">
                <span className="live-pill">
                  <span className="live-dot" style={{ backgroundColor: cinematicTheme.accent }} />
                  <span>CONTINUOUS RECEPTOR OBSERVATION</span>
                </span>
                <span className="station-name">
                  {currentStation?.name || 'Delhi CAAQMS Network'}
                </span>
              </div>

              {/* Huge Pollutant Value */}
              <div className="card-measurement-block">
                <div className="measurement-symbol">{pollutantData.symbol}</div>
                <div className="measurement-val-row">
                  <span className="measurement-number" style={{ color: cinematicTheme.accent }}>
                    {currentReading != null ? currentReading : '—'}
                  </span>
                  <span className="measurement-unit">{unit}</span>
                </div>
                <div className="measurement-sublabel">
                  {primarySource.category}
                </div>
              </div>

              {/* Threshold Comparison Bar */}
              <div className="card-naaqs-section">
                <div className="naaqs-header">
                  <span>CPCB 24-HR NAAQS STANDARD</span>
                  <span className="naaqs-val">{pollutantData.naaqsLimit} {unit}</span>
                </div>
                <div className="naaqs-progress-track">
                  <div
                    className="naaqs-progress-fill"
                    style={{
                      width: `${Math.min(100, currentReading ? (currentReading / pollutantData.naaqsLimit) * 100 : 50)}%`,
                      backgroundColor: cinematicTheme.accent,
                    }}
                  />
                </div>
                <div className="naaqs-footer">
                  <span>WHO GUIDELINE: {pollutantData.whoLimit} {unit}</span>
                  {currentReading != null && (
                    <span className="naaqs-ratio">
                      {((currentReading / pollutantData.naaqsLimit) * 100).toFixed(0)}% of National Limit
                    </span>
                  )}
                </div>
              </div>

              {/* Scientific Methodology Note */}
              <div className="card-disclaimer">
                <AlertCircle size={13} />
                <span>
                  Receptor values reflect continuous ambient air sampling and verified airshed mass loading.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
