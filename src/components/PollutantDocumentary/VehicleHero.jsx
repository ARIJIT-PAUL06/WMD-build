/**
 * VehicleHero.jsx
 * VayuVitals - Cinematic Vehicle Hero Experience
 *
 * Grounded in Forge Automotive-level cinematic presentation, with realistic
 * Indian vehicles acting as the visual protagonists of air pollution storytelling.
 *
 * Strictly scoped to the seven pollutant documentary pages.
 */

import React from 'react';
import { ChevronDown, MapPin, Gauge, ShieldAlert } from 'lucide-react';

export default function VehicleHero({
  pollutantData,
  cinematicTheme,
  environmentData,
  vehicleProfile, // backward-compat alias
  currentReading,
  unit,
  onExploreClick,
}) {
  const env = environmentData || vehicleProfile || {};
  const symbol = pollutantData.symbol || 'PM2.5';
  // Split symbol for oversized typographic treatment (e.g., "PM" & "2.5")
  const symbolParts = symbol.includes('.')
    ? [symbol.split('.')[0], `.${symbol.split('.')[1]}`]
    : symbol.length > 2
      ? [symbol.slice(0, 2), symbol.slice(2)]
      : [symbol, ''];

  const sourcesList = pollutantData.typicalSources || [];
  const primarySourceCategory = sourcesList[0]?.category || 'Atmospheric Mass Loading';

  return (
    <section className="doc-forge-hero-section" id="doc-forge-hero">
      {/* Background Cinematic Vehicle Stage */}
      <div className="doc-forge-hero-stage">
        {/* Deep Atmosphere Base */}
        <div className="doc-forge-hero-atmosphere" />

        {/* Ambient Particulate Haze Layer */}
        <div
          className="doc-forge-haze-layer"
          style={{
            background: `radial-gradient(ellipse at 50% 70%, ${cinematicTheme.ambientColor} 0%, transparent 75%)`,
          }}
          aria-hidden="true"
        />

        {/* The Indian Vehicle Visual Protagonist */}
        <div className="doc-forge-vehicle-frame">
          <img
            src={env.vehicleImage}
            alt={`${pollutantData.name} emission context in ${env.environmentContext || 'Delhi NCR'}`}
            className="doc-forge-vehicle-img"
            loading="eager"
            fetchPriority="high"
          />
          <div className="doc-forge-vehicle-scrim" />
        </div>

        {/* Road Surface Depth Gradient */}
        <div className="doc-forge-road-depth-gradient" />
      </div>

      {/* Foreground Cinematic Typographic & HUD Layer */}
      <div className="doc-forge-hero-overlay">
        {/* Top Technical Metadata Kicker */}
        <div className="doc-forge-kicker-row">
          <div className="doc-forge-kicker-badge">
            <span className="doc-forge-shimmer-dot" />
            <span className="doc-forge-kicker-text">
              DELHI ATMOSPHERIC ARCHIVE // CHAPTER {cinematicTheme.chapterNum || '01'}
            </span>
          </div>

          <div className="doc-forge-coordinates">
            <MapPin size={12} />
            <span>28.6139° N, 77.2090° E // INDO-GANGETIC AIRSHED</span>
          </div>
        </div>

        {/* Oversized Cinematic Typographic Monolith */}
        <div className="doc-forge-title-monolith">
          <div className="doc-forge-oversized-symbol" aria-label={symbol}>
            <span className="symbol-part-primary">{symbolParts[0]}</span>
            {symbolParts[1] && (
              <span className="symbol-part-sub" style={{ color: cinematicTheme.accent }}>
                {symbolParts[1]}
              </span>
            )}
          </div>

          <h1 className="doc-forge-headline">
            {pollutantData.sections?.heroSubtitle || pollutantData.name}
          </h1>

          <p className="doc-forge-lead">
            {pollutantData.shortDescription}
          </p>
        </div>

        {/* Bottom Environmental HUD Strip */}
        <div className="doc-forge-hud-strip">
          <div className="doc-forge-hud-card source-context-card">
            <div className="hud-card-label">EMISSION SOURCE CONTEXT</div>
            <div className="hud-card-val">{env.sourceContext || 'URBAN COMBUSTION & TRANSPORT'}</div>
            <div className="hud-card-sub">{env.visualCaption || 'One source of atmospheric particulate loading'}</div>
          </div>

          <div className="doc-forge-hud-card environment-card">
            <div className="hud-card-label">REGIONAL AIRSHED</div>
            <div className="hud-card-val">{env.environmentContext || 'Delhi NCR Basin'}</div>
            <div className="hud-card-sub">{primarySourceCategory}</div>
          </div>

          <div className="doc-forge-hud-card telemetry-card">
            <div className="hud-card-label">
              <span className="live-pulse" /> LIVE RECEPTOR VALUE
            </div>
            <div className="hud-card-val telemetry-val" style={{ color: cinematicTheme.accent }}>
              {currentReading != null ? (
                <>
                  <span className="val-num">{currentReading}</span>
                  <span className="val-unit"> {unit}</span>
                </>
              ) : (
                <span className="val-num">ACTIVE</span>
              )}
            </div>
            <div className="hud-card-sub">
              NAAQS 24-hr Standard: {pollutantData.naaqsLimit} {unit}
            </div>
          </div>
        </div>

        {/* Scroll Indicator Prompt */}
        <div className="doc-forge-scroll-indicator" onClick={onExploreClick} role="button" tabIndex={0}>
          <span className="scroll-prompt-text">SCROLL TO ADVANCE INVESTIGATION</span>
          <ChevronDown size={16} className="scroll-chevron" />
        </div>
      </div>
    </section>
  );
}
