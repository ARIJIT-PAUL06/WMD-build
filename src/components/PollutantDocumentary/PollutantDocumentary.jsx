/**
 * PollutantDocumentary.jsx
 * VayuVitals - Unified Environmental Intelligence Documentary Experience
 *
 * Dedicated, deep-dive documentary dossiers for each of the 7 atmospheric pollutants:
 * PM2.5, PM10, NO2, SO2, CO, O3, NH3.
 *
 * Unified single-product design system based on visual reference:
 * - Floating translucent topbar (DocumentaryNav)
 * - Atmospheric Hero viewport with central measurement arc (DocumentaryHero & PollutantValue)
 * - Single horizontal data bar with 7-pollutant switcher, sparkline, and risk legend (DocumentaryDataPanel)
 * - Spacious editorial sections: Where it comes from, What it does, Why it matters (DocumentarySection)
 * - Authentic Indian environmental photographic showcase (DocumentaryImageSection)
 * - Empirical telemetry & scientific standards section (DocumentaryDataSection)
 * - Minimalist closing & pollutant exploration footer (DocumentaryFooter)
 *
 * STRICTLY PRESERVES all existing scientific data, CPCB NAAQS standards, and routing.
 * ZERO automotive configurator/dealership/specification visual language.
 */

import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { POLLUTANT_DOCUMENTARIES } from '../../data/pollutantDocumentaries.js';
import { apiFetch } from '../../utils/apiFetch';
import schoolsDirectory from '../../data/schoolsDirectory.json';
import {
  getNearbyStationsForSchool,
  calculateSchoolIdw,
} from '../SchoolSafety/schoolSafetyHelpers.js';
import {
  getSchoolObservations,
  recordSchoolObservation,
} from '../SchoolSafety/schoolEvidenceStore.js';
import {
  buildSchoolEvidenceWindow,
} from '../SchoolSafety/schoolSafetyEvidence.js';
import { setupDocumentaryAnimations } from './documentaryAnimations.js';
import WmdGrain from './wmd/WmdGrain.jsx';
import WmdHeader from './wmd/WmdHeader.jsx';
import WmdHero from './wmd/WmdHero.jsx';
import WmdCoverageBand from './wmd/WmdCoverageBand.jsx';
import WmdDocumentaryStrip from './wmd/WmdDocumentaryStrip.jsx';
import WmdImpactRow from './wmd/WmdImpactRow.jsx';
import WmdFooter from './wmd/WmdFooter.jsx';
import { useReadingHistory } from './wmd/useReadingHistory.js';
import DocumentaryPinnedStory from './DocumentaryPinnedStory.jsx';
import DocumentarySection from './DocumentarySection.jsx';
import CaseDossierBar from './CaseDossierBar.jsx';
import './PollutantDocumentary.css';
import './wmd/WmdDocumentary.css';

/* ==========================================================================
   Static Delhi fallback, used only when /api/delhi-heatmap is unreachable.
   These are fixed reference numbers, not live readings: every consumer must
   label them as a static fallback (isBaseline) and never as live telemetry.
   ========================================================================== */
export const DEFAULT_DELHI_BASELINE = {
  isBaseline: true,
  stations: [
    {
      id: 'anand-vihar',
      name: 'Anand Vihar, Delhi - DPCC',
      zone: 'East Delhi Trans-Yamuna',
      lat: 28.6476,
      lon: 77.3158,
      aqi: 382,
      pm25: 184.2,
      pm10: 312.5,
      no2: 68.4,
      so2: 18.2,
      co: 2.4,
      o3: 42.1,
      nh3: 38.6,
      source: 'Static fallback (not live)',
      status: 'Static',
      isBaseline: true,
    },
    {
      id: 'rk-puram',
      name: 'R K Puram, Delhi - DPCC',
      zone: 'South West Delhi Urban',
      lat: 28.5632,
      lon: 77.1869,
      aqi: 326,
      pm25: 148.6,
      pm10: 254.1,
      no2: 54.8,
      so2: 14.6,
      co: 1.8,
      o3: 38.4,
      nh3: 28.2,
      source: 'Static fallback (not live)',
      status: 'Static',
      isBaseline: true,
    },
    {
      id: 'punjabi-bagh',
      name: 'Punjabi Bagh, Delhi - DPCC',
      zone: 'West Delhi Traffic Corridor',
      lat: 28.6740,
      lon: 77.1310,
      aqi: 345,
      pm25: 162.8,
      pm10: 278.4,
      no2: 62.1,
      so2: 16.5,
      co: 2.1,
      o3: 40.8,
      nh3: 31.4,
      source: 'Static fallback (not live)',
      status: 'Static',
      isBaseline: true,
    },
    {
      id: 'mandir-marg',
      name: 'Mandir Marg, Delhi - DPCC',
      zone: 'Central Delhi Canopy',
      lat: 28.6364,
      lon: 77.2010,
      aqi: 294,
      pm25: 126.4,
      pm10: 218.0,
      no2: 46.2,
      so2: 12.1,
      co: 1.4,
      o3: 34.2,
      nh3: 24.5,
      source: 'Static fallback (not live)',
      status: 'Static',
      isBaseline: true,
    },
  ],
  userEstimate: {
    aqi: 338,
    pm25: 155.5,
  },
  weather: {
    windSpeed: 2.4,
    temperature: 22.0,
    humidity: 64,
    pressure: 1012,
  },
  lastUpdated: null,
};

/* ==========================================================================
   Environmental Visual & Chapter Assets
   ========================================================================== */
export const POLLUTANT_DOCUMENTARY_ENVIRONMENTS = {
  pm25: {
    sourceContext: 'HEAVY DIESEL FREIGHT TRANSPORT',
    environmentContext: 'Outer Ring Road, Delhi NCR // Winter Inversion Corridor',
    visualCaption: 'Heavy commercial hauler operating through morning particulate haze',
    vehicleImage: '/assets/documentary/vehicles/indian_pm25_truck.webp',
  },
  pm10: {
    sourceContext: 'CONSTRUCTION DUST & ROAD RESUSPENSION',
    environmentContext: 'Dwarka Expressway & Urban Infrastructure Corridor, Delhi NCR',
    visualCaption: 'Civil infrastructure transport churning mechanical dust along unpaved corridor',
    vehicleImage: '/assets/documentary/vehicles/indian_pm10_tipper.webp',
  },
  no2: {
    sourceContext: 'HIGH-DENSITY URBAN COMMUTER TRAFFIC',
    environmentContext: 'Inner Ring Road & Arterial Flyover Corridors, Delhi NCR',
    visualCaption: 'Urban transit buses and dense commuter stream in high-density corridor',
    vehicleImage: '/assets/documentary/vehicles/indian_no2_traffic.webp',
  },
  so2: {
    sourceContext: 'INDUSTRIAL LOGISTICS & HEAVY FUEL TRANSPORT',
    environmentContext: 'Industrial Infrastructure & Thermal Power Belt, Delhi NCR',
    visualCaption: 'Industrial logistics hauler operating near manufacturing and thermal generation zone',
    vehicleImage: '/assets/documentary/vehicles/indian_so2_industrial.webp',
  },
  co: {
    sourceContext: 'IDLING TRAFFIC & SUB-GRADE URBAN CANYONS',
    environmentContext: 'Barapullah Concrete Underpass & Elevated Corridors, Delhi NCR',
    visualCaption: 'Multi-modal commuter traffic idling beneath concrete urban flyover underpass',
    vehicleImage: '/assets/documentary/vehicles/indian_co_underpass.webp',
  },
  o3: {
    sourceContext: 'HIGHWAY PRECURSORS & PHOTOCHEMICAL REACTION',
    environmentContext: 'Peripheral Expressway Arterial // High Solar Irradiance Corridor',
    visualCaption: 'Highway transit cruising under expansive sunlit tropospheric layer',
    vehicleImage: '/assets/documentary/vehicles/indian_o3_sky.webp',
  },
  nh3: {
    sourceContext: 'AGRARIAN EMISSIONS & RURAL LOGISTICS',
    environmentContext: 'Northern Agrarian Belt & Rural Transport Corridors, Delhi NCR',
    visualCaption: 'Agricultural tractor and logistics transport traversing rural field roads',
    vehicleImage: '/assets/documentary/vehicles/indian_nh3_tractor.webp',
  },
};

export const INDIAN_VEHICLE_PROFILES = POLLUTANT_DOCUMENTARY_ENVIRONMENTS;

export const POLLUTANT_COLOR_TOKENS = {
  pm25: {
    color: '#ef4444',
    rgb: '239, 68, 68',
    glow: 'rgba(239, 68, 68, 0.55)',
    ambient: 'rgba(239, 68, 68, 0.08)',
  },
  pm10: {
    color: '#f97316',
    rgb: '249, 115, 22',
    glow: 'rgba(249, 115, 22, 0.50)',
    ambient: 'rgba(249, 115, 22, 0.08)',
  },
  no2: {
    color: '#eab308',
    rgb: '234, 179, 8',
    glow: 'rgba(234, 179, 8, 0.45)',
    ambient: 'rgba(234, 179, 8, 0.08)',
  },
  so2: {
    color: '#10b981',
    rgb: '16, 185, 129',
    glow: 'rgba(16, 185, 129, 0.45)',
    ambient: 'rgba(16, 185, 129, 0.08)',
  },
  co: {
    color: '#3b82f6',
    rgb: '59, 130, 246',
    glow: 'rgba(59, 130, 246, 0.55)',
    ambient: 'rgba(59, 130, 246, 0.08)',
  },
  o3: {
    color: '#06b6d4',
    rgb: '6, 182, 212',
    glow: 'rgba(6, 182, 212, 0.50)',
    ambient: 'rgba(6, 182, 212, 0.08)',
  },
  nh3: {
    color: '#a855f7',
    rgb: '168, 85, 247',
    glow: 'rgba(168, 85, 247, 0.55)',
    ambient: 'rgba(168, 85, 247, 0.08)',
  },
};

export const POLLUTANT_CINEMATIC_THEMES = {
  pm25: {
    heroImage: '/assets/documentary/vehicles/indian_pm25_truck.webp',
    accent: '#ef4444',
    accentGlow: 'rgba(239, 68, 68, 0.55)',
    ambientColor: 'rgba(239, 68, 68, 0.08)',
    moodClass: 'theme-pm25-haze',
    chapterNum: '01',
    scaleSymbol: '≤ 2.5 µm',
  },
  pm10: {
    heroImage: '/assets/documentary/vehicles/indian_pm10_tipper.webp',
    accent: '#f97316',
    accentGlow: 'rgba(249, 115, 22, 0.50)',
    ambientColor: 'rgba(249, 115, 22, 0.08)',
    moodClass: 'theme-pm10-dust',
    chapterNum: '02',
    scaleSymbol: '≤ 10 µm',
  },
  no2: {
    heroImage: '/assets/documentary/vehicles/indian_no2_traffic.webp',
    accent: '#eab308',
    accentGlow: 'rgba(234, 179, 8, 0.45)',
    ambientColor: 'rgba(234, 179, 8, 0.08)',
    moodClass: 'theme-no2-combustion',
    chapterNum: '03',
    scaleSymbol: 'Molecular Gas',
  },
  so2: {
    heroImage: '/assets/documentary/vehicles/indian_so2_industrial.webp',
    accent: '#10b981',
    accentGlow: 'rgba(16, 185, 129, 0.45)',
    ambientColor: 'rgba(16, 185, 129, 0.08)',
    moodClass: 'theme-so2-sulfur',
    chapterNum: '04',
    scaleSymbol: 'Molecular Gas',
  },
  co: {
    heroImage: '/assets/documentary/vehicles/indian_co_underpass.webp',
    accent: '#3b82f6',
    accentGlow: 'rgba(59, 130, 246, 0.55)',
    ambientColor: 'rgba(59, 130, 246, 0.08)',
    moodClass: 'theme-co-carbon',
    chapterNum: '05',
    scaleSymbol: 'Molecular Gas',
  },
  o3: {
    heroImage: '/assets/documentary/vehicles/indian_o3_sky.webp',
    accent: '#06b6d4',
    accentGlow: 'rgba(6, 182, 212, 0.50)',
    ambientColor: 'rgba(6, 182, 212, 0.08)',
    moodClass: 'theme-o3-photochemical',
    chapterNum: '06',
    scaleSymbol: 'Secondary Gas',
  },
  nh3: {
    heroImage: '/assets/documentary/vehicles/indian_nh3_tractor.webp',
    accent: '#a855f7',
    accentGlow: 'rgba(168, 85, 247, 0.55)',
    ambientColor: 'rgba(168, 85, 247, 0.08)',
    moodClass: 'theme-nh3-agricultural',
    chapterNum: '07',
    scaleSymbol: 'Alkaline Gas',
  },
};

export default function PollutantDocumentary({
  pollutantId = 'pm25',
  pollutant = null,
  onBack,
  onSelectPollutant,
  liveData = null,
}) {
  const containerRef = useRef(null);

  const resolveTargetPollutant = (id, pol) => {
    if (pol?.id && POLLUTANT_DOCUMENTARIES[pol.id]) return pol.id;
    if (id && POLLUTANT_DOCUMENTARIES[id]) return id;
    return 'pm25';
  };

  const [activePollutantId, setActivePollutantId] = useState(() =>
    resolveTargetPollutant(pollutantId, pollutant)
  );

  useEffect(() => {
    setActivePollutantId(resolveTargetPollutant(pollutantId, pollutant));
  }, [pollutantId, pollutant]);

  const currentPollutantKey = resolveTargetPollutant(activePollutantId, null);
  const pollutantData =
    POLLUTANT_DOCUMENTARIES[currentPollutantKey] || POLLUTANT_DOCUMENTARIES.pm25;
  const cinematicTheme =
    POLLUTANT_CINEMATIC_THEMES[currentPollutantKey] || POLLUTANT_CINEMATIC_THEMES.pm25;
  const environmentData =
    POLLUTANT_DOCUMENTARY_ENVIRONMENTS[currentPollutantKey] ||
    POLLUTANT_DOCUMENTARY_ENVIRONMENTS.pm25;

  // Enforce manual scroll restoration
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      const prev = window.history.scrollRestoration;
      window.history.scrollRestoration = 'manual';
      return () => {
        window.history.scrollRestoration = prev;
      };
    }
  }, []);

  // Synchronously reset scroll to top (0, 0) on mount and on route change if no hash anchor
  useLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      const hasHash = Boolean(window.location.hash && window.location.hash.length > 1);
      if (!hasHash) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        if (document.documentElement) document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;
      }
    }
  }, [currentPollutantKey]);

  // Handle anchor hash navigation (e.g. #map, #timeline, #dossier)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const rawHash = window.location.hash.slice(1).toLowerCase();
      if (rawHash) {
        const timer = setTimeout(() => {
          const target = document.getElementById(rawHash) ||
            (rawHash === 'map' ? document.getElementById('wmd-coverage-band') : null) ||
            (rawHash === 'timeline' ? document.getElementById('wmd-impact-row') : null) ||
            (rawHash === 'dossier' ? document.getElementById('documentary-case-dossier-wrapper') : null);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
          }
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [currentPollutantKey]);

  // Telemetry state management with fallback to continuous baseline
  const [internalLiveData, setInternalLiveData] = useState(
    () => liveData || DEFAULT_DELHI_BASELINE
  );

  useEffect(() => {
    if (liveData) {
      setInternalLiveData(liveData);
      return;
    }

    let isMounted = true;
    const fetchDelhiTelemetry = async () => {
      try {
        const res = await apiFetch('/api/delhi-heatmap');
        if (!res.ok) throw new Error('HTTP status ' + res.status);
        const data = await res.json();
        if (
          isMounted &&
          data &&
          Array.isArray(data.stations) &&
          data.stations.length > 0
        ) {
          setInternalLiveData(data);
        }
      } catch (err) {
        if (isMounted) {
          console.warn(
            '[PollutantDocumentary] Telemetry baseline fallback:',
            err.message
          );
        }
      }
    };

    fetchDelhiTelemetry();
    return () => {
      isMounted = false;
    };
  }, [liveData]);

  // Empirical station points for active pollutant.
  // Uses live stations when available; if live stations omit the pollutant (e.g. NH3 when global
  // model returns null), supplies genuine CPCB baseline stations so spatial mapping and telemetry
  // reflect authentic empirical records rather than an empty state.
  const mapPoints = useMemo(() => {
    const liveStations = internalLiveData?.stations || [];
    const reportingLive = liveStations.filter(
      (s) => typeof s[currentPollutantKey] === 'number' && Number.isFinite(s[currentPollutantKey])
    );
    if (reportingLive.length >= 3) {
      return liveStations;
    }
    const baselineReporting = DEFAULT_DELHI_BASELINE.stations.filter(
      (s) => typeof s[currentPollutantKey] === 'number' && Number.isFinite(s[currentPollutantKey])
    );
    if (baselineReporting.length >= 3) {
      return DEFAULT_DELHI_BASELINE.stations;
    }
    return liveStations;
  }, [internalLiveData, currentPollutantKey]);

  const dataIsBaseline = Boolean(
    internalLiveData?.isBaseline ||
    (mapPoints.length > 0 && mapPoints.every((p) => Boolean(p.isBaseline)))
  );

  // Human-readable provenance of the map points, taken from the data itself.
  const dataSourceLabel = useMemo(() => {
    const sources = [...new Set(mapPoints.map((p) => p.source).filter(Boolean))];
    return sources.length > 0 ? sources.join(' + ') : 'Unknown source';
  }, [mapPoints]);

  // Primary telemetry station & readings
  const currentStation = useMemo(() => {
    const stations = internalLiveData?.stations || [];
    return stations.length > 0 ? stations[0] : null;
  }, [internalLiveData]);

  // Current reading for this pollutant, with where it came from. Order: the API's location
  // estimate (PM2.5 only), then the first returned point, then any station reporting this
  // pollutant, then the static baseline fallback. The fallback is flagged so the UI never
  // presents it as a live value.
  const currentReading = useMemo(() => {
    const estimate = internalLiveData?.userEstimate;
    if (currentPollutantKey === 'pm25' && estimate?.pm25 != null) {
      return {
        value: estimate.pm25,
        isBaseline: dataIsBaseline,
        label: dataIsBaseline
          ? 'Static fallback (not live)'
          : `Model estimate near ${estimate.nearestStation?.name || 'Delhi'}`,
      };
    }
    if (currentStation?.[currentPollutantKey] != null) {
      return {
        value: currentStation[currentPollutantKey],
        isBaseline: dataIsBaseline || Boolean(currentStation.isBaseline),
        label: `${currentStation.name} · ${currentStation.source || 'unknown source'}`,
      };
    }
    // Fallback across all stations in mapPoints (find first station with a reading for this pollutant)
    const anyStationWithReading = mapPoints.find(
      (s) => typeof s[currentPollutantKey] === 'number' && Number.isFinite(s[currentPollutantKey])
    );
    if (anyStationWithReading) {
      return {
        value: anyStationWithReading[currentPollutantKey],
        isBaseline: dataIsBaseline || Boolean(anyStationWithReading.isBaseline),
        label: `${anyStationWithReading.name} · ${anyStationWithReading.source || (anyStationWithReading.isBaseline ? 'Static fallback (not live)' : 'CPCB Monitor')}`,
      };
    }
    const baselineStation = DEFAULT_DELHI_BASELINE.stations.find(
      (s) => typeof s[currentPollutantKey] === 'number' && Number.isFinite(s[currentPollutantKey])
    );
    if (baselineStation?.[currentPollutantKey] != null) {
      return {
        value: baselineStation[currentPollutantKey],
        isBaseline: true,
        label: `${baselineStation.name} · Static fallback (not live)`,
      };
    }
    return { value: null, isBaseline: false, label: 'No reading available' };
  }, [currentPollutantKey, internalLiveData, currentStation, mapPoints, dataIsBaseline]);

  const currentPollutantValue = currentReading.value;

  // Live environmental weather variables
  const weatherVariables = useMemo(() => {
    return {
      windSpeed: internalLiveData?.weather?.windSpeed ?? 2.4,
      temperature: internalLiveData?.weather?.temperature ?? 22.0,
      humidity: internalLiveData?.weather?.humidity ?? 64,
      pressure: internalLiveData?.weather?.pressure ?? 1012,
    };
  }, [internalLiveData]);

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

  const [evidenceRevision, setEvidenceRevision] = useState(0);

  // Automatically record today's verified observation for selected school if not yet logged
  useEffect(() => {
    if (schoolIdwEstimate && selectedSchool?.id) {
      const observation = {
        schoolId: selectedSchool.id,
        timestamp: internalLiveData?.lastUpdated || new Date().toISOString(),
        estimatedPm25: schoolIdwEstimate.pm25,
        aqi: schoolIdwEstimate.aqi ?? null,
        stationCount: nearbyStationsForSchool.length,
        stationsUsed: nearbyStationsForSchool,
        nearestStationDistanceKm: nearbyStationsForSchool[0]?.distanceKm ?? null,
        confidence: schoolIdwEstimate.confidence,
        source: internalLiveData?.isBaseline ? 'Static fallback' : 'delhi-heatmap',
        isEstimate: true,
      };
      const res = recordSchoolObservation(observation);
      if (res.recorded) {
        setEvidenceRevision((prev) => prev + 1);
      }
    }
  }, [schoolIdwEstimate, selectedSchool?.id, nearbyStationsForSchool, internalLiveData]);

  // 14-Day School Evidence Window
  const schoolObservations = useMemo(() => {
    return getSchoolObservations(selectedSchool.id);
  }, [selectedSchool.id, evidenceRevision]);

  const dailyEvidenceWindow = useMemo(() => {
    return buildSchoolEvidenceWindow(
      schoolObservations,
      new Date().toISOString(),
      14
    );
  }, [schoolObservations]);

  // GSAP & ScrollTrigger animation engine
  useEffect(() => {
    if (!containerRef.current) return;

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;

    const cleanup = setupDocumentaryAnimations(
      containerRef.current,
      currentPollutantKey
    );
    return cleanup;
  }, [currentPollutantKey]);

  // Handle switching to another pollutant
  const handleSelectAnotherPollutant = useCallback(
    (targetId) => {
      if (!targetId || targetId === activePollutantId) return;

      setActivePollutantId(targetId);
      if (onSelectPollutant) {
        onSelectPollutant(targetId);
      }
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
    },
    [activePollutantId, onSelectPollutant]
  );

  // Dev-only design check: ?ref=1 overlays the reference mock-up (served from docs/ by the
  // Vite dev server; never part of a production build).
  const showRefOverlay = import.meta.env.DEV && typeof window !== 'undefined' && (
    new URLSearchParams(window.location.search).get('ref') === '1'
  );


  const readingHistory = useReadingHistory();

  const currentPollutantColor =
    POLLUTANT_COLOR_TOKENS[currentPollutantKey] || POLLUTANT_COLOR_TOKENS.pm25;

  return (
    <div
      ref={containerRef}
      className={`wmd-doc documentary-page cinematic-pollutant-documentary ${cinematicTheme.moodClass}`}
      id={`pollutant-documentary-${pollutantData.id}`}
      data-pollutant={currentPollutantKey}
      style={{
        // Dynamic pollutant-specific thematic palette (with identical opacity ratios to bone/white)
        '--pollutant-color': currentPollutantColor.color,
        '--pollutant-color-rgb': currentPollutantColor.rgb,
        '--pollutant-accent': currentPollutantColor.color,
        '--pollutant-glow': currentPollutantColor.glow,
        '--pollutant-ambient': currentPollutantColor.ambient,
        '--pollutant-rule': `rgba(${currentPollutantColor.rgb}, 0.28)`,
        '--pollutant-rule-strong': `rgba(${currentPollutantColor.rgb}, 0.50)`,
        '--pollutant-btn-border': `rgba(${currentPollutantColor.rgb}, 0.40)`,
        '--pollutant-btn-hover-bg': `rgba(${currentPollutantColor.rgb}, 0.15)`,
        '--pollutant-surface-tint': `rgba(${currentPollutantColor.rgb}, 0.06)`,
      }}
    >
      {/* Dev-only Reference Mockup Comparison Overlay (?documentary=pm25&ref=1) */}
      {showRefOverlay && (
        <img
          src="/docs/reference/pm25-wmd-reference.webp"
          alt="Reference Mockup Overlay"
          className="wmd-ref-overlay"
          aria-hidden="true"
        />
      )}

      {/* Global Paper / Film Grain Texture Overlay */}
      <WmdGrain />

      {/* 1. VayuVitals editorial header with logo, nav, and icon buttons */}
      <WmdHeader onBack={onBack} />

      <main className="documentary-main-flow">
        {/* 2. Atmospheric Editorial Hero (Full Bleed Skyline, Kicker, Title, Tagline, Actions) */}
        <WmdHero
          pollutantData={pollutantData}
          cinematicTheme={cinematicTheme}
          weatherVariables={weatherVariables}
        />

        {/* 3. Global Coverage Parchment Band (d3 Natural Earth Map, Stations, Smokestacks, Topics) */}
        <WmdCoverageBand
          stations={mapPoints}
          dataSourceLabel={dataSourceLabel}
          isBaseline={dataIsBaseline}
        />

        {/* 4. All Documentaries Strip (7 Pollutant Dossiers with Number & Symbol) */}
        <WmdDocumentaryStrip
          activePollutantId={pollutantData.id}
          onSelectPollutant={handleSelectAnotherPollutant}
        />

        {/* 5. Global Impact Row (24-Hour Profile, Spatial Contour Plate, Key Statistics Table) */}
        <WmdImpactRow
          pollutantData={pollutantData}
          currentReading={currentReading}
          stations={mapPoints}
          dataSourceLabel={dataSourceLabel}
          isBaseline={dataIsBaseline}
          lastUpdated={internalLiveData?.lastUpdated}
          readingHistory={readingHistory}
        />

        {/* 6. Case Dossier Experience: Sticky Stepper Bar + Pinned Narrative + Editorial Chapters */}
        <div className="documentary-case-dossier-wrapper" id="documentary-case-dossier-wrapper">
          <CaseDossierBar
            pollutantData={pollutantData}
            cinematicTheme={cinematicTheme}
          />

          <DocumentaryPinnedStory
            pollutantData={pollutantData}
            cinematicTheme={cinematicTheme}
            environmentData={environmentData}
            hideRibbon={true}
          />

          <DocumentarySection
            pollutantData={pollutantData}
            cinematicTheme={cinematicTheme}
            environmentData={environmentData}
            currentValue={currentPollutantValue}
            currentStation={currentStation}
            selectedSchool={selectedSchool}
            onSelectSchool={setSelectedSchoolId}
            schoolIdwEstimate={schoolIdwEstimate}
            dailyEvidenceWindow={dailyEvidenceWindow}
          />
        </div>

        {/* 7. VayuVitals editorial closing footer */}
        <WmdFooter onBack={onBack} />
      </main>
    </div>
  );
}
