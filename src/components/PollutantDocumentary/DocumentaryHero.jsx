/**
 * DocumentaryHero.jsx
 * VayuVitals - Immersive Atmospheric Hero Viewport
 *
 * Implements Sections 2, 3, 4, 5, 6 of the new unified UI system:
 * - Dark atmospheric environment (#0B1011, #101718, dark charcoal tones)
 * - Pollutant particles, atmospheric haze, subtle flow lines
 * - Left editorial message: verified statement + short description + pollutant identity
 * - Central data visualization: PollutantValue arc gauge with real telemetry
 * - Live environmental weather vector strip (wind, temp, humidity, pressure)
 * - Right atmospheric airshed context: subtle spatial dispersion visualization
 * - Bottom data panel: unified horizontal translucent panel
 */

import React, { useMemo, useRef } from 'react';
import { Wind, Thermometer, Droplets, Gauge } from 'lucide-react';
import PollutantValue from './PollutantValue.jsx';
import DocumentaryDataPanel from './DocumentaryDataPanel.jsx';
import DocumentaryLocationMap from './DocumentaryLocationMap.jsx';
import { POLLUTANT_EDITORIAL_HEADLINES } from './documentaryHelpers.js';

export default function DocumentaryHero({
  pollutantData,
  cinematicTheme,
  environmentData,
  currentValue,
  currentStation,
  weatherVariables = { windSpeed: 2.4, temperature: 22.0, humidity: 64, pressure: 1012 },
  onSelectPollutant,
  onExploreClick,
}) {
  const heroContainerRef = useRef(null);

  const editorial = useMemo(() => {
    return (
      POLLUTANT_EDITORIAL_HEADLINES[pollutantData.id] || {
        statement: 'Small particles. Large consequences.',
        kicker: 'AIR POLLUTANT // ATMOSPHERIC INTELLIGENCE',
        subtext: pollutantData.shortDescription,
        region: 'Delhi NCR // Indo-Gangetic Airshed',
      }
    );
  }, [pollutantData.id, pollutantData.shortDescription]);

  const symbol = pollutantData.symbol || 'PM2.5';
  const plainSymbol = pollutantData.id ? pollutantData.id.toUpperCase() : symbol;
  const unit = pollutantData.unit || 'µg/m³';
  const diurnalPoints = pollutantData.sections?.section06?.diurnalPoints || [];
  const headline = pollutantData.sections?.heroSubtitle || pollutantData.name;

  return (
    <section
      className="documentary-hero"
      id="documentary-hero-viewport"
      ref={heroContainerRef}
    >
      {/* ATMOSPHERIC BACKGROUND SYSTEM */}
      <div className="documentary-hero-ambient-backdrop" aria-hidden="true">
        {/* Deep Dark Base */}
        <div className="documentary-hero-bg-deep" />

        {/* Atmospheric Environmental Texture */}
        <div
          className="documentary-hero-photo-layer"
          style={{
            backgroundImage: `url(${cinematicTheme.heroImage || environmentData.vehicleImage})`,
          }}
        />

        {/* Ambient Particulate Haze Glow */}
        <div
          className="documentary-hero-haze-layer"
          style={{
            background: `radial-gradient(circle at 50% 45%, ${cinematicTheme.ambientColor || 'rgba(16, 185, 129, 0.12)'} 0%, transparent 65%)`,
          }}
        />

        {/* Cursor Atmospheric Air Disturbance Field */}
        <div className="documentary-hero-cursor-field" />

        {/* Sculptural Monumental Typographic Watermark (Creative scale & depth) */}
        <div className="documentary-hero-sculptural-glyph" aria-hidden="true">
          <span>{symbol}</span>
        </div>

        {/* Subtle Wind & Aerosol Flow Lines */}
        <div className="documentary-hero-flow-lines" />
      </div>

      {/* FOREGROUND HERO GRID VIEWPORT */}
      <div className="documentary-hero-container">
        {/* TOP / CENTER HERO TRIAD (Left: Editorial, Center: Gauge, Right: Spatial) */}
        <div className="documentary-hero-main-row">
          {/* LEFT: EDITORIAL MESSAGE & POLLUTANT IDENTITY */}
          <div className="documentary-hero-editorial-col">
            {/* Pollutant Identity with Masked Reveal */}
            <div className="documentary-pollutant-title-row">
              <div className="doc-mask-reveal-wrap">
                <h1 className="documentary-pollutant-name" aria-label={symbol}>
                  <span className="doc-pollutant-name-nowrap">{symbol}</span>
                </h1>
              </div>
              <div className="documentary-pollutant-tags">
                {plainSymbol !== symbol && (
                  <span className="documentary-pollutant-ascii-symbol">
                    {plainSymbol}
                  </span>
                )}
                <span className="documentary-pollutant-chem-formula">
                  {pollutantData.chemicalFormula || symbol}
                </span>
              </div>
            </div>

            {/* Hero Subtitle / Dossier Headline with Masked Reveal */}
            <div className="doc-mask-reveal-wrap">
              <h2 className="documentary-hero-headline">
                {headline}
              </h2>
            </div>

            {/* Editorial Statement */}
            <p className="documentary-editorial-quote">
              {editorial.statement}
            </p>

            {/* Verified Short Description */}
            <p className="documentary-editorial-desc">
              {pollutantData.shortDescription}
            </p>

            {/* Micro Telemetry & Environmental Baseline */}
            <div className="documentary-hero-meta-row">
              <div className="documentary-hero-weather-strip">
                <div className="doc-weather-item" title="Atmospheric Wind Velocity">
                  <Wind size={12} className="doc-weather-icon" />
                  <span className="doc-weather-label">WIND</span>
                  <span className="doc-weather-val">{weatherVariables.windSpeed} m/s</span>
                </div>
                <div className="doc-weather-divider">•</div>
                <div className="doc-weather-item" title="Ambient Air Temperature">
                  <Thermometer size={12} className="doc-weather-icon" />
                  <span className="doc-weather-label">TEMP</span>
                  <span className="doc-weather-val">{weatherVariables.temperature}°C</span>
                </div>
                <div className="doc-weather-divider">•</div>
                <div className="doc-weather-item" title="Relative Humidity">
                  <Droplets size={12} className="doc-weather-icon" />
                  <span className="doc-weather-label">RH</span>
                  <span className="doc-weather-val">{weatherVariables.humidity}%</span>
                </div>
              </div>

              <div className="documentary-editorial-metadata">
                <span className="doc-meta-label">NAAQS 24-HR:</span>
                <span className="doc-meta-val">
                  {pollutantData.naaqsLimit} {unit}
                </span>
                <span className="doc-meta-divider">•</span>
                <span className="doc-meta-label">WHO:</span>
                <span className="doc-meta-val">
                  {pollutantData.whoLimit} {unit}
                </span>
              </div>
            </div>
          </div>

          {/* CENTER: LARGE CENTRAL MEASUREMENT VISUALIZATION */}
          <div className="documentary-hero-center-col">
            <PollutantValue
              pollutantData={pollutantData}
              currentValue={currentValue}
              locationName="Delhi NCR Airshed"
              stationName={currentStation?.name || 'Delhi CAAQMS Telemetry'}
            />
          </div>

          {/* RIGHT: REAL INTERACTIVE GEOSPATIAL AIRSHED VISUALIZATION */}
          <div className="documentary-hero-spatial-col">
            <div className="documentary-spatial-map-card">
              <DocumentaryLocationMap
                longitude={currentStation?.lon ?? 77.3158}
                latitude={currentStation?.lat ?? 28.6476}
                locationName={currentStation?.zone || 'East Delhi Trans-Yamuna'}
                stationName={currentStation?.name || 'Anand Vihar, Delhi - DPCC'}
                accentColor={cinematicTheme.accent || '#f97316'}
              />

              <div className="doc-spatial-meta-row">
                <span className="doc-spatial-coord">
                  {currentStation?.lat && currentStation?.lon
                    ? `${Number(currentStation.lat).toFixed(4)}° N, ${Number(currentStation.lon).toFixed(4)}° E`
                    : '28.6476° N, 77.3158° E'}
                </span>
                <span className="doc-spatial-loc-name">
                  {currentStation?.zone || 'East Delhi Trans-Yamuna'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM: UNIFIED TRANSLUCENT DATA PANEL */}
        <div className="documentary-hero-bottom-deck">
          <DocumentaryDataPanel
            activePollutantId={pollutantData.id}
            onSelectPollutant={onSelectPollutant}
            currentStation={currentStation}
            diurnalPoints={diurnalPoints}
            pollutantUnit={unit}
            accentColor={cinematicTheme.accent || '#10b981'}
          />
        </div>
      </div>
    </section>
  );
}
