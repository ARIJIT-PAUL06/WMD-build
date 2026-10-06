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
import PetitionModal from '../Petition/PetitionModal';
import AutonomousMonitorModal from '../Dashboard/AutonomousMonitorModal';

// Import official India national boundary GeoJSON (MultiPolygon covering mainland + islands)
import indiaBoundaryGeoJson from '../../data/indiaBoundary.json';
// Import 108 nationwide ground/CAAQMS monitoring stations across all Indian states
import initialIndiaStations from '../../data/indiaStations.json';

export const MAPBOX_DARK_STYLE = 'mapbox://styles/mapbox/navigation-night-v1';

/**
 * Subtle Atmospheric Spores / Micro-Particle Radiator
 * Gently radiates soft ambient spores matching the exact AQI color that dissolve into surroundings.
 */
function AqiSporeAura({ color = '#10b981' }) {
  const sporeTrajectories = [
    { tx: 0, ty: -32, size: 3.2, delay: 0, dur: 3.4 },
    { tx: 22, ty: -24, size: 2.6, delay: 0.8, dur: 3.8 },
    { tx: 34, ty: -6, size: 3.0, delay: 1.6, dur: 3.2 },
    { tx: 28, ty: 18, size: 2.4, delay: 0.4, dur: 4.0 },
    { tx: 12, ty: 32, size: 2.8, delay: 2.1, dur: 3.6 },
    { tx: -10, ty: 34, size: 2.6, delay: 1.1, dur: 3.3 },
    { tx: -28, ty: 20, size: 3.0, delay: 2.5, dur: 3.7 },
    { tx: -34, ty: -4, size: 2.4, delay: 0.6, dur: 3.5 },
    { tx: -20, ty: -26, size: 3.2, delay: 1.8, dur: 4.1 },
    { tx: 14, ty: -34, size: 2.4, delay: 2.9, dur: 3.9 },
    { tx: 30, ty: 6, size: 2.8, delay: 1.4, dur: 3.4 },
    { tx: -16, ty: 18, size: 2.5, delay: 2.2, dur: 3.6 },
  ];

  return (
    <div className="aqi-spore-container" aria-hidden="true">
      {sporeTrajectories.map((s, idx) => (
        <span
          key={idx}
          className="aqi-spore"
          style={{
            '--spore-color': color,
            '--spore-size': `${s.size}px`,
            '--spore-delay': `${s.delay}s`,
            '--spore-duration': `${s.dur}s`,
            '--tx': `${s.tx}px`,
            '--ty': `${s.ty}px`,
          }}
        />
      ))}
    </div>
  );
}

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
    val: pollutantType === 'pm25' ? (Number(s.pm25) || Number(s.aqi) || 50) :
         pollutantType === 'pm10' ? (Number(s.pm10) || Number(s.aqi) || 80) :
         pollutantType === 'no2' ? (Number(s.no2) || 24) :
         pollutantType === 'so2' ? (Number(s.so2) || 10) :
         pollutantType === 'co' ? (Number(s.co) || 0.8) :
         pollutantType === 'o3' ? (Number(s.o3) || 30) :
         (Number(s.aqi) || 100),
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
      } else if (pollutantType === 'no2') {
        effectiveAqi = interpolatedVal * 2.5;
      } else if (pollutantType === 'so2') {
        effectiveAqi = interpolatedVal * 3.0;
      } else if (pollutantType === 'co') {
        effectiveAqi = interpolatedVal * 50;
      } else if (pollutantType === 'o3') {
        effectiveAqi = interpolatedVal * 2.0;
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

export default function DelhiAqiHeatmap({ onDrawerChange } = {}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const targetMarkerRef = useRef(null);
  const lastInspectedCoordsRef = useRef(null);
  const pendingSearchTargetRef = useRef(null);
  const userRequestedZoomRef = useRef(false);
  const handleSelectSearchedPlaceRef = useRef(null);

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
    if (uiBootStage === 0) return 'crt-ui-hidden';
    if (uiBootStage === 1) return 'crt-panel-flicker';
    return '';
  }, [uiBootStage]);

  // Helper for button flicker class
  const getBtnFlickerClass = useCallback(() => {
    if (uiBootStage === 0) return 'crt-ui-hidden';
    if (uiBootStage === 1) return 'crt-btn-flicker';
    return '';
  }, [uiBootStage]);

  // Helper for sequential left-to-right button flicker timing
  const getBtnFlickerStyle = useCallback((delayMs) => {
    if (uiBootStage === 0) return { opacity: 0, visibility: 'hidden' };
    if (uiBootStage === 1) return { animationDelay: `${delayMs}ms` };
    return {};
  }, [uiBootStage]);

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
                    badge: isAddress ? '🏠 House / Address' : isPostcode ? '📮 PIN Code' : isLocality ? '🏘️ Locality' : '📍 Location',
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
                    badge: isHouse ? '🏠 House / Address' : '📍 Location',
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
                  badge: '📍 Landmark',
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

    setInspectedPoint({
      lat: Math.round(lat * 10000) / 10000,
      lon: Math.round(lon * 10000) / 10000,
      aqi: estAqi,
      pm25: estPm25,
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
    const targetLon = userLocationRef.current?.lon ?? 75.76;
    const targetLat = userLocationRef.current?.lat ?? 26.85;
    const initialLng = urlParams && urlParams.get('lng') ? parseFloat(urlParams.get('lng')) : targetLon;
    const initialLat = urlParams && urlParams.get('lat') ? parseFloat(urlParams.get('lat')) : targetLat;
    const initialZoom = urlParams && urlParams.get('zoom') ? parseFloat(urlParams.get('zoom')) : 4.85;
    const initialPitch = urlParams && urlParams.get('pitch') ? parseFloat(urlParams.get('pitch')) : 58;

    const map = new mapboxgl.Map({
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
            minzoom: 13.5,
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
        setIsSidebarOpen(true);
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
    return () => {
      observer.disconnect();
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
          filter: drop-shadow(0 4px 10px rgba(0,0,0,0.65));
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        ">
          <svg width="${isSelected ? '26' : '20'}" height="${isSelected ? '36' : '28'}" viewBox="0 0 28 38" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="shadow-${st.id}" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#000000" stop-opacity="0.75" />
                <stop offset="60%" stop-color="#000000" stop-opacity="0.3" />
                <stop offset="100%" stop-color="#000000" stop-opacity="0" />
              </radialGradient>
              <radialGradient id="pinHead3D-${st.id}" cx="32%" cy="26%" r="68%">
                <stop offset="0%" stop-color="#fda4af" />
                <stop offset="22%" stop-color="#f43f5e" />
                <stop offset="60%" stop-color="#e11d48" />
                <stop offset="85%" stop-color="#9f1239" />
                <stop offset="100%" stop-color="#4c0519" />
              </radialGradient>
              <linearGradient id="pinStem3D-${st.id}" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#fb7185" />
                <stop offset="28%" stop-color="#f43f5e" />
                <stop offset="65%" stop-color="#be123c" />
                <stop offset="100%" stop-color="#4c0519" />
              </linearGradient>
              <linearGradient id="glossGrad-${st.id}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85" />
                <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0" />
              </linearGradient>
              <radialGradient id="lensCore-${st.id}" cx="35%" cy="32%" r="65%">
                <stop offset="0%" stop-color="#ffffff" />
                <stop offset="40%" stop-color="#f1f5f9" />
                <stop offset="75%" stop-color="#cbd5e1" />
                <stop offset="100%" stop-color="#64748b" />
              </radialGradient>
              <linearGradient id="tipMetal-${st.id}" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#94a3b8" />
                <stop offset="45%" stop-color="#ffffff" />
                <stop offset="100%" stop-color="#475569" />
              </linearGradient>
            </defs>

            <!-- 1. Ground Contact Shadow -->
            <ellipse cx="14" cy="35.5" rx="7.5" ry="2.2" fill="url(#shadow-${st.id})" />

            <!-- 2. Main 3D Pin Shell -->
            <path d="M 14 34.5 L 5.1 17.5 A 10 10 0 1 1 22.9 17.5 Z" fill="url(#pinHead3D-${st.id})" stroke="rgba(255, 255, 255, 0.4)" stroke-width="0.75" />

            <!-- 3. Lower Stem 3D Cylindrical Shadow Overlay -->
            <path d="M 14 34.5 L 7.5 19.5 C 10 22.5 18 22.5 20.5 19.5 Z" fill="url(#pinStem3D-${st.id})" opacity="0.65" />

            <!-- 4. Upper Specular Curved Gloss Arc -->
            <ellipse cx="10.8" cy="8.8" rx="4.8" ry="2.4" transform="rotate(-30 10.8 8.8)" fill="url(#glossGrad-${st.id})" />

            <!-- 5. 3D Beveled Lens Center Ring -->
            <circle cx="14" cy="13" r="5.2" fill="#4c0519" opacity="0.65" />
            <circle cx="14" cy="12.8" r="4.6" fill="#881337" opacity="0.85" />
            <circle cx="14" cy="12.5" r="3.8" fill="url(#lensCore-${st.id})" />
            <circle cx="14" cy="12.5" r="2.0" fill="#e11d48" />
            <circle cx="13.3" cy="11.8" r="0.7" fill="#ffffff" opacity="0.9" />

            <!-- 6. Sharp Chrome Needle Tip Glint -->
            <polygon points="13.2,32 14.8,32 14,35" fill="url(#tipMetal-${st.id})" />
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
        setIsSidebarOpen(true);
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([st.lon, st.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [stations, selectedStation, showStationPins]);

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

    const color = getAqiColor(inspectedPoint.aqi, activeRange);

    const isSamePoint =
      targetMarkerRef.current &&
      lastInspectedCoordsRef.current &&
      lastInspectedCoordsRef.current.lat === inspectedPoint.lat &&
      lastInspectedCoordsRef.current.lon === inspectedPoint.lon;

    if (isSamePoint) {
      // Adaptively update colors on zoom without destroying DOM element or restarting animations
      const el = targetMarkerRef.current.getElement();
      if (el) {
        el.style.setProperty('--aqi-color', color.hex);
        el.style.setProperty('--aqi-badge-bg', color.badgeBg);
        el.style.setProperty('--aqi-text-color', color.textHex);
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
        <span style="letter-spacing: 0.02em;">AQI <strong style="color: var(--aqi-color); font-size: 12.5px; transition: color 0.35s ease;">${inspectedPoint.aqi}</strong></span>
        <span id="pinpoint-badge-label" style="background: var(--aqi-badge-bg); color: var(--aqi-text-color); padding: 2px 7px; border-radius: 9999px; font-size: 9.5px; font-weight: 800; border: 1px solid var(--aqi-color); text-transform: uppercase; transition: all 0.35s ease;">${color.label}</span>
      </div>
    `;
    targetMarkerRef.current = new mapboxgl.Marker({ element: targetEl, anchor: 'center' })
      .setLngLat([inspectedPoint.lon, inspectedPoint.lat])
      .addTo(map);
  }, [inspectedPoint, activeRange]);

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

    const liveColor = userAqiEstimate !== null
      ? getAqiColor(userAqiEstimate, activeRange)
      : { hex: '#38bdf8', label: 'Measuring...', textHex: '#38bdf8', badgeBg: 'rgba(56, 189, 248, 0.2)' };

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
          <span>LIVE GPS: <strong style="color: var(--user-color); transition: color 0.35s ease;">${userAqiEstimate !== null ? userAqiEstimate + ' AQI' : 'Measuring...'}</strong>${userLocation.accuracy ? ` <span style="color: #94a3b8; font-weight: 500; font-size: 10px;">(±${userLocation.accuracy}m)</span>` : ''}</span>
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
          <span>LIVE GPS: <strong style="color: var(--user-color); transition: color 0.35s ease;">${userAqiEstimate !== null ? userAqiEstimate + ' AQI' : 'Measuring...'}</strong>${userLocation.accuracy ? ` <span style="color: #94a3b8; font-weight: 500; font-size: 10px;">(±${userLocation.accuracy}m)</span>` : ''}</span>
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
  }, [userLocation, userAqiEstimate, activeRange]);

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

                {/* Section 10: Civic Action & Formal Petition Generator */}
                <button
                  onClick={() => {
                    setPetitionStation(displayStation?.name || 'DTU (Delhi Technological University)');
                    setPetitionLocality(displayStation?.zone ? `${displayStation.name}, ${displayStation.zone}` : 'Rohini Sector 16, North Delhi');
                    setPetitionPm25(displayStation?.pm25 || displayStation?.aqi || 142);
                    setIsPetitionModalOpen(true);
                  }}
                  id="petition-action-deck-btn"
                  title="Transform air quality telemetry into a formal civic complaint or school petition"
                  className="glass-cuboid-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#34d399',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(6, 182, 212, 0.22) 100%)',
                    border: '1px solid rgba(52, 211, 153, 0.45)',
                    padding: '6px 13px',
                    borderRadius: '9px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <FileText size={13} color="#34d399" />
                  <span>Petition & Action</span>
                </button>

                {/* SafeRecess™ School Safety Launcher Button */}
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      const url = new URL(window.location);
                      url.searchParams.set('view', 'school');
                      window.history.pushState({}, '', url);
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }
                  }}
                  id="school-safety-deck-btn"
                  title="SafeRecess™ School Safety Dashboard & Activity Guidance"
                  className="glass-cuboid-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#38bdf8',
                    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.22) 0%, rgba(99, 102, 241, 0.22) 100%)',
                    border: '1px solid rgba(56, 189, 248, 0.45)',
                    padding: '6px 13px',
                    borderRadius: '9px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <ShieldCheck size={13} color="#38bdf8" />
                  <span>School Safety</span>
                </button>
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
                  placeholder="Search house, society, PIN code, landmark across India..."
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
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
                          <strong style={{ color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.text}</strong>
                          {f.badge && (
                            <span style={{
                              fontSize: '0.6rem',
                              padding: '1px 6px',
                              borderRadius: '999px',
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}>
                              {f.badge}
                            </span>
                          )}
                        </div>
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
      {!isMobile && (
      <div
        className={`glass-panel-master ${getPanelClass()}`}
        style={{
          position: 'absolute',
          bottom: isMobile ? '20px' : '52px',
          left: isMobile ? '12px' : '24px',
          right: isMobile ? '12px' : (isSidebarOpen ? '444px' : '24px'),
          maxWidth: isMobile ? 'calc(100% - 24px)' : (isSidebarOpen ? 'calc(100% - 468px)' : 'calc(100% - 48px)'),
          zIndex: 25,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: isMobile ? '8px 12px' : '11px 16px',
          borderRadius: '16px',
          maxHeight: isMobile ? '38vh' : 'none',
          overflowY: isMobile ? 'auto' : 'visible',
          transition: 'right 0.35s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Click hint & Telemetry status row */}
        <div className={getBtnFlickerClass()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', ...getBtnFlickerStyle(520) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#cbd5e1' }}>
            <Crosshair size={12} color="#f43f5e" />
            <span>Click anywhere on map for <strong style={{ color: '#f43f5e' }}>micro-zone AQI</strong></span>
          </div>
          {!isSidebarOpen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.68rem', color: '#94a3b8' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                108 Ground Monitoring Stations Active
              </span>
            </div>
          )}
        </div>

        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', width: '100%' }} />

        {/* TIER 1: PRIMARY MAP LAYERS & DISPLAY MODES */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className={getBtnFlickerClass()} style={{ fontSize: '0.68rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: '2px', ...getBtnFlickerStyle(640) }}>
            Layers:
          </span>

          {/* Heatmap Layer Toggle */}
          <button
            onClick={() => setShowHeatmapLayer((v) => !v)}
            className={`glass-cuboid-btn ${showHeatmapLayer ? 'glass-cuboid-btn-active' : ''} ${getBtnFlickerClass()}`}
            style={getBtnFlickerStyle(760)}
            title="Toggle spatial continuous IDW air quality heatmap layer"
          >
            <Layers size={14} color={showHeatmapLayer ? '#38bdf8' : '#94a3b8'} />
            <span>Heatmap</span>
          </button>

          {/* Adaptive Contrast Mode Toggle */}
          <button
            onClick={() => setIsAdaptiveMode((v) => !v)}
            title="Dynamically recalibrate palette: lowest visible AQI becomes green, highest becomes bright red as you zoom in"
            className={`glass-cuboid-btn ${isAdaptiveMode ? 'glass-cuboid-btn-success' : ''} ${getBtnFlickerClass()}`}
            style={getBtnFlickerStyle(880)}
          >
            <Sparkles size={14} color={isAdaptiveMode ? '#34d399' : '#94a3b8'} />
            <span>Adaptive</span>
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
            className={`glass-cuboid-btn ${showStateBorders ? 'glass-cuboid-btn-active' : ''} ${getBtnFlickerClass()}`}
            style={getBtnFlickerStyle(1000)}
            title="Toggle official Survey of India administrative state borders"
          >
            <MapIcon size={14} color={showStateBorders ? '#38bdf8' : '#94a3b8'} />
            <span>Borders</span>
          </button>

          {/* 108 Monitoring Pins Toggle */}
          <button
            onClick={() => setShowStationPins((v) => !v)}
            className={`glass-cuboid-btn ${showStationPins ? 'glass-cuboid-btn-active' : ''} ${getBtnFlickerClass()}`}
            style={getBtnFlickerStyle(1120)}
            title="Toggle 108 nationwide ground monitoring stations"
          >
            <MapPin size={13} color={showStationPins ? '#38bdf8' : '#94a3b8'} />
            <span>Stations</span>
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
            className={`glass-cuboid-btn ${is3DBuildings ? 'glass-cuboid-btn-active' : ''} ${getBtnFlickerClass()}`}
            style={getBtnFlickerStyle(1240)}
            title="Toggle 3D urban building extrusions and tilt camera"
          >
            <Building2 size={13} color={is3DBuildings ? '#38bdf8' : '#94a3b8'} />
            <span>3D City</span>
          </button>
        </div>

        {/* HAIRLINE DIVIDER */}
        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', width: '100%' }} />

        {/* TIER 2: ATMOSPHERIC HEAT OPACITY CONTROLS & PRESETS */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div className={getBtnFlickerClass()} style={{ display: 'flex', alignItems: 'center', gap: '7px', ...getBtnFlickerStyle(1380) }}>
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
            <span className={getBtnFlickerClass()} style={{ color: '#cbd5e1', fontSize: '0.68rem', marginRight: '2px', fontWeight: 600, ...getBtnFlickerStyle(1500) }}>Presets:</span>
            {[
              { label: 'Subtle', val: 0.28 },
              { label: 'Balanced', val: 0.45 },
              { label: 'Vivid', val: 0.68 },
            ].map((p, pIdx) => {
              const isSelected = Math.abs(heatIntensity - p.val) < 0.05;
              return (
                <button
                  key={p.label}
                  onClick={() => setHeatIntensity(p.val)}
                  className={`glass-cuboid-btn ${isSelected ? 'glass-cuboid-btn-active' : ''} ${getBtnFlickerClass()}`}
                  style={{
                    padding: '3px 9px',
                    borderRadius: '7px',
                    fontSize: '0.70rem',
                    ...getBtnFlickerStyle(1600 + pIdx * 100),
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* ============================================================== */}
      {/* MOBILE BURGER MENU CONTROLS DRAWER                             */}
      {/* ============================================================== */}
      {isMobile && isMobileControlsOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9000,
            background: 'rgba(3, 7, 18, 0.75)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseMobileControls();
          }}
        >
          <div
            className="glass-panel-master"
            style={{
              width: '100%',
              maxHeight: '85vh',
              borderTopLeftRadius: '22px',
              borderTopRightRadius: '22px',
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderBottom: 'none',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -15px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(56, 189, 248, 0.15)',
              overflow: 'hidden',
              animation: 'slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Drawer Header */}
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
                <Sliders size={16} color="#38bdf8" />
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Map Controls & Layers
                </span>
              </div>
              <button
                id="close-mobile-controls-btn"
                onClick={handleCloseMobileControls}
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
                <X size={14} />
                <span>Close</span>
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {/* Section 1: Location & GPS Lock */}
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Location Mode
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleCenterOnUser}
                    className={`glass-cuboid-btn ${userLocation.isLiveGps ? 'glass-cuboid-btn-success' : ''}`}
                    style={{ flex: 1, padding: '8px 12px', justifyContent: 'center' }}
                  >
                    <Navigation size={14} color={userLocation.isLiveGps ? '#10b981' : '#38bdf8'} />
                    <span>{userLocation.isLiveGps ? 'GPS Centered (Active)' : 'Lock Live GPS'}</span>
                  </button>
                </div>
              </div>

              {/* Section 2: Capital City Glide */}
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Quick Glide Regions
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {INDIA_REGION_PRESETS.map((preset) => {
                    const isActive = activePreset.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => {
                          handleGlideToRegion(preset);
                          setIsMobileControlsOpen(false);
                        }}
                        className={`glass-pill ${isActive ? 'glass-pill-active' : ''}`}
                        style={{
                          padding: '5px 11px',
                          borderRadius: '9999px',
                          fontSize: '0.7rem',
                          fontWeight: isActive ? 700 : 600,
                          cursor: 'pointer',
                        }}
                      >
                        {preset.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Place Search Bar */}
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Search Location
                </span>
                <div
                  className="glass-input"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '10px',
                    padding: '8px 12px',
                  }}
                >
                  <Search size={14} color="#94a3b8" />
                  <input
                    type="text"
                    placeholder="Search house, society, PIN code across India..."
                    value={searchQuery}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      width: '100%',
                    }}
                  />
                  {isSearching && <RefreshCw size={12} className="animate-spin" color="#38bdf8" />}
                </div>

                {searchResults.length > 0 && (
                  <div
                    className="glass-panel-sub"
                    style={{
                      marginTop: '6px',
                      borderRadius: '10px',
                      maxHeight: '160px',
                      overflowY: 'auto',
                    }}
                  >
                    {searchResults.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => {
                          handleSelectSearchResult(f);
                          setIsMobileControlsOpen(false);
                        }}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          fontSize: '0.74rem',
                        }}
                      >
                        <MapPin size={13} color="#38bdf8" style={{ flexShrink: 0 }} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
                            <strong style={{ color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.text}</strong>
                            {f.badge && (
                              <span style={{
                                fontSize: '0.6rem',
                                padding: '1px 6px',
                                borderRadius: '999px',
                                background: 'rgba(56, 189, 248, 0.15)',
                                color: '#38bdf8',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                              }}>
                                {f.badge}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.place_name}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 4: Map Layers */}
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Map Layers
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    onClick={() => setShowHeatmapLayer((v) => !v)}
                    className={`glass-cuboid-btn ${showHeatmapLayer ? 'glass-cuboid-btn-active' : ''}`}
                    style={{ padding: '8px 12px', justifyContent: 'center' }}
                  >
                    <Layers size={14} color={showHeatmapLayer ? '#38bdf8' : '#94a3b8'} />
                    <span>Heatmap: {showHeatmapLayer ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    onClick={() => setIsAdaptiveMode((v) => !v)}
                    className={`glass-cuboid-btn ${isAdaptiveMode ? 'glass-cuboid-btn-success' : ''}`}
                    style={{ padding: '8px 12px', justifyContent: 'center' }}
                  >
                    <Sparkles size={14} color={isAdaptiveMode ? '#34d399' : '#94a3b8'} />
                    <span>Adaptive: {isAdaptiveMode ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    onClick={() => setShowStateBorders((v) => !v)}
                    className={`glass-cuboid-btn ${showStateBorders ? 'glass-cuboid-btn-active' : ''}`}
                    style={{ padding: '8px 12px', justifyContent: 'center' }}
                  >
                    <MapIcon size={14} color={showStateBorders ? '#38bdf8' : '#94a3b8'} />
                    <span>State Borders</span>
                  </button>

                  <button
                    onClick={() => setShowStationPins((v) => !v)}
                    className={`glass-cuboid-btn ${showStationPins ? 'glass-cuboid-btn-active' : ''}`}
                    style={{ padding: '8px 12px', justifyContent: 'center' }}
                  >
                    {showStationPins ? <Eye size={14} color="#38bdf8" /> : <EyeOff size={14} color="#94a3b8" />}
                    <span>108 Station Pins</span>
                  </button>

                  <button
                    onClick={() => setIs3DBuildings((v) => !v)}
                    className={`glass-cuboid-btn ${is3DBuildings ? 'glass-cuboid-btn-active' : ''}`}
                    style={{ gridColumn: 'span 2', padding: '8px 12px', justifyContent: 'center' }}
                  >
                    <span>3D Urban Extrusions: {is3DBuildings ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>

              {/* Section 5: Atmospheric Heat Opacity */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Heat Layer Opacity
                  </span>
                  <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.8rem' }}>
                    {Math.round(heatIntensity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.85"
                  step="0.02"
                  value={heatIntensity}
                  onChange={(e) => setHeatIntensity(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer', marginBottom: '8px' }}
                />
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { label: '35% Subtle', val: 0.35 },
                    { label: '55% Balanced', val: 0.55 },
                    { label: '75% Vivid', val: 0.75 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      onClick={() => setHeatIntensity(p.val)}
                      className={`glass-pill ${Math.abs(heatIntensity - p.val) < 0.05 ? 'glass-pill-active' : ''}`}
                      style={{ flex: 1, padding: '4px 6px', fontSize: '0.68rem', textAlign: 'center', cursor: 'pointer' }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 6: Autonomous Shield Test Bench */}
              <div style={{ marginTop: '8px' }}>
                <button
                  id="mobile-launch-shield-btn"
                  onClick={() => {
                    setIsMobileControlsOpen(false);
                    setIsMonitorModalOpen(true);
                  }}
                  className="glass-pill glass-pill-active"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.4) 0%, rgba(3, 105, 161, 0.4) 100%)',
                    border: '1px solid rgba(56, 189, 248, 0.5)',
                    color: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <ShieldCheck size={16} color="#38bdf8" />
                  <span>Launch Autonomous Shield Test Bench ►</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
      <aside
        style={{
          position: 'absolute',
          top: isMobile ? '12px' : '20px',
          bottom: isMobile ? '12px' : '24px',
          right: isSidebarOpen ? (isMobile ? '12px' : '24px') : (isMobile ? '-105vw' : '-440px'),
          width: isMobile ? 'calc(100vw - 24px)' : 'min(410px, calc(100vw - 48px))',
          maxWidth: '430px',
          zIndex: isMobile ? 60 : 25,
          transition: 'right 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: isSidebarOpen ? 'auto' : 'none',
        }}
      >
        <div
          className={`glass-panel-master ${uiBootStage === 0 ? 'crt-ui-hidden' : ''}`}
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
                Air Quality & Advisory HUD
              </span>
            </div>

            <button
              onClick={handleCloseSidebar}
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

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '8px' }}>
                  <div style={{ position: 'relative', display: 'inline-flex' }}>
                    <AqiSporeAura color={getAqiColor(inspectedPoint.aqi, activeRange).hex} />
                    <span
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '3.85rem',
                        fontWeight: 900,
                        lineHeight: 1,
                        color: getAqiColor(inspectedPoint.aqi, activeRange).hex,
                        textShadow: `0 0 25px ${getAqiColor(inspectedPoint.aqi, activeRange).hex}55`,
                        zIndex: 1,
                      }}
                    >
                      {inspectedPoint.aqi}
                    </span>
                  </div>
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
                    <strong style={{ color: '#f87171' }}>{inspectedPoint.pm25 != null ? inspectedPoint.pm25 : '—'} µg/m³</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Nearest Ground Station:</span>
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                      {inspectedPoint?.nearestStation
                        ? `${(typeof inspectedPoint.nearestStation === 'string' ? inspectedPoint.nearestStation.split('(')[0]?.trim() : inspectedPoint.nearestStation) || 'Monitoring Node'} (${inspectedPoint.distanceKm ?? 0} km)`
                        : 'Nearby Monitoring Station'}
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

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '8px' }}>
                  <div style={{ position: 'relative', display: 'inline-flex' }}>
                    <AqiSporeAura color={userColor.hex} />
                    <span
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '3.85rem',
                        fontWeight: 900,
                        lineHeight: 1,
                        color: userColor.hex,
                        textShadow: `0 0 25px ${userColor.hex}55`,
                        zIndex: 1,
                      }}
                    >
                      {userAqiEstimate !== null ? userAqiEstimate : '--'}
                    </span>
                  </div>
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
                        {nearestStation.station?.name
                          ? `${nearestStation.station.name.split(',')[0]?.trim() || nearestStation.station.name} (${nearestStation.distance ?? 0} km)`
                          : 'Nearby CAAQMS Sensor'}
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
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Selected Monitoring Node
                </span>
                <span
                  className="glass-pill"
                  style={{
                    fontSize: '0.68rem',
                    color: getAqiColor(displayStation.aqi, activeRange).hex,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: 700,
                  }}
                >
                  {displayStation.type || 'CAAQMS Node'}
                </span>
              </div>

              {/* Station Hero Header with Large AQI & Radiating Spores */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '14px' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {displayStation.name}
                  </h3>
                  <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>
                    {displayStation.zone || displayStation.state || 'India'} · Multi-Source Ground Grid
                  </p>
                </div>

                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <AqiSporeAura color={getAqiColor(displayStation.aqi, activeRange).hex} />
                  <span
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '3.6rem',
                      fontWeight: 900,
                      lineHeight: 1,
                      color: getAqiColor(displayStation.aqi, activeRange).hex,
                      textShadow: `0 0 25px ${getAqiColor(displayStation.aqi, activeRange).hex}55`,
                      zIndex: 1,
                    }}
                  >
                    {displayStation.aqi}
                  </span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: getAqiColor(displayStation.aqi, activeRange).textHex, zIndex: 1, marginTop: '2px' }}>
                    AQI · {getAqiColor(displayStation.aqi, activeRange).label}
                  </span>
                </div>
              </div>

              {/* Station secondary metrics grid - Subtle, muted, non-jarring */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
                <div className="glass-panel-sub" style={{ padding: '8px 6px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span style={{ fontSize: '0.62rem', color: '#64748b', display: 'block' }}>PM2.5</span>
                  <strong style={{ fontSize: '0.95rem', color: '#f87171' }}>
                    {displayStation.pm25} <span style={{ fontSize: '0.6rem', color: '#64748b' }}>µg</span>
                  </strong>
                </div>
                <div className="glass-panel-sub" style={{ padding: '8px 6px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span style={{ fontSize: '0.62rem', color: '#64748b', display: 'block' }}>PM10</span>
                  <strong style={{ fontSize: '0.95rem', color: '#fb923c' }}>
                    {displayStation.pm10} <span style={{ fontSize: '0.6rem', color: '#64748b' }}>µg</span>
                  </strong>
                </div>
                <div className="glass-panel-sub" style={{ padding: '8px 6px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span style={{ fontSize: '0.62rem', color: '#64748b', display: 'block' }}>NO2</span>
                  <strong style={{ fontSize: '0.95rem', color: '#38bdf8' }}>
                    {displayStation.no2 || 24} <span style={{ fontSize: '0.6rem', color: '#64748b' }}>µg</span>
                  </strong>
                </div>
              </div>

              {/* Google Gemini AI Health & Commute Advisory - Zero size jumping */}
              <div
                className="glass-panel-sub"
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(56, 189, 248, 0.22)',
                  minHeight: '84px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong style={{ color: '#38bdf8', fontSize: '0.74rem', letterSpacing: '0.03em', textTransform: 'uppercase', fontWeight: 800 }}>
                    Recommendations
                  </strong>
                  <span
                    className="glass-pill"
                    style={{
                      fontSize: '0.65rem',
                      color: '#94a3b8',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {isLoadingAdvisory && <RefreshCw size={10} className="animate-spin" color="#38bdf8" />}
                    {isLoadingAdvisory ? 'Updating...' : 'Live Guidance'}
                  </span>
                </div>
                <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.76rem', lineHeight: 1.45, opacity: isLoadingAdvisory ? 0.75 : 1, transition: 'opacity 0.2s ease' }}>
                  {geminiAdvisory}
                </p>
              </div>
            </div>

            {/* 3. CALIBRATED SEAMLESS ZOOM SPECTRUM */}
            <div
              className="glass-panel-sub"
              style={{
                padding: '14px 18px',
                borderRadius: '16px',
                border: isAdaptiveMode && activeRange.isZoomed ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(15, 23, 42, 0.65)',
                transition: 'border-color 0.3s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.76rem' }}>Zoom Spectrum</span>
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

              {/* Colored continuous gradient bar */}
              <div
                style={{
                  height: '11px',
                  borderRadius: '6px',
                  background:
                    'linear-gradient(90deg, #10b981 0%, #34d399 14%, #a3e635 28%, #eab308 42%, #f97316 58%, #ea580c 72%, #dc2626 86%, #b91c1c 100%)',
                  marginBottom: '8px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.45), inset 0 1px 2px rgba(255, 255, 255, 0.2)',
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
            </div>
          </div>
        </div>
      </aside>

      {/* Section 10: Civic Petition & Action Modal */}
      <PetitionModal
        isOpen={isPetitionModalOpen}
        onClose={() => setIsPetitionModalOpen(false)}
        initialStation={petitionStation}
        initialLocality={petitionLocality}
        initialPm25={petitionPm25}
      />

      {/* Autonomous Atmospheric Shield & Emergency Monitor Test Bench */}
      <AutonomousMonitorModal
        isOpen={isMonitorModalOpen}
        onClose={() => setIsMonitorModalOpen(false)}
      />
    </section>
  );

}
