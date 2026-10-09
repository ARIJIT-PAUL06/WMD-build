/**
 * DocumentarySection.jsx
 * VayuVitals - Editorial Narrative Sections (Source / Dynamics / Impacts / School / 14-Day Archive)
 *
 * Implements Section 7 of the new unified UI system:
 * - Section 01: What are they? (Chemical composition & aerodynamic profile)
 * - Section 02: How small are they? (Physical scale comparison vs Human Hair & PM10)
 * - Section 03: Where it comes from / Exposure (Source vectors, CPCB standard, atmospheric behavior)
 * - Section 04: What it does (Atmospheric transport & boundary layer dynamics)
 * - Section 07: Why it matters / School Safety (Quadratic IDW estimation & spatial disclaimer)
 * - Section 08: 14 Days of Evidence (Continuous empirical window & NO DATA handling)
 *
 * Spacious, elegant editorial layout (NOT dashboard styling)
 */

import React, { useMemo } from 'react';
import { Layers, Activity, AlertTriangle, Wind, Info, ArrowRight, ShieldCheck, HeartPulse, CheckCircle2, Calendar, Factory, Flame } from 'lucide-react';
import { POLLUTANT_SYNTHESIS_FLOWS } from './documentaryHelpers.js';
import PhysiologicalImpactMatrix from '../common/PhysiologicalImpactMatrix';
import ConnectedProcessFlow from '../common/ConnectedProcessFlow';
import ComparisonSplitPanel from '../common/ComparisonSplitPanel';
import RadialProgressMeter from '../common/RadialProgressMeter';
import AnimatedCounter from '../common/AnimatedCounter';

export default function DocumentarySection({
  pollutantData,
  cinematicTheme,
  environmentData,
  currentValue,
  currentStation,
  dailyEvidenceWindow = [],
}) {
  const { sections = {} } = pollutantData;
  const unit = pollutantData.unit || 'µg/m³';

  const sources = pollutantData.typicalSources || [];
  const primarySource = sources[0] || {
    category: 'Urban Combustion & Transport',
    description: 'Emissions from vehicular transit and industrial activity across the Delhi basin.',
  };
  const comparisonItems = sections.section02?.comparisonItems || [
    { label: 'Human Hair', sizeMicrons: 70, barWidthPercent: 100, visualClass: 'hair' },
    { label: 'PM10 (Coarse Inhalable)', sizeMicrons: 10, barWidthPercent: 14.3, visualClass: 'pm10' },
    { label: 'PM2.5 (Fine Combustion)', sizeMicrons: 2.5, barWidthPercent: 3.5, visualClass: 'pm25' },
  ];
  const stages = sections.section04?.stages || [];
  const impactPoints = sections.section07?.points || [];

  // Visual flow and threshold metrics
  const flowSteps = useMemo(() => {
    return POLLUTANT_SYNTHESIS_FLOWS[pollutantData.id] || POLLUTANT_SYNTHESIS_FLOWS.pm25;
  }, [pollutantData.id]);

  const delta = useMemo(() => {
    if (currentValue == null || !pollutantData.naaqsLimit) return null;
    return Math.round(currentValue - pollutantData.naaqsLimit);
  }, [currentValue, pollutantData.naaqsLimit]);

  const ratio = useMemo(() => {
    if (currentValue == null || !pollutantData.naaqsLimit) return null;
    return (currentValue / pollutantData.naaqsLimit).toFixed(1);
  }, [currentValue, pollutantData.naaqsLimit]);

  return (
    <div className="documentary-editorial-sections-wrapper" id="documentary-editorial-dossier">
      {/* ===================================================================
          1. WHAT ARE THEY? (SECTION 01) - VISUAL CHEMICAL PROFILE & FLOW
          =================================================================== */}
      <section className="documentary-section" id="section-01-what-are-they">
        <div className="doc-section-ghost-watermark" aria-hidden="true">
          {pollutantData.symbol}
        </div>
        <div className="documentary-section-inner">
          <header className="documentary-section-header">
            <span className="doc-sec-category">Chemical Composition</span>
            <div className="doc-mask-reveal-wrap">
              <h2 className="documentary-section-title">
                {sections.section01?.title || 'What Are They?'}
              </h2>
            </div>
            <p className="documentary-section-lead">
              {sections.section01?.lead || pollutantData.shortDescription}
            </p>
          </header>

          {/* Visual 4-Card Chemical & Aerodynamic Metric Grid */}
          <div className="doc-chem-metric-grid">
            <div className="doc-chem-metric-card">
              <span className="doc-metric-tag">AERODYNAMIC PROFILE</span>
              <span className="doc-metric-num">
                {cinematicTheme?.scaleSymbol || (pollutantData.id === 'pm25' ? '≤ 2.5 µm' : pollutantData.id === 'pm10' ? '≤ 10 µm' : 'Molecular Gas')}
              </span>
              <span className="doc-metric-note">
                {pollutantData.id.startsWith('pm') ? 'Terminal Inhalable' : 'Gas Phase'}
              </span>
            </div>

            <div className="doc-chem-metric-card">
              <span className="doc-metric-tag">CHEMICAL FORMULA</span>
              <span className="doc-metric-num">
                {pollutantData.chemicalFormula || pollutantData.symbol}
              </span>
              <span className="doc-metric-note">{pollutantData.name}</span>
            </div>

            <div className="doc-chem-metric-card">
              <span className="doc-metric-tag">ATMOSPHERIC RESIDENCE</span>
              <span className="doc-metric-num">
                {pollutantData.id.startsWith('pm') ? 'Days to Weeks' : 'Hours to Days'}
              </span>
              <span className="doc-metric-note">Regional Airshed Transport</span>
            </div>

            <div className="doc-chem-metric-card">
              <span className="doc-metric-tag">AEROSOL STATE</span>
              <span className="doc-metric-num">
                {pollutantData.id.startsWith('pm') ? 'Suspended Droplets' : 'Reactive Gas'}
              </span>
              <span className="doc-metric-note">Indo-Gangetic Basin</span>
            </div>
          </div>

          {/* Visual 4-Step Synthesis & Inhalation Flowchart */}
          <div className="doc-visual-synthesis-flow">
            <div className="doc-flow-header">
              <span className="doc-flow-kicker">ATMOSPHERIC FORMATION & INHALATION VECTOR</span>
            </div>
            <div className="doc-flow-steps">
              {flowSteps.map((step, idx) => (
                <React.Fragment key={step.step}>
                  <div className="doc-flow-step-box">
                    <span className="doc-flow-step-num">{step.step}</span>
                    <span className="doc-flow-step-title">{step.label}</span>
                    <span className="doc-flow-step-sub">{step.desc}</span>
                  </div>
                  {idx < flowSteps.length - 1 && (
                    <span className="doc-flow-arrow" aria-hidden="true">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="documentary-prose-editorial-block">
            <p className="documentary-editorial-body single-line">
              {sections.section01?.body
                ? sections.section01.body.split('.')[0] + '.'
                : pollutantData.whatIsIt.split('.')[0] + '.'}
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================================
          2. HOW SMALL ARE THEY? (SECTION 02) - RELATIVE RATIO SCALE
          =================================================================== */}
      <section className="documentary-section" id="section-02-how-small">
        <div className="documentary-section-inner">
          <header className="documentary-section-header">
            <span className="doc-sec-category">Physical Scale</span>
            <div className="doc-mask-reveal-wrap">
              <h2 className="documentary-section-title">
                {sections.section02?.title || 'How Small Are They?'}
              </h2>
            </div>
            <p className="documentary-section-lead">
              {sections.section02?.lead || 'Scale is the defining property of aerodynamic penetration.'}
            </p>
          </header>

          <div className="documentary-scale-visual-deck">
            <div className="doc-scale-rows">
              {comparisonItems.map((item, idx) => (
                <div key={idx} className="doc-scale-row">
                  <div className="doc-scale-labels">
                    <span className="doc-scale-name">{item.label}</span>
                    <span className="doc-scale-size">{item.sizeMicrons} µm</span>
                  </div>
                  <div className="doc-scale-track">
                    <div
                      className={`doc-scale-fill ${item.visualClass || ''}`}
                      style={{ width: `${Math.max(3, item.barWidthPercent)}%` }}
                    />
                  </div>
                  <span className="doc-scale-ratio-badge">
                    {item.label === 'Human Hair'
                      ? '1x Baseline (70 µm)'
                      : item.label.includes('PM10')
                        ? '1/7th Hair'
                        : item.label.includes('PM2.5')
                          ? '1/28th Hair'
                          : `${item.sizeMicrons} µm`}
                  </span>
                </div>
              ))}
            </div>

            <p className="doc-scale-footer-prose single-line">
              {sections.section02?.body
                ? sections.section02.body.split('.')[0] + '.'
                : 'Particles ≤ 2.5 µm bypass natural anatomical filters, descending into terminal pulmonary alveoli.'}
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================================
          3. WHERE IT COMES FROM (SECTION 03 & SOURCE EXPOSURE)
          =================================================================== */}
      <section
        className="documentary-section doc-source-exposure-section"
        id="section-where-it-comes-from"
      >
        <div className="doc-section-ghost-watermark doc-ghost-left" aria-hidden="true">
          {pollutantData.symbol}
        </div>
        <div className="documentary-section-inner">
          <header className="documentary-section-header">
            <span className="doc-sec-category">Emission Origins</span>
            <div className="doc-mask-reveal-wrap">
              <h2 className="documentary-section-title">
                {sections.section03?.title || 'Where It Comes From'}
              </h2>
            </div>
            <p className="documentary-section-lead">
              {sections.section03?.lead || 'Direct combustion plumes and airborne secondary chemical synthesis.'}
            </p>
          </header>

          <div className="exposure-body-grid">
            {/* Left Column: Asymmetrical Editorial Emission Origins Composition */}
            <div className="exposure-statement-col">
              <div className="documentary-sources-editorial-composition">
                {/* Primary Leading Origin Feature */}
                {sources[0] && (
                  <article className="doc-source-feature-banner">
                    <div className="doc-feature-content">
                      <h3 className="doc-feature-category">{sources[0].category}</h3>
                      <p className="doc-feature-body">
                        {sources[0].description}
                      </p>
                    </div>
                  </article>
                )}

                {/* Secondary 3 Sources Asymmetrical Deck */}
                <div className="doc-secondary-sources-deck">
                  {sources.slice(1, 4).map((src, idx) => {
                    return (
                      <article key={idx} className={`doc-source-secondary-card item-type-${idx}`}>
                        <h4 className="doc-sec-category">{src.category}</h4>
                        <p className="doc-sec-body">
                          {src.description}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </div>

              {/* Atmospheric Boundary Layer Behavior Strip */}
              <div className="exposure-behavior-box">
                <div className="doc-behavior-kicker">
                  <span>Atmospheric Dispersion & Basin Meteorology</span>
                </div>
                <p className="doc-behavior-text">
                  {pollutantData.atmosphericBehavior}
                </p>
              </div>
            </div>

            {/* Right Column: Clean Standards Reference */}
            <div className="exposure-telemetry-col">
              <div className="doc-standard-box highlight">
                <span className="doc-std-org">CPCB 24-HR NAAQS STANDARD</span>
                <span className="doc-std-val">{pollutantData.naaqsLimit} {unit}</span>
                <span className="doc-std-scope">WHO 24-Hour Guideline: {pollutantData.whoLimit} {unit}</span>
              </div>
            </div>
          </div>

          {/* Visual Side-by-Side Threshold Comparison Split Panel */}
          <ComparisonSplitPanel
            currentValue={currentValue != null ? Math.round(currentValue) : 60}
            limitValue={pollutantData.naaqsLimit || 60}
            whoValue={pollutantData.whoLimit || 15}
            unit={unit}
            pollutantName={pollutantData.name}
            stationName={currentStation?.name || 'Delhi CAAQMS Ground Network'}
          />
        </div>
      </section>

      {/* ===================================================================
          4. WHAT IT DOES (SECTION 04 - ATMOSPHERIC DYNAMICS)
          =================================================================== */}
      <section className="documentary-section" id="section-what-it-does">
        <div className="documentary-section-inner">
          <header className="documentary-section-header">
            <span className="doc-sec-category">Transport Mechanics</span>
            <div className="doc-mask-reveal-wrap">
              <h2 className="documentary-section-title">
                {sections.section04?.title || 'What It Does'}
              </h2>
            </div>
            <p className="documentary-section-lead">
              {sections.section04?.lead || 'The physical journey from initial injection to human exposure.'}
            </p>
          </header>

          {/* Visual Interactive Process Pipeline */}
          <ConnectedProcessFlow
            stages={stages}
            title="ATMOSPHERIC TRANSPORT PIPELINE"
            subtitle="The physical journey from initial injection to human exposure"
            accentColor={cinematicTheme?.accentColor || '#10b981'}
          />
        </div>
      </section>

      {/* ===================================================================
          7. WHY IT MATTERS & PHYSIOLOGICAL IMPACT (SECTION 07)
          =================================================================== */}
      <section className="documentary-section" id="section-07-why-it-matters">
        <div className="doc-section-ghost-watermark" aria-hidden="true">
          {pollutantData.symbol}
        </div>
        <div className="documentary-section-inner">
          <header className="documentary-section-header">
            <span className="doc-sec-category">Physiological Vulnerability</span>
            <div className="doc-mask-reveal-wrap">
              <h2 className="documentary-section-title">
                Why It Matters
              </h2>
            </div>
            <p className="documentary-section-lead">
              Biological uptake, respiratory penetration, and systemic burden
            </p>
          </header>

          {/* Clean Editorial Prose on Biological Trajectory */}
          <div className="documentary-impact-prose-block">
            <p className="doc-impact-prose-hero">
              {pollutantData.whyItMatters || 'Cumulative exposure imposes continuous physiological strain on developing pediatric lung tissue and cardiopulmonary function.'}
            </p>
          </div>

          {/* Visual Anatomical & Demographic Vulnerability Matrix */}
          <PhysiologicalImpactMatrix
            pollutantId={pollutantData.id}
            pollutantName={pollutantData.name}
            accentColor={cinematicTheme?.accentColor || '#ef4444'}
          />

          {/* Physiological Health Points */}
          <div className="documentary-impact-points-grid">
            {impactPoints.map((pt, idx) => (
              <div key={idx} className="documentary-impact-card">
                <p className="doc-impact-text">{pt}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================
          8. 14 DAYS OF EVIDENCE (SECTION 08)
          =================================================================== */}
      <section className="documentary-section" id="section-08-the-takeaway">
        <div className="documentary-section-inner">
          <header className="documentary-section-header">
            <span className="doc-sec-category">Observational Record</span>
            <div className="doc-mask-reveal-wrap">
              <h2 className="documentary-section-title">
                14 Days of Evidence
              </h2>
            </div>
            <p className="documentary-section-lead">
              Field telemetry records across 14 consecutive calendar days. Verified observations are recorded; missing days remain strictly unpopulated.
            </p>
          </header>

          {/* Visual Evidence Summary Telemetry Deck */}
          {(() => {
            const verifiedCount = (dailyEvidenceWindow || []).filter(
              (d) => d.status === 'OBSERVED' || (d.observationCount && d.observationCount > 0)
            ).length;
            const covPct = Math.round((verifiedCount / 14) * 100);

            return (
              <div className="doc-evidence-visual-summary-bar">
                <div className="doc-ev-pill">
                  <span className="ev-pill-lbl">MONITORED WINDOW</span>
                  <span className="ev-pill-val">14 Calendar Days</span>
                </div>
                <div className="doc-ev-pill">
                  <span className="ev-pill-lbl">VERIFIED OBSERVATIONS</span>
                  <span className="ev-pill-val">
                    <AnimatedCounter value={verifiedCount} /> / 14 Days
                  </span>
                </div>
                <div className="doc-ev-pill">
                  <span className="ev-pill-lbl">MISSING OBSERVATIONS</span>
                  <span className="ev-pill-val">
                    <AnimatedCounter value={Math.max(0, 14 - verifiedCount)} /> Days (Strict NO DATA)
                  </span>
                </div>
                <div className="doc-ev-pill highlight">
                  <span className="ev-pill-lbl">EVIDENCE CONTINUITY</span>
                  <span className="ev-pill-val">
                    <AnimatedCounter value={covPct} suffix="%" />
                  </span>
                </div>
              </div>
            );
          })()}

          {/* 14-Day Calendar Cards Grid */}
          <div className="cinematic-14day-grid">
            {(dailyEvidenceWindow.length > 0
              ? dailyEvidenceWindow
              : Array.from({ length: 14 }, (_, i) => ({
                date: `Day ${i + 1}`,
                status: 'NO_DATA',
                observationCount: 0,
              }))
            ).map((day, idx) => (
              <div
                key={day.date || idx}
                className={`cinematic-day-frame status-${(day.status || 'no_data').toLowerCase()}`}
              >
                <div className="day-frame-top">
                  <span className="day-frame-idx">DAY {String(idx + 1).padStart(2, '0')}</span>
                  <span className="day-frame-date">{day.date}</span>
                </div>
                <div className="day-frame-mid">
                  {day.status === 'NO_DATA' ? (
                    <div className="day-frame-nodata">NO DATA</div>
                  ) : (
                    <div className="day-frame-value-block">
                      <span className="df-val">{day.meanPm25}</span>
                      <span className="df-unit">{unit}</span>
                    </div>
                  )}
                </div>
                <div className="day-frame-bottom">
                  <span className="df-obs-count">{day.observationCount || 0} Observations</span>
                  <span className={`df-badge ${(day.status || 'no_data').toLowerCase()}`}>
                    {day.status || 'NO DATA'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Closing Takeaway Quote */}
          {sections.section08?.statement && (
            <div className="documentary-takeaway-quote-block">
              <blockquote className="doc-takeaway-quote">
                "{sections.section08.statement}"
              </blockquote>
              <p className="doc-takeaway-subtext">
                {sections.section08.subtext ? sections.section08.subtext.split('.')[0] + '.' : 'Every breath in an elevated basin carries empirical evidence demanding civic stewardship.'}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
