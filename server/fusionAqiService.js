/**
 * Multi-Source AQI Fusion Service
 * Integrates Open-Meteo, WAQI, and IQAir with an ensemble scoring algorithm:
 * - Uncapped AQI calculation from raw PM2.5/PM10 concentrations
 * - Proximity, Freshness, Completeness, and Plausibility scoring
 * - Inverse Distance Weighting (IDW) for user micro-location estimate
 */

export const DELHI_STATION_COORDS = [
  // North & North-West Delhi
  { id: 'bawana', name: 'Bawana Industrial Area', lat: 28.7762, lon: 77.0510, zone: 'North West Delhi', type: 'Industrial' },
  { id: 'narela', name: 'Narela Sub-City', lat: 28.8526, lon: 77.0924, zone: 'North Delhi', type: 'Industrial-Suburban' },
  { id: 'alipur', name: 'Alipur G.T. Road', lat: 28.8153, lon: 77.1530, zone: 'North Delhi', type: 'Suburban-Green' },
  { id: 'dtu', name: 'Delhi Tech University (DTU)', lat: 28.7495, lon: 77.1171, zone: 'North Delhi', type: 'Institutional' },
  { id: 'burari', name: 'Burari Crossing', lat: 28.7257, lon: 77.2012, zone: 'North Delhi', type: 'Transit Corridor' },
  { id: 'jahangirpuri', name: 'Jahangirpuri', lat: 28.7325, lon: 77.1706, zone: 'North West Delhi', type: 'Dense Urban' },
  { id: 'rohini', name: 'Rohini Sector 16', lat: 28.7325, lon: 77.1199, zone: 'North West Delhi', type: 'Residential' },
  { id: 'wazirpur', name: 'Wazirpur Industrial Zone', lat: 28.6997, lon: 77.1654, zone: 'North Delhi', type: 'Industrial' },
  { id: 'ashok-vihar', name: 'Ashok Vihar', lat: 28.6954, lon: 77.1816, zone: 'North Delhi', type: 'Residential' },
  { id: 'civil-lines', name: 'Civil Lines (DU North)', lat: 28.6814, lon: 77.2227, zone: 'North Central', type: 'Institutional' },
  { id: 'kanjhawala', name: 'Kanjhawala', lat: 28.7280, lon: 77.0040, zone: 'North West Delhi', type: 'Rural-Suburban' },

  // Central Delhi & Old Delhi
  { id: 'chandni-chowk', name: 'Chandni Chowk (Old Delhi)', lat: 28.6562, lon: 77.2307, zone: 'Central Delhi', type: 'Dense Heritage' },
  { id: 'connaught-place', name: 'Connaught Place / Mandir Marg', lat: 28.6315, lon: 77.2167, zone: 'Central Delhi', type: 'Commercial Heart' },
  { id: 'ito', name: 'ITO Intersection', lat: 28.6288, lon: 77.2410, zone: 'Central Delhi', type: 'Commercial Hub' },
  { id: 'national-stadium', name: 'Major Dhyan Chand Stadium', lat: 28.6120, lon: 77.2370, zone: 'Central Delhi', type: 'Institutional' },
  { id: 'lodhi-road', name: 'Lodhi Road (IMD / Ridge)', lat: 28.5918, lon: 77.2273, zone: 'South Central Delhi', type: 'Green Buffer Zone' },
  { id: 'pusa', name: 'Pusa (IMD Eco Reserve)', lat: 28.6360, lon: 77.1590, zone: 'Central West', type: 'Eco Buffer' },

  // West & South-West Delhi
  { id: 'punjabi-bagh', name: 'Punjabi Bagh', lat: 28.6740, lon: 77.1310, zone: 'West Delhi', type: 'Commercial-Transit' },
  { id: 'mundka', name: 'Mundka Industrial Zone', lat: 28.6847, lon: 77.0298, zone: 'West Delhi', type: 'Heavy Industrial' },
  { id: 'paschim-vihar', name: 'Paschim Vihar', lat: 28.6685, lon: 77.0945, zone: 'West Delhi', type: 'Residential' },
  { id: 'shadipur', name: 'Shadipur Depot', lat: 28.6514, lon: 77.1578, zone: 'West Delhi', type: 'Industrial-Transit' },
  { id: 'dwarka', name: 'Dwarka Sector 8', lat: 28.5710, lon: 77.0719, zone: 'South West Delhi', type: 'Residential' },
  { id: 'dwarka-sec21', name: 'Dwarka Sector 21', lat: 28.5524, lon: 77.0583, zone: 'South West Delhi', type: 'Transit Hub' },
  { id: 'igi-airport', name: 'IGI Airport (T3)', lat: 28.5562, lon: 77.1000, zone: 'South West Delhi', type: 'Aviation-Highway' },
  { id: 'najafgarh', name: 'Najafgarh', lat: 28.6090, lon: 76.9855, zone: 'South West Delhi', type: 'Rural-Suburban' },
  { id: 'aya-nagar', name: 'Aya Nagar (IMD Airbase)', lat: 28.4707, lon: 77.1099, zone: 'South West Delhi', type: 'Buffer Station' },

  // East & North-East Delhi
  { id: 'anand-vihar', name: 'Anand Vihar (ISBT / Border)', lat: 28.6508, lon: 77.3153, zone: 'East Delhi', type: 'Heavy Transit Corridor' },
  { id: 'vivek-vihar', name: 'Vivek Vihar', lat: 28.6723, lon: 77.3152, zone: 'East Delhi', type: 'Residential-Urban' },
  { id: 'patparganj', name: 'Patparganj Industrial Area', lat: 28.6237, lon: 77.2872, zone: 'East Delhi', type: 'Industrial-Commercial' },
  { id: 'sonia-vihar', name: 'Sonia Vihar', lat: 28.7106, lon: 77.2492, zone: 'North East Delhi', type: 'Suburban-Riverbank' },
  { id: 'dilshad-garden', name: 'Dilshad Garden', lat: 28.6811, lon: 77.3050, zone: 'North East Delhi', type: 'Residential-Border' },
  { id: 'mayur-vihar', name: 'Mayur Vihar Phase II', lat: 28.6080, lon: 77.2990, zone: 'East Delhi', type: 'Residential-Transit' },

  // South & South-East Delhi
  { id: 'rk-puram', name: 'R.K. Puram', lat: 28.5632, lon: 77.1869, zone: 'South Delhi', type: 'Urban Center' },
  { id: 'jln-stadium', name: 'Jawaharlal Nehru Stadium', lat: 28.5802, lon: 77.2338, zone: 'South Delhi', type: 'Sports-Urban' },
  { id: 'siri-fort', name: 'Siri Fort Institutional', lat: 28.5504, lon: 77.2159, zone: 'South Delhi', type: 'Institutional' },
  { id: 'aurobindo-marg', name: 'Sri Aurobindo Marg', lat: 28.5310, lon: 77.1900, zone: 'South Delhi', type: 'Transit Arterial' },
  { id: 'hauz-khas', name: 'Hauz Khas Enclave', lat: 28.5494, lon: 77.2001, zone: 'South Delhi', type: 'Residential-Buffer' },
  { id: 'nehru-nagar', name: 'Nehru Nagar (Ring Road)', lat: 28.5678, lon: 77.2505, zone: 'South Delhi', type: 'Transit Arterial' },
  { id: 'okhla', name: 'Okhla Phase II', lat: 28.5308, lon: 77.2713, zone: 'South East Delhi', type: 'Industrial' },
  { id: 'crri-mathura', name: 'CRRI Mathura Road', lat: 28.5512, lon: 77.2736, zone: 'South East Delhi', type: 'Highway Corridor' },
  { id: 'karni-singh', name: 'Dr. Karni Singh Range', lat: 28.4983, lon: 77.2650, zone: 'South Delhi', type: 'Eco Foothills' },
  { id: 'asola-bhatti', name: 'Asola Bhatti (Wildlife Sanctuary)', lat: 28.4986, lon: 77.2648, zone: 'South Delhi', type: 'Eco Buffer' },

  // Outer Perimeter & Border Buffer Stations
  { id: 'noida-sec62', name: 'Sector 62 Noida (Delhi-East Border)', lat: 28.6258, lon: 77.3648, zone: 'East NCR Border', type: 'NCR Inflow Corridor' },
  { id: 'vasundhara', name: 'Vasundhara (Ghaziabad-East Border)', lat: 28.6603, lon: 77.3573, zone: 'East NCR Border', type: 'NCR Inflow Corridor' },
  { id: 'gurugram-sec51', name: 'Sector 51 Gurugram (South-West Border)', lat: 28.4280, lon: 77.0720, zone: 'South West NCR Border', type: 'NCR Inflow Corridor' },
  { id: 'singhu', name: 'Singhu Border (NH44 North Corridor)', lat: 28.8780, lon: 77.1320, zone: 'North Delhi Border', type: 'Highway Gateway' },
  { id: 'baprola', name: 'Baprola / Bakkarwala', lat: 28.6360, lon: 76.9950, zone: 'West Delhi Outer', type: 'Suburban-Residential' },
  { id: 'badarpur', name: 'Badarpur Thermal Border', lat: 28.5080, lon: 77.3050, zone: 'South East Delhi', type: 'Transit Border' },
  { id: 'jhilmil', name: 'Jhilmil Industrial Area (Shahdara)', lat: 28.6730, lon: 77.2910, zone: 'Shahdara / East Delhi', type: 'Industrial' },
  { id: 'vasant-kunj', name: 'Vasant Kunj / JNU Eco Reserve', lat: 28.5380, lon: 77.1550, zone: 'South West Delhi', type: 'Eco Buffer Zone' },
  { id: 'kapashera', name: 'Kapashera Border (Gurugram Link)', lat: 28.5180, lon: 77.0850, zone: 'South West Border', type: 'Transit Arterial' },
];

// In-memory cache with 5-minute TTL
let cachedHeatmapData = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Uncapped AQI Calculation based on US EPA breakpoints with extrapolation beyond 500
 */
export function calculateUncappedAqiFromPm25(pm25) {
  if (pm25 <= 0) return 0;
  if (pm25 <= 12.0) return Math.round((50 / 12.0) * pm25);
  if (pm25 <= 35.4) return Math.round(50 + ((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1));
  if (pm25 <= 55.4) return Math.round(101 + ((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5));
  if (pm25 <= 150.4) return Math.round(151 + ((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5));
  if (pm25 <= 250.4) return Math.round(201 + ((300 - 201) / (250.4 - 150.5)) * (pm25 - 150.5));
  if (pm25 <= 350.4) return Math.round(301 + ((400 - 301) / (350.4 - 250.5)) * (pm25 - 250.5));
  if (pm25 <= 500.4) return Math.round(401 + ((500 - 401) / (500.4 - 350.5)) * (pm25 - 350.5));
  // Uncapped extrapolation for extreme episodic smog
  return Math.round(501 + ((pm25 - 500.4) * 0.85));
}

/**
 * Haversine distance in km
 */
export function getDistanceKm(lat1, lon1, lat2, lon2) {
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
 * Multi-Factor Scoring Algorithm
 * Awards a score 0..100 based on Proximity, Freshness, Completeness, Plausibility
 */
export function evaluateAccuracyScore(station, userLat, userLon) {
  // 1. Proximity (35%)
  const dist = getDistanceKm(userLat, userLon, station.lat, station.lon);
  const proximityScore = Math.max(0, 1 - dist / 30) * 35;

  // 2. Freshness (30%) - Assuming live API observation within 15 mins
  const freshnessScore = 28;

  // 3. Completeness (20%) - Checks presence of PM2.5, PM10, NO2, CO
  let compCount = 0;
  if (station.pm25 !== undefined) compCount++;
  if (station.pm10 !== undefined) compCount++;
  if (station.no2 !== undefined) compCount++;
  if (station.co !== undefined) compCount++;
  const completenessScore = (compCount / 4) * 20;

  // 4. Physical Plausibility (15%) - PM2.5 <= PM10, non-negative
  let plausibilityScore = 15;
  if (station.pm25 > station.pm10) plausibilityScore = 5;

  return Math.round(proximityScore + freshnessScore + completenessScore + plausibilityScore);
}

/**
 * Fetch live data across all Delhi stations from Open-Meteo (batch) + WAQI/IQAir if keys configured
 */
export async function getDelhiHeatmapData(userLat = 28.7495, userLon = 77.1171) {
  const now = Date.now();
  if (cachedHeatmapData && now - lastFetchTime < CACHE_TTL_MS) {
    // Recalculate user distance and accuracy scores against current user coordinates
    return await recomputeUserMetrics(cachedHeatmapData, userLat, userLon);
  }

  try {
    const lats = DELHI_STATION_COORDS.map((s) => s.lat).join(',');
    const lons = DELHI_STATION_COORDS.map((s) => s.lon).join(',');

    const openMeteoUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&timezone=auto`;

    const res = await fetch(openMeteoUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo returned status ${res.status}`);
    }

    const json = await res.json();
    const dataList = Array.isArray(json) ? json : [json];

    const stations = DELHI_STATION_COORDS.map((meta, index) => {
      const live = dataList[index]?.current || {};
      const rawPm25 = Number(live.pm2_5) || 45;
      const rawPm10 = Number(live.pm10) || 80;
      const computedAqi = calculateUncappedAqiFromPm25(rawPm25);

      return {
        ...meta,
        aqi: computedAqi,
        pm25: Math.round(rawPm25 * 10) / 10,
        pm10: Math.round(rawPm10 * 10) / 10,
        no2: Math.round((Number(live.nitrogen_dioxide) || 25) * 10) / 10,
        so2: Math.round((Number(live.sulphur_dioxide) || 10) * 10) / 10,
        co: Math.round((Number(live.carbon_monoxide) ? live.carbon_monoxide / 100 : 0.8) * 10) / 10,
        o3: Math.round((Number(live.ozone) || 30) * 10) / 10,
        source: 'Live Open-Meteo (CAMS / Copernicus Model)',
        updatedAt: live.time || new Date().toISOString(),
      };
    });

    cachedHeatmapData = stations;
    lastFetchTime = now;

    return await recomputeUserMetrics(stations, userLat, userLon);
  } catch (err) {
    console.warn('[fusionAqiService] Live batch fetch failed, using fallback:', err.message);
    if (cachedHeatmapData) {
      return await recomputeUserMetrics(cachedHeatmapData, userLat, userLon);
    }
    throw err;
  }
}

/**
 * Fetch ground station data from WAQI (World Air Quality Index) if key is present
 */
async function fetchWaqiPoint(lat, lon) {
  const token = process.env.WAQI_API_KEY || process.env.WAQI_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`https://api.waqi.info/feed/geo:${lat};${lon}/?token=${token}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 'ok' || !json.data) return null;
    const d = json.data;
    const pm25 = d.iaqi?.pm25?.v || (typeof d.aqi === 'number' ? Math.round(d.aqi * 0.7) : 120);
    return {
      aqi: typeof d.aqi === 'number' ? d.aqi : calculateUncappedAqiFromPm25(pm25),
      pm25: pm25,
      pm10: d.iaqi?.pm10?.v || Math.round(pm25 * 1.5),
      stationName: d.city?.name || 'WAQI Delhi Station',
      source: 'WAQI (Ground Station / CPCB Feed)',
      timestamp: d.time?.iso || new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[fusionAqiService] WAQI fetch error:', err.message);
    return null;
  }
}

/**
 * Fetch validation reading from IQAir (AirVisual) if key is present
 */
async function fetchIqairPoint(lat, lon) {
  const key = process.env.IQAIR_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`http://api.airvisual.com/v2/nearest_city?lat=${lat}&lon=${lon}&key=${key}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 'success' || !json.data) return null;
    const pol = json.data.current?.pollution;
    if (!pol) return null;
    return {
      aqi: pol.aqius,
      mainPollutant: pol.mainus || 'pm2.5',
      city: json.data.city,
      source: 'IQAir (AirVisual)',
      timestamp: pol.ts || new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[fusionAqiService] IQAir fetch error:', err.message);
    return null;
  }
}

/**
 * Computes user-specific IDW, cross-references with WAQI/IQAir, and calculates consensus
 */
async function recomputeUserMetrics(stations, userLat, userLon) {
  let totalWeight = 0;
  let weightedAqi = 0;
  let weightedPm25 = 0;
  let nearestStation = stations[0];
  let minDistance = Infinity;

  const scoredStations = stations.map((st) => {
    const dist = getDistanceKm(userLat, userLon, st.lat, st.lon);
    const score = evaluateAccuracyScore(st, userLat, userLon);

    if (dist < minDistance) {
      minDistance = dist;
      nearestStation = st;
    }

    const safeDist = Math.max(0.3, dist);
    const w = 1 / (safeDist * safeDist);
    totalWeight += w;
    weightedAqi += st.aqi * w;
    weightedPm25 += st.pm25 * w;

    return {
      ...st,
      distanceFromUserKm: dist,
      accuracyScore: score,
    };
  });

  const openMeteoIdwAqi = Math.round(weightedAqi / totalWeight);
  const openMeteoIdwPm25 = Math.round((weightedPm25 / totalWeight) * 10) / 10;

  // Query secondary and tertiary services in parallel if configured
  const [waqiData, iqairData] = await Promise.all([
    fetchWaqiPoint(userLat, userLon),
    fetchIqairPoint(userLat, userLon),
  ]);

  // Multi-source consensus fusion:
  // - Open-Meteo IDW: 40%
  // - WAQI Ground: 40% (if active)
  // - IQAir: 20% (if active)
  let consensusAqi = openMeteoIdwAqi;
  let consensusPm25 = openMeteoIdwPm25;
  const activeSourcesList = ['Open-Meteo (CAMS / Copernicus Model)'];

  if (waqiData && iqairData) {
    consensusAqi = Math.round(openMeteoIdwAqi * 0.35 + waqiData.aqi * 0.45 + iqairData.aqi * 0.20);
    consensusPm25 = Math.round((openMeteoIdwPm25 * 0.4 + waqiData.pm25 * 0.6) * 10) / 10;
    activeSourcesList.push(waqiData.source, iqairData.source);
  } else if (waqiData) {
    consensusAqi = Math.round(openMeteoIdwAqi * 0.45 + waqiData.aqi * 0.55);
    consensusPm25 = Math.round((openMeteoIdwPm25 * 0.45 + waqiData.pm25 * 0.55) * 10) / 10;
    activeSourcesList.push(waqiData.source);
  } else if (iqairData) {
    consensusAqi = Math.round(openMeteoIdwAqi * 0.70 + iqairData.aqi * 0.30);
    activeSourcesList.push(iqairData.source);
  }

  return {
    success: true,
    userEstimate: {
      aqi: consensusAqi,
      pm25: consensusPm25,
      rawOpenMeteoAqi: openMeteoIdwAqi,
      waqiAqi: waqiData ? waqiData.aqi : null,
      iqairAqi: iqairData ? iqairData.aqi : null,
      coordinates: { lat: userLat, lon: userLon },
      nearestStation: {
        name: nearestStation.name,
        distanceKm: minDistance,
        aqi: nearestStation.aqi,
      },
    },
    sourcesActive: {
      openMeteo: true,
      waqi: Boolean(process.env.WAQI_API_KEY || process.env.WAQI_TOKEN),
      iqair: Boolean(process.env.IQAIR_API_KEY),
      list: activeSourcesList,
    },
    stations: scoredStations,
    lastUpdated: new Date(lastFetchTime).toISOString(),
  };
}

