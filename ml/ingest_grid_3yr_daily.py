"""
3-Year Historical Grid Aggregator (Daily Resolution)
Pulls continuous station data for the past 3 years (2021-2024) from the xKDR CPCB archive,
maps readings to spatial grid blocks, and computes daily summaries:
- daily_avg_pm25
- morning_rush_avg (06:00 - 09:00 AM)
- daily_peak_pm25
- day_of_year (cyclical time of year)
- month, day, is_winter, is_stubble_burning
"""

import os
import json
import csv
import math
import requests
from datetime import datetime
from urllib3.util import connection

# Cloudflare direct IP fallback for airquality.xkdr.org
_orig_create_connection = connection.create_connection
def _patched_create_connection(address, *args, **kwargs):
    host, port = address
    if host == 'airquality.xkdr.org':
        host = '188.114.97.0'
    return _orig_create_connection((host, port), *args, **kwargs)
connection.create_connection = _patched_create_connection

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
GRIDS_FILE = os.path.join(DATA_DIR, 'spatial_grids.json')
OUTPUT_DAILY_CSV = os.path.join(DATA_DIR, 'grid_3year_daily_train.csv')

TOKEN = os.getenv('XKDR_AQI_API_KEY', 'aqi_yybZiWaUVGKcclHMqQU-Etq9M2eYEDKzqGD56l89J60')
XKDR_BASE = "https://airquality.xkdr.org"

# Target 3-Year Time Window: 2021-10-01 to 2024-09-30
YEARS_CHUNKS = [
    ("2021-10-01", "2022-04-30", "Year 2021-2022"),
    ("2022-05-01", "2022-09-30", "Monsoon 2022"),
    ("2022-10-01", "2023-04-30", "Year 2022-2023"),
    ("2023-05-01", "2023-09-30", "Monsoon 2023"),
    ("2023-10-01", "2024-04-30", "Year 2023-2024"),
    ("2024-05-01", "2024-09-30", "Monsoon 2024")
]

def fetch_cpcb_station_data(start_date, end_date):
    headers = {'Authorization': f'Bearer {TOKEN}'}
    params = {
        'city': 'Delhi',
        'parameter': 'PM2.5',
        'start': start_date,
        'end': end_date
    }
    try:
        r = requests.get(f"{XKDR_BASE}/v1/measurements", headers=headers, params=params, timeout=45)
        if r.status_code == 200:
            return r.json().get('data', [])
        else:
            print(f"    [!] xKDR API Error ({r.status_code}): {r.text[:100]}")
            return []
    except Exception as e:
        print(f"    [!] Request failed for {start_date} to {end_date}: {e}")
        return []

def run_3year_daily_ingestion():
    if not os.path.exists(GRIDS_FILE):
        print(f"[!] Grids file not found: {GRIDS_FILE}")
        return

    with open(GRIDS_FILE, 'r', encoding='utf-8') as f:
        grids_data = json.load(f).get('grids', {})

    active_grids = {k: v for k, v in grids_data.items() if v['facility_count'] > 0}
    print(f"[*] Loaded {len(active_grids)} active grid blocks with educational/health facilities.")

    daily_records_by_grid = {gid: {} for gid in active_grids}

    for start_dt, end_dt, label in YEARS_CHUNKS:
        print(f"\n[*] Querying 3-Year Historical Chunk: {label} ({start_dt} to {end_dt})...")
        readings = fetch_cpcb_station_data(start_dt, end_dt)
        print(f"    -> Received {len(readings)} hourly records from xKDR.")

        # Organize readings by date: YYYY-MM-DD -> list of {hour, value}
        date_buckets = {}
        for r in readings:
            ts = r.get('collected_at')
            val = r.get('value')
            if ts and val is not None and 0 <= val <= 999:
                date_str = ts[:10]
                hour = int(ts[11:13])
                if date_str not in date_buckets:
                    date_buckets[date_str] = []
                date_buckets[date_str].append({"hour": hour, "val": val})

        # For each active grid, compute the daily aggregated statistics
        for gid, ginfo in active_grids.items():
            for d_str, day_items in date_buckets.items():
                if len(day_items) < 4:  # require minimum hourly coverage
                    continue

                all_vals = [x['val'] for x in day_items]
                morning_vals = [x['val'] for x in day_items if 6 <= x['hour'] <= 9]
                
                daily_avg = sum(all_vals) / len(all_vals)
                daily_peak = max(all_vals)
                morning_rush_avg = (sum(morning_vals) / len(morning_vals)) if morning_vals else daily_avg

                dt = datetime.strptime(d_str, "%Y-%m-%d")
                doy = dt.timetuple().tm_yday
                month = dt.month
                day = dt.day

                # Calendar & seasonality features
                doy_sin = math.sin(2 * math.pi * doy / 365.25)
                doy_cos = math.cos(2 * math.pi * doy / 365.25)
                is_winter = 1 if (month in [11, 12, 1] or (month == 10 and day >= 15)) else 0
                is_stubble = 1 if (month == 10 and day >= 20) or (month == 11 and day <= 20) else 0

                daily_records_by_grid[gid][d_str] = {
                    "grid_id": gid,
                    "date": d_str,
                    "year": dt.year,
                    "month": month,
                    "day": day,
                    "day_of_year": doy,
                    "doy_sin": round(doy_sin, 4),
                    "doy_cos": round(doy_cos, 4),
                    "is_winter": is_winter,
                    "is_stubble_burning": is_stubble,
                    "facility_count": ginfo['facility_count'],
                    "centroid_lat": ginfo['centroid']['lat'],
                    "centroid_lon": ginfo['centroid']['lon'],
                    "daily_avg_pm25": round(daily_avg, 2),
                    "morning_rush_avg_pm25": round(morning_rush_avg, 2),
                    "daily_peak_pm25": round(daily_peak, 2)
                }

    # Flatten into final chronological dataset
    all_daily_rows = []
    for gid in sorted(daily_records_by_grid.keys()):
        dates_sorted = sorted(daily_records_by_grid[gid].keys())
        for d in dates_sorted:
            all_daily_rows.append(daily_records_by_grid[gid][d])

    if all_daily_rows:
        fieldnames = list(all_daily_rows[0].keys())
        with open(OUTPUT_DAILY_CSV, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(all_daily_rows)

        print(f"\n[OK] Built {len(all_daily_rows)} 3-year daily grid records in:")
        print(f"     {OUTPUT_DAILY_CSV}")
    else:
        print("[!] No daily records generated.")

if __name__ == '__main__':
    run_3year_daily_ingestion()
