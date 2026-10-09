import indiaBoundaryGeoJson from '../../data/indiaBoundary.json';
import {
  INDIA_RASTER_BOUNDS,
  latToMercatorY,
  mercatorYToLat,
  Y_MIN,
  Y_MAX,
  Y_SPAN,
  LON_SPAN,
  SEAMLESS_AQI_STOPS
} from './heatmapConstants.js';

export { latToMercatorY, mercatorYToLat };

/**
 * Distance helper (Haversine in km)
 */
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

/**
 * Generate a GeoJSON Polygon circle for real GPS accuracy radius display
 */
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

/**
 * Uncapped AQI Calculation based on US EPA breakpoints with extrapolation beyond 500
 */
export function calculateUncappedAqi(pm25) {
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
 * Piecewise continuous interpolation across seamless stops with zero contour darkening.
 */
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

/**
 * Trace the MultiPolygon path of the official Indian national boundary
 * onto an HTML5 2D canvas context using Web Mercator Projection for 100% exact alignment.
 */
export function drawIndiaBoundaryPath(ctx, width, height) {
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

/**
 * Cached binary mask for India national boundary at grid resolution (1 = inside India, 0 = outside)
 */
let cachedIndiaMask = null;
export function getIndiaBoundaryMask(width, height) {
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
 */
export function computeRawSpatialGrid(stationsList, pollutantType = 'aqi', bounds = INDIA_RASTER_BOUNDS, width = 260, height = 260) {
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

      const interpolatedVal = weightedVal / (totalWeight || 1);
      rawGrid[idx] = interpolatedVal;

      if (mask[idx] === 1) {
        if (interpolatedVal < nationalMin) nationalMin = interpolatedVal;
        if (interpolatedVal > nationalMax) nationalMax = interpolatedVal;
      }
    }
  }

  if (!Number.isFinite(nationalMin)) nationalMin = pollutantType === 'co' ? 0.4 : (pollutantType === 'so2' ? 5 : 40);
  if (!Number.isFinite(nationalMax)) nationalMax = pollutantType === 'co' ? 1.8 : (pollutantType === 'so2' ? 20 : 260);

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
 * Samples continuous spatial AQI/pollutant value from active 2D raster grid at any (lon, lat).
 */
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

/**
 * Calculates adaptive zoom-dependent min/max contrast range
 */
export function calculateAdaptiveRange(gridObj, mapBounds, zoom, isAdaptiveMode = true, pollutant = 'aqi') {
  const isCo = pollutant === 'co';
  const roundVal = (v) => isCo ? Math.round(v * 10) / 10 : Math.round(v);

  if (!gridObj) {
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
      localMin: roundVal(nationalMin),
      localMax: roundVal(nationalMax),
      nationalMin: roundVal(nationalMin),
      nationalMax: roundVal(nationalMax),
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

/**
 * Renders the seamless continuous raster image with dynamic normalization and polygon clipping.
 */
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
      data[i * 4 + 3] = 0; // Transparent outside India
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

  const clippedCanvas = document.createElement('canvas');
  clippedCanvas.width = width;
  clippedCanvas.height = height;
  const clippedCtx = clippedCanvas.getContext('2d');
  if (!clippedCtx) return rawCanvas.toDataURL('image/png');

  clippedCtx.save();
  drawIndiaBoundaryPath(clippedCtx, width, height);
  clippedCtx.clip();

  clippedCtx.drawImage(rawCanvas, 0, 0);
  clippedCtx.restore();

  return clippedCanvas.toDataURL('image/png');
}

/**
 * AQI Color & Badge helper synchronized directly with the seamless gradient and active range
 */
export function getPollutantValue(station, pollutant = 'aqi') {
  if (!station) return 0;
  switch (pollutant) {
    case 'pm25': return station.pm25 ?? Math.round((station.aqi || 100) * 0.6);
    case 'pm10': return station.pm10 ?? Math.round((station.aqi || 100) * 1.15);
    case 'no2':  return station.no2 ?? 24;
    case 'so2':  return station.so2 ?? 10;
    case 'co':   return station.co ?? 0.8;
    case 'o3':   return station.o3 ?? 32;
    default:     return station.aqi ?? 100;
  }
}

export function getPollutantMeta(val, pollutant = 'aqi', activeRange = null) {
  const num = Number(val) || 0;
  
  if (pollutant === 'pm25') {
    if (num <= 30) return { hex: '#10b981', label: 'Good / Clean', badgeBg: 'rgba(16, 185, 129, 0.2)', textHex: '#34d399', unit: 'µg/m³', maxScale: 250 };
    if (num <= 60) return { hex: '#84cc16', label: 'Satisfactory', badgeBg: 'rgba(132, 204, 22, 0.2)', textHex: '#a3e635', unit: 'µg/m³', maxScale: 250 };
    if (num <= 90) return { hex: '#eab308', label: 'Moderate', badgeBg: 'rgba(234, 179, 8, 0.2)', textHex: '#facc15', unit: 'µg/m³', maxScale: 250 };
    if (num <= 120) return { hex: '#f97316', label: 'Poor', badgeBg: 'rgba(249, 115, 22, 0.2)', textHex: '#fb923c', unit: 'µg/m³', maxScale: 250 };
    if (num <= 250) return { hex: '#ef4444', label: 'Very Poor', badgeBg: 'rgba(220, 38, 38, 0.2)', textHex: '#f87171', unit: 'µg/m³', maxScale: 250 };
    return { hex: '#991b1b', label: 'Severe / Hazardous', badgeBg: 'rgba(153, 27, 27, 0.25)', textHex: '#fca5a5', unit: 'µg/m³', maxScale: 250 };
  }

  if (pollutant === 'pm10') {
    if (num <= 50) return { hex: '#10b981', label: 'Good / Clean', badgeBg: 'rgba(16, 185, 129, 0.2)', textHex: '#34d399', unit: 'µg/m³', maxScale: 430 };
    if (num <= 100) return { hex: '#84cc16', label: 'Satisfactory', badgeBg: 'rgba(132, 204, 22, 0.2)', textHex: '#a3e635', unit: 'µg/m³', maxScale: 430 };
    if (num <= 250) return { hex: '#eab308', label: 'Moderate', badgeBg: 'rgba(234, 179, 8, 0.2)', textHex: '#facc15', unit: 'µg/m³', maxScale: 430 };
    if (num <= 350) return { hex: '#f97316', label: 'Poor', badgeBg: 'rgba(249, 115, 22, 0.2)', textHex: '#fb923c', unit: 'µg/m³', maxScale: 430 };
    if (num <= 430) return { hex: '#ef4444', label: 'Very Poor', badgeBg: 'rgba(220, 38, 38, 0.2)', textHex: '#f87171', unit: 'µg/m³', maxScale: 430 };
    return { hex: '#991b1b', label: 'Severe / Hazardous', badgeBg: 'rgba(153, 27, 27, 0.25)', textHex: '#fca5a5', unit: 'µg/m³', maxScale: 430 };
  }

  if (pollutant === 'no2') {
    if (num <= 40) return { hex: '#10b981', label: 'Good / Clean', badgeBg: 'rgba(16, 185, 129, 0.2)', textHex: '#34d399', unit: 'µg/m³', maxScale: 280 };
    if (num <= 80) return { hex: '#84cc16', label: 'Satisfactory', badgeBg: 'rgba(132, 204, 22, 0.2)', textHex: '#a3e635', unit: 'µg/m³', maxScale: 280 };
    if (num <= 180) return { hex: '#eab308', label: 'Moderate', badgeBg: 'rgba(234, 179, 8, 0.2)', textHex: '#facc15', unit: 'µg/m³', maxScale: 280 };
    if (num <= 280) return { hex: '#f97316', label: 'Poor', badgeBg: 'rgba(249, 115, 22, 0.2)', textHex: '#fb923c', unit: 'µg/m³', maxScale: 280 };
    return { hex: '#ef4444', label: 'Very Poor', badgeBg: 'rgba(220, 38, 38, 0.2)', textHex: '#f87171', unit: 'µg/m³', maxScale: 280 };
  }

  if (pollutant === 'so2') {
    if (num <= 40) return { hex: '#10b981', label: 'Good / Clean', badgeBg: 'rgba(16, 185, 129, 0.2)', textHex: '#34d399', unit: 'µg/m³', maxScale: 200 };
    if (num <= 80) return { hex: '#84cc16', label: 'Satisfactory', badgeBg: 'rgba(132, 204, 22, 0.2)', textHex: '#a3e635', unit: 'µg/m³', maxScale: 200 };
    if (num <= 200) return { hex: '#eab308', label: 'Moderate', badgeBg: 'rgba(234, 179, 8, 0.2)', textHex: '#facc15', unit: 'µg/m³', maxScale: 200 };
    return { hex: '#ef4444', label: 'Poor', badgeBg: 'rgba(220, 38, 38, 0.2)', textHex: '#f87171', unit: 'µg/m³', maxScale: 200 };
  }

  if (pollutant === 'co') {
    if (num <= 1.0) return { hex: '#10b981', label: 'Good / Clean', badgeBg: 'rgba(16, 185, 129, 0.2)', textHex: '#34d399', unit: 'mg/m³', maxScale: 10 };
    if (num <= 2.0) return { hex: '#84cc16', label: 'Satisfactory', badgeBg: 'rgba(132, 204, 22, 0.2)', textHex: '#a3e635', unit: 'mg/m³', maxScale: 10 };
    if (num <= 10.0) return { hex: '#eab308', label: 'Moderate', badgeBg: 'rgba(234, 179, 8, 0.2)', textHex: '#facc15', unit: 'mg/m³', maxScale: 10 };
    return { hex: '#ef4444', label: 'Poor', badgeBg: 'rgba(220, 38, 38, 0.2)', textHex: '#f87171', unit: 'mg/m³', maxScale: 10 };
  }

  if (pollutant === 'o3') {
    if (num <= 50) return { hex: '#10b981', label: 'Good / Clean', badgeBg: 'rgba(16, 185, 129, 0.2)', textHex: '#34d399', unit: 'µg/m³', maxScale: 200 };
    if (num <= 100) return { hex: '#84cc16', label: 'Satisfactory', badgeBg: 'rgba(132, 204, 22, 0.2)', textHex: '#a3e635', unit: 'µg/m³', maxScale: 200 };
    if (num <= 168) return { hex: '#eab308', label: 'Moderate', badgeBg: 'rgba(234, 179, 8, 0.2)', textHex: '#facc15', unit: 'µg/m³', maxScale: 200 };
    return { hex: '#ef4444', label: 'Poor', badgeBg: 'rgba(220, 38, 38, 0.2)', textHex: '#f87171', unit: 'µg/m³', maxScale: 200 };
  }

  // Fallback / AQI mode
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

  return { hex, label, textHex, badgeBg, unit: 'AQI', maxScale: 500 };
}

export function getAqiColor(val, activeRange, pollutant = 'aqi') {
  return getPollutantMeta(val, pollutant, activeRange);
}
