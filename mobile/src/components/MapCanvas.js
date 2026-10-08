import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Platform,
} from 'react-native';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import indiaStations from '../data/indiaStations.json';
import indiaBoundaryGeoJson from '../data/indiaBoundary.json';

const MAPBOX_TOKEN = (typeof process !== 'undefined' && (process.env?.EXPO_PUBLIC_MAPBOX_TOKEN || process.env?.VITE_MAPBOX_TOKEN)) || (typeof window !== 'undefined' && (window.MAPBOX_TOKEN || '')) || '';
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

export const MAPBOX_DARK_STYLE = 'mapbox://styles/mapbox/navigation-night-v1';

export const INDIA_REGION_PRESETS = [
  { id: 'all-india', name: 'ALL INDIA', center: [79.2, 22.8], zoom: 4.6, pitch: 15 },
  { id: 'delhi-ncr', name: 'DELHI NCR', center: [77.16, 28.66], zoom: 9.8, pitch: 26 },
  { id: 'mumbai', name: 'MUMBAI', center: [72.8777, 19.0760], zoom: 10.0, pitch: 26 },
  { id: 'bengaluru', name: 'BENGALURU', center: [77.5946, 12.9716], zoom: 10.0, pitch: 26 },
  { id: 'gangetic', name: 'INDO-GANGETIC', center: [82.5, 26.0], zoom: 7.0, pitch: 22 },
  { id: 'kolkata', name: 'KOLKATA', center: [88.3639, 22.5726], zoom: 10.2, pitch: 26 },
  { id: 'chennai', name: 'CHENNAI', center: [80.2707, 13.0827], zoom: 10.2, pitch: 26 },
  { id: 'hyderabad', name: 'HYDERABAD', center: [78.4867, 17.3850], zoom: 10.0, pitch: 26 },
  { id: 'himalayas', name: 'HIMALAYAS', center: [76.5, 33.5], zoom: 6.8, pitch: 28 },
];

export function getPollutantValue(station, pollutant = 'aqi') {
  if (!station) return 0;
  if (pollutant === 'aqi') return station.aqi ?? 0;
  if (station[pollutant] !== undefined && station[pollutant] !== null) {
    return station[pollutant];
  }
  return 0;
}

export function getPollutantMeta(val, pollutant = 'aqi') {
  const num = Number(val) || 0;
  
  if (pollutant === 'pm25') {
    // 24-hr NAAQS: 0-30 Good, 31-60 Satisfactory, 61-90 Moderate, 91-120 Poor, 121-250 Very Poor, >250 Severe
    if (num <= 30) return { hex: '#10b981', label: 'Good', badgeBg: 'rgba(16, 185, 129, 0.2)', textHex: '#34d399', unit: 'µg/m³', maxScale: 250 };
    if (num <= 60) return { hex: '#84cc16', label: 'Satisfactory', badgeBg: 'rgba(132, 204, 22, 0.2)', textHex: '#a3e635', unit: 'µg/m³', maxScale: 250 };
    if (num <= 90) return { hex: '#eab308', label: 'Moderate', badgeBg: 'rgba(234, 179, 8, 0.2)', textHex: '#facc15', unit: 'µg/m³', maxScale: 250 };
    if (num <= 120) return { hex: '#f97316', label: 'Poor', badgeBg: 'rgba(249, 115, 22, 0.2)', textHex: '#fb923c', unit: 'µg/m³', maxScale: 250 };
    if (num <= 250) return { hex: '#ef4444', label: 'Very Poor', badgeBg: 'rgba(220, 38, 38, 0.2)', textHex: '#f87171', unit: 'µg/m³', maxScale: 250 };
    return { hex: '#991b1b', label: 'Severe', badgeBg: 'rgba(153, 27, 27, 0.25)', textHex: '#fca5a5', unit: 'µg/m³', maxScale: 250 };
  }

  if (pollutant === 'pm10') {
    // 24-hr NAAQS: 0-50 Good, 51-100 Satisfactory, 101-250 Moderate, 251-350 Poor, 351-430 Very Poor, >430 Severe
    if (num <= 50) return { hex: '#10b981', label: 'Good', badgeBg: 'rgba(16, 185, 129, 0.2)', textHex: '#34d399', unit: 'µg/m³', maxScale: 430 };
    if (num <= 100) return { hex: '#84cc16', label: 'Satisfactory', badgeBg: 'rgba(132, 204, 22, 0.2)', textHex: '#a3e635', unit: 'µg/m³', maxScale: 430 };
    if (num <= 250) return { hex: '#eab308', label: 'Moderate', badgeBg: 'rgba(234, 179, 8, 0.2)', textHex: '#facc15', unit: 'µg/m³', maxScale: 430 };
    if (num <= 350) return { hex: '#f97316', label: 'Poor', badgeBg: 'rgba(249, 115, 22, 0.2)', textHex: '#fb923c', unit: 'µg/m³', maxScale: 430 };
    if (num <= 430) return { hex: '#ef4444', label: 'Very Poor', badgeBg: 'rgba(220, 38, 38, 0.2)', textHex: '#f87171', unit: 'µg/m³', maxScale: 430 };
    return { hex: '#991b1b', label: 'Severe', badgeBg: 'rgba(153, 27, 27, 0.25)', textHex: '#fca5a5', unit: 'µg/m³', maxScale: 430 };
  }

  if (pollutant === 'no2') {
    // 24-hr NAAQS: 0-40 Good, 41-80 Satisfactory, 81-180 Moderate, 181-280 Poor, 281-400 Very Poor, >400 Severe
    if (num <= 40) return { hex: '#10b981', label: 'Good', badgeBg: 'rgba(16, 185, 129, 0.2)', textHex: '#34d399', unit: 'µg/m³', maxScale: 280 };
    if (num <= 80) return { hex: '#84cc16', label: 'Satisfactory', badgeBg: 'rgba(132, 204, 22, 0.2)', textHex: '#a3e635', unit: 'µg/m³', maxScale: 280 };
    if (num <= 180) return { hex: '#eab308', label: 'Moderate', badgeBg: 'rgba(234, 179, 8, 0.2)', textHex: '#facc15', unit: 'µg/m³', maxScale: 280 };
    if (num <= 280) return { hex: '#f97316', label: 'Poor', badgeBg: 'rgba(249, 115, 22, 0.2)', textHex: '#fb923c', unit: 'µg/m³', maxScale: 280 };
    return { hex: '#ef4444', label: 'Very Poor', badgeBg: 'rgba(220, 38, 38, 0.2)', textHex: '#f87171', unit: 'µg/m³', maxScale: 280 };
  }

  if (pollutant === 'so2') {
    // 24-hr NAAQS: 0-40 Good, 41-80 Satisfactory, 81-380 Moderate, 381-800 Poor
    if (num <= 40) return { hex: '#10b981', label: 'Good', badgeBg: 'rgba(16, 185, 129, 0.2)', textHex: '#34d399', unit: 'µg/m³', maxScale: 200 };
    if (num <= 80) return { hex: '#84cc16', label: 'Satisfactory', badgeBg: 'rgba(132, 204, 22, 0.2)', textHex: '#a3e635', unit: 'µg/m³', maxScale: 200 };
    if (num <= 200) return { hex: '#eab308', label: 'Moderate', badgeBg: 'rgba(234, 179, 8, 0.2)', textHex: '#facc15', unit: 'µg/m³', maxScale: 200 };
    return { hex: '#ef4444', label: 'Poor', badgeBg: 'rgba(220, 38, 38, 0.2)', textHex: '#f87171', unit: 'µg/m³', maxScale: 200 };
  }

  if (pollutant === 'co') {
    // 8-hr NAAQS in mg/m³: 0-1.0 Good, 1.1-2.0 Satisfactory, 2.1-10 Moderate, 10.1-17 Poor
    if (num <= 1.0) return { hex: '#10b981', label: 'Good', badgeBg: 'rgba(16, 185, 129, 0.2)', textHex: '#34d399', unit: 'mg/m³', maxScale: 10 };
    if (num <= 2.0) return { hex: '#84cc16', label: 'Satisfactory', badgeBg: 'rgba(132, 204, 22, 0.2)', textHex: '#a3e635', unit: 'mg/m³', maxScale: 10 };
    if (num <= 10.0) return { hex: '#eab308', label: 'Moderate', badgeBg: 'rgba(234, 179, 8, 0.2)', textHex: '#facc15', unit: 'mg/m³', maxScale: 10 };
    return { hex: '#ef4444', label: 'Poor', badgeBg: 'rgba(220, 38, 38, 0.2)', textHex: '#f87171', unit: 'mg/m³', maxScale: 10 };
  }

  if (pollutant === 'o3') {
    // 8-hr NAAQS in µg/m³: 0-50 Good, 51-100 Satisfactory, 101-168 Moderate, 169-208 Poor
    if (num <= 50) return { hex: '#10b981', label: 'Good', badgeBg: 'rgba(16, 185, 129, 0.2)', textHex: '#34d399', unit: 'µg/m³', maxScale: 200 };
    if (num <= 100) return { hex: '#84cc16', label: 'Satisfactory', badgeBg: 'rgba(132, 204, 22, 0.2)', textHex: '#a3e635', unit: 'µg/m³', maxScale: 200 };
    if (num <= 168) return { hex: '#eab308', label: 'Moderate', badgeBg: 'rgba(234, 179, 8, 0.2)', textHex: '#facc15', unit: 'µg/m³', maxScale: 200 };
    return { hex: '#ef4444', label: 'Poor', badgeBg: 'rgba(220, 38, 38, 0.2)', textHex: '#f87171', unit: 'µg/m³', maxScale: 200 };
  }

  // Default: AQI CPCB Scale
  if (num <= 50) return { hex: '#10b981', label: 'Good', badgeBg: 'rgba(16, 185, 129, 0.2)', textHex: '#34d399', unit: 'AQI', maxScale: 500 };
  if (num <= 100) return { hex: '#84cc16', label: 'Satisfactory', badgeBg: 'rgba(132, 204, 22, 0.2)', textHex: '#a3e635', unit: 'AQI', maxScale: 500 };
  if (num <= 200) return { hex: '#eab308', label: 'Moderate', badgeBg: 'rgba(234, 179, 8, 0.2)', textHex: '#facc15', unit: 'AQI', maxScale: 500 };
  if (num <= 300) return { hex: '#f97316', label: 'Poor', badgeBg: 'rgba(249, 115, 22, 0.2)', textHex: '#fb923c', unit: 'AQI', maxScale: 500 };
  if (num <= 400) return { hex: '#ef4444', label: 'Very Poor', badgeBg: 'rgba(220, 38, 38, 0.2)', textHex: '#f87171', unit: 'AQI', maxScale: 500 };
  return { hex: '#991b1b', label: 'Severe', badgeBg: 'rgba(153, 27, 27, 0.25)', textHex: '#fca5a5', unit: 'AQI', maxScale: 500 };
}

export function getAqiColorMeta(val, pollutant = 'aqi') {
  return getPollutantMeta(val, pollutant);
}

// Distance helper (Haversine in km)
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
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

// GeoJSON circle helper for GPS accuracy and locality boundary
export function createGeoJsonCircle(center, radiusInMeters, points = 48) {
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

export function AqiSporeAura({ color = '#10b981' }) {
  if (Platform.OS !== 'web') return null;

  const spores = [
    { tx: 0, ty: -28, size: 3.2, delay: 0, dur: 3.2 },
    { tx: 20, ty: -20, size: 2.6, delay: 0.8, dur: 3.6 },
    { tx: 28, ty: 0, size: 3.0, delay: 1.5, dur: 3.0 },
    { tx: 22, ty: 18, size: 2.4, delay: 0.4, dur: 3.8 },
    { tx: 0, ty: 28, size: 2.8, delay: 2.0, dur: 3.4 },
    { tx: -20, ty: 20, size: 2.6, delay: 1.0, dur: 3.2 },
    { tx: -28, ty: 0, size: 3.0, delay: 2.4, dur: 3.5 },
    { tx: -20, ty: -20, size: 2.4, delay: 0.6, dur: 3.3 },
  ];

  return (
    <div className="aqi-spore-container" aria-hidden="true">
      {spores.map((s, idx) => (
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

// Geographic Bounding Box for India raster
export const INDIA_RASTER_BOUNDS = {
  minLon: 68.10,
  maxLon: 97.45,
  minLat: 6.75,
  maxLat: 37.10,
};

export function latToMercatorY(lat) {
  const rad = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + rad / 2));
}

export function mercatorYToLat(y) {
  return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * (180 / Math.PI);
}

const Y_MIN = latToMercatorY(INDIA_RASTER_BOUNDS.minLat);
const Y_MAX = latToMercatorY(INDIA_RASTER_BOUNDS.maxLat);
const Y_SPAN = Y_MAX - Y_MIN;
const LON_SPAN = INDIA_RASTER_BOUNDS.maxLon - INDIA_RASTER_BOUNDS.minLon;

export const INDIA_RASTER_COORDINATES = [
  [INDIA_RASTER_BOUNDS.minLon, INDIA_RASTER_BOUNDS.maxLat],
  [INDIA_RASTER_BOUNDS.maxLon, INDIA_RASTER_BOUNDS.maxLat],
  [INDIA_RASTER_BOUNDS.maxLon, INDIA_RASTER_BOUNDS.minLat],
  [INDIA_RASTER_BOUNDS.minLon, INDIA_RASTER_BOUNDS.minLat],
];

export const SEAMLESS_AQI_STOPS = [
  { t: 0.00, rgb: [16, 185, 129],  hex: '#10b981', label: 'Pristine Green' },
  { t: 0.15, rgb: [52, 211, 153],  hex: '#34d399', label: 'Emerald Mint' },
  { t: 0.30, rgb: [132, 204, 22],  hex: '#84cc16', label: 'Vivid Lime' },
  { t: 0.46, rgb: [234, 179, 8],   hex: '#eab308', label: 'Warm Yellow' },
  { t: 0.62, rgb: [249, 115, 22],  hex: '#f97316', label: 'Vivid Orange' },
  { t: 0.76, rgb: [234, 88, 12],   hex: '#ea580c', label: 'Burnt Ochre' },
  { t: 0.90, rgb: [220, 38, 38],   hex: '#dc2626', label: 'Scarlet Red' },
  { t: 1.00, rgb: [185, 28, 28],   hex: '#b91c1c', label: 'Deep Crimson' },
];

export function interpolateSeamlessRgb(normalizedT) {
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

function drawIndiaBoundaryPath(ctx, width, height) {
  ctx.beginPath();
  const geom = indiaBoundaryGeoJson?.features?.[0]?.geometry;
  if (!geom) return;

  const polygons = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];

  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (let i = 0; i < ring.length; i++) {
        const [lon, lat] = ring[i];
        const px = ((lon - INDIA_RASTER_BOUNDS.minLon) / LON_SPAN) * width;
        const py = ((Y_MAX - latToMercatorY(lat)) / Y_SPAN) * height;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }
  }
}

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

export function computeRawSpatialGrid(stationsList, pollutantType = 'aqi', bounds = INDIA_RASTER_BOUNDS, width = 220, height = 220) {
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

  const power = 2.0;
  const epsilonKm = 1.5;

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

      const effectiveVal = weightedVal / (totalWeight || 1);
      rawGrid[idx] = effectiveVal;

      if (mask[idx] === 1) {
        if (effectiveVal < nationalMin) nationalMin = effectiveVal;
        if (effectiveVal > nationalMax) nationalMax = effectiveVal;
      }
    }
  }

  if (!Number.isFinite(nationalMin)) nationalMin = 40;
  if (!Number.isFinite(nationalMax)) nationalMax = 260;

  return { rawGrid, mask, nationalMin, nationalMax, width, height, bounds };
}

export function sampleRasterGridVal(gridObj, lon, lat) {
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

export function calculateAdaptiveRange(gridObj, mapBounds, zoom, isAdaptiveMode = true, pollutant = 'aqi') {
  if (!gridObj) {
    const isCo = pollutant === 'co';
    const dMin = isCo ? 0.4 : (pollutant === 'so2' ? 5 : 40);
    const dMax = isCo ? 1.8 : (pollutant === 'so2' ? 20 : 260);
    return {
      effectiveMin: dMin,
      effectiveMax: dMax,
      localMin: dMin,
      localMax: dMax,
      nationalMin: dMin,
      nationalMax: dMax,
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

  const tZoom = Math.max(0, Math.min(1, (zoom - 5.5) / (9.5 - 5.5)));
  const zoomFactor = tZoom * tZoom * (3 - 2 * tZoom);

  let effectiveMin = (1 - zoomFactor) * nationalMin + zoomFactor * localMin;
  let effectiveMax = (1 - zoomFactor) * nationalMax + zoomFactor * localMax;

  // Enforce a minimum contrast span calibrated specifically to each physical pollutant
  let minSpan = 20;
  if (pollutant === 'co') minSpan = 0.25;
  else if (pollutant === 'so2') minSpan = 3.0;
  else if (pollutant === 'no2' || pollutant === 'o3') minSpan = 8.0;
  else if (pollutant === 'pm25') minSpan = 10.0;
  else if (pollutant === 'pm10') minSpan = 15.0;

  if (effectiveMax - effectiveMin < minSpan) {
    const mid = (effectiveMax + effectiveMin) / 2;
    effectiveMin = Math.max(0, mid - minSpan / 2);
    effectiveMax = mid + minSpan / 2;
  }

  const isCo = pollutant === 'co';
  const roundVal = (v) => isCo ? Math.round(v * 10) / 10 : Math.round(v);

  return {
    effectiveMin,
    effectiveMax,
    localMin: roundVal(localMin),
    localMax: roundVal(localMax),
    nationalMin: roundVal(nationalMin),
    nationalMax: roundVal(nationalMax),
    zoomFactor,
  };
}

export function renderSeamlessRasterImage(gridObj, effectiveMin, effectiveMax) {
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
      data[i * 4 + 3] = 0;
      continue;
    }

    const val = rawGrid[i];
    const t = Math.max(0, Math.min(1, (val - effectiveMin) / range));
    const [r, g, b] = interpolateSeamlessRgb(t);

    const idx = i * 4;
    data[idx] = r;
    data[idx + 1] = g;
    data[idx + 2] = b;
    data[idx + 3] = 175; // Translucent 68% base alpha
  }

  rawCtx.putImageData(imgData, 0, 0);
  return rawCanvas.toDataURL();
}

// Module-level persistent map instance to prevent duplicate billable Mapbox loads
let persistentMapbox = null;
let persistentMarkersMap = new Map();
let persistentTargetMarker = null;
let persistentUserGpsMarker = null;
let persistentRasterGridCache = null;
let orbitAnimId = null;
let isOrbiting = false;

export default function MapCanvas({
  selectedStation,
  onSelectStation,
  activePollutant = 'aqi',
  showHeatmapLayer = true,
  showStateBorders = true,
  showStationPins = false,
  is3DBuildings = true,
  isAdaptiveMode = true,
  heatIntensity = 0.55,
  activePreset = INDIA_REGION_PRESETS[0],
  userLocation,
  trigger360TourRef,
  onRangeChange,
  stations = indiaStations,
}) {
  const stationsRef = useRef(stations);
  stationsRef.current = stations;
  const mapContainerRef = useRef(null);
  const [isTvTurningOn, setIsTvTurningOn] = useState(true);
  const isMapLoadedRef = useRef(false);
  const hasPlayedIntroTourRef = useRef(false);
  const playCinematicTourFnRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTvTurningOn(false);
    }, 1400);
    return () => clearTimeout(timer);
  }, []);

  const updateRasterForViewportRef = useRef(null);
  const isAdaptiveModeRef = useRef(isAdaptiveMode);
  isAdaptiveModeRef.current = isAdaptiveMode;
  const activePollutantRef = useRef(activePollutant);
  activePollutantRef.current = activePollutant;

  // Viewport-Adaptive Raster Recalibration
  const updateRasterForViewport = useCallback(() => {
    if (!persistentMapbox || !isMapLoadedRef.current || isOrbiting) return;
    const source = persistentMapbox.getSource('india-aqi-raster');
    if (!source || typeof source.updateImage !== 'function') return;

    if (!persistentRasterGridCache) {
      persistentRasterGridCache = computeRawSpatialGrid(stationsRef.current || indiaStations, activePollutantRef.current, INDIA_RASTER_BOUNDS);
    }

    const zoom = persistentMapbox.getZoom();
    const bounds = persistentMapbox.getBounds();
    const currentPollutant = activePollutantRef.current || 'aqi';
    const isCo = currentPollutant === 'co';

    let effectiveMin, effectiveMax;
    if (isAdaptiveModeRef.current) {
      const rangeResult = calculateAdaptiveRange(persistentRasterGridCache, bounds, zoom, true, currentPollutant);
      effectiveMin = rangeResult.effectiveMin;
      effectiveMax = rangeResult.effectiveMax;
      if (onRangeChange) {
        onRangeChange({
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
      }
    } else {
      effectiveMin = persistentRasterGridCache.nationalMin;
      effectiveMax = persistentRasterGridCache.nationalMax;
      if (onRangeChange) {
        onRangeChange({
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
    }

    const rasterUrl = renderSeamlessRasterImage(persistentRasterGridCache, effectiveMin, effectiveMax);
    if (rasterUrl) {
      source.updateImage({
        url: rasterUrl,
        coordinates: INDIA_RASTER_COORDINATES,
      });
    }
  }, [onRangeChange]);

  updateRasterForViewportRef.current = updateRasterForViewport;

  // Cinematic 360° Orbital Tour (Fluid 6.8s 3D Revolution)
  const playCinematic360Tour = useCallback((customTarget = null) => {
    if (!persistentMapbox) return;
    const map = persistentMapbox;

    if (orbitAnimId) {
      cancelAnimationFrame(orbitAnimId);
      orbitAnimId = null;
    }

    const targetLon = customTarget?.lon ?? selectedStation?.lon ?? userLocation?.lon ?? 77.16;
    const targetLat = customTarget?.lat ?? selectedStation?.lat ?? userLocation?.lat ?? 28.66;
    const targetCenter = [targetLon, targetLat];

    isOrbiting = true;

    // Temporarily hide state borders during orbital revolution for butter-smooth 60fps
    ['admin-1-boundary', 'admin-1-boundary-bg', 'boundary_state'].forEach((id) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', 'none');
      }
    });

    map.stop();
    map.jumpTo({
      center: targetCenter,
      zoom: 4.85,
      pitch: 58,
      bearing: 0,
    });

    const orbitDuration = 6800;
    let startTime = null;
    const startBearing = 0;

    const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    const orbitStep = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / orbitDuration);
      const eased = easeInOutCubic(progress);

      const currentBearing = (startBearing + eased * 360) % 360;

      map.jumpTo({
        center: targetCenter,
        zoom: 4.85,
        pitch: 58,
        bearing: currentBearing,
      });

      if (progress < 1) {
        orbitAnimId = requestAnimationFrame(orbitStep);
      } else {
        orbitAnimId = null;
        isOrbiting = false;

        // Restore borders
        if (showStateBorders) {
          ['admin-1-boundary', 'admin-1-boundary-bg', 'boundary_state'].forEach((id) => {
            if (map.getLayer(id)) {
              map.setLayoutProperty(id, 'visibility', 'visible');
            }
          });
        }

        // Swoop down into target location
        map.flyTo({
          center: targetCenter,
          zoom: 11.8,
          pitch: 32,
          bearing: 0,
          speed: 0.82,
          curve: 1.35,
        });
      }
    };

    orbitAnimId = requestAnimationFrame(orbitStep);
  }, [selectedStation, userLocation, showStateBorders]);

  playCinematicTourFnRef.current = playCinematic360Tour;

  if (trigger360TourRef) {
    trigger360TourRef.current = playCinematic360Tour;
  }

  // Initialize Mapbox GL EXACTLY ONCE on web
  useEffect(() => {
    if (Platform.OS !== 'web' || !mapContainerRef.current) return;

    if (persistentMapbox) {
      if (persistentMapbox.getContainer() !== mapContainerRef.current) {
        try {
          mapContainerRef.current.appendChild(persistentMapbox.getContainer());
          persistentMapbox.resize();
        } catch (e) {
          console.warn('Reattaching map container:', e);
        }
      }
      return;
    }

    try {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: MAPBOX_DARK_STYLE,
        center: activePreset.center || [79.2, 22.8],
        zoom: activePreset.zoom || 4.6,
        pitch: activePreset.pitch || 15,
        attributionControl: false,
      });

      persistentMapbox = map;

      const nav = new mapboxgl.NavigationControl({
        showCompass: true,
        visualizePitch: true,
      });
      map.addControl(nav, 'bottom-right');

      map.on('load', () => {
        isMapLoadedRef.current = true;

        const layers = map.getStyle().layers;
        const labelLayerId = layers.find(
          (layer) => layer.type === 'symbol' && layer.layout['text-field']
        )?.id;

        // 1. User GPS Accuracy Source and Circle Layers
        map.addSource('user-gps-accuracy-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        map.addLayer({
          id: 'user-gps-accuracy-fill',
          type: 'fill',
          source: 'user-gps-accuracy-source',
          paint: {
            'fill-color': '#06b6d4',
            'fill-opacity': 0.10,
          },
        }, labelLayerId);

        map.addLayer({
          id: 'user-gps-accuracy-outline',
          type: 'line',
          source: 'user-gps-accuracy-source',
          paint: {
            'line-color': '#38bdf8',
            'line-width': 2,
            'line-opacity': 0.85,
            'line-dasharray': [5, 4],
          },
        }, labelLayerId);

        // 2. Add Continuous 2D IDW Spatial Heatmap Layer
        try {
          persistentRasterGridCache = computeRawSpatialGrid(stationsRef.current || indiaStations, activePollutant, INDIA_RASTER_BOUNDS);
          const initialRasterUrl = renderSeamlessRasterImage(
            persistentRasterGridCache,
            persistentRasterGridCache.nationalMin,
            persistentRasterGridCache.nationalMax
          );

          map.addSource('india-aqi-raster', {
            type: 'image',
            url: initialRasterUrl,
            coordinates: INDIA_RASTER_COORDINATES,
          });

          map.addLayer({
            id: 'india-aqi-raster-layer',
            type: 'raster',
            source: 'india-aqi-raster',
            paint: {
              'raster-opacity': showHeatmapLayer ? heatIntensity : 0,
              'raster-fade-duration': 0,
              'raster-resampling': 'linear',
            },
          }, labelLayerId);
        } catch (rasterErr) {
          console.warn('Raster heatmap load error:', rasterErr);
        }

        // 3. Official India National Perimeter Border Line
        map.addSource('india-boundary-source', {
          type: 'geojson',
          data: indiaBoundaryGeoJson,
        });

        map.addLayer({
          id: 'india-boundary-line',
          type: 'line',
          source: 'india-boundary-source',
          paint: {
            'line-color': '#38bdf8',
            'line-width': 2.2,
            'line-opacity': 0.95,
            'line-dasharray': [3, 1.5],
          },
        }, labelLayerId);

        // 4. Selected Place / Locality Perimeter Boundary Buffer
        map.addSource('selected-place-boundary-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        map.addLayer({
          id: 'selected-place-boundary-fill',
          type: 'fill',
          source: 'selected-place-boundary-source',
          paint: {
            'fill-color': '#38bdf8',
            'fill-opacity': 0.08,
          },
        }, labelLayerId);

        map.addLayer({
          id: 'selected-place-boundary-outline',
          type: 'line',
          source: 'selected-place-boundary-source',
          paint: {
            'line-color': '#38bdf8',
            'line-width': 1.8,
            'line-opacity': 0.65,
            'line-dasharray': [3, 2],
          },
        }, labelLayerId);

        // 5. Subtle State Boundaries Styling
        ['admin-1-boundary', 'boundary_state'].forEach((id) => {
          if (map.getLayer(id)) {
            map.setPaintProperty(id, 'line-color', '#94a3b8');
            map.setPaintProperty(id, 'line-opacity', 0.55);
            map.setPaintProperty(id, 'line-dasharray', [3, 2]);
          }
        });

        // 6. 3D Building Extrusions with Directional Light
        try {
          if (map.getSource('composite')) {
            map.addLayer({
              id: '3d-buildings',
              source: 'composite',
              'source-layer': 'building',
              filter: ['==', 'extrude', 'true'],
              type: 'fill-extrusion',
              minzoom: 12,
              paint: {
                'fill-extrusion-color': '#1a2234',
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-base': ['get', 'min_height'],
                'fill-extrusion-opacity': 0.75,
              },
            }, labelLayerId);
          }

          if (typeof map.setLight === 'function') {
            map.setLight({
              anchor: 'viewport',
              color: '#e2e8f0',
              intensity: 0.6,
              position: [1.3, 215, 42],
            });
          }
        } catch (e) {
          console.warn('Building layer load error:', e);
        }

        // 7. Interactive Map Click with Exact Mathematical Raster Sampling
        map.on('click', (e) => {
          const clickLat = e.lngLat.lat;
          const clickLon = e.lngLat.lng;

          const currentStations = stationsRef.current || indiaStations;
          let nearest = currentStations[0];
          let minDist = Infinity;
          currentStations.forEach((st) => {
            const d = calculateDistanceKm(clickLat, clickLon, st.lat, st.lon);
            if (d < minDist) {
              minDist = d;
              nearest = st;
            }
          });

          // Sample exact continuous spatial raster value
          const sampled = sampleRasterGridVal(persistentRasterGridCache, clickLon, clickLat);
          const currentPollutant = activePollutantRef.current || 'aqi';
          let activeVal = sampled !== null
            ? Math.round(sampled * 10) / 10
            : getPollutantValue(nearest, currentPollutant);

          const nearestBaseVal = getPollutantValue(nearest, currentPollutant) || 1;
          if (minDist <= 1.5) {
            const blend = minDist / 1.5;
            activeVal = Math.round(((1 - blend) * nearestBaseVal + blend * activeVal) * 10) / 10;
          }
          const ratio = Math.max(0.4, Math.min(2.5, activeVal / nearestBaseVal));

          const inspectedObj = {
            ...nearest,
            id: `pinpoint-${Math.round(clickLat * 100)}-${Math.round(clickLon * 100)}`,
            name: `${nearest.name} (Spatial Interpolation)`,
            lat: clickLat,
            lon: clickLon,
            isInterpolated: true,
            aqi: currentPollutant === 'aqi' ? Math.round(activeVal) : (nearest.aqi || 0),
            pm25: currentPollutant === 'pm25' ? activeVal : (nearest.pm25 ?? 0),
            pm10: currentPollutant === 'pm10' ? activeVal : (nearest.pm10 ?? 0),
            no2: currentPollutant === 'no2' ? activeVal : (nearest.no2 ?? 0),
            so2: currentPollutant === 'so2' ? activeVal : (nearest.so2 ?? 0),
            co: currentPollutant === 'co' ? activeVal : (nearest.co ?? 0),
            o3: currentPollutant === 'o3' ? activeVal : (nearest.o3 ?? 0),
          };

          if (onSelectStation) {
            onSelectStation(inspectedObj);
          }
        });

        // 8. Adaptive Viewport Listener on Move / Zoom
        let throttleTimer = null;
        const handleViewportChange = () => {
          if (isOrbiting || throttleTimer) return;
          throttleTimer = setTimeout(() => {
            throttleTimer = null;
            updateRasterForViewportRef.current?.();
          }, 40);
        };

        map.on('move', handleViewportChange);
        map.on('zoom', handleViewportChange);
        map.on('moveend', () => {
          if (isOrbiting) return;
          if (throttleTimer) clearTimeout(throttleTimer);
          throttleTimer = null;
          updateRasterForViewportRef.current?.();
        });
        map.on('zoomend', () => {
          if (isOrbiting) return;
          if (throttleTimer) clearTimeout(throttleTimer);
          throttleTimer = null;
          updateRasterForViewportRef.current?.();
        });

        // Cancel 360 tour on user gesture
        const cancelTour = () => {
          if (isOrbiting && orbitAnimId) {
            cancelAnimationFrame(orbitAnimId);
            orbitAnimId = null;
            isOrbiting = false;
          }
        };
        map.on('dragstart', cancelTour);
        map.on('rotatestart', cancelTour);
        map.on('touchstart', cancelTour);

        // Auto-play signature cinematic 360 tour on initial map load exactly like the website map
        if (!hasPlayedIntroTourRef.current) {
          hasPlayedIntroTourRef.current = true;
          setTimeout(() => {
            if (playCinematicTourFnRef.current) {
              playCinematicTourFnRef.current();
            }
          }, 600);
        }
      });
    } catch (err) {
      console.warn('Mapbox initialization fallback:', err);
    }
  }, []);

  // Update Raster Opacity
  useEffect(() => {
    if (!persistentMapbox || !isMapLoadedRef.current) return;
    try {
      if (persistentMapbox.getLayer('india-aqi-raster-layer')) {
        persistentMapbox.setPaintProperty(
          'india-aqi-raster-layer',
          'raster-opacity',
          showHeatmapLayer ? heatIntensity : 0
        );
      }
    } catch (e) {
      console.warn('Failed to update raster opacity:', e);
    }
  }, [showHeatmapLayer, heatIntensity]);

  // Update State Borders Visibility
  useEffect(() => {
    if (!persistentMapbox || !isMapLoadedRef.current) return;
    const visibility = showStateBorders ? 'visible' : 'none';
    ['admin-1-boundary', 'boundary_state'].forEach((id) => {
      try {
        if (persistentMapbox.getLayer(id)) {
          persistentMapbox.setLayoutProperty(id, 'visibility', visibility);
        }
      } catch (e) {}
    });
  }, [showStateBorders]);

  // Update 3D Buildings Visibility
  useEffect(() => {
    if (!persistentMapbox || !isMapLoadedRef.current) return;
    try {
      if (persistentMapbox.getLayer('3d-buildings')) {
        persistentMapbox.setLayoutProperty(
          '3d-buildings',
          'visibility',
          is3DBuildings ? 'visible' : 'none'
        );
      }
    } catch (e) {}
  }, [is3DBuildings]);

  // Update Raster when Pollutant type or stations change
  useEffect(() => {
    persistentRasterGridCache = computeRawSpatialGrid(stationsRef.current || indiaStations, activePollutant, INDIA_RASTER_BOUNDS);
    updateRasterForViewportRef.current?.();
  }, [stations, activePollutant]);

  // Update Raster when Adaptive Mode changes
  useEffect(() => {
    updateRasterForViewportRef.current?.();
  }, [isAdaptiveMode]);

  // Render or Remove 3D Station Pins depending on showStationPins state
  useEffect(() => {
    if (!persistentMapbox) return;

    persistentMarkersMap.forEach(({ marker }) => {
      marker.remove();
    });
    persistentMarkersMap.clear();

    if (!showStationPins) return;

    (stations || indiaStations).forEach((station) => {
      const el = document.createElement('div');
      el.className = 'mapbox-station-pin-wrap';
      el.style.cursor = 'pointer';

      const inner = document.createElement('div');
      inner.style.display = 'flex';
      inner.style.flexDirection = 'column';
      inner.style.alignItems = 'center';
      inner.style.transformOrigin = 'bottom center';
      inner.style.transition = 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)';
      inner.style.transform = 'scale(1)';

      inner.innerHTML = `
        <div style="filter: drop-shadow(0 4px 10px rgba(0,0,0,0.65));">
          <svg width="20" height="28" viewBox="0 0 28 38" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="shadow-${station.id}" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#000000" stop-opacity="0.75" />
                <stop offset="60%" stop-color="#000000" stop-opacity="0.3" />
                <stop offset="100%" stop-color="#000000" stop-opacity="0" />
              </radialGradient>
              <radialGradient id="pinHead3D-${station.id}" cx="32%" cy="26%" r="68%">
                <stop offset="0%" stop-color="#fda4af" />
                <stop offset="22%" stop-color="#f43f5e" />
                <stop offset="60%" stop-color="#e11d48" />
                <stop offset="85%" stop-color="#9f1239" />
                <stop offset="100%" stop-color="#4c0519" />
              </radialGradient>
              <linearGradient id="pinStem3D-${station.id}" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#fb7185" />
                <stop offset="28%" stop-color="#f43f5e" />
                <stop offset="65%" stop-color="#be123c" />
                <stop offset="100%" stop-color="#4c0519" />
              </linearGradient>
              <linearGradient id="glossGrad-${station.id}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85" />
                <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0" />
              </linearGradient>
              <radialGradient id="lensCore-${station.id}" cx="35%" cy="32%" r="65%">
                <stop offset="0%" stop-color="#ffffff" />
                <stop offset="40%" stop-color="#f1f5f9" />
                <stop offset="75%" stop-color="#cbd5e1" />
                <stop offset="100%" stop-color="#64748b" />
              </radialGradient>
              <linearGradient id="tipMetal-${station.id}" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#94a3b8" />
                <stop offset="45%" stop-color="#ffffff" />
                <stop offset="100%" stop-color="#475569" />
              </linearGradient>
            </defs>
            <ellipse cx="14" cy="35.5" rx="7.5" ry="2.2" fill="url(#shadow-${station.id})" />
            <path d="M 14 34.5 L 5.1 17.5 A 10 10 0 1 1 22.9 17.5 Z" fill="url(#pinHead3D-${station.id})" stroke="rgba(255, 255, 255, 0.4)" stroke-width="0.75" />
            <path d="M 14 34.5 L 7.5 19.5 C 10 22.5 18 22.5 20.5 19.5 Z" fill="url(#pinStem3D-${station.id})" opacity="0.65" />
            <ellipse cx="10.8" cy="8.8" rx="4.8" ry="2.4" transform="rotate(-30 10.8 8.8)" fill="url(#glossGrad-${station.id})" />
            <circle cx="14" cy="13" r="5.2" fill="#4c0519" opacity="0.65" />
            <circle cx="14" cy="12.8" r="4.6" fill="#881337" opacity="0.85" />
            <circle cx="14" cy="12.5" r="3.8" fill="url(#lensCore-${station.id})" />
            <circle cx="14" cy="12.5" r="2.0" fill="#e11d48" />
            <circle cx="13.3" cy="11.8" r="0.7" fill="#ffffff" opacity="0.9" />
            <polygon points="13.2,32 14.8,32 14,35" fill="url(#tipMetal-${station.id})" />
          </svg>
        </div>
      `;

      el.appendChild(inner);

      el.addEventListener('mouseenter', () => {
        inner.style.transform = 'scale(1.35)';
      });
      el.addEventListener('mouseleave', () => {
        inner.style.transform = 'scale(1)';
      });
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onSelectStation) onSelectStation(station);
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([station.lon, station.lat])
        .addTo(persistentMapbox);

      persistentMarkersMap.set(station.id, { marker, el });
    });
  }, [showStationPins, onSelectStation]);

  // Update Signature Pinpoint Target Marker and Locality Boundary
  useEffect(() => {
    if (!persistentMapbox) return;

    if (!selectedStation) {
      if (persistentTargetMarker) {
        persistentTargetMarker.remove();
        persistentTargetMarker = null;
      }
      return;
    }

    const activeVal = getPollutantValue(selectedStation, activePollutant);
    const meta = getPollutantMeta(activeVal, activePollutant);
    const pollutantUpper = activePollutant.toUpperCase();

    // 1. Update Selected Place Boundary Polygon
    try {
      const boundarySource = persistentMapbox.getSource('selected-place-boundary-source');
      if (boundarySource) {
        const circleFeature = createGeoJsonCircle([selectedStation.lon, selectedStation.lat], 8500);
        boundarySource.setData({
          type: 'FeatureCollection',
          features: [circleFeature],
        });
      }
    } catch (e) {}

    // 2. Re-create / Update Pinpoint Target Marker
    if (persistentTargetMarker) {
      persistentTargetMarker.remove();
      persistentTargetMarker = null;
    }

    const targetEl = document.createElement('div');
    targetEl.className = 'aqi-target-pinpoint-marker';
    targetEl.style.display = 'flex';
    targetEl.style.flexDirection = 'column';
    targetEl.style.alignItems = 'center';
    targetEl.style.pointerEvents = 'none';
    targetEl.style.setProperty('--aqi-color', meta.hex);
    targetEl.style.setProperty('--aqi-badge-bg', meta.badgeBg);
    targetEl.style.setProperty('--aqi-text-color', meta.textHex);

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
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: radial-gradient(circle, var(--aqi-color) 0%, transparent 70%);
          opacity: 0.35;
          animation: pointLightPulse 2.8s ease-in-out infinite;
          pointer-events: none;
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
          animation: pointParticleEmit1 2.4s cubic-bezier(0.2, 0.8, 0.4, 1) infinite;
          pointer-events: none;
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
        "></span>

        <span style="
          position: relative;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--aqi-color);
          box-shadow: 0 0 10px var(--aqi-color), 0 0 20px var(--aqi-color);
          border: 2px solid #ffffff;
          z-index: 2;
        "></span>
      </div>

      <div style="
        margin-top: 6px;
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 41, 59, 0.92) 100%);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1px solid var(--aqi-color);
        border-top: 1px solid rgba(255, 255, 255, 0.35);
        padding: 4px 10px;
        border-radius: 9px;
        font-size: 11px;
        font-weight: 700;
        color: #ffffff;
        white-space: nowrap;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.65), 0 0 16px var(--aqi-color);
        display: flex;
        align-items: center;
        gap: 6px;
        z-index: 5;
      ">
        <span style="width: 7px; height: 7px; border-radius: 50%; background: var(--aqi-color); box-shadow: 0 0 6px var(--aqi-color); flex-shrink: 0;"></span>
        <span style="letter-spacing: 0.02em;">${pollutantUpper} <strong style="color: var(--aqi-color); font-size: 12px;">${activeVal}</strong> <span style="font-size: 9px; opacity: 0.8;">${meta.unit}</span></span>
        <span style="background: var(--aqi-badge-bg); color: var(--aqi-text-color); padding: 1px 6px; border-radius: 9999px; font-size: 9px; font-weight: 800; border: 1px solid var(--aqi-color); text-transform: uppercase;">${meta.label}</span>
      </div>
    `;

    persistentTargetMarker = new mapboxgl.Marker({ element: targetEl, anchor: 'center' })
      .setLngLat([selectedStation.lon, selectedStation.lat])
      .addTo(persistentMapbox);

    if (selectedStation.lon && selectedStation.lat) {
      persistentMapbox.flyTo({
        center: [selectedStation.lon, selectedStation.lat],
        zoom: Math.max(persistentMapbox.getZoom(), 9.5),
        pitch: 30,
        essential: true,
        duration: 1200,
      });
    }
  }, [selectedStation, activePollutant]);

  // Handle Preset Changes (Camera Glide)
  useEffect(() => {
    if (!persistentMapbox || !activePreset) return;
    persistentMapbox.flyTo({
      center: activePreset.center,
      zoom: activePreset.zoom,
      pitch: activePreset.pitch || 25,
      essential: true,
      duration: 1600,
    });
  }, [activePreset]);

  // Handle Real User Live GPS Accuracy Circle & Beacon Marker
  useEffect(() => {
    if (!persistentMapbox || Platform.OS !== 'web') return;

    if (userLocation?.isLiveGps && userLocation.lat && userLocation.lon) {
      // 1. Update GPS Accuracy Polygon
      try {
        const accuracySource = persistentMapbox.getSource('user-gps-accuracy-source');
        if (accuracySource) {
          const accCircle = createGeoJsonCircle([userLocation.lon, userLocation.lat], userLocation.accuracy || 120);
          accuracySource.setData({
            type: 'FeatureCollection',
            features: [accCircle],
          });
        }
      } catch (e) {}

      // 2. Beacon Marker
      if (!persistentUserGpsMarker) {
        const gpsEl = document.createElement('div');
        gpsEl.className = 'user-gps-beacon-container';
        gpsEl.innerHTML = `
          <div class="user-gps-beacon-pulse"></div>
          <div class="user-gps-beacon-core"></div>
        `;

        persistentUserGpsMarker = new mapboxgl.Marker({ element: gpsEl })
          .setLngLat([userLocation.lon, userLocation.lat])
          .addTo(persistentMapbox);
      } else {
        persistentUserGpsMarker.setLngLat([userLocation.lon, userLocation.lat]);
      }

      // 3. Center viewport ONLY when user explicitly clicked the GPS locate button
      if (userLocation.shouldCenter) {
        persistentMapbox.flyTo({
          center: [userLocation.lon, userLocation.lat],
          zoom: 15.5,
          pitch: 42,
          speed: 1.35,
          essential: true,
        });
        userLocation.shouldCenter = false;
      }
    }
  }, [userLocation]);

  return (
    <View style={styles.container}>
      {/* 1. Underlying Mapbox Web Canvas */}
      {Platform.OS === 'web' ? (
        <div
          ref={mapContainerRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#040711',
            zIndex: 1,
            cursor: 'grab',
          }}
        />
      ) : (
        <View style={styles.nativeMapContainer}>
          <View style={styles.gridOverlay}>
            <View style={styles.gridLineHorizontal} />
            <View style={[styles.gridLineHorizontal, { top: '33%' }]} />
            <View style={[styles.gridLineHorizontal, { top: '66%' }]} />
            <View style={styles.gridLineVertical} />
            <View style={[styles.gridLineVertical, { left: '33%' }]} />
            <View style={[styles.gridLineVertical, { left: '66%' }]} />
          </View>
        </View>
      )}

      {/* 2. CRT TV-On Power Boot Animation */}
      {isTvTurningOn && Platform.OS === 'web' && (
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

      {/* 3. Smooth Feathered Atmospheric Perimeter Fade */}
      {Platform.OS === 'web' ? (
        <div className="atmospheric-fade-overlay" aria-hidden="true" />
      ) : (
        <View style={styles.nativeAtmosphericFade} pointerEvents="none" />
      )}

      {/* 4. Micro-Zone Coordinate HUD Indicator */}
      <View style={styles.hudBadge}>
        <View style={[styles.hudDot, userLocation?.isLiveGps && styles.hudDotGps]} />
        <Text style={styles.hudText}>
          {userLocation?.isLiveGps
            ? `LIVE GPS · ${userLocation.lat.toFixed(4)}°N, ${userLocation.lon.toFixed(4)}°E (±${userLocation.accuracy}m)`
            : "28°36'N · 77°12'E · MULTI-SOURCE CAAQMS"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#040711',
    overflow: 'hidden',
  },
  nativeMapContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050811',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#00f0ff',
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#00f0ff',
  },
  nativeAtmosphericFade: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 16,
    borderColor: 'rgba(5, 8, 17, 0.75)',
    zIndex: 5,
  },
  hudBadge: {
    position: 'absolute',
    top: 86,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(9, 15, 30, 0.85)',
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  hudDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#38bdf8',
    marginRight: 6,
  },
  hudDotGps: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowRadius: 6,
    shadowOpacity: 0.9,
  },
  hudText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
  },
});
