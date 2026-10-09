import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set public Mapbox access token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

import {
  Navigation,
  Crosshair,
  Compass,
  Layers,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  Sliders,
  Maximize2,
  Search,
  MapPin,
  Globe,
  Map as MapIcon,
  Radio,
  LocateFixed,
  Locate,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Activity,
  FileText,
  ShieldCheck,
  Menu,
  X,
  Building2
} from 'lucide-react';
const PetitionModal = React.lazy(() => import('../Petition/PetitionModal'));
const AutonomousMonitorModal = React.lazy(() => import('../Dashboard/AutonomousMonitorModal'));
import AnimatedCounter from '../common/AnimatedCounter';

// Import official India national boundary GeoJSON (MultiPolygon covering mainland + islands)
import indiaBoundaryGeoJson from '../../data/indiaBoundary.json';
// Import 108 nationwide ground/CAAQMS monitoring stations across all Indian states
import initialIndiaStations from '../../data/indiaStations.json';

export { MAPBOX_DARK_STYLE } from './heatmapConstants.js';
import {
  MAPBOX_DARK_STYLE,
  INDIA_RASTER_BOUNDS,
  INDIA_RASTER_COORDINATES,
  INDIA_REGION_PRESETS,
  SEAMLESS_AQI_STOPS
} from './heatmapConstants.js';
import {
  latToMercatorY,
  mercatorYToLat,
  calculateDistanceKm,
  createGeoJsonCircle,
  calculateUncappedAqi,
  interpolateSeamlessRgb,
  drawIndiaBoundaryPath,
  getIndiaBoundaryMask,
  computeRawSpatialGrid,
  sampleRasterGridVal,
  calculateAdaptiveRange,
  renderSeamlessRasterImage,
  getPollutantValue,
  getPollutantMeta,
  getAqiColor
} from './heatmapRasterUtils.js';
import AqiSporeAura from './AqiSporeAura.jsx';
import HeatmapSearchBar from './HeatmapSearchBar.jsx';
import HeatmapControlsDeck from './HeatmapControlsDeck.jsx';
import HeatmapMobileDrawer from './HeatmapMobileDrawer.jsx';
import HeatmapTelemetryHud from './HeatmapTelemetryHud.jsx';

export default function DelhiAqiHeatmap({ onDrawerChange } = {}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const syncStationPinsRef = useRef(null);
  const isSectionOnScreenRef = useRef(true);
  const userMarkerRef = useRef(null);
  const targetMarkerRef = useRef(null);
  const lastInspectedCoordsRef = useRef(null);
  const pendingSearchTargetRef = useRef(null);
  const userRequestedZoomRef = useRef(false);
  const handleSelectSearchedPlaceRef = useRef(null);

  // Safe Mapbox token missing & error detection
  const [isTokenMissing, setIsTokenMissing] = useState(() => {
    const envToken = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_MAPBOX_TOKEN || '') : '';
    return !(mapboxgl.accessToken || envToken);
  });
  const [mapInitError, setMapInitError] = useState(null);
  const [tempTokenInput, setTempTokenInput] = useState('');

  const handleApplyTempToken = () => {
    const trimmed = tempTokenInput.trim();
    if (trimmed) {
      mapboxgl.accessToken = trimmed;
      setIsTokenMissing(false);
      setMapInitError(null);
    }
  };

  // 108 Nationwide stations state across all states and union territories
  const [stations, setStations] = useState(initialIndiaStations);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('Fetching live national telemetry...');

  // Dynamic map loading & electric CRT TV boot state
  const [showMap, setShowMap] = useState(false);
  const [isTvTurningOn, setIsTvTurningOn] = useState(false);
  const [uiBootStage, setUiBootStage] = useState(0); // 0 = hidden, 1 = left-to-right flicker cascade, 2 = settled
  const hasTriggeredActivationRef = useRef(false);

  // Helper for glass panel background wipe & flicker
  const getPanelClass = useCallback(() => {
    if (uiBootStage === 0 && !isTokenMissing) return 'crt-ui-hidden';
    if (uiBootStage === 1 && !isTokenMissing) return 'crt-panel-flicker';
    return '';
  }, [uiBootStage, isTokenMissing]);

  // Helper for button flicker class
  const getBtnFlickerClass = useCallback(() => {
    if (uiBootStage === 0 && !isTokenMissing) return 'crt-ui-hidden';
    if (uiBootStage === 1 && !isTokenMissing) return 'crt-btn-flicker';
    return '';
  }, [uiBootStage, isTokenMissing]);

  // Helper for sequential left-to-right button flicker timing
  const getBtnFlickerStyle = useCallback((delayMs) => {
    if (uiBootStage === 0 && !isTokenMissing) return { opacity: 0, visibility: 'hidden' };
    if (uiBootStage === 1 && !isTokenMissing) return { animationDelay: `${delayMs}ms` };
    return {};
  }, [uiBootStage, isTokenMissing]);

  const triggerMapActivation = useCallback(() => {
    if (hasTriggeredActivationRef.current) return;
    hasTriggeredActivationRef.current = true;
    setShowMap(true);
    setIsTvTurningOn(true);
    setUiBootStage(0); // UI hidden while CRT ignites

    // At 800ms: The CRT phosphor raster has bloomed and the map is rotating.
    // Glass panels wipe/flicker first, then buttons flicker from left to right!
    setTimeout(() => {
      setUiBootStage(1);
    }, 800);

    // At 1350ms: CRT TV curtain animation finishes
    setTimeout(() => {
      setIsTvTurningOn(false);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.resize();
      }
    }, 1350);

    // At 3200ms: All buttons across top, bottom, and right edge have finished their slow left-to-right flicker and settled permanently!
    setTimeout(() => {
      setUiBootStage(2);
    }, 3200);
  }, []);

  // User live GPS location coordinates (NO DEMO DATA - initialized null until real device GPS locks)
  const [userLocation, setUserLocation] = useState({
    lat: null,
    lon: null,
    label: null,
    isLiveGps: false,
    accuracy: null,
    speed: null,
    heading: null,
    timestamp: null,
  });
  const [gpsStatus, setGpsStatus] = useState('requesting'); // 'requesting' | 'active' | 'denied' | 'unavailable' | 'unsupported' | 'error'
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  // Cinematic 360° 3D Slanted Orbital Tour State & Refs
  const [isOrbiting360, setIsOrbiting360] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 1024 : false));
  // Telemetry Window defaults to OFF initially per user design
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      if (hash === '#hud' || hash === '#telemetry' || params.get('hud') === 'true') return true;
      return false;
    }
    return false;
  });
  const [isGlideDropdownOpen, setIsGlideDropdownOpen] = useState(false);
  const [isMobileControlsOpen, setIsMobileControlsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      return hash === '#controls' || hash === '#burger' || params.get('controls') === 'true';
    }
    return false;
  });

  // Dynamic window resize listener & URL hash sync for responsive drawers
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
    };
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      if (hash === '#controls' || hash === '#burger' || params.get('controls') === 'true') {
        setIsMobileControlsOpen(true);
      } else if (hash === '#hud' || hash === '#telemetry' || params.get('hud') === 'true') {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('hashchange', handleHash);
    window.addEventListener('popstate', handleHash);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('popstate', handleHash);
    };
  }, []);

  const handleCloseMobileControls = () => {
    setIsMobileControlsOpen(false);
    if (typeof window !== 'undefined' && (window.location.hash === '#controls' || window.location.hash === '#burger')) {
      window.history.replaceState(null, '', window.location.pathname + '#map');
    }
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
    if (typeof window !== 'undefined' && (window.location.hash === '#hud' || window.location.hash === '#telemetry')) {
      window.history.replaceState(null, '', window.location.pathname + '#map');
    }
  };

  useEffect(() => {
    if (typeof onDrawerChange === 'function') {
      onDrawerChange(Boolean(isMobile && (isMobileControlsOpen || isSidebarOpen)));
    }
  }, [isMobile, isMobileControlsOpen, isSidebarOpen, onDrawerChange]);

  const sectionContainerRef = useRef(null);
  const hasPlayedIntroOrbitRef = useRef(false);
  const orbitAnimIdRef = useRef(null);
  const isOrbitingRef = useRef(false);
  const mapLoadedRef = useRef(false);
  const pendingOrbitOnScrollRef = useRef(false);

  const watchIdRef = useRef(null);
  const hasCenteredOnGpsRef = useRef(false);
  const hasUserManuallySelectedStationRef = useRef(false);
  const userLocationRef = useRef(userLocation);
  userLocationRef.current = userLocation;
  const isFollowingUserRef = useRef(isFollowingUser);
  isFollowingUserRef.current = isFollowingUser;
  const lastGeocodedCoordRef = useRef(null);

  // Pinpoint clicked location on the map for micro-zone analysis anywhere in India
  const [inspectedPoint, setInspectedPoint] = useState(null);

  const [activePollutant, setActivePollutant] = useState('aqi'); // 'aqi' | 'pm25' | 'pm10'
  const [selectedStation, setSelectedStation] = useState(null);

  // Section 10: Petition and Action Module State
  const [isPetitionModalOpen, setIsPetitionModalOpen] = useState(false);
  const [petitionStation, setPetitionStation] = useState('DTU (Delhi Technological University)');
  const [petitionLocality, setPetitionLocality] = useState('Rohini Sector 16, North Delhi');
  const [petitionPm25, setPetitionPm25] = useState(142);

  // Autonomous Atmospheric Shield & Emergency Monitor Test Bench State
  const [isMonitorModalOpen, setIsMonitorModalOpen] = useState(false);

  // DEFAULT OPACITY: Balanced translucent 0.45 so the map beneath (roads, cities, terrain) is clearly visible
  const [heatIntensity, setHeatIntensity] = useState(0.45);
  const [showStationPins, setShowStationPins] = useState(false);
  const [showHeatmapLayer, setShowHeatmapLayer] = useState(true);
  const [showStateBorders, setShowStateBorders] = useState(true);
  // 3D extrusions are one of the costliest Mapbox layers; opt-in rather than on by default
  const [is3DBuildings, setIs3DBuildings] = useState(false);
  const is3DBuildingsRef = useRef(false);

  const showStateBordersRef = useRef(showStateBorders);
  showStateBordersRef.current = showStateBorders;

  const updateRasterForViewportRef = useRef(null);
  const cancelCinematic360TourRef = useRef(null);
  const playCinematic360TourRef = useRef(null);
  const getCameraPaddingRef = useRef(null);

  // Dynamic Zoom-Adaptive Contrast Calibration State
  const [isAdaptiveMode, setIsAdaptiveMode] = useState(true);
  const currentZoomRef = useRef(4.6);
  const mapMovementTimerRef = useRef(null);
  const [activeRange, setActiveRange] = useState({
    min: 40,
    max: 260,
    localMin: 40,
    localMax: 260,
    nationalMin: 40,
    nationalMax: 260,
    zoomFactor: 0,
    isZoomed: false,
    zoom: 4.6,
  });

  // Active Region Focus preset
  const [activePreset, setActivePreset] = useState(INDIA_REGION_PRESETS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef(null);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cached IDW grid and synchronization refs for high-speed 60fps viewport updates
  const gridCacheRef = useRef(null);
  const stationsRef = useRef(stations);
  const activePollutantRef = useRef(activePollutant);
  const isAdaptiveModeRef = useRef(isAdaptiveMode);

  stationsRef.current = stations;
  activePollutantRef.current = activePollutant;
  isAdaptiveModeRef.current = isAdaptiveMode;

  // High-performance continuous viewport recalibration
  const updateRasterForViewport = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const source = map.getSource('india-aqi-raster');
    if (!source || typeof source.updateImage !== 'function') return;

    if (!gridCacheRef.current) {
      gridCacheRef.current = computeRawSpatialGrid(
        stationsRef.current,
        activePollutantRef.current,
        INDIA_RASTER_BOUNDS
      );
    }

    const zoom = map.getZoom();
    currentZoomRef.current = Math.round(zoom * 10) / 10;
    const bounds = map.getBounds();
    const currentPollutant = activePollutantRef.current || 'aqi';
    const isCo = currentPollutant === 'co';

    let effectiveMin, effectiveMax;
    if (isAdaptiveModeRef.current) {
      const rangeResult = calculateAdaptiveRange(gridCacheRef.current, bounds, zoom, true, currentPollutant);
      effectiveMin = rangeResult.effectiveMin;
      effectiveMax = rangeResult.effectiveMax;
      setActiveRange({
        min: isCo ? Math.round(effectiveMin * 10) / 10 : Math.round(effectiveMin),
        max: isCo ? Math.round(effectiveMax * 10) / 10 : Math.round(effectiveMax),
        localMin: rangeResult.localMin,
        localMax: rangeResult.localMax,
        nationalMin: rangeResult.nationalMin,
        nationalMax: rangeResult.nationalMax,
        zoomFactor: rangeResult.zoomFactor,
        isZoomed: rangeResult.zoomFactor > 0.05,
        zoom: Math.round(zoom * 10) / 10,
      });
    } else {
      effectiveMin = gridCacheRef.current.nationalMin;
      effectiveMax = gridCacheRef.current.nationalMax;
      setActiveRange({
        min: isCo ? Math.round(effectiveMin * 10) / 10 : Math.round(effectiveMin),
        max: isCo ? Math.round(effectiveMax * 10) / 10 : Math.round(effectiveMax),
        localMin: isCo ? Math.round(effectiveMin * 10) / 10 : Math.round(effectiveMin),
        localMax: isCo ? Math.round(effectiveMax * 10) / 10 : Math.round(effectiveMax),
        nationalMin: isCo ? Math.round(effectiveMin * 10) / 10 : Math.round(effectiveMin),
        nationalMax: isCo ? Math.round(effectiveMax * 10) / 10 : Math.round(effectiveMax),
        zoomFactor: 0,
        isZoomed: false,
        zoom: Math.round(zoom * 10) / 10,
      });
    }

    const newRasterUrl = renderSeamlessRasterImage(gridCacheRef.current, effectiveMin, effectiveMax);
    if (newRasterUrl) {
      source.updateImage({
        url: newRasterUrl,
        coordinates: INDIA_RASTER_COORDINATES,
      });
    }
  }, []);
  updateRasterForViewportRef.current = updateRasterForViewport;

  // Gemini AI Advisory State (Token-Optimized)
  const [geminiAdvisory, setGeminiAdvisory] = useState(
    'Air quality telemetry is active. Outdoor commutes and ventilation recommendations are continuously evaluated.'
  );
  const [tokenStats, setTokenStats] = useState(null);
  const [isLoadingAdvisory, setIsLoadingAdvisory] = useState(false);
  const lastAdvisoryTargetRef = useRef('');

  // Fetch live national station telemetry across all 108 stations
  const fetchLiveNationalData = useCallback(async (userLat = null, userLon = null) => {
    setIsLoadingLive(true);
    try {
      const url = (typeof userLat === 'number' && typeof userLon === 'number')
        ? `/api/india-heatmap?lat=${userLat}&lon=${userLon}`
        : `/api/india-heatmap`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.stations) && data.stations.length > 0) {
          stationsRef.current = data.stations;
          setStations(data.stations);
          gridCacheRef.current = computeRawSpatialGrid(data.stations, activePollutantRef.current, INDIA_RASTER_BOUNDS);
          updateRasterForViewport();
          setLastUpdated(new Date().toLocaleTimeString());
          setIsLoadingLive(false);
          return;
        }
      }

      // If backend offline, retain calibrated stations
      gridCacheRef.current = computeRawSpatialGrid(initialIndiaStations, activePollutantRef.current, INDIA_RASTER_BOUNDS);
      updateRasterForViewport();
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('Could not fetch live India national data, retaining baseline:', err.message);
      setLastUpdated('Calibrated Baseline (Auto-retry in 60s)');
    } finally {
      setIsLoadingLive(false);
    }
  }, [updateRasterForViewport]);

  // Camera padding helper so map features are centered in the visible area left of the floating HUD
  const getCameraPadding = useCallback(() => {
    if (typeof window === 'undefined') return { right: 0, left: 0, top: 0, bottom: 0 };
    const isWide = window.innerWidth >= 1024;
    return {
      right: isSidebarOpen && isWide ? 440 : (isWide ? 40 : 16),
      left: isWide ? 40 : 16,
      top: isWide ? 80 : 50,
      bottom: isWide ? 80 : 50,
    };
  }, [isSidebarOpen]);
  getCameraPaddingRef.current = getCameraPadding;

  // Smooth camera glide to any region of India without reloading the heatmap
  const handleGlideToRegion = useCallback((preset) => {
    if (!preset) return;
    setActivePreset(preset);
    setSearchQuery('');
    setShowSearchDropdown(false);

    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo({
        center: preset.center,
        zoom: preset.zoom,
        pitch: preset.pitch || 20,
        speed: 1.25,
        curve: 1.2,
        padding: getCameraPadding(),
      });
    }
  }, [getCameraPadding]);

  const debounceTimerRef = useRef(null);

  // Debounced Remote Geocoding Worker (Mapbox Places High-Precision + Nationwide Photon & Nominatim Engine)
  const executeRemoteGeocode = useCallback(async (normalizedQuery, seenNames, currentCombined) => {
    setIsSearching(true);
    try {
      const remoteMatches = [];
      const token = mapboxgl.accessToken || import.meta.env.VITE_MAPBOX_TOKEN;
      const map = mapInstanceRef.current;
      const currentCenter = map ? map.getCenter() : { lat: 28.6139, lng: 77.2090 };

      // 1. High-Precision Mapbox Places Geocoding Engine (Societies, house addresses, PIN codes, POIs across all India)
      if (token) {
        try {
          const mbUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(normalizedQuery)}.json?access_token=${token}&country=in&proximity=${currentCenter.lng},${currentCenter.lat}&types=address,poi,neighborhood,locality,place,postcode,district&autocomplete=true&limit=8`;
          const mbRes = await fetch(mbUrl);
          if (mbRes.ok) {
            const mbJson = await mbRes.json();
            if (mbJson.features && mbJson.features.length > 0) {
              mbJson.features.forEach((f) => {
                const title = f.text || (f.place_name ? f.place_name.split(',')[0].trim() : normalizedQuery);
                const nameKey = (f.place_name || title).toLowerCase();
                if (!seenNames.has(nameKey)) {
                  seenNames.add(nameKey);
                  const isAddress = f.place_type?.includes('address') || f.place_type?.includes('poi');
                  const isPostcode = f.place_type?.includes('postcode');
                  const isLocality = f.place_type?.includes('neighborhood') || f.place_type?.includes('locality');
                  remoteMatches.push({
                    id: f.id || Math.random().toString(),
                    text: title,
                    place_name: f.place_name,
                    center: f.center,
                    bbox: f.bbox,
                    place_type: f.place_type,
                    isPinpoint: isAddress,
                    badge: isAddress ? 'House / Address' : isPostcode ? 'PIN Code' : isLocality ? 'Locality' : 'Location',
                  });
                }
              });
            }
          }
        } catch (mErr) {
          console.warn('Mapbox places query warning:', mErr.message);
        }
      }

      // 2. High-Accuracy Photon Engine across India (Dynamic proximity from current map viewport)
      if (remoteMatches.length + currentCombined.length < 5) {
        try {
          const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(normalizedQuery)}&lat=${currentCenter.lat}&lon=${currentCenter.lng}&limit=8`;
          const res = await fetch(photonUrl);
          if (res.ok) {
            const json = await res.json();
            if (json.features) {
              json.features.forEach((f) => {
                const p = f.properties;
                const title = p.name || normalizedQuery;
                const nameKey = title.toLowerCase();
                if (!seenNames.has(nameKey)) {
                  seenNames.add(nameKey);
                  const subtitle = [p.name, p.street, p.district, p.city, p.state, p.country].filter(Boolean).join(', ');
                  const isHouse = Boolean(p.housenumber || p.street);
                  remoteMatches.push({
                    id: p.osm_id || Math.random().toString(),
                    text: title,
                    place_name: subtitle || title,
                    center: f.geometry.coordinates,
                    isPinpoint: isHouse,
                    badge: isHouse ? 'House / Address' : 'Location',
                  });
                }
              });
            }
          }
        } catch (pErr) {
          // Non-fatal fallback
        }
      }

      // 3. OpenStreetMap Nominatim Deep Search (Nationwide India)
      if (remoteMatches.length + currentCombined.length < 4) {
        try {
          const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(normalizedQuery)}&format=json&polygon_geojson=1&countrycodes=in&limit=6`;
          const nomRes = await fetch(nomUrl, { headers: { 'User-Agent': 'WMD-AQI-App/1.0' } });
          if (nomRes.ok) {
            const nomJson = await nomRes.json();
            nomJson.forEach((n) => {
              const parts = n.display_name.split(',');
              const title = parts[0]?.trim() || normalizedQuery;
              const nameKey = title.toLowerCase();
              if (!seenNames.has(nameKey)) {
                const pGeo = n.geojson || (n.geometry && n.geometry.type !== 'Point' ? n.geometry : null);
                remoteMatches.push({
                  id: n.osm_id || Math.random().toString(),
                  text: title,
                  place_name: n.display_name,
                  center: [parseFloat(n.lon), parseFloat(n.lat)],
                  bbox: n.boundingbox ? [parseFloat(n.boundingbox[2]), parseFloat(n.boundingbox[0]), parseFloat(n.boundingbox[3]), parseFloat(n.boundingbox[1])] : null,
                  boundaryGeo: pGeo,
                  badge: 'Landmark',
                });
              }
            });
          }
        } catch (ne) {
          // Ignore Nominatim fallback error
        }
      }

      setSearchResults([...currentCombined, ...remoteMatches].slice(0, 8));
      setShowSearchDropdown(currentCombined.length > 0 || remoteMatches.length > 0);
    } catch (err) {
      console.warn('Geocoding search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Geocoding & landmark search handler: Immediate local match (0 credits) + Debounced remote query (protects 10K quota)
  const handleSearchInput = (val) => {
    setSearchQuery(val);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (!val || val.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      setIsSearching(false);
      return;
    }

    const cleanQuery = val.trim();
    const queryLower = cleanQuery.toLowerCase();

    // Comprehensive alias resolution for Delhi universities, institutes, hospitals, and landmarks
    let normalizedQuery = cleanQuery;
    if (/^\s*dtu\s*$/i.test(normalizedQuery) || /\bdelhi technical university\b/i.test(normalizedQuery) || /\btechnical university\b/i.test(normalizedQuery)) {
      normalizedQuery = 'Delhi Technological University';
    } else if (/^\s*nsut\s*$/i.test(normalizedQuery) || /^\s*nsit\s*$/i.test(normalizedQuery) || /\bnetaji subhas\b/i.test(normalizedQuery)) {
      normalizedQuery = 'Netaji Subhas University of Technology';
    } else if (/^\s*iit\s*d(elhi)?\s*$/i.test(normalizedQuery) || /^\s*iit\s*$/i.test(normalizedQuery)) {
      normalizedQuery = 'IIT Delhi';
    } else if (/^\s*aiims\s*$/i.test(normalizedQuery) || /\baiims delhi\b/i.test(normalizedQuery)) {
      normalizedQuery = 'AIIMS Delhi';
    } else if (/^\s*jnu\s*$/i.test(normalizedQuery) || /\bjawaharlal nehru\b/i.test(normalizedQuery)) {
      normalizedQuery = 'Jawaharlal Nehru University';
    } else if (/^\s*igdtuw\s*$/i.test(normalizedQuery)) {
      normalizedQuery = 'Indira Gandhi Delhi Technical University for Women';
    } else if (/^\s*jamia\s*$/i.test(normalizedQuery) || /\bjamia millia\b/i.test(normalizedQuery)) {
      normalizedQuery = 'Jamia Millia Islamia';
    } else if (/^\s*du\s*$/i.test(normalizedQuery) || /\bdelhi university\b/i.test(normalizedQuery)) {
      normalizedQuery = 'University of Delhi';
    }

    const combinedResults = [];
    const seenNames = new Set();

    // 1. Instant Internal Station & Landmark Match (Zero network latency & 0 Mapbox credits)
    const internalMatches = stations
      .filter((st) => {
        const name = st.name.toLowerCase();
        const zone = (st.zone || '').toLowerCase();
        const state = (st.state || '').toLowerCase();
        return (
          name.includes(queryLower) ||
          zone.includes(queryLower) ||
          state.includes(queryLower) ||
          (queryLower === 'dtu' && (name.includes('dtu') || name.includes('technological'))) ||
          (queryLower.includes('technical') && name.includes('dtu'))
        );
      })
      .slice(0, 3)
      .map((st) => ({
        id: `station-${st.id}`,
        text: st.name,
        place_name: `${st.name} (Monitoring Station, AQI: ${st.aqi})`,
        center: [st.lon, st.lat],
        isStation: true,
        station: st,
      }));

    internalMatches.forEach((m) => {
      seenNames.add(m.text.toLowerCase());
      combinedResults.push(m);
    });

    // Show instant local results right away
    if (combinedResults.length > 0) {
      setSearchResults(combinedResults);
      setShowSearchDropdown(true);
    }

    // 2. Debounce remote Mapbox/OSM geocoding call by 350ms (Drastically saves Mapbox 10K quota)
    setIsSearching(true);
    debounceTimerRef.current = setTimeout(() => {
      executeRemoteGeocode(normalizedQuery, seenNames, combinedResults);
    }, 350);
  };

  // Helper to generate a soft circular polygon boundary if an institution does not have a formal OSM polygon
  const createSoftPerimeterGeoJson = (centerLng, centerLat, radiusMeters = 550) => {
    const points = 64;
    const coords = [];
    const earthRadius = 6378137;
    const dLat = (radiusMeters / earthRadius) * (180 / Math.PI);
    const dLon = dLat / Math.cos((centerLat * Math.PI) / 180);

    for (let i = 0; i <= points; i++) {
      const theta = (i / points) * (2 * Math.PI);
      const lon = centerLng + dLon * Math.cos(theta);
      const lat = centerLat + dLat * Math.sin(theta);
      coords.push([lon, lat]);
    }
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [coords],
          },
          properties: {},
        },
      ],
    };
  };

  const handleSelectSearchedPlace = async (feature) => {
    if (!feature || !feature.center) return;
    const [lon, lat] = feature.center;
    setSearchQuery('');
    setShowSearchDropdown(false);

    // If map was not yet loaded, auto-activate immediately
    if (!showMap) {
      triggerMapActivation();
    }

    if (feature.isStation && feature.station) {
      setSelectedStation(feature.station);
    }

    // Determine nearest station and distance for complete telemetry & UI safety
    const currentStations = stationsRef.current && stationsRef.current.length > 0 ? stationsRef.current : initialIndiaStations;
    let nearestSt = feature.isStation && feature.station ? feature.station : currentStations[0];
    let minDist = feature.isStation ? 0 : 999999;
    if (!feature.isStation) {
      currentStations.forEach((st) => {
        const d = calculateDistanceKm(lat, lon, st.lat, st.lon);
        if (d < minDist) {
          minDist = d;
          nearestSt = st;
        }
      });
    }
    minDist = Math.round(minDist * 10) / 10;

    // Drop pinpoint target marker with live estimated AQI on the searched location
    let sampledAqi = sampleRasterGridVal(gridCacheRef.current, lon, lat);
    if (sampledAqi === null) {
      let totalW = 0;
      let weightedAqi = 0;
      currentStations.forEach((st) => {
        const d = calculateDistanceKm(lat, lon, st.lat, st.lon);
        const w = 1 / Math.pow(Math.max(15.0, d), 2.0);
        totalW += w;
        weightedAqi += st.aqi * w;
      });
      sampledAqi = weightedAqi / (totalW || 1);
    }

    const estAqi = Math.round(sampledAqi);
    const estPm25 = Math.round((nearestSt?.pm25 ? (estAqi / (nearestSt.aqi || 1)) * nearestSt.pm25 : estAqi * 0.55) * 10) / 10;
    const estPm10 = Math.round((nearestSt?.pm10 ? (estAqi / (nearestSt.aqi || 1)) * nearestSt.pm10 : estAqi * 1.15) * 10) / 10;
    const estNo2 = nearestSt?.no2 != null ? Number(nearestSt.no2) : 24;
    const estSo2 = nearestSt?.so2 != null ? Number(nearestSt.so2) : 10;
    const estCo = nearestSt?.co != null ? Number(nearestSt.co) : 0.8;
    const estO3 = nearestSt?.o3 != null ? Number(nearestSt.o3) : 32;

    setInspectedPoint({
      lat: Math.round(lat * 10000) / 10000,
      lon: Math.round(lon * 10000) / 10000,
      aqi: estAqi,
      pm25: estPm25,
      pm10: estPm10,
      no2: estNo2,
      so2: estSo2,
      co: estCo,
      o3: estO3,
      nearestStation: nearestSt ? nearestSt.name : 'Indian Subcontinent Ground Station',
      nearestState: nearestSt?.state || 'India',
      distanceKm: minDist,
      label: feature.place_name || feature.text || feature.name || 'Searched Location',
      isPinpoint: feature.isPinpoint,
      badge: feature.badge,
    });

    // Auto-open Telemetry HUD with the micro-zone pinpoint reading
    setIsSidebarOpen(true);

    const map = mapInstanceRef.current;
    if (!map) {
      // Map not yet mounted: queue target so map.on('load') flies directly to it
      pendingSearchTargetRef.current = feature;
      return;
    }

    // 1. Immediately turn ON the air quality heatmap layer if it was turned off
    setShowHeatmapLayer(true);

    // 2. Fetch polygon boundary in background if not already attached
    let boundaryGeo = feature.boundaryGeo || null;
    let targetBbox = feature.bbox || null;

    if (!boundaryGeo && !feature.isPinpoint) {
      try {
        const queryTerm = feature.text || feature.name || searchQuery;
        const nomGeoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryTerm)}&format=geojson&polygon_geojson=1&countrycodes=in&limit=1`;
        const nRes = await fetch(nomGeoUrl, { headers: { 'User-Agent': 'WMD-AQI-App/1.0' } });
        if (nRes.ok) {
          const nJson = await nRes.json();
          if (nJson.features?.[0]?.geometry?.type?.includes('Polygon')) {
            boundaryGeo = {
              type: 'FeatureCollection',
              features: [nJson.features[0]],
            };
            if (nJson.features[0].bbox) {
              targetBbox = nJson.features[0].bbox;
            }
          }
        }
      } catch (err) {
        // Fallback to soft perimeter
      }
    }

    // If house/apartment pinpoint, generate a tight 130-meter residential perimeter; otherwise soft 450m campus perimeter
    if (!boundaryGeo) {
      const radius = feature.isPinpoint ? 130 : 450;
      boundaryGeo = createSoftPerimeterGeoJson(lon, lat, radius);
    } else if (boundaryGeo.type !== 'FeatureCollection' && boundaryGeo.type !== 'Feature') {
      boundaryGeo = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: boundaryGeo,
            properties: {},
          },
        ],
      };
    }

    // 3. Step 1: Smooth Glide & Adaptive Zoom: House-level (16.4), Locality/PIN (14.8), or City (12.0)
    let targetZoom = 15.2;
    let targetPitch = 36;
    if (feature.isPinpoint || feature.place_type?.includes('address') || feature.place_type?.includes('poi')) {
      targetZoom = 16.4;
      targetPitch = 48;
    } else if (targetBbox) {
      targetZoom = 14.8;
      targetPitch = 30;
    }

    map.flyTo({
      center: [lon, lat],
      zoom: targetZoom,
      pitch: targetPitch,
      bearing: 12,
      speed: 1.25,
      curve: 1.3,
      padding: getCameraPadding(),
      essential: true,
    });

    // 4. Step 2 & 3: Once arrived, inject delicate faded boundary + calibrate heatmap
    const onArrival = () => {
      map.off('moveend', onArrival);
      const bSource = map.getSource('selected-place-boundary-source');
      if (bSource) {
        bSource.setData(boundaryGeo);
      }
      updateRasterForViewportRef.current?.();
    };

    setTimeout(() => {
      const bSource = map.getSource('selected-place-boundary-source');
      if (bSource) {
        bSource.setData(boundaryGeo);
      }
    }, 600);

    map.on('moveend', onArrival);
  };
  handleSelectSearchedPlaceRef.current = handleSelectSearchedPlace;
  const handleSelectSearchResult = handleSelectSearchedPlace;

  // Fetch token-optimized Gemini advisory
  const fetchGeminiAdvisory = useCallback(async (station) => {
    if (!station) return;
    setIsLoadingAdvisory(true);
    try {
      const res = await fetch('/api/gemini-advisory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: `${station.name}, ${station.state || 'India'}`,
          aqi: station.aqi,
          pm25: station.pm25,
          dominantPollutant: 'PM2.5',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.advisory) {
          setGeminiAdvisory(data.advisory);
          if (data.tokenUsage) setTokenStats(data.tokenUsage);
          setIsLoadingAdvisory(false);
          return;
        }
      }
      const fallbackAdvisory = station.aqi > 250
        ? 'Severe regional pollution index. High respiratory risk; wear an N95 mask outdoors and run indoor HEPA filtration.'
        : station.aqi > 150
        ? 'Unhealthy atmospheric haze. Reduce prolonged outdoor exertion and keep vehicle air recirculation enabled during commutes.'
        : station.aqi > 90
        ? 'Moderate particulate index. Sensitive individuals should pace outdoor morning exertion; commute conditions are fair.'
        : 'Favorable air quality index. Outdoor recreation and morning commutes are safe across the zone.';
      setGeminiAdvisory(fallbackAdvisory);
    } catch {
      const fallbackAdvisory = station.aqi > 250
        ? 'Severe regional pollution index. High respiratory risk; wear an N95 mask outdoors and run indoor HEPA filtration.'
        : station.aqi > 150
        ? 'Unhealthy atmospheric haze. Reduce prolonged outdoor exertion and keep vehicle air recirculation enabled during commutes.'
        : station.aqi > 90
        ? 'Moderate particulate index. Sensitive individuals should pace outdoor morning exertion; commute conditions are fair.'
        : 'Favorable air quality index. Outdoor recreation and morning commutes are safe across the zone.';
      setGeminiAdvisory(fallbackAdvisory);
    } finally {
      setIsLoadingAdvisory(false);
    }
  }, []);

  // Stop cinematic 360-degree orbit immediately on user intervention
  const cancelCinematic360Tour = useCallback(() => {
    if (!isOrbitingRef.current && !orbitAnimIdRef.current) return;
    isOrbitingRef.current = false;
    if (orbitAnimIdRef.current) {
      cancelAnimationFrame(orbitAnimIdRef.current);
      orbitAnimIdRef.current = null;
    }
    const map = mapInstanceRef.current;
    if (map) {
      map.stop();
      ['admin-1-boundary', 'admin-1-boundary-bg', 'boundary_state'].forEach((id) => {
        if (showStateBordersRef.current && map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', 'visible');
        }
      });
    }
    setIsOrbiting360(false);
  }, []);
  cancelCinematic360TourRef.current = cancelCinematic360Tour;

  // Cinematic 360° 3D slanted orbital flyaround and seamless GPS zoom-in
  // Render-optimized: zoomed out to 4.85 so local streets and complex boundaries are not rendered,
  // preventing frame drops and ensuring butter-smooth 60fps 3D rotation!
  const playCinematic360Tour = useCallback((customTarget = null) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (orbitAnimIdRef.current) {
      cancelAnimationFrame(orbitAnimIdRef.current);
      orbitAnimIdRef.current = null;
    }

    // Determine target coordinates (Live GPS, or custom target, or default Mansarovar/Jaipur coordinates)
    const targetLon = customTarget?.lon ?? userLocationRef.current?.lon ?? 75.76;
    const targetLat = customTarget?.lat ?? userLocationRef.current?.lat ?? 26.85;
    const targetCenter = [targetLon, targetLat];

    isOrbitingRef.current = true;
    setIsOrbiting360(true);
    hasPlayedIntroOrbitRef.current = true;

    // Temporarily disable boundary lines during 360° rotation to eliminate vector tessellation overhead
    ['admin-1-boundary', 'admin-1-boundary-bg', 'boundary_state'].forEach((id) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', 'none');
      }
    });

    const currentPadding = getCameraPaddingRef.current ? getCameraPaddingRef.current() : { right: 0, left: 0, top: 0, bottom: 0 };

    // Phase 1: Set 3D slanted perspective zoomed out to 4.85 so streets & granular vector geometry aren't rendered
    map.stop();
    map.jumpTo({
      center: targetCenter,
      zoom: 4.85,
      pitch: 58,
      bearing: 0,
      padding: currentPadding,
    });

    const orbitDuration = 6800; // 6.8s fluid, cinematic 360° orbital revolution
    let startTime = null;
    const startBearing = 0;

    // Smooth cubic easing for fluid acceleration and deceleration
    const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    let pausedSince = null;
    const orbitStep = (timestamp) => {
      // Hold the orbit (no camera moves, so no map renders) while scrolled away or tab hidden
      if (!isSectionOnScreenRef.current || document.hidden) {
        if (pausedSince === null) pausedSince = timestamp;
        orbitAnimIdRef.current = requestAnimationFrame(orbitStep);
        return;
      }
      if (pausedSince !== null) {
        if (startTime) startTime += timestamp - pausedSince;
        pausedSince = null;
      }
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / orbitDuration);
      const eased = easeInOutCubic(progress);

      const currentBearing = (startBearing + eased * 360) % 360;

      // Keep camera locked in 3D slanted position at zoom 4.85 orbiting targetCenter
      map.jumpTo({
        center: targetCenter,
        zoom: 4.85,
        pitch: 58,
        bearing: currentBearing,
        padding: getCameraPaddingRef.current ? getCameraPaddingRef.current() : { right: 0, left: 0, top: 0, bottom: 0 },
      });

      if (progress < 1) {
        orbitAnimIdRef.current = requestAnimationFrame(orbitStep);
      } else {
        orbitAnimIdRef.current = null;
        isOrbitingRef.current = false;

        // Restore boundaries as camera swoops down
        if (showStateBordersRef.current) {
          ['admin-1-boundary', 'admin-1-boundary-bg', 'boundary_state'].forEach((id) => {
            if (map.getLayer(id)) {
              map.setLayoutProperty(id, 'visibility', 'visible');
            }
          });
        }

        // Phase 2: Seamlessly zoom down into the target coordinates (user can freely take over anytime)
        map.flyTo({
          center: targetCenter,
          zoom: 12.8,
          pitch: 28,
          bearing: 0,
          speed: 0.82,
          curve: 1.35,
          padding: getCameraPaddingRef.current ? getCameraPaddingRef.current() : { right: 0, left: 0, top: 0, bottom: 0 },
          essential: false,
        });

        // When zoom flyTo finishes, release orbiting state and calibrate viewport
        const handleZoomEnd = () => {
          map.off('moveend', handleZoomEnd);
          setIsOrbiting360(false);
          updateRasterForViewportRef.current?.();
        };
        map.on('moveend', handleZoomEnd);
      }
    };

    orbitAnimIdRef.current = requestAnimationFrame(orbitStep);
  }, []);
  playCinematic360TourRef.current = playCinematic360Tour;

  // Start continuous, high-accuracy live GPS satellite tracking
  const startLiveGpsTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus('unsupported');
      setGpsError('Geolocation is not supported by your browser.');
      setIsLocating(false);
      return;
    }

    setGpsStatus('requesting');
    setIsLocating(true);
    setGpsError(null);

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, accuracy, speed, heading } = pos.coords;
        setGpsStatus('active');
        setIsLocating(false);
        setGpsError(null);

        // Check if we need to reverse-geocode (> 100m moved or initial lock)
        let shouldRev = !lastGeocodedCoordRef.current;
        if (lastGeocodedCoordRef.current) {
          const d = calculateDistanceKm(latitude, longitude, lastGeocodedCoordRef.current.lat, lastGeocodedCoordRef.current.lon);
          if (d > 0.1) shouldRev = true;
        }

        let placeName = userLocationRef.current?.label || 'Your Current Location';
        if (shouldRev) {
          lastGeocodedCoordRef.current = { lat: latitude, lon: longitude };
          try {
            // High-Accuracy reverse geocoding via OpenStreetMap Nominatim (exact neighborhood / locality)
            const revRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
              { headers: { 'User-Agent': 'WMD-AQI-App/1.0' } }
            );
            if (revRes.ok) {
              const revJson = await revRes.json();
              if (revJson.display_name) {
                placeName = revJson.display_name.split(',').slice(0, 3).join(', ').trim();
              }
            }
          } catch (e) {
            console.warn('Reverse geocoding error:', e);
          }
        }

        setUserLocation({
          lat: latitude,
          lon: longitude,
          label: placeName,
          accuracy: Math.round(accuracy),
          speed: speed !== null && speed !== undefined ? Math.round(speed * 3.6) : null,
          heading: heading !== null && heading !== undefined ? Math.round(heading) : null,
          isLiveGps: true,
          timestamp: pos.timestamp,
        });

        // Smooth Mapbox viewport tracking
        const map = mapInstanceRef.current;
        if (map) {
          if (userRequestedZoomRef.current) {
            userRequestedZoomRef.current = false;
            hasCenteredOnGpsRef.current = true;
            map.flyTo({
              center: [longitude, latitude],
              zoom: 17.0,
              pitch: 42,
              speed: 1.35,
              curve: 1.25,
              padding: getCameraPadding(),
            });
          } else if (!hasCenteredOnGpsRef.current) {
            hasCenteredOnGpsRef.current = true;
            if (hasPlayedIntroOrbitRef.current) {
              map.flyTo({
                center: [longitude, latitude],
                zoom: 12.5,
                pitch: 24,
                speed: 1.25,
                curve: 1.2,
              });
            } else if (pendingOrbitOnScrollRef.current) {
              pendingOrbitOnScrollRef.current = false;
              playCinematic360Tour({ lon: longitude, lat: latitude });
            }
          } else if (isFollowingUserRef.current && !orbitAnimIdRef.current) {
            map.easeTo({
              center: [longitude, latitude],
              duration: 800,
            });
          }
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === 1) {
          setGpsStatus('denied');
          setGpsError('GPS permission was denied. Please allow location access in your browser.');
        } else if (err.code === 2) {
          setGpsStatus('unavailable');
          setGpsError('GPS signal is currently unavailable.');
        } else if (err.code === 3) {
          setGpsStatus('timeout');
          setGpsError('GPS satellite signal timed out. Retrying...');
        } else {
          setGpsStatus('error');
          setGpsError(err.message || 'GPS location error.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 2000,
      }
    );
  }, [playCinematic360Tour, getCameraPadding]);

  // Auto-start GPS tracking on mount
  useEffect(() => {
    startLiveGpsTracking();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [startLiveGpsTracking]);

  // Center or re-center map on user's live position (zooming in much closer)
  const handleCenterOnUser = useCallback(() => {
    cancelCinematic360Tour();
    if (!userLocation.isLiveGps || !userLocation.lat || !userLocation.lon) {
      userRequestedZoomRef.current = true;
      startLiveGpsTracking();
      return;
    }
    setIsFollowingUser(true);
    const map = mapInstanceRef.current;
    if (map) {
      const currentZoom = map.getZoom();
      const targetZoom = currentZoom >= 16.5 ? 18.5 : 17.0;
      map.flyTo({
        center: [userLocation.lon, userLocation.lat],
        zoom: targetZoom,
        pitch: 42,
        speed: 1.35,
        curve: 1.25,
        padding: getCameraPadding(),
      });
    }
  }, [userLocation, startLiveGpsTracking, cancelCinematic360Tour, getCameraPadding]);

  // Synchronize Mapbox viewport on resize or sidebar collapse/expand
  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current) {
      const timer = setTimeout(() => {
        mapInstanceRef.current.resize();
      }, 320);
      return () => clearTimeout(timer);
    }
  }, [isSidebarOpen]);

  useEffect(() => {
    fetchLiveNationalData(userLocation.lat, userLocation.lon);
  }, [fetchLiveNationalData, userLocation.lat, userLocation.lon]);

  // Nearest station calculation based on real live GPS location
  const nearestStation = useMemo(() => {
    if (!userLocation.isLiveGps || !userLocation.lat || !userLocation.lon || stations.length === 0) {
      return null;
    }
    let nearest = stations[0];
    let minDist = Infinity;
    stations.forEach((st) => {
      const d = calculateDistanceKm(userLocation.lat, userLocation.lon, st.lat, st.lon);
      if (d < minDist) {
        minDist = d;
        nearest = st;
      }
    });
    return { station: nearest, distance: minDist };
  }, [stations, userLocation]);

  // When GPS is resolved, automatically latch nearest station if user hasn't manually selected one
  useEffect(() => {
    if (nearestStation?.station && !hasUserManuallySelectedStationRef.current) {
      setSelectedStation(nearestStation.station);
    }
  }, [nearestStation]);

  const displayStation = selectedStation || (nearestStation ? nearestStation.station : stations[0]);

  useEffect(() => {
    if (!displayStation) return;
    const targetKey = `${displayStation.name}-${Math.round((displayStation.aqi || 100) / 10)}`;
    if (lastAdvisoryTargetRef.current === targetKey) return;
    lastAdvisoryTargetRef.current = targetKey;
    fetchGeminiAdvisory(displayStation);
  }, [displayStation, fetchGeminiAdvisory]);

  // High-precision interpolated concentration / AQI at user's current live GPS coordinates
  const userAqiEstimate = useMemo(() => {
    if (!userLocation.isLiveGps || !userLocation.lat || !userLocation.lon) {
      return null;
    }
    let totalWeight = 0;
    let weightedVal = 0;
    let nearestDist = Infinity;
    let nearestVal = 0;

    stations.forEach((st) => {
      const d = calculateDistanceKm(userLocation.lat, userLocation.lon, st.lat, st.lon);
      const stVal = getPollutantValue(st, activePollutant);
      if (d < nearestDist) {
        nearestDist = d;
        nearestVal = stVal;
      }
      const w = 1 / Math.pow(Math.max(1.2, d), 2.0);
      totalWeight += w;
      weightedVal += stVal * w;
    });

    const interp = weightedVal / (totalWeight || 1);
    // If within 1.5 km of a ground monitoring station, anchor directly to the station's ground-truth sensor reading
    if (nearestDist <= 1.5) {
      const blend = nearestDist / 1.5;
      return Math.round(((1 - blend) * nearestVal + blend * interp) * 10) / 10;
    }

    return Math.round(interp * 10) / 10;
  }, [stations, userLocation, activePollutant]);

  const userColor = useMemo(() => {
    if (userAqiEstimate === null) {
      return { hex: '#38bdf8', label: 'Measuring...', textHex: '#38bdf8', badgeBg: 'rgba(56, 189, 248, 0.2)', unit: activePollutant.toUpperCase() };
    }
    return getPollutantMeta(userAqiEstimate, activePollutant, activeRange);
  }, [userAqiEstimate, activeRange, activePollutant]);


  // Convert stations to GeoJSON FeatureCollection
  const stationsGeoJson = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: stations.map((st) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [st.lon, st.lat],
        },
        properties: {
          id: st.id,
          name: st.name,
          aqi: st.aqi,
          pm25: st.pm25,
          pm10: st.pm10,
          zone: st.zone,
          state: st.state,
          type: st.type,
        },
      })),
    };
  }, [stations]);

  // =========================================================================
  // MAPBOX GL INITIALIZATION & WebGL HEATMAP ENGINE FOR ALL INDIA
  // =========================================================================
  useEffect(() => {
    if (!showMap) return;
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const token = mapboxgl.accessToken || (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_MAPBOX_TOKEN : '') || '';
    if (!token) {
      console.warn('Mapbox GL: No access token provided in VITE_MAPBOX_TOKEN. Map rendering paused.');
      setIsTokenMissing(true);
      return;
    }
    mapboxgl.accessToken = token;

    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const targetLon = userLocationRef.current?.lon ?? 75.76;
    const targetLat = userLocationRef.current?.lat ?? 26.85;
    const initialLng = urlParams && urlParams.get('lng') ? parseFloat(urlParams.get('lng')) : targetLon;
    const initialLat = urlParams && urlParams.get('lat') ? parseFloat(urlParams.get('lat')) : targetLat;
    const initialZoom = urlParams && urlParams.get('zoom') ? parseFloat(urlParams.get('zoom')) : 4.85;
    const initialPitch = urlParams && urlParams.get('pitch') ? parseFloat(urlParams.get('pitch')) : 58;

    let map;
    try {
      map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: MAPBOX_DARK_STYLE, // High-contrast night navigation
        center: [initialLng, initialLat],
        zoom: initialZoom,
        minZoom: 3.8,
        maxZoom: 21.0,
        pitch: initialPitch,
        maxPitch: 85, // Allows high-pitch 3D slanted perspective
        bearing: 0,
        attributionControl: false,
        interactive: true,
        dragPan: true,
        dragRotate: true,
        scrollZoom: true,
        touchZoomRotate: true,
        doubleClickZoom: true,
      });
      mapInstanceRef.current = map;
      setIsTokenMissing(false);
      setMapInitError(null);
    } catch (err) {
      console.warn('Failed to initialize Mapbox GL:', err);
      setMapInitError(err.message || 'Failed to initialize Mapbox GL engine');
      return;
    }

    // Explicitly guarantee all interactive manipulation controls are active
    map.dragPan.enable();
    map.dragRotate.enable();
    map.scrollZoom.enable();
    map.touchZoomRotate.enable();
    map.doubleClickZoom.enable();
    map.touchPitch.enable();
    map.boxZoom.enable();
    map.keyboard.enable();

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    map.on('error', (e) => {
      console.warn('Map engine warning/event:', e?.error?.message || e?.message || e);
    });

    map.on('load', () => {
      mapLoadedRef.current = true;
      if (typeof window !== 'undefined') {
        window.__wmd_map = map;
      }


      // 1. Add Stations GeoJSON Data Source
      map.addSource('aqi-stations', {
        type: 'geojson',
        data: stationsGeoJson,
      });

      // 2. LAYER POSITIONING: Insert raster underneath roads, state borders, and labels
      // This ensures roads, national highways, and state lines render crisply ON TOP of the heatmap!
      const layers = map.getStyle().layers || [];
      const buildingLayerId = layers.find((l) => (l.id.includes('building') || l['source-layer'] === 'building') && l.type !== 'symbol')?.id;
      const roadLayerId = layers.find((l) => (l.id.startsWith('road') || l.id.startsWith('highway_')) && l.type === 'line')?.id;
      const adminLayerId = layers.find((l) => l.id === 'admin-1-boundary-bg' || l.id === 'admin-1-boundary' || l.id === 'boundary_state')?.id;
      const firstSymbolLayerId = layers.find((l) => l.type === 'symbol')?.id;
      const symbolLayerId = layers.find((l) => l.type === 'symbol' && (l.layout?.['text-field'] || l.id.startsWith('place') || l.id.startsWith('highway_name') || l.id.startsWith('water_name')) )?.id;
      const labelLayerId = layers.find((l) => l.type === 'symbol' && (l.id.startsWith('place') || l.id.startsWith('poi') || l.id.includes('settlement')) )?.id;
      // The heatmap is placed beneath buildings and roads so it stays strictly on the ground terrain without tinting buildings
      const beforeLayerId = buildingLayerId || roadLayerId || adminLayerId || firstSymbolLayerId || symbolLayerId;

      // Real GPS Accuracy Radar Radius Layer (rendered beneath roads & borders)
      map.addSource('user-gps-accuracy-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer(
        {
          id: 'user-gps-accuracy-fill',
          type: 'fill',
          source: 'user-gps-accuracy-source',
          paint: {
            'fill-color': '#06b6d4',
            'fill-opacity': 0.10,
          },
        },
        beforeLayerId
      );

      map.addLayer(
        {
          id: 'user-gps-accuracy-outline',
          type: 'line',
          source: 'user-gps-accuracy-source',
          paint: {
            'line-color': '#38bdf8',
            'line-width': 2,
            'line-opacity': 0.85,
            'line-dasharray': [5, 4],
          },
        },
        beforeLayerId
      );

      // 3. High-Performance Continuous 2D IDW Spatial Air Quality Raster Field across all of India
      // - Seamless continuous gradients with zero contour line darkening
      // - Dynamically recalibrated to local min/max as user zooms in
      // - Clipped strictly to official Indian national boundary with Web Mercator accuracy
      const currentStations = stationsRef.current && stationsRef.current.length > 0 ? stationsRef.current : initialIndiaStations;
      gridCacheRef.current = computeRawSpatialGrid(currentStations, activePollutantRef.current, INDIA_RASTER_BOUNDS);
      const initialRasterUrl = renderSeamlessRasterImage(
        gridCacheRef.current,
        gridCacheRef.current.nationalMin,
        gridCacheRef.current.nationalMax
      );

      map.addSource('india-aqi-raster', {
        type: 'image',
        url: initialRasterUrl,
        coordinates: INDIA_RASTER_COORDINATES,
      });

      map.addLayer(
        {
          id: 'india-aqi-raster-layer',
          type: 'raster',
          source: 'india-aqi-raster',
          paint: {
            'raster-opacity': showHeatmapLayer ? heatIntensity : 0,
            'raster-fade-duration': 0,
            'raster-resampling': 'linear',
          },
        },
        beforeLayerId
      );

      // 4. Subtle, Refined State Boundaries (Soft slate dashed lines)
      if (map.getLayer('admin-1-boundary')) {
        map.setPaintProperty('admin-1-boundary', 'line-color', '#94a3b8');
        map.setPaintProperty('admin-1-boundary', 'line-width', [
          'interpolate', ['linear'], ['zoom'],
          3, 0.8,
          6, 1.2,
          10, 1.8
        ]);
        map.setPaintProperty('admin-1-boundary', 'line-opacity', 0.55);
        map.setPaintProperty('admin-1-boundary', 'line-dasharray', [3, 2]);
      }

      if (map.getLayer('admin-1-boundary-bg')) {
        map.setPaintProperty('admin-1-boundary-bg', 'line-color', '#070a13');
        map.setPaintProperty('admin-1-boundary-bg', 'line-width', [
          'interpolate', ['linear'], ['zoom'],
          3, 1.4,
          6, 2.0,
          10, 2.8
        ]);
        map.setPaintProperty('admin-1-boundary-bg', 'line-opacity', 0.50);
      }

      if (map.getLayer('boundary_state')) {
        map.setPaintProperty('boundary_state', 'line-color', '#94a3b8');
        map.setPaintProperty('boundary_state', 'line-width', [
          'interpolate', ['linear'], ['zoom'],
          3, 0.8,
          6, 1.2,
          10, 1.8
        ]);
        map.setPaintProperty('boundary_state', 'line-opacity', 0.55);
        map.setPaintProperty('boundary_state', 'line-dasharray', [3, 2]);
      }

      // 5. 3D Building Extrusion Layer (Shows urban architecture on close zoom)
      // Placed before labelLayerId so 3D buildings extrude OVER 2D footprints & roads, but UNDER city labels
      const buildingSource = map.getSource('composite') ? 'composite' : (map.getSource('openmaptiles') ? 'openmaptiles' : null);
      if (buildingSource) {
        try {
          const building3DLayer = {
            id: '3d-buildings',
            source: buildingSource,
            'source-layer': 'building',
            type: 'fill-extrusion',
            minzoom: 15,
            layout: { visibility: is3DBuildingsRef.current ? 'visible' : 'none' },
            paint: {
              'fill-extrusion-color': [
                'interpolate', ['linear'],
                ['coalesce', ['get', 'render_height'], ['get', 'height'], 14],
                0, '#191b20',
                12, '#23262d',
                25, '#2f333c',
                50, '#3e434d',
                90, '#505662',
                150, '#656c7a'
              ],
              'fill-extrusion-height': [
                'coalesce',
                ['get', 'render_height'],
                ['get', 'height'],
                14
              ],
              'fill-extrusion-base': [
                'coalesce',
                ['get', 'render_min_height'],
                ['get', 'min_height'],
                0
              ],
              'fill-extrusion-opacity': 1.0,
            },
          };
          if (buildingSource === 'composite') {
            building3DLayer.filter = ['==', 'extrude', 'true'];
          }
          map.addLayer(building3DLayer, firstSymbolLayerId || labelLayerId);

          // Elevate all building, landmark, and street text labels above 3D building rooftops
          layers.forEach((l) => {
            if (l.type === 'symbol') {
              try {
                map.setLayoutProperty(l.id, 'symbol-z-elevate', true);
                map.setLayoutProperty(l.id, 'symbol-z-order', 'auto');
              } catch {}
            }
          });
        } catch (err) {
          console.warn('Could not add 3d-buildings layer:', err);
        }
      }

      // Configure atmospheric 3D directional light for illuminated building facets
      try {
        if (typeof map.setLight === 'function') {
          map.setLight({
            anchor: 'viewport',
            color: '#e2e8f0',
            intensity: 0.60,
            position: [1.3, 215, 42]
          });
        }
      } catch {}

      // 6. Official India National Perimeter Border Line
      map.addSource('india-boundary-source', {
        type: 'geojson',
        data: indiaBoundaryGeoJson,
      });

      map.addLayer(
        {
          id: 'india-boundary-line',
          type: 'line',
          source: 'india-boundary-source',
          paint: {
            'line-color': '#38bdf8',
            'line-width': 2.2,
            'line-opacity': 0.95,
            'line-dasharray': [3, 1.5],
          },
        },
        labelLayerId || symbolLayerId
      );

      // 6.5 Soft Faded Selected Place / Institution Boundary
      // Appears automatically when an institution or locality is searched/selected
      // Opacity fades to 0 as you zoom out (vanishes on zoom-out <= 11, persists when zoomed in >= 12.5)
      map.addSource('selected-place-boundary-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer(
        {
          id: 'selected-place-boundary-fill',
          type: 'fill',
          source: 'selected-place-boundary-source',
          paint: {
            'fill-color': '#38bdf8',
            'fill-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10.8, 0,
              11.8, 0.04,
              13.5, 0.12,
              16.0, 0.15,
            ],
          },
        },
        labelLayerId || symbolLayerId
      );

      map.addLayer(
        {
          id: 'selected-place-boundary-outline',
          type: 'line',
          source: 'selected-place-boundary-source',
          paint: {
            'line-color': '#38bdf8',
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              11.0, 0.8,
              13.5, 1.8,
              16.0, 2.4,
            ],
            'line-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              11.0, 0,
              12.0, 0.25,
              13.5, 0.65,
              15.5, 0.75,
            ],
            'line-dasharray': [3, 2],
          },
        },
        labelLayerId || symbolLayerId
      );

      // 7. Click Anywhere in India to Pinpoint Inspect Micro-Zone AQI
      map.on('click', (e) => {
        // A click on a visible station pin selects that station instead of inspecting the raster
        if (map.getLayoutProperty('station-pins', 'visibility') === 'visible') {
          const hitBox = [[e.point.x - 10, e.point.y - 10], [e.point.x + 10, e.point.y + 10]];
          const hit = map.queryRenderedFeatures(hitBox, { layers: ['station-pins'] })[0];
          const st = hit && (stationsRef.current || []).find((item) => item.id === hit.properties.id);
          if (st) {
            setSelectedStation(st);
            setInspectedPoint({
              lat: st.lat,
              lon: st.lon,
              aqi: st.aqi,
              pm25: st.pm25,
              pm10: st.pm10,
              no2: st.no2 != null ? Number(st.no2) : 24,
              so2: st.so2 != null ? Number(st.so2) : 10,
              co: st.co != null ? Number(st.co) : 0.8,
              o3: st.o3 != null ? Number(st.o3) : 30,
              nearestStation: st.name,
              nearestState: st.state || st.zone || 'India',
              distanceKm: 0,
              label: `${st.name} Monitoring Station`,
            });
            setIsSidebarOpen(true);
            return;
          }
        }
        const { lng, lat } = e.lngLat;
        const currentStations = stationsRef.current && stationsRef.current.length > 0 ? stationsRef.current : initialIndiaStations;
        let nearest = currentStations[0];
        let minD = Infinity;

        currentStations.forEach((st) => {
          const d = calculateDistanceKm(lat, lng, st.lat, st.lon);
          if (d < minD) {
            minD = d;
            nearest = st;
          }
        });

        // Sample the EXACT continuous spatial raster grid value that determines the screen color!
        const currentActivePollutant = activePollutantRef.current || 'aqi';

        // Sample the EXACT continuous spatial raster grid value that determines the screen color!
        let sampledVal = sampleRasterGridVal(gridCacheRef.current, lng, lat);
        if (sampledVal === null) {
          let totalW = 0;
          let weightedVal = 0;
          currentStations.forEach((st) => {
            const d = calculateDistanceKm(lat, lng, st.lat, st.lon);
            const w = 1 / Math.pow(Math.max(1.5, d), 2.0);
            totalW += w;
            weightedVal += getPollutantValue(st, currentActivePollutant) * w;
          });
          sampledVal = weightedVal / (totalW || 1);
        }

        let pAqi, pPm25, pPm10, pNo2, pSo2, pCo, pO3;

        if (currentActivePollutant === 'aqi') {
          pAqi = Math.round(sampledVal);
          pPm25 = Math.round((nearest?.pm25 ? (pAqi / (nearest.aqi || 1)) * nearest.pm25 : pAqi * 0.55) * 10) / 10;
          pPm10 = Math.round((nearest?.pm10 ? (pAqi / (nearest.aqi || 1)) * nearest.pm10 : pAqi * 1.15) * 10) / 10;
          pNo2 = nearest?.no2 != null ? Number(nearest.no2) : 24;
          pSo2 = nearest?.so2 != null ? Number(nearest.so2) : 10;
          pCo = nearest?.co != null ? Number(nearest.co) : 0.8;
          pO3 = nearest?.o3 != null ? Number(nearest.o3) : 30;
        } else {
          // Continuous raster grid was computed directly for this active pollutant
          let activeVal = Math.round(sampledVal * 10) / 10;
          const nearestBaseVal = getPollutantValue(nearest, currentActivePollutant) || 1;
          if (minD <= 1.5 && nearest) {
            const blend = minD / 1.5;
            activeVal = Math.round(((1 - blend) * nearestBaseVal + blend * activeVal) * 10) / 10;
          }
          const ratio = Math.max(0.4, Math.min(2.5, activeVal / nearestBaseVal));
          pAqi = currentActivePollutant === 'pm25'
            ? calculateUncappedAqi(activeVal)
            : (nearest?.aqi ? Math.round(nearest.aqi * (0.85 + 0.15 * ratio)) : 100);
          pPm25 = currentActivePollutant === 'pm25' ? activeVal : Math.round((getPollutantValue(nearest, 'pm25') * ratio) * 10) / 10;
          pPm10 = currentActivePollutant === 'pm10' ? activeVal : Math.round((getPollutantValue(nearest, 'pm10') * ratio) * 10) / 10;
          pNo2 = currentActivePollutant === 'no2' ? activeVal : Math.round(getPollutantValue(nearest, 'no2') * ratio);
          pSo2 = currentActivePollutant === 'so2' ? activeVal : Math.round(getPollutantValue(nearest, 'so2') * ratio);
          pCo = currentActivePollutant === 'co' ? activeVal : Math.round((getPollutantValue(nearest, 'co') * ratio) * 10) / 10;
          pO3 = currentActivePollutant === 'o3' ? activeVal : Math.round(getPollutantValue(nearest, 'o3') * ratio);
        }

        setInspectedPoint({
          lat: Math.round(lat * 10000) / 10000,
          lon: Math.round(lng * 10000) / 10000,
          aqi: pAqi,
          pm25: pPm25,
          pm10: pPm10,
          no2: pNo2,
          so2: pSo2,
          co: pCo,
          o3: pO3,
          nearestStation: nearest ? nearest.name : 'Indian Subcontinent Ground Station',
          nearestState: nearest?.state || 'India',
          distanceKm: minD,
          label: `Pinpoint Inspection (${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E)`,
        });
        setIsSidebarOpen(true);
      });

      mapInstanceRef.current = map;

      // Only regenerate the heatmap after the user finishes moving the map (moveend/zoomend)
      const handleMovementEnd = () => {
        if (isOrbitingRef.current) return;
        if (mapMovementTimerRef.current) clearTimeout(mapMovementTimerRef.current);
        mapMovementTimerRef.current = setTimeout(() => {
          mapMovementTimerRef.current = null;
          updateRasterForViewport();
        }, 50);
      };

      map.on('moveend', handleMovementEnd);
      map.on('zoomend', handleMovementEnd);

      // Pause follow-mode and stop 360 tour when user manually drags, rotates, or interacts with the map
      const handleUserGesture = () => {
        if (isOrbitingRef.current || orbitAnimIdRef.current) {
          cancelCinematic360TourRef.current?.();
        }
        setIsFollowingUser(false);
      };

      map.on('dragstart', handleUserGesture);
      map.on('rotatestart', handleUserGesture);
      map.on('pitchstart', handleUserGesture);
      map.on('wheel', handleUserGesture);
      map.on('touchstart', handleUserGesture);

      // Station pins: GPU-rendered circle layers on the existing GeoJSON source (no DOM markers).
      // Hidden until the user enables pins; syncStationPinsRef applies visibility + selection state.
      map.addSource('selected-station-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      const pinRadius = (small, mid, large) => ['interpolate', ['linear'], ['zoom'], 3, small, 10, mid, 14, large];
      map.addLayer({
        id: 'station-pin-halo',
        type: 'circle',
        source: 'aqi-stations',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': pinRadius(7, 10, 13),
          'circle-color': '#000000',
          'circle-opacity': 0.45,
          'circle-blur': 0.8,
          'circle-translate': [0, 1.5],
        },
      });
      map.addLayer({
        id: 'station-pins',
        type: 'circle',
        source: 'aqi-stations',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': pinRadius(4.5, 7, 9),
          'circle-color': '#e11d48',
          'circle-stroke-color': 'rgba(255, 255, 255, 0.85)',
          'circle-stroke-width': 1.2,
        },
      });
      map.addLayer({
        id: 'station-pin-core',
        type: 'circle',
        source: 'aqi-stations',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': pinRadius(1.6, 2.6, 3.4),
          'circle-color': '#ffe4e6',
        },
      });
      map.addLayer({
        id: 'selected-station-pin',
        type: 'circle',
        source: 'selected-station-source',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': 12,
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2.2,
        },
      });
      map.addLayer({
        id: 'selected-station-label',
        type: 'symbol',
        source: 'selected-station-source',
        layout: {
          visibility: 'none',
          'text-field': ['get', 'label'],
          'text-size': 12,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': ['get', 'color'],
          'text-halo-color': 'rgba(15, 23, 42, 0.96)',
          'text-halo-width': 2.4,
        },
      });
      map.on('mouseenter', 'station-pins', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'station-pins', () => {
        map.getCanvas().style.cursor = '';
      });
      syncStationPinsRef.current?.();

      if (pendingSearchTargetRef.current) {
        const queuedTarget = pendingSearchTargetRef.current;
        pendingSearchTargetRef.current = null;
        setTimeout(() => {
          handleSelectSearchedPlaceRef.current?.(queuedTarget);
        }, 400);
      } else if (pendingOrbitOnScrollRef.current && !hasPlayedIntroOrbitRef.current) {
        pendingOrbitOnScrollRef.current = false;
        playCinematic360TourRef.current?.();
      }
    });

    return () => {
      cancelCinematic360TourRef.current?.();
      if (mapMovementTimerRef.current) {
        clearTimeout(mapMovementTimerRef.current);
        mapMovementTimerRef.current = null;
      }
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (targetMarkerRef.current) {
        targetMarkerRef.current.remove();
        targetMarkerRef.current = null;
      }
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
        mapLoadedRef.current = false;
      }
      if (typeof window !== 'undefined') {
        delete window.__wmd_map;
      }
    };
  }, [showMap]);

  // Scroll-down trigger for Electric CRT TV-On Map Reveal & Map Initialization
  useEffect(() => {
    if (!sectionContainerRef.current) return;

    // Check if directly linked or already in viewport
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#map' || hash === '#delhi-aqi-heatmap' || hash === '#hud' || hash === '#telemetry') {
        triggerMapActivation();
        if (!hasPlayedIntroOrbitRef.current) {
          pendingOrbitOnScrollRef.current = true;
        }
      }
    }

    let lastScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    let hasSnapped = false;

    // Fluid magnetic scroll-assist: when user scrolls down and is almost reaching the map section,
    // gently and smoothly snap the map section to full screen without trapping or locking normal scrolling.
    const handleScrollSnapCheck = () => {
      if (hasSnapped || hasTriggeredActivationRef.current || !sectionContainerRef.current) return;

      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollY;
      lastScrollY = currentScrollY;

      if (!scrollingDown) return;

      const rect = sectionContainerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // When the top of the map section approaches ~42% into the viewport (almost reaching full map UI)
      if (rect.top > 0 && rect.top <= windowHeight * 0.42 && rect.bottom > windowHeight * 0.6) {
        hasSnapped = true;
        sectionContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    window.addEventListener('scroll', handleScrollSnapCheck, { passive: true });

    // CRT TV Boot Trigger: Fires ONLY when the map is substantially framed on screen (>= 68% visible)
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.68) {
          triggerMapActivation();
          if (!hasPlayedIntroOrbitRef.current) {
            if (mapLoadedRef.current && mapInstanceRef.current) {
              playCinematic360TourRef.current?.();
            } else {
              pendingOrbitOnScrollRef.current = true;
            }
          }
        }
      },
      {
        threshold: [0.35, 0.68, 0.9],
      }
    );

    observer.observe(sectionContainerRef.current);

    // Separate lightweight observer: lets the orbit animation idle while the map is off screen
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        isSectionOnScreenRef.current = entries[entries.length - 1].isIntersecting;
      },
      { threshold: 0 }
    );
    visibilityObserver.observe(sectionContainerRef.current);
    return () => {
      observer.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener('scroll', handleScrollSnapCheck);
    };
  }, [triggerMapActivation]);

  // Update GeoJSON source when stations update
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const source = map.getSource('aqi-stations');
    if (source) {
      source.setData(stationsGeoJson);
    }
  }, [stationsGeoJson]);

  // Recompute spatial field when live station telemetry or pollutant metric changes
  useEffect(() => {
    gridCacheRef.current = computeRawSpatialGrid(
      stations,
      activePollutant,
      INDIA_RASTER_BOUNDS
    );
    updateRasterForViewport();
  }, [stations, activePollutant, updateRasterForViewport]);

  // Recalibrate raster when adaptive contrast mode is toggled
  useEffect(() => {
    updateRasterForViewport();
  }, [isAdaptiveMode, updateRasterForViewport]);

  // Update heatmap raster layer opacity
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.getLayer('india-aqi-raster-layer')) return;
    map.setPaintProperty('india-aqi-raster-layer', 'raster-opacity', showHeatmapLayer ? heatIntensity : 0);
  }, [heatIntensity, showHeatmapLayer]);

  // Toggle State Boundaries visibility
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    ['admin-1-boundary', 'admin-1-boundary-bg', 'boundary_state'].forEach((id) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', showStateBorders ? 'visible' : 'none');
      }
    });
  }, [showStateBorders]);

  // Toggle 3D Buildings visibility
  useEffect(() => {
    is3DBuildingsRef.current = is3DBuildings;
    const map = mapInstanceRef.current;
    if (!map || !map.getLayer('3d-buildings')) return;
    map.setLayoutProperty('3d-buildings', 'visibility', is3DBuildings ? 'visible' : 'none');
  }, [is3DBuildings]);

  // Station pins render as Mapbox circle layers. This only toggles visibility and refreshes the
  // single-feature "selected station" source, so pan/zoom range changes never rebuild DOM.
  const syncStationPins = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoadedRef.current) return;

    const visibility = showStationPins ? 'visible' : 'none';
    ['station-pin-halo', 'station-pins', 'station-pin-core', 'selected-station-pin', 'selected-station-label'].forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility);
    });

    const selectedSource = map.getSource('selected-station-source');
    if (!selectedSource) return;
    const features = [];
    if (showStationPins && selectedStation) {
      const stVal = getPollutantValue(selectedStation, activePollutant);
      const stMeta = getPollutantMeta(stVal, activePollutant, activeRange);
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [selectedStation.lon, selectedStation.lat] },
        properties: {
          color: stMeta.hex || '#f43f5e',
          label: `${selectedStation.name.split(',')[0].trim()}: ${activePollutant.toUpperCase()} ${stVal} ${stMeta.unit}`,
        },
      });
    }
    selectedSource.setData({ type: 'FeatureCollection', features });
  }, [showStationPins, selectedStation, activePollutant, activeRange]);
  syncStationPinsRef.current = syncStationPins;

  useEffect(() => {
    syncStationPins();
  }, [syncStationPins]);

  // Update Pinpoint Target Marker with adaptive color updates on zoom without animation disruption
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!inspectedPoint) {
      if (targetMarkerRef.current) {
        targetMarkerRef.current.remove();
        targetMarkerRef.current = null;
      }
      lastInspectedCoordsRef.current = null;
      return;
    }

    const pVal = getPollutantValue(inspectedPoint, activePollutant);
    const color = getPollutantMeta(pVal, activePollutant, activeRange);

    const isSamePoint =
      targetMarkerRef.current &&
      lastInspectedCoordsRef.current &&
      lastInspectedCoordsRef.current.lat === inspectedPoint.lat &&
      lastInspectedCoordsRef.current.lon === inspectedPoint.lon;

    if (isSamePoint) {
      // Adaptively update colors & text on zoom/pollutant toggle without destroying DOM element or restarting animations
      const el = targetMarkerRef.current.getElement();
      if (el) {
        el.style.setProperty('--aqi-color', color.hex);
        el.style.setProperty('--aqi-badge-bg', color.badgeBg);
        el.style.setProperty('--aqi-text-color', color.textHex);
        const readingLabel = el.querySelector('#pinpoint-badge-reading');
        if (readingLabel) {
          readingLabel.innerHTML = `${activePollutant.toUpperCase()} <strong style="color: var(--aqi-color); font-size: 12.5px; transition: color 0.35s ease;">${pVal}</strong> <span style="font-size: 9px; opacity: 0.85; font-weight: 600;">${color.unit}</span>`;
        }
        const badgeLabel = el.querySelector('#pinpoint-badge-label');
        if (badgeLabel) {
          badgeLabel.textContent = color.label;
          badgeLabel.style.background = color.badgeBg;
          badgeLabel.style.color = color.textHex;
          badgeLabel.style.borderColor = color.hex + '44';
        }
      }
      return;
    }

    if (targetMarkerRef.current) {
      targetMarkerRef.current.remove();
      targetMarkerRef.current = null;
    }

    lastInspectedCoordsRef.current = { lat: inspectedPoint.lat, lon: inspectedPoint.lon };

    const targetEl = document.createElement('div');
    targetEl.className = 'aqi-target-pinpoint-marker';
    targetEl.style.display = 'flex';
    targetEl.style.flexDirection = 'column';
    targetEl.style.alignItems = 'center';
    targetEl.style.pointerEvents = 'none';
    targetEl.style.setProperty('--aqi-color', color.hex);
    targetEl.style.setProperty('--aqi-badge-bg', color.badgeBg);
    targetEl.style.setProperty('--aqi-text-color', color.textHex);

    targetEl.innerHTML = `
      <div style="
        position: relative;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <!-- Soft Ambient Light Halo (Adaptive Color) -->
        <span style="
          position: absolute;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: radial-gradient(circle, var(--aqi-color) 0%, transparent 70%);
          opacity: 0.35;
          animation: pointLightPulse 2.8s ease-in-out infinite;
          pointer-events: none;
          transition: background 0.35s ease;
        "></span>

        <!-- Emitted Light Particles (Adaptive Color) -->
        <span style="
          position: absolute;
          top: 50%;
          left: 50%;
          width: 3.5px;
          height: 3.5px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 0 5px #ffffff, 0 0 10px var(--aqi-color);
          animation: pointParticleEmit1 2.4s cubic-bezier(0.2, 0.8, 0.4, 1) infinite;
          pointer-events: none;
          transition: box-shadow 0.35s ease;
        "></span>
        <span style="
          position: absolute;
          top: 50%;
          left: 50%;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: var(--aqi-color);
          box-shadow: 0 0 5px var(--aqi-color), 0 0 10px var(--aqi-color);
          animation: pointParticleEmit2 2.4s cubic-bezier(0.2, 0.8, 0.4, 1) infinite 0.4s;
          pointer-events: none;
          transition: background 0.35s ease, box-shadow 0.35s ease;
        "></span>
        <span style="
          position: absolute;
          top: 50%;
          left: 50%;
          width: 3.5px;
          height: 3.5px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 0 5px #ffffff, 0 0 10px var(--aqi-color);
          animation: pointParticleEmit3 2.4s cubic-bezier(0.2, 0.8, 0.4, 1) infinite 0.8s;
          pointer-events: none;
          transition: box-shadow 0.35s ease;
        "></span>
        <span style="
          position: absolute;
          top: 50%;
          left: 50%;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: var(--aqi-color);
          box-shadow: 0 0 5px var(--aqi-color), 0 0 10px var(--aqi-color);
          animation: pointParticleEmit4 2.4s cubic-bezier(0.2, 0.8, 0.4, 1) infinite 1.2s;
          pointer-events: none;
          transition: background 0.35s ease, box-shadow 0.35s ease;
        "></span>
        <span style="
          position: absolute;
          top: 50%;
          left: 50%;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 0 5px #ffffff, 0 0 10px var(--aqi-color);
          animation: pointParticleEmit5 2.4s cubic-bezier(0.2, 0.8, 0.4, 1) infinite 1.6s;
          pointer-events: none;
          transition: box-shadow 0.35s ease;
        "></span>
        <span style="
          position: absolute;
          top: 50%;
          left: 50%;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: var(--aqi-color);
          box-shadow: 0 0 5px var(--aqi-color), 0 0 10px var(--aqi-color);
          animation: pointParticleEmit6 2.4s cubic-bezier(0.2, 0.8, 0.4, 1) infinite 1.9s;
          pointer-events: none;
          transition: background 0.35s ease, box-shadow 0.35s ease;
        "></span>

        <!-- Luminous Point (Adaptive Color) -->
        <span style="
          position: relative;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--aqi-color);
          box-shadow: 0 0 10px var(--aqi-color), 0 0 20px var(--aqi-color);
          border: 2px solid #ffffff;
          z-index: 2;
          transition: background 0.35s ease, box-shadow 0.35s ease;
        "></span>
      </div>
      <div style="
        margin-top: 6px;
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 41, 59, 0.92) 100%);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1px solid var(--aqi-color);
        border-top: 1px solid rgba(255, 255, 255, 0.35);
        padding: 5px 12px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 700;
        color: #ffffff;
        white-space: nowrap;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.65), 0 0 18px var(--aqi-color);
        display: flex;
        align-items: center;
        gap: 8px;
        z-index: 5;
        transition: border-color 0.35s ease, box-shadow 0.35s ease;
      ">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--aqi-color); box-shadow: 0 0 8px var(--aqi-color); flex-shrink: 0; transition: background 0.35s ease, box-shadow 0.35s ease;"></span>
        <span id="pinpoint-badge-reading" style="letter-spacing: 0.02em;">${activePollutant.toUpperCase()} <strong style="color: var(--aqi-color); font-size: 12.5px; transition: color 0.35s ease;">${pVal}</strong> <span style="font-size: 9px; opacity: 0.85; font-weight: 600;">${color.unit}</span></span>
        <span id="pinpoint-badge-label" style="background: var(--aqi-badge-bg); color: var(--aqi-text-color); padding: 2px 7px; border-radius: 9999px; font-size: 9.5px; font-weight: 800; border: 1px solid var(--aqi-color); text-transform: uppercase; transition: all 0.35s ease;">${color.label}</span>
      </div>
    `;
    targetMarkerRef.current = new mapboxgl.Marker({ element: targetEl, anchor: 'center' })
      .setLngLat([inspectedPoint.lon, inspectedPoint.lat])
      .addTo(map);
  }, [inspectedPoint, activeRange, activePollutant]);

  // Update User Location Live Beacon Marker with adaptive color updates on zoom
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!userLocation.isLiveGps || !userLocation.lat || !userLocation.lon) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (map.getSource && map.getSource('user-gps-accuracy-source')) {
        map.getSource('user-gps-accuracy-source').setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
      return;
    }

    const liveColor = userColor;

    if (!userMarkerRef.current) {
      const userEl = document.createElement('div');
      userEl.className = 'mapbox-user-beacon';
      userEl.style.display = 'flex';
      userEl.style.flexDirection = 'column';
      userEl.style.alignItems = 'center';
      userEl.style.pointerEvents = 'none';
      userEl.style.setProperty('--user-color', liveColor.hex);

      userEl.innerHTML = `
        <div style="
          position: relative;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <!-- Soft Atmospheric Light Halo (Adaptive) -->
          <span style="
            position: absolute;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: radial-gradient(circle, var(--user-color) 0%, transparent 70%);
            opacity: 0.35;
            animation: pointLightPulse 3s ease-in-out infinite;
            pointer-events: none;
            transition: background 0.35s ease;
          "></span>

          <!-- Gentle Emitting Light Particles (Adaptive) -->
          <span style="
            position: absolute;
            top: 50%;
            left: 50%;
            width: 3.5px;
            height: 3.5px;
            border-radius: 50%;
            background: #ffffff;
            box-shadow: 0 0 5px #ffffff, 0 0 10px var(--user-color);
            animation: liveParticleDrift1 2.6s ease-out infinite;
            pointer-events: none;
            transition: box-shadow 0.35s ease;
          "></span>
          <span style="
            position: absolute;
            top: 50%;
            left: 50%;
            width: 3px;
            height: 3px;
            border-radius: 50%;
            background: var(--user-color);
            box-shadow: 0 0 5px var(--user-color), 0 0 10px var(--user-color);
            animation: liveParticleDrift2 2.6s ease-out infinite 0.5s;
            pointer-events: none;
            transition: background 0.35s ease, box-shadow 0.35s ease;
          "></span>
          <span style="
            position: absolute;
            top: 50%;
            left: 50%;
            width: 3px;
            height: 3px;
            border-radius: 50%;
            background: #10b981;
            box-shadow: 0 0 5px #10b981, 0 0 10px #10b981;
            animation: liveParticleDrift3 2.6s ease-out infinite 1.0s;
            pointer-events: none;
          "></span>
          <span style="
            position: absolute;
            top: 50%;
            left: 50%;
            width: 3px;
            height: 3px;
            border-radius: 50%;
            background: var(--user-color);
            box-shadow: 0 0 5px var(--user-color), 0 0 10px var(--user-color);
            animation: liveParticleDrift4 2.6s ease-out infinite 1.5s;
            pointer-events: none;
            transition: background 0.35s ease, box-shadow 0.35s ease;
          "></span>
          <span style="
            position: absolute;
            top: 50%;
            left: 50%;
            width: 3px;
            height: 3px;
            border-radius: 50%;
            background: #10b981;
            box-shadow: 0 0 5px #10b981, 0 0 10px #10b981;
            animation: liveParticleDrift5 2.6s ease-out infinite 2.0s;
            pointer-events: none;
          "></span>

          <!-- The Live Location Point -->
          <span style="
            position: relative;
            width: 13px;
            height: 13px;
            border-radius: 50%;
            background: var(--user-color);
            box-shadow: 0 0 12px var(--user-color), 0 0 22px var(--user-color);
            border: 2.5px solid #ffffff;
            z-index: 2;
            transition: background 0.35s ease, box-shadow 0.35s ease;
          "></span>
        </div>
        <div id="user-live-beacon-badge" style="
          margin-top: 6px;
          background: linear-gradient(135deg, rgba(11, 17, 32, 0.95) 0%, rgba(26, 36, 56, 0.92) 100%);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid var(--user-color);
          border-top: 1px solid rgba(255, 255, 255, 0.4);
          padding: 5px 12px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 800;
          color: #ffffff;
          white-space: nowrap;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 20px var(--user-color);
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 5;
          transition: border-color 0.35s ease, box-shadow 0.35s ease;
        ">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 10px #10b981; animation: pulse 1s infinite; flex-shrink: 0;"></span>
          <span>LIVE GPS: <strong style="color: var(--user-color); transition: color 0.35s ease;">${userAqiEstimate !== null ? `${activePollutant.toUpperCase()} ${userAqiEstimate} ${liveColor.unit}` : 'Measuring...'}</strong>${userLocation.accuracy ? ` <span style="color: #94a3b8; font-weight: 500; font-size: 10px;">(±${userLocation.accuracy}m)</span>` : ''}</span>
        </div>
      `;

      userMarkerRef.current = new mapboxgl.Marker({ element: userEl, anchor: 'center' })
        .setLngLat([userLocation.lon, userLocation.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([userLocation.lon, userLocation.lat]);
      const userEl = userMarkerRef.current.getElement();
      if (userEl) {
        userEl.style.setProperty('--user-color', liveColor.hex);
      }
      const badge = document.getElementById('user-live-beacon-badge');
      if (badge) {
        badge.innerHTML = `
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 10px #10b981; animation: pulse 1s infinite; flex-shrink: 0;"></span>
          <span>LIVE GPS: <strong style="color: var(--user-color); transition: color 0.35s ease;">${userAqiEstimate !== null ? `${activePollutant.toUpperCase()} ${userAqiEstimate} ${liveColor.unit}` : 'Measuring...'}</strong>${userLocation.accuracy ? ` <span style="color: #94a3b8; font-weight: 500; font-size: 10px;">(±${userLocation.accuracy}m)</span>` : ''}</span>
        `;
      }
    }

    // Update GPS accuracy halo on map
    if (map.getSource && map.getSource('user-gps-accuracy-source') && userLocation.accuracy) {
      const circlePoly = createGeoJsonCircle([userLocation.lon, userLocation.lat], Math.max(25, userLocation.accuracy));
      map.getSource('user-gps-accuracy-source').setData({
        type: 'FeatureCollection',
        features: [circlePoly],
      });
    }
  }, [userLocation, userAqiEstimate, activeRange, activePollutant, userColor]);

  return (
    <section
      ref={sectionContainerRef}
      id="delhi-aqi-heatmap"
      className={isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}
      style={{
        position: 'relative',
        zIndex: 40,
        width: '100%',
        height: isMobile ? '100%' : '100vh',
        minHeight: isMobile ? '100%' : '780px',
        background: '#070a12',
        color: '#f8fafc',
        overflow: 'hidden',
      }}
    >
      {/* ============================================================== */}
      {/* 1. FULL-BLEED BORDERLESS MAP CANVAS                           */}
      {/* ============================================================== */}
      <div
        ref={mapContainerRef}
        className={uiBootStage === 0 ? 'crt-mapbox-ctrl-hidden' : (uiBootStage === 1 ? 'crt-mapbox-ctrl-flicker' : '')}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          background: '#040711',
          zIndex: 1,
          cursor: showMap ? 'grab' : 'default',
          pointerEvents: 'auto',
        }}
      />

      {/* Mapbox Token Missing or Error Fallback Banner */}
      {(isTokenMissing || mapInitError) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 15,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'radial-gradient(circle at center, rgba(15, 23, 42, 0.94) 0%, rgba(7, 10, 18, 0.98) 100%)',
            backdropFilter: 'blur(16px)',
            textAlign: 'center',
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              maxWidth: '560px',
              width: '90%',
              padding: '32px 28px',
              borderRadius: '20px',
              background: 'rgba(30, 41, 59, 0.75)',
              border: '1px solid rgba(56, 189, 248, 0.28)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 189, 248, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(56, 189, 248, 0.14)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MapPin size={28} color="#38bdf8" />
            </div>

            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '8px', letterSpacing: '-0.01em' }}>
                Mapbox Public Token Required
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                To unlock the live interactive 3D spatial raster map of Delhi &amp; India, configure{' '}
                <code style={{ color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '2px 6px', borderRadius: '4px' }}>
                  VITE_MAPBOX_TOKEN
                </code>{' '}
                in your <code style={{ color: '#cbd5e1' }}>.env</code> file.
              </p>
            </div>

            {/* Instant Token Quick-Input */}
            <div style={{ display: 'flex', width: '100%', gap: '8px', maxWidth: '420px', marginTop: '4px' }}>
              <input
                type="text"
                placeholder="Paste token (pk.eyJ1...)"
                value={tempTokenInput}
                onChange={(e) => setTempTokenInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleApplyTempToken(); }}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#f8fafc',
                  fontSize: '0.8rem',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={handleApplyTempToken}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Load Map
              </button>
            </div>

            <div style={{ height: '1px', width: '100%', background: 'rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />

            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
              All other modules are active. Scroll down to explore the{' '}
              <span style={{ color: '#34d399', fontWeight: 600 }}>Atmospheric Cargo Truck</span> below.
            </p>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>

              <button
                type="button"
                onClick={() => {
                  const truckEl = document.getElementById('atmospheric-cargo-section');
                  if (truckEl) truckEl.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  background: 'rgba(52, 211, 153, 0.12)',
                  border: '1px solid rgba(52, 211, 153, 0.35)',
                  color: '#34d399',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <span>Continue to Cargo Truck</span>
                <ChevronDown size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Electric CRT TV-On Boot Animation Overlay (Elevated at zIndex 35 above map canvas) */}
      {isTvTurningOn && (
        <div className="crt-tv-turnon-overlay">
          <div className="crt-tv-vignette" />
          <div className="crt-tv-scanlines" />
          <div className="crt-tv-beam-stage">
            <div className="crt-tv-electron-raster" />
            <div className="crt-tv-lens-flare" />
            <div className="crt-tv-star-core" />
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. BUTTER-SMOOTH PERIMETER SCENE FADE (FEATHERED & UNOBTRUSIVE)*/}
      {/* ============================================================== */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          pointerEvents: 'none',
          background: `
            linear-gradient(to bottom, #070a12 0%, rgba(7, 10, 18, 0.94) 14%, rgba(7, 10, 18, 0.80) 28%, rgba(7, 10, 18, 0.55) 45%, rgba(7, 10, 18, 0.30) 65%, rgba(7, 10, 18, 0.10) 84%, rgba(7, 10, 18, 0.02) 94%, transparent 100%) top / 100% 50px no-repeat,
            linear-gradient(to top, #070a12 0%, rgba(7, 10, 18, 0.98) 25%, rgba(7, 10, 18, 0.90) 45%, rgba(7, 10, 18, 0.65) 65%, rgba(7, 10, 18, 0.35) 80%, rgba(7, 10, 18, 0.10) 92%, transparent 100%) bottom / 100% 140px no-repeat,
            linear-gradient(to right, #070a12 0%, rgba(7, 10, 18, 0.94) 14%, rgba(7, 10, 18, 0.80) 28%, rgba(7, 10, 18, 0.55) 45%, rgba(7, 10, 18, 0.30) 65%, rgba(7, 10, 18, 0.10) 84%, rgba(7, 10, 18, 0.02) 94%, transparent 100%) left / 42px 100% no-repeat,
            linear-gradient(to left, #070a12 0%, rgba(7, 10, 18, 0.94) 14%, rgba(7, 10, 18, 0.80) 28%, rgba(7, 10, 18, 0.55) 45%, rgba(7, 10, 18, 0.30) 65%, rgba(7, 10, 18, 0.10) 84%, rgba(7, 10, 18, 0.02) 94%, transparent 100%) right / 42px 100% no-repeat
          `,
        }}
      />

      {/* ============================================================== */}
      {/* 3. TOP FLOATING COMMAND DECK (TRANSLUCENT & STREAMLINED)       */}
      {/* ============================================================== */}
      <div
        style={{
          position: 'absolute',
          top: isMobile ? '12px' : '20px',
          left: isMobile ? '12px' : '24px',
          right: isMobile ? '12px' : (isSidebarOpen ? '444px' : '24px'),
          zIndex: 25,
          transition: 'right 0.32s cubic-bezier(0.16, 1, 0.3, 1), left 0.32s, top 0.32s',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        {/* Tier 1: Branding, Telemetry Switcher, GPS Tracker & Telemetry Toggle */}
        {isMobile ? (
          /* Mobile Sleek Compact Header Bar */
          <div
            className={`glass-panel-master ${getPanelClass()}`}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              borderRadius: '12px',
              gap: '6px',
            }}
          >
            {/* Brand & Status Indicator */}
            <div className={getBtnFlickerClass()} style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, ...getBtnFlickerStyle(500) }}>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#38bdf8',
                  boxShadow: '0 0 10px #38bdf8',
                  animation: 'pulse 1.8s infinite',
                }}
              />
              <span style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.04em', color: '#f8fafc' }}>
                INDIA AQI
              </span>
            </div>

            {/* Quick Actions: GPS, Refresh & Burger Menu Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
              <button
                onClick={handleCenterOnUser}
                title="GPS Location"
                className={`glass-cuboid-btn glass-btn-compact ${userLocation.isLiveGps ? 'glass-cuboid-btn-success' : ''} ${getBtnFlickerClass()}`}
                style={{ padding: '5px 8px', borderRadius: '7px', ...getBtnFlickerStyle(650) }}
              >
                <Navigation size={12} color={userLocation.isLiveGps ? '#10b981' : '#38bdf8'} />
              </button>

              <button
                onClick={() => fetchLiveNationalData(userLocation.lat, userLocation.lon)}
                disabled={isLoadingLive}
                title="Refresh Live Data"
                className={`glass-cuboid-btn glass-btn-compact ${getBtnFlickerClass()}`}
                style={{ padding: '5px 8px', borderRadius: '7px', ...getBtnFlickerStyle(800) }}
              >
                <RefreshCw size={12} className={isLoadingLive ? 'animate-spin' : ''} color="#38bdf8" />
              </button>

              {/* The Mobile Burger Menu Button */}
              <button
                id="mobile-burger-menu-btn"
                onClick={() => {
                  setIsMobileControlsOpen(true);
                  if (typeof window !== 'undefined') window.history.replaceState(null, '', '#controls');
                }}
                className={`glass-pill glass-pill-active ${getBtnFlickerClass()}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '9999px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.45) 0%, rgba(14, 165, 233, 0.35) 100%)',
                  border: '1px solid rgba(56, 189, 248, 0.5)',
                  boxShadow: '0 0 12px rgba(56, 189, 248, 0.3)',
                  color: '#ffffff',
                  ...getBtnFlickerStyle(950),
                }}
              >
                <Menu size={13} color="#38bdf8" />
                <span>Controls</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`glass-panel-master ${getPanelClass()}`}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              padding: '8px 16px',
              borderRadius: '14px',
            }}
          >
            {/* Engine Title & Last Updated */}
            <div className={getBtnFlickerClass()} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', ...getBtnFlickerStyle(500) }}>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#38bdf8',
                  boxShadow: '0 0 10px #38bdf8',
                }}
              />
              <span style={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.04em', color: '#f8fafc' }}>
                INDIA AQI ENGINE
              </span>
              <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>•</span>
              <span style={{ fontSize: '0.7rem', color: '#e2e8f0', fontWeight: 500 }}>{lastUpdated}</span>
            </div>

            {/* Right Deck: Controls, Location, Glide, Orbit & Telemetry Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>

              {/* Glide Dropdown Button with Search Icon */}
              <button
                onClick={() => setIsGlideDropdownOpen((prev) => !prev)}
                className={`glass-cuboid-btn ${isGlideDropdownOpen ? 'glass-cuboid-btn-active' : ''} ${getBtnFlickerClass()}`}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9px',
                  fontSize: '0.78rem',
                  ...getBtnFlickerStyle(640),
                }}
                title="Toggle Glide cities and search bar dropdown"
              >
                <Search size={13} color="#38bdf8" />
                <span>Glide & Search</span>
                <ChevronDown
                  size={13}
                  style={{
                    transform: isGlideDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              </button>
            </div>

            {/* Action Buttons: Metrics, Refresh, GPS & Integrated Telemetry Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Metric Selector Tabs */}
              <div
                className={`glass-panel-sub ${getPanelClass()}`}
                style={{
                  display: 'flex',
                  padding: '3px',
                  borderRadius: '10px',
                  gap: '3px',
                  background: 'rgba(28, 41, 62, 0.65)',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                }}
              >
                {[
                  { id: 'aqi', label: 'AQI' },
                  { id: 'pm25', label: 'PM 2.5' },
                  { id: 'pm10', label: 'PM 10' },
                  { id: 'no2', label: 'NO2' },
                  { id: 'so2', label: 'SO2' },
                  { id: 'co', label: 'CO' },
                  { id: 'o3', label: 'O3' },
                ].map((m, idx) => (
                  <button
                    key={m.id}
                    onClick={() => setActivePollutant(m.id)}
                    className={`glass-cuboid-btn ${activePollutant === m.id ? 'glass-cuboid-btn-active' : ''} ${getBtnFlickerClass()}`}
                    style={{
                      padding: '5px 11px',
                      borderRadius: '7px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      ...getBtnFlickerStyle(760 + idx * 100),
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Action Buttons: Refresh, GPS & Follow */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Refresh Live Button - Fixed width & constant label to eliminate sizing jitter */}
                <button
                  onClick={() => fetchLiveNationalData(userLocation.lat, userLocation.lon)}
                  disabled={isLoadingLive}
                  className={`glass-cuboid-btn ${getBtnFlickerClass()}`}
                  style={{
                    minWidth: '96px',
                    justifyContent: 'center',
                    padding: '6px 14px',
                    borderRadius: '9px',
                    fontSize: '0.78rem',
                    ...getBtnFlickerStyle(1500),
                  }}
                >
                  <RefreshCw size={13} className={isLoadingLive ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>

                {/* Live GPS Tracking Controller */}
                <button
                  onClick={handleCenterOnUser}
                  title={userLocation.isLiveGps ? 'Center camera on your live GPS position' : 'Start live GPS tracking'}
                  className={`glass-cuboid-btn ${userLocation.isLiveGps ? 'glass-cuboid-btn-success' : ''} ${getBtnFlickerClass()}`}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9px',
                    fontSize: '0.78rem',
                    ...getBtnFlickerStyle(1620),
                  }}
                >
                  {isLocating ? (
                    <RefreshCw size={13} className="animate-spin" color="#38bdf8" />
                  ) : userLocation.isLiveGps ? (
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', animation: 'pulse 1.2s infinite' }} />
                  ) : (
                    <Navigation size={13} color="#38bdf8" />
                  )}
                  <span>
                    {isLocating
                      ? 'Acquiring...'
                      : userLocation.isLiveGps
                      ? `GPS Lock${userLocation.accuracy ? ` (±${userLocation.accuracy}m)` : ''}`
                      : 'Track My Location'}
                  </span>
                </button>

                {userLocation.isLiveGps && (
                  <button
                    onClick={() => setIsFollowingUser((f) => !f)}
                    title="Toggle automatic camera tracking as you move"
                    className={`glass-cuboid-btn ${isFollowingUser ? 'glass-cuboid-btn-active' : ''} ${getBtnFlickerClass()}`}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '9px',
                      fontSize: '0.76rem',
                      ...getBtnFlickerStyle(1740),
                    }}
                  >
                    <LocateFixed size={13} color={isFollowingUser ? '#38bdf8' : '#94a3b8'} />
                    <span>Follow: {isFollowingUser ? 'ON' : 'OFF'}</span>
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

        {/* Tier 2: Animated Dropdown - Capital City Shortcuts + Autocomplete Search Bar */}
        {!isMobile && (
        <div
          style={{
            pointerEvents: isGlideDropdownOpen ? 'auto' : 'none',
            opacity: isGlideDropdownOpen ? 1 : 0,
            transform: isGlideDropdownOpen ? 'translateY(0) scaleY(1)' : 'translateY(-10px) scaleY(0.96)',
            transformOrigin: 'top center',
            maxHeight: isGlideDropdownOpen ? '260px' : '0px',
            overflow: isGlideDropdownOpen ? 'visible' : 'hidden',
            transition: 'opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1), transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), max-height 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div
            className="glass-panel-master"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              flexWrap: 'wrap',
              padding: '8px 14px',
              borderRadius: '12px',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.55)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
            }}
          >
            {/* Quick Glide Capital City Shortcuts */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.67rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: '3px' }}>
                GLIDE:
              </span>
              {INDIA_REGION_PRESETS.map((preset) => {
                const isActive = activePreset.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleGlideToRegion(preset)}
                    className={`glass-pill ${isActive ? 'glass-pill-active' : ''}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '3px 9px',
                      borderRadius: '9999px',
                      fontSize: '0.67rem',
                      fontWeight: isActive ? 700 : 600,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>{preset.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Place Search Bar with Autocomplete across India */}
            <HeatmapSearchBar
              searchContainerRef={searchContainerRef}
              searchQuery={searchQuery}
              handleSearchInput={handleSearchInput}
              setShowSearchDropdown={setShowSearchDropdown}
              showSearchDropdown={showSearchDropdown}
              searchResults={searchResults}
              isSearching={isSearching}
              setSearchQuery={setSearchQuery}
              setSearchResults={setSearchResults}
              handleSelectSearchResult={handleSelectSearchResult}
            />
          </div>
        </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MOBILE FLOATING BOTTOM BAR: POLLUTANT PILLS + HUD BUTTON       */}
      {/* ============================================================== */}
      {isMobile && (
        <div
          style={{
            position: 'absolute',
            bottom: '88px',
            left: '12px',
            right: '12px',
            zIndex: 25,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'none',
          }}
        >
          {/* Horizontally scrollable pollutant pills */}
          <div
            className={`glass-panel-master ${getPanelClass()}`}
            style={{
              flex: 1,
              minWidth: 0,
              pointerEvents: 'auto',
              display: 'flex',
              padding: '4px',
              borderRadius: '12px',
              gap: '4px',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
            }}
          >
            {[
              { id: 'aqi', label: 'AQI' },
              { id: 'pm25', label: 'PM 2.5' },
              { id: 'pm10', label: 'PM 10' },
              { id: 'no2', label: 'NO2' },
              { id: 'so2', label: 'SO2' },
              { id: 'co', label: 'CO' },
              { id: 'o3', label: 'O3' },
            ].map((m, idx) => (
              <button
                key={m.id}
                onClick={() => setActivePollutant(m.id)}
                className={`glass-cuboid-btn ${activePollutant === m.id ? 'glass-cuboid-btn-active' : ''} ${getBtnFlickerClass()}`}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  ...getBtnFlickerStyle(520 + idx * 100),
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Telemetry HUD Launch Button */}
          <button
            id="mobile-telemetry-hud-btn"
            onClick={() => {
              setIsSidebarOpen(true);
              if (typeof window !== 'undefined') window.history.replaceState(null, '', '#hud');
            }}
            className={`glass-pill glass-pill-active ${getBtnFlickerClass()}`}
            style={{
              pointerEvents: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '8px 14px',
              borderRadius: '12px',
              fontSize: '0.74rem',
              fontWeight: 800,
              flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.45) 0%, rgba(5, 150, 105, 0.35) 100%)',
              border: '1px solid rgba(52, 211, 153, 0.5)',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
              color: '#ffffff',
              cursor: 'pointer',
              ...getBtnFlickerStyle(1300),
            }}
          >
            <Activity size={14} color="#34d399" />
            <span>HUD</span>
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. BOTTOM-LEFT FLOATING CONTROLS HUD (LAYERS & OPACITY)        */}
      {/* ============================================================== */}
      {/* ============================================================== */}
      {/* 4. BOTTOM-LEFT FLOATING CONTROLS HUD (LAYERS & OPACITY)        */}
      {/* ============================================================== */}
      <HeatmapControlsDeck
        isMobile={isMobile}
        isSidebarOpen={isSidebarOpen}
        getPanelClass={getPanelClass}
        getBtnFlickerClass={getBtnFlickerClass}
        getBtnFlickerStyle={getBtnFlickerStyle}
        showHeatmapLayer={showHeatmapLayer}
        setShowHeatmapLayer={setShowHeatmapLayer}
        isAdaptiveMode={isAdaptiveMode}
        setIsAdaptiveMode={setIsAdaptiveMode}
        activeRange={activeRange}
        showStateBorders={showStateBorders}
        setShowStateBorders={setShowStateBorders}
        showStationPins={showStationPins}
        setShowStationPins={setShowStationPins}
        is3DBuildings={is3DBuildings}
        setIs3DBuildings={setIs3DBuildings}
        mapInstanceRef={mapInstanceRef}
        heatIntensity={heatIntensity}
        setHeatIntensity={setHeatIntensity}
      />

      {/* ============================================================== */}
      {/* MOBILE BURGER MENU CONTROLS DRAWER                             */}
      {/* ============================================================== */}
      {/* ============================================================== */}
      {/* MOBILE BURGER MENU CONTROLS DRAWER                             */}
      {/* ============================================================== */}
      <HeatmapMobileDrawer
        isMobileControlsOpen={isMobileControlsOpen}
        handleCloseMobileControls={handleCloseMobileControls}
        handleCenterOnUser={handleCenterOnUser}
        userLocation={userLocation}
        INDIA_REGION_PRESETS={INDIA_REGION_PRESETS}
        activePreset={activePreset}
        handleGlideToRegion={handleGlideToRegion}
        setIsMobileControlsOpen={setIsMobileControlsOpen}
        searchQuery={searchQuery}
        handleSearchInput={handleSearchInput}
        isSearching={isSearching}
        searchResults={searchResults}
        handleSelectSearchResult={handleSelectSearchResult}
        showHeatmapLayer={showHeatmapLayer}
        setShowHeatmapLayer={setShowHeatmapLayer}
        isAdaptiveMode={isAdaptiveMode}
        setIsAdaptiveMode={setIsAdaptiveMode}
        showStateBorders={showStateBorders}
        setShowStateBorders={setShowStateBorders}
        showStationPins={showStationPins}
        setShowStationPins={setShowStationPins}
        is3DBuildings={is3DBuildings}
        setIs3DBuildings={setIs3DBuildings}
        heatIntensity={heatIntensity}
        setHeatIntensity={setHeatIntensity}
        setIsMonitorModalOpen={setIsMonitorModalOpen}
      />

      {/* Mobile backdrop overlay to tap-to-close drawer */}
      {isMobile && isSidebarOpen && (
        <div
          onClick={handleCloseSidebar}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 55,
            background: 'rgba(3, 7, 18, 0.65)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            transition: 'opacity 0.25s ease',
          }}
        />
      )}

      {/* Sleek Floating Edge Tab to Open HUD when closed */}
      {!isMobile && !isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          title="Open Air Quality & Advisory HUD"
          className={`glass-panel-master ${getBtnFlickerClass()}`}
          style={{
            position: 'absolute',
            right: '24px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 24,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 14px',
            borderRadius: '12px',
            cursor: 'pointer',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(56, 189, 248, 0.2)',
            color: '#38bdf8',
            fontSize: '0.78rem',
            fontWeight: 700,
            transition: 'all 0.2s ease',
            ...getBtnFlickerStyle(1950),
          }}
        >
          <ChevronLeft size={16} color="#38bdf8" />
          <span>HUD</span>
          <Activity size={14} color="#10b981" />
        </button>
      )}

      {/* ============================================================== */}
      {/* 5. FLOATING RIGHT-SIDE TELEMETRY HUD (COLLAPSIBLE OVERLAY)     */}
      {/* ============================================================== */}
      <HeatmapTelemetryHud
        isMobile={isMobile}
        isSidebarOpen={isSidebarOpen}
        handleCloseSidebar={handleCloseSidebar}
        uiBootStage={uiBootStage}
        activePollutant={activePollutant}
        inspectedPoint={inspectedPoint}
        setInspectedPoint={setInspectedPoint}
        activeRange={activeRange}
        userLocation={userLocation}
        handleCenterOnUser={handleCenterOnUser}
        userColor={userColor}
        userAqiEstimate={userAqiEstimate}
        nearestStation={nearestStation}
        startLiveGpsTracking={startLiveGpsTracking}
        isLocating={isLocating}
        gpsStatus={gpsStatus}
        gpsError={gpsError}
        displayStation={displayStation}
        isLoadingAdvisory={isLoadingAdvisory}
        geminiAdvisory={geminiAdvisory}
        isAdaptiveMode={isAdaptiveMode}
        getPollutantValue={getPollutantValue}
        getPollutantMeta={getPollutantMeta}
      />

      {/* Section 10: Civic Petition & Action Modal */}
      {isPetitionModalOpen && (
        <React.Suspense fallback={null}>
          <PetitionModal
            isOpen={isPetitionModalOpen}
            onClose={() => setIsPetitionModalOpen(false)}
            initialStation={petitionStation}
            initialLocality={petitionLocality}
            initialPm25={petitionPm25}
          />
        </React.Suspense>
      )}

      {/* Autonomous Atmospheric Shield & Emergency Monitor Test Bench */}
      {isMonitorModalOpen && (
        <React.Suspense fallback={null}>
          <AutonomousMonitorModal
            isOpen={isMonitorModalOpen}
            onClose={() => setIsMonitorModalOpen(false)}
          />
        </React.Suspense>
      )}
    </section>
  );

}
