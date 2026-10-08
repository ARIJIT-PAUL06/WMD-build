/**
 * DocumentaryFooter.jsx
 * VayuVitals - Minimalist Environmental Closing & Navigation Footer
 *
 * Implements Section 10 of the new unified UI system:
 * - Clean solemn environmental message: "YOU CANNOT ALWAYS SEE POLLUTION. BUT WE CAN MEASURE IT. AND MEASUREMENTS TELL A STORY."
 * - "EXPLORE ANOTHER POLLUTANT" with chapter selector chips (PM2.5 to NH3)
 * - "Back to Atmospheric Cargo" buttons
 * - Minimal, elegant ending
 */

import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { POLLUTANT_DOCUMENTARY_LIST } from '../../data/pollutantDocumentaries.js';

export default function DocumentaryFooter({
  activePollutantId = 'pm25',
  onSelectPollutant,
  onBack,
}) {
  return (
    <footer className="documentary-footer" role="contentinfo">
      <div className="documentary-footer-container">
        {/* Environmental Credo */}
        <div className="documentary-footer-credo">
          <p className="doc-credo-line-1">YOU CANNOT ALWAYS SEE POLLUTION.</p>
          <p className="doc-credo-line-2">BUT WE CAN MEASURE IT.</p>
          <p className="doc-credo-line-3">AND MEASUREMENTS TELL A STORY.</p>
          <div className="doc-footer-brand">
            <span className="doc-footer-brand-title">VAYUVITALS</span>
            <span className="doc-footer-brand-desc">SEE THE AIR • UNDERSTAND THE AIR • ACT ON THE EVIDENCE</span>
          </div>
        </div>

        {/* Explore Another Pollutant Navigation */}
        <div className="documentary-footer-nav-block">
          <div className="doc-footer-nav-header">
            <span className="doc-footer-nav-title">EXPLORE ANOTHER POLLUTANT</span>
            <ArrowRight size={14} className="doc-arrow-icon" />
          </div>
          <p className="doc-footer-nav-desc">
            Select an atmospheric chemical chapter to inspect its sources, dynamics, and clinical consequences.
          </p>

          <div className="documentary-footer-pollutant-chips" aria-label="Explore other pollutants">
            {POLLUTANT_DOCUMENTARY_LIST.map((p, index) => {
              const isActive = p.id === activePollutantId;
              return (
                <button
                  key={p.id}
                  type="button"
                  id={`explore-another-${p.id}`}
                  className={`doc-footer-chip ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectPollutant && onSelectPollutant(p.id)}
                  title={`Examine ${p.name}`}
                >
                  <span className="doc-chip-number">0{index + 1}</span>
                  <span className="doc-chip-name">{p.symbol}</span>
                  {isActive && <span className="doc-chip-indicator" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Back to Cargo Hauler Action */}
        <div className="documentary-footer-actions">
          <button
            type="button"
            className="documentary-footer-cargo-btn"
            onClick={onBack}
            id="doc-return-to-story-cta"
          >
            <ArrowLeft size={15} />
            <span>Back to Atmospheric Cargo</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
