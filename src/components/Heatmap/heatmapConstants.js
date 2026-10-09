export const MAPBOX_DARK_STYLE = 'mapbox://styles/mapbox/navigation-night-v1';

/**
 * Geographic Bounding Box tightly enclosing the official Indian national boundary
 */
export const INDIA_RASTER_BOUNDS = {
  minLon: 68.10, // West coast of Gujarat / Rann of Kutch
  maxLon: 97.45, // Eastern border of Arunachal Pradesh
  minLat: 6.75,  // Indira Point / Great Nicobar & Kanyakumari
  maxLat: 37.10, // Northern frontier of Ladakh / Kashmir
};

/**
 * Convert Latitude in degrees to Web Mercator Y (radians).
 * Critical for 100% pixel-perfect alignment with Mapbox GL vector tiles.
 */
export function latToMercatorY(lat) {
  const rad = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + rad / 2));
}

/**
 * Convert Web Mercator Y (radians) back to Latitude in degrees.
 */
export function mercatorYToLat(y) {
  return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * (180 / Math.PI);
}

export const Y_MIN = latToMercatorY(INDIA_RASTER_BOUNDS.minLat);
export const Y_MAX = latToMercatorY(INDIA_RASTER_BOUNDS.maxLat);
export const Y_SPAN = Y_MAX - Y_MIN;
export const LON_SPAN = INDIA_RASTER_BOUNDS.maxLon - INDIA_RASTER_BOUNDS.minLon;

// 4-Corner Coordinates clockwise from Top-Left (NW) as required by Mapbox image source
export const INDIA_RASTER_COORDINATES = [
  [INDIA_RASTER_BOUNDS.minLon, INDIA_RASTER_BOUNDS.maxLat], // Top-Left (NW)
  [INDIA_RASTER_BOUNDS.maxLon, INDIA_RASTER_BOUNDS.maxLat], // Top-Right (NE)
  [INDIA_RASTER_BOUNDS.maxLon, INDIA_RASTER_BOUNDS.minLat], // Bottom-Right (SE)
  [INDIA_RASTER_BOUNDS.minLon, INDIA_RASTER_BOUNDS.minLat], // Bottom-Left (SW)
];

/**
 * Quick Gliding Regions across the Indian Subcontinent
 * Smoothly flies the camera without segmenting or reloading the nationwide heatmap.
 */
export const INDIA_REGION_PRESETS = [
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

/**
 * Seamless Scientific Continuous AQI Color Spectrum
 * Provides 100% continuous, seamless color transitions without any contour darkening or banded lines.
 * Normalized t: 0.0 (Lowest / Cleanest) -> 1.0 (Highest / Most Polluted)
 */
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
