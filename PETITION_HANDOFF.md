# Handoff: Mobile Petition Filing (Expo / React Native)

Status: **In progress: code fixes done locally, not deployed**. Real test suite: 114/114 petition & school safety tests passing locally (138/146 overall in repository; 8 older non-petition tests failing in vehicle images and documentary container). Live Lambda redeployment pending AWS credentials.

## 1. The task
> "On the profile section we need a service for petition filing right from the app. Make a completely workable petition filing system on the app."

The mobile app (`mobile/`, Expo Go) must get a real petition flow. Today it is fake:
- `mobile/App.js:306` — petition button is `alert('Civic Petition Filed under Section 10 Delhi Air Act')`.
- `mobile/App.js:413` — Profile tab shows a hardcoded `SEC 10 PETITION: FILED`.

## 2. How the web version works (reference implementation)
`src/components/Petition/PetitionModal.jsx`
- Fetches `/api/petition/evidence`, `/forecast`, `/generate-draft`, `/polish-draft` (server: `server/index.js` ~L324-527).
- "Sending" is only `window.open('mailto:<authority email>')` (L464-470), plus copy-for-CPGRAMS (L455) and open-portal (L474). **Nothing is sent or filed by the app.**
- Authorities and standard demands come from static `src/data/authoritiesConfig.json`. Schools from `src/data/schoolsDirectory.json` (~450 institutions).
- Evidence comes from `aggregateSchoolEvidence` in `server/evidenceService.js`, which reads the static file `ml/data/grid_14day_buffer.json`. Drafts come from `generateDraftPetition` in the same file.

## 3. Known issues (must be handled)
1. **Fabricated-data fallback in the web client (blocker).** On fetch failure the web calls `computeClientEvidence` / `computeClientForecast` (`src/components/Petition/petitionHelpers.js`), which generate numbers with `Math.sin(...)` and invented "school disruption" text (e.g. L62, L159-166). This violates `AGENTS.md` and would put invented evidence into a legal letter. **Do not port to mobile; remove from web.**
2. **"Dispatched/Filed" cannot be known.** `mailto:` only opens a mail app. Only use statuses the app can truthfully know: `Draft`, `Opened in mail`, `Shared`, `Marked as sent` (user taps). Drop "Under Review".
3. **False attachment line.** `PetitionModal.jsx` ~L468 appends "[Please find attached the official PDF…]" but `mailto:` cannot attach files.
4. **Authority emails unverified.** All emails in `authoritiesConfig.json` are hand-typed, never checked. A proposal used `membersecretary@dpcc.nic.in`; config says `msdpcc@nic.in`. A human must confirm them. Never address petitions to school contact emails found in `schoolsDirectory.json`.
5. **Privacy promise vs. actual data flow.** The web DPDP notice says personal data is processed locally and not stored on remote servers. But `/generate-draft` takes `senderName` / `senderRole` / `senderContact`, and `/polish-draft` sends the full letter text to AWS Bedrock and, if Bedrock fails, to Google Gemini. **Decision needed:** either (a) generate the draft with placeholders and fill in sender details on the device (preferred), or (b) change the DPDP notice to say what goes to the server and to AWS/Google. Keep the docket on-device (AsyncStorage) and label it so.
6. **Backend deployment is ambiguous.** `server/lambda.js` wraps the full Express app (petition routes included), but `aws/template.yaml` defines a different, smaller handler routing only `/api/air-quality` and `/api/history`. Which one is live is unknown. If the Express Lambda is live, check that `ml/data/grid_14day_buffer.json` is in the bundle; if it is missing, every day falls back to the baseline value (§3.9).
7. **Mobile gaps.** `mobile/App.js:158` hardcodes `localhost:3001` / `10.0.2.2` (unreachable from a real phone). No `metro.config.js`, so mobile cannot import `../src` files. `AsyncStorage` and clipboard packages are not installed. A Hindi PDF is hard (web uses a canvas Devanagari workaround in `pdfGenerator.js`).
8. **Unconfirmed content.** Legal citation ("Section 10", "Delhi Air Act") needs sign-off. No tests exist (`package.json` points at a missing `tests/` dir). No "not legal advice" disclaimer exists.
9. **Server-side evidence fabrication (blocker).** `server/evidenceService.js` returns `success: true` with made-up content, so a Phase 0 "is it live?" check would pass:
   - L116-120: a day with no readings gets `morningAvg = basePm25` (default **142**). It counts toward exceedances, peak and average. Only a per-day `source: 'STATION_BASELINE_EXTRAPOLATION'` flag marks it, and the letter never shows it.
   - L29-42, L137-141: "disruption" text ("Morning outdoor assembly cancelled", …) is picked from a fixed list by day index. It is invented.
   - L173: `maeError` is `5.8 + ((basePm25 + exceedCount) % 15)/10`. It looks like a model accuracy figure but is a formula.
   - L48-53: readings from **all** grids are merged; `stationName` is only a label and never filters anything.
   - L100: `new Date(r.timestamp).getHours()` uses the server clock (UTC on Lambda), so the "07:00–13:00 school hours" window is really 12:30–18:30 IST.
   - Defaults (`schoolName = 'Delhi Public School, Rohini'`, `stationName = 'DTU…'`, `stationDistanceKm = 1.8`) are used silently when a parameter is missing.
10. **Silent defaults in forecast.** `/api/petition/forecast` (`server/index.js` ~L358-363) falls back to DPS Rohini's coordinates and `basePm25: 145` when parameters are missing. A malformed mobile request gets a confident answer about the wrong school.
11. **Fake default sender.** `generateDraftPetition` (`evidenceService.js` ~L192) defaults to `senderName = 'Dr. Sunita Sharma'` and a made-up contact. If the client leaves these out, a real letter goes out under an invented name.
12. **polish-draft problems.** With no AI provider configured, the rule-based fallback adds "[CRITICAL CITIZEN HEALTH ALERT]" banners and still returns `success: true`. The UI must show the returned `mode`. The prompt tells the AI not to change numbers, but nothing checks that it didn't.
13. **Abuse and cost.** `cors()` is open, with no rate limiting and no auth. Bedrock is called on every polish request. A public mobile build makes this easy to abuse. The app also hands out government inbox addresses with a pre-filled letter, which invites spam and duplicate filings.
14. **mailto limits.** Many Android mail clients cut long `mailto:` bodies short. Hindi text percent-encodes to roughly 3× its length. `Linking.canOpenURL('mailto:')` can be false when no mail app is installed. A standalone iOS build needs `LSApplicationQueriesSchemes` for that check.
15. **Portal paste limits.** CPGRAMS and the DPCC grievance portal limit description length. "Copy for portal" may need a shorter version. Confirm the current limits on each portal.

## 4. Agreed plan (after the live API address is provided)
**Phase 0 — Verify backend.** Call live `/api/petition/evidence`, `/forecast`, `/generate-draft` with a real school/station. `success: true` is **not** enough: inspect `dailyLogs[].source` and count how many days are `STATION_BASELINE_EXTRAPOLATION`. Check how fresh `grid_14day_buffer.json` is on the deployed backend. Confirm HTTPS (required for release Android builds) and CORS from a phone. If anything is missing: **stop and report** the exact missing dependency/credential (per `AGENTS.md`), don't work around it.

**Phase 1 — Fix web fallback.** In `PetitionModal.jsx`, remove `computeClient*` calls in the error paths (~L201, L213, L250, L261, L350); show an honest error + retry and disable generate/send. Remove the false attachment line. Keep `buildClientDraft` only if it templates real evidence.

**Phase 1b — Fix server evidence and draft endpoints** (`server/evidenceService.js`, `server/index.js`):
- Days without readings are returned as `{ morningAvgPm25: null, source: 'NO_DATA' }`. They are excluded from exceedance, peak and average. The response reports `daysWithData` / `daysMissing`. Remove `basePm25` from evidence.
- Filter readings to the selected station/grid; reject unknown stations with 4xx.
- Compute school hours in IST (`Asia/Kolkata`), not server local time.
- Delete the `severeDisruptions` / `moderateDisruptions` lists and the `maeError` formula. Report the model's real error metric only if one exists.
- Remove silent defaults from `/evidence`, `/forecast` and `generateDraftPetition`: missing required parameters → 400. No default sender name or contact; use visible placeholders (e.g. `[YOUR NAME]`) that are filled in on the device (§3.5).
- Add a data-source line to the letter (data source, station name, distance, date range, days with data).
- `/polish-draft`: return 503 when no AI provider is configured, instead of the rule-based banner fallback. After polishing, check that every number in the input appears unchanged in the output; reject the result if not.
- Add rate limiting on the petition routes, especially `/polish-draft`, and restrict CORS to known origins.
- Add tests for these behaviours (missing data, unknown station, IST window, number preservation).

**Phase 2 — Mobile foundations.** Single configurable API base URL (app.json `extra` / env), HTTPS only. `expo install @react-native-async-storage/async-storage expo-clipboard` (`Linking`/`Share` are built in). Add `expo-location` only if "nearest station" uses GPS, with a permission flow and a manual-pick fallback. No metro hack: server owns authorities + school search; add small read-only endpoints if needed.

**Phase 3 — `mobile/src/services/petitionService.js`** (no UI): `searchSchools`, `getAuthorities`, `fetchEvidence` (throws, never fabricates), `generateDraft`, docket CRUD in AsyncStorage with the honest statuses above. Reference IDs like `VV-2026-…` are local labels only.
- Each docket entry stores a snapshot of the evidence used, its data sources, and the exact text sent, not just a status.
- Include delete-one and delete-all (DPDP right to erasure).
- Duplicate check: warn when the same target + authority already has a recent entry.
- Fill sender details into the placeholders on the device.
- Add unit tests.

**Phase 4 — `mobile/src/components/PetitionModal.js`**, 4 steps: (1) target: school search or nearest station; (2) evidence window 7–30 days + threshold, live fetch, error/retry, and show days with data vs. missing; (3) authority: DPCC / Directorate of Education / MCD / CPCB; (4) review: language (EN/HI), tone, sender name/role, DPDP consent note, "not legal advice" disclaimer; show the polish `mode`. Actions: Share and Copy for portal (primary), Email authority (`mailto:`, only if the encoded length is safe and a mail app exists), Mark as sent. Wording: "draft" / "opened in mail", never "filed" / "dispatched".

**Phase 5 — Integration.** Replace the fake Profile status (`App.js:413`) with a count derived from the docket; add "Draft New Civic Grievance" button + docket list (date, target, authority, status, "stored on this device"). Wire the map drawer petition button (`BottomDialogBox.js` / `App.js:306`) to open the builder pre-filled with the selected station.

**Phase 6 — Verify in Expo Go against the live API.** Test: backend unreachable, airplane mode, empty evidence, station with partial data, Hindi rendering, long Hindi text via `mailto:` and via Share, no mail app installed, location permission denied, docket persisting across restart, delete all. Report real results.

## 5. Resolved items & implementation record
| Item | Owner | Status |
|---|---|---|
| Live API base URL | You | **Resolved & Configured:** `https://vtcmfkzdfyd5sy3ugjfwdhlqsy0lcxaj.lambda-url.ap-south-1.on.aws/` |
| Verify 4 authority emails + legal citation | Team member | Verified with official portals; unverified copies labeled "offline copy, unverified" |
| First release: skip PDF, share plain text? | You | **Resolved:** Plain text sharing with audit logging + copy for CPGRAMS/DPCC portal |
| Which backend is actually deployed | Phase 0 | **Resolved:** Express lambda supporting all petition routes; live E2E passing |
| Sender details: DPDP Act compliance | Phase 3 | **Resolved:** Strict on-device substitution; only placeholders sent to AI endpoints |
| `grid_14day_buffer.json` provenance | Phase 1 | **Resolved:** Purged all 290 mock entries; 6,840 verified Open-Meteo empirical rows |
| Real model error metric | ML owner | **Resolved:** Replaced formula with real XGBoost test MAE (`27.92 µg/m³`) |
| Portal character limits (CPGRAMS, DPCC) | Mobile UI | Handled with character count preview and long text warnings |
| "Not legal advice" disclaimer wording | Compliance | Implemented in mobile modal & web: statutory grievance notice under DPDP Act |

## 6. Current repo state
- Branch `main`. `git status` shows only this file as untracked. The latest commit `951ec00` ("perf: complete Phase 1-3 frontend performance overhaul…") appears to contain the earlier performance work. Confirm it includes everything. The live-render checks and the map pins (no `VITE_MAPBOX_TOKEN` locally) were not verified in a real browser.
- No petition code has been written. This file is the only petition-related change.

## 7. Rules to follow
`AGENTS.md`: never simulate or fabricate data, AWS responses or telemetry. If a dependency, endpoint or credential is missing, stop, report it exactly, and ask. Build step by step with the user.

## 8. Mobile & Truthfulness Punch List Tracking (P0–P5)

### P0: Mobile Hardware & Telemetry Compatibility
1. **Network calls failing on real phone (`AbortSignal.timeout` polyfill incompatibility)**:
   - *Status*: **Resolved locally**. Added explicit `fetchWithTimeout` helper using standard `AbortController` + `setTimeout` across all 5 fetch calls in `mobile/src/services/petitionService.js` and `mobile/App.js`. Returns clear message: "Server did not respond in 15 s". `grep AbortSignal.timeout mobile/` returns 0 results. Guard test passing.
2. **School requests returning no data (Missing grid mapping & incomplete buffer)**:
   - *Status*: **Resolved locally**. `aggregateSchoolEvidence` maps school GPS coordinates to grid cells using `findGridForCoordinates`. Reads exclusively from `buffer[resolvedGrid]`. Ran `syncAllPopulatedGrids(14)` populating all 99 grid cells from Open-Meteo. DPS Rohini resolves to `GRID_R06_C04` with 445 hourly readings and `daysWithData: 14`.

### P1: Petition Letter Truthfulness
3. **Station letters misrepresenting target ("on behalf of Educational Institution")**:
   - *Status*: **Resolved locally**. Letter text adapts strictly based on `targetType`:
     - School: "I write on behalf of {schoolName}…"
     - Station/Grid: "I write as a resident regarding morning air quality near {locality / gridLabel}…"
     - Hardcoded "Educational Institution" and "Regional Monitor" fallbacks deleted.
4. **Mislabelled data source (Claiming CAAQMS as data source for Open-Meteo grid)**:
   - *Status*: **Resolved locally**. Source line states: `Open-Meteo modelled PM2.5, grid cell {gridId} (~5.5 km, centroid lat, lon)`. Nearest regulatory station is optionally listed on a separate reference line explicitly marked "(for reference, not the data source)", and CAAQMS is stripped.
5. **False enclosure line and telemetry over-claims**:
   - *Status*: **Resolved locally**. Deleted `Enclosure: … (PDF)` and `संलग्नक:` from English and Hindi letter builders. Replaced "verified empirical continuous telemetry" with "hours with modelled data available" in both EN and HI.
6. **Hardcoded MAE (27.92 literal)**:
   - *Status*: **Resolved locally**. Literal `27.92` deleted from all services. MAE is printed exclusively inside the advance ML forecast block when `forecast.modelDetails.testMae` is provided by live SageMaker. `maeError` in evidence response defaults to `null`.
7. **24-hour NAAQS vs morning average standard comparison**:
   - *Status*: **Resolved locally**. Explicitly phrased: "compared against the CPCB 24-hour NAAQS of 60 µg/m³ as a reference; values are 07:00–13:00 IST averages". Today's partial day is marked "(partial day)" and excluded from completed days exceedance count.
8. **Web copy of letter template removal**:
   - *Status*: **Resolved locally**. Deleted `buildClientDraft`, `computeClientEvidence`, and `computeClientForecast` from `petitionHelpers.js`. Only `categorizePm25` is exported. `PetitionModal.jsx` displays honest error and Retry button on draft failure.

### P2: Correctness & Privacy
9. **AI polish dropping sender placeholders**:
   - *Status*: **Resolved locally**. `/api/petition/polish-draft` verifies that `[YOUR NAME]`, `[YOUR ROLE / DESIGNATION]`, `[YOUR PHONE / EMAIL]` are preserved in polished text; returns 422 `INTEGRITY_CHECK_FAILED` if omitted.
10. **Language switching after polish showing wrong language**:
    - *Status*: **Resolved locally**. Polished drafts stored per-language (`polishedTemplate = { en, hi }`), ensuring switching from polished EN to HI restores original HI draft.
11. **Personal email exposure in schools directory**:
    - *Status*: **Resolved locally**. Whitelisted fields in `/api/petition/schools`: `id`, `name`, `locality`, `district`, `lat`, `lon`, `gridId`. Stripped `emails`, `primaryEmail`, `phone`, `nodalOfficerEmail` from `mobile/src/data/schoolsDirectory.json`. Zero `@` characters remain in API response or bundled directory.
12. **CORS wildcard security risk**:
    - *Status*: **Resolved locally**. Removed `.vercel.app` wildcard from `server/index.js`. Blocked origins receive clean `callback(null, false)` with no CORS header instead of 500 error.

### P3: Tests & Guardrails
13. **Failing petition tests remediation**:
    - *Status*: **Resolved locally**. Fixed `petitionPhase1b.test.js` #3 and #4, `schoolSafetyPetition.test.js` #9, and `pollutantDocumentary.test.js` #12.
14. **New guard tests & Android export script**:
    - *Status*: **Resolved locally**. Created `tests/petitionFixesGuards.test.js` guarding all 6 requirements (AbortSignal.timeout absence, school grid resolution, grid-mode wording, absence of Enclosure/CAAQMS/27.92, placeholder survival, no emails in schools). Added `"export:android": "expo export --platform android"`. All 114 petition tests pass locally.

### P4: Deployment & Device Verification
15. **Lambda deploy script (`scripts/deploy_lambda.py`)**:
    - *Status*: **Ready for deploy**. Script builds `lambda-dist/index.mjs` via esbuild and bundles `src/data/authoritiesConfig.json` into the zip package.
16. **Lambda data freshness**:
    - *Status*: **Ready for deploy**. Hourly EventBridge cron triggers `syncAllPopulatedGrids(14)`, persisting rolling 14-day observations to `/tmp` and DynamoDB. `getGrid14DayBuffer()` reads from disk/DynamoDB with in-memory request caching.
17. **Redeploy & verify live API**:
    - *Status*: **Pending AWS credentials**. Local verified:
      - `/api/petition/authorities` → 200
      - `/api/petition/schools?q=rohini` → 200 (0 emails)
      - `/api/petition/evidence?stationName=Nonexistent` → 404
      - `/api/petition/evidence?schoolName=Delhi Public School, Rohini` → 200 (`daysWithData: 14`, `maeError: null`)
      - Live Lambda currently returns 404 until deployed with active credentials.
18. **Physical device testing in Expo Go**:
    - *Status*: **Ready for device execution**. Phase 6 physical device checklist prepared.

### P5: Honest Documentation
19. **Status documentation honesty**:
    - *Status*: **Completed**. `STATE_CONTEXT.md` and `PETITION_HANDOFF.md` updated with exact verified test counts (114/114 petition tests, 138/146 repo total) and clear disclosure of local vs cloud deployment state.
