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
 * - Interactive SVG vector progress timeline linking the 4 investigation phases
 * - Scientific stage vector schematics illustrating each phase
 * - Zero automotive specs; pollutant is the central subject
 */

import React, { useMemo } from 'react';
import { Layers, Wind, Compass, AlertTriangle } from 'lucide-react';

export default function DocumentaryPinnedStory({
  pollutantData,
  cinematicTheme,
  environmentData,
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
          <div
            className="documentary-pinned-ambient-glow"
            style={{
              background: `radial-gradient(ellipse at 50% 60%, ${cinematicTheme.ambientColor || 'rgba(16, 185, 129, 0.12)'} 0%, transparent 70%)`,
            }}
          />
        </div>

        {/* Top Progress Stepper Ribbon */}
        <div className="documentary-pinned-top-ribbon">
          <div className="doc-ribbon-tag">
            <span className="doc-ribbon-pulse" style={{ backgroundColor: cinematicTheme.accent }} />
            <span>CASE DOSSIER // {pollutantData.symbol}</span>
          </div>

          <div className="doc-ribbon-stepper" aria-label="Investigation Phases">
            <svg
              className="doc-ribbon-track-svg"
              viewBox="0 0 280 6"
              aria-hidden="true"
              style={{ position: 'absolute', width: '280px', height: '6px', pointerEvents: 'none' }}
            >
              <line x1="10" y1="3" x2="270" y2="3" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="2" />
              <line
                id="doc-ribbon-progress-line"
                x1="10"
                y1="3"
                x2="270"
                y2="3"
                stroke={cinematicTheme.accent}
                strokeWidth="2.5"
                strokeDasharray="260"
                strokeDashoffset="260"
              />
            </svg>
            {storyBeats.map((beat, idx) => (
              <div
                key={beat.step}
                className={`doc-ribbon-step-item step-item-${idx} ${idx === 0 ? 'active' : ''}`}
                data-step-index={idx}
              >
                <span className="doc-step-num">{beat.step}</span>
                <span className="doc-step-name">{beat.tag}</span>
                <span className="doc-step-bar" />
              </div>
            ))}
          </div>

          <div className="doc-ribbon-spec">
            <span>OBSERVATION EVIDENCE // DELHI NCR</span>
          </div>
        </div>

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
                  <span className="doc-card-kicker-badge" style={{ color: cinematicTheme.accent }}>
                    <IconComponent size={13} />
                    <span>{beat.question}</span>
                  </span>
                  <span className="doc-card-counter">PHASE 0{idx + 1} OF 04</span>
                </div>

                <h3 className="doc-card-headline">{beat.headline}</h3>
                <p className="doc-card-lead">{beat.lead}</p>

                {/* Schematic Vector Pathway Visual for each scientific phase */}
                <div className="doc-card-schematic-wrap" aria-hidden="true">
                  {idx === 0 && (
                    <svg className="doc-card-schematic-svg" viewBox="0 0 280 36" fill="none">
                      <circle cx="20" cy="18" r="5" fill={cinematicTheme.accent} />
                      <circle cx="20" cy="18" r="12" stroke={cinematicTheme.accent} strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                      <path d="M 36 18 L 250 18" stroke={cinematicTheme.accent} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4" />
                      <path d="M 235 13 L 250 18 L 235 23" stroke={cinematicTheme.accent} strokeWidth="1.5" fill="none" opacity="0.8" />
                      <circle cx="110" cy="18" r="3" fill="#cbd5e1" opacity="0.5" />
                      <circle cx="170" cy="18" r="3.5" fill="#cbd5e1" opacity="0.7" />
                      <text x="50" y="32" fill="#94a3b8" fontSize="8" fontFamily="monospace">EMISSION INJECTION VECTOR</text>
                    </svg>
                  )}
                  {idx === 1 && (
                    <svg className="doc-card-schematic-svg" viewBox="0 0 280 36" fill="none">
                      <path d="M 10 10 Q 70 6, 140 10 T 270 10" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 2" />
                      <text x="10" y="7" fill="#94a3b8" fontSize="7.5" fontFamily="monospace">INVERSION CEILING &lt; 200m</text>
                      <path d="M 20 26 Q 80 18, 150 24 T 260 22" stroke={cinematicTheme.accent} strokeWidth="2" />
                      <circle cx="150" cy="24" r="4" fill={cinematicTheme.accent} />
                      <text x="165" y="32" fill="#94a3b8" fontSize="7.5" fontFamily="monospace">TRAPPED BASIN PLUME</text>
                    </svg>
                  )}
                  {idx === 2 && (
                    <svg className="doc-card-schematic-svg" viewBox="0 0 280 36" fill="none">
                      <path d="M 15 28 L 265 28" stroke="#475569" strokeWidth="1.5" />
                      <rect x="40" y="14" width="24" height="14" fill="none" stroke="#64748b" strokeWidth="1" />
                      <rect x="85" y="8" width="30" height="20" fill="none" stroke="#64748b" strokeWidth="1" />
                      <circle cx="190" cy="18" r="5" fill={cinematicTheme.accent} />
                      <circle cx="190" cy="18" r="11" stroke={cinematicTheme.accent} strokeWidth="1" strokeDasharray="2 2" opacity="0.7" />
                      <text x="145" y="32" fill="#94a3b8" fontSize="7.5" fontFamily="monospace">BREATHING ZONE RECEPTOR</text>
                    </svg>
                  )}
                  {idx === 3 && (
                    <svg className="doc-card-schematic-svg" viewBox="0 0 280 36" fill="none">
                      <line x1="15" y1="18" x2="265" y2="18" stroke="#334155" strokeWidth="2" />
                      <line x1="150" y1="6" x2="150" y2="30" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2 2" />
                      <text x="156" y="11" fill="#f87171" fontSize="7.5" fontFamily="monospace">NAAQS CEILING</text>
                      <circle cx="90" cy="18" r="5" fill={cinematicTheme.accent} />
                      <circle cx="210" cy="18" r="3.5" fill="#f97316" />
                      <text x="20" y="31" fill="#94a3b8" fontSize="7.5" fontFamily="monospace">CELLULAR DEPOSITION</text>
                    </svg>
                  )}
                </div>

                <div className="doc-card-detail-box">
                  <div className="doc-detail-accent-bar" style={{ backgroundColor: cinematicTheme.accent }} />
                  <p className="doc-detail-text">{beat.detail}</p>
                </div>

                <div className="doc-card-footer-trace">
                  <span className="doc-trace-label">EVIDENCE RECEPTOR:</span>
                  <span className="doc-trace-val">{env.environmentContext || 'Delhi NCR Airshed'}</span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
