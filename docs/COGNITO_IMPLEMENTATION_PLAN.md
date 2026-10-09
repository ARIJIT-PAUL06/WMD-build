# Amazon Cognito Implementation Plan (Final)

Status: Approved plan, not yet implemented.
Region: `ap-south-1`

## Decisions (locked)

| Topic | Decision |
|---|---|
| Source of truth for AWS | `aws/template.yaml` (SAM), updated to match what's deployed |
| Citizen login for petitions | **Required** |
| Operators | **None.** No human role can trigger dispatch over HTTP |
| School admins | **Yes**, promoted only by the team via a CLI script |
| Sign-in method | Email + password (verification code + forgot password) |
| Emergency/advisory emails | Scheduled (EventBridge → Lambda) or team CLI only; web modal becomes read-only |
| Mobile URL scheme | `vayuvitals://` |
| Web URL | `https://wmd-build.vercel.app/` (+ `http://localhost:5173/` for local dev) |
| AWS credentials | From `.env` (never committed; `.env` is git-ignored) |

## Architecture at a glance

- **Cognito User Pool** with groups `citizen` and `school_admin`, and the custom attribute `custom:school_id`, which only admins can write.
- **App clients**
  - `web`: public, Auth Code + PKCE. Callbacks: `https://wmd-build.vercel.app/` and `http://localhost:5173/`.
  - `mobile`: public, Auth Code + PKCE. Callback: `vayuvitals://auth/callback`.
  - `iot-ingest`: confidential, client-credentials grant, custom scope `ingest/write`.
- **Backend:** the Express app on Lambda `wmd-backend` (Function URL) checks JWTs itself with `aws-jwt-verify`.
- **Email:** Cognito sends through our SES sender (`SES_SENDER_EMAIL`).
- **Data:** a new DynamoDB `Petitions` table (PK `userSub`, SK `petitionId`, GSI `schoolId`).

## Endpoint access matrix

| Access | Routes |
|---|---|
| Public | `/`, `/api/health`, `/api/air-quality`, `/api/history`, heatmaps, `/api/sagemaker/forecast`, `/api/source-attribution`, `/api/directory/*`, `/api/spatial-grids/*`, `/api/telemetry/compliance/:id`, `/api/petition/authorities`, `/api/petition/schools`, `/api/petition/evidence`, `/api/petition/forecast`, `/api/monitor/status`, `/api/advisory/preview-630` |
| Citizen login | `/api/petition/generate-draft`, `/api/petition/polish-draft`, `/api/bedrock-advisory`, `/api/gemini-advisory`, new `/api/petitions` (create/list mine) |
| `school_admin` only | new `GET /api/petition/school` (only their `custom:school_id`) |
| Machine token (`ingest/write`) | `/api/sensor-ingest`, `/api/telemetry/sync-grids` |
| Not exposed over HTTP (EventBridge / CLI only) | `/api/monitor/run-cycle`, `/api/monitor/clear-debounces`, `/api/monitor/block-emergency`, `/api/monitor/predictive-advisories`, `/api/monitor/chronic-petitions`, `/api/advisory/test-dispatch`, `/api/advisory/evaluate-morning`, `/api/advisory/emergency-midday`, `/api/ses/*` |

Protected routes **fail closed**: if `COGNITO_USER_POOL_ID` or the client IDs are missing, they return 503 `auth_not_configured`. There is no dev bypass.

---

## Phase 1: Foundation (infra + backend)

**Goal:** Cognito exists as code, and the API enforces the access matrix.

### 1.0 Pre-flight (read-only, report before creating anything)
- Confirm the identity behind the credentials (`sts get-caller-identity`) and its permissions for CloudFormation, Cognito, DynamoDB, Lambda, EventBridge and SES.
- **SES:** check whether the account is in sandbox. If it is, request production access (otherwise signup emails only reach verified addresses).
- List existing resources: Lambda `wmd-backend` and its Function URL, the `AirQualityReadings` table, any EventBridge rules, and the S3/CloudFront resources (the frontend is on Vercel, so these may not exist).
- Report findings and stop for confirmation.

### 1.1 Make `aws/template.yaml` match reality
- Replace `BharatBuildsAirQualityFunction` with `wmd-backend` (Function URL, real handler/runtime from `server/lambda.js` and the `build:lambda` output).
- **Import** the existing `AirQualityReadings` table and `wmd-backend` into the stack (`DeletionPolicy: Retain`) instead of recreating them.
- Remove or mark the S3/CloudFront resources based on what pre-flight finds; frontend hosting is Vercel.
- Add an EventBridge schedule that invokes `wmd-backend` directly for the autonomous monitor (if pre-flight shows no real rule exists).
- Lambda env: `FRONTEND_URL=https://wmd-build.vercel.app`, `COGNITO_USER_POOL_ID`, `COGNITO_WEB_CLIENT_ID`, `COGNITO_MOBILE_CLIENT_ID`, `COGNITO_INGEST_CLIENT_ID`, `PETITIONS_TABLE_NAME`.

### 1.2 Add Cognito resources
- User Pool: email as username, password policy (min 8, upper/lower/number), email verification, SES email config, deletion protection on.
- Groups `citizen` and `school_admin`, and the custom attribute `school_id` (not writable by app clients).
- App clients `web`, `mobile` and `iot-ingest`, plus a resource server `ingest` with scope `write`.
- Managed Login domain (Cognito prefix domain).
- Post-confirmation Lambda trigger that adds each new user to `citizen`.

### 1.3 Petitions table
- `Petitions`: PK `userSub`, SK `petitionId`, GSI `schoolId-createdAt`, on-demand billing, PITR on.

### 1.4 Backend
- `server/authMiddleware.js`: `requireAuth({ groups?, scope? })` using `aws-jwt-verify` (checks issuer, client ID, `token_use=access`, expiry, group/scope).
- Apply it per the access matrix in `server/index.js`.
- Remove HTTP exposure of the dispatch routes in production. Move their logic behind the scheduled-event handler in `server/lambda.js` and a team CLI script.
- New `/api/petitions` routes backed by the `Petitions` table.

### 1.5 Verify (live AWS)
- Deploy the stack and run the post-deploy checks.
- A real test user signs up, verifies email, and gets tokens.
- With a token, petition routes return 200. Without one, 401. Dispatch routes are unreachable.
- An `iot-ingest` client-credentials token can call `/api/sensor-ingest`.
- The EventBridge rule fires, and CloudWatch logs show the monitor ran.
- Unit tests for the middleware in `tests/` (locally generated test keys, test-only).

---

## Phase 2: Citizen login (web + mobile)

**Goal:** citizens must sign in to file petitions, on both apps.

### 2.1 Web (Vite/React)
- Add Amplify Auth v6, configured from `VITE_COGNITO_*` env vars (set them in Vercel project settings).
- `AuthContext` with sign-up, confirm code, sign-in, sign-out and forgot/reset password.
- `apiFetch` wrapper that attaches `Authorization: Bearer <access token>` and refreshes automatically.
- Header shows login state. `PetitionModal` requires login before submitting.
- `AutonomousMonitorModal` becomes read-only (status + previews; dispatch buttons removed).
- `AwsArchitectureModal`'s sensor-ingest demo call is removed or shown as documentation only.

### 2.2 Mobile (Expo)
- `app.json`: `"scheme": "vayuvitals"`.
- `expo-auth-session` (PKCE) through Cognito Managed Login, with tokens in `expo-secure-store`.
- `petitionService.js` sends the token and uses `/api/petitions` instead of local-only storage.
- Old app builds without login get a 401 with a clear "please update the app" message.

### 2.3 Verify
- Full sign-up → verify → login → file petition → see it in "My petitions", on the web (Vercel) and on the mobile app.
- Forgot-password flow delivers an email through SES.

---

## Phase 3: School admins + hardening

**Goal:** school admins see their school's petitions, and the system is production-safe.

### 3.1 School admins
- `scripts/cognito_promote_school_admin.js <email> <schoolId>`: validates `schoolId` against `schoolsDirectory.json`, adds the user to `school_admin` and sets `custom:school_id`. Run by the team only, with AWS credentials.
- `GET /api/petition/school`: queries the `schoolId` GSI using the token's claim only (never a query param).
- A simple "School petitions" view on the web for `school_admin` users.

### 3.2 Hardening
- MFA (TOTP) required for `school_admin`, optional for citizens.
- Tokens: access/ID 1 hour, refresh 30 days with rotation.
- Per-user rate limits on petition routes (replacing per-IP limits for logged-in routes).
- CloudWatch alarms: 401/403 spikes, failed sign-ins, and post-confirmation trigger errors.
- Log the user's `sub`, never email/PII.

### 3.3 Cleanup and docs
- Remove the AsyncStorage-only petition storage path.
- Update `README.md` and `PETITION_HANDOFF.md`: auth flow, env vars, the admin promotion runbook, and how to rotate client settings.

---

## Risks

| Risk | Mitigation |
|---|---|
| SES sandbox blocks signup emails | Checked in pre-flight; request production access early |
| Importing existing resources into CloudFormation goes wrong | `DeletionPolicy: Retain`, change-set review before execute, PITR on tables |
| Vercel preview URLs aren't registered callbacks | Login works only on production + localhost; acceptable, documented |
| Old mobile builds break on submit | Clear 401 message; release the new build alongside the backend |
| Missing Cognito config | Fail closed with an explicit 503, never a silent pass |
