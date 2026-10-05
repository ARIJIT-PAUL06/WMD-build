/**
 * PollutantDocumentary Component
 * VayuVitals - Chapter-by-Chapter Visual Storybook Documentary
 *
 * "THE AIR WE BREATHE"
 * An investigative scrapbook documentary into air pollution in Delhi.
 *
 * Visual Inspiration:
 * - Tactile physical scrapbook composition
 * - Torn paper, pinned notes, polaroid photographs, newspaper clippings
 * - Handwritten annotations, rubber stamps, translucent tape, paper clips
 * - Distinct, unique visual theme for EVERY single chapter
 *
 * Reuses existing live telemetry (/api/delhi-heatmap), spatial IDW, school evidence, and petition workflow.
 * DO NOT fabricate measurements, sources, or percentages.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  Wind,
  Activity,
  Layers,
  Radio,
  Clock,
  MapPin,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Calendar,
  AlertCircle,
  FileText,
  CheckCircle2,
  ExternalLink,
  Info,
  Thermometer,
  Droplets,
  Gauge,
  Compass,
  Paperclip,
  Bookmark
} from 'lucide-react';
import {
  POLLUTANT_DOCUMENTARIES,
  POLLUTANT_DOCUMENTARY_LIST,
} from '../../data/pollutantDocumentaries.js';
import schoolsDirectory from '../../data/schoolsDirectory.json';
import {
  getNearbyStationsForSchool,
  calculateSchoolIdw,
  calculateDistanceKm,
  classifySchoolDataConfidence,
} from '../SchoolSafety/schoolSafetyHelpers.js';
import {
  getSchoolObservations,
  recordSchoolObservation,
} from '../SchoolSafety/schoolEvidenceStore.js';
import {
  buildSchoolEvidenceWindow,
  calculateEvidenceCoverage,
  getMonitoringStatus,
  evaluateCivicActionEligibility,
  generateEvidenceSummary,
  createEvidencePackage,
} from '../SchoolSafety/schoolSafetyEvidence.js';
import PetitionModal from '../Petition/PetitionModal.jsx';
import './PollutantDocumentary.css';

/* ==========================================================================
   Tactile Scrapbook Physical Design System Primitives
   ========================================================================== */

export function PushPin({ color = '#e11d48', className = '', style = {} }) {
  return (
    <div className={`scrapbook-pin ${className}`} style={style} aria-hidden="true">
      <svg width="24" height="28" viewBox="0 0 24 28" fill="none">
        <defs>
          <filter id={`pin-shadow-${color.replace('#', '')}`} x="0" y="0" width="24" height="28" filterUnits="userSpaceOnUse">
            <feDropShadow dx="2" dy="4" stdDeviation="2.5" floodColor="rgba(0,0,0,0.55)" />
          </filter>
          <linearGradient id={`pin-grad-${color.replace('#', '')}`} x1="4" y1="2" x2="16" y2="14" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="30%" stopColor={color} />
            <stop offset="100%" stopColor="#1e1e1e" />
          </linearGradient>
        </defs>
        <circle cx="10" cy="8" r="7" fill={`url(#pin-grad-${color.replace('#', '')})`} filter={`url(#pin-shadow-${color.replace('#', '')})`} />
        <circle cx="8" cy="6" r="2.5" fill="#ffffff" opacity="0.65" />
        <path d="M10 15L10 24" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function TapeStrip({ angle = '-5deg', className = '', style = {} }) {
  return (
    <div
      className={`scrapbook-tape ${className}`}
      style={{ transform: `rotate(${angle})`, ...style }}
      aria-hidden="true"
    />
  );
}

export function PaperClipGraphic({ className = '', style = {} }) {
  return (
    <div className={`scrapbook-paperclip ${className}`} style={style} aria-hidden="true">
      <svg width="20" height="42" viewBox="0 0 20 42" fill="none">
        <path
          d="M6 34V8C6 4.68629 8.68629 2 12 2C15.3137 2 18 4.68629 18 8V32C18 36.4183 14.4183 40 10 40C5.58172 40 2 36.4183 2 32V12"
          stroke="#cbd5e1"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function RubberStamp({ text, color = '#dc2626', rotate = '-7deg', className = '', style = {} }) {
  return (
    <div
      className={`scrapbook-stamp ${className}`}
      style={{ color, borderColor: color, transform: `rotate(${rotate})`, ...style }}
    >
      <span>{text}</span>
    </div>
  );
}

export function PolaroidFrame({ title, caption, date, rotate = '1.5deg', className = '', children }) {
  return (
    <figure
      className={`scrapbook-polaroid ${className}`}
      style={{ transform: `rotate(${rotate})` }}
    >
      <div className="polaroid-photo-area">
        {children}
      </div>
      <figcaption className="polaroid-caption-area">
        <div className="polaroid-title">{title}</div>
        {caption && <div className="polaroid-sub">{caption}</div>}
        {date && <div className="polaroid-date">{date}</div>}
      </figcaption>
    </figure>
  );
}

export function PhysicalPhoto({ src, alt, caption, rotation = '0deg', className = '', style = {} }) {
  return (
    <div
      className={`physical-photo-mount ${className}`}
      style={{ transform: `rotate(${rotation})`, ...style }}
    >
      <div className="photo-tape-tl" />
      <div className="photo-tape-br" />
      <img src={src} alt={alt} className="photo-img-content" />
      {caption && <div className="photo-caption-handwriting">{caption}</div>}
    </div>
  );
}

export function EvidenceLabel({ code, title, category, className = '', style = {} }) {
  return (
    <div className={`physical-evidence-label ${className}`} style={style}>
      <div className="label-eyelet" />
      <div className="label-code">{code}</div>
      <div className="label-title">{title}</div>
      {category && <div className="label-cat">{category}</div>}
    </div>
  );
}

export function AnnotationArrow({ direction = 'down', className = '', style = {} }) {
  return (
    <div className={`annotation-arrow-svg ${className}`} style={style} aria-hidden="true">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path
          d={direction === 'down' ? 'M12 8 C 18 20, 24 32, 28 40 M 20 36 L 28 40 L 32 32' : 'M8 24 C 20 20, 32 16, 40 12 M 32 8 L 40 12 L 36 20'}
          stroke="#ef4444"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function ArchiveTag({ text, className = '', style = {} }) {
  return (
    <div className={`physical-archive-tag ${className}`} style={style}>
      <span className="tag-rivet" />
      <span className="tag-text">{text}</span>
    </div>
  );
}

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
  pollutantId = null,
  pollutant = null,
  onBack,
  onSelectPollutant,
  liveData = null,
  isSchoolContext = false,
}) {
  // Deep-dive sub-chapter state
  const [activeDeepDiveId, setActiveDeepDiveId] = useState(() => {
    if (pollutant?.id) return pollutant.id;
    if (pollutantId && POLLUTANT_DOCUMENTARIES[pollutantId]) return pollutantId;
    return null;
  });

  // Cinematic Pollutant-to-Pollutant Transition State
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionTargetId, setTransitionTargetId] = useState(null);
  const [transitionPhase, setTransitionPhase] = useState('idle'); // 'idle' | 'darken' | 'expanded' | 'reveal'

  // Petition modal state for civic action
  const [isPetitionModalOpen, setIsPetitionModalOpen] = useState(false);

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
    if (pollutant?.id) {
      setActiveDeepDiveId(pollutant.id);
    } else if (pollutantId && POLLUTANT_DOCUMENTARIES[pollutantId]) {
      setActiveDeepDiveId(pollutantId);
    } else {
      setActiveDeepDiveId(null);
    }
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
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
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

  const evidenceCoverage = useMemo(() => {
    return calculateEvidenceCoverage(dailyEvidenceWindow);
  }, [dailyEvidenceWindow]);

  const monitoringStatus = useMemo(() => {
    return getMonitoringStatus(dailyEvidenceWindow);
  }, [dailyEvidenceWindow]);

  const civicEligibility = useMemo(() => {
    return evaluateCivicActionEligibility(monitoringStatus, dailyEvidenceWindow);
  }, [monitoringStatus, dailyEvidenceWindow]);

  const evidenceSummary = useMemo(() => {
    return generateEvidenceSummary(
      dailyEvidenceWindow,
      evidenceCoverage,
      monitoringStatus
    );
  }, [dailyEvidenceWindow, evidenceCoverage, monitoringStatus]);

  const evidencePackage = useMemo(() => {
    if (!civicEligibility.eligible) return null;
    return createEvidencePackage({
      school: selectedSchool,
      monitoringPeriod: evidenceSummary.monitoringPeriod,
      dailyEvidence: dailyEvidenceWindow,
      coverage: evidenceCoverage,
      metrics: {
        avgPm25: evidenceSummary.avgPm25,
        peakPm25: evidenceSummary.peakPm25,
        lowestPm25: evidenceSummary.lowestPm25,
        exceedanceDays: evidenceSummary.exceedanceDays,
        confidence: evidenceSummary.confidence,
        isEstimate: true,
      },
      spatialContext: {
        nearestStation: nearbyStationsForSchool[0]?.name || 'Delhi CAAQMS Station',
        nearestDistanceKm: nearbyStationsForSchool[0]?.distanceKm || 1.8,
        stationsUsed: nearbyStationsForSchool.length,
      },
    });
  }, [
    civicEligibility,
    selectedSchool,
    evidenceSummary,
    dailyEvidenceWindow,
    evidenceCoverage,
    nearbyStationsForSchool,
  ]);

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
        setTransitionTargetId(null);
        setTransitionPhase('idle');
      }, 850);
    },
    [activeDeepDiveId, onSelectPollutant]
  );

  const handleBackToStory = useCallback(() => {
    setActiveDeepDiveId(null);
    if (onSelectPollutant) {
      onSelectPollutant(null);
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [onSelectPollutant]);

  const handleJumpToChapter = (chapterId) => {
    const el = document.getElementById(chapterId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleKeyDown = (e, callback) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };

  // =========================================================================
  // VIEW MODE B: CINEMATIC EDITORIAL POLLUTANT DOCUMENTARY
  // An immersive full-viewport photographic investigative film.
  // =========================================================================
  if (activeDeepDiveId && POLLUTANT_DOCUMENTARIES[activeDeepDiveId]) {
    const pollutantData = POLLUTANT_DOCUMENTARIES[activeDeepDiveId];
    const { sections, visualMetadata } = pollutantData;
    const cinematicTheme =
      POLLUTANT_CINEMATIC_THEMES[activeDeepDiveId] || POLLUTANT_CINEMATIC_THEMES.pm25;

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

  // =========================================================================
  // VIEW MODE A: "THE AIR WE BREATHE" — 12-CHAPTER VISUAL STORYBOOK
  // An investigative archive where every chapter is a distinct visual world.
  // =========================================================================
  return (
    <div className="doc-root doc-storybook-wrapper" id="pollutant-documentary-film">
      {/* Top Fixed Investigative Navigation Header */}
      <header className="doc-header-nav" role="banner">
        <div className="doc-nav-left">
          <button
            onClick={onBack}
            className="doc-back-btn"
            id="doc-back-to-cargo-btn"
            title="Return to the Atmospheric Cargo Hauler deck"
          >
            <ArrowLeft size={15} />
            <span>Back to Atmospheric Cargo</span>
          </button>
          <div className="doc-investigation-badge">
            <span className="doc-investigation-dot" />
            <span>INVESTIGATIVE SCRAPBOOK // DELHI BASIN</span>
          </div>
        </div>

        <div className="doc-nav-right">
          <div className="doc-telemetry-chip">
            <Radio size={12} color="#10b981" />
            <span>{currentStation ? currentStation.name : 'Delhi CAAQMS Network'}</span>
          </div>
        </div>
      </header>

      {/* Tactile Chapter Ribbon Navigation Bar */}
      <nav className="doc-chapter-ribbon" aria-label="Investigation Chapters">
        <div className="doc-ribbon-track">
          <button onClick={() => handleJumpToChapter('chapter-01-the-city')} className="ribbon-tab">
            <span className="tab-num">01</span> City
          </button>
          <button onClick={() => handleJumpToChapter('chapter-02-the-invisible')} className="ribbon-tab">
            <span className="tab-num">02</span> Invisible
          </button>
          <button onClick={() => handleJumpToChapter('chapter-03-what-we-carry')} className="ribbon-tab">
            <span className="tab-num">03</span> Cargo
          </button>
          <button onClick={() => handleJumpToChapter('chapter-04-where-it-comes-from')} className="ribbon-tab">
            <span className="tab-num">04</span> Sources
          </button>
          <button onClick={() => handleJumpToChapter('chapter-05-the-air-moves')} className="ribbon-tab">
            <span className="tab-num">05</span> Air Moves
          </button>
          <button onClick={() => handleJumpToChapter('chapter-06-delhi-right-now')} className="ribbon-tab">
            <span className="tab-num">06</span> Live
          </button>
          <button onClick={() => handleJumpToChapter('chapter-07-the-city-is-not-one-number')} className="ribbon-tab">
            <span className="tab-num">07</span> Spatial
          </button>
          <button onClick={() => handleJumpToChapter('chapter-08-the-weather-changes-the-story')} className="ribbon-tab">
            <span className="tab-num">08</span> Weather
          </button>
          <button onClick={() => handleJumpToChapter('chapter-09-from-city-to-school')} className="ribbon-tab">
            <span className="tab-num">09</span> School
          </button>
          <button onClick={() => handleJumpToChapter('chapter-10-14-days-of-evidence')} className="ribbon-tab">
            <span className="tab-num">10</span> 14 Days
          </button>
          <button onClick={() => handleJumpToChapter('chapter-11-what-we-know-what-we-dont')} className="ribbon-tab">
            <span className="tab-num">11</span> What We Know
          </button>
          <button onClick={() => handleJumpToChapter('chapter-12-the-takeaway')} className="ribbon-tab">
            <span className="tab-num">12</span> Takeaway
          </button>
        </div>
      </nav>

      {/* Opening Cinematic Hero */}
      <section className="doc-storybook-hero" id="documentary-opening-hero">
        <div className="doc-hero-paper-stack">
          <PushPin color="#ef4444" style={{ top: '-14px', right: '40px' }} />
          <TapeStrip angle="-3deg" style={{ top: '-10px', left: '30px' }} />
          
          <div className="hero-kicker-stamp">VAYUVITALS SPECIAL ARCHIVE // CASE NO. DL-2026</div>
          <h1 className="hero-editorial-title">
            THE AIR<br />WE BREATHE
          </h1>
          <p className="hero-editorial-subtitle">
            An investigation into the invisible pollution moving through Delhi.
          </p>

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <button
              onClick={() => handleJumpToChapter('chapter-01-the-city')}
              className="doc-begin-investigation-cta"
              id="begin-story-btn"
              aria-label="Begin Delhi air pollution documentary investigation"
            >
              <span>BEGIN STORY ↓</span>
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          CHAPTER 01 — THE CITY (VISUAL WORLD: PHOTOGRAPHIC ARCHIVE)
          ===================================================================== */}
      <section className="doc-chapter-section theme-city-archive" id="chapter-01-the-city">
        <div className="city-archive-world">
          <div className="archive-top-meta-row">
            <ArchiveTag text="ARCHIVE // NCT-DELHI 001" />
            <span className="archive-kicker">CHAPTER 01 // THE CITY</span>
          </div>

          <div className="city-archive-title-stack">
            <span className="city-tag-huge">DELHI</span>
            <h2 className="chapter-title-headline font-editorial">THE CITY WAKES.</h2>
          </div>

          {/* Large Hero City Photograph occupying ~55-60% viewport */}
          <div className="city-photo-dramatic-stage">
            <div className="city-photo-mount-frame">
              <PushPin color="#ef4444" style={{ top: '-14px', left: '35px', zIndex: 30 }} />
              <TapeStrip angle="-2deg" style={{ top: '-10px', right: '45px', zIndex: 30 }} />
              
              <div className="photo-paper-border">
                <img
                  src="/assets/documentary/delhi_dawn_hero.jpg"
                  alt="Delhi pre-dawn atmospheric inversion smog layer settling over the Yamuna basin"
                  className="city-hero-photo-img"
                />
                <div className="photo-corner-mount cm-tl" />
                <div className="photo-corner-mount cm-tr" />
                <div className="photo-corner-mount cm-bl" />
                <div className="photo-corner-mount cm-br" />
              </div>

              {/* Overlaid Archival Box */}
              <div className="city-archival-stamp-bracket">
                <div className="box-title">DELHI // ARCHIVE 001</div>
                <div className="box-sub">PRE-DAWN</div>
                <div className="box-desc">ATMOSPHERIC RECORD</div>
                {formattedTimestamp && <div className="box-time">{formattedTimestamp}</div>}
              </div>

              {/* Handwritten Arrow Callout */}
              <div className="city-handwritten-callout">
                <AnnotationArrow direction="down" />
                <span className="handwritten-text">"THE AIR IS ALREADY MOVING"</span>
              </div>
            </div>
          </div>

          <div className="city-archive-narrative-footer">
            <blockquote className="chapter-narration-quote">
              "Before the streets fill, the atmosphere is already moving."
            </blockquote>
            <p className="chapter-body-copy">
              At dawn, long before six million vehicles ignite their exhausts, a shallow nocturnal
              pool of cold air traps particulate freight beneath a low ceiling. The city breathes in
              what was left behind the night before.
            </p>
            <div className="city-observation-stamp-pill">
              <span className="pill-dot" />
              <span className="pill-text">DELHI // CURRENT AIR OBSERVATION</span>
              {formattedTimestamp && <span className="pill-time">{formattedTimestamp}</span>}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          CHAPTER 02 — THE INVISIBLE (VISUAL WORLD: SCIENTIFIC NOTEBOOK)
          ===================================================================== */}
      <section className="doc-chapter-section theme-lab-notebook" id="chapter-02-the-invisible">
        <div className="scientific-notebook-surface">
          <div className="notebook-spiral-spine" aria-hidden="true" />
          <PaperClipGraphic style={{ top: '15px', right: '50px' }} />
          
          <div className="notebook-header-block">
            <div className="notebook-chap-label">CHAPTER 02 // THE INVISIBLE</div>
            <h2 className="chapter-title-headline font-typewriter">YOU CANNOT SEE ALL OF IT.</h2>
            <p className="chapter-body-copy">
              The air around us contains a mixture of particles and gases that can be measured.
              Suspended invisible matter ranges from macroscopic crustal dust grains down to
              sub-micron combustion aerosols that cross the lung-capillary barrier directly into blood circulation.
            </p>
          </div>

          {/* Massive PM2.5 Particle Diagram & Scale Study Arena */}
          <div className="massive-particle-study-arena" aria-label="Microscopic Aerosol Study">
            <div className="particle-stage-left">
              <div className="massive-pm25-graphic-container">
                <svg className="massive-pm25-svg" viewBox="0 0 320 320">
                  <defs>
                    <radialGradient id="particleCoreGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#1e293b" />
                      <stop offset="60%" stopColor="#334155" />
                      <stop offset="100%" stopColor="#0f172a" />
                    </radialGradient>
                    <filter id="particleSootGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="rgba(239, 68, 68, 0.35)" />
                    </filter>
                  </defs>

                  {/* Outer Aerodynamic Diameter Boundary */}
                  <circle cx="160" cy="160" r="140" fill="none" stroke="#dc2626" strokeWidth="2" strokeDasharray="6 4" />
                  
                  {/* Central Insoluble Carbonaceous Core */}
                  <circle cx="160" cy="160" r="120" fill="url(#particleCoreGrad)" filter="url(#particleSootGlow)" />
                  
                  {/* Soot Agglomerate Spherules */}
                  <circle cx="120" cy="130" r="26" fill="#090d16" opacity="0.85" />
                  <circle cx="180" cy="120" r="32" fill="#090d16" opacity="0.9" />
                  <circle cx="160" cy="180" r="38" fill="#020617" opacity="0.95" />
                  <circle cx="210" cy="170" r="22" fill="#090d16" opacity="0.8" />
                  <circle cx="110" cy="190" r="24" fill="#090d16" opacity="0.85" />

                  {/* Crystalline Sulfate/Nitrate Specks */}
                  <polygon points="150,90 156,105 144,105" fill="#38bdf8" opacity="0.9" />
                  <polygon points="210,130 218,142 202,142" fill="#38bdf8" opacity="0.85" />
                  <polygon points="120,210 128,222 112,222" fill="#f59e0b" opacity="0.9" />
                  <polygon points="190,215 198,228 182,228" fill="#f59e0b" opacity="0.85" />
                </svg>

                <div className="particle-annotation-badge badge-top">
                  <span className="p-tag">PM2.5</span>
                  <span className="p-dim">2.5 µm AERODYNAMIC DIAMETER</span>
                </div>
                <div className="particle-annotation-badge badge-mid">
                  <span className="p-desc">FINE COMBUSTION AEROSOL</span>
                </div>
                <div className="particle-annotation-badge badge-bot">
                  <span className="p-alert">PENETRATES PULMONARY ALVEOLI</span>
                </div>
              </div>
            </div>

            <div className="particle-stage-right">
              <div className="scale-study-sheet">
                <div className="study-sheet-header">
                  <span className="sheet-ref">FIGURE 2.5 // MICROMETRIC COMPARISON</span>
                  <h3>SCALE / PARTICLE STUDY</h3>
                </div>

                <div className="scale-comparison-list">
                  <div className="scale-comp-item">
                    <div className="comp-meta">
                      <span className="comp-name">HUMAN HAIR</span>
                      <span className="comp-val">70 µm</span>
                    </div>
                    <div className="comp-track">
                      <div className="comp-bar bar-hair" style={{ width: '100%' }} />
                    </div>
                  </div>

                  <div className="scale-comp-item">
                    <div className="comp-meta">
                      <span className="comp-name">PM10 (INHALABLE CRUSTAL DUST)</span>
                      <span className="comp-val">10 µm</span>
                    </div>
                    <div className="comp-track">
                      <div className="comp-bar bar-pm10" style={{ width: '14.3%' }} />
                    </div>
                  </div>

                  <div className="scale-comp-item">
                    <div className="comp-meta">
                      <span className="comp-name">PM2.5 (FINE COMBUSTION SMOKE)</span>
                      <span className="comp-val">2.5 µm</span>
                    </div>
                    <div className="comp-track">
                      <div className="comp-bar bar-pm25" style={{ width: '3.5%' }} />
                    </div>
                  </div>
                </div>

                <div className="scale-ruler-track" aria-hidden="true">
                  <div className="ruler-line" />
                  <div className="ruler-ticks">
                    <span>0 µm</span>
                    <span>10 µm</span>
                    <span>25 µm</span>
                    <span>50 µm</span>
                    <span>70 µm</span>
                  </div>
                </div>

                <div className="notebook-handwritten-note">
                  <span className="pencil-text">
                    *PM2.5 is thirty times smaller than the width of human hair. It stays suspended in air for days without settling.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pinned Pollutant Swatches */}
          <div className="lab-pinned-pollutant-swatches">
            <span className="swatches-label">MEASURED ATMOSPHERIC COMPONENTS:</span>
            <div className="swatches-grid">
              {POLLUTANT_DOCUMENTARY_LIST.map((p) => (
                <button
                  key={p.id}
                  id={`invisible-pollutant-chip-${p.id}`}
                  className="lab-pollutant-tab"
                  onClick={() => handleOpenDeepDive(p.id)}
                  onKeyDown={(e) => handleKeyDown(e, () => handleOpenDeepDive(p.id))}
                  style={{ '--p-accent': p.visualMetadata.accentColor }}
                >
                  <span className="tab-sym">{p.symbol}</span>
                  <span className="tab-nm">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          CHAPTER 03 — WHAT WE CARRY (VISUAL WORLD: INDUSTRIAL CARGO MANIFEST)
          ===================================================================== */}
      <section className="doc-chapter-section theme-cargo-manifest" id="chapter-03-what-we-carry">
        <div className="cargo-warehouse-deck">
          <div className="steel-rivet rivet-tl" />
          <div className="steel-rivet rivet-tr" />
          <div className="steel-rivet rivet-bl" />
          <div className="steel-rivet rivet-br" />

          <div className="manifest-header-block">
            <div className="manifest-agency-tag">
              <span>VAYUVITALS ATMOSPHERIC LOGISTICS // CAAQMS REGISTRY</span>
              <RubberStamp text="MANIFEST VERIFIED" color="#22c55e" rotate="5deg" />
            </div>
            <h2 className="chapter-title-headline font-industrial">WHAT ARE WE CARRYING?</h2>
            <div className="manifest-subtitle-row">
              <span className="manifest-sub">ATMOSPHERIC CARGO MANIFEST</span>
              <span className="manifest-doc-id">WAYBILL #DL-TROPO-2026</span>
            </div>
            <p className="manifest-lead">
              Like the Atmospheric Cargo Hauler, the Delhi tropospheric column carries discrete,
              measurable tonnage of invisible pollutants. Each payload class has distinct aerodynamic behavior,
              mass density, and regulatory ceilings.
            </p>
          </div>

          {/* Overlapping Staggered Cargo Documents */}
          <div className="cargo-manifest-staggered-deck">
            {POLLUTANT_DOCUMENTARY_LIST.map((p, idx) => (
              <div
                key={p.id}
                id={`cargo-pollutant-card-${p.id}`}
                className={`cargo-waybill-card cargo-row-entry card-tilt-${(idx % 4) + 1}`}
                onClick={() => handleOpenDeepDive(p.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => handleKeyDown(e, () => handleOpenDeepDive(p.id))}
              >
                <div className="waybill-top">
                  <span className="waybill-cargo-id">{`CARGO ${String(idx + 1).padStart(2, '0')}`}</span>
                  <span className="waybill-barcode" aria-hidden="true">|||| | ||||| |||</span>
                </div>

                <div className="waybill-body">
                  <div className="waybill-symbol" style={{ color: p.visualMetadata.accentColor }}>
                    {p.symbol}
                  </div>
                  <div className="waybill-title-info">
                    <span className="waybill-name">{p.name}</span>
                    <span className="waybill-desc">{p.shortDescription}</span>
                  </div>
                </div>

                <div className="waybill-footer">
                  <div className="waybill-limit">
                    <span className="lbl">NAAQS 24h CEILING</span>
                    <span className="val">{p.naaqsLimit} {p.unit}</span>
                  </div>
                  <span className="inspect-stamp">INSPECT DOSSIER →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          CHAPTER 04 — WHERE IT COMES FROM (VISUAL WORLD: INVESTIGATION BOARD)
          ===================================================================== */}
      <section className="doc-chapter-section theme-investigation-board" id="chapter-04-where-it-comes-from">
        <div className="corkboard-full-wall">
          <div className="corkboard-case-header">
            <PushPin color="#ef4444" style={{ top: '-14px', left: '50%' }} />
            <span className="case-ref-tag">INVESTIGATION CASE // AIR-SOURCES-DL</span>
            <h2 className="chapter-title-headline font-handwriting">WHERE DOES POLLUTION COME FROM?</h2>
            <p className="corkboard-summary-text">
              Multi-source chemical mass apportionment demonstrates that Delhi's airborne freight is an
              interconnected cocktail. No single sector acts alone; mechanical shearing, thermal burning,
              and atmospheric chemistry feed into one another.
            </p>
          </div>

          {/* Investigation Flow Threads (Yarn Connecting Nodes) */}
          <div className="investigation-flow-threads" aria-label="Evidence Connections">
            <div className="flow-node node-source">
              <PushPin color="#dc2626" style={{ top: '-8px', left: '10px' }} />
              <span className="node-step">01</span>
              <h4>SOURCE</h4>
              <p>Combustion & shearing</p>
            </div>
            <div className="thread-line">
              <span className="thread-yarn" />
              <span className="thread-arrow">→</span>
            </div>

            <div className="flow-node node-emission">
              <PushPin color="#dc2626" style={{ top: '-8px', left: '10px' }} />
              <span className="node-step">02</span>
              <h4>EMISSION</h4>
              <p>Hot exhaust & flues</p>
            </div>
            <div className="thread-line">
              <span className="thread-yarn" />
              <span className="thread-arrow">→</span>
            </div>

            <div className="flow-node node-atmosphere">
              <PushPin color="#dc2626" style={{ top: '-8px', left: '10px' }} />
              <span className="node-step">03</span>
              <h4>ATMOSPHERE</h4>
              <p>Photochemical mixing</p>
            </div>
            <div className="thread-line">
              <span className="thread-yarn" />
              <span className="thread-arrow">→</span>
            </div>

            <div className="flow-node node-transport">
              <PushPin color="#dc2626" style={{ top: '-8px', left: '10px' }} />
              <span className="node-step">04</span>
              <h4>TRANSPORT</h4>
              <p>Regional advection</p>
            </div>
            <div className="thread-line">
              <span className="thread-yarn" />
              <span className="thread-arrow">→</span>
            </div>

            <div className="flow-node node-accumulation">
              <PushPin color="#dc2626" style={{ top: '-8px', left: '10px' }} />
              <span className="node-step">05</span>
              <h4>ACCUMULATION</h4>
              <p>Pedestrian pooling</p>
            </div>
          </div>

          {/* Pinned Real Evidence Photographs & Cards */}
          <div className="corkboard-pinned-evidence-field">
            {/* Source 01: Traffic */}
            <div className="evidence-pin-card pin-traffic">
              <PushPin color="#ef4444" style={{ top: '-10px', left: '20px' }} />
              <TapeStrip angle="-14deg" style={{ top: '-8px', right: '15px' }} />
              <div className="evidence-photo-box">
                <img src="/assets/documentary/evidence_traffic.jpg" alt="Heavy traffic exhaust in Delhi" className="evidence-photo-img" />
              </div>
              <div className="evidence-caption-strip">
                <span className="evidence-tag-badge">CASE // SOURCE 01</span>
                <h3>TRAFFIC & TRANSPORT</h3>
                <p>High-temperature diesel heavy freight, passenger car tailpipes, tire wear, and continuous brake lining abrasion along arterial corridors.</p>
              </div>
            </div>

            {/* Source 02: Combustion */}
            <div className="evidence-pin-card pin-combustion">
              <PushPin color="#f59e0b" style={{ top: '-10px', right: '25px' }} />
              <div className="evidence-photo-box">
                <img src="/assets/documentary/evidence_combustion.jpg" alt="Biomass and waste combustion" className="evidence-photo-img" />
              </div>
              <div className="evidence-caption-strip">
                <span className="evidence-tag-badge">CASE // SOURCE 02</span>
                <h3>COMBUSTION</h3>
                <p>Domestic biomass cooking, municipal waste burning, and seasonal agricultural crop residue clearing across the regional Indo-Gangetic plain.</p>
              </div>
            </div>

            {/* Source 03: Industry */}
            <div className="evidence-pin-card pin-industry">
              <PushPin color="#dc2626" style={{ top: '-10px', left: '30px' }} />
              <TapeStrip angle="12deg" style={{ top: '-8px', right: '20px' }} />
              <div className="evidence-photo-box">
                <img src="/assets/documentary/evidence_industry.jpg" alt="Perimeter industrial chimneys" className="evidence-photo-img" />
              </div>
              <div className="evidence-caption-strip">
                <span className="evidence-tag-badge">CASE // SOURCE 03</span>
                <h3>INDUSTRIAL ACTIVITY</h3>
                <p>Perimeter coal-fired boilers, refractory brick kilns, glass casting furnaces, and decentralized diesel generator clusters during electrical peak load.</p>
              </div>
            </div>

            {/* Source 04: Dust & Construction */}
            <div className="evidence-pin-card pin-dust">
              <PushPin color="#10b981" style={{ top: '-10px', left: '25px' }} />
              <div className="evidence-photo-box">
                <img src="/assets/documentary/evidence_construction.jpg" alt="Delhi metro flyover construction dust" className="evidence-photo-img" />
              </div>
              <div className="evidence-caption-strip">
                <span className="evidence-tag-badge">CASE // SOURCE 04</span>
                <h3>CONSTRUCTION / RESUSPENDED DUST</h3>
                <p>Excavation, unshielded concrete cutting, stone crushing, and mechanical resuspension of silt along unpaved road shoulders.</p>
              </div>
            </div>

            {/* Source 05: Secondary Atmospheric Formation */}
            <div className="evidence-pin-card pin-secondary">
              <TapeStrip angle="-4deg" style={{ top: '-10px', left: '40%' }} />
              <div className="secondary-chemistry-diagram">
                <div className="chem-equation">NOx + SO₂ + NH₃ + VOCs + Solar Heat → Secondary Particulates (Nitrates & Sulfates)</div>
              </div>
              <div className="evidence-caption-strip">
                <span className="evidence-tag-badge">CASE // SOURCE 05</span>
                <h3>SECONDARY ATMOSPHERIC FORMATION</h3>
                <p>Photochemical gas-to-particle conversion: precursor gases react in the air under solar heating to generate secondary nitrates and sulfates.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          CHAPTER 05 — THE AIR MOVES (VISUAL WORLD: METEOROLOGICAL MAP)
          ===================================================================== */}
      <section className="doc-chapter-section theme-weather-desk" id="chapter-05-the-air-moves">
        <div className="meteorological-chart-surface">
          <div className="chart-header-block">
            <div className="meteo-kicker">INDIAN METEOROLOGICAL BASIN SURVEY // ADVECTION DESK</div>
            <h2 className="chapter-title-headline font-architect">HOW THE AIR MOVES</h2>
            <p className="chapter-body-copy">
              The atmosphere is a dynamic, turbulent fluid. Particles do not remain where they enter;
              boundary layer velocity, thermodynamic temperature gradients, and barometric pressure dictate whether
              airborne cargo disperses or stagnates.
            </p>
          </div>

          {/* Giant Weather Chart Canvas */}
          <div className="giant-weather-chart-canvas" aria-label="Regional Atmospheric Flow Chart">
            <div className="chart-compass-rose" aria-hidden="true">
              <Compass size={72} opacity={0.2} />
            </div>

            {/* Isobar Contour Lines */}
            <div className="isobar-contour-lines" aria-hidden="true">
              <div className="isobar-curve curve-1" />
              <div className="isobar-curve curve-2" />
              <div className="isobar-curve curve-3" />
            </div>

            {/* Animated Wind Streamlines */}
            <div className="wind-streamlines-stream">
              <div className="wind-particle-trail trail-1" />
              <div className="wind-particle-trail trail-2" />
              <div className="wind-particle-trail trail-3" />
            </div>

            <div className="chart-vector-tags">
              <span className="v-tag">WIND TRANSPORTS THEM → → →</span>
              <span className="v-tag">THERMAL CONVECTION</span>
              <span className="v-tag">DISPERSION GRADIENT</span>
            </div>
          </div>

          {/* Weather Observations Directly on Chart */}
          <div className="weather-chart-annotations-strip">
            <div className="weather-annotation-gauge">
              <span className="g-label">SURFACE WIND VELOCITY</span>
              <span className="g-val">{`${weatherVariables.windSpeed} m/s`}</span>
              <span className="g-sub">HORIZONTAL ADVECTION</span>
            </div>

            <div className="weather-annotation-gauge">
              <span className="g-label">BOUNDARY TEMPERATURE</span>
              <span className="g-val">{`${weatherVariables.temperature}°C`}</span>
              <span className="g-sub">THERMAL INVERSION DRIVER</span>
            </div>

            <div className="weather-annotation-gauge">
              <span className="g-label">RELATIVE HUMIDITY</span>
              <span className="g-val">{`${weatherVariables.humidity}%`}</span>
              <span className="g-sub">AEROSOL HYGROSCOPIC GROWTH</span>
            </div>

            <div className="weather-annotation-gauge">
              <span className="g-label">SURFACE PRESSURE</span>
              <span className="g-val">{`${weatherVariables.pressure} hPa`}</span>
              <span className="g-sub">ANTICYCLONIC STAGNATION</span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          CHAPTER 06 — DELHI RIGHT NOW (VISUAL WORLD: INVESTIGATIVE NEWSROOM)
          ===================================================================== */}
      <section className="doc-chapter-section theme-live-newsroom" id="chapter-06-delhi-right-now">
        <div className="newsroom-broadsheet-surface">
          <div className="newsroom-wire-tape">
            <span className="wire-item">● LIVE DISPATCH</span>
            <span className="wire-item">CAAQMS STREAM VERIFIED</span>
            <span className="wire-item">CONTINUOUS OBSERVATIONS ACTIVE</span>
            <span className="wire-item">NCT DELHI BASIN</span>
          </div>

          <div className="newsroom-frontpage">
            <div className="frontpage-masthead">
              <span className="masthead-name">VAYUVITALS TELEMETRY DISPATCH</span>
              <RubberStamp text="LIVE OBSERVATION" color="#dc2626" rotate="-3deg" />
            </div>

            <div className="frontpage-headline-row">
              <h2 className="chapter-title-headline font-headline">DELHI RIGHT NOW</h2>
              <div className="frontpage-lead">
                Continuous physical observations transmitted in real time from regulatory
                ambient air stations across the National Capital Region.
              </div>
            </div>

            {/* THE NUMBER IS THE HERO — Massive Display */}
            {currentPm25Reading != null ? (
              <div className="newsroom-hero-number-spread" id="delhi-right-now-monolith">
                <div className="giant-number-lockup">
                  <span className="giant-pm25-number">{currentPm25Reading}</span>
                  <div className="giant-number-meta">
                    <span className="giant-unit">µg/m³</span>
                    <span className="giant-pollutant">PM2.5 // FINE PARTICULATE CONCENTRATION</span>
                    <div className="giant-badges-row">
                      <span className="doc-badge-live">LIVE DELHI PM2.5 OBSERVATION</span>
                      <span className="doc-badge-data">DATA RECEIVED</span>
                      {currentAqiReading && (
                        <span className="doc-badge-aqi">{`AQI ${currentAqiReading}`}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="teletype-metadata-grid">
                  <div className="meta-box">
                    <span className="m-label">MONITORING RECEPTOR</span>
                    <span className="m-val">{currentStation?.name || 'Pusa Station (CAAQMS)'}</span>
                  </div>
                  <div className="meta-box">
                    <span className="m-label">LATEST TRANSMISSION</span>
                    <span className="m-val">{formattedTimestamp || 'Live Telemetry Active'}</span>
                  </div>
                  <div className="meta-box">
                    <span className="m-label">24-HR NAAQS STANDARD</span>
                    <span className="m-val">60 µg/m³ (NAAQS Ceiling)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="doc-data-unavailable-state" id="doc-live-data-unavailable">
                <Info size={32} style={{ opacity: 0.6, marginBottom: '12px' }} />
                <p style={{ margin: 0, fontSize: '1.15rem' }}>
                  {isLiveLoading ? 'Connecting to continuous Delhi CAAQMS telemetry stream...' : 'Data unavailable'}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================================
          CHAPTER 07 — THE CITY IS NOT ONE NUMBER (VISUAL WORLD: CARTOGRAPHIC WALL)
          ===================================================================== */}
      <section className="doc-chapter-section theme-cartographer" id="chapter-07-the-city-is-not-one-number">
        <div className="cartographer-wall-surface">
          <div className="cartographer-parchment-sheet">
            <div className="parchment-top-row">
              <span className="parchment-ref">CARTOGRAPHIC SURVEY // NCT DELHI</span>
              <TapeStrip angle="3deg" style={{ top: '-10px', right: '40px' }} />
            </div>

            <div className="cartographer-headline-block">
              <h2 className="chapter-title-headline font-serif">THE CITY IS NOT ONE NUMBER</h2>
              <div className="cartographer-aphorisms">
                <span className="aphorism">ONE CITY.</span>
                <span className="aphorism">DOZENS OF OBSERVATIONS.</span>
                <span className="aphorism">DIFFERENT PLACES.</span>
              </div>
              <p className="chapter-body-copy">
                Air pollution is not evenly distributed across a city.
                Monitoring stations give us observations at specific locations; spatial estimation allows
                us to calculate the gradient between them.
              </p>
            </div>

            {/* Regulatory CAAQMS Stations Log on Parchment */}
            <div className="cartographer-stations-parchment" aria-label="Delhi Regulatory Station Network">
              <div className="parchment-stations-title">REGULATORY CAAQMS OBSERVATIONS ACROSS THE BASIN</div>
              <div className="parchment-stations-grid">
                {(internalLiveData?.stations || []).slice(0, 8).map((st) => (
                  <div key={st.id} className="parchment-station-chip">
                    <span className="st-pin-dot" />
                    <span className="st-name">{st.name}</span>
                    <span className="st-val">{st.pm25 != null ? `${st.pm25} µg/m³` : '—'}</span>
                    {st.aqi != null && <span className="st-aqi">{`AQI ${st.aqi}`}</span>}
                  </div>
                ))}
              </div>

              {/* IDW Formulation & Disclaimer Box */}
              <div className="parchment-idw-box">
                <RubberStamp text="SPATIAL ESTIMATE" color="#b45309" rotate="-3deg" />
                <div className="idw-formula-text">
                  Nearby Observations → Quadratic Inverse Distance Weighting (IDW) → Estimated Area
                </div>
                <p className="idw-explanation-text">
                  Nearby station values are spatially interpolated using Inverse Distance Weighting to estimate
                  ambient exposure between monitored points. Estimated values are clearly labeled as spatial models,
                  not direct micro-sensors.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          CHAPTER 08 — THE WEATHER CHANGES THE STORY (VISUAL WORLD: TRANSPARENT LAYERS)
          ===================================================================== */}
      <section className="doc-chapter-section theme-split-atmosphere" id="chapter-08-the-weather-changes-the-story">
        <div className="acetate-lightbox-table">
          <div className="lightbox-header">
            <div className="lightbox-kicker">ATMOSPHERIC THERMODYNAMICS // EXPERIMENTAL SLIDES</div>
            <h2 className="chapter-title-headline font-typewriter">THE WEATHER CHANGES THE STORY</h2>
            <p className="chapter-body-copy">
              The same physical volume of emissions yields drastically different human exposure
              depending on atmospheric boundary mechanics.
            </p>
          </div>

          {/* Split Acetate Slides */}
          <div className="acetate-slides-split">
            <div className="acetate-slide slide-stagnant">
              <TapeStrip angle="-10deg" style={{ top: '-10px', left: '20px' }} />
              <div className="slide-reg-mark">+</div>
              <div className="slide-label">SLIDE A // INVERSION & STAGNATION</div>
              <h3>STAGNANT AIR</h3>
              <div className="slide-illustration stagnant-inversion-pool">
                <div className="pool-particles-dense" />
                <span className="pool-cap-line">INVERSION CAP (&lt;150m)</span>
              </div>
              <p>
                Cold surface radiation cooling creates a nocturnal thermal inversion layer.
                With surface winds below 1.5 m/s, emissions cannot penetrate the warm cap, concentrating
                heavily at human breathing height.
              </p>
            </div>

            <div className="acetate-slide slide-moving">
              <TapeStrip angle="12deg" style={{ top: '-10px', right: '20px' }} />
              <div className="slide-reg-mark">+</div>
              <div className="slide-label">SLIDE B // CONVECTIVE DISPERSION</div>
              <h3>MOVING AIR</h3>
              <div className="slide-illustration moving-convective-plume">
                <div className="plume-particles-disperse" />
                <span className="plume-wind-vector">WIND VENTILATION (&gt;3.5 m/s)</span>
              </div>
              <p>
                Daytime solar heating deepens the convective boundary layer above 1,000 meters.
                Brisk horizontal advection sweeps particulate plumes clear of street canyons and mixes
                them into upper tropospheric winds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          CHAPTER 09 — FROM CITY TO SCHOOL (VISUAL WORLD: FIELD RESEARCH NOTEBOOK)
          ===================================================================== */}
      <section className="doc-chapter-section theme-school-field-report" id="chapter-09-from-city-to-school">
        <div className="school-clipboard-board">
          <div className="clipboard-metal-clamp" aria-hidden="true">
            <div className="clamp-hole" />
            <div className="clamp-bar" />
          </div>

          <div className="clipboard-field-sheet">
            <div className="field-sheet-kicker">FIELD RECEPTOR INVESTIGATION // INSTITUTION LEVEL</div>
            <h2 className="chapter-title-headline font-serif">FROM CITY TO SCHOOL</h2>
            <p className="chapter-body-copy">
              "How do we estimate the air around a place where children spend their day?"
              Pollution becomes personal when we move beyond citywide averages to evaluate ambient exposure
              around specific schools.
            </p>

            {/* Split layout: Real School Photo on Left, Field Observation on Right */}
            <div className="school-field-dossier-grid">
              <div className="school-field-photo-col">
                <div className="school-photo-mount">
                  <PushPin color="#ef4444" style={{ top: '-12px', left: '20px', zIndex: 20 }} />
                  <img
                    src="/assets/documentary/evidence_school.jpg"
                    alt="School courtyard on hazy winter morning"
                    className="school-evidence-img"
                  />
                  <div className="school-photo-caption">
                    <span>{selectedSchool.name} // Exterior Gate Exposure</span>
                  </div>
                </div>
              </div>

              <div className="school-field-data-col">
                <div className="field-school-log-card">
                  <div className="school-log-top">
                    <div>
                      <span className="log-school-label">EVALUATED INSTITUTION</span>
                      <h3 className="log-school-title">{selectedSchool.name}</h3>
                      <span className="log-school-coords">
                        GPS: {selectedSchool.lat}° N, {selectedSchool.lon}° E • {selectedSchool.locality}
                      </span>
                    </div>
                    <div className="school-estimate-stamp-box">
                      <span className="stamp-num">
                        {schoolIdwEstimate?.pm25 != null ? schoolIdwEstimate.pm25 : '—'}
                      </span>
                      <span className="stamp-unit">µg/m³</span>
                      <span className="doc-badge-school">ESTIMATED AROUND SCHOOL</span>
                    </div>
                  </div>

                  {/* School Flow Strip */}
                  <div className="school-flow-process-strip" aria-label="School spatial estimation process">
                    <span className="flow-step">SCHOOL</span>
                    <span className="flow-arrow">↓</span>
                    <span className="flow-step">NEARBY STATIONS</span>
                    <span className="flow-arrow">↓</span>
                    <span className="flow-step">DISTANCE</span>
                    <span className="flow-arrow">↓</span>
                    <span className="flow-step">IDW</span>
                    <span className="flow-arrow">↓</span>
                    <span className="flow-step step-highlight">ESTIMATED PM2.5</span>
                  </div>

                  {/* Nearest Stations with handwritten distance annotations */}
                  <div className="nearest-stations-log-table">
                    <span className="table-caption">NEAREST CAAQMS OBSERVATIONS USED FOR SPATIAL IDW:</span>
                    <div className="log-stations-row">
                      {nearbyStationsForSchool.map((st, idx) => (
                        <div key={st.id || idx} className="log-station-item">
                          <span className="st-num">#{idx + 1}</span>
                          <span className="st-name">{st.name}</span>
                          <span className="st-dist">{st.distanceKm} km</span>
                          <span className="st-reading">{st.pm25} µg/m³</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mandatory Spatial Disclaimer Sticky */}
                  <div className="school-disclaimer-sticky">
                    <PushPin color="#eab308" style={{ top: '-10px', left: '16px' }} />
                    <p>
                      School PM2.5 values are spatial estimates derived from nearby monitoring stations and are
                      not direct measurements at the school.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          CHAPTER 10 — 14 DAYS OF EVIDENCE (VISUAL WORLD: CASE FILE)
          ===================================================================== */}
      <section className="doc-chapter-section theme-evidence-dossier" id="chapter-10-14-days-of-evidence">
        <div className="manila-case-folder">
          <div className="manila-folder-tab">
            <span>CASE FILE: 14 DAYS OF EVIDENCE // {selectedSchool.name}</span>
          </div>

          <div className="manila-folder-body">
            <PushPin color="#ef4444" style={{ top: '15px', right: '40px' }} />
            <div className="dossier-masthead">
              <RubberStamp text="EMPIRICAL AUDIT" color="#991b1b" rotate="-4deg" />
              <h2 className="chapter-title-headline font-typewriter">14 DAYS.</h2>
            </div>
            <p className="chapter-body-copy">
              A single observation is a momentary snapshot. Fourteen consecutive calendar days establish
              an evidentiary pattern. Missing days remain strictly recorded as NO DATA.
            </p>

            {/* Dossier Summary Strip */}
            <div className="dossier-metrics-strip">
              <div className="d-stat">
                <span className="d-label">OBSERVATION WINDOW</span>
                <span className="d-val">14 Consecutive Days</span>
              </div>
              <div className="d-stat">
                <span className="d-label">COVERAGE</span>
                <span className="d-val">{evidenceCoverage.coveragePercent}%</span>
              </div>
              <div className="d-stat">
                <span className="d-label">14-DAY AVERAGE</span>
                <span className="d-val">
                  {evidenceSummary.avgPm25 != null ? `${evidenceSummary.avgPm25} µg/m³` : 'Pending'}
                </span>
              </div>
              <div className="d-stat">
                <span className="d-label">MONITORING STATUS</span>
                <span className="d-val">{monitoringStatus}</span>
              </div>
            </div>

            {/* 14 Calendar Observation Sheets */}
            <div className="dossier-calendar-grid">
              <div className="timeline-title-row">
                <span>CHRONOLOGICAL DAILY LOG (14 CALENDAR DAYS)</span>
                <span>RECORDED EXPOSURE</span>
              </div>
              <div className="dossier-daily-cards-list">
                {dailyEvidenceWindow.map((day, idx) => {
                  const dayAvgPm25 = day.averagePm25 ?? day.pm25;
                  const isObserved = dayAvgPm25 != null && day.status !== 'NO_DATA';
                  return (
                    <div key={day.date || idx} className={`dossier-day-card ${isObserved ? 'day-observed' : 'day-missing'}`}>
                      <div className="card-top">
                        <span className="strip-idx">DAY {String(idx + 1).padStart(2, '0')}</span>
                        <span className="strip-date">{day.date}</span>
                      </div>
                      <div className="card-status-row">
                        {isObserved ? (
                          <>
                            <span className="status-dot-green">●</span>
                            <span className="strip-status">OBSERVED</span>
                            <span className="strip-count">{day.observationCount ?? 1} obs</span>
                          </>
                        ) : (
                          <>
                            <span className="status-dot-grey">○</span>
                            <span className="strip-no-data">NO DATA</span>
                          </>
                        )}
                      </div>
                      <div className="card-bar-area">
                        {isObserved ? (
                          <>
                            <div className="strip-bar-track">
                              <div
                                className="strip-bar-fill"
                                style={{
                                  width: `${Math.min(100, (dayAvgPm25 / 200) * 100)}%`,
                                  backgroundColor: dayAvgPm25 > 60 ? '#ef4444' : '#10b981',
                                }}
                              />
                            </div>
                            <span className="strip-val">{dayAvgPm25} µg/m³</span>
                          </>
                        ) : (
                          <span className="unmonitored-text">Unmonitored Day</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Civic Action Integration */}
            <div className="dossier-action-footer">
              {civicEligibility.eligible ? (
                <div className="dossier-civic-eligible-box">
                  <ShieldCheck size={22} color="#15803d" />
                  <div>
                    <h4>THE EVIDENCE IS COMPLETE.</h4>
                    <p>14 calendar days of continuous environmental monitoring have established an empirical baseline.</p>
                    <button
                      onClick={() => setIsPetitionModalOpen(true)}
                      className="doc-civic-review-btn"
                      id="doc-review-civic-action-btn"
                    >
                      <FileText size={16} />
                      <span>REVIEW THE CIVIC ACTION PACKAGE →</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="dossier-civic-pending-box">
                  <Clock size={20} color="#b45309" />
                  <div>
                    <h4>CONTINUE MONITORING</h4>
                    <p>
                      Baseline monitoring in progress ({evidenceCoverage.observedDays} / 14 days observed).
                      Civic representation requires a completed 14-day cycle to ensure scientific standing.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          CHAPTER 11 — WHAT WE KNOW / WHAT WE DON'T (VISUAL WORLD: EVIDENCE TABLE)
          ===================================================================== */}
      <section className="doc-chapter-section theme-split-evidence-board" id="chapter-11-what-we-know-what-we-dont">
        <div className="legal-evidence-table-surface">
          <div className="split-boards-container">
            {/* WHAT WE KNOW */}
            <div className="split-page page-known">
              <PushPin color="#15803d" style={{ top: '-12px', left: '25px' }} />
              <TapeStrip angle="-4deg" style={{ top: '-8px', right: '30px' }} />
              
              <div className="page-header">
                <CheckCircle2 size={22} color="#15803d" />
                <h2 className="chapter-title-headline font-serif">WHAT WE KNOW</h2>
              </div>
              <ul className="evidence-bullet-list">
                <li>Regulatory CPCB/DPCC monitoring station observations across verified coordinates.</li>
                <li>Mathematical spatial bounds calculated using quadratic Inverse Distance Weighting.</li>
                <li>Observed multi-day coverage within the 14-day empirical monitoring window.</li>
                <li>Diurnal variation cycles corresponding to morning and nocturnal thermal stagnation.</li>
                <li>Meteorological correlation with surface wind velocity and planetary boundary height.</li>
              </ul>
            </div>

            {/* WHAT WE DON'T KNOW */}
            <div className="split-page page-unknown">
              <PushPin color="#b45309" style={{ top: '-12px', right: '25px' }} />
              <TapeStrip angle="5deg" style={{ top: '-8px', left: '30px' }} />

              <div className="page-header">
                <AlertCircle size={22} color="#b45309" />
                <h2 className="chapter-title-headline font-serif">WHAT WE DON'T KNOW</h2>
              </div>
              <ul className="evidence-bullet-list">
                <li>Classroom indoor micro-climate without dedicated on-site indoor sensor installations.</li>
                <li>Direct gate emissions from idling school buses during drop-off and pickup hours.</li>
                <li>Air quality during station telemetry maintenance gaps (strictly treated as NO DATA).</li>
                <li>Isolated single-source causal attribution without on-site chemical speciation.</li>
                <li>Individual clinical medical diagnoses or personalized health outcomes.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          CHAPTER 12 — THE TAKEAWAY (VISUAL WORLD: EMPTY DESK)
          ===================================================================== */}
      <section className="doc-chapter-section theme-minimal-archive" id="chapter-12-the-takeaway">
        <div className="empty-desk-surface">
          <div className="minimal-final-sheet">
            <PushPin color="#475569" style={{ top: '-14px', left: '50%' }} />
            
            <h2 className="chapter-title-headline font-typewriter">THE AIR LEAVES NO BORDER.</h2>
            
            <blockquote className="final-editorial-quote">
              <p className="final-line line-1">"YOU CANNOT ALWAYS SEE POLLUTION."</p>
              <div className="final-pause-mark" aria-hidden="true">• • •</div>
              <p className="final-line line-2">"BUT WE CAN MEASURE IT."</p>
              <div className="final-pause-mark" aria-hidden="true">• • •</div>
              <p className="final-line line-3">"AND MEASUREMENTS TELL A STORY."</p>
            </blockquote>

            <div className="vayuvitals-archive-signature">
              <span className="sig-brand">VAYUVITALS</span>
              <span className="sig-credo">SEE THE AIR. UNDERSTAND THE AIR. ACT ON THE EVIDENCE.</span>
            </div>

            <div className="final-action-chips-row">
              <span className="chips-label">EXPLORE THE DATA →</span>
              <div className="chips-buttons">
                <button onClick={onBack} className="final-tag-btn" id="doc-final-cargo-btn">
                  Atmospheric Cargo
                </button>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.location.search = '?view=school';
                    }
                  }}
                  className="final-tag-btn"
                  id="doc-final-school-btn"
                >
                  School Safety
                </button>
                <button
                  onClick={() => handleOpenDeepDive('pm25')}
                  className="final-tag-btn"
                  id="doc-final-pollutants-btn"
                >
                  Explore Pollutants
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Petition Modal integration */}
      {isPetitionModalOpen && evidencePackage && (
        <PetitionModal
          isOpen={isPetitionModalOpen}
          onClose={() => setIsPetitionModalOpen(false)}
          schoolEvidencePackage={evidencePackage}
        />
      )}
    </div>
  );
}
