# PM2.5 Documentary — Fix Plan (review of the current implementation)

Reviewed on 10 Oct 2026. Branch `Aryan`, uncommitted work. Page: `http://localhost:5174/?documentary=pm25`, checked at 1440×900 and 375×812, compared with `docs/reference/pm25-wmd-reference.webp`.
Companion docs: [PM25_DOCUMENTARY_REDESIGN_PLAN.md](PM25_DOCUMENTARY_REDESIGN_PLAN.md) (the spec) and [DOCUMENTARY_THEMES_PLAN.md](DOCUMENTARY_THEMES_PLAN.md).

## 0. Before starting
1. **Only one agent edits `src/components/PollutantDocumentary/` at a time.** Stop the agent that built this, or hand this plan to that same agent.
2. **Commit the current state first** as a checkpoint so every fix below can be diffed and reverted:
   `git add -A && git commit -m "wip: WMD documentary redesign (pre-fix checkpoint)"`
3. Work through the fixes in priority order. **P0 items are blockers.** Several P1 visual problems disappear on their own once P0-1 is fixed, so re-check visually after P0-1 before touching any P1 item.

---

## 1. Summary of what's wrong

| # | Priority | Problem | Root cause |
|---|---|---|---|
| P0-1 | Blocker | Hero, header, strip and footer don't use the new design (sans-serif white "PM2.5", red tagline, pill-shaped header, rounded strip panel, green footer line) | The old `PollutantDocumentary.css` is imported **after** `wmd/WmdDocumentary.css` and still styles the reused hook classes |
| P0-2 | Blocker | `App.jsx` lazy-loading reverted for Mapbox heatmap, School Safety and the Documentary | Unrelated edit by the agent. It puts ~2 MB back into the main bundle |
| P0-3 | Blocker (AGENTS.md) | Model data labelled as "CAAQMS stations", "VERIFIED SENSOR", "Beta Attenuation Monitors"; hard-coded fallback presented as live; other pollutants silently fall back to PM2.5 values; illustrative diurnal values titled "24-HOUR PROFILE · DELHI" | Labels don't follow `station.source`; baseline has no flag |
| P0-4 | Blocker | Mobile hero broken: title and text invisible or clipped, the CTA cut off by the next band | Fixed hero height + legacy column width (231 px) + scroll-scrub opacity 0.4 |
| P0-5 | Blocker | Page shows an empty dark screen for ~3–5 s before the header and title appear | Needs diagnosis (§P0-5) |
| P1-1…10 | Fidelity | Differences from the reference in each band | See §3 |
| P2 | Hygiene | Dev overlay ships to production, reference-mock-up crops in `public/`, duplicate `.jpg` files, hidden screen-reader junk text, sentence-splitting bug | See §4 |

---

## 2. P0: blockers

### P0-1 CSS cascade: legacy styles override the redesign
**Evidence (computed styles at 1440 px):**
- `.wmd-hero__title`: `Space Grotesk 800, #fff`. Should be Playfair Display 600, bone.
- `.wmd-hero__headline`: `rgb(239,68,68)` red, wraps to 2 lines. Should be Cormorant Garamond, bone, 1 line.
- `.wmd-hero__kicker`: IBM Plex Mono, red. Should be Archivo, bone.
- `.wmd-hero__desc`: Space Grotesk 15 px, slate. Should be Cormorant Garamond 22 px, bone.
- `.wmd-header`: `border-radius: 9999px; backdrop-filter: blur(20px); height: 52px`. These are old `.documentary-nav` pill styles. The "WMD" logo is clipped at the top edge.
- `.wmd-hero__photo`: `opacity: .22`. The skyline is barely visible, so the hero reads as a black screen.
- Strip root `.documentary-data-panel` and tiles `.doc-pollutant-chip` take the old rounded translucent panel and chip styles.
- Footer `.doc-credo-line-3` is green (old accent).

**Cause:** `PollutantDocumentary.jsx` imports `./wmd/WmdDocumentary.css` and then `./PollutantDocumentary.css`. The hook classes kept for the animation engine (`.documentary-nav`, `.documentary-pollutant-name`, `.documentary-hero-photo-layer`, `.documentary-data-panel`, `.doc-pollutant-chip`, `.doc-credo-line-*`, …) still have old rules at the same or higher specificity. That includes old media queries around lines 2030–2130 and reduced-motion blocks around 3150–3210.

**Fix (do both):**
1. **Cascade layers.** Put the old stylesheet in a lower layer and the new one in a higher layer, so the new one wins regardless of specificity or import order:
   - first line of `PollutantDocumentary.css`: wrap the whole file in `@layer legacy { … }`
   - wrap `wmd/WmdDocumentary.css` in `@layer wmd { … }`
   - declare the order once, at the top of `WmdDocumentary.css`: `@layer legacy, wmd;`
   - swap the imports so `PollutantDocumentary.css` comes first. Belt and braces: both files must be layered, because unlayered CSS beats layered CSS.
   - GSAP writes inline styles, which still beat both layers. That's intended.
2. **Delete the dead legacy rules** for components that no longer exist (`DocumentaryNav`, `DocumentaryHero`, `DocumentaryDataPanel`, `PollutantValue`, `DocumentaryFooter`): every rule whose selectors only match those components' markup, including their media-query and reduced-motion copies. Keep any rule that also styles a kept section (`DocumentaryPinnedStory`, `DocumentarySection`, `DocumentaryImageSection`, `DocumentaryDataSection`, `common/*`). Before deleting a selector, `grep -rn "<class>" src/` to confirm nothing in the kept components uses it.

**Acceptance:** the computed styles listed above match redesign plan §3.2, and no legacy accent colours (`#ef4444`, `#10b981`, `--pollutant-accent`) appear inside the new bands.

### P0-2 Restore lazy loading in `src/App.jsx`
The diff replaced `React.lazy(() => import(...))` with static imports for `DelhiAqiHeatmap`, `SchoolSafetyContainer` and `PollutantDocumentary`. Revert those three lines to `React.lazy` exactly as in `HEAD`. If the agent did it to make UI tests pass (FRONTEND_STATE lists "8 UI tests fail since lazy loading"), fix the tests instead (render the component directly, or `await` the lazy view). Don't change the app.
**Acceptance:** `git diff HEAD -- src/App.jsx` is empty, and `npm run build` shows the Mapbox chunk is no longer in the entry chunk (entry ≈ 362 kB as in FRONTEND_STATE).

### P0-3 Data honesty (AGENTS.md zero-faking directive)
Facts checked against the running API: `/api/delhi-heatmap` returns **51 points whose `source` is `"Live Open-Meteo (CAMS / Copernicus Model)"`**. They're model grid values, not CAAQMS monitors, and there's **no `nh3`** field.

| Where | Current | Fix |
|---|---|---|
| `wmd/WmdCoverageBand.jsx` caption (~l.159) | `… {n} CAAQMS STATIONS · DELHI NCR` | Build the label from the distinct `station.source` values, e.g. `51 MODEL POINTS · OPEN-METEO CAMS · DELHI NCR`. Say "CAAQMS" only if `source` actually says so. |
| `wmd/WmdContourMap.jsx` caption (~l.167) and "Insufficient CAAQMS…" (~l.137) | "IDW ESTIMATE FROM 51 CAAQMS STATIONS" | Same source-derived label: "IDW ESTIMATE FROM 51 OPEN-METEO CAMS POINTS · {time}" |
| `wmd/WmdContourMap.jsx` value pick (~l.24–31) | `s[pollutantKey] ?? s.pm25`, so NO₂/NH₃ maps silently show PM2.5 | Use only `s[pollutantKey]`. If fewer than 3 points have it, show "No spatial data for {symbol} from current sources". |
| `PollutantDocumentary.jsx` `DEFAULT_DELHI_BASELINE` | Hard-coded numbers labelled `source: 'CAAQMS BAM-1020 Continuous'`, `status: 'Active'`, `lastUpdated: new Date()` (a fresh fake timestamp) | Add `isBaseline: true` on the object and each station. Set `source: 'Static fallback (not live)'` and `lastUpdated: null`. **Ask the user where these numbers came from.** If nobody can source them, remove the fallback and render an explicit "Live data unavailable: {error}" state instead. |
| `PollutantDocumentary.jsx` props to the WMD bands | `internalLiveData?.stations \|\| DEFAULT_DELHI_BASELINE.stations` | Pass whatever data you have, plus `isBaseline` / `dataSource`, so each band can label the data. |
| `wmd/WmdImpactRow.jsx` | `isBaseline = !currentStation \|\| currentStation.isFallback` (`isFallback` never exists, so it's never true when the data is the baseline) | Use the new `isBaseline` flag. Value suffix: "(static fallback)". |
| `wmd/WmdBarChart` title "24-HOUR PROFILE · DELHI" | Plots `section06.diurnalPoints`: **6 hand-authored typical values** (165, 188, 215, 110, 92, 178) | **Decision for the user:** (a) retitle "TYPICAL DAILY PATTERN · ILLUSTRATIVE" and cite the literature source in the data file, or (b) plot real readings from `GET /api/history?limit=48` (DynamoDB, `mode: AWS_DYNAMODB`). For (b), exclude records whose `advisory` contains "test" and bucket by hour. Default: (a). |
| `DocumentaryDataSection.jsx` (~l.266–290) | "CAAQMS REGIONAL GROUND STATIONS", "Continuous Beta Attenuation Monitors & Spectrometry", badge "VERIFIED SENSOR" | Heading "MONITORING POINTS". Subtitle and badge come from `station.source` (e.g. "MODEL · OPEN-METEO CAMS"). |
| `DocumentarySection.jsx` l.291/336, `CinematicSourceExposure.jsx` l.104, `DocumentaryDataSection.jsx` l.83 | Fallback names "Delhi CAAQMS …" | Use "Delhi monitoring network" or the real `station.name`. |
| `src/data/pollutantDocumentaries.js` `globalStats` | Values like "≈ 6,700,000" | Each entry needs `sourceLabel` + `sourceUrl`, rendered in the footnote. Check the WHO figure is current. Don't put numbers in the JSX fallback objects in `WmdImpactRow.jsx` (~l.23–35): if `globalStats` is missing, render `—`. |

**Acceptance:** `grep -rn "CAAQMS\|VERIFIED SENSOR\|Beta Attenuation" src/components/PollutantDocumentary` returns only places that are conditional on `source`. With the API server stopped, the page visibly says the data is a fallback or unavailable.

### P0-4 Mobile hero (375 px) is broken
**Evidence:**
- `.wmd-hero` height is 597 px with `overflow:hidden`.
- `.wmd-hero__editorial` starts at y=171, is 497 px tall and only 231 px wide (legacy column width), at opacity 0.4.
- The title, tagline and description aren't visible in the screenshot, and the CTA pill is cut off by the Coverage band.

**Fix:**
- `.wmd-hero { height:auto; min-height:100svh; }` below 900 px.
- Editorial column `width:100%; max-width:none; padding: 0 16px;`, anchored to the bottom (`justify-content:flex-end; padding-bottom:40px`).
- Title `clamp(72px, 22vw, 110px)`.
- CTA pill `width:100%; max-width:340px; height:60px`, label on one line (`white-space:nowrap`, 13 px).
- Hide the right tagline and use a 160 px circle (spec §7).
- The scroll-scrub fade (`editorialCol → opacity .4`) is fine on desktop, but on mobile it starts while the text is still in view. Gate the hero scroll timeline with `gsap.matchMedia()` to `(min-width: 900px)`. This edit lives in `documentaryAnimations.js` (Tier 3A-2 block) and changes **only** the media condition, not tweens or timings. Note in the PR that this is the one allowed engine change for this fix.

**Acceptance:** at 375×812, the kicker, title, tagline, description, CTA and transcript link are all fully visible above the Coverage band, there's no horizontal scroll, and the side gutters are ≥16 px.

### P0-5 Empty screen for 3–5 s on load
**Evidence:** at 3 s after navigation, only a dark backdrop, the right tagline and the CTA are visible. The header and title appear at ~7 s.
**Diagnose before fixing:**
1. Record a Performance trace from reload to the title being visible.
2. Log `performance.now()` at the start of `setupDocumentaryAnimations` and on `heroTl` `onStart`/`onComplete`.
3. Check whether the effect runs twice: `internalLiveData` arrives after the fetch, and a re-render may remount children or reset the char-split.
4. Check whether the legacy CSS sets `opacity:0` on hook classes as a pre-animation state, independent of GSAP.
5. Check whether fonts (`Playfair Display` etc.) block text rendering. The Google Fonts URL should have `display=swap`.

**Target:** header and title visible ≤ 1.2 s after first paint, with the whole entrance timeline ≤ 1.6 s (its own timings already total ~1.4 s).

---

## 3. P1: fidelity vs the reference (do after P0-1, then re-check)

| # | Band | Problem seen | Fix |
|---|---|---|---|
| P1-1 | Hero photo | Skyline at opacity .22; reads as black | Opacity 1 with the `.wmd-photo` filter from spec §3.4; adjust `brightness` (~0.7) so the skyline is clearly visible as in the reference. Confirm `wmd_hero_skyline.webp` actually shows a skyline + road; if not, pick a better Unsplash image (credit in `CREDITS.md`). |
| P1-2 | Hero animation | `<HeroAtmosphericCanvas />` rendered **without props**, and `useAtmosphericMouseField` is no longer called, so the cursor-reactive dust (an animation part) is lost | In `WmdHero.jsx`, restore what the old `DocumentaryHero` did: `mouseStateRef` + `useAtmosphericMouseField(heroRef, mouseStateRef)`, and pass `pollutantId`, `windSpeed={weatherVariables.windSpeed}`, `mouseStateRef` |
| P1-3 | Hero kicker | "/ 07" hard-coded | Use `POLLUTANT_DOCUMENTARY_LIST.length` padded |
| P1-4 | Header | Pill container, logo clipped at the top | Fixed by P0-1. Then verify against spec §5.1: 56 px top padding, logo 88 px, nav underline on DOCUMENTARIES, 56 px square icon buttons |
| P1-5 | Coverage band | Decorative ring overlaps the TOPICS list text | Put the ring behind (`z-index:0`, topics `z-index:1`) and centre it on the parchment/dark boundary as in the reference |
| P1-6 | Documentaries strip | "ALL DOCUMENTARIES" wraps to 2 lines; "07 TOTAL" sits left of the tiles instead of top-right; tiles only ~105 px wide in a rounded translucent panel | Header row on top (`display:flex; justify-content:space-between`), title on one line + hairline. Grid below it: `grid-template-columns: repeat(7, 1fr); gap:16px`, full content width, tile image `aspect-ratio: 1/1.15`. Square corners, no panel background. Active tile on a bone card (spec §5.4). |
| P1-7 | Bar chart | 6 wide bars, and the NAAQS label overlaps the last bar | Visual target is the reference's ~24 thin bars. With option (a), render the 6 points as 6 bars at `scaleBand().padding(.55)` (don't invent hourly values by interpolating). With option (b), use real hourly buckets. Move the NAAQS label left of the plot area, above the dashed line. |
| P1-8 | Contour plate | Reads as 2 flat bands with one wavy edge, nothing like the reference's topographic rings | Use 8–10 thresholds from the data's actual range (`d3.ticks(min,max,9)`, real units), not a fixed `0.75 × NAAQS` step. Scale the contour geometry to the plate (`geoIdentity().scale(plateW/gridCols)` or an SVG `transform`). Stroke 0.6 px ink lines over the fills. Keep the 5-swatch legend, showing the real µg/m³ breakpoints. |
| P1-9 | Key statistics | Right-aligned values touch the right edge ("≈ 6,700,000") | Give the stats column `padding-right` / `min-width:0`; make the impact grid `grid-template-columns: 1fr 1fr 1px .9fr` inside the 72 px gutters |
| P1-10 | Kept sections (pinned story → data section) | **Not restyled at all**: Space Grotesk, red/green accents, rounded glowing cards, a green line chart, the red-dot pill in the pinned story | Implement redesign plan §5.7 with CSS only, in `@layer wmd` under `.wmd-doc`: neutral tokens, Cormorant headings, Archivo labels, 1 px hairline cards, no radius, no glow, `.wmd-photo` on images. Charts in `DocumentaryDataSection`: stroke `--bone-200`, area fill `--olive-600`. **AQI/severity colours stay as they are** where they encode categories. |
| P1-11 | Footer | "SHAPES TOMORROW." green | Fixed by P0-1. Verify bone colour. |

**Pixel check:** use the existing overlay (`?documentary=pm25&ref=1`) at 1440 px and 941 px. Tolerance ±8 px position, ±4 px font size (spec §8).

---

## 4. P2: hygiene

1. **Dev overlay ships to prod:** gate `showRefOverlay` with `import.meta.env.DEV &&`. Move `public/assets/documentary/wmd/reference.webp` → `docs/reference/` (it's already there; delete the public copy).
2. **Mock-up crops in `public/`:** `ref_tile_0[1-8].webp`, `ref_*_crop.webp` are slices of the AI mock-up. `WmdDocumentaryStrip.getTileImage` falls back to them. Remove the fallback (every pollutant has a `heroImage`), then delete those files. They must not ship.
3. **Duplicate assets:** `public/assets/documentary/vehicles/*.jpg` (untracked) duplicate the `.webp` files. `grep -rn "\.jpg" src/`. If unused, delete them. If `scripts/prepare-wmd-assets.mjs` or `scripts/update-pollutant-data.mjs` were one-off generators, either commit them with a header comment explaining their purpose or delete them.
4. **Hidden junk text:** `WmdHero` and `WmdImpactRow` inject `sr-only` spans with weather, raw values and station names inside unrelated elements (e.g. inside the value cell). Screen readers read nonsense. Remove them; if weather must stay accessible, give it a proper labelled element.
5. **Sentence-truncation bug (existing):** `text.split('.')[0] + '.'` cuts decimals. The page currently reads "…aerodynamic diameter of 2." Replace every occurrence in `DocumentarySection.jsx` / `DocumentaryDataSection.jsx` with a helper in `documentaryHelpers.js`: `firstSentence = (t='') => (t.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? t)`.
6. **Hero "Watch" target:** `WmdHero.handleWatchClick` looks for `#documentary-pinned-story`. That id exists, but the second selector `.documentary-pinned-section` is wrong (the real class is `.documentary-pinned-story-section`). Fix the selector.
7. **Docs:** update `docs/state/FRONTEND_STATE.md` (new component list, data-source labelling) only after the fixes land.

---

## 5. Verification checklist (run in this order, attach screenshots to the PR)
1. `npm run build`: passes; entry chunk ~362 kB; `PollutantDocumentary` chunk growth < 60 kB gzip vs `HEAD`.
2. `npx oxlint src/components/PollutantDocumentary src/App.jsx`: clean.
3. `npm test`: no new failures vs `HEAD` (the 8 known lazy-loading failures are listed in FRONTEND_STATE).
4. In-app browser at 1440×900:
   - each band vs the reference overlay
   - hero visible ≤ 1.2 s
   - cursor moves the hero dust
5. At 375×812: the full hero is visible, no horizontal scroll, the strip scrolls sideways.
6. Reduced motion (DevTools emulation): every section visible, nothing stuck at opacity 0.
7. Click all 7 tiles: content, chart, contour (or "no data" state for NH₃) and stats update; animations replay; no console errors; no ScrollTrigger pin-spacer build-up (`document.querySelectorAll('.pin-spacer').length` stays constant).
8. Stop the API server and reload: the page labels the data as fallback or unavailable, with no "live", "verified" or fresh timestamp.
9. Honesty grep: `grep -rnE "Math\.random|CAAQMS|VERIFIED|Synced" src/components/PollutantDocumentary`. Review each hit.

## 6. Decisions needed from the user
1. Bar chart: **(a)** label the 6 typical values "illustrative" with a citation, or **(b)** switch to real DynamoDB readings from `/api/history`. Default (a).
2. `DEFAULT_DELHI_BASELINE`: do these numbers have a real source (date and stations)? If not, it gets replaced by an explicit "live data unavailable" state.
