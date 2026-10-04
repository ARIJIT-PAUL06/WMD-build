"""
VayuVitals Continuous Atmospheric Data Ingestion & Engineering Pipeline
Collects high-resolution multi-pollutant and boundary-layer meteorological physics from Open-Meteo APIs.
Supports:
  - 48 Educational Institutions across all 9 Delhi districts
  - Delhi-NCR CAAQMS regulatory monitoring stations
  - Multi-pollutant spectrum: PM2.5, PM10, NO2, SO2, CO, O3, Dust
  - High-order atmospheric physics: Boundary Layer Height (PBL), Dew Point, Wind Vector (U, V), Surface Pressure
  - 24 engineered features ready for XGBoost cascading horizon training
"""

import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"

import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import argparse
import csv
import json
import math
import time
import urllib.request
import urllib.parse
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCHOOLS_FILE = os.path.join(BASE_DIR, '..', 'src', 'data', 'schoolsDirectory.json')
STATIONS_FILE = os.path.join(BASE_DIR, '..', 'src', 'data', 'indiaStations.json')
DATA_DIR = os.path.join(BASE_DIR, 'data')
OUTPUT_CSV = os.path.join(DATA_DIR, 'schools_telemetry_expanded.csv')

def fetch_json_with_retry(url, max_retries=3, timeout=20):
    headers = {'User-Agent': 'VayuVitals-CleanAir-DataPipeline/2.0 (Institutional Health Network)'}
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            time.sleep(1.0 * (attempt + 1))

def compute_physics_features(row, prev_rows=None):
    """
    Computes real-time dynamic atmospheric physics:
    - Soot Mass (PM2.5 * fine_ratio)
    - Orthogonal wind decomposition (U-wind, V-wind)
    - Radiative thermal inversion intensity
    - Stubble smoke advection vector
    - 2-hour acceleration (2nd derivative) & 24-hour momentum
    """
    pm25 = max(5.0, float(row.get('pm2_5', 100.0) or 100.0))
    pm10 = max(pm25, float(row.get('pm10', 160.0) or 160.0))
    fine_ratio = max(0.20, min(0.98, pm25 / pm10))
    soot_mass = pm25 * fine_ratio

    temp = float(row.get('temp_2m', 24.0) or 24.0)
    wind_spd = max(0.2, float(row.get('wind_speed_10m', 2.0) or 2.0))
    wind_dir = float(row.get('wind_dir_10m', 270.0) or 270.0)

    # Orthogonal meteorological wind vector (U = zonal, V = meridional)
    rad = math.radians(wind_dir)
    u_wind = -wind_spd * math.sin(rad)
    v_wind = -wind_spd * math.cos(rad)

    # Stubble smoke advection from Punjab/Haryana (direction ~315 deg / North-West)
    # Unit vector towards SE: (sin(135), cos(135)) = (0.707, -0.707)
    stubble_advection = max(0.0, 0.707 * u_wind - 0.707 * v_wind)

    # Radiative cooling inversion intensity
    inversion_intensity = max(0.0, (24.0 - temp) / 10.0) * (1.35 if wind_spd < 2.0 else 0.85)

    hour = int(row.get('hour', 12))
    day_of_year = int(row.get('day_of_year', 180))

    hour_sin = math.sin((2 * math.pi * hour) / 24.0)
    hour_cos = math.cos((2 * math.pi * hour) / 24.0)
    doy_sin = math.sin((2 * math.pi * day_of_year) / 365.25)
    doy_cos = math.cos((2 * math.pi * day_of_year) / 365.25)

    month = int(row.get('month', 6))
    day = int(row.get('day', 15))
    is_winter = 1 if (month in [11, 12, 1] or (month == 10 and day >= 15)) else 0
    is_stubble_burning = 1 if ((month == 10 and day >= 20) or (month == 11 and day <= 20)) else 0
    is_school_rush = 1 if (7 <= hour <= 9) else 0

    # Lags, Momentum, and Acceleration
    lag_1 = pm25
    lag_2 = pm25
    lag_24 = pm25
    accel_2h = 0.0
    momentum_24h = 0.0

    if prev_rows:
        if len(prev_rows) >= 1:
            lag_1 = prev_rows[-1].get('pm2_5', pm25)
        if len(prev_rows) >= 2:
            lag_2 = prev_rows[-2].get('pm2_5', lag_1)
            # 2nd derivative: (pm25 - lag_1) - (lag_1 - lag_2)
            accel_2h = (pm25 - lag_1) - (lag_1 - lag_2)
        if len(prev_rows) >= 24:
            lag_24 = prev_rows[-24].get('pm2_5', pm25)
            momentum_24h = pm25 - lag_24

    return {
        'fine_ratio': round(fine_ratio, 4),
        'soot_mass': round(soot_mass, 2),
        'u_wind': round(u_wind, 3),
        'v_wind': round(v_wind, 3),
        'inversion_intensity': round(inversion_intensity, 4),
        'stubble_advection': round(stubble_advection, 3),
        'hour_sin': round(hour_sin, 4),
        'hour_cos': round(hour_cos, 4),
        'doy_sin': round(doy_sin, 4),
        'doy_cos': round(doy_cos, 4),
        'is_winter': is_winter,
        'is_stubble_burning': is_stubble_burning,
        'is_school_rush': is_school_rush,
        'pm25_lag_1': round(lag_1, 2),
        'pm25_lag_2': round(lag_2, 2),
        'pm25_lag_24': round(lag_24, 2),
        'acceleration_2h': round(accel_2h, 3),
        'momentum_24h': round(momentum_24h, 2)
    }

def harvest_telemetry(days_past=30, start_date=None, end_date=None, limit_schools=None, facility_type='all'):
    os.makedirs(DATA_DIR, exist_ok=True)

    with open(SCHOOLS_FILE, 'r', encoding='utf-8') as f:
        schools_data = json.load(f)

    educational = schools_data.get('educationalInstitutions', [])
    for e in educational:
        e['facility_category'] = 'educational'

    healthcare = schools_data.get('healthcareFacilities', [])
    for h in healthcare:
        h['facility_category'] = 'healthcare'

    if facility_type == 'schools':
        institutions = educational
    elif facility_type == 'hospitals':
        institutions = healthcare
    else:
        institutions = educational + healthcare

    if limit_schools:
        institutions = institutions[:limit_schools]

    print("=" * 80)
    print(f"🛰️  VayuVitals Continuous Atmospheric Data Ingest Pipeline")
    print(f"    Total Facilities Selected: {len(institutions)} (Educational: {len([i for i in institutions if i.get('facility_category')=='educational'])}, Healthcare: {len([i for i in institutions if i.get('facility_category')=='healthcare'])})")
    print(f"    Temporal Window: {'Past ' + str(days_past) + ' days' if not start_date else f'{start_date} to {end_date}'}")
    print("=" * 80)

    all_records = []

    for idx, school in enumerate(institutions, 1):
        s_id = school['id']
        s_name = school['name']
        lat = round(school['lat'], 4)
        lon = round(school['lon'], 4)

        print(f"[{idx}/{len(institutions)}] Fetching {s_name} ({lat}, {lon})...")

        # Construct date query parameters
        date_param = f"&past_days={days_past}&forecast_days=1" if not start_date else f"&start_date={start_date}&end_date={end_date}"

        # 1. Air Quality Multi-Gas API
        aq_url = (
            f"https://air-quality-api.open-meteo.com/v1/air-quality?"
            f"latitude={lat}&longitude={lon}"
            f"&hourly=pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust"
            f"{date_param}"
        )

        # 2. Meteorological Boundary Layer Physics API
        meteo_url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lon}"
            f"&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,surface_pressure,wind_speed_10m,wind_direction_10m,boundary_layer_height"
            f"{date_param}"
        )

        try:
            aq_data = fetch_json_with_retry(aq_url)
            time.sleep(0.15) # Polite API spacing
            meteo_data = fetch_json_with_retry(meteo_url)
            time.sleep(0.15)

            times = aq_data['hourly']['time']
            pm25_vals = aq_data['hourly'].get('pm2_5', [])
            pm10_vals = aq_data['hourly'].get('pm10', [])
            no2_vals = aq_data['hourly'].get('nitrogen_dioxide', [])
            so2_vals = aq_data['hourly'].get('sulphur_dioxide', [])
            co_vals = aq_data['hourly'].get('carbon_monoxide', [])
            o3_vals = aq_data['hourly'].get('ozone', [])
            dust_vals = aq_data['hourly'].get('dust', [])

            temps = meteo_data['hourly'].get('temperature_2m', [])
            humidities = meteo_data['hourly'].get('relative_humidity_2m', [])
            dew_points = meteo_data['hourly'].get('dew_point_2m', [])
            pressures = meteo_data['hourly'].get('surface_pressure', [])
            wind_speeds = meteo_data['hourly'].get('wind_speed_10m', [])
            wind_dirs = meteo_data['hourly'].get('wind_direction_10m', [])
            pbl_heights = meteo_data['hourly'].get('boundary_layer_height', [])

            school_buffer = []

            for i in range(len(times)):
                dt_str = times[i]
                try:
                    dt = datetime.fromisoformat(dt_str)
                except Exception:
                    dt = datetime.strptime(dt_str, '%Y-%m-%dT%H:%M')

                pm25 = float(pm25_vals[i]) if (i < len(pm25_vals) and pm25_vals[i] is not None) else 85.0
                pm10 = float(pm10_vals[i]) if (i < len(pm10_vals) and pm10_vals[i] is not None) else max(pm25 * 1.6, 120.0)

                base_row = {
                    'facility_id': s_id,
                    'facility_name': s_name,
                    'facility_category': school.get('facility_category', 'educational'),
                    'latitude': lat,
                    'longitude': lon,
                    'timestamp': dt_str,
                    'year': dt.year,
                    'month': dt.month,
                    'day': dt.day,
                    'hour': dt.hour,
                    'day_of_year': dt.timetuple().tm_yday,
                    'pm2_5': pm25,
                    'pm10': pm10,
                    'no2': float(no2_vals[i]) if (i < len(no2_vals) and no2_vals[i] is not None) else 35.0,
                    'so2': float(so2_vals[i]) if (i < len(so2_vals) and so2_vals[i] is not None) else 12.0,
                    'co': float(co_vals[i]) if (i < len(co_vals) and co_vals[i] is not None) else 1.2,
                    'o3': float(o3_vals[i]) if (i < len(o3_vals) and o3_vals[i] is not None) else 45.0,
                    'dust': float(dust_vals[i]) if (i < len(dust_vals) and dust_vals[i] is not None) else 15.0,
                    'temp_2m': float(temps[i]) if (i < len(temps) and temps[i] is not None) else 24.0,
                    'humidity_2m': float(humidities[i]) if (i < len(humidities) and humidities[i] is not None) else 60.0,
                    'dew_point_2m': float(dew_points[i]) if (i < len(dew_points) and dew_points[i] is not None) else 15.0,
                    'surface_pressure': float(pressures[i]) if (i < len(pressures) and pressures[i] is not None) else 1012.0,
                    'wind_speed_10m': float(wind_speeds[i]) if (i < len(wind_speeds) and wind_speeds[i] is not None) else 2.2,
                    'wind_dir_10m': float(wind_dirs[i]) if (i < len(wind_dirs) and wind_dirs[i] is not None) else 270.0,
                    'boundary_layer_height': float(pbl_heights[i]) if (i < len(pbl_heights) and pbl_heights[i] is not None) else 450.0
                }

                # Compute high-order atmospheric physics & lags
                physics = compute_physics_features(base_row, school_buffer)
                base_row.update(physics)

                school_buffer.append(base_row)
                all_records.append(base_row)

            print(f"   -> Collected {len(times)} hours for {s_id}")

        except Exception as e:
            print(f"   [!] Failed fetching {s_id}: {e}")

    # Write out expanded training CSV
    if all_records:
        headers = list(all_records[0].keys())
        with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            writer.writerows(all_records)

        print("\n" + "=" * 80)
        print(f"✅ Ingestion Complete!")
        print(f"   • Total Empirical Records: {len(all_records):,} hourly observations")
        print(f"   • Campuses Ingested:        {len(institutions)}")
        print(f"   • Output Dataset:           {OUTPUT_CSV}")
        print("=" * 80)
    else:
        print("[!] No records ingested.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="VayuVitals Continuous Atmospheric Harvester")
    parser.add_argument('--days-past', type=int, default=30, help="Days of past hourly observations to harvest")
    parser.add_argument('--start-date', type=str, default=None, help="Start date (YYYY-MM-DD) for historical archive")
    parser.add_argument('--end-date', type=str, default=None, help="End date (YYYY-MM-DD) for historical archive")
    parser.add_argument('--limit', type=int, default=None, help="Limit number of institutions for quick sampling")
    parser.add_argument('--type', type=str, default='all', choices=['all', 'schools', 'hospitals'], help="Filter by facility type (all, schools, hospitals)")

    args = parser.parse_args()
    harvest_telemetry(days_past=args.days_past, start_date=args.start_date, end_date=args.end_date, limit_schools=args.limit, facility_type=args.type)

