/**
 * DocumentaryPinnedStory.jsx
 * VayuVitals - Pinned Cinematic Airshed Storytelling Sequence
 *
 * Implements Forge Automotive-inspired scroll-driven pinned narrative:
 * - Large authentic Indian environmental image remains pinned in viewport
 * - Progressive scroll-driven beats unfold:
 *   1. SOURCE: Primary combustion & emission origins
 *   2. MOVEMENT: Atmospheric boundary layer inversion & plume advection
 *   3. EXPOSURE: Ground-level street canyon receptors & human proximity
 *   4. IMPACT: Deep alveolar penetration & cardiovascular inflammation
 * - Top progress stepper ribbon (01 to 04) tracking scroll progress
 * - Zero automotive specs; pollutant is the central subject
 */

import React, { useMemo } from 'react';
import { Layers, Wind, Compass, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function DocumentaryPinnedStory({
  pollutantData,
  cinematicTheme,
  environmentData,
  hideRibbon = false,
}) {
  const env = environmentData || {};
  const sourcesList = pollutantData.typicalSources || [];
  const primarySourceDesc = sourcesList[0]?.description || 'Atmospheric emissions across the Delhi basin.';

  const storyBeats = useMemo(() => {
    return [
      {
        step: '01',
        tag: 'SOURCE',
        question: `WHERE DOES ${pollutantData.symbol} EMERGE?`,
        headline: pollutantData.sections?.section03?.title || 'EMISSION VECTORS & PRODUCTION',
        lead: pollutantData.sections?.section03?.lead || 'Atmospheric emissions across the regional airshed.',
        detail: `${env.sourceContext || 'Combustion sources'} — ${primarySourceDesc}`,
        icon: Layers,
      },
      {
        step: '02',
        tag: 'MOVEMENT',
        question: 'HOW DOES THE ATMOSPHERE MOVE IT?',
        headline: 'THERMAL INVERSION & BASIN TRAPPING',
        lead: 'Nocturnal radiation cooling drops the planetary boundary layer ceiling below 150 meters.',
        detail: pollutantData.atmosphericBehavior || 'Calm surface winds trap particulate plumes near breathing height.',
        icon: Wind,
      },
      {
        step: '03',
        tag: 'EXPOSURE',
        question: 'WHO AND WHAT DOES IT AFFECT?',
        headline: 'STREET LEVEL CONCENTRATIONS',
        lead: 'Pedestrians, commuters, and school campuses face immediate inhalation hazards.',
        detail: `Continuous receptor monitors across ${env.environmentContext || 'Delhi NCR'} capture acute concentration spikes during morning rush hours.`,
        icon: Compass,
      },
      {
        step: '04',
        tag: 'IMPACT',
        question: 'WHY DOES IT MATTER?',
        headline: 'PHYSIOLOGICAL & CELLULAR INJURY',
        lead: pollutantData.whyItMatters || 'Systemic cardiovascular stress and irreversible reduction in vital capacity.',
        detail: `CPCB 24-hr NAAQS Limit: ${pollutantData.naaqsLimit} ${pollutantData.unit} | WHO Guideline: ${pollutantData.whoLimit} ${pollutantData.unit}`,
        icon: AlertTriangle,
      },
    ];
  }, [pollutantData, env, primarySourceDesc]);

  return (
    <section className="documentary-pinned-story-section" id="documentary-pinned-story">
      <div className="documentary-pinned-viewport">
        {/* Pinned Background Environmental Canvas */}
        <div className="documentary-pinned-bg-canvas">
          <img
            src={env.vehicleImage || cinematicTheme.heroImage}
            alt={`${pollutantData.name} field evidence in ${env.environmentContext || 'Delhi NCR'}`}
            className="documentary-pinned-bg-img"
            loading="lazy"
          />
          <div className="documentary-pinned-scrim" />
          <div
            className="documentary-pinned-sculptural-watermark"
            aria-hidden="true"
          >
            {pollutantData.symbol}
          </div>
          <div className="documentary-pinned-ambient-glow" style={{ background: `radial-gradient(ellipse at 50% 60%, var(--pollutant-ambient) 0%, transparent 70%)` }} />
        </div>

        {/* Top Progress Stepper Ribbon (rendered when not hoisted to sticky wrapper) */}
        {!hideRibbon && (
          <div className="documentary-pinned-top-ribbon">
            <button
              type="button"
              className="doc-ribbon-tag doc-ribbon-tag-btn"
              onClick={() => {
                const el = document.getElementById('documentary-pinned-story');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              aria-label={`Jump to start of ${pollutantData.symbol} Case Dossier`}
            >
              <span className="doc-ribbon-pulse" style={{ backgroundColor: 'var(--pollutant-color, var(--pollutant-accent))', boxShadow: 'var(--pollutant-glow, none)' }} />
              <span>CASE DOSSIER // <span style={{ color: 'var(--pollutant-color)' }}>{pollutantData.symbol}</span></span>
            </button>

            <div className="doc-ribbon-stepper" aria-label="Investigation Phases" role="tablist">
              {storyBeats.map((beat, idx) => (
                <button
                  key={beat.step}
                  type="button"
                  className={`doc-ribbon-step-item step-item-${idx} ${idx === 0 ? 'active' : ''}`}
                  data-step-index={idx}
                  onClick={() => {
                    const targets = [
                      'section-where-it-comes-from',
                      'section-what-it-does',
                      'section-07-why-it-matters',
                      'section-08-the-takeaway',
                    ];
                    const targetEl = document.getElementById(targets[idx]);
                    if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
                  }}
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
              onClick={() => {
                const el = document.getElementById('wmd-impact-row') || document.getElementById('section-08-the-takeaway');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              aria-label="Jump to Observation Evidence in Delhi NCR"
            >
              <span>OBSERVATION EVIDENCE // DELHI NCR</span>
            </button>
          </div>
        )}

        {/* Narrative Cards Deck Driven by ScrollTrigger Scrub */}
        <div className="documentary-pinned-cards-deck">
          {storyBeats.map((beat, idx) => {
            const IconComponent = beat.icon;
            return (
              <article
                key={beat.step}
                className={`documentary-pinned-card beat-card-${idx}`}
                data-beat-index={idx}
              >
                <div className="doc-card-kicker-row">
                  <span className="doc-card-kicker-badge" style={{ color: 'var(--pollutant-color, var(--bone-200))' }}>
                    <IconComponent size={13} />
                    <span>{beat.tag}</span>
                  </span>
                </div>

                <h3 className="doc-card-headline">{beat.headline}</h3>
                <p className="doc-card-lead">{beat.lead}</p>

                <div className="doc-card-detail-box">
                  <div className="doc-detail-accent-bar" style={{ backgroundColor: 'var(--pollutant-color, var(--bone-200))' }} />
                  <p className="doc-detail-text">{beat.detail}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
