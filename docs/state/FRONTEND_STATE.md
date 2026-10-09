# Frontend State (web + mobile)

Snapshot: 9 Oct 2026. Web: React 19 + Vite, `src/`. Mobile: Expo SDK 57 / React Native, `mobile/`.

## 1. Web app

### Views and routing
There's no router library. `src/App.jsx` (464 lines) chooses a view from query parameters and the URL hash. Each heavy view is **lazy-loaded**.

| URL | View |
|---|---|
| `/` (desktop) | Long scroll: CRT panoramic hero → heatmap → more sections |
| `?view=map`, `#map` / `#heatmap` | `DelhiAqiHeatmap` (Mapbox GL + IDW raster), full screen |
| `?view=school` | `SchoolSafetyContainer` (14-day evidence, activity guidance, petition) |
| `?pollutant=<id>` | `PollutantDetailPage` (3D lungs, 24 h curve) |
| `?documentary=<id>` | `PollutantDocumentary` (editorial story pages) |
| `#cargo` / `#truck` | `AtmosphericCargoTruck` |
| `?shield=true`, `?view=monitor`, `#monitor` | `AutonomousMonitorModal` (monitor status and test bench) |

### Main features and files
- **Heatmap:** `src/components/Heatmap/`. `DelhiAqiHeatmap.jsx` is down to 3,327 lines, split from 4,726 into controls, HUD, search, drawer, raster utils and constants.
  - **Mapbox token:** if `VITE_MAPBOX_TOKEN` is missing, the map shows a token-entry message instead of a black screen.
- **Petition:** `src/components/Petition/`, made up of:
  - the modal and its parameter form;
  - the evidence, forecast and school cards;
  - the letter preview;
  - the PDF generator (`pdfGenerator.js`, jsPDF; Hindi is drawn on a canvas with Noto Sans Devanagari);
  - `PetitionsManagerModal.jsx` (new: My petitions and School petitions).
- **School safety:** `src/components/SchoolSafety/`. Evidence is cached in localStorage, missing days show as `NO_DATA`, and the activity verdicts (GO / MODIFY / INDOORS) are rule-based, not AI.
- **3D:** `src/components/ThreeScene/` (lungs, particles), `src/components/MotionHero/` (CRT shader hero).
- **Login (new, uncommitted):**
  - `src/context/AuthContext.jsx`: Amplify v6, sign-up, confirm, sign-in, forgot/reset;
  - `src/components/Auth/AuthModal.jsx` and `AuthHeaderBadge.jsx`;
  - `src/utils/apiFetch.js`: adds `VITE_API_BASE_URL` and the access token, and opens the sign-in modal on a 401.
- **All API calls** go through `apiFetch`; no plain `fetch('/api/...')` is left.

### Environment variables (web)
- `VITE_MAPBOX_TOKEN`: map tiles.
- `VITE_API_BASE_URL`: empty locally, so the Vite proxy sends `/api` to `localhost:3001`. In production, set it to the Lambda URL.
- `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_WEB_CLIENT_ID`: login. With them unset, login shows "not configured", and drafting can't be used.

### Build (vite build, this snapshot)
- **Builds:** successfully.
- **Main entry:** 362 kB (106 kB gzip). It was 2.5 MB before lazy loading.
- **Largest chunks:**
  - `three-vendor` 938 kB (250 kB gzip, loaded by the hero);
  - `PetitionModal` 502 kB (jsPDF + html2canvas, loaded when the petition modal opens);
  - `PollutantDocumentary` 258 kB;
  - `schoolsDirectory` 108 kB.
- **Remaining warning:** some chunks are over 500 kB. Acceptable for a demo.

### Known web issues

| Issue | Severity | Plan |
|---|---|---|
| Save to My petitions sends the wrong format → always 400; the error is only logged to the console | **Blocker** | V2 plan A1 |
| Monitor modal shows dispatch buttons that return 403 in production | High (demo) | V2 plan A7 |
| Web still calls the Vercel API until `VITE_API_BASE_URL` is set | Config | V2 plan D1 |
| 8 UI tests fail since lazy loading (server rendering only shows the loading fallback) | Low | Update the tests to wait for lazy views or render the views directly |
| Unused components: `Dashboard/BedrockAdvisoryCard`, `CitySelector`, `HistoryChart`, `PollutantGrid`, `SimulationControl`, `AwsArchitectureModal`. Unused packages: `leaflet`, `maplibre-gl` | Low | Delete after the demo |
| `src/data/sagemakerModelMetadata.json` is the **old** model's metadata (24 features, MAE 29.29). Nothing imports it now | Low | Delete, or replace with the current metadata (ML_STATE §3) |
| `AwsArchitectureModal.jsx` hard-codes "332,4…" training samples. The modal isn't used | Low | Remove or read from metadata if it's used again |

### Rules for UI text
- Never say "filed" or "dispatched" for petitions. Use Draft saved / Opened in mail / Shared / Marked as sent.
- Simulated values (AQI slider) must say "simulation" on screen.
- Show the data source and the forecast mode (`executionMode`) wherever numbers come from fallbacks or the local model.
- Privacy notice (petitions): saved letters, including name and contact, are stored on the server in ap-south-1, visible only to the owner, and can be deleted. Schools see only the date, authority, subject and air-quality summary.

## 2. Mobile app (`mobile/`)

### Structure
- **`App.js`:** tabs for the map, stations and profile. The profile tab holds the petition docket and login.
- **Components:**
  - `MapCanvas.js` / `.web.js` (about 1,500 lines each), `MapControlDeck.js`, `BottomDialogBox.js`, `TopSearchBar.js`, `BottomNavBar.js`;
  - `PetitionModal.js` (2,205 lines): a 4-step petition builder.
- **Services:**
  - `apiConfig.js`: API URL from `app.json` → `extra.apiUrl`, the Lambda URL;
  - `petitionService.js`: evidence, drafts and the docket, with a 15 s timeout on every call;
  - `authService.js`: Hosted UI + PKCE, tokens in `expo-secure-store`, auto-refresh;
  - `storageAdapter.js`.
- **Data bundled with the app:** `schoolsDirectory.json` (emails removed), `authoritiesConfig.json`, `indiaStations.json`, `indiaBoundary.json`.

### Status

| Item | State |
|---|---|
| Petition flow (evidence → draft → share / copy / email) | Built. Drafting needs login once the backend requires it. **The live backend currently returns 503 for drafting** |
| Login | Code written. **Packages not installed** (`expo-auth-session`, `expo-crypto`, `expo-secure-store`, `expo-web-browser`). The Cognito domain and client ID in `app.json` / `authService.js` are **invented** and must be replaced with real stack outputs (V2 plan A4, D2) |
| Save to server | Wrong format, and silent defaults (`dps_rohini`, `R.K. Puram CAAQMS`, CPCB) (V2 plan A1) |
| Running login on a phone | Needs a **development build** (`npx expo run:android`). Expo Go can't receive the `vayuvitals://` redirect |
| Testing on a real device | Never done (PETITION_HANDOFF P4 #18) |
| Android export | `npm run export:android` exists |

### Mobile rules
- Use only the HTTPS Lambda URL; never `localhost` or `10.0.2.2` in release builds.
- No fake fallbacks. If the server can't be reached, show the error with a retry button.
- `mailto:` can't attach files. Long Hindi text in `mailto:` can be cut off, so prefer Share or Copy.
