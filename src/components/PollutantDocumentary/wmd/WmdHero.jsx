import React, { useCallback, useRef, useMemo, useEffect } from 'react';
import { Play, Pause, SkipForward, X, ScrollText } from 'lucide-react';
import HeroAtmosphericCanvas from '../HeroAtmosphericCanvas';
import { useAtmosphericMouseField } from '../useAtmosphericMouseField.js';
import { POLLUTANT_DOCUMENTARY_LIST } from '../../../data/pollutantDocumentaries.js';

/**
 * WmdHero - Atmospheric Editorial Hero Section
 * Implements strict GSAP animation hook contract (§6):
 * - id="documentary-hero-viewport"
 * - .documentary-hero-ambient-backdrop
 * - .documentary-hero-photo-layer
 * - .documentary-hero-haze-layer
 * - .documentary-pollutant-kicker-tag
 * - .documentary-pollutant-title-row > .documentary-pollutant-name (plain text for char splitting)
 * - .documentary-hero-headline
 * - .documentary-editorial-desc
 * - .documentary-hero-editorial-col
 * - .documentary-hero-spatial-col
 */
export default function WmdHero({
  pollutantData,
  cinematicTheme,
  weatherVariables,
}) {
  const heroRef = useRef(null);
  const mouseStateRef = useRef({ x: -1000, y: -1000, normX: 0, normY: 0, proximity: 0, active: false });
  // Cursor-reactive dust in the particle canvas (existing animation layer)
  useAtmosphericMouseField(heroRef, mouseStateRef);

  const chapterNumber = cinematicTheme?.chapterNum || '01';
  const totalCount = String(POLLUTANT_DOCUMENTARY_LIST.length).padStart(2, '0');
  const headline = pollutantData?.wmdTagline || pollutantData?.sections?.heroSubtitle || 'A SILENT KILLER';
  const description = pollutantData?.wmdIntro || pollutantData?.shortDescription || '';

  // Relaxed section-by-section documentary tour controller
  const TOUR_STEPS = useMemo(() => [
    { id: 'wmd-coverage-band', title: 'Global Coverage & Monitoring Map' },
    { id: 'wmd-documentaries-strip', title: 'Atmospheric Dossiers' },
    { id: 'wmd-impact-row', title: 'Key Statistics & Exposure Surface' },
    { id: 'documentary-case-dossier-wrapper', title: 'Case Dossier: Emission Origin' },
    { id: 'section-01-what-are-they', title: 'Chemical Composition' },
    { id: 'section-02-how-small', title: 'Aerodynamic Scale Comparison' },
    { id: 'section-where-it-comes-from', title: 'Emission Origins & Basin Dynamics' },
    { id: 'section-what-it-does', title: 'Atmospheric Transport Mechanics' },
    { id: 'section-07-why-it-matters', title: 'Health Vulnerability & Campus Safety' },
    { id: 'section-08-the-takeaway', title: '14 Days of Empirical Evidence' },
    { id: 'wmd-footer', title: 'Closing & Environmental Intelligence' },
  ], []);

  const [tourState, setTourState] = React.useState({
    active: false,
    paused: false,
    stepIndex: 0,
  });

  const tourTimerRef = useRef(null);

  const stopTour = useCallback(() => {
    if (tourTimerRef.current) {
      clearTimeout(tourTimerRef.current);
      tourTimerRef.current = null;
    }
    setTourState({ active: false, paused: false, stepIndex: 0 });
  }, []);

  const goToTourStep = useCallback((index) => {
    if (index >= TOUR_STEPS.length) {
      stopTour();
      return;
    }

    const step = TOUR_STEPS[index];
    const target = document.getElementById(step.id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    setTourState((prev) => ({
      ...prev,
      active: true,
      paused: false,
      stepIndex: index,
    }));

    if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
    // Relaxed tempo: 5.5s dwell time per section for comfortable reading and animations
    tourTimerRef.current = setTimeout(() => {
      goToTourStep(index + 1);
    }, 5500);
  }, [TOUR_STEPS, stopTour]);

  const handleWatchClick = useCallback(() => {
    if (tourState.active && !tourState.paused) {
      // Pause
      if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
      setTourState((prev) => ({ ...prev, paused: true }));
    } else if (tourState.active && tourState.paused) {
      // Resume
      goToTourStep(tourState.stepIndex);
    } else {
      // Start tour from first section below hero
      goToTourStep(0);
    }
  }, [tourState, goToTourStep]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
    };
  }, []);

  const handleTranscriptClick = useCallback(() => {
    const section1 = document.getElementById('section-01-what-are-they') || document.querySelector('.documentary-section');
    if (section1) {
      section1.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      const impact = document.getElementById('wmd-impact-row');
      if (impact) impact.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <section id="documentary-hero-viewport" className="wmd-hero documentary-hero" ref={heroRef}>
      {/* Layer 1: Ambient Backdrop Wrapper */}
      <div className="documentary-hero-ambient-backdrop">
        {/* Layer 2: Sepia Skyline Photo Layer */}
        <div
          className="documentary-hero-photo-layer wmd-photo wmd-hero__photo"
          style={{
            backgroundImage: 'url(/assets/documentary/delhi_photochemical_smog.webp)',
          }}
          aria-hidden="true"
        />

        {/* Layer 3: Organic Foliage Framing Masks */}
        <div className="wmd-hero__foliage-frame" aria-hidden="true" />

        {/* Layer 4: Warm Atmospheric Haze Gradient */}
        <div className="documentary-hero-haze-layer wmd-hero__haze" aria-hidden="true" />

        {/* Layer 5: Atmospheric Particle Flow Canvas */}
        <div className="wmd-hero__particles" aria-hidden="true">
          <HeroAtmosphericCanvas
            pollutantId={pollutantData.id}
            windSpeed={weatherVariables?.windSpeed}
            mouseStateRef={mouseStateRef}
          />
        </div>

        {/* Layer 6: Vignette & Text Scrim Gradient */}
        <div className="wmd-hero__vignette" aria-hidden="true" />
      </div>

      {/* Editorial Content Flow */}
      <div className="wmd-hero__container">
        {/* Left Column: Title, Kicker, Tagline, Editorial Body, and Actions */}
        <div className="documentary-hero-editorial-col wmd-hero__editorial">
          {/* Kicker Tag */}
          <div className="documentary-pollutant-kicker-tag wmd-hero__kicker">
            DOCUMENTARY {chapterNumber} / {totalCount}
          </div>

          {/* Main Title Row - plain text so GSAP splitText works */}
          <div className="documentary-pollutant-title-row wmd-hero__title-row">
            <h1 className="documentary-pollutant-name wmd-hero__title">
              {pollutantData.symbol}
            </h1>
          </div>

          {/* Tagline */}
          <h2 className="documentary-hero-headline wmd-hero__headline">
            {headline}
          </h2>

          {/* Editorial Paragraph */}
          <p className="documentary-editorial-desc wmd-hero__desc">
            {description}
          </p>

          {/* CTA Row: Watch Documentary */}
          <div className="wmd-hero__cta-row">
            <button
              type="button"
              className={`wmd-hero__watch-pill ${tourState.active ? 'wmd-hero__watch-pill--active' : ''}`}
              onClick={handleWatchClick}
              aria-label={
                tourState.active && !tourState.paused
                  ? 'Pause Documentary Tour'
                  : tourState.active && tourState.paused
                  ? 'Resume Documentary Tour'
                  : 'Watch Documentary / Explore Story'
              }
            >
              <span className="wmd-hero__play-disc">
                {tourState.active && !tourState.paused ? (
                  <Pause size={18} className="wmd-hero__play-icon" />
                ) : (
                  <Play size={20} className="wmd-hero__play-icon" />
                )}
              </span>
              <span className="wmd-hero__watch-label">
                {tourState.active && !tourState.paused
                  ? `PAUSE TOUR (${tourState.stepIndex + 1}/${TOUR_STEPS.length})`
                  : tourState.active && tourState.paused
                  ? 'RESUME TOUR'
                  : 'WATCH DOCUMENTARY'}
              </span>
            </button>
          </div>

          {/* Transcript Trigger Row */}
          <div className="wmd-hero__transcript-row">
            <button
              type="button"
              className="wmd-hero__transcript-btn"
              onClick={handleTranscriptClick}
              aria-label="View Full Documentary Transcript and Science"
            >
              <span className="wmd-hero__transcript-icon-box">
                <ScrollText size={18} strokeWidth={1.25} />
              </span>
              <span className="wmd-hero__transcript-label">VIEW TRANSCRIPT</span>
            </button>
          </div>
        </div>

        {/* Right Column: Haiku Rule & Circular Inset Portal */}
        <div className="documentary-hero-spatial-col wmd-hero__spatial">
          <div className="wmd-hero__quote-wrapper">
            <div className="wmd-hero__vertical-rule" />
            <div className="wmd-hero__quote-text">
              INVISIBLE<br />
              PARTICLES.<br />
              REAL<br />
              CONSEQUENCES.
            </div>
          </div>

          {/* Circular Foliage Inset cropped at viewport border */}
          <div className="wmd-hero__circle-portal-container" aria-hidden="true">
            <div className="wmd-hero__circle-outer-ring" />
            <div
              className="wmd-hero__circle-portal wmd-photo"
              style={{
                backgroundImage: 'url(/assets/documentary/wmd/wmd_foliage_circle.webp)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Floating Relaxed Tour Controller (appears when tour is active) */}
      {tourState.active && (
        <aside
          className="wmd-tour-hud"
          aria-label="Documentary Auto-Tour Control"
          style={{
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            zIndex: 900,
            background: 'rgba(14, 16, 12, 0.96)',
            border: '1px solid var(--pollutant-btn-border, rgba(216, 207, 185, 0.35))',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.65)',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span
              style={{
                fontFamily: 'var(--doc-font-mono, monospace)',
                fontSize: '0.65rem',
                color: 'var(--pollutant-color, var(--sage-400))',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              TOUR STEP {String(tourState.stepIndex + 1).padStart(2, '0')} / {String(TOUR_STEPS.length).padStart(2, '0')}
            </span>
            <span
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '0.85rem',
                color: 'var(--bone-100)',
                fontWeight: 600,
              }}
            >
              {TOUR_STEPS[tourState.stepIndex]?.title || 'Documentary Story'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleWatchClick}
              title={tourState.paused ? 'Resume Tour' : 'Pause Tour'}
              aria-label={tourState.paused ? 'Resume Tour' : 'Pause Tour'}
              style={{
                background: 'var(--pollutant-btn-hover-bg, rgba(216, 207, 185, 0.15))',
                border: '1px solid var(--pollutant-btn-border, rgba(216, 207, 185, 0.3))',
                color: 'var(--bone-100)',
                padding: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {tourState.paused ? <Play size={15} /> : <Pause size={15} />}
            </button>
            <button
              type="button"
              onClick={() => goToTourStep(tourState.stepIndex + 1)}
              title="Next Section"
              aria-label="Next Section"
              style={{
                background: 'var(--pollutant-btn-hover-bg, rgba(216, 207, 185, 0.15))',
                border: '1px solid var(--pollutant-btn-border, rgba(216, 207, 185, 0.3))',
                color: 'var(--bone-100)',
                padding: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SkipForward size={15} />
            </button>
            <button
              type="button"
              onClick={stopTour}
              title="Exit Tour"
              aria-label="Exit Tour"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--sage-400)',
                padding: '4px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </aside>
      )}
    </section>
  );
}
