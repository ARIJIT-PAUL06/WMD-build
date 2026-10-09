# VayuVitals: Project State (overview)

Snapshot: **9 Oct 2026, ~18:15 UTC**, branch `main`, last commit `dc00f60`, plus a large set of **uncommitted** Cognito changes that another session is still editing.
Details per area: [FRONTEND_STATE.md](FRONTEND_STATE.md) · [BACKEND_STATE.md](BACKEND_STATE.md) · [ML_STATE.md](ML_STATE.md)
Open fix plan: [../COGNITO_FIX_PLAN_V2.md](../COGNITO_FIX_PLAN_V2.md)

## What the project is
An air-quality app for Delhi-NCR built for the WeMakeDevs Bharat Builds hackathon (Track 01: Air):
- a 3D web experience, an India/Delhi AQI heatmap and pollutant documentaries;
- a school-safety dashboard, and a civic petition generator (evidence → bilingual letter → PDF / email / portal);
- a 48-hour PM2.5 forecast (XGBoost, SageMaker);
- an autonomous monitor that runs on a schedule and can email schools (SES);
- an Expo mobile app.

## How it's deployed today

| Part | Where | Status |
|---|---|---|
| Web frontend | Vercel (`https://wmd-build.vercel.app`) | Live. **Not checked in this snapshot** |
| Web API | Vercel serverless (`api/index.js` wraps the same Express app). The plan is to switch the web to the Lambda | Live, but the web is meant to move off it |
| Backend API + scheduled job | AWS Lambda `wmd-backend`, Function URL `https://vtcmfkzdfyd5sy3ugjfwdhlqsy0lcxaj.lambda-url.ap-south-1.on.aws` | Live. `/api/aws-status` reports DynamoDB online, SageMaker `InService`, Bedrock `CONFIGURED` |
| ML forecast | SageMaker Serverless endpoint `wmd-delhi-48h-forecast-endpoint`, plus the same model evaluated locally as a fallback | Endpoint reports `InService` |
| Database | DynamoDB `AirQualityReadings` (live). `Petitions` is defined in the template but **not created yet** | |
| Login | Amazon Cognito: code and template written, **no user pool exists yet** | Not deployed |
| Mobile | Expo app in `mobile/`, calls the Lambda URL | Login packages **not installed** |
| Infrastructure as code | `aws/template.yaml` (plain CloudFormation) + `aws/template-import.yaml` | **Never deployed.** Live resources were created by hand or by scripts |

## Status at a glance

| Area | Works | Broken or at risk |
|---|---|---|
| Live backend | Heatmaps, evidence (fresh: 26 Sep–9 Oct, 14/14 days with data), forecast, monitor status | **Petition drafting returns 503 `auth_not_configured`.** Code requiring login was deployed before Cognito exists. Step 0 of the V2 plan rolls it back |
| Login and saved petitions | Server side mostly correct | Web and mobile send the wrong save format (400). `school_id` immutable. Invented Cognito IDs in mobile. See V2 plan A1–A8 |
| Forecast | Real XGBoost model, real endpoint | Weather inputs misaligned by up to ~23 h. Hour feature uses the server clock. Fixed default weather values when the weather API fails. See ML_STATE |
| Data honesty (AGENTS.md) | Evidence, forecasts and AWS status are labelled with their source/mode | Offline fallbacks still show fixed made-up numbers (AQI 245, PM2.5 120, PM10 = 1.6 × PM2.5, a flat-line forecast on model error). See BACKEND_STATE §6 |
| Tests | 168 / 177 pass (`npm test`, run during this snapshot) | 1 live-API test fails (the 503 above). 8 old UI tests broke when views became lazy-loaded |
| Builds | `npm run build` and `npm run build:lambda` pass | |

## Rules that apply everywhere
- **AGENTS.md (zero-faking):** never invent data, model output, latency or AWS status. If a service or credential is missing, stop and report it.
- **Petition honesty (PETITION_HANDOFF.md):**
  - **Statuses:** only Draft saved / Opened in mail / Shared / Marked as sent. The app never "files" anything.
  - **Evidence:** comes from the server, with its source line.
  - **Placeholders:** sender details stay as placeholders until filled in on the device.
- **Privacy (India DPDP Act 2023):**
  - Saved petitions contain the citizen's name and contact. They're stored in DynamoDB, ap-south-1, and visible only to the owner, who can delete them.
  - School admins see no personal details.
  - The privacy notice text must say exactly this.
- **Email safety:**
  - Automatic emails are **off** unless `ENABLE_AUTONOMOUS_EMAIL_DISPATCH=true`.
  - HTTP dispatch routes return 403 in production.
  - Authority email addresses were verified by a team member. School contact emails must never be petition recipients.

## Docs that are now out of date
These describe an earlier state. Use them for history only:
- `README.md`: claims S3 + CloudFront + API Gateway + IoT Core; actually Vercel + Lambda Function URL, and IoT Core isn't deployed.
- `HANDOVER_CONTEXT.md`: says the petition is "fully implemented", the SageMaker model has 3,264 records and MAE 13.60, and there's a client-side fallback. All superseded.
- `FRONTEND_AUDIT.md`: the 2.5 MB bundle, Mapbox black screen and 4,700-line heatmap issues have since been fixed (see FRONTEND_STATE).
- `PETITION_HANDOFF.md`: still the source of truth for the honesty rules. Its "local only, no login" docket design is being replaced by server-saved petitions.
- `docs/COGNITO_IMPLEMENTATION_PLAN.md`: superseded by `COGNITO_FIX_PLAN.md` and `COGNITO_FIX_PLAN_V2.md`.
- `docs/VAYUVITALS_V2_SPECIFICATION.*`, the PDFs in `public/`: make claims (EventBridge every 30 min, "Real SageMaker + SES dispatches") that are **not verified** in this snapshot. Check them before showing judges.

## Before the demo: must do
1. Roll back or finish the Cognito deploy, so drafting works (V2 plan Step 0 or Phase C).
2. Finish V2 plan Phase A (save format, `school_id`, Lambda data files, mobile IDs).
3. Fix the forecast input alignment (ML_STATE §5.1).
4. Decide what offline fallbacks should show: an honest "data unavailable" message instead of baseline numbers (BACKEND_STATE §6).
5. Re-check every number on slides and PDFs against `ml/model/sagemaker_forecast_metadata.json`.
