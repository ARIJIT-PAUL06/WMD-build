"""
Spatial Grid Builder for Air Quality Blocks (AQI Pins)
Divides the geographical territory into uniform spatial grid blocks (5km x 5km).
Maps schools, colleges, and healthcare facilities into their corresponding Grid Block.
"""

import json
import os
import math

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
SCHOOLS_FILE = os.path.join(BASE_DIR, '..', 'src', 'data', 'schoolsDirectory.json')
OUTPUT_GRIDS_FILE = os.path.join(DATA_DIR, 'spatial_grids.json')

# Territory Bounding Box (Delhi-NCR core zone: Lat 28.40 to 28.85, Lon 76.90 to 77.40)
# Step size: 0.05 degrees ~ 5.5 km
LAT_MIN = 28.40
LAT_MAX = 28.85
LON_MIN = 76.90
LON_MAX = 77.40
GRID_STEP = 0.05

def generate_spatial_grids():
    os.makedirs(DATA_DIR, exist_ok=True)

    # 1. Load schools and institutional directory
    educational = []
    healthcare = []
    nodal_authorities = {}
    if os.path.exists(SCHOOLS_FILE):
        with open(SCHOOLS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            educational = data.get('educationalInstitutions', [])
            healthcare = data.get('healthcareFacilities', [])
            nodal_authorities = data.get('nodalAuthorities', {})

    all_facilities = []
    for inst in educational:
        item = dict(inst)
        item['facilityClass'] = 'school_or_university'
        all_facilities.append(item)
    for hosp in healthcare:
        item = dict(hosp)
        item['facilityClass'] = 'healthcare_facility'
        all_facilities.append(item)

    print(f"[*] Loaded {len(educational)} educational institutions and {len(healthcare)} healthcare facilities.")
    print(f"[*] Generating uniform spatial grid blocks across NCR [{LAT_MIN}, {LON_MIN}] to [{LAT_MAX}, {LON_MAX}]...")
    
    grids = {}
    row = 0
    lat = LAT_MIN
    while lat < LAT_MAX:
        col = 0
        lon = LON_MIN
        while lon < LON_MAX:
            grid_id = f"GRID_R{row:02d}_C{col:02d}"
            lat_south = round(lat, 4)
            lat_north = round(lat + GRID_STEP, 4)
            lon_west = round(lon, 4)
            lon_east = round(lon + GRID_STEP, 4)
            centroid_lat = round(lat + GRID_STEP / 2.0, 4)
            centroid_lon = round(lon + GRID_STEP / 2.0, 4)

            # Match any institution located inside this bounding box
            enclosed_facilities = []
            for inst in all_facilities:
                i_lat = inst.get('lat', 0)
                i_lon = inst.get('lon', 0)
                if lat_south <= i_lat < lat_north and lon_west <= i_lon < lon_east:
                    enclosed_facilities.append({
                        "id": inst['id'],
                        "name": inst['name'],
                        "lat": i_lat,
                        "lon": i_lon,
                        "type": inst.get('type', 'Institutional Facility'),
                        "facilityClass": inst.get('facilityClass', 'school_or_university'),
                        "category": inst.get('category', 'general'),
                        "district": inst.get('district', 'Delhi'),
                        "locality": inst.get('locality', ''),
                        "emails": inst.get('emails', []),
                        "primaryEmail": inst.get('primaryEmail', inst.get('emails', [''])[0] if inst.get('emails') else ''),
                        "nodalOfficerEmail": inst.get('nodalOfficerEmail', ''),
                        "phone": inst.get('phone', ''),
                        "enrollmentOrBeds": inst.get('studentCount', inst.get('bedCount', 1500))
                    })

            grids[grid_id] = {
                "grid_id": grid_id,
                "centroid": {"lat": centroid_lat, "lon": centroid_lon},
                "bounds": {
                    "north": lat_north,
                    "south": lat_south,
                    "east": lon_east,
                    "west": lon_west
                },
                "enclosed_facilities": enclosed_facilities,
                "facility_count": len(enclosed_facilities)
            }
            lon += GRID_STEP
            col += 1
        lat += GRID_STEP
        row += 1

    populated_grids = {k: v for k, v in grids.items() if v['facility_count'] > 0}
    print(f"[*] Created {len(grids)} total spatial blocks.")
    print(f"[*] Found {len(populated_grids)} blocks containing monitored facilities.")

    output_payload = {
        "metadata": {
            "grid_step_deg": GRID_STEP,
            "approx_cell_size_km": 5.5,
            "lat_bounds": [LAT_MIN, LAT_MAX],
            "lon_bounds": [LON_MIN, LON_MAX],
            "total_grids": len(grids),
            "populated_grids_count": len(populated_grids)
        },
        "grids": grids
    }

    with open(OUTPUT_GRIDS_FILE, 'w', encoding='utf-8') as f:
        json.dump(output_payload, f, indent=2)

    print(f"[OK] Spatial grids catalog written to: {OUTPUT_GRIDS_FILE}")
    return grids

if __name__ == '__main__':
    generate_spatial_grids()
