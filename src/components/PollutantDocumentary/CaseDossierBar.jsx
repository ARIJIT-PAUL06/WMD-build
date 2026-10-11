/**
 * CaseDossierBar.jsx
 * VayuVitals - Persistent Sticky Case Dossier Stepper Bar
 *
 * Implements persistent, sticky editorial dossier stepper:
 * - Remains pinned at top: 0 with blur and hairline border
 * - NEVER hides when scrolling up; remains accessible across documentary flow
 * - Interactive step buttons for all FIVE phases (01 SOURCE, 02 MOVEMENT, 03 EXPOSURE, 04 IMPACT, 05 EVIDENCE)
 * - Clickable dossier header ("CASE DOSSIER // {SYMBOL}") jumping to narrative start
 * - Clickable evidence badge ("OBSERVATION EVIDENCE // DELHI NCR") jumping to telemetry
 * - Preserves exact typography, palette tokens, and responsive aesthetics
 */

import React, { useCallback, useState, useEffect } from 'react';

export default function CaseDossierBar({
  pollutantData,
  cinematicTheme: _cinematicTheme,
  storyBeats = [],
}) {
  const [isFixedTop, setIsFixedTop] = useState(false);

  // Monitor scroll so navigation bar never hides when scrolling up
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      // Once scrolled past hero (approx 380px), keep bar fixed at top so it never hides on scroll-up
      setIsFixedTop(scrollY > 380);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleStepClick = useCallback((idx) => {
    const targets = [
      'section-where-it-comes-from', // 01 SOURCE
      'section-what-it-does',         // 02 MOVEMENT
      'section-07-why-it-matters',    // 03 EXPOSURE
      'section-07-why-it-matters',    // 04 IMPACT
      'section-08-the-takeaway',     // 05 EVIDENCE
    ];
    const targetId = targets[idx] || 'documentary-pinned-story';
    const el = document.getElementById(targetId);
    if (el) {
      const navBar = document.getElementById('documentary-case-dossier-bar');
      const navHeight = navBar ? navBar.offsetHeight : 60;
      const rect = el.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      window.scrollTo({
        top: Math.max(0, scrollTop + rect.top - navHeight - 16),
        behavior: 'smooth',
      });
    }
  }, []);

  const handleDossierStartClick = useCallback(() => {
    const el = document.getElementById('documentary-pinned-story') || document.getElementById('documentary-case-dossier-wrapper');
    if (el) {
      const navBar = document.getElementById('documentary-case-dossier-bar');
      const navHeight = navBar ? navBar.offsetHeight : 60;
      const rect = el.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      window.scrollTo({
        top: Math.max(0, scrollTop + rect.top - navHeight - 16),
        behavior: 'smooth',
      });
    }
  }, []);

  const handleEvidenceClick = useCallback(() => {
    const el = document.getElementById('section-08-the-takeaway') || document.getElementById('wmd-impact-row');
    if (el) {
      const navBar = document.getElementById('documentary-case-dossier-bar');
      const navHeight = navBar ? navBar.offsetHeight : 60;
      const rect = el.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      window.scrollTo({
        top: Math.max(0, scrollTop + rect.top - navHeight - 16),
        behavior: 'smooth',
      });
    }
  }, []);

  // 5 distinct phases as requested by the user
  const beats = [
    { step: '01', tag: 'SOURCE' },
    { step: '02', tag: 'MOVEMENT' },
    { step: '03', tag: 'EXPOSURE' },
    { step: '04', tag: 'IMPACT' },
    { step: '05', tag: 'EVIDENCE' },
  ];

  return (
    <div
      className={`documentary-case-dossier-sticky-bar ${isFixedTop ? 'is-fixed-top' : ''}`}
      id="documentary-case-dossier-bar"
      style={
        isFixedTop
          ? {
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 200,
              width: '100%',
              backgroundColor: 'rgba(14, 16, 12, 0.96)',
              backdropFilter: 'blur(16px)',
              borderBottom: '1px solid var(--pollutant-btn-border, rgba(216, 207, 185, 0.22))',
            }
          : {
              position: 'sticky',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 100,
              width: '100%',
              backgroundColor: 'rgba(14, 16, 12, 0.94)',
              backdropFilter: 'blur(16px)',
              borderBottom: '1px solid var(--pollutant-rule, rgba(216, 207, 185, 0.15))',
            }
      }
    >
      <div className="documentary-pinned-top-ribbon">
        <button
          type="button"
          className="doc-ribbon-tag doc-ribbon-tag-btn"
          onClick={handleDossierStartClick}
          aria-label={`Jump to start of ${pollutantData?.symbol || 'Pollutant'} Case Dossier`}
        >
          <span className="doc-ribbon-pulse" style={{ backgroundColor: 'var(--pollutant-color, var(--bone-200))', boxShadow: 'var(--pollutant-glow, none)' }} />
          <span>CASE DOSSIER // <span style={{ color: 'var(--pollutant-color, inherit)', fontWeight: 700 }}>{pollutantData?.symbol || 'AIRSHED'}</span></span>
        </button>

        <div className="doc-ribbon-stepper" aria-label="Investigation Phases" role="tablist">
          {beats.map((beat, idx) => (
            <button
              key={beat.step}
              type="button"
              className={`doc-ribbon-step-item step-item-${idx} ${idx === 0 ? 'active' : ''}`}
              data-step-index={idx}
              onClick={() => handleStepClick(idx)}
              aria-label={`Jump to Phase ${beat.step}: ${beat.tag}`}
            >
              <span className="doc-step-num">{beat.step}</span>
              <span className="doc-step-name">{beat.tag}</span>
              <span className="doc-step-bar" />
            </button>
          ))}
        </div>

        <button
          type="button"
          className="doc-ribbon-spec doc-ribbon-spec-btn"
          onClick={handleEvidenceClick}
          aria-label="Jump to Observation Evidence in Delhi NCR"
        >
          <span>OBSERVATION EVIDENCE // DELHI NCR</span>
        </button>
      </div>
    </div>
  );
}
