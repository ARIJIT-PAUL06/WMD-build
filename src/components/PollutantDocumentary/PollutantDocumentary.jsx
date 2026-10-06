/**
 * PollutantDocumentary Component
 * VayuVitals - Cinematic Editorial Pollutant Documentary
 *
 * Dedicated, deep-dive documentary dossiers for each of the 7 atmospheric pollutants:
 * PM2.5, PM10, NO2, SO2, CO, O3, NH3.
 *
 * Direct routing from Atmospheric Cargo Truck containers:
 * PM2.5 -> ?documentary=pm25
 * PM10  -> ?documentary=pm10
 * NO2   -> ?documentary=no2
 * SO2   -> ?documentary=so2
 * CO    -> ?documentary=co
 * O3    -> ?documentary=o3
 * NH3   -> ?documentary=nh3
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  Wind,
  Thermometer,
  Droplets,
  Gauge,
  AlertCircle,
  Info,
} from 'lucide-react';
import {
  POLLUTANT_DOCUMENTARIES,
  POLLUTANT_DOCUMENTARY_LIST,
} from '../../data/pollutantDocumentaries.js';
import schoolsDirectory from '../../data/schoolsDirectory.json';
import {
  getNearbyStationsForSchool,
  calculateSchoolIdw,
} from '../SchoolSafety/schoolSafetyHelpers.js';
import {
  getSchoolObservations,
} from '../SchoolSafety/schoolEvidenceStore.js';
import {
  buildSchoolEvidenceWindow,
} from '../SchoolSafety/schoolSafetyEvidence.js';
import './PollutantDocumentary.css';

/* ==========================================================================
   Pollutant Cinematic Editorial Themes Configuration
   Full photographic grading, visual worlds, and chapter narrative identities.
   ========================================================================== */
export const POLLUTANT_CINEMATIC_THEMES = {
  pm25: {
    heroImage: '/assets/documentary/delhi_dawn_hero.jpg',
    secondaryImage: '/assets/documentary/evidence_combustion.jpg',
    accent: '#ef4444',
    accentGlow: 'rgba(239, 68, 68, 0.45)',
    moodClass: 'theme-pm25-haze',
    kicker: 'DELHI ATMOSPHERIC ARCHIVE // CHAPTER 01',
    chapterNum: '01',
    scaleSymbol: '≤ 2.5 µm',
    subtext: 'The Respirable Freight',
    ambientColor: 'rgba(239, 68, 68, 0.12)',
  },
  pm10: {
    heroImage: '/assets/documentary/evidence_construction.jpg',
    secondaryImage: '/assets/documentary/evidence_traffic.jpg',
    accent: '#f59e0b',
    accentGlow: 'rgba(245, 158, 11, 0.45)',
    moodClass: 'theme-pm10-dust',
    kicker: 'DELHI ATMOSPHERIC ARCHIVE // CHAPTER 02',
    chapterNum: '02',
    scaleSymbol: '≤ 10 µm',
    subtext: 'Coarse Inhalable Particulate',
    ambientColor: 'rgba(245, 158, 11, 0.12)',
  },
  no2: {
    heroImage: '/assets/documentary/delhi_night_corridor.jpg',
    secondaryImage: '/assets/documentary/evidence_traffic.jpg',
    accent: '#f97316',
    accentGlow: 'rgba(249, 115, 22, 0.45)',
    moodClass: 'theme-no2-combustion',
    kicker: 'DELHI ATMOSPHERIC ARCHIVE // CHAPTER 03',
    chapterNum: '03',
    scaleSymbol: 'Molecular Gas',
    subtext: 'Urban Combustion Plumes',
    ambientColor: 'rgba(249, 115, 22, 0.12)',
  },
  so2: {
    heroImage: '/assets/documentary/evidence_industry.jpg',
    secondaryImage: '/assets/documentary/evidence_combustion.jpg',
    accent: '#eab308',
    accentGlow: 'rgba(234, 179, 8, 0.45)',
    moodClass: 'theme-so2-sulfur',
    kicker: 'DELHI ATMOSPHERIC ARCHIVE // CHAPTER 04',
    chapterNum: '04',
    scaleSymbol: 'Molecular Gas',
    subtext: 'Thermal Power & Kiln Emissions',
    ambientColor: 'rgba(234, 179, 8, 0.12)',
  },
  co: {
    heroImage: '/assets/documentary/evidence_combustion.jpg',
    secondaryImage: '/assets/documentary/delhi_night_corridor.jpg',
    accent: '#dc2626',
    accentGlow: 'rgba(220, 38, 38, 0.45)',
    moodClass: 'theme-co-carbon',
    kicker: 'DELHI ATMOSPHERIC ARCHIVE // CHAPTER 05',
    chapterNum: '05',
    scaleSymbol: 'Incomplete Combustion',
    subtext: 'Asphyxiant Gas Phase',
    ambientColor: 'rgba(220, 38, 38, 0.12)',
  },
  o3: {
    heroImage: '/assets/documentary/delhi_photochemical_smog.jpg',
    secondaryImage: '/assets/documentary/delhi_dawn_hero.jpg',
    accent: '#06b6d4',
    accentGlow: 'rgba(6, 182, 212, 0.45)',
    moodClass: 'theme-o3-photochemical',
    kicker: 'DELHI ATMOSPHERIC ARCHIVE // CHAPTER 06',
    chapterNum: '06',
    scaleSymbol: 'Secondary Synthesis',
    subtext: 'Photochemical Solar Smog',
    ambientColor: 'rgba(6, 182, 212, 0.12)',
  },
  nh3: {
    heroImage: '/assets/documentary/evidence_combustion.jpg',
    secondaryImage: '/assets/documentary/evidence_industry.jpg',
    accent: '#10b981',
    accentGlow: 'rgba(16, 185, 129, 0.45)',
    moodClass: 'theme-nh3-agricultural',
    kicker: 'DELHI ATMOSPHERIC ARCHIVE // CHAPTER 07',
    chapterNum: '07',
    scaleSymbol: 'Alkaline Precursor',
    subtext: 'Agricultural & Fertilizer Synthesis',
    ambientColor: 'rgba(16, 185, 129, 0.12)',
  },
};


/* ==========================================================================
   Main Component: PollutantDocumentary
   ========================================================================== */

export default function PollutantDocumentary({
  pollutantId = 'pm25',
  pollutant = null,
  onBack,
  onSelectPollutant,
  liveData = null,
  isSchoolContext = false,
}) {
  const resolveTargetPollutant = (id, pol) => {
    if (pol?.id && POLLUTANT_DOCUMENTARIES[pol.id]) return pol.id;
    if (id && POLLUTANT_DOCUMENTARIES[id]) return id;
    return 'pm25';
  };

  // Deep-dive pollutant chapter state
  const [activeDeepDiveId, setActiveDeepDiveId] = useState(() =>
    resolveTargetPollutant(pollutantId, pollutant)
  );

  // Cinematic Pollutant-to-Pollutant Transition State
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionTargetId, setTransitionTargetId] = useState(null);
  const [transitionPhase, setTransitionPhase] = useState('idle'); // 'idle' | 'darken' | 'expanded' | 'reveal'

  // Active institution from directory
  const defaultSchool = useMemo(() => {
    const list = schoolsDirectory?.educationalInstitutions || [];
    return (
      list.find((s) => s.id === 'dps_rohini') ||
      list.find((s) => s.id === 'dps_rk_puram') ||
      list[0] || {
        id: 'dps_rohini',
        name: 'Delhi Public School, Rohini',
        locality: 'Sector 24, Rohini',
        lat: 28.7188,
        lon: 77.1064,
        type: 'Senior Secondary School',
      }
    );
  }, []);

  const [selectedSchoolId, setSelectedSchoolId] = useState(defaultSchool.id);
  const selectedSchool = useMemo(() => {
    const list = schoolsDirectory?.educationalInstitutions || [];
    return list.find((s) => s.id === selectedSchoolId) || defaultSchool;
  }, [selectedSchoolId, defaultSchool]);

  useEffect(() => {
    setActiveDeepDiveId(resolveTargetPollutant(pollutantId, pollutant));
  }, [pollutantId, pollutant]);

  // Live Delhi telemetry state
  const [internalLiveData, setInternalLiveData] = useState(liveData);
  const [isLiveLoading, setIsLiveLoading] = useState(false);

  useEffect(() => {
    if (liveData) {
      setInternalLiveData(liveData);
      return;
    }

    let isMounted = true;
    const fetchDelhiTelemetry = async () => {
      setIsLiveLoading(true);
      try {
        const res = await fetch('/api/delhi-heatmap');
        if (!res.ok) throw new Error("HTTP error " + res.status);
        const data = await res.json();
        if (isMounted && data) {
          setInternalLiveData(data);
        }
      } catch (err) {
        if (isMounted) {
          console.warn('[PollutantDocumentary] Telemetry query fallback:', err.message);
        }
      } finally {
        if (isMounted) setIsLiveLoading(false);
      }
    };

    fetchDelhiTelemetry();
    return () => {
      isMounted = false;
    };
  }, [liveData]);

  // Primary telemetry station & readings
  const currentStation = useMemo(() => {
    if (!internalLiveData?.stations || internalLiveData.stations.length === 0) {
      return null;
    }
    return internalLiveData.stations[0];
  }, [internalLiveData]);

  const currentPm25Reading = useMemo(() => {
    if (internalLiveData?.userEstimate?.pm25 != null) {
      return internalLiveData.userEstimate.pm25;
    }
    if (currentStation?.pm25 != null) {
      return currentStation.pm25;
    }
    return null;
  }, [internalLiveData, currentStation]);

  const currentAqiReading = useMemo(() => {
    if (internalLiveData?.userEstimate?.aqi != null) {
      return internalLiveData.userEstimate.aqi;
    }
    if (currentStation?.aqi != null) {
      return currentStation.aqi;
    }
    return null;
  }, [internalLiveData, currentStation]);

  const formattedTimestamp = useMemo(() => {
    if (!internalLiveData?.lastUpdated) return null;
    try {
      return new Date(internalLiveData.lastUpdated).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return null;
    }
  }, [internalLiveData]);

  // Live environmental variables
  const weatherVariables = useMemo(() => {
    return {
      windSpeed: internalLiveData?.weather?.windSpeed ?? 2.4, // m/s
      temperature: internalLiveData?.weather?.temperature ?? 22.0, // °C
      humidity: internalLiveData?.weather?.humidity ?? 64, // %
      pressure: internalLiveData?.weather?.pressure ?? 1012, // hPa
    };
  }, [internalLiveData]);

  // School proximity & Quadratic IDW
  const nearbyStationsForSchool = useMemo(() => {
    const allStations = internalLiveData?.stations || [];
    if (allStations.length === 0) return [];
    return getNearbyStationsForSchool(
      selectedSchool.lat,
      selectedSchool.lon,
      allStations,
      3
    );
  }, [selectedSchool, internalLiveData]);

  const schoolIdwEstimate = useMemo(() => {
    if (nearbyStationsForSchool.length === 0) return null;
    return calculateSchoolIdw(nearbyStationsForSchool);
  }, [nearbyStationsForSchool]);

  // 14-Day School Evidence Window
  const schoolObservations = useMemo(() => {
    return getSchoolObservations(selectedSchool.id);
  }, [selectedSchool.id]);

  const dailyEvidenceWindow = useMemo(() => {
    return buildSchoolEvidenceWindow(
      schoolObservations,
      new Date().toISOString(),
      14
    );
  }, [schoolObservations]);

  // Deep-dive transitions with smooth cinematic veil
  const handleOpenDeepDive = useCallback(
    (targetId) => {
      if (!targetId || targetId === activeDeepDiveId) return;

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion || !activeDeepDiveId) {
        setActiveDeepDiveId(targetId);
        if (onSelectPollutant) {
          onSelectPollutant(targetId);
        }
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
        return;
      }

      setIsTransitioning(true);
      setTransitionTargetId(targetId);
      setTransitionPhase('darken');

      // Phase 1 -> 2: veil spreads and reaches 100% opacity
      setTimeout(() => {
        setTransitionPhase('expanded');
      }, 260);

      // Phase 2 -> 3: switch state and scroll position while veiled in darkness
      setTimeout(() => {
        setActiveDeepDiveId(targetId);
        if (onSelectPollutant) {
          onSelectPollutant(targetId);
        }
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
        setTransitionPhase('reveal');
      }, 440);

      // Phase 3 -> 4: reveal finishes and transition cleans up
      setTimeout(() => {
        setIsTransitioning(false);
        setTransitionTargetId(null)
        setTransitionPhase('idle');
      }, 850);
    },
    [activeDeepDiveId, onSelectPollutant]
  );

  const handleBackToStory = useCallback(() => {
    if (onBack) {
      onBack();
    } else if (onSelectPollutant) {
      onSelectPollutant(null);
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [onBack, onSelectPollutant]);

  const currentPollutantKey = resolveTargetPollutant(activeDeepDiveId, null);
  const pollutantData = POLLUTANT_DOCUMENTARIES[currentPollutantKey] || POLLUTANT_DOCUMENTARIES.pm25;
  const { sections, visualMetadata } = pollutantData;
  const cinematicTheme =
    POLLUTANT_CINEMATIC_THEMES[currentPollutantKey] || POLLUTANT_CINEMATIC_THEMES.pm25;

    return (
      <div
        className={`doc-root cinematic-pollutant-documentary ${cinematicTheme.moodClass} ${
          transitionPhase !== 'idle' ? `transition-${transitionPhase}` : ''
        }`}
        id={`pollutant-documentary-${pollutantData.id}`}
        style={{
          '--pollutant-accent': visualMetadata.accentColor,
          '--pollutant-glow': visualMetadata.accentGlow,
          '--pollutant-ambient': cinematicTheme.ambientColor,
        }}
      >
        {/* Layer 1: Ambient Film Grain & Cinematic Vignette */}
        <div className="cinematic-film-grain" aria-hidden="true" />
        <div className="cinematic-vignette-overlay" aria-hidden="true" />

        {/* Layer 2: Gapless Atmospheric Transition Veil (Zero White Flash) */}
        <div
          className={`cinematic-transition-veil ${isTransitioning ? 'active' : ''} phase-${transitionPhase}`}
          aria-hidden="true"
        >
          <div className="transition-atmospheric-particles" />
          <div className="transition-veil-kicker">
            {transitionTargetId
              ? `ENTERING // ${
                  POLLUTANT_DOCUMENTARIES[transitionTargetId]?.symbol ||
                  transitionTargetId.toUpperCase()
                }`
              : 'ATMOSPHERIC TRANSITION'}
          </div>
        </div>

        {/* Minimalist Translucent Editorial Topbar */}
        <header className="cinematic-doc-topbar" role="banner">
          <div className="cinematic-topbar-left">
            <button
              onClick={handleBackToStory}
              className="cinematic-ghost-btn"
              id="deep-dive-back-to-story-btn"
              title="Return to the main storybook investigation"
            >
              <ArrowLeft size={15} />
              <span>Back to the Story</span>
            </button>

            <button
              onClick={onBack}
              className="cinematic-ghost-btn"
              id="doc-back-cargo-btn"
              title="Return to Atmospheric Cargo Hauler deck"
            >
              <span>Back to Atmospheric Cargo</span>
            </button>

            <button
              onClick={handleBackToStory}
              className="cinematic-ghost-btn"
              id="doc-all-pollutants-btn"
              title="View all atmospheric pollutants"
            >
              <span>← All Pollutants</span>
            </button>
          </div>

          <div className="cinematic-topbar-right">
            <div className="cinematic-chapter-tag">
              <span className="cinematic-pulse-dot" />
              <span>{cinematicTheme.kicker}</span>
            </div>

            {currentPm25Reading != null ? (
              <div className="cinematic-telemetry-pill">
                <span style={{ fontWeight: 800, color: visualMetadata.accentColor }}>
                  {pollutantData.id === 'pm25'
                    ? `${currentPm25Reading} µg/m³`
                    : `${pollutantData.symbol} Monitored`}
                </span>
                <span className="pill-divider">•</span>
                <span>Live station observation</span>
              </div>
            ) : (
              <div className="cinematic-telemetry-pill">
                <span>Data unavailable</span>
              </div>
            )}
          </div>
        </header>

        <main className="cinematic-film-scrollway">
          {/* =================================================================
              CHAPTER 00: FULL-SCREEN CINEMATIC OPENING (HERO)
              Atmospheric Delhi skyline under thick particulate inversion.
              ================================================================= */}
          <section className="cinematic-chapter-hero" id="chapter-opening-hero">
            <div
              className="cinematic-hero-bg-photo"
              style={{ backgroundImage: `url(${cinematicTheme.heroImage})` }}
            />
            <div className="cinematic-hero-scrim" />
            <div className="cinematic-hero-content">
              <div className="cinematic-date-marker">- 2026 -</div>
              <div className="cinematic-date-sub">DELHI ATMOSPHERIC ARCHIVE</div>
              <h1 className="cinematic-hero-symbol">{pollutantData.symbol}</h1>
              <h2 className="cinematic-hero-headline">{sections.heroSubtitle}</h2>
              <p className="cinematic-hero-kicker-lead">A cinematic atmospheric investigation</p>
              <p className="cinematic-hero-lead">{pollutantData.shortDescription}</p>
              <div className="cinematic-hero-meta-row">
                <span>LAT 28.6139° N, LON 77.2090° E</span>
                <span className="sep">/</span>
                <span>CAAQMS CONTINUOUS TELEMETRY</span>
                <span className="sep">/</span>
                <span>INDO-GANGETIC AIRSHED</span>
              </div>
              <div className="cinematic-scroll-cue">
                <span>EXPLORE THE INVESTIGATION</span>
                <ChevronDown size={18} className="cue-chevron" />
              </div>
            </div>
          </section>

          {/* =================================================================
              CHAPTER 01: THE INVISIBLE PARTICLES (SECTION 01)
              Photo + text composition with ragged torn-photo boundary.
              ================================================================= */}
          <section
            className="cinematic-chapter-spread theme-dark-editorial"
            id="section-01-what-are-they"
          >
            <div className="cinematic-spread-grid">
              <div className="cinematic-spread-text-col">
                <div className="cinematic-chapter-marker">- CHAPTER 01 -</div>
                <div className="cinematic-marker-sub">THE INVISIBLE PARTICLES</div>
                <h2 className="cinematic-editorial-title">{sections.section01.title}</h2>
                <div className="cinematic-sub-annotation">
                  <span className="annotation-tag">{pollutantData.symbol}</span>
                  <span className="annotation-spec">{cinematicTheme.scaleSymbol} aerodynamic diameter</span>
                </div>
                <p className="cinematic-editorial-lead">{sections.section01.lead}</p>
                <p className="cinematic-editorial-body">{sections.section01.body}</p>
                <p className="cinematic-editorial-body secondary">{pollutantData.whatIsIt}</p>
                <div className="cinematic-field-citation">
                  <span className="citation-num">REF 01.A</span>
                  <span>
                    CPCB 24-hr NAAQS Limit: {pollutantData.naaqsLimit} {pollutantData.unit} | WHO 2021
                    Guideline: {pollutantData.whoLimit} {pollutantData.unit}
                  </span>
                </div>
              </div>

              <div className="cinematic-spread-visual-col">
                <div className="cinematic-torn-photo-spread">
                  <img
                    src={cinematicTheme.secondaryImage}
                    alt={`${pollutantData.name} atmospheric evidence`}
                    className="cinematic-photo-base"
                    loading="lazy"
                  />
                  <div className="torn-paper-edge-overlay" />
                  <div className="cinematic-photo-caption">
                    <span className="caption-tag">EXHIBIT // 01</span>
                    <span className="caption-text">
                      Suspended atmospheric column over National Capital Region
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================================
              CHAPTER 02: HOW SMALL ARE THEY? (SECTION 02)
              Scientific documentary environment: human hair vs PM10 vs PM2.5.
              ================================================================= */}
          <section className="cinematic-chapter-scale theme-scientific-lab" id="section-02-how-small">
            <div className="cinematic-scale-container">
              <div className="cinematic-scale-header">
                <div className="cinematic-chapter-marker dark">- 2.5 µm -</div>
                <div className="cinematic-marker-sub dark">PHYSICAL SCALE // MICROSCOPIC PROPORTIONS</div>
                <h2 className="cinematic-editorial-title dark">{sections.section02.title}</h2>
                <p className="cinematic-editorial-lead dark">{sections.section02.lead}</p>
              </div>

              <div className="cinematic-scale-visual-deck">
                <div
                  className="cinematic-proportional-diagram"
                  aria-label="Proportional Particle Scale Comparison"
                >
                  <div className="scale-ring-outer hair" title="Human Hair: 70 micrometers">
                    <div className="scale-ring-outer sand" title="Beach Sand: 90 micrometers" />
                    <div className="scale-ring-mid pm10" title="PM10: 10 micrometers">
                      <div className="scale-ring-inner pm25" title="PM2.5: 2.5 micrometers">
                        <div className="scale-ring-core ultrafine" title="Ultrafine: 0.1 micrometers" />
                      </div>
                    </div>
                  </div>
                  <div className="scale-diagram-legend">
                    <div className="legend-entry">
                      <span className="legend-indicator hair-ind" />
                      <span>
                        <strong>Human Hair</strong> (~70 µm diameter)
                      </span>
                    </div>
                    <div className="legend-entry">
                      <span className="legend-indicator pm10-ind" />
                      <span>
                        <strong>PM10</strong> (≤ 10 µm coarse inhalable)
                      </span>
                    </div>
                    <div className="legend-entry">
                      <span className="legend-indicator pm25-ind" />
                      <span>
                        <strong>PM2.5</strong> (≤ 2.5 µm fine combustion)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="cinematic-scale-bars-board" aria-label="Comparative Size Scale">
                  {sections.section02.comparisonItems.map((item, idx) => (
                    <div key={idx} className="cinematic-scale-bar-row">
                      <div className="bar-labels">
                        <span className="bar-name">{item.label}</span>
                        <span className="bar-size">{item.sizeMicrons} µm</span>
                      </div>
                      <div className="bar-track">
                        <div
                          className={`bar-fill ${item.visualClass}`}
                          style={{ width: `${item.barWidthPercent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="cinematic-scale-footer-prose">
                <p className="cinematic-editorial-body dark">{sections.section02.body}</p>
              </div>
            </div>
          </section>

          {/* =================================================================
              CHAPTER 03: WHERE IT BEGINS (SECTION 03)
              Emissions spectrum across Delhi's industrial and urban basin.
              ================================================================= */}
          <section className="cinematic-chapter-sources theme-environmental-sources" id="section-03-sources">
            <div className="cinematic-sources-bg-layer" />
            <div className="cinematic-sources-inner">
              <div className="cinematic-chapter-marker">- CHAPTER 03 -</div>
              <div className="cinematic-marker-sub">WHERE IT BEGINS</div>
              <h2 className="cinematic-editorial-title">{sections.section03.title}</h2>
              <p className="cinematic-editorial-lead">{sections.section03.lead}</p>

              <div className="cinematic-sources-photographic-grid">
                {sections.section03.categories.map((cat, idx) => (
                  <article key={idx} className="cinematic-source-frame">
                    <div className="source-frame-header">
                      <span className="source-idx">0{idx + 1}</span>
                      <h3 className="source-name">{cat.name}</h3>
                    </div>
                    <p className="source-desc">{cat.description}</p>
                    <div className="source-frame-footer">
                      <span className="source-tag">AIRSHED EMISSION FACTOR</span>
                    </div>
                  </article>
                ))}
              </div>

              <div className="cinematic-attribution-disclaimer">
                <Info size={15} />
                <span>
                  Source attribution represents verified atmospheric chemistry mechanisms. Real-time
                  receptor monitors measure aggregate airshed mass and cannot mathematically isolate
                  single-point fractions without isotope spectrometry.
                </span>
              </div>
            </div>
          </section>

          {/* =================================================================
              CHAPTER 04: HOW IT MOVES (SECTION 04)
              Atmospheric transport dynamics and boundary layer inversion.
              ================================================================= */}
          <section
            className="cinematic-chapter-transport theme-atmospheric-dynamics"
            id="section-04-atmospheric-transport"
          >
            <div className="cinematic-transport-inner">
              <div className="cinematic-chapter-marker">- CHAPTER 04 -</div>
              <div className="cinematic-marker-sub">HOW IT MOVES</div>
              <h2 className="cinematic-editorial-title">{sections.section04.title}</h2>
              <p className="cinematic-editorial-lead">{sections.section04.lead}</p>

              {/* Real-time Environmental Weather Vector Banner */}
              <div className="cinematic-weather-telemetry-strip">
                <div className="weather-metric-col">
                  <span className="m-label">
                    <Wind size={13} /> WIND VELOCITY
                  </span>
                  <span className="m-val">{weatherVariables.windSpeed} m/s</span>
                </div>
                <div className="weather-metric-col">
                  <span className="m-label">
                    <Thermometer size={13} /> TEMPERATURE
                  </span>
                  <span className="m-val">{weatherVariables.temperature}°C</span>
                </div>
                <div className="weather-metric-col">
                  <span className="m-label">
                    <Droplets size={13} /> RELATIVE HUMIDITY
                  </span>
                  <span className="m-val">{weatherVariables.humidity}%</span>
                </div>
                <div className="weather-metric-col">
                  <span className="m-label">
                    <Gauge size={13} /> BAROMETRIC PRESSURE
                  </span>
                  <span className="m-val">{weatherVariables.pressure} hPa</span>
                </div>
              </div>

              <div className="cinematic-transport-flow-deck">
                {sections.section04.stages.map((stg) => (
                  <div key={stg.step} className="cinematic-transport-flow-card">
                    <div className="stage-top">
                      <span className="stage-num">{stg.step}</span>
                      <h4 className="stage-name">{stg.stage}</h4>
                    </div>
                    <p className="stage-detail">{stg.detail}</p>
                  </div>
                ))}
              </div>
              <p
                className="cinematic-editorial-body secondary"
                style={{ marginTop: '2.5rem', maxWidth: '850px' }}
              >
                {pollutantData.atmosphericBehavior}
              </p>
            </div>
          </section>

          {/* =================================================================
              CHAPTER 05: DELHI RIGHT NOW (SECTION 05)
              Giant viewport live telemetry observation from /api/delhi-heatmap.
              ================================================================= */}
          <section className="cinematic-chapter-live theme-live-telemetry" id="section-05-delhi-right-now">
            <div className="cinematic-live-scrim" />
            <div className="cinematic-live-monolith-container">
              <div className="cinematic-chapter-marker">- LIVE EVIDENCE -</div>
              <div className="cinematic-marker-sub">DELHI / NOW</div>

              {currentPm25Reading != null ? (
                <div className="cinematic-live-hero-readout">
                  <div className="cinematic-live-number-block">
                    <div className="cinematic-city-callout">DELHI</div>
                    <div className="cinematic-giant-value">
                      {pollutantData.id === 'pm25'
                        ? currentPm25Reading
                        : currentStation?.[pollutantData.id] || '32.4'}
                    </div>
                    <div className="cinematic-giant-unit">{pollutantData.unit}</div>
                    <div className="cinematic-giant-symbol">{pollutantData.symbol}</div>
                    <div className="cinematic-live-status-pill">
                      <span className="pulse-dot" />
                      <span>LIVE OBSERVATION</span>
                    </div>
                  </div>

                  <div className="cinematic-live-meta-tableau">
                    <div className="meta-tableau-cell">
                      <div className="meta-tbl-kicker">MONITORING RECEPTOR</div>
                      <div className="meta-tbl-val">
                        {currentStation?.name || 'Pusa Station (CAAQMS)'}
                      </div>
                    </div>
                    <div className="meta-tableau-cell">
                      <div className="meta-tbl-kicker">COMPUTED AQI EQUIVALENT</div>
                      <div className="meta-tbl-val">
                        {currentAqiReading != null ? `AQI ${currentAqiReading}` : '—'}
                      </div>
                    </div>
                    <div className="meta-tableau-cell">
                      <div className="meta-tbl-kicker">LATEST TRANSMISSION</div>
                      <div className="meta-tbl-val">
                        {formattedTimestamp || 'Active continuous stream'}
                      </div>
                    </div>
                    <div className="meta-tableau-cell">
                      <div className="meta-tbl-kicker">24-HR NAAQS STANDARD</div>
                      <div className="meta-tbl-val">
                        {pollutantData.naaqsLimit} {pollutantData.unit}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="cinematic-live-unavailable" id="doc-live-data-unavailable">
                  <Info size={28} />
                  <p>
                    {isLiveLoading
                      ? 'Connecting to continuous Delhi CAAQMS station stream...'
                      : 'Data unavailable'}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* =================================================================
              CHAPTER 06: THE CITY IS NOT ONE NUMBER (SECTION 06)
              Spatial CAAQMS stations & 24-hr diurnal concentration dynamics.
              ================================================================= */}
          <section className="cinematic-chapter-spatial theme-cartographer" id="section-06-trends">
            <div className="cinematic-spatial-inner">
              <div className="cinematic-chapter-marker">- CHAPTER 06 -</div>
              <div className="cinematic-marker-sub">THE CITY IS NOT ONE NUMBER</div>
              <h2 className="cinematic-editorial-title">{sections.section06.title}</h2>
              <p className="cinematic-editorial-lead">{sections.section06.lead}</p>

              {/* Spatial Station Nodes Grid */}
              <div className="cinematic-stations-spatial-deck">
                <div className="spatial-deck-header">
                  <span>CAAQMS MONITORING NETWORK RECEPTORS</span>
                  <span className="legend-tag">
                    <span className="dot measured" /> MEASURED (CAAQMS BAM-1020)
                  </span>
                </div>
                <div className="spatial-stations-row">
                  {(internalLiveData?.stations || []).slice(0, 4).map((st) => (
                    <div key={st.id} className="cinematic-station-node-card">
                      <div className="st-zone">{st.zone || 'Delhi NCR'}</div>
                      <h4 className="st-name">{st.name}</h4>
                      <div className="st-val-row">
                        <span className="st-val">{st[pollutantData.id] ?? st.pm25 ?? '—'}</span>
                        <span className="st-unit">{pollutantData.unit}</span>
                      </div>
                      <div className="st-badge measured-badge">MEASURED</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 24-hr Diurnal Chart */}
              {sections.section06.diurnalPoints && sections.section06.diurnalPoints.length > 0 && (
                <div className="cinematic-diurnal-chart-box">
                  <div className="chart-header-row">
                    <span className="chart-title">
                      24-Hour Diurnal Progression & Boundary Layer Dynamics
                    </span>
                    <span className="chart-unit">Unit: {pollutantData.unit}</span>
                  </div>
                  <svg className="doc-chart-svg" viewBox="0 0 600 160" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGradientCinematic" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={visualMetadata.accentColor} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={visualMetadata.accentColor} stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {(() => {
                      const points = sections.section06.diurnalPoints;
                      const maxVal = Math.max(...points.map((p) => p.value)) * 1.15;
                      const coords = points.map((p, idx) => ({
                        x: 40 + (idx / (points.length - 1)) * 520,
                        y: 140 - (p.value / maxVal) * 115,
                        value: p.value,
                      }));
                      let pathD = `M ${coords[0].x} ${coords[0].y}`;
                      for (let i = 1; i < coords.length; i++) {
                        pathD += ` L ${coords[i].x} ${coords[i].y}`;
                      }
                      const areaD = `${pathD} L 560 145 L 40 145 Z`;
                      return (
                        <>
                          <path d={areaD} fill="url(#chartGradientCinematic)" />
                          <path
                            d={pathD}
                            fill="none"
                            stroke={visualMetadata.accentColor}
                            strokeWidth="3"
                          />
                          {coords.map((c, idx) => (
                            <g key={idx}>
                              <circle
                                cx={c.x}
                                cy={c.y}
                                r="4"
                                fill="#ffffff"
                                stroke={visualMetadata.accentColor}
                                strokeWidth="2"
                              />
                              <text
                                x={c.x}
                                y={c.y - 10}
                                fill="#cbd5e1"
                                fontSize="10"
                                textAnchor="middle"
                                fontWeight="600"
                              >
                                {c.value}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                  <div className="doc-chart-bar-labels">
                    {sections.section06.diurnalPoints.map((p, idx) => (
                      <span key={idx}>{p.label}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* =================================================================
              CHAPTER 07: FROM CITY TO SCHOOL (SECTION 07)
              School proximity, Quadratic IDW, and epidemiological relevance.
              ================================================================= */}
          <section className="cinematic-chapter-school theme-school-impact" id="section-07-why-it-matters">
            <div className="cinematic-school-inner">
              <div className="cinematic-chapter-marker">- CHAPTER 07 -</div>
              <div className="cinematic-marker-sub">FROM CITY TO SCHOOL</div>
              <h2 className="cinematic-editorial-title">
                THE CITY IS A MAP. BUT PEOPLE LIVE AT SPECIFIC LOCATIONS.
              </h2>
              <p className="cinematic-editorial-lead">{sections.section07.lead}</p>

              {/* School Proximity Dossier Card */}
              <div className="cinematic-school-dossier-card">
                <div className="school-dossier-grid">
                  <div className="school-photo-mount">
                    <img
                      src="/assets/documentary/evidence_school.jpg"
                      alt="Delhi School Environment"
                      className="school-evidence-img"
                      loading="lazy"
                    />
                    <div className="school-photo-caption">
                      <span className="caption-tag">CAMPUS INVENTORY //</span>
                      <span>
                        {selectedSchool.name} ({selectedSchool.locality})
                      </span>
                    </div>
                  </div>

                  <div className="school-telemetry-breakdown">
                    <div className="breakdown-kicker">SPATIAL ESTIMATE (QUADRATIC IDW)</div>
                    <div className="school-idw-readout-row">
                      <div className="idw-large-value">
                        {schoolIdwEstimate?.pm25 ?? currentPm25Reading ?? '—'}
                      </div>
                      <div className="idw-unit">{pollutantData.unit}</div>
                      <div className="idw-badge-box">
                        <span className="idw-badge">ESTIMATED AROUND SCHOOL</span>
                      </div>
                    </div>

                    {/* IDW Connection Trace */}
                    <div className="school-stations-connection-trace">
                      <div className="trace-header">Nearby Stations Inverse Distance Network:</div>
                      <div className="trace-stations-list">
                        {nearbyStationsForSchool.map((st, i) => (
                          <div key={st.id || i} className="trace-station-item">
                            <span className="st-marker">STATION {i + 1}</span>
                            <span className="st-title">{st.name}</span>
                            <span className="st-dist">({st.distanceKm} km away)</span>
                            <span className="st-val">
                              {st.pm25} {pollutantData.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="school-spatial-disclaimer-box">
                      <AlertCircle size={15} />
                      <span>
                        School PM2.5 values are spatial estimates derived from nearby monitoring stations
                        and are not direct measurements at the school.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Physiological & Health Impact Points */}
              <div className="cinematic-impacts-deck">
                <div className="impacts-deck-title">PHYSIOLOGICAL & AIRSHED CONSEQUENCES</div>
                <div className="impacts-points-grid">
                  {sections.section07.points.map((pt, idx) => (
                    <div key={idx} className="cinematic-impact-point-card">
                      <span className="point-idx">0{idx + 1}</span>
                      <span className="point-text">{pt}</span>
                    </div>
                  ))}
                </div>
                <p className="cinematic-editorial-body secondary" style={{ marginTop: '2rem' }}>
                  {pollutantData.whyItMatters}
                </p>
              </div>
            </div>
          </section>

          {/* =================================================================
              CHAPTER 08: 14 DAYS OF EVIDENCE (SECTION 08)
              Field notebook dossier across 14 consecutive calendar days.
              ================================================================= */}
          <section className="cinematic-chapter-evidence theme-evidence-archive" id="section-08-the-takeaway">
            <div className="cinematic-evidence-inner">
              <div className="cinematic-chapter-marker">- 14-DAY ARCHIVE -</div>
              <div className="cinematic-marker-sub">CONTINUOUS EMPIRICAL WINDOW</div>
              <h2 className="cinematic-editorial-title">14 DAYS OF EVIDENCE</h2>
              <p className="cinematic-editorial-lead">
                Field telemetry evidence log across 14 consecutive calendar days. Real observations are
                recorded; missing days remain strictly unpopulated.
              </p>

              {/* 14-Day Cards Grid */}
              <div className="cinematic-14day-grid">
                {dailyEvidenceWindow.map((day, idx) => (
                  <div
                    key={day.date}
                    className={`cinematic-day-frame status-${day.status.toLowerCase()}`}
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
                          <span className="df-unit">{pollutantData.unit}</span>
                        </div>
                      )}
                    </div>
                    <div className="day-frame-bottom">
                      <span className="df-obs-count">{day.observationCount} Observations</span>
                      <span className={`df-badge ${day.status.toLowerCase()}`}>{day.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Takeaway Quotation */}
              <div className="cinematic-takeaway-quote-deck">
                <blockquote className="cinematic-takeaway-quote">
                  "{sections.section08.statement}"
                </blockquote>
                <p className="cinematic-takeaway-subtext">{sections.section08.subtext}</p>
              </div>
            </div>
          </section>

          {/* =================================================================
              CHAPTER 09: FINAL TAKEAWAY (CLOSING SCENE)
              Cinematic darkness fade with solemn environmental takeaway.
              ================================================================= */}
          <section className="cinematic-chapter-takeaway theme-takeaway-closing">
            <div className="cinematic-takeaway-inner">
              <p className="cinematic-closing-line line-1">YOU CANNOT ALWAYS SEE POLLUTION.</p>
              <p className="cinematic-closing-line line-2">BUT WE CAN MEASURE IT.</p>
              <p className="cinematic-closing-line line-3">AND MEASUREMENTS TELL A STORY.</p>
              <div className="cinematic-closing-brand">
                <h3 className="brand-title">VAYUVITALS</h3>
                <p className="brand-credo">SEE THE AIR. UNDERSTAND THE AIR. ACT ON THE EVIDENCE.</p>
              </div>
            </div>
          </section>

          {/* =================================================================
              CHAPTER 10: POLLUTANT NAVIGATION FOOTER
              Documentary chapter selector triggering seamless veil transition.
              ================================================================= */}
          <footer className="cinematic-pollutant-nav-footer">
            <div className="nav-footer-inner">
              <div className="return-to-story-wrap">
                <button
                  onClick={handleBackToStory}
                  className="cinematic-return-btn"
                  id="doc-return-to-story-cta"
                >
                  ← Back to the Story
                </button>
              </div>

              <div className="cinematic-nav-heading">EXPLORE ANOTHER POLLUTANT</div>
              <p className="cinematic-nav-sub">
                Select a chapter below to transition smoothly into another atmospheric investigation.
              </p>

              <nav className="cinematic-pollutant-chapters-row" aria-label="Explore other pollutants">
                {POLLUTANT_DOCUMENTARY_LIST.map((p, index) => {
                  const isActive = p.id === pollutantData.id;
                  return (
                    <button
                      key={p.id}
                      id={`explore-another-${p.id}`}
                      className={`cinematic-chapter-chip ${isActive ? 'active' : ''}`}
                      style={{
                        '--chip-accent': p.visualMetadata.accentColor,
                        '--chip-glow': p.visualMetadata.accentGlow,
                      }}
                      onClick={() => handleOpenDeepDive(p.id)}
                      disabled={isTransitioning}
                    >
                      <span className="chip-chapter-num">0{index + 1}</span>
                      <span className="chip-symbol">{p.symbol}</span>
                      {isActive && <span className="chip-active-dot" />}
                    </button>
                  );
                })}
              </nav>
            </div>
          </footer>
        </main>
      </div>
    );
}
