import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
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
  Map as MapIcon
} from 'lucide-react';

// Import official India national boundary GeoJSON (MultiPolygon covering mainland + islands)
import indiaBoundaryGeoJson from '../../data/indiaBoundary.json';
// Import 108 nationwide ground/CAAQMS monitoring stations across all Indian states
import initialIndiaStations from '../../data/indiaStations.json';

// Set public access token from environment variable
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

/**
 * Geographic Bounding Box tightly enclosing the official Indian national boundary
 */
const INDIA_RASTER_BOUNDS = {
  minLon: 68.10, // West coast of Gujarat / Rann of Kutch
  maxLon: 97.45, // Eastern border of Arunachal Pradesh
  minLat: 6.75,  // Indira Point / Great Nicobar & Kanyakumari
  maxLat: 37.10, // Northern frontier of Ladakh / Kashmir
};

/**
 * Convert Latitude in degrees to Web Mercator Y (radians).
 * Critical for 100% pixel-perfect alignment with Mapbox GL vector tiles.
 */
function latToMercatorY(lat) {
  const rad = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + rad / 2));
}

/**
 * Convert Web Mercator Y (radians) back to Latitude in degrees.
 */
function mercatorYToLat(y) {
  return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * (180 / Math.PI);
}

const Y_MIN = latToMercatorY(INDIA_RASTER_BOUNDS.minLat);
const Y_MAX = latToMercatorY(INDIA_RASTER_BOUNDS.maxLat);
const Y_SPAN = Y_MAX - Y_MIN;
const LON_SPAN = INDIA_RASTER_BOUNDS.maxLon - INDIA_RASTER_BOUNDS.minLon;

// 4-Corner Coordinates clockwise from Top-Left (NW) as required by Mapbox image source
const INDIA_RASTER_COORDINATES = [
  [INDIA_RASTER_BOUNDS.minLon, INDIA_RASTER_BOUNDS.maxLat], // Top-Left (NW)
  [INDIA_RASTER_BOUNDS.maxLon, INDIA_RASTER_BOUNDS.maxLat], // Top-Right (NE)
  [INDIA_RASTER_BOUNDS.maxLon, INDIA_RASTER_BOUNDS.minLat], // Bottom-Right (SE)
  [INDIA_RASTER_BOUNDS.minLon, INDIA_RASTER_BOUNDS.minLat], // Bottom-Left (SW)
];

/**
 * Quick Gliding Regions across the Indian Subcontinent
 * Smoothly flies the camera without segmenting or reloading the nationwide heatmap.
 */
const INDIA_REGION_PRESETS = [
  { id: 'all-india', name: 'All India Overview', icon: '🇮🇳', center: [79.2, 22.8], zoom: 4.6, pitch: 15, state: 'National Subcontinent' },
  { id: 'delhi-ncr', name: 'Delhi NCR & North', icon: '🏛️', center: [77.16, 28.66], zoom: 9.8, pitch: 26, state: 'National Capital Region' },
  { id: 'mumbai', name: 'Mumbai MMR', icon: '🌊', center: [72.8777, 19.0760], zoom: 10.0, pitch: 26, state: 'Maharashtra' },
  { id: 'bengaluru', name: 'Bengaluru Tech Belt', icon: '🌳', center: [77.5946, 12.9716], zoom: 10.0, pitch: 26, state: 'Karnataka' },
  { id: 'gangetic', name: 'Indo-Gangetic Basin', icon: '🌾', center: [82.5, 26.0], zoom: 7.0, pitch: 22, state: 'UP & Bihar River Corridor' },
  { id: 'kolkata', name: 'Kolkata & Bengal', icon: '🌉', center: [88.3639, 22.5726], zoom: 10.2, pitch: 26, state: 'West Bengal' },
  { id: 'chennai', name: 'Chennai & South Coast', icon: '🏖️', center: [80.2707, 13.0827], zoom: 10.2, pitch: 26, state: 'Tamil Nadu' },
  { id: 'hyderabad', name: 'Hyderabad & Deccan', icon: '💎', center: [78.4867, 17.3850], zoom: 10.0, pitch: 26, state: 'Telangana' },
  { id: 'himalayas', name: 'Himalayas & Ladakh', icon: '🏔️', center: [76.5, 33.5], zoom: 6.8, pitch: 28, state: 'J&K / Ladakh' },
];

// Distance helper (Haversine in km)
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Uncapped AQI Calculation based on US EPA breakpoints with extrapolation beyond 500
function calculateUncappedAqi(pm25) {
  if (pm25 <= 0) return 0;
  if (pm25 <= 12.0) return Math.round((50 / 12.0) * pm25);
  if (pm25 <= 35.4) return Math.round(50 + ((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1));
  if (pm25 <= 55.4) return Math.round(101 + ((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5));
  if (pm25 <= 150.4) return Math.round(151 + ((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5));
  if (pm25 <= 250.4) return Math.round(201 + ((300 - 201) / (250.4 - 150.5)) * (pm25 - 150.5));
  if (pm25 <= 350.4) return Math.round(301 + ((400 - 301) / (350.4 - 250.5)) * (pm25 - 250.5));
  if (pm25 <= 500.4) return Math.round(401 + ((500 - 401) / (500.4 - 350.5)) * (pm25 - 350.5));
  return Math.round(501 + ((pm25 - 500.4) * 0.85));
}

/**
 * Seamless Scientific Continuous AQI Color Spectrum
 * Provides 100% continuous, seamless color transitions without any contour darkening or banded lines.
 * Normalized t: 0.0 (Lowest / Cleanest) -> 1.0 (Highest / Most Polluted)
 */
const SEAMLESS_AQI_STOPS = [
  { t: 0.00, rgb: [16, 185, 129],  hex: '#10b981', label: 'Pristine Green' },
  { t: 0.15, rgb: [52, 211, 153],  hex: '#34d399', label: 'Emerald Mint' },
  { t: 0.30, rgb: [132, 204, 22],  hex: '#84cc16', label: 'Vivid Lime' },
  { t: 0.46, rgb: [234, 179, 8],   hex: '#eab308', label: 'Warm Yellow' },
  { t: 0.62, rgb: [249, 115, 22],  hex: '#f97316', label: 'Vivid Orange' },
  { t: 0.76, rgb: [234, 88, 12],   hex: '#ea580c', label: 'Burnt Ochre' },
  { t: 0.90, rgb: [220, 38, 38],   hex: '#dc2626', label: 'Scarlet Red' },
  { t: 1.00, rgb: [185, 28, 28],   hex: '#b91c1c', label: 'Deep Crimson' },
];

/**
 * Piecewise continuous interpolation across seamless stops with zero contour darkening.
 */
function interpolateSeamlessRgb(normalizedT) {
  const t = Math.max(0, Math.min(1, normalizedT));
  let lower = SEAMLESS_AQI_STOPS[0];
  let upper = SEAMLESS_AQI_STOPS[SEAMLESS_AQI_STOPS.length - 1];

  for (let i = 0; i < SEAMLESS_AQI_STOPS.length - 1; i++) {
    if (t >= SEAMLESS_AQI_STOPS[i].t && t <= SEAMLESS_AQI_STOPS[i + 1].t) {
      lower = SEAMLESS_AQI_STOPS[i];
      upper = SEAMLESS_AQI_STOPS[i + 1];
      break;
    }
  }

  const range = upper.t - lower.t || 1;
  const frac = (t - lower.t) / range;

  const r = Math.round(lower.rgb[0] + frac * (upper.rgb[0] - lower.rgb[0]));
  const g = Math.round(lower.rgb[1] + frac * (upper.rgb[1] - lower.rgb[1]));
  const b = Math.round(lower.rgb[2] + frac * (upper.rgb[2] - lower.rgb[2]));

  return [r, g, b];
}

/**
 * Trace the MultiPolygon path of the official Indian national boundary
 * onto an HTML5 2D canvas context using Web Mercator Projection for 100% exact alignment.
 */
function drawIndiaBoundaryPath(ctx, width, height) {
  ctx.beginPath();
  const geom = indiaBoundaryGeoJson?.features?.[0]?.geometry;
  if (!geom) return;

  const polygons = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];

  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (let i = 0; i < ring.length; i++) {
        const [lon, lat] = ring[i];
        // Exact Web Mercator Coordinate Mapping:
        const px = ((lon - INDIA_RASTER_BOUNDS.minLon) / LON_SPAN) * width;
        const py = ((Y_MAX - latToMercatorY(lat)) / Y_SPAN) * height;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }
  }
}

/**
 * Cached binary mask for India national boundary at grid resolution (1 = inside India, 0 = outside)
 */
let cachedIndiaMask = null;
function getIndiaBoundaryMask(width, height) {
  if (cachedIndiaMask && cachedIndiaMask.length === width * height) {
    return cachedIndiaMask;
  }
  if (typeof document === 'undefined') return new Uint8Array(width * height).fill(1);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new Uint8Array(width * height).fill(1);

  drawIndiaBoundaryPath(ctx, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  const imgData = ctx.getImageData(0, 0, width, height);
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    mask[i] = imgData.data[i * 4 + 3] > 64 ? 1 : 0;
  }
  cachedIndiaMask = mask;
  return mask;
}

/**
 * Computes raw 2D continuous spatial IDW grid across all of India simultaneously once per telemetry update.
 * Rows are distributed linearly in Web Mercator Y space to achieve 100% laser alignment with Mapbox.
 */
function computeRawSpatialGrid(stationsList, pollutantType = 'aqi', bounds = INDIA_RASTER_BOUNDS, width = 260, height = 260) {
  const mask = getIndiaBoundaryMask(width, height);
  const rawGrid = new Float32Array(width * height);

  const stData = (stationsList || []).map((s) => ({
    lat: s.lat,
    lon: s.lon,
    val: pollutantType === 'pm25' ? s.pm25 : pollutantType === 'pm10' ? s.pm10 : s.aqi,
  }));

  if (stData.length === 0) {
    return { rawGrid, mask, nationalMin: 40, nationalMax: 260, width, height, bounds };
  }

  // Continental-scale IDW parameters:
  // power = 2.0 (natural physical inverse-square dispersion over 3,000 km subcontinent)
  // epsilonKm = 15.0 km (prevents sharp pinhole artifacts around individual ground stations)
  const power = 2.0;
  const epsilonKm = 15.0;

  let nationalMin = Infinity;
  let nationalMax = -Infinity;

  for (let y = 0; y < height; y++) {
    const v = y / (height - 1);
    const mercY = (1 - v) * Y_MAX + v * Y_MIN;
    const lat = mercatorYToLat(mercY);
    const rowOffset = y * width;
    const cosLat = Math.cos((lat * Math.PI) / 180);

    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      const u = x / (width - 1);
      const lon = INDIA_RASTER_BOUNDS.minLon + u * LON_SPAN;

      let totalWeight = 0;
      let weightedVal = 0;

      for (let i = 0; i < stData.length; i++) {
        const s = stData[i];
        const dLat = (lat - s.lat) * 110.574;
        const dLon = (lon - s.lon) * (111.32 * cosLat);
        const distKm = Math.sqrt(dLat * dLat + dLon * dLon);
        const w = 1 / Math.pow(Math.max(epsilonKm, distKm), power);
        totalWeight += w;
        weightedVal += s.val * w;
      }

      const interpolatedVal = weightedVal / (totalWeight || 1);
      let effectiveAqi = interpolatedVal;
      if (pollutantType === 'pm25') {
        effectiveAqi = calculateUncappedAqi(interpolatedVal);
      } else if (pollutantType === 'pm10') {
        effectiveAqi = interpolatedVal * 0.9;
      }

      rawGrid[idx] = effectiveAqi;

      if (mask[idx] === 1) {
        if (effectiveAqi < nationalMin) nationalMin = effectiveAqi;
        if (effectiveAqi > nationalMax) nationalMax = effectiveAqi;
      }
    }
  }

  if (!Number.isFinite(nationalMin)) nationalMin = 40;
  if (!Number.isFinite(nationalMax)) nationalMax = 260;

  return {
    rawGrid,
    mask,
    nationalMin,
    nationalMax,
    width,
    height,
    bounds,
  };
}

/**
 * Samples the exact continuous spatial AQI/pollutant value from the active 2D raster grid at any (lon, lat).
 * Guaranteed to be 100% mathematically and visually identical to the rendered heatmap pixel.
 */
function sampleRasterGridVal(gridObj, lon, lat) {
  if (!gridObj || !gridObj.rawGrid) return null;
  const { rawGrid, width, height } = gridObj;
  const u = (lon - INDIA_RASTER_BOUNDS.minLon) / LON_SPAN;
  const x = Math.max(0, Math.min(width - 1, Math.round(u * (width - 1))));
  const mercY = latToMercatorY(lat);
  const v = (Y_MAX - mercY) / Y_SPAN;
  const y = Math.max(0, Math.min(height - 1, Math.round(v * (height - 1))));
  const val = rawGrid[y * width + x];
  return Number.isFinite(val) ? val : null;
}

/**
 * Calculates adaptive zoom-dependent min/max contrast range:
 * - At national overview (zoom <= 5.5): nationwide spread (lowest in India = Green, highest in India = Bright Red)
 * - As user zooms into ANY region (zoom 5.5 -> 10.0+): adapts to visible viewport min/max so local deviation is vivid!
 */
function calculateAdaptiveRange(gridObj, mapBounds, zoom, isAdaptiveMode = true) {
  if (!gridObj) {
    return {
      effectiveMin: 40,
      effectiveMax: 260,
      localMin: 40,
      localMax: 260,
      nationalMin: 40,
      nationalMax: 260,
      zoomFactor: 0,
    };
  }

  const { rawGrid, mask, nationalMin, nationalMax, width, height } = gridObj;

  if (!isAdaptiveMode || !mapBounds) {
    return {
      effectiveMin: nationalMin,
      effectiveMax: nationalMax,
      localMin: nationalMin,
      localMax: nationalMax,
      nationalMin,
      nationalMax,
      zoomFactor: 0,
    };
  }

  const mapWest = typeof mapBounds.getWest === 'function' ? mapBounds.getWest() : mapBounds.west;
  const mapEast = typeof mapBounds.getEast === 'function' ? mapBounds.getEast() : mapBounds.east;
  const mapSouth = typeof mapBounds.getSouth === 'function' ? mapBounds.getSouth() : mapBounds.south;
  const mapNorth = typeof mapBounds.getNorth === 'function' ? mapBounds.getNorth() : mapBounds.north;

  const rawX0 = Math.floor(((mapWest - INDIA_RASTER_BOUNDS.minLon) / LON_SPAN) * width);
  const rawX1 = Math.ceil(((mapEast - INDIA_RASTER_BOUNDS.minLon) / LON_SPAN) * width);
  const x0 = Math.max(0, Math.min(width - 1, Math.min(rawX0, rawX1)));
  const x1 = Math.max(0, Math.min(width - 1, Math.max(rawX0, rawX1)));

  const clampedNorth = Math.min(INDIA_RASTER_BOUNDS.maxLat, Math.max(INDIA_RASTER_BOUNDS.minLat, Math.max(mapNorth, mapSouth)));
  const clampedSouth = Math.min(INDIA_RASTER_BOUNDS.maxLat, Math.max(INDIA_RASTER_BOUNDS.minLat, Math.min(mapNorth, mapSouth)));

  const rawY0 = Math.floor(((Y_MAX - latToMercatorY(clampedNorth)) / Y_SPAN) * height);
  const rawY1 = Math.ceil(((Y_MAX - latToMercatorY(clampedSouth)) / Y_SPAN) * height);
  const y0 = Math.max(0, Math.min(height - 1, Math.min(rawY0, rawY1)));
  const y1 = Math.max(0, Math.min(height - 1, Math.max(rawY0, rawY1)));

  let localMin = Infinity;
  let localMax = -Infinity;
  let validCount = 0;

  for (let y = y0; y <= y1; y++) {
    const rowOffset = y * width;
    for (let x = x0; x <= x1; x++) {
      const idx = rowOffset + x;
      if (mask[idx] === 1) {
        const v = rawGrid[idx];
        if (v < localMin) localMin = v;
        if (v > localMax) localMax = v;
        validCount++;
      }
    }
  }

  if (validCount === 0 || !Number.isFinite(localMin)) {
    localMin = nationalMin;
    localMax = nationalMax;
  }

  // Smooth cubic ease from nationwide overview (zoom 5.5) to deep regional zoom (9.5+)
  const tZoom = Math.max(0, Math.min(1, (zoom - 5.5) / (9.5 - 5.5)));
  const zoomFactor = tZoom * tZoom * (3 - 2 * tZoom);

  let effectiveMin = (1 - zoomFactor) * nationalMin + zoomFactor * localMin;
  let effectiveMax = (1 - zoomFactor) * nationalMax + zoomFactor * localMax;

  // Enforce a minimum contrast span (20 AQI) so negligible 2-3 AQI noise isn't over-amplified
  const minSpan = 20;
  if (effectiveMax - effectiveMin < minSpan) {
    const mid = (effectiveMax + effectiveMin) / 2;
    effectiveMin = mid - minSpan / 2;
    effectiveMax = mid + minSpan / 2;
  }

  return {
    effectiveMin,
    effectiveMax,
    localMin: Math.round(localMin),
    localMax: Math.round(localMax),
    nationalMin: Math.round(nationalMin),
    nationalMax: Math.round(nationalMax),
    zoomFactor,
  };
}

/**
 * Renders the seamless continuous raster image with dynamic normalization and polygon clipping.
 * ZERO black contour rings - pure, smooth, high-fidelity gradients clipped strictly to India's borders!
 * Uses calibrated 175 base alpha (~68%) so underlying state borders, roads, and cities remain crisp and legible!
 */
function renderSeamlessRasterImage(gridObj, effectiveMin, effectiveMax) {
  if (typeof document === 'undefined' || !gridObj) return '';
  const { rawGrid, mask, width, height } = gridObj;

  const rawCanvas = document.createElement('canvas');
  rawCanvas.width = width;
  rawCanvas.height = height;
  const rawCtx = rawCanvas.getContext('2d');
  if (!rawCtx) return '';

  const imgData = rawCtx.createImageData(width, height);
  const data = imgData.data;
  const range = effectiveMax - effectiveMin || 1;

  for (let i = 0; i < width * height; i++) {
    if (mask[i] === 0) {
      data[i * 4 + 3] = 0; // 100% transparent outside India
      continue;
    }

    const val = rawGrid[i];
    const t = Math.max(0, Math.min(1, (val - effectiveMin) / range));
    const [r, g, b] = interpolateSeamlessRgb(t);

    const idx = i * 4;
    data[idx] = r;
    data[idx + 1] = g;
    data[idx + 2] = b;
    data[idx + 3] = 175; // Translucent 68% base alpha so terrain, cities and roads shine through clearly
  }

  rawCtx.putImageData(imgData, 0, 0);

  // Clip strictly to official India national boundary with Web Mercator precision
  const clippedCanvas = document.createElement('canvas');
  clippedCanvas.width = width;
  clippedCanvas.height = height;
  const clippedCtx = clippedCanvas.getContext('2d');
  if (!clippedCtx) return rawCanvas.toDataURL('image/png');

  clippedCtx.save();
  drawIndiaBoundaryPath(clippedCtx, width, height);
  clippedCtx.clip();

  // Draw smooth gradient heatmap inside India's national border only
  clippedCtx.drawImage(rawCanvas, 0, 0);
  clippedCtx.restore();

  return clippedCanvas.toDataURL('image/png');
}

/**
 * AQI Color & Badge helper synchronized directly with the seamless gradient and active range
 */
function getAqiColor(val, activeRange) {
  let hex = '#f97316';
  if (activeRange && activeRange.max > activeRange.min) {
    const t = Math.max(0, Math.min(1, (val - activeRange.min) / (activeRange.max - activeRange.min)));
    const [r, g, b] = interpolateSeamlessRgb(t);
    hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  } else {
    const [r, g, b] = interpolateSeamlessRgb(Math.max(0, Math.min(1, (val - 40) / 260)));
    hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  let label = 'Good';
  let badgeBg = 'rgba(16, 185, 129, 0.2)';
  let textHex = '#34d399';

  if (val <= 50) {
    label = 'Good / Pristine';
    badgeBg = 'rgba(16, 185, 129, 0.2)';
    textHex = '#34d399';
  } else if (val <= 100) {
    label = 'Satisfactory';
    badgeBg = 'rgba(132, 204, 22, 0.2)';
    textHex = '#a3e635';
  } else if (val <= 200) {
    label = 'Moderate';
    badgeBg = 'rgba(234, 179, 8, 0.2)';
    textHex = '#facc15';
  } else if (val <= 300) {
    label = 'Poor';
    badgeBg = 'rgba(249, 115, 22, 0.2)';
    textHex = '#fb923c';
  } else if (val <= 400) {
    label = 'Very Poor';
    badgeBg = 'rgba(220, 38, 38, 0.2)';
    textHex = '#f87171';
  } else {
    label = 'Severe / Hazardous';
    badgeBg = 'rgba(153, 27, 27, 0.3)';
    textHex = '#f87171';
  }

  return { hex, label, textHex, badgeBg };
}

export default function DelhiAqiHeatmap() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const targetMarkerRef = useRef(null);

  // 108 Nationwide stations state across all states and union territories
  const [stations, setStations] = useState(initialIndiaStations);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('Fetching live national telemetry...');

  // User location coordinates (defaults to Central India, or user's live GPS)
  const [userLocation, setUserLocation] = useState({
    lat: 28.6139,
    lon: 77.2090,
    label: 'New Delhi (National Capital)',
    isLiveGps: false,
    accuracy: null,
  });

  // Pinpoint clicked location on the map for micro-zone analysis anywhere in India
  const [inspectedPoint, setInspectedPoint] = useState(null);

  const [activePollutant, setActivePollutant] = useState('aqi'); // 'aqi' | 'pm25' | 'pm10'
  const [selectedStation, setSelectedStation] = useState(initialIndiaStations[0]); // Default to first station

  // DEFAULT OPACITY: Balanced translucent 0.45 so the map beneath (roads, cities, terrain) is clearly visible
  const [heatIntensity, setHeatIntensity] = useState(0.45);
  const [showStationPins, setShowStationPins] = useState(true);
  const [showHeatmapLayer, setShowHeatmapLayer] = useState(true);
  const [showStateBorders, setShowStateBorders] = useState(true);
  const [is3DBuildings, setIs3DBuildings] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  // Dynamic Zoom-Adaptive Contrast Calibration State
  const [isAdaptiveMode, setIsAdaptiveMode] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(4.6);
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
    setCurrentZoom(Math.round(zoom * 10) / 10);
    const bounds = map.getBounds();

    let effectiveMin, effectiveMax;
    if (isAdaptiveModeRef.current) {
      const rangeResult = calculateAdaptiveRange(gridCacheRef.current, bounds, zoom);
      effectiveMin = rangeResult.effectiveMin;
      effectiveMax = rangeResult.effectiveMax;
      setActiveRange({
        min: Math.round(effectiveMin),
        max: Math.round(effectiveMax),
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
        min: Math.round(effectiveMin),
        max: Math.round(effectiveMax),
        localMin: Math.round(effectiveMin),
        localMax: Math.round(effectiveMax),
        nationalMin: Math.round(effectiveMin),
        nationalMax: Math.round(effectiveMax),
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

  // Gemini AI Advisory State (Token-Optimized)
  const [geminiAdvisory, setGeminiAdvisory] = useState('');
  const [tokenStats, setTokenStats] = useState(null);
  const [isLoadingAdvisory, setIsLoadingAdvisory] = useState(false);

  // Fetch live national station telemetry across all 108 stations
  const fetchLiveNationalData = useCallback(async (userLat = 28.6139, userLon = 77.2090) => {
    setIsLoadingLive(true);
    try {
      const res = await fetch(`/api/india-heatmap?lat=${userLat}&lon=${userLon}`);
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
      });
    }
  }, []);

  // Geocoding search handler (supports cities, districts, and towns across India)
  const handleSearchInput = async (val) => {
    setSearchQuery(val);
    if (!val || val.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const token = mapboxgl.accessToken;
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(val)}.json?access_token=${token}&country=in&types=place,locality,region&limit=6`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.features) {
          setSearchResults(json.features);
          setShowSearchDropdown(true);
        }
      }
    } catch (err) {
      console.warn('Geocoding search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchedPlace = (feature) => {
    const [lon, lat] = feature.center;
    const customPreset = {
      id: feature.id || feature.text.toLowerCase().replace(/\s+/g, '-'),
      name: feature.text,
      icon: '📍',
      center: [lon, lat],
      zoom: 10.5,
      pitch: 24,
      state: feature.place_name,
    };
    handleGlideToRegion(customPreset);
  };

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
        if (data.advisory) {
          setGeminiAdvisory(data.advisory);
          setTokenStats(data.tokenUsage);
          setIsLoadingAdvisory(false);
          return;
        }
      }
      setGeminiAdvisory(
        station.aqi > 250
          ? 'Elevated regional pollution. High risk of respiratory irritation; wear an N95 mask outdoors and run HEPA air filtration indoors.'
          : station.aqi > 120
          ? 'Moderate particulate haze. Sensitive individuals should avoid prolonged exertion during early morning and late evening.'
          : 'Air quality is within favorable standards. Outdoor commutes and recreation are safe.'
      );
    } catch {
      setGeminiAdvisory(
        station.aqi > 250
          ? 'Elevated regional pollution. High risk of respiratory irritation; wear an N95 mask outdoors and run HEPA air filtration indoors.'
          : station.aqi > 120
          ? 'Moderate particulate haze. Sensitive individuals should avoid prolonged exertion during early morning and late evening.'
          : 'Air quality is within favorable standards. Outdoor commutes and recreation are safe.'
      );
    } finally {
      setIsLoadingAdvisory(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveNationalData(userLocation.lat, userLocation.lon);
  }, [fetchLiveNationalData, userLocation.lat, userLocation.lon]);

  useEffect(() => {
    if (selectedStation) {
      fetchGeminiAdvisory(selectedStation);
    }
  }, [selectedStation, fetchGeminiAdvisory]);

  // Nearest station calculation
  const nearestStation = useMemo(() => {
    let nearest = stations[0] || initialIndiaStations[0];
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

  // Interpolated AQI at user's current coordinates using nationwide IDW (p = 2.0)
  const userAqiEstimate = useMemo(() => {
    const sampled = sampleRasterGridVal(gridCacheRef.current, userLocation.lon, userLocation.lat);
    if (sampled !== null) return Math.round(sampled);
    let totalWeight = 0;
    let weightedAqi = 0;
    stations.forEach((st) => {
      const d = calculateDistanceKm(userLocation.lat, userLocation.lon, st.lat, st.lon);
      const w = 1 / Math.pow(Math.max(15.0, d), 2.0);
      totalWeight += w;
      weightedAqi += st.aqi * w;
    });
    return Math.round(weightedAqi / (totalWeight || 1));
  }, [stations, userLocation]);

  const userColor = useMemo(() => getAqiColor(userAqiEstimate, activeRange), [userAqiEstimate, activeRange]);

  // Browser Geolocation trigger - locates user anywhere in India
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;

        let placeName = 'Your Live Location';
        try {
          const token = mapboxgl.accessToken;
          const revRes = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}&country=in&types=place,locality,neighborhood&limit=1`
          );
          if (revRes.ok) {
            const revJson = await revRes.json();
            if (revJson.features?.[0]?.text) {
              placeName = revJson.features[0].text;
            }
          }
        } catch {
          // ignore reverse geocode error
        }

        const gpsPreset = {
          id: 'user-gps',
          name: placeName,
          icon: '🎯',
          center: [longitude, latitude],
          zoom: 11.5,
          pitch: 24,
          state: `Live GPS (±${Math.round(accuracy)}m)`,
        };

        setUserLocation({
          lat: latitude,
          lon: longitude,
          label: placeName,
          isLiveGps: true,
          accuracy: Math.round(accuracy),
        });

        handleGlideToRegion(gpsPreset);
      },
      () => {
        setIsLocating(false);
        setGpsError('Could not obtain live GPS coordinates.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

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
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1', // High-contrast night navigation showing roads, highways and labels
      center: [78.9629, 22.5937], // Center of India
      zoom: 4.6,
      minZoom: 3.8,
      maxZoom: 16.5,
      pitch: 16, // Gentle subcontinental perspective
      bearing: 0,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    map.on('load', () => {
      // 1. Add Stations GeoJSON Data Source
      map.addSource('aqi-stations', {
        type: 'geojson',
        data: stationsGeoJson,
      });

      // 2. LAYER POSITIONING: Insert raster underneath roads, state borders, and labels
      // This ensures roads, national highways, and state lines render crisply ON TOP of the heatmap!
      const layers = map.getStyle().layers;
      const roadLayerId = layers.find((l) => l.id.startsWith('road-') && l.type === 'line')?.id;
      const adminLayerId = layers.find((l) => l.id === 'admin-1-boundary-bg' || l.id === 'admin-1-boundary')?.id;
      const symbolLayerId = layers.find((l) => l.type === 'symbol' && l.layout && l.layout['text-field'])?.id;
      const beforeLayerId = roadLayerId || adminLayerId || symbolLayerId;

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

      // 4. Boost State Boundaries Visibility (Crisp silver-cyan lines on dark backdrop)
      if (map.getLayer('admin-1-boundary')) {
        map.setPaintProperty('admin-1-boundary', 'line-color', '#93c5fd'); // Luminous sky-blue/slate state border
        map.setPaintProperty('admin-1-boundary', 'line-width', [
          'interpolate', ['linear'], ['zoom'],
          3, 1.2,
          6, 1.8,
          10, 2.5
        ]);
        map.setPaintProperty('admin-1-boundary', 'line-opacity', 0.92);
        map.setPaintProperty('admin-1-boundary', 'line-dasharray', [4, 2]);
      }

      if (map.getLayer('admin-1-boundary-bg')) {
        map.setPaintProperty('admin-1-boundary-bg', 'line-color', '#070a13');
        map.setPaintProperty('admin-1-boundary-bg', 'line-width', [
          'interpolate', ['linear'], ['zoom'],
          3, 2.2,
          6, 3.0,
          10, 4.0
        ]);
        map.setPaintProperty('admin-1-boundary-bg', 'line-opacity', 0.80);
      }

      // 5. 3D Building Extrusion Layer (Shows urban architecture on close zoom)
      map.addLayer(
        {
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 13,
          paint: {
            'fill-extrusion-color': '#111827',
            'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, 0, 14.05, ['get', 'height']],
            'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 13, 0, 14.05, ['get', 'min_height']],
            'fill-extrusion-opacity': 0.65,
          },
        },
        symbolLayerId
      );

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
        symbolLayerId
      );

      // 7. Click Anywhere in India to Pinpoint Inspect Micro-Zone AQI
      map.on('click', (e) => {
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
        let sampledVal = sampleRasterGridVal(gridCacheRef.current, lng, lat);
        if (sampledVal === null) {
          let totalW = 0;
          let weightedAqi = 0;
          currentStations.forEach((st) => {
            const d = calculateDistanceKm(lat, lng, st.lat, st.lon);
            const w = 1 / Math.pow(Math.max(15.0, d), 2.0);
            totalW += w;
            weightedAqi += st.aqi * w;
          });
          sampledVal = weightedAqi / (totalW || 1);
        }

        const pAqi = Math.round(sampledVal);
        const pPm25 = Math.round((nearest?.pm25 ? (pAqi / (nearest.aqi || 1)) * nearest.pm25 : pAqi * 0.55) * 10) / 10;

        setInspectedPoint({
          lat: Math.round(lat * 10000) / 10000,
          lon: Math.round(lng * 10000) / 10000,
          aqi: pAqi,
          pm25: pPm25,
          nearestStation: nearest ? nearest.name : 'Indian Subcontinent Ground Station',
          nearestState: nearest?.state || 'India',
          distanceKm: minD,
          label: `Pinpoint Inspection (${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E)`,
        });
      });

      mapInstanceRef.current = map;

      // Real-time Viewport & Zoom listener for continuous dynamic palette recalibration
      let throttleTimer = null;
      const handleViewportChange = () => {
        if (throttleTimer) return;
        throttleTimer = setTimeout(() => {
          throttleTimer = null;
          updateRasterForViewport();
        }, 35);
      };

      map.on('move', handleViewportChange);
      map.on('zoom', handleViewportChange);
      map.on('moveend', () => {
        if (throttleTimer) clearTimeout(throttleTimer);
        throttleTimer = null;
        updateRasterForViewport();
      });
      map.on('zoomend', () => {
        if (throttleTimer) clearTimeout(throttleTimer);
        throttleTimer = null;
        updateRasterForViewport();
      });
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [updateRasterForViewport]);

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
    if (!map || !map.getLayer('admin-1-boundary')) return;
    map.setLayoutProperty('admin-1-boundary', 'visibility', showStateBorders ? 'visible' : 'none');
    if (map.getLayer('admin-1-boundary-bg')) {
      map.setLayoutProperty('admin-1-boundary-bg', 'visibility', showStateBorders ? 'visible' : 'none');
    }
  }, [showStateBorders]);

  // Toggle 3D Buildings visibility
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.getLayer('3d-buildings')) return;
    map.setLayoutProperty('3d-buildings', 'visibility', is3DBuildings ? 'visible' : 'none');
  }, [is3DBuildings]);

  // Update HTML Station Markers across all of India
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!showStationPins) return;

    stations.forEach((st) => {
      const isSelected = selectedStation?.id === st.id;

      const el = document.createElement('div');
      el.className = 'mapbox-station-pin-wrap';
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.alignItems = 'center';
      el.style.cursor = 'pointer';
      el.style.transformOrigin = 'bottom center';
      el.style.transition = 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)';

      el.innerHTML = `
        <div style="
          filter: drop-shadow(0 3px 6px rgba(0,0,0,0.7));
          transform: ${isSelected ? 'scale(1.28)' : 'scale(1)'};
          transition: transform 0.2s ease;
        ">
          <svg width="${isSelected ? '24' : '18'}" height="${isSelected ? '32' : '24'}" viewBox="0 0 24 32" fill="none">
            <path d="M12 0C5.373 0 0 5.373 0 12c0 9.25 12 20 12 20s12-10.75 12-20c0-6.627-5.373-12-12-12z" fill="#f43f5e" stroke="#ffffff" stroke-width="${isSelected ? '1.8' : '1.2'}"/>
            <circle cx="12" cy="11" r="${isSelected ? '4.8' : '3.4'}" fill="#ffffff"/>
          </svg>
        </div>
        ${isSelected ? `
          <div style="
            margin-top: 2px;
            background: rgba(15, 23, 42, 0.96);
            backdrop-filter: blur(8px);
            border: 1px solid #f43f5e;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            color: #ffffff;
            white-space: nowrap;
            box-shadow: 0 4px 16px rgba(244, 63, 94, 0.45);
            pointer-events: none;
          ">
            ${st.name.split(',')[0].trim()}: <span style="color: #f43f5e; font-weight: 800;">${st.aqi} AQI</span>
          </div>
        ` : ''}
      `;

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.25)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = isSelected ? 'scale(1.15)' : 'scale(1)';
      });
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedStation(st);
        setInspectedPoint(null);
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([st.lon, st.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [stations, selectedStation, showStationPins]);

  // Update Pinpoint Target Marker when user clicks anywhere on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (targetMarkerRef.current) {
      targetMarkerRef.current.remove();
      targetMarkerRef.current = null;
    }

    if (!inspectedPoint) return;

    const targetEl = document.createElement('div');
    targetEl.style.display = 'flex';
    targetEl.style.flexDirection = 'column';
    targetEl.style.alignItems = 'center';
    targetEl.style.pointerEvents = 'none';

    const color = getAqiColor(inspectedPoint.aqi, activeRange);

    targetEl.innerHTML = `
      <div style="
        position: relative;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          position: absolute;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 2px solid ${color.hex};
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
          opacity: 0.8;
        "></span>
        <span style="
          position: absolute;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${color.hex};
          box-shadow: 0 0 12px ${color.hex};
          border: 2px solid #ffffff;
        "></span>
      </div>
      <div style="
        margin-top: 4px;
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(8px);
        border: 1px solid ${color.hex};
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 700;
        color: #ffffff;
        white-space: nowrap;
        box-shadow: 0 6px 20px rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        gap: 6px;
      ">
        <span style="width: 7px; height: 7px; border-radius: 50%; background: ${color.hex};"></span>
        <span>Pinpoint AQI: <strong style="color: ${color.hex}">${inspectedPoint.aqi}</strong></span>
      </div>
    `;

    targetMarkerRef.current = new mapboxgl.Marker({ element: targetEl, anchor: 'center' })
      .setLngLat([inspectedPoint.lon, inspectedPoint.lat])
      .addTo(map);
  }, [inspectedPoint, activeRange]);

  // Update User Location Live Beacon Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    const userEl = document.createElement('div');
    userEl.style.display = 'flex';
    userEl.style.flexDirection = 'column';
    userEl.style.alignItems = 'center';
    userEl.style.pointerEvents = 'none';

    userEl.innerHTML = `
      <div style="
        position: relative;
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          position: absolute;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(56, 189, 248, 0.25);
          border: 2px solid #38bdf8;
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        "></span>
        <span style="
          position: absolute;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #38bdf8;
          box-shadow: 0 0 16px #38bdf8;
          border: 2.5px solid #ffffff;
        "></span>
      </div>
      <div style="
        margin-top: 4px;
        background: rgba(15, 23, 42, 0.94);
        backdrop-filter: blur(8px);
        border: 1px solid #38bdf8;
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 800;
        color: #ffffff;
        white-space: nowrap;
        box-shadow: 0 4px 18px rgba(56, 189, 248, 0.35);
        display: flex;
        align-items: center;
        gap: 5px;
        z-index: 2;
      ">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: #38bdf8; box-shadow: 0 0 6px #38bdf8;"></span>
        YOU ARE HERE (${userAqiEstimate} AQI)
      </div>
    `;

    userMarkerRef.current = new mapboxgl.Marker({ element: userEl })
      .setLngLat([userLocation.lon, userLocation.lat])
      .addTo(map);
  }, [userLocation, userAqiEstimate]);

  return (
    <section
      id="delhi-aqi-heatmap"
      style={{
        position: 'relative',
        zIndex: 40,
        minHeight: '100vh',
        background: '#070a12',
        color: '#f8fafc',
        padding: '40px 24px 80px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Background subtle grid pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage:
            'radial-gradient(circle at 50% 15%, rgba(30, 41, 59, 0.4) 0%, transparent 70%), linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 40px 40px, 40px 40px',
          opacity: 0.8,
        }}
      />

      <div style={{ maxWidth: '1440px', width: '100%', position: 'relative', zIndex: 10 }}>
        {/* ============================================================== */}
        {/* SECTION HEADER & CONTROL STRIP                                 */}
        {/* ============================================================== */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            marginBottom: '24px',
            paddingBottom: '20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#38bdf8',
                  boxShadow: '0 0 10px #38bdf8',
                }}
              />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', color: '#38bdf8', textTransform: 'uppercase' }}>
                Mapbox GL National Subcontinent Engine · India-Wide Real-Time Grid
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>•</span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{lastUpdated}</span>
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '2.2rem',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              India National Multi-Point AQI Heatmap
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: '6px 0 0' }}>
              Subcontinental 2D spatial AQI plot · Web Mercator precision border lock · Translucent atmospheric layer revealing state borders, highways & topography beneath
            </p>
          </div>

          {/* Metric Switcher & GPS Trigger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Metric Selector Tabs */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(15, 23, 42, 0.8)',
                padding: '4px',
                borderRadius: '9999px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              {[
                { id: 'aqi', label: 'Air Quality (AQI)' },
                { id: 'pm25', label: 'PM2.5 (µg/m³)' },
                { id: 'pm10', label: 'PM10 (µg/m³)' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActivePollutant(m.id)}
                  style={{
                    background: activePollutant === m.id ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                    color: activePollutant === m.id ? '#38bdf8' : '#94a3b8',
                    border: activePollutant === m.id ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Refresh Live Button */}
            <button
              onClick={() => fetchLiveNationalData(userLocation.lat, userLocation.lon)}
              disabled={isLoadingLive}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                padding: '8px 14px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={13} className={isLoadingLive ? 'animate-spin' : ''} />
              <span>{isLoadingLive ? 'Refreshing...' : 'Refresh Telemetry'}</span>
            </button>

            {/* GPS Locator Button */}
            <button
              onClick={handleDetectLocation}
              disabled={isLocating}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: userLocation.isLiveGps ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                color: userLocation.isLiveGps ? '#34d399' : '#38bdf8',
                border: `1px solid ${userLocation.isLiveGps ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.3)'}`,
                padding: '8px 16px',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Navigation size={14} className={isLocating ? 'animate-spin' : ''} />
              <span>{isLocating ? 'Detecting GPS...' : userLocation.isLiveGps ? 'Live GPS Active' : 'Locate My Position'}</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* NATIONWIDE REGION GLIDING BAR + PLACE SEARCH BAR              */}
        {/* ============================================================== */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            marginBottom: '22px',
            padding: '12px 18px',
            borderRadius: '16px',
            background: 'rgba(15, 23, 42, 0.82)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Quick Glide Region Shortcuts */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Globe size={14} color="#38bdf8" /> Quick Glide:
            </span>
            {INDIA_REGION_PRESETS.map((preset) => {
              const isActive = activePreset.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleGlideToRegion(preset)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: isActive ? 700 : 500,
                    background: isActive ? 'rgba(56, 189, 248, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                    color: isActive ? '#38bdf8' : '#cbd5e1',
                    border: isActive ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    boxShadow: isActive ? '0 0 12px rgba(56, 189, 248, 0.3)' : 'none',
                  }}
                >
                  <span>{preset.icon}</span>
                  <span>{preset.name}</span>
                </button>
              );
            })}
          </div>

          {/* Place Search Bar with Autocomplete across India */}
          <div style={{ position: 'relative', minWidth: '280px', flex: '1 1 300px', maxWidth: '380px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(2, 6, 23, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: '9999px',
                padding: '6px 14px',
              }}
            >
              <Search size={14} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search any Indian city, district, or town..."
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowSearchDropdown(true);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  width: '100%',
                }}
              />
              {isSearching && <RefreshCw size={13} className="animate-spin" color="#38bdf8" />}
            </div>

            {/* Dropdown Suggestions */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  zIndex: 60,
                  background: '#090d1a',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '12px',
                  boxShadow: '0 15px 35px rgba(0,0,0,0.85)',
                  overflow: 'hidden',
                }}
              >
                {searchResults.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => handleSelectSearchedPlace(f)}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#e2e8f0',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <MapPin size={13} color="#38bdf8" />
                    <div>
                      <strong style={{ color: '#ffffff' }}>{f.text}</strong>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>
                        {f.place_name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* MAIN SPLIT: HIGH-DETAIL MAPBOX (LEFT) + VITALS SIDEBAR (RIGHT) */}
        {/* ============================================================== */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.75fr) minmax(320px, 1fr)',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* ============================================================ */}
          {/* LEFT: REAL DETAILED MAPBOX MAP WITH WebGL HEATMAP            */}
          {/* ============================================================ */}
          <div
            className="glass-panel"
            style={{
              position: 'relative',
              borderRadius: '20px',
              overflow: 'hidden',
              background: '#040711',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(56, 189, 248, 0.05)',
              height: '720px',
            }}
          >
            {/* The Actual Mapbox GL Map Container */}
            <div
              ref={mapContainerRef}
              style={{
                width: '100%',
                height: '100%',
                background: '#040711',
              }}
            />

            {/* Top-left Click-to-Inspect Hint Pill */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                zIndex: 10,
                background: 'rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(244, 63, 94, 0.4)',
                padding: '6px 12px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.6)',
              }}
            >
              <Crosshair size={13} color="#f43f5e" />
              <span style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 600 }}>
                Click anywhere on India for <strong style={{ color: '#f43f5e' }}>pinpoint micro-zone AQI</strong>
              </span>
            </div>

            {/* Bottom-left Map Floating Controls Bar with Opacity Presets & State Borders */}
            {/* Bottom-left Map Floating Controls Bar (Clean 2-Tier HUD Deck) */}
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                background: 'rgba(11, 17, 32, 0.94)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                padding: '10px 14px',
                borderRadius: '14px',
                boxShadow: '0 12px 35px rgba(0, 0, 0, 0.75), 0 0 20px rgba(56, 189, 248, 0.08)',
                maxWidth: 'calc(100% - 85px)',
              }}
            >
              {/* TIER 1: PRIMARY MAP LAYERS & DISPLAY MODES */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: '2px' }}>
                  Layers:
                </span>

                {/* Heatmap Layer Toggle */}
                <button
                  onClick={() => setShowHeatmapLayer((v) => !v)}
                  style={{
                    background: showHeatmapLayer ? 'rgba(249, 115, 22, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                    color: showHeatmapLayer ? '#fb923c' : '#94a3b8',
                    border: showHeatmapLayer ? '1px solid rgba(249, 115, 22, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '4px 9px',
                    borderRadius: '7px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Layers size={13} color={showHeatmapLayer ? '#fb923c' : '#94a3b8'} />
                  <span>Heat Layer: {showHeatmapLayer ? 'ON' : 'OFF'}</span>
                </button>

                {/* Adaptive Contrast Mode Toggle */}
                <button
                  onClick={() => setIsAdaptiveMode((v) => !v)}
                  title="Dynamically recalibrate palette: lowest visible AQI becomes green, highest becomes bright red as you zoom in"
                  style={{
                    background: isAdaptiveMode ? 'rgba(16, 185, 129, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                    color: isAdaptiveMode ? '#34d399' : '#94a3b8',
                    border: isAdaptiveMode ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '4px 9px',
                    borderRadius: '7px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Sparkles size={13} color={isAdaptiveMode ? '#34d399' : '#94a3b8'} />
                  <span>Adaptive Contrast: {isAdaptiveMode ? 'ON' : 'OFF'}</span>
                  {isAdaptiveMode && activeRange.isZoomed && (
                    <span
                      style={{
                        background: '#10b981',
                        color: '#040711',
                        fontSize: '9px',
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        marginLeft: '2px',
                      }}
                    >
                      ZOOMED
                    </span>
                  )}
                </button>

                {/* State Borders Toggle */}
                <button
                  onClick={() => setShowStateBorders((v) => !v)}
                  style={{
                    background: showStateBorders ? 'rgba(96, 165, 250, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                    color: showStateBorders ? '#93c5fd' : '#94a3b8',
                    border: showStateBorders ? '1px solid rgba(96, 165, 250, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '4px 9px',
                    borderRadius: '7px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <MapIcon size={13} color={showStateBorders ? '#93c5fd' : '#94a3b8'} />
                  <span>State Borders: {showStateBorders ? 'ON' : 'OFF'}</span>
                </button>

                {/* 108 Monitoring Pins Toggle */}
                <button
                  onClick={() => setShowStationPins((v) => !v)}
                  style={{
                    background: showStationPins ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: showStationPins ? '#38bdf8' : '#94a3b8',
                    border: showStationPins ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '4px 9px',
                    borderRadius: '7px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {showStationPins ? <Eye size={13} color="#38bdf8" /> : <EyeOff size={13} color="#94a3b8" />}
                  <span>108 Pins</span>
                </button>

                {/* 3D Buildings Toggle */}
                <button
                  onClick={() => setIs3DBuildings((v) => !v)}
                  style={{
                    background: is3DBuildings ? 'rgba(168, 85, 247, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                    color: is3DBuildings ? '#c084fc' : '#94a3b8',
                    border: is3DBuildings ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '4px 9px',
                    borderRadius: '7px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  3D Urban
                </button>
              </div>

              {/* HAIRLINE DIVIDER */}
              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', width: '100%' }} />

              {/* TIER 2: ATMOSPHERIC HEAT OPACITY CONTROLS & PRESETS */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Sliders size={13} color="#38bdf8" />
                  <span style={{ color: '#cbd5e1', fontWeight: 600, fontSize: '0.72rem' }}>Heat Opacity:</span>
                  <input
                    type="range"
                    min="0.10"
                    max="0.85"
                    step="0.02"
                    value={heatIntensity}
                    onChange={(e) => setHeatIntensity(parseFloat(e.target.value))}
                    style={{ width: '70px', accentColor: '#38bdf8', cursor: 'pointer' }}
                  />
                  <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.74rem', minWidth: '32px' }}>
                    {Math.round(heatIntensity * 100)}%
                  </span>
                </div>

                {/* Quick Opacity Presets */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#64748b', fontSize: '0.68rem', marginRight: '2px' }}>Presets:</span>
                  {[
                    { label: 'Subtle', val: 0.28 },
                    { label: 'Balanced', val: 0.45 },
                    { label: 'Vivid', val: 0.68 },
                  ].map((p) => {
                    const isSelected = Math.abs(heatIntensity - p.val) < 0.05;
                    return (
                      <button
                        key={p.label}
                        onClick={() => setHeatIntensity(p.val)}
                        style={{
                          background: isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                          color: isSelected ? '#38bdf8' : '#94a3b8',
                          border: isSelected ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                          padding: '2px 8px',
                          borderRadius: '5px',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Top-right Mapbox High-Def Badge */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                zIndex: 10,
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                padding: '6px 12px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#38bdf8',
                fontSize: '0.72rem',
                fontWeight: 700,
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
              }}
            >
              <Compass size={15} color="#38bdf8" />
              <span>MAPBOX VECTOR DARK · ALL INDIA</span>
            </div>
          </div>

          {/* ============================================================ */}
          {/* RIGHT: LOCALIZED TELEMETRY & PINPOINT INSPECTION            */}
          {/* ============================================================ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 1. PINPOINT INSPECTION OR YOUR REAL-TIME GPS POSITION CARD */}
            {inspectedPoint ? (
              <div
                className="glass-panel"
                style={{
                  padding: '24px',
                  borderRadius: '18px',
                  border: '1px solid rgba(244, 63, 94, 0.45)',
                  background: 'linear-gradient(145deg, rgba(30, 15, 25, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(244, 63, 94, 0.15)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Crosshair size={18} color="#f43f5e" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f43f5e', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Pinpoint Micro-Zone Analysis
                    </span>
                  </div>
                  <button
                    onClick={() => setInspectedPoint(null)}
                    style={{
                      fontSize: '0.72rem',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#cbd5e1',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Reset to GPS
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '3.6rem',
                      fontWeight: 900,
                      lineHeight: 1,
                      color: getAqiColor(inspectedPoint.aqi, activeRange).hex,
                      textShadow: `0 0 25px ${getAqiColor(inspectedPoint.aqi, activeRange).hex}66`,
                    }}
                  >
                    {inspectedPoint.aqi}
                  </span>
                  <div>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: getAqiColor(inspectedPoint.aqi, activeRange).textHex }}>
                      AQI · {getAqiColor(inspectedPoint.aqi, activeRange).label}
                    </span>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                      {activeRange.isZoomed
                        ? `Calibrated to local zoom viewport (${activeRange.min} → ${activeRange.max} AQI)`
                        : 'Subcontinental spatial IDW estimate at clicked point'}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginTop: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '0.78rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Target Coordinates:</span>
                    <span style={{ color: '#ffffff', fontFamily: 'monospace', fontWeight: 600 }}>
                      {inspectedPoint.lat}° N, {inspectedPoint.lon}° E
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Estimated PM2.5:</span>
                    <strong style={{ color: '#f87171' }}>{inspectedPoint.pm25} µg/m³</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Nearest Ground Station:</span>
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                      {inspectedPoint.nearestStation.split('(')[0]} ({inspectedPoint.distanceKm} km)
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="glass-panel"
                style={{
                  padding: '24px',
                  borderRadius: '18px',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.85) 0%, rgba(8, 14, 26, 0.95) 100%)',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(56, 189, 248, 0.1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Crosshair size={18} color="#38bdf8" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Your Micro-Zone Vitals
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      background: userLocation.isLiveGps ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                      color: userLocation.isLiveGps ? '#34d399' : '#94a3b8',
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      fontWeight: 600,
                    }}
                  >
                    {userLocation.isLiveGps ? 'Live Triangulation' : 'Default Pin'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '3.6rem',
                      fontWeight: 900,
                      lineHeight: 1,
                      color: userColor.hex,
                      textShadow: `0 0 25px ${userColor.hex}66`,
                    }}
                  >
                    {userAqiEstimate}
                  </span>
                  <div>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: userColor.textHex }}>
                      AQI · {userColor.label}
                    </span>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                      Spatial IDW estimate at your exact coordinates
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginTop: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '0.78rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Location:</span>
                    <strong style={{ color: '#ffffff' }}>{userLocation.label}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Coordinates:</span>
                    <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>
                      {userLocation.lat.toFixed(4)}° N, {userLocation.lon.toFixed(4)}° E
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Nearest CAAQMS Sensor:</span>
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                      {nearestStation.station.name.split(',')[0]} ({nearestStation.distance} km)
                    </span>
                  </div>
                </div>

                {gpsError && (
                  <div style={{ marginTop: '12px', fontSize: '0.72rem', color: '#f87171' }}>
                    * {gpsError}
                  </div>
                )}
              </div>
            )}

            {/* 2. SELECTED CAAQMS STATION DEEP DIVE */}
            <div
              className="glass-panel"
              style={{
                padding: '24px',
                borderRadius: '18px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(15, 23, 42, 0.75)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Selected Monitoring Node
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: getAqiColor(selectedStation.aqi, activeRange).hex,
                    background: `${getAqiColor(selectedStation.aqi, activeRange).hex}22`,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontWeight: 700,
                  }}
                >
                  {selectedStation.type || 'CAAQMS Node'}
                </span>
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px' }}>
                {selectedStation.name}
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 16px' }}>
                {selectedStation.zone || selectedStation.state || 'India'} · Multi-Source Ground & Satellite Grid
              </p>

              {/* Station metrics grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 10px', borderRadius: '10px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>AQI Index</span>
                  <strong style={{ fontSize: '1.3rem', color: getAqiColor(selectedStation.aqi, activeRange).hex }}>
                    {selectedStation.aqi}
                  </strong>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 10px', borderRadius: '10px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>PM2.5 (Fine)</span>
                  <strong style={{ fontSize: '1.2rem', color: '#f87171' }}>
                    {selectedStation.pm25} <span style={{ fontSize: '0.65rem' }}>µg</span>
                  </strong>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 10px', borderRadius: '10px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>PM10 (Coarse)</span>
                  <strong style={{ fontSize: '1.2rem', color: '#fb923c' }}>
                    {selectedStation.pm10} <span style={{ fontSize: '0.65rem' }}>µg</span>
                  </strong>
                </div>
              </div>

              {/* Google Gemini AI Health & Commute Advisory */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  fontSize: '0.8rem',
                  lineHeight: 1.55,
                  color: '#e2e8f0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} color="#38bdf8" />
                    <strong style={{ color: '#38bdf8', fontSize: '0.76rem', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                      Gemini 3.8 Flash Advisory
                    </strong>
                  </div>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      color: '#94a3b8',
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {isLoadingAdvisory ? 'Analyzing...' : tokenStats ? `${tokenStats.total} tokens (0 reasoning)` : 'Token-Optimized'}
                  </span>
                </div>
                <p style={{ margin: 0, color: '#cbd5e1' }}>
                  {isLoadingAdvisory ? 'Generating localized medical & commute advisory...' : geminiAdvisory}
                </p>
              </div>
            </div>

            {/* 3. CALIBRATED SEAMLESS ZOOM-ADAPTIVE SPECTRUM LEGEND */}
            <div
              className="glass-panel"
              style={{
                padding: '16px 20px',
                borderRadius: '16px',
                border: isAdaptiveMode && activeRange.isZoomed ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(15, 23, 42, 0.85)',
                transition: 'border-color 0.3s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                  <span style={{ fontWeight: 700, color: '#e2e8f0' }}>Seamless Continuous Spectrum</span>
                </div>
                <span
                  style={{
                    color: isAdaptiveMode && activeRange.isZoomed ? '#34d399' : '#38bdf8',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    background: isAdaptiveMode && activeRange.isZoomed ? 'rgba(16, 185, 129, 0.18)' : 'rgba(56, 189, 248, 0.12)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: isAdaptiveMode && activeRange.isZoomed ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(56, 189, 248, 0.25)',
                  }}
                >
                  {isAdaptiveMode && activeRange.isZoomed
                    ? `Zoom ${activeRange.zoom}x · Viewport (${activeRange.min} → ${activeRange.max} AQI)`
                    : `India Nationwide (${activeRange.nationalMin || 40} → ${activeRange.nationalMax || 260} AQI)`}
                </span>
              </div>

              {/* Seamless continuous gradient bar - ZERO black contour lines */}
              <div
                style={{
                  height: '14px',
                  borderRadius: '7px',
                  background:
                    'linear-gradient(90deg, #10b981 0%, #34d399 14%, #a3e635 28%, #eab308 42%, #f97316 58%, #ea580c 72%, #dc2626 86%, #b91c1c 100%)',
                  marginBottom: '10px',
                  boxShadow: '0 2px 14px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                }}
              />

              {/* Dynamic tick labels synchronized with viewport AQI range */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#cbd5e1', fontWeight: 700 }}>
                <span style={{ color: '#10b981' }}>{activeRange.min} (Min)</span>
                <span style={{ color: '#a3e635' }}>
                  {Math.round(activeRange.min + (activeRange.max - activeRange.min) * 0.33)}
                </span>
                <span style={{ color: '#fb923c' }}>
                  {Math.round(activeRange.min + (activeRange.max - activeRange.min) * 0.66)}
                </span>
                <span style={{ color: '#f87171' }}>{activeRange.max} (Max)</span>
              </div>

              <div
                style={{
                  marginTop: '10px',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  fontSize: '0.71rem',
                  lineHeight: 1.45,
                  color: isAdaptiveMode && activeRange.isZoomed ? '#34d399' : '#94a3b8',
                }}
              >
                {isAdaptiveMode && activeRange.isZoomed
                  ? `✦ Zoom Dynamic Contrast: Local ${activeRange.min} AQI maps to Green and ${activeRange.max} AQI to Bright Red so subtle localized variations stand out clearly.`
                  : `✦ Seamless Continuous Gradient: Nationwide lowest AQI is Green and highest is Bright Red. Zoom into any region to recalibrate local contrast.`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
