# Stats Page — Editorial (WMD-Style) Frontend Revamp

**Target:** `?page=stats` (`src/components/Stats/`).
**Goal:** restyle the ML Stats page so it belongs to the same family as the Pollutant Documentary (`src/components/PollutantDocumentary/wmd/`): warm ink/bone palette, serif editorial type, hairline rules, film grain. It must still read as its own page — a *research instrument*, not a copy of the documentary.
**Nature of the change:** **presentation only.** No content, data, routing, state or behaviour changes.

This document is written to be executed by an AI coding agent. Read §0 and §1 completely before editing anything. Work phase by phase (§5), and run the checks in §6 after every phase.

---

## 0. Hard rules (non-negotiable)

1. **Blast radius = the Stats page only.** You may edit **only** the files in §1.1. Any diff outside that list is a bug. Verify with `git diff --name-only` before finishing.
2. **No content changes.** Do not add, remove, reword, re-case or reorder any visible text string, number, label, tag, tooltip or `aria-label` in the JSX. (CSS `text-transform` changes are allowed — they don't change the DOM text.) Do not add new visible copy (e.g. no new "VayuVitals" wordmark, no new captions).
3. **No behaviour changes.** Keep, unchanged:
   - `handleGoBack` and every prop/callback (`onBack`, `onOpenDashboard`).
   - The `useState` filters (`activeDatasetSubset`, `activeSeason`), and the `hoveredBin` / `hoveredPoint` / `hoveredFeature` / `selectedHorizon` state in `StatsEvaluationPlots.jsx`.
   - The scroll reset `useEffect`.
   - The GSAP `useEffect`. Its selectors **must keep matching**: `.stats-instrument-header`, `.stats-section`, `.stats-section-header`.
   - Framer Motion variants, `layoutId`s (`datasetFilterPillBg`, `seasonFilterPillBg`), `whileInView`, `whileHover`.
   - Three.js geometry, elevation maths, animation loop, resize handling, mouse interaction, `dispose()` cleanup, reduced-motion branches. In the canvases you change **colour values only** (§5.6).
4. **Keep every existing `className` and `id`.** You may *add* classes (modifiers, e.g. `stats-section--parchment`) and *add* purely decorative `aria-hidden` wrapper elements. Never rename or remove one. Several are asserted by tests (§1.3).
5. **Zero-Faking Directive (`AGENTS.md`) still applies.** Don't invent numbers, badges or status labels for decoration. Decorative elements must be non-textual (rules, grain, corner marks).
6. **No new dependencies.** Everything needed is already installed (React 19, framer-motion, gsap, three, lucide-react). All fonts are already loaded in `index.html`; do **not** edit `index.html`.
7. **Scope every CSS rule.** Every selector you write must start with `.stats-page` or be a class prefixed `stats-`. Define design tokens on `.stats-page`, **never on `:root`, `body` or `html`**. Do not use `@layer` (the documentary uses `@layer legacy, wmd`; don't interact with it).

---

## 1. Files

### 1.1 Allowed to edit / create

| File | What changes |
|---|---|
| `src/components/Stats/StatsPage.css` | Full restyle (bulk of the work) |
| `src/components/Stats/StatsPage.jsx` | Add modifier classes + decorative wrappers + grain component only |
| `src/components/Stats/StatsEvaluationPlots.jsx` | Replace hard-coded SVG colours with token references; add classes |
| `src/components/Stats/ParticleTerrainCanvas.jsx` | Colour constants only |
| `src/components/Stats/ParticleWaveCanvas.jsx` | Colour constants only |
| `src/components/Stats/StatsGrain.jsx` | **New.** Stats-owned film grain overlay |

### 1.2 Do NOT touch (read-only references)

- `src/components/PollutantDocumentary/**` — the **style reference**. Read `wmd/WmdDocumentary.css`, `wmd/WmdHero.jsx`, `wmd/WmdImpactRow.jsx`, `wmd/WmdFooter.jsx` for idioms. **Do not import from it** (its CSS is only loaded inside the documentary's lazy chunk; importing `WmdGrain` or relying on `.wmd-*` classes would create a cross-page coupling and break when the documentary chunk isn't loaded).
- `src/App.jsx`, `src/App.css`, `src/index.css`, `index.html`, `src/main.jsx`
- `src/data/statsModelMetrics.json` and all other data files
- `tests/**`, `package.json`, `vite.config.js`
- Every other component directory.

### 1.3 Test contract (`tests/statsPageVerification.test.js`)

The test server-renders `StatsPage` and asserts these substrings exist in the HTML. They must all still be present after the revamp:

- Classes: `stats-page`, `stats-laboratory-grid-bg`, `stats-back-button`, `stats-terrain-frame`, `stats-dataset-canvas-wrap`, `stats-dist-canvas-wrap`
- Text: `XGBOOST v1.7-1`, `48H SERVERLESS LEAD TIME REGRESSOR`, `-8/7C6`, `8:010:008`, `81.6%`, `54.3%`, `76.8%`, `27.92`, `42.92`, the "Classification metrics … are not applicable" sentence, `Training Dataset Structure`, `xKDR & Open-Meteo`, `332,416`, `71,617`, `14 Variables`, both split strings, all `FIG. 0x / …` tags, `R = 0.9031`, `PM25 NOW`, `8,248 splits`, `+1h`/`+24h`/`+48h`, `Historical Observation Distribution`, `2021-10-15 → 2023-08-15`, footer strings (`XGBoost 1.7-1`, `AWS SageMaker`, `Serverless Endpoint (ap-south-1)`, `80/20 Chronological`, `2026-10-08`, `Zero-Faking Directive`).

> ⚠️ `stats-laboratory-grid-bg` must stay in the DOM even though the grid pattern is removed — repurpose that element as the grain host (§5.1).

> Note: the hero `<h1>` string is built with `.toUpperCase()` and the test asserts the uppercase text. Leave the JS untouched; the title stays uppercase.

---

## 2. Design direction

| | Pollutant Documentary (reference) | Stats page (target) |
|---|---|---|
| Mood | Cinematic documentary, photography-led | Archival research instrument, data-led |
| Palette | Ink/bone + **per-pollutant** accent | Same ink/bone base + **one fixed brass accent** |
| Type | Playfair / Cormorant / Archivo | Same three **+ IBM Plex Mono kept** for figure tags, coordinates, axes, tables |
| Visual centrepiece | Sepia photography | Particle canvases (tinted bone), no photos |
| Signature details | Grain, hairlines, circular portal, tour pill | Grain, hairlines, **brass corner marks** on every plate, one parchment band |

**What makes it "the same family":** token palette, serif hierarchy, hairline-row tables, square corners, grain, alternating ink bands, a single parchment band.
**What keeps it distinct:** brass accent (no pollutant colours), monospace instrumentation layer, corner-mark framing, no hero photo / tour / portal.

---

## 3. Design tokens

Define **all** of these on `.stats-page` at the top of `StatsPage.css`, replacing the old `--stats-font-*` block. After the revamp, the only raw hex/rgba values in `StatsPage.css` should be inside this token block.

```css
.stats-page {
  /* Base palette — values mirror .wmd-doc in WmdDocumentary.css (copied, not imported) */
  --stats-ink-900: #0d0f0c;   /* page base */
  --stats-ink-800: #141611;   /* alternate band */
  --stats-ink-700: #1c1f19;   /* plates, tooltips */
  --stats-olive-600: #2a2d24; /* bar tracks; muted text on parchment */
  --stats-sage-500: #6f7462;  /* decorative / large muted only (4.0:1 on ink) */
  --stats-sage-400: #8e927e;  /* secondary text (~5.9:1 on ink-900) */
  --stats-bone-300: #b9b19c;  /* chart marks */
  --stats-bone-200: #d8cfb9;  /* primary text */
  --stats-bone-100: #ece5d3;  /* emphasis, values */
  --stats-parchment: #c9c1ab; /* dataset band */

  --stats-rule: rgba(216, 207, 185, 0.18);
  --stats-rule-strong: rgba(216, 207, 185, 0.38);
  --stats-rule-ink: rgba(13, 15, 12, 0.22);        /* hairlines on parchment */

  /* Stats accent: aged brass — distinct from all 7 pollutant accents */
  --stats-accent: #b8935a;                          /* ~6.7:1 on ink-900, ~6.4:1 on ink-800 */
  --stats-accent-rgb: 184, 147, 90;
  --stats-accent-deep: #7a5c2e;                     /* rules/marks on parchment ONLY (3.4:1 — never small text) */
  --stats-accent-rule: rgba(184, 147, 90, 0.35);
  --stats-accent-tint: rgba(184, 147, 90, 0.08);
  --stats-accent-glow: rgba(184, 147, 90, 0.35);

  /* Plot tokens (consumed by StatsEvaluationPlots.jsx via inline style) */
  --stats-plot-bg: var(--stats-ink-900);
  --stats-plot-grid: rgba(216, 207, 185, 0.07);
  --stats-plot-axis: rgba(216, 207, 185, 0.30);
  --stats-plot-mark: var(--stats-bone-300);
  --stats-plot-mark-active: var(--stats-accent);
  --stats-plot-label: var(--stats-sage-400);
  --stats-plot-hover-band: rgba(184, 147, 90, 0.06);

  /* Typography */
  --stats-font-display: 'Playfair Display', Georgia, serif;
  --stats-font-serif: 'Cormorant Garamond', Georgia, serif;
  --stats-font-label: 'Archivo', -apple-system, BlinkMacSystemFont, sans-serif;
  --stats-font-mono: 'IBM Plex Mono', 'JetBrains Mono', monospace;

  /* Spacing */
  --stats-gutter: clamp(16px, 5vw, 72px);           /* matches WMD 72px at desktop, 16px on phones */
  --stats-section-pad-y: clamp(64px, 8vw, 104px);

  background-color: var(--stats-ink-900);
  color: var(--stats-bone-200);
  font-family: var(--stats-font-serif);
}
```

**Colour usage rules**
- Small text (< 18px) on ink: `bone-200`, `bone-100`, `sage-400`, or `accent`. Never `sage-500`.
- Small text on parchment: `ink-900` or `olive-600` only. `accent-deep` is for rules, corner marks and large display text only.
- Accent is used sparingly: kickers/tags, active states, corner marks, the selected table row, the active feature bar, hover states. Values stay bone, not brass, except active/hover.
- No glows except a soft `--stats-accent-glow` box-shadow on hover of interactive controls. No glassmorphism / `backdrop-filter`.

### 3.1 Type scale

| Role | Font | Size | Weight | Tracking | Case | Colour |
|---|---|---|---|---|---|---|
| Hero title (`.stats-inst-name`) | Playfair | `clamp(2.2rem, 4.4vw, 4.2rem)` | 600 | `-0.005em` | as-is (uppercase from JS) | bone-100 |
| Section headline | Cormorant | `clamp(2rem, 3.2vw, 2.9rem)` | 500 | `0.02em` | `none` (was uppercase) | bone-200 |
| Card / plot headline | Cormorant | `1.6rem` | 500 | `0.01em` | none | bone-100 |
| Body / sub copy | Cormorant | `1.0625rem` (17px), lh 1.5 | 500 | 0 | none | bone-200 @ 0.85 opacity |
| Kicker / tag / label | Archivo | 11–12px | 500–600 | `0.18–0.22em` | uppercase | accent (kickers) / sage-400 (labels) |
| Big metric value | Playfair | `clamp(2rem, 3.2vw, 3rem)` | 600 | `-0.01em` | — | bone-100 |
| Mono instrumentation | IBM Plex Mono | 11–13px | 400–500 | `0.06–0.12em` | as-is | sage-400 |

Body copy uses `font-variant-numeric: tabular-nums` wherever numbers sit in columns (metric strip, tables, feature %).

### 3.2 Shape, rules, motion

- `border-radius: 0` everywhere **except** the filter pill group and pills (`999px`), mirroring WMD's pill exception.
- All borders are 1px hairlines using `--stats-rule*`. Section boundaries: `border-bottom: 1px solid var(--stats-rule)`.
- Remove hover `transform: translateY(...)` lifts. Hover feedback = colour/rule change only.
- Transitions: `150–250ms ease` on `color`, `background-color`, `border-color`, `box-shadow` only. Never `transition: all`.
- Respect `prefers-reduced-motion`: add a `@media (prefers-reduced-motion: reduce)` block that sets `transition: none` on `.stats-page *`. (JS motion already handles reduced motion; don't touch it.)

---

## 4. Page layout (band order)

| # | Element (unchanged id / class) | Band background | Notes |
|---|---|---|---|
| — | `.stats-laboratory-grid-bg` | fixed grain overlay | grid removed, hosts `<StatsGrain/>` |
| — | `.stats-back-button-root`, `.stats-top-hud` | fixed chrome | restyled, positions kept |
| 01 | `#hero-performance` `.stats-hero-section` | `ink-900` | |
| 02 | `#dataset-structure` | **`parchment`** (add `stats-section--parchment`) | canvas sits in a dark plate |
| 03 | `#model-evaluation` | `ink-800` (add `stats-section--deep`) | |
| 04 | `#data-distribution` | `ink-900` | |
| 05 | `#technical-lineage` `.stats-footer-section` | `ink-800` + brass top rule | |

Horizontal padding everywhere: `var(--stats-gutter)`. Vertical: `var(--stats-section-pad-y)`; hero top padding `clamp(96px, 11vw, 132px)` to clear the fixed chrome.

---

## 5. Implementation phases

Do phases in order. After each phase run the checks in §6.1.

### Phase 1 — Tokens, root, grain

**CSS**
1. Replace §1 of `StatsPage.css` with the token block from §3. Keep `box-sizing`, `overflow-x: hidden`, font smoothing.
2. Rewrite `.stats-laboratory-grid-bg`: remove the `background-image` grid. Keep `position: fixed; inset: 0; pointer-events: none;`. Set `z-index: 90` (above content at `z-index: 10`, below chrome at 140/150).
3. Add `.stats-grain { width: 100%; height: 100%; display: block; mix-blend-mode: overlay; opacity: 0.16; }` (WMD uses 0.18 — slightly subtler here because the page is chart-heavy).

**New file `src/components/Stats/StatsGrain.jsx`**
```jsx
import React from 'react';

/**
 * StatsGrain - film grain overlay owned by the Stats page.
 * Deliberately not shared with WmdGrain so the two pages stay decoupled.
 */
export default function StatsGrain() {
  return (
    <svg className="stats-grain" aria-hidden="true" focusable="false">
      <filter id="statsGrainFilter">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#statsGrainFilter)" />
    </svg>
  );
}
```
The filter id must be `statsGrainFilter` (not `wmdGrain`) to avoid a duplicate-id clash.

**JSX (`StatsPage.jsx`)**
- `import StatsGrain from './StatsGrain';`
- Change `<div className="stats-laboratory-grid-bg" aria-hidden="true" />` to wrap the grain:
  ```jsx
  <div className="stats-laboratory-grid-bg" aria-hidden="true">
    <StatsGrain />
  </div>
  ```

**Done when:** page is warm ink with visible-but-subtle grain; no grid lines; nothing else on the page changed yet beyond colour inheritance.

### Phase 2 — Fixed chrome (back button + HUD)

CSS only. Keep positions (`top: 24px; left: 24px` / `right: 28px`), keep the tooltip behaviour.

- `.stats-back-button`: 44×44, **square** (`border-radius: 0`), `background: var(--stats-ink-900)`, `border: 1px solid var(--stats-accent-rule)`, `color: var(--stats-bone-200)`, no `backdrop-filter`, no heavy shadow.
  - `:hover` → `border-color: var(--stats-accent)`, `color: var(--stats-accent)`, `background: var(--stats-accent-tint)`, `box-shadow: 0 0 14px var(--stats-accent-glow)`. Remove the white-fill hover.
  - `:focus-visible` → `outline: 1px solid var(--stats-accent); outline-offset: 3px;` (the current `outline: none` must be removed — it kills keyboard focus).
- `.stats-back-tooltip`: square, `background: var(--stats-ink-700)`, `border: 1px solid var(--stats-rule-strong)`, Archivo 11px `0.16em` uppercase, `color: var(--stats-bone-200)`.
- `.stats-hud-code`: Plex Mono 11px, `0.16em`, `sage-400`.
- `.stats-hud-badge`: Archivo 11px, 600, `0.2em`, `color: var(--stats-accent)`, `border: 1px solid var(--stats-accent-rule)`, transparent background, `border-radius: 0`.
- Framer Motion `whileHover={{ scale: 1.08 }}` stays (behaviour rule) — it reads fine on a square button.

### Phase 3 — Hero (§5 of the CSS)

- `.stats-hero-section`: padding `clamp(96px, 11vw, 132px) var(--stats-gutter) var(--stats-section-pad-y)`; `gap: 40px`; `border-bottom: 1px solid var(--stats-rule)`.
- `.stats-instrument-header`: `border-bottom: 1px solid var(--stats-accent-rule)`; `padding-bottom: 28px`.
- `.stats-inst-id` → **kicker**: Archivo 12px, 600, `0.22em`, `color: var(--stats-accent)`.
- `.stats-inst-name` → Playfair per §3.1, `line-height: 1.02`, `max-width: 18ch` on desktop so it breaks into an editorial 2–3 line block; remove `font-weight: 800`.
- `.stats-inst-ref-tag` (`-8/7C6`): Plex Mono `clamp(1rem, 1.6vw, 1.4rem)`, 500, `color: var(--stats-accent)`, `border: 1px solid var(--stats-accent-rule)`, transparent bg, padding `6px 12px`.
- `.stats-terrain-frame`: `border: 1px solid var(--stats-rule)`, `background: radial-gradient(ellipse at 50% 70%, var(--stats-ink-700) 0%, var(--stats-ink-900) 75%)`.

**Corner marks (applies to all three canvas frames).** Restyle `.stats-frame-crosshair` so the `+` glyph is hidden and an L-shaped brass corner is drawn instead — markup unchanged:
```css
.stats-page .stats-frame-crosshair {
  width: 14px; height: 14px;
  font-size: 0; color: transparent;          /* hide '+' glyph, keep DOM text */
  border-color: var(--stats-accent);
  border-style: solid; border-width: 0;
}
.stats-page .crosshair-tl { top: 10px; left: 10px; border-top-width: 1px; border-left-width: 1px; }
.stats-page .crosshair-tr { top: 10px; right: 10px; border-top-width: 1px; border-right-width: 1px; }
.stats-page .crosshair-bl { bottom: 10px; left: 10px; border-bottom-width: 1px; border-left-width: 1px; }
.stats-page .crosshair-br { bottom: 10px; right: 10px; border-bottom-width: 1px; border-right-width: 1px; }
```

**Metric strip → open editorial strip** (`.stats-hero-metrics-strip`, `.stats-metric-cell`)
- Grid stays 5 columns; `gap: 0`; `border-top: 1px solid var(--stats-rule-strong)`; `padding-top: 0`.
- Cell: no background, no border box, no radius; `padding: 24px 20px 20px`; `border-left: 1px solid var(--stats-rule)` on every cell except the first (`.stats-metric-cell:first-child { border-left: 0; padding-left: 0; }`). Add a 2px top indicator via `box-shadow: inset 0 2px 0 transparent`.
- Hover: `box-shadow: inset 0 2px 0 var(--stats-accent)` (brass top bar). **Remove** the `translateY` lift and background change.
- `.stats-metric-label`: Archivo 11px, 500, `0.18em`, `sage-400`.
- `.stats-metric-value`: Playfair per §3.1, `bone-100`, `tabular-nums`.
- `.stats-metric-sub`: Plex Mono 11px, `sage-400`.
- `.stats-regression-note`: Plex Mono 11px, `0.06em`, `sage-400`, `border-top: 1px dashed var(--stats-rule)`, `padding-top: 16px; margin-top: 8px`.

### Phase 4 — Section system, filter pills, distribution (§6, §9)

**JSX:** add modifier classes only:
- `#dataset-structure` → `className="stats-section stats-section--parchment"`
- `#model-evaluation` → `className="stats-section stats-section--deep"`

**Section shell**
- `.stats-section`: `padding: var(--stats-section-pad-y) var(--stats-gutter)`; `background: var(--stats-ink-900)`; `border-bottom: 1px solid var(--stats-rule)`.
- `.stats-section--deep`: `background: var(--stats-ink-800)`.
- `.stats-section-header`: `align-items: flex-end`; `padding-bottom: 20px`; `margin-bottom: 36px`; `border-bottom: 1px solid var(--stats-accent-rule)`.
- `.stats-section-tag`: Archivo 12px, 600, `0.22em`, `color: var(--stats-accent)`, `margin-bottom: 10px`.
- `.stats-section-headline`: Cormorant per §3.1, `text-transform: none`, remove weight 800 and negative tracking.
- `.stats-section-coord`: Plex Mono 11px, `0.12em`, `sage-400`.

**Filter pills** (keep pill radius — the one rounded exception)
- `.stats-filter-pill-group`: `background: transparent`; `border: 1px solid var(--stats-rule-strong)`; `padding: 4px`; `flex-wrap: wrap` (prevents overflow at phone width with the 5 season pills).
- `.stats-filter-pill`: Archivo 11px, 500, `0.14em`, uppercase, `color: var(--stats-sage-400)`; `:hover` → `bone-100`; add `:focus-visible { outline: 1px solid var(--stats-accent); outline-offset: 2px; }` and remove `outline: none`.
- `.stats-filter-pill.active`: `color: var(--stats-ink-900)`, 600. (Drop the `!important` — specificity is sufficient once scoped as `.stats-page .stats-filter-pill.active`.)
- `.stats-filter-pill-bg`: `background: var(--stats-accent)`.
- `.stats-filter-caption`: Archivo 11px, `0.16em`, `sage-400`.

**Distribution (section 04)**
- `.stats-dist-canvas-wrap`: `background: var(--stats-ink-900)`; `border: 1px solid var(--stats-rule)`.
- `.stats-dist-legend`: Plex Mono 11px, `sage-400`, `border-top: 1px dashed var(--stats-rule)`. On ≤ 899px, `flex-direction: column; align-items: flex-start`.

### Phase 5 — Parchment dataset band (§7)

Everything inside `.stats-section--parchment` flips to dark-on-light, except the canvas plate, which stays dark (additive-blended particles need a dark background).

```
.stats-section--parchment                 background: var(--stats-parchment); color: var(--stats-ink-900);
  .stats-section-header                   border-bottom-color: var(--stats-rule-ink)
  .stats-section-tag                      color: var(--stats-accent-deep)   (12px 600 caps is acceptable; if contrast tooling flags it, use --stats-ink-900)
  .stats-section-headline                 color: var(--stats-ink-900)
  .stats-section-coord, .stats-filter-caption   color: var(--stats-olive-600)
  .stats-filter-pill-group                border-color: var(--stats-rule-ink)
  .stats-filter-pill                      color: var(--stats-olive-600);  :hover → ink-900
  .stats-filter-pill.active               color: var(--stats-bone-100)
  .stats-filter-pill-bg                   background: var(--stats-ink-900)
  .stats-dataset-canvas-wrap              background: var(--stats-ink-900); border: 1px solid var(--stats-ink-900);
                                          box-shadow: 0 1px 0 var(--stats-rule-ink); margin-bottom: 40px
  .stats-dataset-meta-grid                gap: 0; border-top: 1px solid var(--stats-rule-ink); padding-top: 0
  .stats-dset-cell                        padding: 22px 20px; border-left: 1px solid var(--stats-rule-ink)  (first-child: none, padding-left 0)
  .stats-dset-label                       Archivo 11px 500 0.18em; color: var(--stats-olive-600)
  .stats-dset-val                         Playfair 1.6rem 600; color: var(--stats-ink-900)
  .stats-dset-detail                      Plex Mono 11px; color: var(--stats-olive-600)
```
Corner marks inside the plate stay `--stats-accent` (bright brass on dark plate).
Grain over parchment: the global overlay already covers it; no extra work.

### Phase 6 — Evaluation plots (§8 + `StatsEvaluationPlots.jsx`)

**CSS**
- `.stats-eval-grid`: `gap: 56px 48px`.
- `.stats-plot-card`: **no box** — `background: transparent; border: 0; border-top: 1px solid var(--stats-rule-strong); padding: 24px 0 0;`.
- `.stats-plot-tag`: Archivo 11px, 600, `0.2em`, `color: var(--stats-accent)`.
- `.stats-plot-coord`: Plex Mono 11px, `sage-400`.
- `.stats-plot-headline`: Cormorant `1.6rem` 500, `bone-100`.
- `.stats-plot-sub`: Cormorant 17px, `bone-200` @ 0.8, `max-width: 62ch`.
- `.stats-svg-plot-wrap`: `background: var(--stats-plot-bg)`; `border: 1px solid var(--stats-rule)`.
- `.stats-plot-floating-tooltip`: square, `background: var(--stats-ink-700)`, `border: 1px solid var(--stats-accent-rule)`, shadow `0 8px 24px rgba(0,0,0,0.6)` (put this rgba in the token block as `--stats-shadow`). `.tooltip-title` bone-100 Archivo 11px 600 `0.14em`; `.tooltip-stat` bone-200 Plex Mono; `.tooltip-note` sage-400.
- `.stats-plot-meta-row`: Plex Mono 12px, `sage-400`, `border-top: 1px solid var(--stats-rule)`; `strong` → `bone-100`, 500. On ≤ 899px: `flex-direction: column; gap: 6px`.
- **Feature matrix:** `.stats-feature-row` keep grid; `border-bottom: 1px solid var(--stats-rule)`; `padding: 8px 0`; radius 0. `.active` → `background: var(--stats-accent-tint)`. `.stats-feature-idx` sage-500 Plex Mono (decorative). `.stats-feature-name` Archivo 12px 500 `0.1em` bone-200. `.stats-feature-bar-wrap` height 6px, `background: var(--stats-olive-600)`. `.stats-feature-bar-fill` `background: var(--stats-bone-300)`; `.stats-feature-row.active .stats-feature-bar-fill` → `var(--stats-accent)`. `.stats-feature-pct` Plex Mono bone-100 `tabular-nums`; active row → accent. `.stats-feature-count` sage-400.
- **Horizons table:** `th` Archivo 11px 600 `0.16em` sage-400, `border-bottom: 1px solid var(--stats-accent-rule)`. `td` Plex Mono 13px bone-200, `border-bottom: 1px solid var(--stats-rule)`, `tabular-nums`. `.stats-td-highlight` bone-100 600 (drop `!important`, scope instead). `tbody tr:hover td` → `background: rgba(var(--stats-accent-rgb), 0.04)`. `.stats-tr-selected` → `background: var(--stats-accent-tint)`, `box-shadow: inset 2px 0 0 var(--stats-accent)`; its `.stats-td-highlight` → accent. Keep the existing `overflow-x: auto` wrapper; add `min-width: 640px` on the table so columns don't crush on phones (the wrapper scrolls, not the page).

**JSX — colour literals only.** Replace each hard-coded SVG colour with an inline-style token reference. Use `style={{ … }}`, **not** `stroke="var(...)"` presentation attributes (`var()` in presentation attributes is not reliable across browsers). Mapping:

| Current literal | Replace with |
|---|---|
| `stroke="rgba(255,255,255,0.08)"` / `0.06` (gridlines) | `style={{ stroke: 'var(--stats-plot-grid)' }}` |
| `stroke="rgba(255,255,255,0.3)"` (axes) | `style={{ stroke: 'var(--stats-plot-axis)' }}` |
| `stroke="rgba(255,255,255,0.4)"` (ticks, diagonal) | `style={{ stroke: 'var(--stats-plot-axis)' }}` |
| `fill={isHovered ? 'rgba(255,255,255,0.04)' : 'transparent'}` | `style={{ fill: isHovered ? 'var(--stats-plot-hover-band)' : 'transparent' }}` |
| `stroke={isHovered ? '#ffffff' : '#cbd5e1'}` | `style={{ stroke: isHovered ? 'var(--stats-plot-mark-active)' : 'var(--stats-plot-mark)' }}` |
| `fill={isHovered ? '#ffffff' : '#e2e8f0'}` / `'#cbd5e1'` (points, needle heads) | `style={{ fill: isHovered ? 'var(--stats-plot-mark-active)' : 'var(--stats-plot-mark)' }}` |
| `fill={isHovered ? '#ffffff' : '#888888'}` / `fill="#888"` (labels) | `style={{ fill: isHovered ? 'var(--stats-bone-100)' : 'var(--stats-plot-label)' }}` |
| `fill="rgba(255,255,255,0.035)"` (confidence band) | `style={{ fill: 'rgba(var(--stats-accent-rgb), 0.06)' }}` |

Rules for this edit:
- Do a full-file search for `#`, `rgba(`, `stroke=`, `fill=` and convert **every** colour literal; leave geometry attributes (`x1`, `y1`, `r`, `strokeWidth`, `opacity`) untouched.
- If an element has an existing `style` prop, merge into it — don't create a second `style` prop.
- Keep `fontFamily="IBM Plex Mono"` on axis text (mono stays for axes by design).
- Do not change any text node, `{...}` expression, event handler, or hover state logic.

### Phase 7 — Canvas tint (Three.js, colour values only)

Goal: particles read as warm bone instead of pure white; ground grid warms to sage/olive. Additive blending and opacity stay as they are.

**`ParticleTerrainCanvas.jsx`**
1. At module scope (below imports) add:
   ```js
   // Bone tint (bone-200 #d8cfb9 normalised to its max channel) for the editorial palette.
   const PARTICLE_TINT = [1.0, 0.958, 0.856];
   ```
2. Where vertex colours are written (`colors[pIdx * 3] = lum;` … around line 112):
   ```js
   colors[pIdx * 3] = lum * PARTICLE_TINT[0];
   colors[pIdx * 3 + 1] = lum * PARTICLE_TINT[1];
   colors[pIdx * 3 + 2] = lum * PARTICLE_TINT[2];
   ```
3. `LineBasicMaterial({ color: 0xffffff, …})` → `color: 0xd8cfb9`. Keep opacity.
4. `new THREE.GridHelper(92, 36, 0x555555, 0x1f1f1f)` → `new THREE.GridHelper(92, 36, 0x6f7462, 0x2a2d24)`.
5. Static fallback inline style: `background` → `'radial-gradient(ellipse at 50% 60%, rgba(216,207,185,0.06) 0%, rgba(13,15,12,0.96) 70%)'`, `color` → `'#8e927e'`. Text unchanged.
6. Leave the radial particle sprite texture white (it's an alpha mask; tint comes from vertex colours).

**`ParticleWaveCanvas.jsx`**
1. Same `PARTICLE_TINT` constant.
2. Apply the tint at **both** colour writes: initial (`colors[...]`, ~line 152) and per-frame update (`colorArr[...]`, ~line 297). Missing the per-frame one makes particles snap back to white after the first frame.
3. `LineBasicMaterial` `color: 0xffffff` → `0xd8cfb9`.
4. Fallback inline style: `background` → `'rgba(216,207,185,0.03)'`, `color` → `'#8e927e'`.

Do not modify anything else in either file (elevation, `computeTargetElevation`, camera, controls, resize observer, cleanup).

### Phase 8 — Transparency notes & footer (§10)

**Transparency (`.stats-transparency-grid`)** — editorial notes, not cards.
- Grid: 3 columns, `gap: 40px`, `margin-bottom: 64px`.
- `.stats-transparency-card`: `background: transparent; border: 0; border-top: 1px solid var(--stats-accent-rule); padding: 20px 0 0;`.
- `.stats-transparency-tag`: Archivo 11px 600 `0.2em`, accent.
- `.stats-transparency-title`: Cormorant `1.6rem` 500, bone-100.
- `.stats-transparency-body`: **Cormorant** 17px, lh 1.55, bone-200 @ 0.85 (was mono — this is prose).

**Footer (`.stats-footer-section`)**
- `background: var(--stats-ink-800)`; `border-top: 1px solid var(--stats-accent-rule)`; padding `var(--stats-section-pad-y) var(--stats-gutter) 48px`.
- `.stats-footer-metadata-grid`: 5 columns, `gap: 0`, `border-top: 1px solid var(--stats-rule-strong)`.
- `.stats-footer-meta-col`: `padding: 22px 20px`; `border-left: 1px solid var(--stats-rule)` (first-child none, padding-left 0).
- `.stats-footer-meta-label`: Archivo 11px 500 `0.18em`, sage-400.
- `.stats-footer-meta-val`: Playfair `1.35rem` 600, bone-100.
- `.stats-footer-meta-sub`: Plex Mono 11px, sage-400.
- `.stats-footer-bottom`: Archivo 11px `0.14em` uppercase, sage-400; `border-top: 1px solid var(--stats-rule)`.
- `.stats-footer-brand`: Playfair 15px 600, `letter-spacing: 0.08em`, bone-100.

### Phase 9 — Responsive (§11)

Replace the breakpoints with the WMD-aligned set: **1199px** and **899px**, plus a **479px** phone tweak.

| Element | ≥ 1200 | 900–1199 | ≤ 899 | ≤ 479 |
|---|---|---|---|---|
| Metric strip | 5 cols | 3 cols | 2 cols | 2 cols, value `1.8rem` |
| Dataset meta grid | 4 cols | 2 cols | 2 cols | 1 col |
| Eval grid | 2 cols | 1 col | 1 col | 1 col |
| Transparency | 3 cols | 3 cols | 1 col | 1 col |
| Footer meta | 5 cols | 3 cols | 2 cols | 1 col |
| Feature row cols | `220px 1fr 140px` | `160px 1fr 110px` | `1fr` stacked | stacked |
| `.stats-top-hud` | shown | shown | hidden | hidden |
| Back button | 44px @ 24px | same | 40px @ 16px | same |
| Hero ref tag | inline right | inline right | wraps below title (`.stats-instrument-header { flex-wrap: wrap }`) | same |

Grid-cell divider rule when columns wrap: reset `border-left` on the first cell of each visual row. Simplest approach: at each breakpoint switch the dividers to `border-top` and drop `border-left` (e.g. ≤ 899 the metric/dset/footer cells use `border-top: 1px solid var(--stats-rule)` and `border-left: 0; padding-left: 0`).

The gutter comes from `--stats-gutter` (`clamp(16px, 5vw, 72px)`) so phones get 16px. **No horizontal page scroll at 375px** — only `.stats-horizons-table-wrap` may scroll horizontally.

---

## 6. Verification

### 6.1 After every phase

```bash
npm test
```
All suites must pass, especially `tests/statsPageVerification.test.js`. **Do not edit tests to make them pass.** If one fails, your change broke the contract in §1.3; fix the code.

```bash
git diff --name-only
```
Output must be a subset of the §1.1 list.

### 6.2 Final checks

1. `npm run build` succeeds with no new warnings.
2. Grep guards (all should return **no matches**):
   ```bash
   grep -nE "#[0-9a-fA-F]{3,6}|rgba?\(" src/components/Stats/StatsEvaluationPlots.jsx
   grep -nE ":root|^body|^html|@layer" src/components/Stats/StatsPage.css
   grep -nE "wmd-|WmdGrain|PollutantDocumentary" src/components/Stats/
   grep -n "transition: all" src/components/Stats/StatsPage.css
   ```
   For `StatsPage.css`, confirm that raw colour literals only appear inside the `.stats-page { … }` token block.
3. Visual QA in the browser pane (`npm run dev`, open `/?page=stats`) at **1440×900, 768×1024, 375×812**:
   - Warm ink background, grain visible, no grid lines.
   - Section 02 is parchment; its canvas plate is dark; brass corner marks on all three canvases.
   - Particles render bone-tinted on initial paint **and after a few seconds** (per-frame tint applied).
   - Dataset and season filter pills animate (`layoutId` slide) and change the canvases.
   - Hovering histogram bins / scatter points shows the brass highlight and the tooltip; feature-row hover highlights; clicking a horizons row selects it.
   - Back button: hover tooltip, keyboard `Tab` shows a focus ring, click returns to the dashboard.
   - GSAP reveals still fire on hero and section headers while scrolling.
   - No horizontal page scroll at 375px.
   - Reduced motion (emulate `prefers-reduced-motion: reduce`): page is static and fully legible.
4. **Regression check on other pages** (should be pixel-identical to before):
   - `/?documentary=pm25` and one other pollutant: header, hero, impact row, footer unchanged.
   - Dashboard (`/`), About, Heatmap, School Safety: open each; no style changes.
   - Navigate Dashboard → Stats → back → Documentary in one session (this loads both CSS chunks together) and confirm neither page's styling leaks into the other.

### 6.3 Definition of done

- [ ] Only §1.1 files changed; new `StatsGrain.jsx` added.
- [ ] `npm test` and `npm run build` pass.
- [ ] All §6.2 grep guards are clean.
- [ ] Visual QA passes at 3 widths, including interactions and reduced motion.
- [ ] Documentary and other pages are unchanged after cross-navigation.
- [ ] No text, data, ids, existing classes or behaviour changed (`git diff` on the `.jsx` files shows only: new import, grain wrapper, modifier classes, colour → token swaps, tint constants).

---

## 7. Out of scope (do not do in this task)

- **Hard-coded metrics in `StatsEvaluationPlots.jsx`** (`R = 0.9031`, `54.3% within ±20`, `76.8% within ±40`) and the footer training date `2026-10-08 / 04:07:52 UTC` in `StatsPage.jsx` are literals instead of reads from `statsModelMetrics.json`. They match the JSON today but will drift after a retrain. Wiring them to data is a separate, content-level task; the tests assert the current strings.
- Any change to the documentary page, shared tokens extraction, or a cross-page design-system refactor.
- New copy, new sections, new imagery, new charts.
