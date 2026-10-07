/**
 * PinnedScrollStory.jsx
 * VayuVitals - Pinned Cinematic Narrative Sequence
 *
 * Pinned ScrollTrigger moment where the Indian vehicle background remains anchored
 * while 3 progressive narrative beats unfold through the user's scroll:
 * 1. "WHAT IS [POLLUTANT]?"
 * 2. "WHERE DOES IT EMERGE?"
 * 3. "WHY DOES IT MATTER?"
 *
 * Strictly scoped to the seven pollutant documentary pages.
 */

import React from 'react';
import { Layers, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function PinnedScrollStory({
  pollutantData,
  cinematicTheme,
  environmentData,
  vehicleProfile, // backward-compat alias
}) {
  const env = environmentData || vehicleProfile || {};
  const sourcesList = pollutantData.typicalSources || [];
  const primarySourceDesc = sourcesList[0]?.description || 'Atmospheric emissions across the Delhi basin.';

  const storyBeats = env.storyBeats || [
    {
      question: `WHAT IS ${pollutantData.symbol}?`,
      headline: pollutantData.sections?.section01?.title || 'THE INVISIBLE AGENT',
      lead: pollutantData.sections?.section01?.lead || pollutantData.shortDescription,
      detail: pollutantData.whatIsIt,
    },
    {
      question: 'WHERE DOES IT EMERGE?',
      headline: pollutantData.sections?.section03?.title || 'SOURCES & EMISSION VECTORS',
      lead: pollutantData.sections?.section03?.lead || 'Atmospheric emissions across the Delhi basin.',
      detail: `${env.sourceContext || 'Urban emissions'} — ${primarySourceDesc}`,
    },
    {
      question: 'WHY DOES IT MATTER?',
      headline: 'PHYSIOLOGICAL & AIRSHED CONSEQUENCE',
      lead: pollutantData.whyItMatters,
      detail: `CPCB 24-hr NAAQS Limit: ${pollutantData.naaqsLimit} ${pollutantData.unit} | WHO Guideline: ${pollutantData.whoLimit} ${pollutantData.unit}`,
    },
  ];

  return (
    <section className="doc-pinned-story-section" id="doc-pinned-story-scene">
      <div className="doc-pinned-viewport">
        {/* Pinned Background Vehicle Canvas */}
        <div className="doc-pinned-bg-canvas">
          <img
            src={env.vehicleImage}
            alt={`${pollutantData.name} field evidence in ${env.environmentContext || 'Delhi NCR'}`}
            className="doc-pinned-bg-img"
            loading="lazy"
          />
          <div className="doc-pinned-scrim" />
          <div className="doc-pinned-grain-overlay" />
        </div>

        {/* HUD Metadata Ribbon */}
        <div className="doc-pinned-top-ribbon">
          <div className="ribbon-tag">
            <span className="ribbon-pulse" style={{ backgroundColor: cinematicTheme.accent }} />
            <span>CASE DOSSIER // {pollutantData.symbol}</span>
          </div>

          <div className="ribbon-stepper" aria-label="Investigation Steps">
            {storyBeats.map((beat, idx) => (
              <div
                key={idx}
                className={`step-indicator step-ind-${idx}`}
                data-step={idx}
              >
                <span className="step-num">0{idx + 1}</span>
                <span className="step-bar" />
              </div>
            ))}
          </div>

          <div className="ribbon-spec">
            <span>OBSERVATION EVIDENCE // DELHI NCR</span>
          </div>
        </div>

        {/* Narrative Cards Container (Driven by GSAP ScrollTrigger) */}
        <div className="doc-pinned-cards-deck">
          {storyBeats.map((beat, idx) => (
            <article
              key={idx}
              className={`doc-pinned-card beat-card-${idx}`}
              data-beat-index={idx}
            >
              <div className="card-kicker-row">
                <span className="card-kicker-badge" style={{ color: cinematicTheme.accent }}>
                  {idx === 0 && <Layers size={13} />}
                  {idx === 1 && <Activity size={13} />}
                  {idx === 2 && <AlertTriangle size={13} />}
                  <span>{beat.question}</span>
                </span>
                <span className="card-counter">PHASE 0{idx + 1} OF 03</span>
              </div>

              <h2 className="card-headline">{beat.headline}</h2>
              <p className="card-lead">{beat.lead}</p>

              <div className="card-detail-box">
                <div className="detail-accent-bar" style={{ backgroundColor: cinematicTheme.accent }} />
                <p className="detail-text">{beat.detail}</p>
              </div>

              <div className="card-footer-trace">
                <span className="trace-label">EVIDENCE RECEPTOR:</span>
                <span className="trace-val">{env.environmentContext || env.environment || 'Delhi NCR Basin'}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
