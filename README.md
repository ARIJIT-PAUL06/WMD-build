# VayuVitals

**Hyper-local air quality for Delhi-NCR: live AQI maps, a 48-hour PM2.5 forecast for every school, and evidence-backed civic petitions.**

Built for the WeMakeDevs *Bharat Builds* hackathon, Track 01 (Air).

VayuVitals answers three questions for parents, schools and citizens in Delhi-NCR:

1. **How bad is the air right where I am, right now?** A fused, interpolated AQI heatmap built from several public monitoring networks.
2. **How bad will it be at school drop-off tomorrow?** An XGBoost model that forecasts hourly PM2.5 for the next 48 hours at any coordinate, served from Amazon SageMaker.
3. **What can I do about it?** Fourteen days of measured exposure for each school's area, turned into a bilingual (English / Hindi) petition addressed to the responsible authority.

---

## Contents

- [How it fits together](#how-it-fits-together)
- [Repository layout](#repository-layout)
- [The ML forecast](#the-ml-forecast)
- [The backend](#the-backend)
- [The web frontend](#the-web-frontend)
- [The mobile app](#the-mobile-app)
- [Running it locally](#running-it-locally)
- [Deployment](#deployment)
- [Testing](#testing)
- [Data honesty rules](#data-honesty-rules)
- [Known limitations](#known-limitations)
- [Data sources and credits](#data-sources-and-credits)

---

## How it fits together

```
                 ┌───────────────────────────────────────────────────────────┐
  Public data    │ Open-Meteo (air quality + weather)   WAQI   IQAir         │
                 └───────────────┬───────────────────────────────────────────┘
                                 │ HTTP, fetched on demand and by a scheduled sync
                                 ▼
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │  Express API  (server/)  — one codebase, three entry points                  │
 │    server/index.js   local dev, port 3001                                    │
 │    server/lambda.js  AWS Lambda: HTTP via Function URL + EventBridge events  │
 │    api/index.js      Vercel serverless wrapper                               │
 │                                                                              │
 │  fusionAqiService     merge sources → AQI → IDW interpolation (heatmaps)     │
 │  gridTelemetryService 99 grid cells × 14 days of hourly PM2.5                │
 │  sagemakerService     48 h forecast  ──►  SageMaker endpoint                 │
 │                                       └─►  same trees evaluated in Node      │
 │  evidenceService      school-hour exposure stats → petition evidence        │
 │  petitionsService     saved petitions (DynamoDB, owner-only)                 │
 │  autonomous monitor   scheduled checks → advisory e-mails via SES (opt-in)   │
 └───────────────┬──────────────────────────────────────┬───────────────────────┘
                 │ JSON over /api/*                     │ AWS SDK
                 ▼                                      ▼
  ┌──────────────────────────────┐      DynamoDB · SageMaker · SES · Cognito
  │ Web  (React 19 + Vite, src/) │      Bedrock / Gemini (text polishing)
  │ Mobile (Expo, mobile/)       │
  └──────────────────────────────┘
```

The important design choice is that **the server owns every number**. Clients never compute AQI, forecasts or petition evidence themselves; they render what the API returns, along with the source and execution mode the API reports.

---

## Repository layout

| Path | What lives there |
|---|---|
| `src/` | Web app: React 19, Vite, Three.js / React Three Fiber, Mapbox GL, D3 |
| `server/` | Express 5 API (ESM), services and routes |
| `api/index.js` | Vercel serverless entry that wraps the same Express app |
| `ml/` | Python: data collection, training, evaluation and SageMaker deploy scripts |
| `ml/model/` | Trained model artifacts and their metadata |
| `ml/data/` | Training CSVs, the 99-cell spatial grid, and the 14-day telemetry buffer |
| `mobile/` | Expo / React Native app |
| `aws/` | CloudFormation templates and the Cognito post-confirmation trigger |
| `scripts/` | Lambda build and deploy, buffer sync, diagnostics |
| `tests/` | Node test runner suites (`npm test`) |
| `docs/` | Design plans and the per-area state docs in `docs/state/` |

---

## The ML forecast

### What it predicts

Hourly PM2.5 (µg/m³) for each of the next 48 hours at any latitude/longitude in Delhi-NCR. Schools use it to plan the 07:00–09:00 arrival window and outdoor activity.

### Model

| | |
|---|---|
| Algorithm | XGBoost 1.7-1, `reg:squarederror` |
| Target | `log1p(PM2.5)`; predictions are mapped back with `expm1` |
| Training script | `ml/train_and_deploy_48h_model.py` |
| Training data | `ml/data/multi_year_seasonal_train.csv`: hourly data for 2021–2024 at school locations |
| Samples | 332,416 multi-horizon pairs |
| Artifacts | `ml/model/xgboost_forecast_model.json` and `ml/model/sagemaker_forecast_metadata.json` |

**One model covers every horizon.** Rather than training 48 separate models, each training row pairs "PM2.5 now" with the PM2.5 observed `h` hours later, and `h` is itself a feature. Pairs are built every 3 hours for horizons 1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 30, 36, 42 and 48. At inference time the model is asked for h = 1…48.

### Features (14, in this order)

| Group | Features | Why |
|---|---|---|
| Persistence | `pm25_now`, `horizon_hours` | Current level is the strongest predictor; its weight decays with horizon |
| Weather at the target hour | `temperature`, `humidity`, `wind_speed` | Low wind and high humidity trap particulates |
| Cyclical time | `hour_sin`, `hour_cos`, `doy_sin`, `doy_cos` | Sine/cosine encoding so 23:00 sits next to 00:00 and 31 Dec next to 1 Jan |
| Delhi-specific flags | `is_winter`, `is_stubble_burning`, `is_school_rush` | Winter inversions, Oct–Nov crop-residue burning, morning traffic |
| Location | `latitude`, `longitude` | Spatial differences across NCR |

### Test-set results

From `ml/model/sagemaker_forecast_metadata.json`, measured on the held-out 20 % of the 2021–2024 data:

| MAE | RMSE | R² | Within ±20 µg/m³ | Within ±40 µg/m³ |
|---|---|---|---|---|
| 27.92 | 42.92 | 0.8156 | 54.3 % | 76.8 % |

These are **historical test-set** numbers, not live accuracy; no live-accuracy tracking exists yet. The Stats page doesn't copy them by hand: `server/modelEvaluationService.js` rebuilds the exact test split, runs the saved model over it, and serves calibration plots, per-horizon error and feature importance at `GET /api/model-evaluation`.

### How a forecast is served

`server/sagemakerService.js` → `getSchoolAqiForecast()`:

1. Map the coordinate to one of the 99 grid cells and take its latest measured PM2.5 as `pm25_now` (or the `basePm25` passed in the request).
2. Fetch the Open-Meteo weather forecast in `Asia/Kolkata` time.
3. Build 48 feature rows. Hour, day-of-year and the flags are computed in IST, and each row's weather is matched to its target hour by timestamp.
4. **Try SageMaker first.** All 48 rows go to the serverless endpoint as a single CSV request.
5. **If the endpoint isn't available, evaluate the same trees in Node.** `evaluateXgbTrees()` walks the exported JSON trees directly, so the output matches the endpoint without needing Python on the server.
6. Derive the school-specific outputs: arrival-window averages, peaks and hours over the threshold.

Every response includes an `executionMode` so the UI can say which path produced it:

| `executionMode` | Meaning |
|---|---|
| `AWS_SAGEMAKER_SERVERLESS_LIVE` | Predicted by the SageMaker endpoint |
| `LOCAL_NATIVE_XGBOOST_INFERENCE` | Same model, evaluated locally in Node |
| `ERROR_STATION_BASELINE` | Both failed. This is **not a forecast** (see [Known limitations](#known-limitations)) |

The response also sets `weatherMode` to `DEGRADED_DEFAULT_PHYSICS` when weather data was missing for any hour.

### Retraining

```bash
python ml/collect_multi_year_data.py        # writes ml/data/multi_year_seasonal_train.csv
python ml/train_and_deploy_48h_model.py     # writes the model JSON and its metadata
npm run build:lambda                        # bundles the new model as the Lambda fallback
```

Deploying to SageMaker needs AWS credentials and a SageMaker execution role. Several deploy scripts exist in `ml/` (`repackage_and_deploy.py`, `update_sagemaker_model_v4.py`, `deploy_pure_model.py`, `deploy_sagemaker_endpoint.py`); see `docs/state/ML_STATE.md` before choosing one.

> Older model generations (`xgboost_model.bin`, `xgboost_grid_model.bin`, `sagemaker_model_metadata.json`, `sagemaker_grid_model_metadata.json`) are kept for history and are **not served**. Only quote metrics from `sagemaker_forecast_metadata.json`.

---

## The backend

Express 5 in `server/`. The same `app` is exported from `server/index.js` and mounted three ways (local, Lambda, Vercel), so there's one implementation of every route.

### Core services

| Service | Responsibility |
|---|---|
| `fusionAqiService.js` | Pulls Open-Meteo, WAQI and IQAir readings; computes AQI from PM2.5; scores each source; interpolates to a point with inverse-distance weighting (IDW). Powers the heatmaps |
| `gridTelemetryService.js` | Divides Delhi-NCR into 99 cells (0.05° steps, 28.40–28.85 N, 76.90–77.40 E). Keeps a rolling 14-day hourly buffer per cell, in memory, in `/tmp` and in DynamoDB |
| `sagemakerService.js` | The 48-hour forecast (above) |
| `evidenceService.js` | Petition evidence: averages over school hours (07:00–13:00 IST), counts days above the threshold, and marks days without data as `NO_DATA` instead of filling them in |
| `petitionsService.js` | Saved petitions in DynamoDB. Evidence is recomputed on the server, and only the owner can read or delete a petition |
| `authMiddleware.js` | Verifies Cognito tokens with `aws-jwt-verify`. Returns 503 when Cognito isn't configured |
| `autonomousAtmosphericMonitor.js` | Scheduled cycle with three checks: morning advisory, 5 km block emergency, 14-day chronic exposure. State and debounces live in DynamoDB |
| `advisoryDispatchService.js`, `sesService.js` | Morning and emergency advisory e-mails through Amazon SES |
| `sourceAttributionService.js` | A rule-based *likely-source* estimate from gas ratios and weather. It's a heuristic, not proof of cause |
| `awsServices.js`, `geminiService.js` | DynamoDB access, and optional LLM polishing of advisory and petition text (Bedrock or Gemini) |

### API overview

All `/api/*` routes share a 150 requests/min/IP limit. Route files are in `server/routes/`.

| Area | Routes | Access |
|---|---|---|
| Health | `GET /api/health`, `/api/aws-status`, `/api/ses/health` | public |
| Air quality | `GET /api/air-quality`, `/api/history`, `/api/source-attribution` | public |
| Heatmaps | `GET /api/india-heatmap`, `/api/delhi-heatmap`, `/api/region-heatmap` | public |
| Forecast and model | `GET /api/sagemaker/forecast`, `/api/petition/forecast`, `/api/model-evaluation` | public, rate-limited |
| Grids and directory | `GET /api/spatial-grids/*`, `/api/telemetry/compliance/:gridId`, `/api/directory/facilities` | public (`/mappings` needs the admin key) |
| Petition data | `GET /api/petition/authorities`, `/schools`, `/evidence` | public, rate-limited |
| Petition drafting | `POST /api/petition/generate-draft`, `/polish-draft` | signed-in user |
| Saved petitions | `GET/POST/DELETE /api/petitions`, `PATCH /api/petitions/:id/status` | signed-in user, own petitions only |
| School view | `GET /api/petition/school` | `school_admin` group; no personal details returned |
| AI advisory | `POST /api/gemini-advisory`, `/api/bedrock-advisory` | signed-in user |
| Ingest | `POST /api/sensor-ingest`, `/api/telemetry/sync-grids` | machine token with `ingest/write` scope |
| Monitor | `GET /api/monitor/status` | public |
| Monitor and dispatch actions | `POST /api/monitor/*`, `/api/advisory/*` | admin key, and **blocked in production** |

### The scheduled job

`server/lambda.js` handles two kinds of events. HTTP requests are passed to Express. EventBridge events (`source: aws.events`) run one autonomous-monitor cycle.

**E-mail is off by default.** A cycle only sends through SES when `ENABLE_AUTONOMOUS_EMAIL_DISPATCH=true` and `DISABLE_AUTOMATIC_MAILING` is not `true`. Otherwise it evaluates and logs without sending anything.

### Storage

| Store | Contents |
|---|---|
| DynamoDB `AirQualityReadings` | Readings, the grid buffer, monitor state |
| DynamoDB `Petitions` | Saved petitions (defined in `aws/template.yaml`) |
| Files bundled with the Lambda | `schoolsDirectory.json`, `authoritiesConfig.json`, `spatial_grids.json`, `grid_14day_buffer.json`, the forecast model and its metadata |

---

## The web frontend

React 19 + Vite in `src/`. There's no router library: `src/App.jsx` picks a view from the query string or hash, and every heavy view is loaded with `React.lazy`, so the first load doesn't pull in Mapbox or jsPDF.

| URL | View | Main code |
|---|---|---|
| `/` | Scrolling landing page with a CRT-style shader hero | `components/MotionHero/` |
| `?view=map`, `#map` | Full-screen Delhi AQI heatmap | `components/Heatmap/` |
| `?view=school` | School safety: 14-day evidence, activity guidance, civic action | `components/SchoolSafety/` |
| `?view=stats` | Model evaluation plots and the live 48 h trajectory | `components/Stats/` |
| `?view=about` | About page | `components/About/` |
| `?pollutant=<id>` | Pollutant detail with the 3D lungs scene | `components/PollutantDetail/`, `ThreeScene/` |
| `?documentary=<id>` | Editorial story page for each pollutant | `components/PollutantDocumentary/` |
| `#cargo` | Atmospheric cargo-truck visualisation | `components/CargoTruck/` |
| `?view=monitor` | Autonomous monitor status and test bench | `components/Dashboard/` |

**How the heatmap works:** the browser asks `/api/delhi-heatmap` for station values and renders an IDW raster over Mapbox GL. Colour thresholds and raster helpers are in `heatmapConstants.js` and `heatmapRasterUtils.js`.

**How API calls work:** every request goes through `src/utils/apiFetch.js`. It prefixes `VITE_API_BASE_URL`, attaches the Cognito access token when the user is signed in, and opens the sign-in modal on a 401. Locally, Vite proxies `/api` to `localhost:3001`.

**How login works:** `src/context/AuthContext.jsx` uses AWS Amplify v6 against a Cognito user pool (sign-up, confirm, sign-in, password reset). When the Cognito variables are unset, the UI shows that login isn't configured instead of failing silently.

---

## The mobile app

Expo / React Native in `mobile/`, with tabs for the map, stations and profile. It calls the deployed Lambda URL configured in `mobile/app.json` → `extra.apiUrl`.

- `src/components/PetitionModal.js`: a four-step petition builder (evidence → draft → review → share / copy / e-mail).
- `src/services/authService.js`: Cognito Hosted UI with PKCE, with tokens kept in `expo-secure-store`.
- Login needs a development build (`npx expo run:android`), because Expo Go can't receive the `vayuvitals://` redirect.

```bash
npm run expo              # start the Expo dev server
npm run export:android    # Android export
```

---

## Running it locally

**Requirements:** Node 22, npm. Python 3 is needed only for the `ml/` scripts.

```bash
npm install
cp .env.example .env      # then fill in what you have (see below)
npm run dev               # API on :3001 and Vite on :5174, together
```

Open <http://localhost:5174>.

`npm run dev:server` and `npm run dev:frontend` start the two halves separately.

### Environment variables

`.env.example` lists only a subset; the full list is in `docs/state/BACKEND_STATE.md` §5. The ones that matter most:

| Variable | Needed for |
|---|---|
| `VITE_MAPBOX_TOKEN` | Map tiles. Without it the map asks for a token |
| `VITE_API_BASE_URL` | Leave empty locally. In production, set it to the deployed API |
| `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_WEB_CLIENT_ID` | Web login |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Any AWS call |
| `SAGEMAKER_ENDPOINT_NAME` | Live forecasts (the local model is used without it) |
| `DYNAMODB_TABLE_NAME`, `PETITIONS_TABLE_NAME` | Storage |
| `COGNITO_USER_POOL_ID`, `COGNITO_WEB_CLIENT_ID`, `COGNITO_MOBILE_CLIENT_ID`, `COGNITO_INGEST_CLIENT_ID` | Server-side token checks |
| `WAQI_API_KEY`, `IQAIR_API_KEY` | Extra heatmap sources |
| `GEMINI_API_KEY`, `BEDROCK_MODEL_ID` | Optional text polishing |
| `ADMIN_API_KEY` | Monitor test bench (local only) |
| `ENABLE_AUTONOMOUS_EMAIL_DISPATCH` | Must be `true` before the scheduled job sends any e-mail |

**What works without AWS credentials:** heatmaps and current readings (from the public APIs), forecasts (through the local XGBoost path, labelled as such), and evidence from the bundled 14-day buffer. Login, saved petitions, SageMaker and SES need their AWS resources and report clearly when they're missing.

---

## Deployment

| Part | Where it runs |
|---|---|
| Web frontend | Amplify |
| API | AWS Lambda `wmd-backend` (ap-south-1) behind a Function URL. A Vercel serverless copy (`api/index.js`, `vercel.json`) also exists and is being retired |
| Forecast | SageMaker Serverless endpoint `wmd-delhi-48h-forecast-endpoint` |
| Data | DynamoDB, ap-south-1 |
| E-mail | SES |

Deploying the Lambda:

```bash
npm run build:lambda              # esbuild bundle + required data files
python scripts/deploy_lambda.py   # upload code and publish a version
```

`aws/template.yaml` describes the full stack (Lambda, tables, Cognito, schedule) as CloudFormation. Live resources were created by scripts and by hand, and the template **has not been deployed yet**. `aws/deploy-s3-cloudfront.ps1` and `aws/lambda/airQualityHandler.js` are from an earlier design and are unused.

---

## Testing

```bash
npm test            # Node test runner, tests/*.test.js
npm run build       # production web build
```

GitHub Actions (`.github/workflows/ci-cd.js.yml`) runs `npm ci` and the build on every push to `main`.

---

## Data honesty rules

This project has a strict no-faking policy (see [`AGENTS.md`](AGENTS.md)). Contributors must follow it:

- **Never invent data, model output, latency or AWS status.** If a service, credential or table is missing, report exactly what's missing.
- **Label every number with where it came from.** Forecasts carry `executionMode`, and evidence carries its source line.
- **Missing data stays missing.** Days without readings are `NO_DATA`, not interpolated.
- **Simulations say so on screen.** The AQI slider is labelled "simulation" and never written to the database.
- **Petitions are never "filed" by the app.** The only statuses are Draft saved, Opened in mail, Shared and Marked as sent.
- **Privacy (India DPDP Act 2023).** Saved petitions are visible only to their owner and can be deleted. School admins see no personal details.
- **E-mail is opt-in.** Automatic sending is off unless explicitly enabled, and HTTP dispatch routes return 403 in production.

---

## Known limitations

Recorded here so nobody has to discover them the hard way. Details are in `docs/state/`.

- **Forecast fallbacks still use fixed values.** If no live PM2.5 is available for the cell, `pm25_now` defaults to 85 (floored at 25). Missing weather defaults to 26 °C, 60 % humidity and 2.2 m/s, though the response reports `weatherMode: DEGRADED_DEFAULT_PHYSICS`. `ERROR_STATION_BASELINE` returns a flat line at the current value. All three should become an explicit "forecast unavailable".
- **Training time zone hasn't been confirmed.** Serving computes time features in IST. The training timestamps come from archives whose default is GMT, and that needs checking.
- **Some timeline labels use the server clock.** In the post-processing loop, hour labels and school windows use `getHours()`, which is UTC on Lambda.
- **Uncertainty bands use a fixed σ** (`sigmaLog = 0.28`), not a learned one. They aren't calibrated confidence intervals.
- **Offline heatmap and city fallbacks** (`fusionAqiService`, `environmentalService`) show fixed baseline numbers when every live source fails. They're labelled, but should show "data unavailable" instead.
- **Cognito rollout is in progress.** Petition drafting requires login, so it only works once the user pool is deployed and configured.
- **The PDFs in `public/` and the notebook in `ml/`** were generated from older model metadata. Check their numbers against `sagemaker_forecast_metadata.json` before citing them.

---

## Data sources and credits

- **CPCB monitoring data** via the [xKDR](https://xkdr.org/) archive: historical PM2.5 for training.
- **[Open-Meteo](https://open-meteo.com/):** weather and air-quality forecasts and archives.
- **[WAQI](https://waqi.info/)** and **[IQAir](https://www.iqair.com/):** live station readings for the heatmap fusion.
- Map tiles by **Mapbox**. Documentary image credits are in `public/assets/documentary/wmd/CREDITS.md`.
