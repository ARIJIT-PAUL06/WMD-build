import os
import json
import numpy as np
import xgboost as xgb

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE = os.path.join(BASE_DIR, 'model', 'xgboost_grid_model.bin')

bst = xgb.Booster()
bst.load_model(MODEL_FILE)

# Features: [doy_sin, doy_cos, month, day, is_winter, is_stubble_burning, morning_rush_avg_pm25, daily_peak_pm25]
feature_names = [
    'doy_sin', 'doy_cos', 'month', 'day',
    'is_winter', 'is_stubble_burning',
    'morning_rush_avg_pm25', 'daily_peak_pm25'
]

scenarios = [
    {
        'label': 'Deep Winter Inversion (Dec 25 - Peak Smog Trap)',
        'features': [-0.20, 0.98, 12, 25, 1, 0, 320.0, 480.0]
    },
    {
        'label': 'Stubble Burning Peak (Nov 05 - Stubble Smoke Window)',
        'features': [-0.85, 0.52, 11, 5, 1, 1, 380.0, 540.0]
    },
    {
        'label': 'Monsoon Baseline (Jul 15 - Rain Washout Clean Air)',
        'features': [0.45, -0.89, 7, 15, 0, 0, 35.0, 55.0]
    },
    {
        'label': 'Spring Transition (Mar 20 - Mild Convection)',
        'features': [0.98, 0.18, 3, 20, 0, 0, 95.0, 140.0]
    }
]

print("=================================================================")
print("      3-YEAR DAILY GRID XGBOOST MODEL EVALUATION TEST")
print("=================================================================\n")

for s in scenarios:
    dmat = xgb.DMatrix(np.array([s['features']]), feature_names=feature_names)
    pred = float(bst.predict(dmat)[0])
    label = s['label']
    morning = s['features'][6]
    peak = s['features'][7]
    print(f"[*] Scenario: {label}")
    print(f"    -> Input Morning Rush: {morning} ug/m3 | Peak: {peak} ug/m3")
    print(f"    -> PREDICTED DAILY AVERAGE: {pred:.1f} ug/m3")
    
    if pred > 250:
        print("    -> Action: [CRITICAL EMERGENCY] Section 10 Statutory Petition Escalation")
    elif pred > 120:
        print("    -> Action: [VERY POOR WARNING] Preventative School Advisory (Hybrid Classes)")
    else:
        print("    -> Action: [SATISFACTORY / MODERATE] Standard Operational Status")
    print()
