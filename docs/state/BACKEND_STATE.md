# Backend State

Snapshot: 9 Oct 2026. Code: `server/` (Express 5, ESM). Entry points:
- `server/index.js`: local dev server, port 3001;
- `server/lambda.js`: Lambda handler (HTTP via serverless-express, plus EventBridge events);
- `api/index.js`: Vercel serverless wrapper of the same app.

## 1. Runtime and deployment

| Item | Current state |
|---|---|
| Lambda | `wmd-backend`, ap-south-1, Function URL (AuthType NONE), 512 MB / 180 s per the deploy script. Runtime planned `nodejs22.x` (template); the live value isn't verified in this snapshot |
| Code deploy | `scripts/deploy_lambda.py` uploads code only and publishes a version. It now calls `scripts/build_lambda.mjs` (esbuild bundle + data files). V2 plan A3 adds a guard that refuses to deploy when the Lambda has no Cognito settings |
| Config | Today set by hand or by the old deploy script. Planned: only from `aws/template.yaml` (Cognito IDs, table names, secrets as NoEcho parameters) |
| Infra as code | `aws/template.yaml` + `aws/template-import.yaml` + `aws/resources-to-import.json` + `scripts/deploy_stack.mjs`. **Never deployed.** The runbook is V2 plan Phases B–C |
| Old, unused | `aws/lambda/airQualityHandler.js`, `aws/deploy-s3-cloudfront.ps1` (S3/CloudFront isn't used; frontend is on Vercel) |
| Vercel API | `vercel.json` rewrites `/api/*` to `api/index.js`. To be retired once the web uses the Lambda (`VITE_API_BASE_URL`) |

## 2. API routes (current code)

Middleware key:
- `user` = signed-in citizen or admin (Cognito access token from the web or mobile client);
- `schoolAdmin` = `school_admin` group, with the school looked up on the server;
- `scope` = machine token with `ingest/write`;
- `admin-key` = `x-admin-key` header;
- `no-prod` = returns 403 when `NODE_ENV=production`.

All `/api/*` routes also share a 150 requests/min/IP limit.

| Area | Route | Access |
|---|---|---|
| Health | `GET /`, `/api/health`, `/api/aws-status`, `/api/ses/health` | public |
| Air quality | `GET /api/air-quality` (LLM limit), `/api/history`, `/api/source-attribution` | public |
| Heatmaps | `GET /api/india-heatmap`, `/api/delhi-heatmap`, `/api/region-heatmap` | public |
| Directory / grids | `GET /api/directory/facilities`, `/api/spatial-grids/facilities`, `/api/spatial-grids/directory`, `/api/spatial-grids/:gridId/compliance`, `/api/telemetry/compliance/:gridId` | public |
| | `GET /api/spatial-grids/mappings` | admin-key |
| Forecast | `GET /api/sagemaker/forecast`, `/api/petition/forecast` | public (rate-limited) |
| Petition data | `GET /api/petition/authorities`, `/schools`, `/evidence` | public (rate-limited) |
| Petition drafting | `POST /api/petition/generate-draft`, `/polish-draft` | **user** + per-user limit |
| Saved petitions | `POST/GET/DELETE /api/petitions`, `PATCH /api/petitions/:id/status`, `DELETE /api/petitions/:id` | **user** |
| School view | `GET /api/petition/school` | **schoolAdmin** |
| AI advisory | `POST /api/gemini-advisory`, `/api/bedrock-advisory` | **user** |
| Ingest | `POST /api/sensor-ingest`, `/api/telemetry/sync-grids` | **scope** `ingest/write` |
| Monitor | `GET /api/monitor/status` | public |
| | `POST /api/monitor/run-cycle`, `/clear-debounces`, `/block-emergency`, `/predictive-advisories`, `/chronic-petitions` | no-prod + admin-key |
| Advisory dispatch | `GET /api/advisory/preview-630` | public |
| | `POST /api/advisory/test-dispatch`, `/evaluate-morning`, `/emergency-midday` | no-prod + admin-key |

**CORS:** these origins are allowed:
- localhost 3000, 5173, 8081 and 19006;
- `wmd-civic.in` and `vayuvitals.in`;
- `FRONTEND_URL` and `VERCEL_URL`;
- requests with no origin (mobile).

## 3. Services (`server/*.js`)

| File | Job | Data sources |
|---|---|---|
| `fusionAqiService.js` (1,052 lines) | Heatmap data: merges sources, computes uncapped AQI from PM2.5, scores each source, interpolates (IDW) to the user's location | Open-Meteo, WAQI (`WAQI_API_KEY`/`WAQI_TOKEN`), IQAir (`IQAIR_API_KEY`) |
| `environmentalService.js` | City metrics. Also builds labelled "Interactive Simulation Slider" readings for the UI slider | Open-Meteo / WAQI |
| `gridTelemetryService.js` | 99 grid cells (5 km): maps coordinates to a cell, keeps a 14-day hourly buffer (`/tmp` + DynamoDB + memory), syncs from Open-Meteo (`timezone=GMT`) | Open-Meteo |
| `evidenceService.js` | Petition evidence: averages for school hours (07:00–13:00 IST), counts days over the threshold, marks missing days as `NO_DATA`, builds the bilingual draft | 14-day grid buffer |
| `petitionsService.js` | Saved petitions in DynamoDB `Petitions`: validation, server-computed evidence, honest statuses, delete, admin view without personal details | DynamoDB |
| `authMiddleware.js` | Cognito token checks (`aws-jwt-verify`). Returns 503 if Cognito isn't configured | Cognito |
| `sagemakerService.js` | 48-hour forecast (see ML_STATE) | SageMaker + local XGBoost + Open-Meteo forecast (`Asia/Kolkata`) |
| `sourceAttributionService.js` | Guesses the likely pollution source from gas ratios and weather. It's a rule-based method; it doesn't prove a cause, despite what its comments say | Live readings |
| `awsServices.js` | DynamoDB read/write (with a labelled in-memory fallback locally), Bedrock advisory, saving monitor state and the grid buffer | DynamoDB, Bedrock (`BEDROCK_MODEL_ID`) |
| `geminiService.js` | Gemini advisory (no thinking tokens, cached). Also tries to write `STATE_CONTEXT.md` to disk, which fails on Lambda (caught and logged) | Gemini (`GEMINI_API_KEY`, `GEMINI_MODEL`) |
| `advisoryDispatchService.js` (989 lines) | 06:30 morning advisory and midday emergency emails, plus the facility directory | SES, SageMaker forecast |
| `autonomousAtmosphericMonitor.js` | The 3 "pillars": morning advisory (≥ 75 PM2.5), 5 km block emergency (code comment says ≥ 200; env `BLOCK_EMERGENCY_THRESHOLD_PM25` = 105), 14-day chronic petition. Has debounces and state stored in DynamoDB | All of the above |
| `sesService.js` | SES send / health (`AWS_SES_REGION`, us-east-1) | SES |

**Data files read at runtime** (they must be in the Lambda zip; V2 plan A3):
- `src/data/schoolsDirectory.json`
- `src/data/authoritiesConfig.json`
- `ml/data/spatial_grids.json`
- `ml/data/grid_14day_buffer.json`
- `ml/model/sagemaker_forecast_metadata.json`
- `ml/model/xgboost_forecast_model.json`

## 4. Login (Cognito): uncommitted, being implemented
- **Design:** user pool with email sign-in; groups `citizen` and `school_admin`; `custom:school_id` that only admins can set; web client (SRP), mobile client (Hosted UI + PKCE), ingest client (client credentials).
- **Sign-up trigger:** a separate small function, `aws/functions/postConfirmation/index.mjs`, adds new users to `citizen`.
- **Backend:**
  - `requireUser`, `requireSchoolAdmin` (looks up the school with `AdminGetUser`, cached 5 min), `requireScope`.
  - Test hooks only work under `NODE_ENV=test`.
- **Not done yet** (V2 plan):
  - the save-format agreement (A1);
  - `school_id` mutable (A2);
  - the data files in the bundle (A3);
  - the duplicate-save fix (A5);
  - deploying the stack (Phase C).

## 5. Environment variables (backend)
- **AWS:** `AWS_REGION`, `APP_AWS_ACCESS_KEY_ID`/`APP_AWS_SECRET_ACCESS_KEY` (or `AWS_*`), `AWS_SESSION_TOKEN`.
- **Tables:** `DYNAMODB_TABLE_NAME`, `PETITIONS_TABLE_NAME`.
- **AI:** `BEDROCK_MODEL_ID`, `GEMINI_API_KEY`, `GEMINI_MODEL`.
- **Forecast:** `SAGEMAKER_ENDPOINT_NAME`.
- **Email:** `SES_SENDER_EMAIL`, `AWS_SES_VERIFIED_SENDER`, `AWS_SES_REGION`, `ENABLE_AUTONOMOUS_EMAIL_DISPATCH`, `DISABLE_AUTOMATIC_MAILING`, `COMMAND_CENTRE_EMAIL`, `MONITOR_ALERT_RECIPIENT`.
- **Thresholds:** `ADVISORY_THRESHOLD_PM25`, `BLOCK_EMERGENCY_THRESHOLD_PM25`.
- **Login:** `COGNITO_USER_POOL_ID`, `COGNITO_WEB_CLIENT_ID`, `COGNITO_MOBILE_CLIENT_ID`, `COGNITO_INGEST_CLIENT_ID`.
- **Admin and hosting:** `ADMIN_API_KEY` (or `ADMIN_SECRET_KEY`), `FRONTEND_URL`, `VERCEL_URL`, `NODE_ENV`, `PORT`, `ENABLE_LOCAL_DAEMON`.
- **Data APIs:** `WAQI_API_KEY`, `WAQI_TOKEN`, `IQAIR_API_KEY`.

**`.env.example` is out of date:** it lists only 8 of these. Update it, with names only and no values.

## 6. Data-honesty review (AGENTS.md)

| Where | What happens | Verdict |
|---|---|---|
| Evidence (`evidenceService`) | Missing days are `NO_DATA` and excluded. `maeError: null`. Unknown targets get 404 | ✅ Honest |
| Forecast mode | Returns `executionMode`: `AWS_SAGEMAKER_SERVERLESS_LIVE`, `LOCAL_NATIVE_XGBOOST_INFERENCE` or `ERROR_STATION_BASELINE` | ✅ Labelled |
| Forecast on model error | `ERROR_STATION_BASELINE` returns a **flat line equal to the current PM2.5** for 48 hours | ⚠️ Not a forecast. Return an error instead |
| Forecast weather defaults | Missing weather → 26 °C, 60 % humidity, 2.2 m/s | ⚠️ Made-up model inputs. Return an error or mark the forecast as degraded |
| `environmentalService.generateDefaultReading` | Live data down → Delhi AQI **245**, others **88**, labelled "Baseline Calibration (Live Network Offline)" | ⚠️ Fixed invented numbers. Show "data unavailable" |
| `fusionAqiService` offline fallback | Live fetch fails → each station gets its stored `pm25` or **120**, and PM10 = **1.6 × PM2.5**, labelled "Station Calibration Baseline (Offline Fallback)" | ⚠️ Same problem |
| Simulation slider | Labelled "Interactive Simulation Slider". Never written to DynamoDB | ✅ OK as long as the UI says "simulation" |
| `predictive-advisories` route | Accepts `simulatedPm25`, and could email using a simulated value | ⚠️ Blocked in production (no-prod + admin-key). Never run it with `dispatchViaSes` |
| Source attribution | A rule-based guess, worded as "mathematically prove" | ⚠️ Change the wording to "likely source" |
| AWS status | `iotCore: NOT_DEPLOYED`; Bedrock shows `CONFIGURED`, not "working" | ✅ Honest. Bedrock calls themselves aren't verified |

## 7. Security and operations
- **Rate limits** are kept in memory per Lambda container: fine for a demo, but each container counts separately.
- **Admin key routes** are left over from before Cognito and stay for local development and CLI use.
- **Logging:** requests are logged with method, path, status and time. Petition routes log the user's `sub`, not email.
- **Petition errors:** server 500s still return the raw error message to the client (a minor item, not fixed).
- **Lambda `/tmp`** is per container. The evidence buffer is refreshed by the scheduled sync and the in-memory cache. A cold container starts from the copy bundled at deploy time. Live check: evidence ended on 9 Oct (today), so it's fresh.
- **Scheduled job:** the spec claims an EventBridge rule runs every 30 min. It's **not verified** (V2 plan Phase B checks it). Automatic emails are off unless the opt-in flag is set.
- **SES:** sender `vayuvitals@gmail.com` in us-east-1. Whether the account is still in the SES sandbox is **unknown**. Cognito sign-up emails will use Cognito's built-in sender (low daily limit).

## 8. Tests
`npm test` (Node test runner, 177 tests): 168 pass.
- **Cognito and petition coverage:** `authMiddleware.test.js`, `cognitoFixPlanPhase1.test.js`, `cognitoFixPlanPhase4Mobile.test.js`, `securityHardening.test.js`, and the petition test files.
- **`petitionIntegrationE2E.test.js`** calls the **live** Lambda. Its drafting test fails until Cognito is deployed, and it needs a token afterwards (V2 plan, Phase E).
