/**
 * DocumentaryNav.jsx
 * VayuVitals - Compact Floating Translucent Navigation Bar
 *
 * Implements Section 1 of the new unified UI system:
 * - VAYUVITALS brand mark
 * - Clean central nav: Live Air, Pollution Map, Pollutants, School Safety, Evidence
 * - Right side: LIVE status badge with pulsing telemetry dot
 * - Return to Atmospheric Cargo Hauler & main story
 * - Compact translucent dark design, thin border, subtle blur, small rounded corners
 */

import React from 'react';
import { Wind, ArrowLeft } from 'lucide-react';

export default function DocumentaryNav({
  activePollutantId = 'pm25',
  onBack,
  onSelectPollutant,
  onNavigateToMap,
  onNavigateToSchool,
  currentLocationName = 'Delhi NCR Airshed',
}) {
  return (
    <header className="documentary-nav-wrapper cinematic-doc-topbar" role="banner">
      <nav className="documentary-nav" aria-label="Environmental Intelligence Navigation">
        {/* Brand Group */}
        <div className="documentary-nav-brand">
          <div className="documentary-nav-logo-icon" aria-hidden="true">
            <Wind size={16} />
          </div>
          <span className="documentary-nav-brand-title">VAYUVITALS</span>
          <span className="documentary-nav-brand-sub">ENV INTEL</span>
        </div>

        {/* Center Navigation Links */}
        <div className="documentary-nav-links">
          <button
            type="button"
            className="documentary-nav-link"
            id="deep-dive-back-to-story-btn"
            onClick={() => {
              if (onBack) onBack();
            }}
            title="Return to primary air monitoring"
          >
            Live Air
          </button>

          <button
            type="button"
            className="documentary-nav-link"
            onClick={() => {
              if (onNavigateToMap) {
                onNavigateToMap();
              } else if (typeof window !== 'undefined') {
                window.location.search = '?view=map';
              }
            }}
            title="Open Delhi AQI Spatial Heatmap"
          >
            Pollution Map
          </button>

          <span className="documentary-nav-link active" id="doc-all-pollutants-btn" aria-current="page">
            Pollutants
          </span>

          <button
            type="button"
            className="documentary-nav-link"
            onClick={() => {
              if (onNavigateToSchool) {
                onNavigateToSchool();
              } else if (typeof window !== 'undefined') {
                window.location.search = '?view=school';
              }
            }}
            title="Inspect School Air Quality & Safety"
          >
            School Safety
          </button>

          <a
            href="#documentary-data-section"
            className="documentary-nav-link"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('documentary-data-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Evidence
          </a>
        </div>

        {/* Right Status & Cargo Return */}
        <div className="documentary-nav-actions">
          <div className="documentary-nav-live-pill" title="Continuous Delhi CAAQMS telemetry stream">
            <span className="documentary-live-pulse-dot" />
            <span className="documentary-live-text">LIVE</span>
            <span className="documentary-live-divider">•</span>
            <span className="documentary-live-location">{currentLocationName}</span>
          </div>

          <button
            type="button"
            className="documentary-nav-cargo-btn cinematic-ghost-btn"
            onClick={() => {
              if (onBack) onBack();
            }}
            id="doc-back-cargo-btn"
            title="Return to Atmospheric Cargo Hauler deck"
          >
            <ArrowLeft size={13} />
            <span>Back to Atmospheric Cargo</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
