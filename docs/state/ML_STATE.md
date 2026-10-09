# ML State

Snapshot: 9 Oct 2026. Code: `ml/` (Python scripts, notebook), served by `server/sagemakerService.js`.

## 1. What's in production

| Item | Value |
|---|---|
| Task | 48-hour forward hourly PM2.5 forecast for any lat/lon in Delhi-NCR (schools, grid cells) |
| Model | XGBoost 1.7-1 regression, `reg:squarederror` on `log1p(PM2.5)` |
| Trained by | `ml/train_and_deploy_48h_model.py` (8 Oct 2026) |
| Training data | `ml/data/multi_year_seasonal_train.csv` (12 MB, hourly 2021–2024, per school location). PM2.5 comes from the xKDR CPCB archive, weather from the Open-Meteo archive (`ml/collect_multi_year_data.py`) |
| Samples | 332,416 (multi-horizon pairs, built every 3 hours) |
| Features (14) | `pm25_now, horizon_hours, temperature, humidity, wind_speed, hour_sin, hour_cos, doy_sin, doy_cos, is_winter, is_stubble_burning, is_school_rush, latitude, longitude` |
| Test metrics | MAE **27.92 µg/m³**, RMSE **42.92**, R² **0.8156**, 54.3 % within ±20, 76.8 % within ±40 (`ml/model/sagemaker_forecast_metadata.json`) |
| Endpoint | SageMaker Serverless `wmd-delhi-48h-forecast-endpoint`, ap-south-1. `/api/aws-status` reports `InService` |
| Deployed by | `ml/repackage_and_deploy.py` / `ml/update_sagemaker_model_v4.py` / `ml/deploy_pure_model.py` (all 8 Oct). It isn't recorded which one deployed the live version |
| Local copy | `ml/model/xgboost_forecast_model.json` (3.2 MB): the same trees, evaluated in Node when the endpoint isn't available |

### How serving works (`getSchoolAqiForecast`)
1. Fetch the Open-Meteo weather forecast and air-quality forecast for the location (3 days, `timezone=Asia/Kolkata`).
2. Build 48 feature rows (hours +1 to +48).
3. Try SageMaker first (`AWS_SAGEMAKER_SERVERLESS_LIVE`). Otherwise evaluate the local trees (`LOCAL_NATIVE_XGBOOST_INFERENCE`). If that fails too, return `ERROR_STATION_BASELINE`.
4. Work out the school windows (07:00–09:00 arrival, school hours), the exceedance hours and the peak.
5. Uncertainty bands use a **fixed `sigmaLog = 0.28`** rather than one the model learned.

## 2. Model generations in the repo (avoid mixing them up)

| Metadata file | Model | Status |
|---|---|---|
| `ml/model/sagemaker_forecast_metadata.json` | 14-feature 48 h XGBoost (above) | **Current, used in production** |
| `ml/model/sagemaker_model_metadata.json` and the copy `src/data/sagemakerModelMetadata.json` | "Cascading multi-horizon" engine: 24 features, 56,985 records, MAE 21.05 (1 h) to 43.37 (24 h) | **Old.** Still read by `ml/generate_model_pdf.py`, `generate_system_report_pdf.py`, `evaluate_model_performance.py`, `train_sagemaker_xgboost.py`. Nothing in `src/` imports it |
| `ml/model/sagemaker_grid_model_metadata.json` + `xgboost_grid_model.bin` | Daily grid model: 8 features, 7,014 records, MAE 3.19 | **Old / experimental.** Not served. MAE 3.19 is on daily averages and can't be compared with the hourly models |
| `ml/model/xgboost_model.bin`, `model.tar.gz` (3 KB) | Earliest model (HANDOVER: 3,264 rows, MAE 13.60) | **Old** |

⚠️ The PDFs in `public/` (`model_training_specifications.pdf`, `vayuvitals_executive_system_report.pdf`) were made by scripts that read the **old** metadata. Check every number in them, and on slides, against the current metadata before showing judges.

## 3. Data assets

| File | Size | Used for |
|---|---|---|
| `ml/data/multi_year_seasonal_train.csv` | 12 MB | Training the current model |
| `ml/data/grid_14day_buffer.json` | 7.6 MB | Petition evidence (14-day hourly per grid). Shipped with the Lambda and refreshed by the sync job. Changes often (it shows as modified in git) |
| `ml/data/spatial_grids.json` | 327 kB | 99 grid cells (0.05° steps, 28.40–28.85 N, 76.90–77.40 E) |
| `ml/data/grid_3year_daily_train.csv`, `sagemaker_train_noheader.csv`, `schools_telemetry_*.csv` | 0.3–0.8 MB each | Older models |
| `ml/data/monitor_state.json`, `autonomous_monitor_audit.json` | small | Local monitor state (also kept in DynamoDB) |

**Data licensing and attribution:** xKDR CPCB data and Open-Meteo. Credit both in the README and on slides.

## 4. Considerations for honest claims (AGENTS.md)
- **Which metrics to quote:** only the current model's (27.92 / 42.92 / 0.8156), and always say they're **test-set** numbers on 2021–2024 data. They aren't live accuracy, and no live-accuracy tracking exists.
- **Say which engine ran:** the forecast response has `executionMode`. The UI should say "SageMaker live" or "same model, run locally", and treat `ERROR_STATION_BASELINE` as "forecast unavailable".
- **Don't oversell the uncertainty bands:** they come from a fixed σ, so don't call them calibrated confidence intervals.
- **"Kalman assimilation ready" and "quantiles enabled"** in the old metadata aren't implemented in serving. Don't mention them.

## 5. Known ML issues

### 5.1 Weather inputs are misaligned (high: wrong forecasts)
In `sagemakerService.js`, the feature loop uses `hourlyMeteo.temperature_2m[step]` for step 1 to 48. Open-Meteo's hourly arrays start at **00:00 IST today**, not at the current hour. At 18:00 IST, the "+1 h" forecast uses the 01:00 weather, so every forecast after midnight uses weather that's up to 23 hours off.
**Fix:** find the index of the current IST hour in `hourlyMeteo.time`, then use `index + step`. Do the same for the `aqi` arrays if they're used.

### 5.2 Time-of-day features depend on the server clock (high: needs checking)
`hour = forecastTime.getHours()` gives UTC on Lambda and IST on a local machine. `is_school_rush` (hours 7–9), `hour_sin/cos` and the school windows all depend on it.
- **Check:** confirm the time zone of the training timestamps (`timestamp` column, e.g. `2021-10-15T00:00`). The xKDR archive and the Open-Meteo archive call in `collect_multi_year_data.py` have no explicit `timezone`, and Open-Meteo's default is GMT.
- **Fix:** compute hour, day-of-year and month in the **same** time zone the training data used, explicitly (e.g. `Asia/Kolkata` via `Intl.DateTimeFormat`), so local and Lambda results match.

### 5.3 Made-up inputs and outputs when something fails (medium)
- **Missing weather:** the defaults are temperature 26, humidity 60, wind 2.2. Return an error or a forecast flagged as degraded.
- **`ERROR_STATION_BASELINE`:** 48 hours equal to the current PM2.5. Return "forecast unavailable" instead.

### 5.4 Reproducibility (low)
- Several deploy scripts overlap (`repackage_and_deploy.py`, `update_sagemaker_model_v4.py`, `deploy_pure_model.py`, `deploy_sagemaker_endpoint.py`). Record which one is canonical, and the model artifact's S3 path for the live endpoint.
- **No fixed train/test split file:** the scripts split in code. Store the random seed and split dates in the metadata.
- **Notebook:** `ml/sagemaker_air_quality_forecasting.ipynb` predates the current model. Check it before showing it to judges.

## 6. Re-training and re-deploying (reference)
1. Data: `python ml/collect_multi_year_data.py`. It writes `ml/data/multi_year_seasonal_train.csv`.
2. Training: `python ml/train_and_deploy_48h_model.py`. It writes `ml/model/xgboost_forecast_model.json` and `sagemaker_forecast_metadata.json`.
3. Endpoint: deploy with the canonical script from §5.4. Requires AWS credentials and a SageMaker execution role, which only a person runs.
4. Rebuild the Lambda bundle (`npm run build:lambda`) so the local fallback model and metadata match the endpoint.
