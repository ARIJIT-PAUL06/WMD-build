import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Activity, ExternalLink } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { POLLUTANT_DOCUMENTARY_LIST } from '../../data/pollutantDocumentaries';
import './AboutPage.css';

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const POLLUTANT_ART_MAP = {
  pm25: '/assets/documentary/vehicles/indian_pm25_truck.webp',
  pm10: '/assets/documentary/vehicles/indian_pm10_tipper.webp',
  no2: '/assets/documentary/vehicles/indian_no2_traffic.webp',
  so2: '/assets/documentary/vehicles/indian_so2_industrial.webp',
  co: '/assets/documentary/vehicles/indian_co_underpass.webp',
  o3: '/assets/documentary/vehicles/indian_o3_sky.webp',
  nh3: '/assets/documentary/vehicles/indian_nh3_tractor.webp',
};

const POLLUTANT_EDITORIAL_DESCRIPTIONS = {
  pm25: 'Microscopic combustion aerosols penetrating deep alveolar tissue.',
  pm10: 'Inhalable coarse dust from roads and mechanical friction.',
  no2: 'Toxic combustion gas from high-temperature vehicular exhaust.',
  so2: 'Acrid industrial emissions from thermal power and refining.',
  co: 'Colorless, odorless byproduct of incomplete fuel combustion.',
  o3: 'Secondary photochemical oxidant formed under intense sunlight.',
  nh3: 'Volatile agricultural and livestock gas fueling aerosol synthesis.',
};

const VERIFIED_STATS = [
  {
    id: 'india-76',
    tabLabel: 'India · 76%',
    pre: 'Around',
    stat: '76%',
    target: 'Indians',
    fact: 'do not meet national air quality standards. No Indian state achieves pollution levels at or below the WHO limits.',
    source: 'CSE Report, 2019',
    fullCitation: 'Centre for Science and Environment (CSE) State of India\'s Environment Report 2019 · Lancet Planetary Health (2020)',
    sourceUrl: 'https://www.cseindia.org/state-of-india-s-environment-2019-in-figures-9464',
    benchmark: 'CPCB NAAQS Annual Limit: 40 µg/m³ · WHO Guideline: 5 µg/m³',
  },
  {
    id: 'who-99',
    tabLabel: 'Global · 99%',
    pre: 'Over',
    stat: '99%',
    target: 'Humanity',
    fact: 'breathes air exceeding World Health Organization ambient guideline limits for particulate matter and nitrogen dioxide.',
    source: 'WHO Ambient Air Quality Database, 2024',
    fullCitation: 'World Health Organization (WHO) Global Air Quality Database & Ambient Standards 2024',
    sourceUrl: 'https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health',
    benchmark: 'Global population exposed to annual PM2.5 > 5 µg/m³',
  },
  {
    id: 'lancet-deaths',
    tabLabel: 'Health · 2.1M',
    pre: 'Over',
    stat: '2.1M',
    target: 'Lives Lost',
    fact: 'annually in India attributable to ambient fine particulate matter and household air pollution.',
    source: 'Lancet Planetary Health & GBD, 2024',
    fullCitation: 'The Lancet Planetary Health Commission on Pollution and Health · Global Burden of Disease',
    sourceUrl: 'https://www.thelancet.com/journals/lanplh/article/PIIS2542-5196(20)30298-9/fulltext',
    benchmark: 'Mortality risk from ischemic heart disease, stroke, COPD, and lower respiratory infections',
  },
];

export default function AboutPage({ onBack, onSelectPollutant, onOpenDashboard }) {
  const containerRef = useRef(null);
  const heroMediaRef = useRef(null);
  const smokeMediaRef = useRef(null);
  const closingMediaRef = useRef(null);

  const [activePollutantIdx, setActivePollutantIdx] = useState(0);
  const [activeStatIndex, setActiveStatIndex] = useState(0);
  const currentStat = VERIFIED_STATS[activeStatIndex];

  // Enforce scroll reset when mounting
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
  }, []);

  // Safe navigation back to previous route or default dashboard fallback
  const handleGoBack = useCallback(() => {
    if (typeof window !== 'undefined') {
      const hasHistory = window.history.length > 1;
      if (hasHistory) {
        window.history.back();
        setTimeout(() => {
          const currentUrl = new URL(window.location);
          if (
            currentUrl.searchParams.get('page') === 'about' ||
            currentUrl.searchParams.get('view') === 'about' ||
            currentUrl.hash === '#about'
          ) {
            if (onBack) {
              onBack();
            } else {
              currentUrl.searchParams.delete('page');
              currentUrl.searchParams.delete('view');
              currentUrl.hash = '';
              window.history.pushState({}, '', currentUrl);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
          }
        }, 120);
        return;
      }
    }

    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      url.searchParams.delete('page');
      url.searchParams.delete('view');
      url.hash = '';
      window.history.pushState({}, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [onBack]);

  const handleGoToDashboard = useCallback(() => {
    if (onOpenDashboard) {
      onOpenDashboard();
    } else if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      url.searchParams.delete('page');
      url.searchParams.delete('view');
      url.hash = '#heatmap';
      window.history.pushState({}, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
      if (onBack) onBack();
    }
  }, [onOpenDashboard, onBack]);

  const handlePollutantClick = useCallback((pollutantId) => {
    if (onSelectPollutant) {
      onSelectPollutant(pollutantId);
    } else if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      url.searchParams.delete('page');
      url.searchParams.delete('view');
      url.searchParams.set('documentary', pollutantId);
      window.history.pushState({}, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [onSelectPollutant]);

  // GSAP ScrollTrigger orchestration scoped to container with React lifecycle cleanup
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof window === 'undefined') return;

    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      // SCENE 1: CINEMATIC HERO ENTRANCE
      gsap.fromTo(
        '.about-hero-word',
        { opacity: 0, y: 65, rotateX: 25 },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 1.3,
          stagger: 0.12,
          ease: 'power3.out',
          delay: 0.1,
        }
      );

      gsap.fromTo(
        '.about-hero-subline',
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 1.0, ease: 'power2.out', delay: 0.45 }
      );

      gsap.fromTo(
        '.about-scroll-indicator',
        { opacity: 0 },
        { opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.7 }
      );

      // Hero image cinematic mask reveal & parallax
      if (heroMediaRef.current) {
        gsap.fromTo(
          heroMediaRef.current,
          { scale: 1.15, clipPath: 'inset(6% 3% 6% 3% round 16px)' },
          {
            scale: 1.0,
            clipPath: 'inset(0% 0% 0% 0% round 0px)',
            ease: 'none',
            scrollTrigger: {
              trigger: '.about-hero-section',
              start: 'top top',
              end: 'bottom top',
              scrub: true,
            },
          }
        );
      }

      // SCENE 2: THE SCALE OF THE PROBLEM (INFOGRAPHIC)
      if (smokeMediaRef.current) {
        gsap.fromTo(
          smokeMediaRef.current,
          { scale: 1.14, yPercent: -4 },
          {
            scale: 1.0,
            yPercent: 7,
            ease: 'none',
            scrollTrigger: {
              trigger: '.about-scale-section',
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          }
        );
      }

      gsap.fromTo(
        '.about-infographic-header',
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 1.0,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.about-scale-section',
            start: 'top 75%',
            toggleActions: 'play none none none',
          },
        }
      );

      gsap.fromTo(
        '.about-infographic-stat-number',
        { opacity: 0, scale: 0.92 },
        {
          opacity: 1,
          scale: 1,
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.about-scale-section',
            start: 'top 70%',
            toggleActions: 'play none none none',
          },
        }
      );

      // SCENE 3: WHAT WE BREATHE - SYNCHRONIZED POLLUTANT POSTERS
      const pollutantPosters = el.querySelectorAll('.about-pollutant-poster');
      pollutantPosters.forEach((poster, i) => {
        gsap.fromTo(
          poster,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            delay: (i % 3) * 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: poster,
              start: 'top 88%',
              toggleActions: 'play none none none',
            },
          }
        );

        // Update WebGL atmospheric state as each pollutant enters viewport
        ScrollTrigger.create({
          trigger: poster,
          start: 'top center',
          end: 'bottom center',
          onEnter: () => setActivePollutantIdx(i),
          onEnterBack: () => setActivePollutantIdx(i),
        });
      });

      // ATMOSPHERIC SEQUENCE TRANSITIONS (THE INVISIBLE THREAT)
      const threatFrames = el.querySelectorAll('.about-threat-frame');
      threatFrames.forEach((frame) => {
        const text = frame.querySelector('.about-threat-headline');
        if (text) {
          gsap.fromTo(
            text,
            { opacity: 0, y: 42 },
            {
              opacity: 1,
              y: 0,
              duration: 1.1,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: frame,
                start: 'top 78%',
                toggleActions: 'play none none none',
              },
            }
          );
        }
      });

      // SCENE 4: WHY VAYUVITALS - THREE VISUAL COMPOSITIONS
      const whyComps = el.querySelectorAll('.about-why-composition');
      whyComps.forEach((comp, i) => {
        gsap.fromTo(
          comp,
          { opacity: 0, y: 38 },
          {
            opacity: 1,
            y: 0,
            duration: 0.95,
            delay: i * 0.14,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: comp,
              start: 'top 82%',
              toggleActions: 'play none none none',
            },
          }
        );
      });

      // SCENE 5: CLOSING FRAME TRANSITION
      if (closingMediaRef.current) {
        gsap.fromTo(
          closingMediaRef.current,
          { scale: 1.1 },
          {
            scale: 1.0,
            ease: 'none',
            scrollTrigger: {
              trigger: '.about-closing-section',
              start: 'top bottom',
              end: 'bottom bottom',
              scrub: true,
            },
          }
        );
      }
    }, el);

    return () => ctx.revert();
  }, [activeStatIndex]);

  return (
    <div className="about-page" ref={containerRef} id="about-page-root">
      {/* 1. Ambient Background Base */}
      <div className="about-ambient-background" aria-hidden="true" />

      {/* TOP-LEFT CIRCULAR BACK BUTTON */}
      <div className="about-back-button-root">
        <button
          type="button"
          className="about-back-button"
          onClick={handleGoBack}
          aria-label="Go back"
          id="about-back-btn"
        >
          <ArrowLeft className="about-back-icon" aria-hidden="true" />
        </button>
        <span className="about-back-tooltip" role="tooltip">Return to Dashboard</span>
      </div>

      {/* MINIMAL TOP ACTION BUTTONS */}
      <header className="about-top-bar" aria-label="Page Navigation">
        <button
          type="button"
          className="about-nav-pill-btn"
          onClick={() => {
            if (typeof window !== 'undefined') {
              const url = new URL(window.location);
              url.searchParams.set('page', 'stats');
              window.history.pushState({}, '', url);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
          }}
          aria-label="View ML Stats"
        >
          <span>Stats</span>
        </button>
        <button
          type="button"
          className="about-nav-pill-btn"
          onClick={handleGoToDashboard}
          aria-label="Open Live Air Dashboard"
        >
          <Activity size={13} aria-hidden="true" />
          <span>Live Air</span>
        </button>
      </header>

      <main className="about-content-wrapper">
        {/* ================================================================= */}
        {/* SCENE 1 — CINEMATIC HERO                                          */}
        {/* ================================================================= */}
        <section className="about-hero-section" id="hero" aria-label="Cinematic Hero">
          <div className="about-hero-media-wrap" aria-hidden="true">
            <img
              ref={heroMediaRef}
              src="/assets/documentary/delhi_photochemical_smog.webp"
              alt="Atmospheric haze consuming city skyline"
              className="about-hero-media"
            />
            <div className="about-hero-gradient-overlay" />
          </div>

          <div className="about-hero-content">
            <div className="about-hero-badge-wrap">
              <span className="about-poster-index">SCENE 01</span>
              <span className="about-poster-category">THE AIR WE SHARE</span>
            </div>

            <h1 className="about-hero-headline">
              <span className="about-hero-title-line">
                <span className="about-hero-word">THE</span>{' '}
                <span className="about-hero-word">AIR</span>
              </span>
              <span className="about-hero-title-line">
                <span className="about-hero-word">WE</span>{' '}
                <span className="about-hero-word">BREATHE.</span>
              </span>
            </h1>

            <p className="about-hero-subline">Every breath tells a story.</p>

            <div className="about-scroll-indicator" aria-hidden="true">
              <span className="about-scroll-line" />
              <span>Scroll</span>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SCENE 2 — THE SCALE OF THE PROBLEM (REFERENCE INFOGRAPHIC POSTER) */}
        {/* ================================================================= */}
        <section className="about-scale-section" id="scale" aria-label="The Scale of the Problem">
          {/* Billowing Smoke Photographic Canvas */}
          <div className="about-scale-media-wrap" aria-hidden="true">
            <img
              ref={smokeMediaRef}
              src="/assets/about/billowing_smoke_infographic.jpg"
              alt="Dramatic billowing dark smoke plume curling into the atmosphere"
              className="about-scale-media"
            />
            <div className="about-scale-overlay" />
          </div>

          <div className="about-scale-poster-content">
            {/* Top Right "DID YOU KNOW?" Header (Matching Reference Infographic) */}
            <div className="about-infographic-header">
              <div className="about-infographic-index-tag">
                <span className="about-poster-index">SCENE 02</span>
                <span className="about-poster-category">THE SCALE OF THE PROBLEM</span>
              </div>
              <h2 className="about-did-you-know">DID YOU KNOW?</h2>
            </div>

            <div className="about-scale-editorial-layout">
              {/* Left Column: Visual breathing stage for the central smoke cloud */}
              <div className="about-scale-cloud-stage" aria-hidden="true">
                <div className="about-scale-cloud-tag">
                  <span className="about-cloud-tag-dot" />
                  <span className="about-cloud-tag-text">Ambient Particulate Column · BAM-1020 Monitoring</span>
                </div>
              </div>

              {/* Right Column: Asymmetric text canvas flowing in the cloud's negative space */}
              <div className="about-scale-text-canvas">
                {/* Interactive Stat Selector for Deep Fact Verification */}
                <div className="about-stat-tabs" role="tablist" aria-label="Verified statistics switcher">
                  {VERIFIED_STATS.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={activeStatIndex === idx}
                      className={`about-stat-tab-pill ${activeStatIndex === idx ? 'active' : ''}`}
                      onClick={() => setActiveStatIndex(idx)}
                    >
                      {item.tabLabel}
                    </button>
                  ))}
                </div>

                {/* Enormous White Typography Hero Block */}
                <div className="about-infographic-body">
                  <span className="about-infographic-prefix">{currentStat.pre}</span>

                  {/* Massive 76% Statistic Focal Point (Crisp Brilliant White) */}
                  <div className="about-infographic-stat-number" aria-label={`${currentStat.stat} ${currentStat.target}`}>
                    {currentStat.stat}
                  </div>

                  {/* Enormous "Indians" Target Label (Crisp Brilliant White) */}
                  <div className="about-infographic-target-label">
                    {currentStat.target}
                  </div>

                  {/* Environmental Fact Flowing Naturally in Negative Space */}
                  <p className="about-infographic-fact">
                    {currentStat.fact}
                  </p>

                  {/* Compact, Verifiable Source Attribution Box */}
                  <div className="about-infographic-source-box">
                    <div className="about-source-meta">
                      <span className="about-source-label">{`Source: ${currentStat.source}`}</span>
                      <span className="about-source-divider">·</span>
                      <span className="about-source-benchmark">{currentStat.benchmark}</span>
                    </div>
                    <a
                      href={currentStat.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="about-source-link"
                      aria-label={`Open verified source: ${currentStat.fullCitation}`}
                    >
                      <span>Verify Study</span>
                      <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* ATMOSPHERIC INTERLUDE — THE INVISIBLE THREAT                      */}
        {/* ================================================================= */}
        <section className="about-threat-section" id="threat" aria-label="The Invisible Threat Sequence">
          <div className="about-threat-sequence">
            {/* Frame 01 */}
            <div className="about-threat-frame">
              <div className="about-threat-media-wrap" aria-hidden="true">
                <img
                  src="/assets/documentary/delhi_dawn_hero.webp"
                  alt="Smog shrouded dawn"
                  className="about-threat-media"
                  loading="lazy"
                />
                <div className="about-threat-gradient" />
              </div>
              <div className="about-threat-content">
                <div className="about-threat-meta">
                  <span className="about-poster-index">TRANSITION · I</span>
                  <span className="about-poster-category">AERODYNAMIC PROFILE</span>
                </div>
                <h2 className="about-threat-headline">
                  INVISIBLE DOESN'T MEAN HARMLESS.
                </h2>
                <p className="about-threat-micro">
                  Particles smaller than 2.5 microns penetrate lung tissue without triggering natural defenses.
                </p>
              </div>
            </div>

            {/* Frame 02 */}
            <div className="about-threat-frame">
              <div className="about-threat-media-wrap" aria-hidden="true">
                <img
                  src="/assets/about/industrial_smoke_plant.jpg"
                  alt="Industrial smoke plant releasing emissions"
                  className="about-threat-media"
                  loading="lazy"
                />
                <div className="about-threat-gradient" />
              </div>
              <div className="about-threat-content">
                <div className="about-threat-meta">
                  <span className="about-poster-index">TRANSITION · II</span>
                  <span className="about-poster-category">ATMOSPHERIC DYNAMICS</span>
                </div>
                <h2 className="about-threat-headline">
                  THE AIR CHANGES. EVERY DAY.
                </h2>
                <p className="about-threat-micro">
                  Nocturnal thermal inversions compress ground air columns, shifting toxicity hour by hour.
                </p>
              </div>
            </div>

            {/* Frame 03 */}
            <div className="about-threat-frame">
              <div className="about-threat-media-wrap" aria-hidden="true">
                <img
                  src="/assets/documentary/delhi_night_corridor.webp"
                  alt="Night telemetry corridor with lights through haze"
                  className="about-threat-media"
                  loading="lazy"
                />
                <div className="about-threat-gradient" />
              </div>
              <div className="about-threat-content">
                <div className="about-threat-meta">
                  <span className="about-poster-index">TRANSITION · III</span>
                  <span className="about-poster-category">SCIENTIFIC OBSERVATION</span>
                </div>
                <h2 className="about-threat-headline">
                  WHAT YOU CAN MEASURE, YOU CAN UNDERSTAND.
                </h2>
                <p className="about-threat-micro">
                  Continuous radiometric sensor telemetry turns invisible pollution into verified reality.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SCENE 3 — WHAT WE BREATHE (SEVEN CHEMICAL EDITORIAL SCENES)       */}
        {/* ================================================================= */}
        <section className="about-pollutants-section" id="pollutants" aria-label="What We Breathe - Seven Pollutants">
          <div className="about-section-header">
            <div className="about-header-meta">
              <span className="about-poster-index">SCENE 03</span>
              <span className="about-poster-category">CHEMICAL CONSTITUENTS</span>
            </div>
            <h2 className="about-section-headline">WHAT WE BREATHE.</h2>
            <p className="about-section-subline">
              Seven distinct airborne compounds shaping ambient toxicity.
            </p>
          </div>

          <div className="about-pollutants-poster-grid">
            {POLLUTANT_DOCUMENTARY_LIST.map((pollutant, idx) => {
              const artImage = POLLUTANT_ART_MAP[pollutant.id] || '/assets/documentary/delhi_photochemical_smog.webp';
              const accentColor = pollutant.visualMetadata?.accentColor || '#38bdf8';
              const accentGlow = pollutant.visualMetadata?.accentGlow || 'rgba(56, 189, 248, 0.3)';
              const description = POLLUTANT_EDITORIAL_DESCRIPTIONS[pollutant.id] || pollutant.shortDescription;

              return (
                <button
                  key={pollutant.id}
                  id={`pollutant-card-${pollutant.id}`}
                  type="button"
                  className={`about-pollutant-poster ${activePollutantIdx === idx ? 'is-active-pollutant' : ''}`}
                  onClick={() => handlePollutantClick(pollutant.id)}
                  style={{
                    '--pollutant-accent': accentColor,
                    '--pollutant-glow': accentGlow,
                  }}
                  aria-label={`Open interactive documentary for ${pollutant.name} (${pollutant.symbol})`}
                >
                  <div className="about-poster-media-wrap" aria-hidden="true">
                    <img
                      src={artImage}
                      alt={`${pollutant.name} atmospheric context`}
                      className="about-poster-bg-img"
                      loading="lazy"
                    />
                    <div className="about-poster-vignette" />
                  </div>

                  <div className="about-poster-top">
                    <span className="about-poster-tag">{`NAAQS · ${pollutant.naaqsLimit} ${pollutant.unit}`}</span>
                    <span className="about-poster-arrow-wrap">
                      <ArrowRight size={15} className="about-poster-arrow" aria-hidden="true" />
                    </span>
                  </div>

                  <div className="about-poster-bottom">
                    {/* Enormous Chemical Symbol */}
                    <div className="about-pollutant-huge-symbol">
                      {pollutant.symbol}
                    </div>
                    <h3 className="about-pollutant-editorial-name">{pollutant.name}</h3>
                    <p className="about-pollutant-short-phrase">{description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ================================================================= */}
        {/* SCENE 4 — WHY VAYUVITALS (THREE VISUAL COMPOSITIONS)               */}
        {/* ================================================================= */}
        <section className="about-why-section" id="why" aria-label="Why VayuVitals Compositions">
          <div className="about-section-header">
            <div className="about-header-meta">
              <span className="about-poster-index">SCENE 04</span>
              <span className="about-poster-category">PLATFORM ARCHITECTURE</span>
            </div>
            <h2 className="about-section-headline">WHY VAYUVITALS.</h2>
          </div>

          <div className="about-why-compositions-container">
            {/* Composition 01: MONITOR */}
            <div className="about-why-composition" id="why-monitor">
              <div className="about-why-visual-display">
                <div className="about-map-mesh-visual" aria-hidden="true">
                  <div className="about-map-radar-ring ring-1" />
                  <div className="about-map-radar-ring ring-2" />
                  <div className="about-map-radar-ring ring-3" />
                  <div className="about-map-sweep" />
                  <div className="about-map-station-pin pin-1">
                    <span className="station-pulse" />
                    <span className="station-label">Anand Vihar · 312</span>
                  </div>
                  <div className="about-map-station-pin pin-2">
                    <span className="station-pulse" />
                    <span className="station-label">ITO · 245</span>
                  </div>
                  <div className="about-map-station-pin pin-3">
                    <span className="station-pulse" />
                    <span className="station-label">RK Puram · 189</span>
                  </div>
                  <div className="about-map-hud-meta">
                    <span>28.6139° N, 77.2090° E</span>
                    <span>CAAQMS BAM-1020 · IDW Mesh</span>
                  </div>
                </div>
              </div>
              <div className="about-why-text-block">
                <span className="about-why-step-num">01</span>
                <h3 className="about-why-title">MONITOR.</h3>
                <p className="about-why-sentence">
                  Continuous spatial tracking across India's ambient monitoring network.
                </p>
              </div>
            </div>

            {/* Composition 02: UNDERSTAND */}
            <div className="about-why-composition" id="why-understand">
              <div className="about-why-visual-display">
                <div className="about-spectral-visual" aria-hidden="true">
                  <div className="about-spectral-bar-item">
                    <span className="spec-label">PM2.5</span>
                    <div className="spec-track"><div className="spec-fill fill-pm25" style={{ width: '82%' }} /></div>
                    <span className="spec-val">82 µg/m³</span>
                  </div>
                  <div className="about-spectral-bar-item">
                    <span className="spec-label">PM10</span>
                    <div className="spec-track"><div className="spec-fill fill-pm10" style={{ width: '68%' }} /></div>
                    <span className="spec-val">136 µg/m³</span>
                  </div>
                  <div className="about-spectral-bar-item">
                    <span className="spec-label">NO₂</span>
                    <div className="spec-track"><div className="spec-fill fill-no2" style={{ width: '54%' }} /></div>
                    <span className="spec-val">43 µg/m³</span>
                  </div>
                  <div className="about-spectral-bar-item">
                    <span className="spec-label">O₃</span>
                    <div className="spec-track"><div className="spec-fill fill-o3" style={{ width: '42%' }} /></div>
                    <span className="spec-val">78 µg/m³</span>
                  </div>
                  <div className="about-spectral-meta">
                    <span>SEVEN CHEMICAL FRACTIONS</span>
                    <span>AERODYNAMIC DECONSTRUCTION</span>
                  </div>
                </div>
              </div>
              <div className="about-why-text-block">
                <span className="about-why-step-num">02</span>
                <h3 className="about-why-title">UNDERSTAND.</h3>
                <p className="about-why-sentence">
                  Deconstructing airborne toxicity into seven distinct aerodynamic and chemical components.
                </p>
              </div>
            </div>

            {/* Composition 03: MAKE INFORMED DECISIONS */}
            <div className="about-why-composition" id="why-decide">
              <div className="about-why-visual-display">
                <div className="about-trend-graph-visual" aria-hidden="true">
                  <svg className="about-trend-svg" viewBox="0 0 400 160" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
                        <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="95" x2="400" y2="95" stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                    <path
                      d="M 0 50 Q 70 20, 140 70 T 260 120 T 340 40 T 400 80 L 400 160 L 0 160 Z"
                      fill="url(#trendGradient)"
                    />
                    <path
                      d="M 0 50 Q 70 20, 140 70 T 260 120 T 340 40 T 400 80"
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="2.5"
                    />
                  </svg>
                  <div className="about-trend-meta">
                    <span>24-HR DIURNAL INVERSION MODEL</span>
                    <span>EXPOSURE FORESIGHT</span>
                  </div>
                </div>
              </div>
              <div className="about-why-text-block">
                <span className="about-why-step-num">03</span>
                <h3 className="about-why-title">MAKE INFORMED DECISIONS.</h3>
                <p className="about-why-sentence">
                  Translating continuous sensor telemetry into actionable foresight for public health.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SCENE 5 — CLOSING                                                 */}
        {/* ================================================================= */}
        <section className="about-closing-section" id="closing" aria-label="Closing Call to Action">
          <div className="about-closing-media-wrap" aria-hidden="true">
            <img
              ref={closingMediaRef}
              src="/assets/documentary/wmd/footer-forest-mountains.webp"
              alt="Mountain horizon under clear atmospheric dawn"
              className="about-closing-media"
            />
            <div className="about-closing-overlay" />
          </div>

          <div className="about-closing-content">
            <div className="about-closing-meta">
              <span className="about-poster-index">SCENE 05</span>
              <span className="about-poster-category">THE HORIZON</span>
            </div>

            <h2 className="about-closing-headline">
              <span>THE FIRST STEP</span>
              <span>IS AWARENESS.</span>
            </h2>

            <p className="about-closing-subline">Explore the air around you.</p>

            <button
              type="button"
              className="about-closing-cta-btn"
              onClick={handleGoToDashboard}
              id="about-explore-live-btn"
              aria-label="Explore Live Air Dashboard"
            >
              <span>EXPLORE LIVE AIR</span>
              <ArrowRight className="about-closing-cta-arrow" aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
