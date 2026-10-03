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
  Activity
} from 'lucide-react';

// Import official India national boundary GeoJSON (MultiPolygon covering mainland + islands)
import indiaBoundaryGeoJson from '../../data/indiaBoundary.json';
// Import 108 nationwide ground/CAAQMS monitoring stations across all Indian states
import initialIndiaStations from '../../data/indiaStations.json';

export const MAPBOX_DARK_STYLE = 'mapbox://styles/mapbox/navigation-night-v1';

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
  { id: 'all-india', name: 'ALL INDIA', center: [79.2, 22.8], zoom: 4.6, pitch: 15, state: 'National Subcontinent' },
  { id: 'delhi-ncr', name: 'DELHI NCR', center: [77.16, 28.66], zoom: 9.8, pitch: 26, state: 'National Capital Region' },
  { id: 'mumbai', name: 'MUMBAI', center: [72.8777, 19.0760], zoom: 10.0, pitch: 26, state: 'Maharashtra' },
  { id: 'bengaluru', name: 'BENGALURU', center: [77.5946, 12.9716], zoom: 10.0, pitch: 26, state: 'Karnataka' },
  { id: 'gangetic', name: 'INDO-GANGETIC', center: [82.5, 26.0], zoom: 7.0, pitch: 22, state: 'UP & Bihar River Corridor' },
  { id: 'kolkata', name: 'KOLKATA', center: [88.3639, 22.5726], zoom: 10.2, pitch: 26, state: 'West Bengal' },
  { id: 'chennai', name: 'CHENNAI', center: [80.2707, 13.0827], zoom: 10.2, pitch: 26, state: 'Tamil Nadu' },
  { id: 'hyderabad', name: 'HYDERABAD', center: [78.4867, 17.3850], zoom: 10.0, pitch: 26, state: 'Telangana' },
  { id: 'himalayas', name: 'HIMALAYAS', center: [76.5, 33.5], zoom: 6.8, pitch: 28, state: 'J&K / Ladakh' },
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

/**
 * Generate a GeoJSON Polygon circle for real GPS accuracy radius display
 */
function createGeoJsonCircle(center, radiusInMeters, points = 48) {
  const [lon, lat] = center;
  const km = Math.max(20, radiusInMeters) / 1000;
  const ret = [];
  const distanceX = km / (111.320 * Math.cos((lat * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    ret.push([lon + x, lat + y]);
  }
  ret.push(ret[0]);
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ret],
    },
  };
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

  // Development Token Saver Gate: defaults to false so page reloads consume 0 Mapbox credits
  const [showMap, setShowMap] = useState(false);

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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

  // DEFAULT OPACITY: Balanced translucent 0.45 so the map beneath (roads, cities, terrain) is clearly visible
  const [heatIntensity, setHeatIntensity] = useState(0.45);
  const [showStationPins, setShowStationPins] = useState(false);
  const [showHeatmapLayer, setShowHeatmapLayer] = useState(true);
  const [showStateBorders, setShowStateBorders] = useState(true);
  const [is3DBuildings, setIs3DBuildings] = useState(true);

  const showStateBordersRef = useRef(showStateBorders);
  showStateBordersRef.current = showStateBorders;

  const updateRasterForViewportRef = useRef(null);
  const cancelCinematic360TourRef = useRef(null);
  const playCinematic360TourRef = useRef(null);
  const getCameraPaddingRef = useRef(null);

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
  updateRasterForViewportRef.current = updateRasterForViewport;

  // Gemini AI Advisory State (Token-Optimized)
  const [geminiAdvisory, setGeminiAdvisory] = useState('');
  const [tokenStats, setTokenStats] = useState(null);
  const [isLoadingAdvisory, setIsLoadingAdvisory] = useState(false);

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
      right: isSidebarOpen && isWide ? 440 : 40,
      left: 40,
      top: 80,
      bottom: 80,
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

  // Debounced Remote Geocoding Worker (Mapbox Live or Standby OSM)
  const executeRemoteGeocode = useCallback(async (normalizedQuery, seenNames, currentCombined) => {
    setIsSearching(true);
    try {
      const remoteMatches = [];

      // 1. Mapbox Live Geocoding (when Mapbox mode is active)
      if (mapboxgl.accessToken) {
        const token = mapboxgl.accessToken;
        // Search POIs, addresses, neighborhoods, and places with Delhi proximity bias
        const mbUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(normalizedQuery)}.json?access_token=${token}&country=in&proximity=77.2090,28.6139&limit=8`;
        const res = await fetch(mbUrl);
        if (res.ok) {
          const json = await res.json();
          if (json.features) {
            json.features.forEach((f) => {
              const nameKey = f.text.toLowerCase();
              if (!seenNames.has(nameKey)) {
                seenNames.add(nameKey);
                remoteMatches.push(f);
              }
            });
          }
        }
      } else {
        // 2. Standby Mode: Free High-Accuracy Geocoding via Photon with India/Delhi proximity bias
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(normalizedQuery)}&lat=28.6139&lon=77.2090&limit=8`;
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
                remoteMatches.push({
                  id: p.osm_id || Math.random().toString(),
                  text: title,
                  place_name: subtitle,
                  center: f.geometry.coordinates,
                });
              }
            });
          }
        }

        // Secondary fallback: if Photon gave no results for an institutional query, try Nominatim
        if (remoteMatches.length + currentCombined.length < 2) {
          try {
            const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(normalizedQuery)}&format=json&countrycodes=in&viewbox=76.8,28.9,77.4,28.4&bounded=0&limit=5`;
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
                  });
                }
              });
            }
          } catch (ne) {
            // Ignore Nominatim fallback error
          }
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

    // Map common aliases (e.g., "technical" -> "technological" for DTU, "iit" -> "Indian Institute of Technology")
    let normalizedQuery = cleanQuery;
    if (/\bdelhi technical university\b/i.test(normalizedQuery)) {
      normalizedQuery = normalizedQuery.replace(/\bdelhi technical university\b/gi, 'Delhi Technological University');
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
    const [lon, lat] = feature.center;
    setSearchQuery('');
    setShowSearchDropdown(false);

    if (feature.isStation && feature.station) {
      handleSelectStation(feature.station);
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. Immediately turn ON the air quality heatmap layer if it was turned off
    setShowHeatmapLayer(true);

    // 2. Fetch polygon boundary in background if not already attached
    let boundaryGeo = feature.boundaryGeo || null;
    let targetBbox = feature.bbox || null;

    if (!boundaryGeo) {
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

    // If still no polygon, create an elegant soft campus perimeter
    if (!boundaryGeo) {
      boundaryGeo = createSoftPerimeterGeoJson(lon, lat, 500);
    }

    // 3. Step 1: Smooth Glide & Zoom into the selected institution/zone
    const targetZoom = targetBbox ? 14.8 : 15.2;
    map.flyTo({
      center: [lon, lat],
      zoom: targetZoom,
      pitch: 34,
      bearing: 12,
      speed: 1.15,
      curve: 1.3,
      padding: getCameraPadding(),
      essential: true,
    });

    // 4. Step 2 & 3: Once arrived (or after smooth arrival flight), inject faded boundary + align heatmap
    const onArrival = () => {
      map.off('moveend', onArrival);
      const bSource = map.getSource('selected-place-boundary-source');
      if (bSource) {
        bSource.setData(boundaryGeo);
      }
      updateRasterForViewportRef.current?.();
    };

    // If map is already close to location, trigger boundary shortly; otherwise wait for camera arrival
    setTimeout(() => {
      const bSource = map.getSource('selected-place-boundary-source');
      if (bSource) {
        bSource.setData(boundaryGeo);
      }
    }, 600);

    map.on('moveend', onArrival);
  };
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

    const orbitStep = (timestamp) => {
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
            if (mapboxgl.accessToken) {
              const token = mapboxgl.accessToken;
              const revRes = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}&country=in&types=neighborhood,locality,place,district&limit=1`
              );
              if (revRes.ok) {
                const revJson = await revRes.json();
                if (revJson.features?.[0]?.place_name) {
                  placeName = revJson.features[0].place_name;
                } else if (revJson.features?.[0]?.text) {
                  placeName = revJson.features[0].text;
                }
              }
            } else {
              // Free Zero-Credit reverse geocoding via OpenStreetMap Nominatim
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
          if (!hasCenteredOnGpsRef.current) {
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
  }, [playCinematic360Tour]);

  // Auto-start GPS tracking on mount (only when map is active)
  useEffect(() => {
    if (!showMap) return;
    startLiveGpsTracking();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [showMap, startLiveGpsTracking]);

  // Center or re-center map on user's live position
  const handleCenterOnUser = useCallback(() => {
    cancelCinematic360Tour();
    if (!userLocation.isLiveGps || !userLocation.lat || !userLocation.lon) {
      startLiveGpsTracking();
      return;
    }
    setIsFollowingUser(true);
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo({
        center: [userLocation.lon, userLocation.lat],
        zoom: 13,
        pitch: 26,
        speed: 1.4,
        curve: 1.2,
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
    if (!showMap) return;
    fetchLiveNationalData(userLocation.lat, userLocation.lon);
  }, [showMap, fetchLiveNationalData, userLocation.lat, userLocation.lon]);

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
    if (displayStation) {
      fetchGeminiAdvisory(displayStation);
    }
  }, [displayStation, fetchGeminiAdvisory]);

  // Interpolated AQI at user's current live GPS coordinates using nationwide IDW (p = 2.0)
  const userAqiEstimate = useMemo(() => {
    if (!userLocation.isLiveGps || !userLocation.lat || !userLocation.lon) {
      return null;
    }
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

  const userColor = useMemo(() => {
    if (userAqiEstimate === null) {
      return { hex: '#38bdf8', label: 'Measuring AQI...', textHex: '#38bdf8', badgeBg: 'rgba(56, 189, 248, 0.2)' };
    }
    return getAqiColor(userAqiEstimate, activeRange);
  }, [userAqiEstimate, activeRange]);


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

    if (!mapboxgl.accessToken) {
      mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
    }

    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const initialLng = urlParams && urlParams.get('lng') ? parseFloat(urlParams.get('lng')) : 78.9629;
    const initialLat = urlParams && urlParams.get('lat') ? parseFloat(urlParams.get('lat')) : 22.5937;
    const initialZoom = urlParams && urlParams.get('zoom') ? parseFloat(urlParams.get('zoom')) : 4.6;
    const initialPitch = urlParams && urlParams.get('pitch') ? parseFloat(urlParams.get('pitch')) : 16;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAPBOX_DARK_STYLE, // High-contrast night navigation
      center: [initialLng, initialLat],
      zoom: initialZoom,
      minZoom: 3.8,
      maxZoom: 16.5,
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
      const roadLayerId = layers.find((l) => (l.id.startsWith('road') || l.id.startsWith('highway_')) && l.type === 'line')?.id;
      const adminLayerId = layers.find((l) => l.id === 'admin-1-boundary-bg' || l.id === 'admin-1-boundary' || l.id === 'boundary_state')?.id;
      const symbolLayerId = layers.find((l) => l.type === 'symbol' && (l.layout?.['text-field'] || l.id.startsWith('place_') || l.id.startsWith('highway_name') || l.id.startsWith('water_name')) )?.id;
      const labelLayerId = layers.find((l) => l.type === 'symbol' && (l.id.startsWith('place_') || l.id.startsWith('poi_') || l.id.includes('settlement')) )?.id;
      const beforeLayerId = roadLayerId || adminLayerId || symbolLayerId;

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
            'fill-color': '#10b981',
            'fill-opacity': 0.12,
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
            'line-color': '#10b981',
            'line-width': 1.6,
            'line-opacity': 0.65,
            'line-dasharray': [3, 2],
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
            minzoom: 13.5,
            paint: {
              'fill-extrusion-color': [
                'interpolate', ['linear'],
                ['coalesce', ['get', 'render_height'], ['get', 'height'], 14],
                0, '#273b52',
                12, '#324b69',
                25, '#3f5e84',
                50, '#5077a5',
                90, '#6493cd',
                150, '#79b0f2'
              ],
              'fill-extrusion-height': [
                'interpolate', ['linear'], ['zoom'],
                13.5, 0,
                14.2, [
                  'max',
                  ['coalesce', ['get', 'render_height'], ['get', 'height'], 14],
                  8
                ],
                16.0, [
                  'max',
                  ['*', ['coalesce', ['get', 'render_height'], ['get', 'height'], 14], 1.2],
                  12
                ]
              ],
              'fill-extrusion-base': [
                'interpolate', ['linear'], ['zoom'],
                13.5, 0,
                14.2, [
                  'coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0
                ]
              ],
              'fill-extrusion-opacity': 0.95,
            },
          };
          if (buildingSource === 'composite') {
            building3DLayer.filter = ['==', 'extrude', 'true'];
          }
          map.addLayer(building3DLayer, labelLayerId);
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
            intensity: 0.75,
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
        if (isOrbitingRef.current) return; // Completely skip expensive raster recalculation during 360° spin!
        if (throttleTimer) return;
        throttleTimer = setTimeout(() => {
          throttleTimer = null;
          updateRasterForViewport();
        }, 40);
      };

      map.on('move', handleViewportChange);
      map.on('zoom', handleViewportChange);
      map.on('moveend', () => {
        if (isOrbitingRef.current) return;
        if (throttleTimer) clearTimeout(throttleTimer);
        throttleTimer = null;
        updateRasterForViewport();
      });
      map.on('zoomend', () => {
        if (isOrbitingRef.current) return;
        if (throttleTimer) clearTimeout(throttleTimer);
        throttleTimer = null;
        updateRasterForViewport();
      });

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

      if (pendingOrbitOnScrollRef.current && !hasPlayedIntroOrbitRef.current) {
        pendingOrbitOnScrollRef.current = false;
        setTimeout(() => {
          playCinematic360TourRef.current?.();
        }, 300);
      }
    });

    return () => {
      cancelCinematic360TourRef.current?.();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
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

  // Trigger 360° slanted orbital flyaround when user scrolls down from hero into map section
  useEffect(() => {
    if (!showMap) return;
    if (!sectionContainerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasPlayedIntroOrbitRef.current) {
          if (mapLoadedRef.current && mapInstanceRef.current) {
            playCinematic360TourRef.current?.();
          } else {
            pendingOrbitOnScrollRef.current = true;
          }
        }
      },
      {
        threshold: 0.25,
      }
    );

    observer.observe(sectionContainerRef.current);
    return () => observer.disconnect();
  }, [showMap]);

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

      // Outer wrapper element given to Mapbox - MUST NOT have style.transform mutated to avoid coordinate displacement!
      const el = document.createElement('div');
      el.className = 'mapbox-station-pin-wrap';
      el.style.cursor = 'pointer';

      // Inner container for scale, hover animations, and SVG content
      const inner = document.createElement('div');
      inner.style.display = 'flex';
      inner.style.flexDirection = 'column';
      inner.style.alignItems = 'center';
      inner.style.transformOrigin = 'bottom center';
      inner.style.transition = 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)';
      inner.style.transform = isSelected ? 'scale(1.2)' : 'scale(1)';

      inner.innerHTML = `
        <div style="
          filter: drop-shadow(0 3px 6px rgba(0,0,0,0.7));
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

      el.appendChild(inner);

      // Safe hover animation targeting inner container so Mapbox coordinate transform is 100% preserved
      el.addEventListener('mouseenter', () => {
        inner.style.transform = 'scale(1.35)';
      });
      el.addEventListener('mouseleave', () => {
        inner.style.transform = isSelected ? 'scale(1.2)' : 'scale(1)';
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

    if (!userMarkerRef.current) {
      const userEl = document.createElement('div');
      userEl.className = 'mapbox-user-beacon';
      userEl.style.display = 'flex';
      userEl.style.flexDirection = 'column';
      userEl.style.alignItems = 'center';
      userEl.style.pointerEvents = 'none';

      userEl.innerHTML = `
        <div style="
          position: relative;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <!-- Expanding Radar Pulse Wave -->
          <span style="
            position: absolute;
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: rgba(16, 185, 129, 0.22);
            border: 2px solid #10b981;
            animation: pulse 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></span>
          <span style="
            position: absolute;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: rgba(56, 189, 248, 0.35);
            border: 1.5px solid #38bdf8;
            animation: ping 2.4s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></span>
          <!-- Core GPS Satellite Target -->
          <span style="
            position: absolute;
            width: 15px;
            height: 15px;
            border-radius: 50%;
            background: #0284c7;
            box-shadow: 0 0 18px #38bdf8, 0 0 30px rgba(16, 185, 129, 0.6);
            border: 2.5px solid #ffffff;
          "></span>
        </div>
        <div id="user-live-beacon-badge" style="
          margin-top: 4px;
          background: rgba(11, 17, 32, 0.96);
          backdrop-filter: blur(10px);
          border: 1px solid #10b981;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 800;
          color: #ffffff;
          white-space: nowrap;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7), 0 0 15px rgba(16, 185, 129, 0.3);
          display: flex;
          align-items: center;
          gap: 6px;
          z-index: 2;
        ">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; animation: pulse 1s infinite;"></span>
          <span>LIVE GPS: <strong style="color: #38bdf8;">${userAqiEstimate !== null ? userAqiEstimate + ' AQI' : 'Measuring...'}</strong>${userLocation.accuracy ? ` (±${userLocation.accuracy}m)` : ''}</span>
        </div>
      `;

      userMarkerRef.current = new mapboxgl.Marker({ element: userEl, anchor: 'center' })
        .setLngLat([userLocation.lon, userLocation.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([userLocation.lon, userLocation.lat]);
      const badge = document.getElementById('user-live-beacon-badge');
      if (badge) {
        badge.innerHTML = `
          <span style="width: 7px; height: 7px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; animation: pulse 1s infinite;"></span>
          <span>LIVE GPS: <strong style="color: #38bdf8;">${userAqiEstimate !== null ? userAqiEstimate + ' AQI' : 'Measuring...'}</strong>${userLocation.accuracy ? ` (±${userLocation.accuracy}m)` : ''}</span>
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
  }, [userLocation, userAqiEstimate]);

  // =========================================================================
  // DEVELOPMENT TOKEN-SAVER PLACEHOLDER (Default gate: burns 0 credits)
  // =========================================================================
  if (!showMap) {
    return (
      <section
        ref={sectionContainerRef}
        id="delhi-aqi-heatmap"
        style={{
          position: 'relative',
          zIndex: 40,
          width: '100%',
          minHeight: '620px',
          height: '75vh',
          background: 'radial-gradient(ellipse at 50% 35%, #0f1c34 0%, #070a12 70%)',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          boxSizing: 'border-box',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Subtle background animated ambient glow */}
        <div
          style={{
            position: 'absolute',
            width: '460px',
            height: '460px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 1,
            filter: 'blur(30px)',
          }}
        />

        {/* Development Token Guard Card */}
        <div
          className="glass-panel-master"
          style={{
            position: 'relative',
            zIndex: 10,
            maxWidth: '540px',
            width: '100%',
            padding: '36px 30px',
            borderRadius: '24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '18px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.22)',
          }}
        >
          {/* Pulsing Status Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 14px',
              borderRadius: '9999px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#34d399',
              letterSpacing: '0.04em',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981',
              }}
            />
            DEV TOKEN SAVER ACTIVE • 0 CREDITS USED
          </div>

          {/* Icon in luminous circle */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px rgba(56, 189, 248, 0.22)',
            }}
          >
            <MapIcon size={32} color="#38bdf8" />
          </div>

          {/* Heading & Information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2
              style={{
                margin: 0,
                fontSize: '1.4rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              India 3D AQI Spatial Twin
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: '0.86rem',
                lineHeight: 1.55,
                color: '#94a3b8',
                maxWidth: '430px',
              }}
            >
              Mapbox tile loading, 3D building extrusions, and orbital camera flights are paused during development so hot-reloads burn 0 credits.
            </p>
          </div>

          {/* Primary Show Map Button */}
          <button
            onClick={() => setShowMap(true)}
            id="show-map-btn"
            style={{
              marginTop: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '13px 32px',
              borderRadius: '13px',
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              color: '#ffffff',
              fontSize: '0.94rem',
              fontWeight: 700,
              border: '1px solid rgba(255, 255, 255, 0.25)',
              boxShadow: '0 10px 25px rgba(2, 132, 199, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.35)',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 14px 30px rgba(2, 132, 199, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(2, 132, 199, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.35)';
            }}
          >
            <Sparkles size={17} />
            <span>Show Map</span>
            <ChevronRight size={17} />
          </button>

          {/* Token tier info footnote */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.72rem',
              color: '#64748b',
            }}
          >
            <span>Public Token Active</span>
            <span>•</span>
            <span>50,000 Loads Tier</span>
            <span>•</span>
            <span>Navigation Night 3D</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionContainerRef}
      id="delhi-aqi-heatmap"
      style={{
        position: 'relative',
        zIndex: 40,
        width: '100%',
        height: '100vh',
        minHeight: '780px',
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
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          background: '#040711',
          zIndex: 1,
          cursor: 'grab',
          pointerEvents: 'auto',
        }}
      />

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
            linear-gradient(to bottom, #070a12 0%, rgba(7, 10, 18, 0.94) 14%, rgba(7, 10, 18, 0.80) 28%, rgba(7, 10, 18, 0.55) 45%, rgba(7, 10, 18, 0.30) 65%, rgba(7, 10, 18, 0.10) 84%, rgba(7, 10, 18, 0.02) 94%, transparent 100%) top / 100% 46px no-repeat,
            linear-gradient(to top, #070a12 0%, rgba(7, 10, 18, 0.94) 14%, rgba(7, 10, 18, 0.80) 28%, rgba(7, 10, 18, 0.55) 45%, rgba(7, 10, 18, 0.30) 65%, rgba(7, 10, 18, 0.10) 84%, rgba(7, 10, 18, 0.02) 94%, transparent 100%) bottom / 100% 46px no-repeat,
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
          top: '20px',
          left: '24px',
          right: isSidebarOpen ? '444px' : '24px',
          zIndex: 25,
          transition: 'right 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        {/* Tier 1: Branding, Telemetry Switcher, GPS Tracker & Telemetry Toggle */}
        <div
          className="glass-panel-master"
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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

            {/* Pause / Hide Map button to return to Token Saver without refreshing */}
            <button
              onClick={() => setShowMap(false)}
              className="glass-pill"
              title="Pause map engine and return to Token-Saver mode"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '0.66rem',
                fontWeight: 700,
                cursor: 'pointer',
                color: '#cbd5e1',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#f59e0b',
                  boxShadow: '0 0 6px #f59e0b',
                }}
              />
              <span>Pause / Hide Map</span>
            </button>
          </div>

          {/* Action Buttons: Metrics, Refresh, GPS & Integrated Telemetry Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Metric Selector Tabs */}
            <div
              className="glass-pill"
              style={{
                display: 'flex',
                padding: '3px',
                borderRadius: '9999px',
              }}
            >
              {[
                { id: 'aqi', label: 'AQI' },
                { id: 'pm25', label: 'PM2.5' },
                { id: 'pm10', label: 'PM10' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActivePollutant(m.id)}
                  className={`glass-pill ${activePollutant === m.id ? 'glass-pill-active' : ''}`}
                  style={{
                    padding: '3px 11px',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
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
              className="glass-pill"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                color: '#cbd5e1',
                padding: '5px 12px',
                borderRadius: '9999px',
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={12} className={isLoadingLive ? 'animate-spin' : ''} />
              <span>{isLoadingLive ? '...' : 'Refresh'}</span>
            </button>

            {/* Live GPS Tracking Controller */}
            <button
              onClick={handleCenterOnUser}
              title={userLocation.isLiveGps ? 'Center camera on your live GPS position' : 'Start live GPS tracking'}
              className={`glass-pill ${userLocation.isLiveGps ? 'glass-pill-success' : ''}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '9999px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isLocating ? (
                <RefreshCw size={12} className="animate-spin" color="#38bdf8" />
              ) : userLocation.isLiveGps ? (
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', animation: 'pulse 1.2s infinite' }} />
              ) : (
                <Navigation size={12} color="#38bdf8" />
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
                className={`glass-pill ${isFollowingUser ? 'glass-pill-active' : ''}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '9999px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <LocateFixed size={12} color={isFollowingUser ? '#38bdf8' : '#94a3b8'} />
                <span>Follow: {isFollowingUser ? 'ON' : 'OFF'}</span>
              </button>
            )}

            {/* Seamless Telemetry Toggle Button - Integrated into action bar to eliminate any overlap */}
            <button
              onClick={() => setIsSidebarOpen((v) => !v)}
              title={isSidebarOpen ? 'Hide telemetry panel to maximize map' : 'Show telemetry & advisory HUD'}
              className={`glass-pill ${!isSidebarOpen ? 'glass-pill-active' : ''}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: isSidebarOpen ? '#cbd5e1' : '#38bdf8',
                padding: '5px 12px',
                borderRadius: '9999px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {isSidebarOpen ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
              <span>{isSidebarOpen ? 'Hide Telemetry' : 'Show Telemetry'}</span>
              <Activity size={13} color={isSidebarOpen ? '#94a3b8' : '#10b981'} />
            </button>
          </div>
        </div>

        {/* Tier 2: Capital City Shortcuts (NO icons, decluttered) + Autocomplete Search Bar */}
        <div
          className="glass-panel-master"
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap',
            padding: '6px 12px',
            borderRadius: '12px',
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
          <div
            ref={searchContainerRef}
            style={{
              position: 'relative',
              zIndex: 110,
              minWidth: '220px',
              flex: '1 1 220px',
              maxWidth: '320px',
            }}
          >
            <div
              className="glass-input"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '9999px',
                padding: '4px 12px',
              }}
            >
              <Search size={12} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search city, district, or town..."
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
                  fontSize: '0.73rem',
                  width: '100%',
                }}
              />
              {isSearching && <RefreshCw size={11} className="animate-spin" color="#38bdf8" />}
              {searchQuery && !isSearching && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowSearchDropdown(false);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    fontSize: '0.75rem',
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown List */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div
                className="glass-panel-master"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  borderRadius: '12px',
                  overflow: 'hidden',
                  maxHeight: '260px',
                  overflowY: 'auto',
                }}
              >
                {searchResults.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => handleSelectSearchResult(f)}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      fontSize: '0.74rem',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(56, 189, 248, 0.18)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <MapPin size={13} color="#38bdf8" style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ color: '#ffffff', display: 'block' }}>{f.text}</strong>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.place_name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 360° Cinematic Tour Floating HUD Banner */}
      {isOrbiting360 && (
        <div
          className="glass-panel-master"
          style={{
            position: 'absolute',
            top: '125px',
            left: isSidebarOpen ? 'calc((100% - 420px) / 2)' : '50%',
            transform: 'translateX(-50%)',
            zIndex: 25,
            padding: '7px 16px',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'left 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <RotateCw size={14} className="animate-spin" color="#38bdf8" />
          <span style={{ fontSize: '0.76rem', color: '#f8fafc', fontWeight: 600 }}>
            360° Slanted Horizon Tour · Orbiting Live Position
          </span>
          <button
            onClick={cancelCinematic360Tour}
            className="glass-pill"
            style={{
              color: '#f87171',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '0.68rem',
              fontWeight: 700,
              cursor: 'pointer',
              marginLeft: '4px',
            }}
          >
            Skip
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. BOTTOM-LEFT FLOATING CONTROLS HUD (LAYERS & OPACITY)        */}
      {/* ============================================================== */}
      <div
        className="glass-panel-master"
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '24px',
          zIndex: 25,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '10px 14px',
          borderRadius: '16px',
          maxWidth: 'calc(100% - 48px)',
        }}
      >
        {/* Click hint */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#cbd5e1' }}>
          <Crosshair size={12} color="#f43f5e" />
          <span>Click anywhere on map for <strong style={{ color: '#f43f5e' }}>micro-zone AQI</strong></span>
        </div>

        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', width: '100%' }} />

        {/* TIER 1: PRIMARY MAP LAYERS & DISPLAY MODES */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: '2px' }}>
            Layers:
          </span>

          {/* Heatmap Layer Toggle */}
          <button
            onClick={() => setShowHeatmapLayer((v) => !v)}
            className={`glass-pill ${showHeatmapLayer ? 'glass-pill-active' : ''}`}
            style={{
              padding: '4px 9px',
              borderRadius: '7px',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Layers size={13} color={showHeatmapLayer ? '#38bdf8' : '#94a3b8'} />
            <span>Heat: {showHeatmapLayer ? 'ON' : 'OFF'}</span>
          </button>

          {/* Adaptive Contrast Mode Toggle */}
          <button
            onClick={() => setIsAdaptiveMode((v) => !v)}
            title="Dynamically recalibrate palette: lowest visible AQI becomes green, highest becomes bright red as you zoom in"
            className={`glass-pill ${isAdaptiveMode ? 'glass-pill-success' : ''}`}
            style={{
              padding: '4px 9px',
              borderRadius: '7px',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Sparkles size={13} color={isAdaptiveMode ? '#34d399' : '#94a3b8'} />
            <span>Adaptive: {isAdaptiveMode ? 'ON' : 'OFF'}</span>
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
            className={`glass-pill ${showStateBorders ? 'glass-pill-active' : ''}`}
            style={{
              padding: '4px 9px',
              borderRadius: '7px',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <MapIcon size={13} color={showStateBorders ? '#38bdf8' : '#94a3b8'} />
            <span>Borders</span>
          </button>

          {/* 108 Monitoring Pins Toggle */}
          <button
            onClick={() => setShowStationPins((v) => !v)}
            className={`glass-pill ${showStationPins ? 'glass-pill-active' : ''}`}
            style={{
              padding: '4px 9px',
              borderRadius: '7px',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            {showStationPins ? <Eye size={13} color="#38bdf8" /> : <EyeOff size={13} color="#94a3b8" />}
            <span>108 Pins</span>
          </button>

          {/* 3D Buildings Toggle */}
          <button
            onClick={() => {
              setIs3DBuildings((v) => {
                const next = !v;
                const map = mapInstanceRef.current;
                if (map && next && map.getPitch() < 20) {
                  map.easeTo({ pitch: 55, duration: 800 });
                }
                return next;
              });
            }}
            className={`glass-pill ${is3DBuildings ? 'glass-pill-active' : ''}`}
            style={{
              padding: '4px 9px',
              borderRadius: '7px',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            3D Urban
          </button>

          {/* 360° Slanted Cinematic Orbit Button */}
          <button
            onClick={() => {
              if (isOrbiting360) {
                cancelCinematic360Tour();
              } else {
                playCinematic360Tour();
              }
            }}
            title={isOrbiting360 ? 'Cancel 360° orbital animation' : 'Replay cinematic 360° 3D slanted orbital flyaround'}
            className={`glass-pill ${isOrbiting360 ? 'glass-pill-active' : ''}`}
            style={{
              padding: '4px 9px',
              borderRadius: '7px',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <RotateCw size={13} className={isOrbiting360 ? 'animate-spin' : ''} color={isOrbiting360 ? '#38bdf8' : '#cbd5e1'} />
            <span>{isOrbiting360 ? 'Stop Orbit' : '360° Orbit'}</span>
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
            <span style={{ color: '#cbd5e1', fontSize: '0.68rem', marginRight: '2px', fontWeight: 600 }}>Presets:</span>
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
                  className={`glass-pill ${isSelected ? 'glass-pill-active' : ''}`}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. FLOATING RIGHT-SIDE TELEMETRY HUD (COLLAPSIBLE OVERLAY)     */}
      {/* ============================================================== */}
      <aside
        style={{
          position: 'absolute',
          top: '20px',
          bottom: '24px',
          right: isSidebarOpen ? '24px' : '-440px',
          width: 'min(410px, calc(100vw - 48px))',
          zIndex: 25,
          transition: 'right 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: isSidebarOpen ? 'auto' : 'none',
        }}
      >
        <div
          className="glass-panel-master"
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '20px',
            overflow: 'hidden',
          }}
        >
          {/* HUD Header Bar */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color="#38bdf8" />
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Telemetry & Advisory HUD
              </span>
            </div>

            <button
              onClick={() => setIsSidebarOpen(false)}
              title="Hide telemetry panel to maximize map view"
              className="glass-pill"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: '#cbd5e1',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span>Hide</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Scrollable HUD Content Area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* 1. PINPOINT INSPECTION OR YOUR REAL-TIME GPS POSITION CARD */}
            {inspectedPoint ? (
              <div
                className="glass-panel-sub"
                style={{
                  padding: '20px',
                  borderRadius: '16px',
                  border: '1px solid rgba(244, 63, 94, 0.45)',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5), 0 0 25px rgba(244, 63, 94, 0.1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Crosshair size={16} color="#f43f5e" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f43f5e', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Pinpoint Micro-Zone Analysis
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setInspectedPoint(null);
                      if (userLocation.isLiveGps) handleCenterOnUser();
                    }}
                    className="glass-pill"
                    style={{
                      fontSize: '0.7rem',
                      color: '#cbd5e1',
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
                      fontSize: '3.2rem',
                      fontWeight: 900,
                      lineHeight: 1,
                      color: getAqiColor(inspectedPoint.aqi, activeRange).hex,
                      textShadow: `0 0 25px ${getAqiColor(inspectedPoint.aqi, activeRange).hex}66`,
                    }}
                  >
                    {inspectedPoint.aqi}
                  </span>
                  <div>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: getAqiColor(inspectedPoint.aqi, activeRange).textHex }}>
                      AQI · {getAqiColor(inspectedPoint.aqi, activeRange).label}
                    </span>
                    <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>
                      {activeRange.isZoomed
                        ? `Calibrated to local zoom viewport (${activeRange.min} → ${activeRange.max} AQI)`
                        : 'Subcontinental spatial IDW estimate at clicked point'}
                    </p>
                  </div>
                </div>

                <div
                  className="glass-panel-sub"
                  style={{
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginTop: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '0.76rem',
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
            ) : userLocation.isLiveGps && userLocation.lat && userLocation.lon ? (
              <div
                className="glass-panel-sub"
                style={{
                  padding: '20px',
                  borderRadius: '16px',
                  border: '1px solid rgba(16, 185, 129, 0.45)',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5), 0 0 25px rgba(16, 185, 129, 0.1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Radio size={16} color="#10b981" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#10b981', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Your Live GPS Vitals
                    </span>
                  </div>
                  <span
                    className="glass-pill glass-pill-success"
                    style={{
                      fontSize: '0.7rem',
                      padding: '3px 9px',
                      borderRadius: '9999px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', animation: 'pulse 1.2s infinite' }} />
                    Satellite Lock
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '3.2rem',
                      fontWeight: 900,
                      lineHeight: 1,
                      color: userColor.hex,
                      textShadow: `0 0 25px ${userColor.hex}66`,
                    }}
                  >
                    {userAqiEstimate !== null ? userAqiEstimate : '--'}
                  </span>
                  <div>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: userColor.textHex }}>
                      AQI · {userColor.label}
                    </span>
                    <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>
                      Spatial IDW estimate at your exact position
                    </p>
                  </div>
                </div>

                <div
                  className="glass-panel-sub"
                  style={{
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginTop: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '0.76rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Location:</span>
                    <strong style={{ color: '#ffffff' }}>{userLocation.label || 'Detecting place...'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Coordinates:</span>
                    <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>
                      {userLocation.lat.toFixed(5)}° N, {userLocation.lon.toFixed(5)}° E
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>GPS Accuracy:</span>
                    <span style={{ color: '#34d399', fontWeight: 600 }}>
                      ±{userLocation.accuracy || 15} meters
                    </span>
                  </div>
                  {nearestStation && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                      <span>Nearest CAAQMS Sensor:</span>
                      <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                        {nearestStation.station.name.split(',')[0]} ({nearestStation.distance} km)
                      </span>
                    </div>
                  )}
                  {userLocation.speed !== null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                      <span>Motion Speed:</span>
                      <span style={{ color: '#e2e8f0' }}>{userLocation.speed} km/h</span>
                    </div>
                  )}
                </div>

                {/* Quick GPS Action buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    onClick={handleCenterOnUser}
                    className="glass-pill glass-pill-active"
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                    }}
                  >
                    <Crosshair size={12} />
                    <span>Center Map</span>
                  </button>
                  <button
                    onClick={() => setIsFollowingUser((f) => !f)}
                    className={`glass-pill ${isFollowingUser ? 'glass-pill-active' : ''}`}
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                    }}
                  >
                    <LocateFixed size={12} />
                    <span>Follow: {isFollowingUser ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* GPS Inactive / Requesting State (ZERO DEMO DATA) */
              <div
                className="glass-panel-sub"
                style={{
                  padding: '20px',
                  borderRadius: '16px',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
                  textAlign: 'center',
                }}
              >
                <div
                  className="glass-pill"
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}
                >
                  <Navigation size={20} color="#38bdf8" className={isLocating ? 'animate-spin' : ''} />
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px' }}>
                  {isLocating ? 'Connecting to GPS...' : 'Live GPS Location Tracking'}
                </h3>

                <p style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5, margin: '0 0 14px' }}>
                  {gpsStatus === 'requesting' || isLocating
                    ? 'Connecting to your device GPS satellites... Please allow location permission in your browser.'
                    : gpsStatus === 'denied'
                    ? 'GPS permission was denied. Please enable location permissions in your browser address bar to track your position in real time.'
                    : gpsStatus === 'unavailable' || gpsStatus === 'timeout'
                    ? 'GPS satellite signal timed out. Click below to reconnect to your device location.'
                    : 'Activate live GPS to continuously track your position and get instant micro-zone AQI telemetry wherever you travel.'}
                </p>

                {gpsError && (
                  <div style={{ marginBottom: '12px', fontSize: '0.7rem', color: '#f87171' }}>
                    * {gpsError}
                  </div>
                )}

                <button
                  onClick={startLiveGpsTracking}
                  disabled={isLocating}
                  className="glass-pill glass-pill-active"
                  style={{
                    width: '100%',
                    padding: '9px 14px',
                    borderRadius: '9px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Locate size={14} />
                  <span>{isLocating ? 'Locating...' : 'Connect Live GPS'}</span>
                </button>
              </div>
            )}

            {/* 2. SELECTED CAAQMS STATION DEEP DIVE */}
            <div
              className="glass-panel-sub"
              style={{
                padding: '20px',
                borderRadius: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Selected Monitoring Node
                </span>
                <span
                  className="glass-pill"
                  style={{
                    fontSize: '0.7rem',
                    color: getAqiColor(displayStation.aqi, activeRange).hex,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontWeight: 700,
                  }}
                >
                  {displayStation.type || 'CAAQMS Node'}
                </span>
              </div>

              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: '0 0 4px' }}>
                {displayStation.name}
              </h3>
              <p style={{ fontSize: '0.74rem', color: '#cbd5e1', margin: '0 0 14px' }}>
                {displayStation.zone || displayStation.state || 'India'} · Multi-Source Ground & Satellite Grid
              </p>

              {/* Station metrics grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
                <div className="glass-panel-sub" style={{ padding: '10px 8px', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block' }}>AQI Index</span>
                  <strong style={{ fontSize: '1.2rem', color: getAqiColor(displayStation.aqi, activeRange).hex }}>
                    {displayStation.aqi}
                  </strong>
                </div>
                <div className="glass-panel-sub" style={{ padding: '10px 8px', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block' }}>PM2.5</span>
                  <strong style={{ fontSize: '1.1rem', color: '#f87171' }}>
                    {displayStation.pm25} <span style={{ fontSize: '0.6rem' }}>µg</span>
                  </strong>
                </div>
                <div className="glass-panel-sub" style={{ padding: '10px 8px', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block' }}>PM10</span>
                  <strong style={{ fontSize: '1.1rem', color: '#fb923c' }}>
                    {displayStation.pm10} <span style={{ fontSize: '0.6rem' }}>µg</span>
                  </strong>
                </div>
              </div>

              {/* Google Gemini AI Health & Commute Advisory */}
              <div
                className="glass-panel-sub"
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  fontSize: '0.78rem',
                  lineHeight: 1.5,
                  color: '#e2e8f0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Sparkles size={13} color="#38bdf8" />
                    <strong style={{ color: '#38bdf8', fontSize: '0.74rem', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                      Gemini 3.8 Flash Advisory
                    </strong>
                  </div>
                  <span
                    className="glass-pill"
                    style={{
                      fontSize: '0.65rem',
                      color: '#94a3b8',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {isLoadingAdvisory ? 'Analyzing...' : tokenStats ? `${tokenStats.total} tokens` : 'Token-Optimized'}
                  </span>
                </div>
                <p style={{ margin: 0, color: '#cbd5e1' }}>
                  {isLoadingAdvisory ? 'Generating localized medical & commute advisory...' : geminiAdvisory}
                </p>
              </div>
            </div>

            {/* 3. CALIBRATED SEAMLESS ZOOM-ADAPTIVE SPECTRUM LEGEND */}
            <div
              className="glass-panel-sub"
              style={{
                padding: '16px 18px',
                borderRadius: '16px',
                border: isAdaptiveMode && activeRange.isZoomed ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                transition: 'border-color 0.3s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                  <span style={{ fontWeight: 700, color: '#e2e8f0' }}>Continuous Spectrum</span>
                </div>
                <span
                  className={`glass-pill ${isAdaptiveMode && activeRange.isZoomed ? 'glass-pill-success' : 'glass-pill-active'}`}
                  style={{
                    fontWeight: 700,
                    fontSize: '0.68rem',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  {isAdaptiveMode && activeRange.isZoomed
                    ? `Zoom ${activeRange.zoom}x (${activeRange.min} → ${activeRange.max} AQI)`
                    : `India (${activeRange.nationalMin || 40} → ${activeRange.nationalMax || 260} AQI)`}
                </span>
              </div>

              {/* Seamless continuous gradient bar - ZERO black contour lines */}
              <div
                style={{
                  height: '12px',
                  borderRadius: '6px',
                  background:
                    'linear-gradient(90deg, #10b981 0%, #34d399 14%, #a3e635 28%, #eab308 42%, #f97316 58%, #ea580c 72%, #dc2626 86%, #b91c1c 100%)',
                  marginBottom: '8px',
                  boxShadow: '0 2px 14px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                }}
              />

              {/* Dynamic tick labels synchronized with viewport AQI range */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#cbd5e1', fontWeight: 700 }}>
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
                  marginTop: '8px',
                  paddingTop: '6px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  fontSize: '0.68rem',
                  lineHeight: 1.4,
                  color: isAdaptiveMode && activeRange.isZoomed ? '#34d399' : '#94a3b8',
                }}
              >
                {isAdaptiveMode && activeRange.isZoomed
                  ? `✦ Zoom Dynamic Contrast: Local ${activeRange.min} AQI is Green, ${activeRange.max} AQI is Bright Red.`
                  : `✦ Nationwide Gradient: Lowest AQI is Green and highest is Bright Red. Zoom into any region to recalibrate.`}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </section>
  );

}
