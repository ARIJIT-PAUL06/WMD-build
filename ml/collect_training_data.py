"""
Data Ingestion Pipeline for Educational Institutions Air Quality Training
Collects 14 to 30 days of hourly PM2.5, PM10, and meteorological physics
(Planetary Boundary Layer Height, Wind Speed, Temperature, Humidity)
via Open-Meteo Air Quality and Weather APIs.
"""

import json
import os
import urllib.request
import urllib.parse
from datetime import datetime

SCHOOLS_FILE = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'schoolsDirectory.json')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'data')
OUTPUT_CSV = os.path.join(OUTPUT_DIR, 'schools_telemetry_train.csv')

def fetch_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'VayuVitals-SageMaker-Pipeline/1.0'})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode('utf-8'))

def collect_telemetry(days_past=14):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    with open(SCHOOLS_FILE, 'r', encoding='utf-8') as f:
        schools_data = json.load(f)
    
    institutions = schools_data.get('educationalInstitutions', [])
    print(f"[*] Found {len(institutions)} institutions. Ingesting past {days_past} days hourly telemetry...")

    rows = []
    
    for school in institutions:
        s_id = school['id']
        s_name = school['name']
        lat = school['lat']
        lon = school['lon']
        
        print(f"  -> Fetching telemetry for: {s_name} ({lat}, {lon})")
        
        # 1. Fetch Air Quality telemetry (PM2.5, PM10, CO, NO2)
        aq_url = (
            f"https://air-quality-api.open-meteo.com/v1/air-quality?"
            f"latitude={lat}&longitude={lon}&hourly=pm2_5,pm10,carbon_monoxide,nitrogen_dioxide"
            f"&past_days={days_past}&forecast_days=3"
        )
        
        # 2. Fetch Meteorological physics (Boundary layer, wind, temp, humidity)
        meteo_url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lon}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,boundary_layer_height"
            f"&past_days={days_past}&forecast_days=3"
        )
        
        try:
            aq_data = fetch_json(aq_url)
            meteo_data = fetch_json(meteo_url)
            
            times = aq_data['hourly']['time']
            pm25_vals = aq_data['hourly']['pm2_5']
            pm10_vals = aq_data['hourly']['pm10']
            co_vals = aq_data['hourly'].get('carbon_monoxide', [0] * len(times))
            no2_vals = aq_data['hourly'].get('nitrogen_dioxide', [0] * len(times))
            
            temps = meteo_data['hourly']['temperature_2m']
            humidities = meteo_data['hourly']['relative_humidity_2m']
            winds = meteo_data['hourly']['wind_speed_10m']
            pbl_heights = meteo_data['hourly']['boundary_layer_height']
            
            for i in range(len(times)):
                dt_str = times[i]
                dt = datetime.fromisoformat(dt_str)
                hour = dt.hour
                day_of_week = dt.weekday()
                is_school_window = 1 if (7 <= hour <= 13 and day_of_week < 6) else 0
                is_commute_window = 1 if (7 <= hour <= 9 and day_of_week < 6) else 0
                
                pm25 = pm25_vals[i] if pm25_vals[i] is not None else 65.0
                pm10 = pm10_vals[i] if pm10_vals[i] is not None else 110.0
                
                rows.append({
                    'school_id': s_id,
                    'timestamp': dt_str,
                    'hour': hour,
                    'day_of_week': day_of_week,
                    'is_school_window': is_school_window,
                    'is_commute_window': is_commute_window,
                    'temp_2m': temps[i],
                    'humidity_2m': humidities[i],
                    'wind_speed_10m': winds[i],
                    'pbl_height': pbl_heights[i],
                    'no2': no2_vals[i] or 0.0,
                    'co': co_vals[i] or 0.0,
                    'pm10': pm10,
                    'pm2_5': pm25
                })
        except Exception as e:
            print(f"     [!] Warning: Failed fetching for {s_id}: {e}")
            
    # Write to CSV
    if rows:
        headers = list(rows[0].keys())
        with open(OUTPUT_CSV, 'w', encoding='utf-8') as f:
            f.write(','.join(headers) + '\n')
            for r in rows:
                line = ','.join(str(r[h]) for h in headers)
                f.write(line + '\n')
        print(f"[+] Success: Ingested {len(rows)} hourly records saved to:\n    {OUTPUT_CSV}")
    else:
        print("[!] No rows collected.")

if __name__ == '__main__':
    collect_telemetry(days_past=14)
