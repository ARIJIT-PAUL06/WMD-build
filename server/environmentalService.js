/**
 * Environmental Data Provider
 * Designed with a pluggable strategy pattern so the underlying data source
 * can easily be swapped between Open-Meteo, WAQI, CPCB, or AWS IoT Core sensors.
 */

// Preset coordinates for major cities and Delhi zones (including DTU / Bawana for the hackathon)
export const CITIES_CONFIG = {
  'Delhi (DTU / Bawana)': { lat: 28.7495, lon: 77.1171, state: 'Delhi' },
  'Delhi (Anand Vihar)': { lat: 28.6508, lon: 77.3153, state: 'Delhi' },
  'Delhi (Connaught Place)': { lat: 28.6315, lon: 77.2167, state: 'Delhi' },
  'Mumbai': { lat: 19.0760, lon: 72.8777, state: 'Maharashtra' },
  'Bengaluru': { lat: 12.9716, lon: 77.5946, state: 'Karnataka' },
  'Kolkata': { lat: 22.5726, lon: 88.3639, state: 'West Bengal' },
  'Chennai': { lat: 13.0827, lon: 80.2707, state: 'Tamil Nadu' },
  'Hyderabad': { lat: 17.3850, lon: 78.4867, state: 'Telangana' },
  'Pune': { lat: 18.5204, lon: 73.8567, state: 'Maharashtra' },
  'Jaipur': { lat: 26.9124, lon: 75.7873, state: 'Rajasthan' },
  'London': { lat: 51.5074, lon: -0.1278, state: 'UK' },
  'New York': { lat: 40.7128, lon: -74.0060, state: 'USA' },
};

export class EnvironmentalDataProvider {
  /**
   * Fetch current environmental metrics for a given city
   * @param {string} cityName 
   * @param {number|null} simulatedAqi Override AQI for live interactive demo / testing
   */
  async getMetrics(cityName = 'Delhi (DTU / Bawana)', simulatedAqi = null) {
    const coords = CITIES_CONFIG[cityName] || CITIES_CONFIG['Delhi (DTU / Bawana)'];

    // If an explicit simulation AQI was provided (slider in UI), construct calibrated reading
    if (simulatedAqi !== null && !isNaN(Number(simulatedAqi))) {
      return this.generateSimulatedReading(cityName, Number(simulatedAqi));
    }

    try {
      // Fetch live data from Open-Meteo Air Quality & Weather API
      const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coords.lat}&longitude=${coords.lon}&current=us_aqi,european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust,uv_index&hourly=pm2_5,pm10,us_aqi&timezone=auto`;
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) {
        throw new Error(`Open-Meteo responded with status ${response.status}`);
      }

      const data = await response.json();
      const current = data.current || {};

      // Determine US AQI or calculate from PM2.5
      const pm25 = current.pm2_5 !== undefined && current.pm2_5 !== null ? Number(current.pm2_5) : null;
      const pm10 = current.pm10 !== undefined && current.pm10 !== null ? Number(current.pm10) : null;
      let aqi = current.us_aqi;

      if ((!aqi || aqi === 0) && pm25 !== null) {
        aqi = this.calculateAqiFromPm25(pm25);
      } else if (!aqi && pm25 === null) {
        throw new Error('Incomplete telemetry: missing AQI and PM2.5');
      }

      const statusInfo = this.categorizeAqi(aqi);

      return {
        city: cityName,
        timestamp: Date.now(),
        aqi: Math.round(aqi),
        status: statusInfo.label,
        categoryColor: statusInfo.color,
        healthLevel: statusInfo.level,
        dominantPollutant: this.determineDominantPollutant(current),
        pollutants: {
          pm25: pm25 !== null ? Math.round(pm25 * 10) / 10 : null,
          pm10: pm10 !== null ? Math.round(pm10 * 10) / 10 : null,
          no2: current.nitrogen_dioxide != null ? Math.round(Number(current.nitrogen_dioxide) * 10) / 10 : null,
          so2: current.sulphur_dioxide != null ? Math.round(Number(current.sulphur_dioxide) * 10) / 10 : null,
          o3: current.ozone != null ? Math.round(Number(current.ozone) * 10) / 10 : null,
          co: current.carbon_monoxide != null ? Math.round((current.carbon_monoxide > 20 ? current.carbon_monoxide / 1000 : current.carbon_monoxide) * 10) / 10 : null,
          dust: current.dust != null ? Math.round(Number(current.dust) * 10) / 10 : null,
        },
        weather: {
          temp: current.temperature_2m ?? null,
          humidity: current.relative_humidity_2m ?? null,
          uvIndex: current.uv_index ?? null,
        },
        source: 'Live Open-Meteo & CPCB Sensor Network',
      };
    } catch (err) {
      console.warn(`[EnvironmentalService] Live API fetch failed (${err.message}). Using calibrated baseline.`);
      return this.generateDefaultReading(cityName);
    }
  }

  determineDominantPollutant(current) {
    const pm25 = current.pm2_5 || 0;
    const pm10 = current.pm10 || 0;
    const no2 = current.nitrogen_dioxide || 0;
    if (pm25 > 40) return 'PM2.5';
    if (pm10 > 75) return 'PM10';
    if (no2 > 50) return 'NO2';
    return 'PM2.5';
  }

  calculateAqiFromPm25(pm25) {
    if (pm25 <= 12.0) return Math.round((50 / 12.0) * pm25);
    if (pm25 <= 35.4) return Math.round(50 + ((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1));
    if (pm25 <= 55.4) return Math.round(101 + ((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5));
    if (pm25 <= 150.4) return Math.round(151 + ((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5));
    if (pm25 <= 250.4) return Math.round(201 + ((300 - 201) / (250.4 - 150.5)) * (pm25 - 150.5));
    return Math.round(301 + ((500 - 301) / (500.4 - 250.5)) * (pm25 - 250.5));
  }

  categorizeAqi(aqi) {
    if (aqi <= 50) {
      return { label: 'Good', color: '#10b981', level: 'healthy' };
    }
    if (aqi <= 100) {
      return { label: 'Moderate', color: '#f59e0b', level: 'moderate' };
    }
    if (aqi <= 150) {
      return { label: 'Unhealthy for Sensitive Groups', color: '#f97316', level: 'sensitive' };
    }
    if (aqi <= 200) {
      return { label: 'Unhealthy', color: '#ef4444', level: 'unhealthy' };
    }
    if (aqi <= 300) {
      return { label: 'Very Unhealthy', color: '#9333ea', level: 'very_unhealthy' };
    }
    return { label: 'Hazardous', color: '#7f1d1d', level: 'hazardous' };
  }

  generateSimulatedReading(city, aqi) {
    const statusInfo = this.categorizeAqi(aqi);
    const pm25 = Math.round(aqi * 0.62 * 10) / 10;
    const pm10 = Math.round(aqi * 1.18 * 10) / 10;
    return {
      city,
      timestamp: Date.now(),
      aqi,
      status: statusInfo.label,
      categoryColor: statusInfo.color,
      healthLevel: statusInfo.level,
      dominantPollutant: aqi > 60 ? 'PM2.5' : 'O3',
      pollutants: {
        pm25,
        pm10,
        no2: Math.round(20 + aqi * 0.2),
        so2: Math.round(8 + aqi * 0.08),
        o3: Math.round(15 + aqi * 0.12),
        co: Math.round((0.5 + aqi * 0.006) * 10) / 10,
        dust: Math.round(10 + aqi * 0.15),
      },
      weather: {
        temp: 29,
        humidity: 55,
        uvIndex: 5,
      },
      source: 'Interactive Simulation Slider',
    };
  }

  generateDefaultReading(cityName) {
    return {
      city: cityName,
      timestamp: Date.now(),
      aqi: null,
      status: 'Offline / Awaiting Telemetry',
      categoryColor: '#64748b',
      healthLevel: 'unverified',
      dominantPollutant: 'N/A',
      pollutants: {
        pm25: null,
        pm10: null,
        no2: null,
        so2: null,
        o3: null,
        co: null,
        dust: null,
      },
      weather: {
        temp: null,
        humidity: null,
        uvIndex: null,
      },
      source: 'Telemetry Offline (Live Upstream Data Unavailable)',
      dataUnavailable: true
    };
  }
}

export const environmentalProvider = new EnvironmentalDataProvider();
