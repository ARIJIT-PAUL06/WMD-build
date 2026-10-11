import indiaBoundaryGeoJson from '../../data/indiaBoundary.json' with { type: 'json' };
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
 * Samples continuous spatial AQI/pollutant value from active 2D raster grid at any (lon, lat)
 * using smooth bilinear interpolation across neighbor cells rather than coarse nearest-neighbor snapping.
 */
export function sampleRasterGridVal(gridObj, lon, lat) {
  if (!gridObj || !gridObj.rawGrid) return null;
  const { rawGrid, width, height } = gridObj;
  const u = (lon - INDIA_RASTER_BOUNDS.minLon) / LON_SPAN;
  const mercY = latToMercatorY(lat);
  const v = (Y_MAX - mercY) / Y_SPAN;

  const gx = u * (width - 1);
  const gy = v * (height - 1);

  if (gx < 0 || gx > width - 1 || gy < 0 || gy > height - 1) {
    const x = Math.max(0, Math.min(width - 1, Math.round(gx)));
    const y = Math.max(0, Math.min(height - 1, Math.round(gy)));
    const val = rawGrid[y * width + x];
    return Number.isFinite(val) ? val : null;
  }

  // Smooth bilinear interpolation across 4 surrounding grid cells
  const x0 = Math.floor(gx);
  const x1 = Math.min(width - 1, x0 + 1);
  const y0 = Math.floor(gy);
  const y1 = Math.min(height - 1, y0 + 1);

  const fx = gx - x0;
  const fy = gy - y0;

  const v00 = rawGrid[y0 * width + x0];
  const v10 = rawGrid[y0 * width + x1];
  const v01 = rawGrid[y1 * width + x0];
  const v11 = rawGrid[y1 * width + x1];

  const val = (1 - fx) * (1 - fy) * v00 +
              fx * (1 - fy) * v10 +
              (1 - fx) * fy * v01 +
              fx * fy * v11;

  return Number.isFinite(val) ? val : null;
}

/**
 * Calculates high-precision continuous spatial estimate of any pollutant (or AQI)
 * at any arbitrary geographic coordinate (lat, lon) across India.
 *
 * Uses continuous inverse-distance-weighting (IDW, power=2, epsilon=1.2 km)
 * and smoothly anchors to ground-truth CAAQMS sensors when within 1.5 km of a station.
 */
export function calculatePointPollutantEstimate(lat, lon, stationsList, pollutantType = 'aqi') {
  if (!stationsList || stationsList.length === 0 || lat == null || lon == null) {
    return pollutantType === 'co' ? 0.8 : (pollutantType === 'so2' ? 10 : (pollutantType === 'no2' ? 24 : 100));
  }

  let totalWeight = 0;
  let weightedVal = 0;
  let nearestDist = Infinity;
  let nearestVal = 0;

  for (let i = 0; i < stationsList.length; i++) {
    const st = stationsList[i];
    const d = calculateDistanceKm(lat, lon, st.lat, st.lon);
    const stVal = getPollutantValue(st, pollutantType);
    if (d < nearestDist) {
      nearestDist = d;
      nearestVal = stVal;
    }
    const w = 1 / Math.pow(Math.max(1.2, d), 2.0);
    totalWeight += w;
    weightedVal += stVal * w;
  }

  const interp = weightedVal / (totalWeight || 1);
  let result = interp;
  if (nearestDist <= 1.5) {
    const blend = nearestDist / 1.5;
    result = (1 - blend) * nearestVal + blend * interp;
  }

  if (pollutantType === 'co' || pollutantType === 'pm25' || pollutantType === 'pm10') {
    return Math.round(result * 10) / 10;
  }
  return Math.round(result);
}

/**
 * Generates a complete, multi-pollutant empirical snapshot at an exact (lat, lon) coordinate.
 * Synchronizes AQI, PM2.5, PM10, NO2, SO2, CO, and O3 to the identical spatial weighting model,
 * guaranteeing zero disparity between pinpoint inspections, GPS beacons, and searched places.
 */
export function calculatePointTelemetrySnapshot(lat, lon, stationsList) {
  if (!stationsList || stationsList.length === 0 || lat == null || lon == null) {
    return {
      aqi: 100,
      pm25: 60,
      pm10: 100,
      no2: 24,
      so2: 10,
      co: 0.8,
      o3: 32,
      nearestStation: 'Indian Ground Station',
      nearestState: 'India',
      distanceKm: 0,
      nearestStationObj: null,
    };
  }

  let nearest = stationsList[0];
  let minD = Infinity;

  const weights = new Float64Array(stationsList.length);
  let totalW = 0;

  for (let i = 0; i < stationsList.length; i++) {
    const st = stationsList[i];
    const d = calculateDistanceKm(lat, lon, st.lat, st.lon);
    if (d < minD) {
      minD = d;
      nearest = st;
    }
    const w = 1 / Math.pow(Math.max(1.2, d), 2.0);
    weights[i] = w;
    totalW += w;
  }

  const safeTotalW = totalW || 1;
  const isAnchored = minD <= 1.5;
  const blend = isAnchored ? minD / 1.5 : 1.0;

  const interpolatePollutant = (pollutant) => {
    let sum = 0;
    for (let i = 0; i < stationsList.length; i++) {
      sum += getPollutantValue(stationsList[i], pollutant) * weights[i];
    }
    const interp = sum / safeTotalW;
    if (isAnchored) {
      const nearestVal = getPollutantValue(nearest, pollutant);
      return (1 - blend) * nearestVal + blend * interp;
    }
    return interp;
  };

  return {
    aqi: Math.round(interpolatePollutant('aqi')),
    pm25: Math.round(interpolatePollutant('pm25') * 10) / 10,
    pm10: Math.round(interpolatePollutant('pm10') * 10) / 10,
    no2: Math.round(interpolatePollutant('no2') * 10) / 10,
    so2: Math.round(interpolatePollutant('so2') * 10) / 10,
    co: Math.round(interpolatePollutant('co') * 10) / 10,
    o3: Math.round(interpolatePollutant('o3') * 10) / 10,
    nearestStation: nearest ? (nearest.name || 'Indian Ground Station') : 'Indian Ground Station',
    nearestState: nearest?.state || nearest?.zone || 'India',
    distanceKm: Math.round(minD * 10) / 10,
    nearestStationObj: nearest,
  };
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
    isZoomed: zoomFactor > 0.05,
  };
}

/**
 * Scientific Absolute Color Anchor:
 * Maps any physical pollutant reading to its canonical position [0, 1] in SEAMLESS_AQI_STOPS.
 * Guarantees that:
 * - Clean / Good air is in Green [0.00, 0.15]
 * - Satisfactory air is in Emerald / Lime [0.15, 0.30]
 * - Moderate air (101-200 AQI, e.g. 156 AQI) is strictly in Warm Yellow / Amber [0.30, 0.62] (156 is ~0.48)
 * - Poor air (201-300 AQI) is in Vivid Orange / Burnt Ochre [0.62, 0.76]
 * - Very Poor air (301-400 AQI) is in Scarlet Red [0.76, 0.90]
 * - Severe air (401+ AQI) is in Deep Crimson [0.90, 1.00]
 */
export function getAbsolutePollutantT(val, pollutant = 'aqi') {
  const v = Math.max(0, Number(val) || 0);

  if (pollutant === 'pm25') {
    if (v <= 30) return (v / 30) * 0.15;
    if (v <= 60) return 0.15 + ((v - 30) / 30) * 0.15;
    if (v <= 90) return 0.30 + ((v - 60) / 30) * 0.16;
    if (v <= 120) return 0.46 + ((v - 90) / 30) * 0.16;
    if (v <= 250) return 0.62 + ((v - 120) / 130) * 0.28;
    return Math.min(1.0, 0.90 + ((v - 250) / 100) * 0.10);
  }

  if (pollutant === 'pm10') {
    if (v <= 50) return (v / 50) * 0.15;
    if (v <= 100) return 0.15 + ((v - 50) / 50) * 0.15;
    if (v <= 250) return 0.30 + ((v - 100) / 150) * 0.16;
    if (v <= 350) return 0.46 + ((v - 250) / 100) * 0.16;
    if (v <= 430) return 0.62 + ((v - 350) / 80) * 0.28;
    return Math.min(1.0, 0.90 + ((v - 430) / 100) * 0.10);
  }

  if (pollutant === 'no2') {
    if (v <= 40) return (v / 40) * 0.15;
    if (v <= 80) return 0.15 + ((v - 40) / 40) * 0.15;
    if (v <= 180) return 0.30 + ((v - 80) / 100) * 0.20;
    if (v <= 280) return 0.50 + ((v - 180) / 100) * 0.25;
    return Math.min(1.0, 0.75 + ((v - 280) / 100) * 0.25);
  }

  if (pollutant === 'so2') {
    if (v <= 40) return (v / 40) * 0.15;
    if (v <= 80) return 0.15 + ((v - 40) / 40) * 0.15;
    if (v <= 200) return 0.30 + ((v - 80) / 120) * 0.30;
    return Math.min(1.0, 0.60 + ((v - 200) / 100) * 0.40);
  }

  if (pollutant === 'co') {
    if (v <= 1.0) return (v / 1.0) * 0.15;
    if (v <= 2.0) return 0.15 + ((v - 1.0) / 1.0) * 0.15;
    if (v <= 10.0) return 0.30 + ((v - 2.0) / 8.0) * 0.35;
    return Math.min(1.0, 0.65 + ((v - 10.0) / 10.0) * 0.35);
  }

  if (pollutant === 'o3') {
    if (v <= 50) return (v / 50) * 0.15;
    if (v <= 100) return 0.15 + ((v - 50) / 50) * 0.15;
    if (v <= 168) return 0.30 + ((v - 100) / 68) * 0.30;
    return Math.min(1.0, 0.60 + ((v - 168) / 100) * 0.40);
  }

  // Standard CPCB / EPA AQI Breakpoints
  if (v <= 50) {
    return (v / 50) * 0.15; // 0..50 -> 0.00..0.15 (Pristine Green to Emerald Mint)
  }
  if (v <= 100) {
    return 0.15 + ((v - 50) / 50) * 0.15; // 50..100 -> 0.15..0.30 (Emerald Mint to Vivid Lime)
  }
  if (v <= 200) {
    // 100..200 -> 0.30..0.62 (Lime -> Warm Yellow at 150 -> Vivid Orange at 200)
    // 156 maps to: 0.30 + (56/100) * 0.32 = 0.4792 (Warm Golden Yellow, NEVER GREEN!)
    return 0.30 + ((v - 100) / 100) * 0.32;
  }
  if (v <= 300) {
    return 0.62 + ((v - 200) / 100) * 0.14; // 200..300 -> 0.62..0.76 (Orange to Burnt Ochre)
  }
  if (v <= 400) {
    return 0.76 + ((v - 300) / 100) * 0.14; // 300..400 -> 0.76..0.90 (Burnt Ochre to Scarlet Red)
  }
  return Math.min(1.0, 0.90 + ((v - 400) / 100) * 0.10); // 400..500+ -> 0.90..1.00 (Deep Crimson)
}

/**
 * Calibrates normalized color stop [0, 1] considering zoom and active viewport range.
 * Dynamically enhances local micro-contrast while strictly anchoring health safety floors:
 * - When zoomed in on Moderate pollution (AQI 101-200, such as 156 AQI), the color floor is
 *   locked to Warm Yellow (>= 0.38) and CAN NEVER drop into Green (< 0.25).
 * - When zoomed in on Clean air (AQI 0-50), the color ceiling can never turn falsely red.
 */
export function getCalibratedPollutantT(val, pollutant = 'aqi', activeRange = null) {
  const num = Number(val) || 0;
  const tBase = getAbsolutePollutantT(num, pollutant);

  if (!activeRange || !activeRange.isZoomed || activeRange.max <= activeRange.min) {
    return tBase;
  }

  const { min, max, zoomFactor = 1 } = activeRange;
  const tMin = getAbsolutePollutantT(min, pollutant);
  const tMax = getAbsolutePollutantT(max, pollutant);

  // If local range is effectively uniform, maintain absolute color
  if (tMax - tMin < 0.01) {
    return tBase;
  }

  // Position of value within local min/max [0, 1]
  const u = Math.max(0, Math.min(1, (num - min) / (max - min)));

  // Center and span of the local color band
  const centerT = (tMin + tMax) / 2;
  const spanT = tMax - tMin;

  // Controlled contrast stretch across the local neighborhood
  const boost = 1.30;
  let tLocal = centerT + (u - 0.5) * spanT * boost;

  // STRICT HEALTH & SAFETY BOUNDS (Zero false-greens on polluted air):
  if (pollutant === 'aqi') {
    if (num > 100) {
      // Moderate (101-200) floor is Warm Yellow (0.38)
      // Poor (201-300) floor is Vivid Orange (0.58)
      // Very Poor (301+) floor is Scarlet Red (0.75)
      const floorT = num >= 300 ? 0.75 : num >= 200 ? 0.58 : 0.38;
      tLocal = Math.max(floorT, tLocal);
    } else if (num <= 50) {
      // Good (0-50) air can NEVER exceed Lime/Yellow (<= 0.28)
      tLocal = Math.min(0.28, tLocal);
    }
  } else if (pollutant === 'pm25') {
    if (num > 60) {
      const floorT = num >= 120 ? 0.60 : num >= 90 ? 0.44 : 0.36;
      tLocal = Math.max(floorT, tLocal);
    } else if (num <= 30) {
      tLocal = Math.min(0.28, tLocal);
    }
  } else if (pollutant === 'pm10') {
    if (num > 100) {
      const floorT = num >= 350 ? 0.60 : num >= 250 ? 0.44 : 0.36;
      tLocal = Math.max(floorT, tLocal);
    } else if (num <= 50) {
      tLocal = Math.min(0.28, tLocal);
    }
  }

  // Clamped to valid unit range [0, 1]
  tLocal = Math.max(0, Math.min(1, tLocal));

  // Seamlessly blend between national scale and adaptive local scale
  const zf = Math.max(0, Math.min(1, zoomFactor));
  return (1 - zf) * tBase + zf * tLocal;
}

/**
 * Renders the seamless continuous raster image with calibrated dynamic normalization and polygon clipping.
 */
export function renderSeamlessRasterImage(gridObj, effectiveMin, effectiveMax, pollutant = 'aqi', activeRange = null) {
  if (typeof document === 'undefined' || !gridObj) return '';
  const { rawGrid, mask, width, height } = gridObj;

  const rawCanvas = document.createElement('canvas');
  rawCanvas.width = width;
  rawCanvas.height = height;
  const rawCtx = rawCanvas.getContext('2d');
  if (!rawCtx) return '';

  const imgData = rawCtx.createImageData(width, height);
  const data = imgData.data;

  const rangeContext = activeRange || {
    min: effectiveMin,
    max: effectiveMax,
    isZoomed: (effectiveMax - effectiveMin) < 220,
    zoomFactor: 1,
  };

  for (let i = 0; i < width * height; i++) {
    if (mask[i] === 0) {
      data[i * 4 + 3] = 0; // Transparent outside India
      continue;
    }

    const val = rawGrid[i];
    const t = getCalibratedPollutantT(val, pollutant, rangeContext);
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
  
  // Continuous scientific seamless color evaluation with zero-false-greens
  const t = getCalibratedPollutantT(num, pollutant, activeRange);
  const [r, g, b] = interpolateSeamlessRgb(t);
  const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

  if (pollutant === 'pm25') {
    if (num <= 30) return { hex, label: 'Good / Clean', badgeBg: 'rgba(16, 185, 129, 0.2)', textHex: '#34d399', unit: 'µg/m³', maxScale: 250 };
    if (num <= 60) return { hex, label: 'Satisfactory', badgeBg: 'rgba(132, 204, 22, 0.2)', textHex: '#a3e635', unit: 'µg/m³', maxScale: 250 };
    if (num <= 90) return { hex, label: 'Moderate', badgeBg: 'rgba(234, 179, 8, 0.2)', textHex: '#facc15', unit: 'µg/m³', maxScale: 250 };
    if (num <= 120) return { hex, label: 'Poor', badgeBg: 'rgba(249, 115, 22, 0.2)', textHex: '#fb923c', unit: 'µg/m³', maxScale: 250 };
    if (num <= 250) return { hex, label: 'Very Poor', badgeBg: 'rgba(220, 38, 38, 0.2)', textHex: '#f87171', unit: 'µg/m³', maxScale: 250 };
    return { hex, label: 'Severe / Hazardous', badgeBg: 'rgba(153, 27, 27, 0.25)', textHex: '#fca5a5', unit: 'µg/m³', maxScale: 250 };
  }

  if (pollutant === 'pm10') {
    if (num <= 50) return { hex, label: 'Good / Clean', badgeBg: 'rgba(16, 185, 129, 0.2)', textHex: '#34d399', unit: 'µg/m³', maxScale: 430 };
    if (num <= 100) return { hex, label: 'Satisfactory', badgeBg: 'rgba(132, 204, 22, 0.2)', textHex: '#a3e635', unit: 'µg/m³', maxScale: 430 };
    if (num <= 250) return { hex, label: 'Moderate', badgeBg: 'rgba(234, 179, 8, 0.2)', textHex: '#facc15', unit: 'µg/m³', maxScale: 430 };
    if (num <= 350) return { hex, label: 'Poor', badgeBg: 'rgba(249, 115, 22, 0.2)', textHex: '#fb923c', unit: 'µg/m³', maxScale: 430 };
    if (num <= 430) return { hex, label: 'Very Poor', badgeBg: 'rgba(220, 38, 38, 0.2)', textHex: '#f87171', unit: 'µg/m³', maxScale: 430 };
    return { hex, label: 'Severe / Hazardous', badgeBg: 'rgba(153, 27, 27, 0.25)', textHex: '#fca5a5', unit: 'µg/m³', maxScale: 430 };
  }

  if (pollutant === 'no2') {
    if (num <= 40) return { hex, label: 'Good / Clean', badgeBg: 'rgba(16, 185, 129, 0.2)', textHex: '#34d399', unit: 'µg/m³', maxScale: 280 };
    if (num <= 80) return { hex, label: 'Satisfactory', badgeBg: 'rgba(132, 204, 22, 0.2)', textHex: '#a3e635', unit: 'µg/m³', maxScale: 280 };
    if (num <= 180) return { hex, label: 'Moderate', badgeBg: 'rgba(234, 179, 8, 0.2)', textHex: '#facc15', unit: 'µg/m³', maxScale: 280 };
    if (num <= 280) return { hex, label: 'Poor', badgeBg: 'rgba(249, 115, 22, 0.2)', textHex: '#fb923c', unit: 'µg/m³', maxScale: 280 };
    return { hex, label: 'Very Poor', badgeBg: 'rgba(220, 38, 38, 0.2)', textHex: '#f87171', unit: 'µg/m³', maxScale: 280 };
  }

  if (pollutant === 'so2') {
    if (num <= 40) return { hex, label: 'Good / Clean', badgeBg: 'rgba(16, 185, 129, 0.2)', textHex: '#34d399', unit: 'µg/m³', maxScale: 200 };
    if (num <= 80) return { hex, label: 'Satisfactory', badgeBg: 'rgba(132, 204, 22, 0.2)', textHex: '#a3e635', unit: 'µg/m³', maxScale: 200 };
    if (num <= 200) return { hex, label: 'Moderate', badgeBg: 'rgba(234, 179, 8, 0.2)', textHex: '#facc15', unit: 'µg/m³', maxScale: 200 };
    return { hex, label: 'Poor', badgeBg: 'rgba(220, 38, 38, 0.2)', textHex: '#f87171', unit: 'µg/m³', maxScale: 200 };
  }

  if (pollutant === 'co') {
    if (num <= 1.0) return { hex, label: 'Good / Clean', badgeBg: 'rgba(16, 185, 129, 0.2)', textHex: '#34d399', unit: 'mg/m³', maxScale: 10 };
    if (num <= 2.0) return { hex, label: 'Satisfactory', badgeBg: 'rgba(132, 204, 22, 0.2)', textHex: '#a3e635', unit: 'mg/m³', maxScale: 10 };
    if (num <= 10.0) return { hex, label: 'Moderate', badgeBg: 'rgba(234, 179, 8, 0.2)', textHex: '#facc15', unit: 'mg/m³', maxScale: 10 };
    return { hex, label: 'Poor', badgeBg: 'rgba(220, 38, 38, 0.2)', textHex: '#f87171', unit: 'mg/m³', maxScale: 10 };
  }

  if (pollutant === 'o3') {
    if (num <= 50) return { hex, label: 'Good / Clean', badgeBg: 'rgba(16, 185, 129, 0.2)', textHex: '#34d399', unit: 'µg/m³', maxScale: 200 };
    if (num <= 100) return { hex, label: 'Satisfactory', badgeBg: 'rgba(132, 204, 22, 0.2)', textHex: '#a3e635', unit: 'µg/m³', maxScale: 200 };
    if (num <= 168) return { hex, label: 'Moderate', badgeBg: 'rgba(234, 179, 8, 0.2)', textHex: '#facc15', unit: 'µg/m³', maxScale: 200 };
    return { hex, label: 'Poor', badgeBg: 'rgba(220, 38, 38, 0.2)', textHex: '#f87171', unit: 'µg/m³', maxScale: 200 };
  }

  // Standard AQI (CPCB / EPA breakpoints)
  let label = 'Good';
  let badgeBg = 'rgba(16, 185, 129, 0.2)';
  let textHex = '#34d399';

  if (num <= 50) {
    label = 'Good / Pristine';
    badgeBg = 'rgba(16, 185, 129, 0.2)';
    textHex = '#34d399';
  } else if (num <= 100) {
    label = 'Satisfactory';
    badgeBg = 'rgba(132, 204, 22, 0.2)';
    textHex = '#a3e635';
  } else if (num <= 200) {
    label = 'Moderate';
    badgeBg = 'rgba(234, 179, 8, 0.2)';
    textHex = '#facc15';
  } else if (num <= 300) {
    label = 'Poor';
    badgeBg = 'rgba(249, 115, 22, 0.2)';
    textHex = '#fb923c';
  } else if (num <= 400) {
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
