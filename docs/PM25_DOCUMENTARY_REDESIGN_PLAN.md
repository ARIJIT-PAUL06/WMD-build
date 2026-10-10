# PM2.5 Documentary Redesign — Implementation Plan

Target: make `?documentary=pm25` (`src/components/PollutantDocumentary/`) look like the reference mock-up (sepia "WMD" editorial page). Change the layout, typography, colour and imagery completely. **Keep the animation layer.** Follow the zero-faking rules in `AGENTS.md` throughout.

Reference image: provided by the user in chat (941 × 1672 px mock-up). Save it to `docs/reference/pm25-wmd-reference.webp` before starting so every step can be checked against it.

---

## 0. Read this first (rules for the implementer)

1. **Do not touch these files** (the "animation parts"), except for the small selector changes listed in §6:
   - `documentaryAnimations.js` (GSAP + ScrollTrigger engine, 874 lines)
   - `HeroAtmosphericCanvas.jsx` (particle flow canvas)
   - `useAtmosphericMouseField.js` (cursor field)
   - `src/components/common/AnimatedCounter.jsx`
2. The engine finds elements **by class name** and skips anything it can't find (every block is wrapped in `if (el)`). So the new markup must **keep the hook class names** from §6 on the matching new elements. Put new BEM classes next to them, e.g. `className="wmd-hero__title documentary-pollutant-name"`.
3. **No invented data.** Every number on screen comes from `src/data/pollutantDocumentaries.js`, the live `/api/delhi-heatmap` response (`internalLiveData`), or a published source, with the citation shown on the page (§5.5). If a value isn't available, show `—` and the reason. Do not use `Math.random()` for chart data.
4. Keep everything in `PollutantDocumentary.jsx` above the `return`: data fetching, `DEFAULT_DELHI_BASELINE`, school IDW, the 14-day window and scroll resets. Only the JSX tree and the child components change.
5. Build at the design width **1440 px** first. The reference is 941 px wide, so **multiply every pixel value measured on the reference by 1.53**. All sizes in this plan are already at 1440 px.

---

## 1. Decisions to confirm with the user before coding

| # | Question | Default if not answered |
|---|---|---|
| D1 | Branding: the reference says **"WMD / Weapons of Mass Destruction"**, but the app is **VayuVitals**. Which one goes in the header and footer? | Use "WMD" (repo name), as in the reference |
| D2 | The documentary strip shows **8** tiles (PM2.5, Nuclear, Chemical, …, AI). The app has **7 pollutant** documentaries. Show the 7 real ones, or 8 tiles where the extra ones are "Coming soon"? | 7 real pollutants; heading says "07 TOTAL" |
| D3 | **"Watch Documentary"**: there is no video. Point it at the pinned scroll story (smooth scroll), or hide it until a real video exists? | Smooth scroll to the pinned story; label stays |
| D4 | The reference is only 5 bands. The current page also has the pinned story, editorial sections 01–08, the 14-day evidence grid, school safety and the data section. Keep them (restyled) between "Global Impact" and the footer, or delete them? | Keep them, restyled in the new language (they hold the real science and the animation targets) |
| D5 | "Global Coverage" world map: the app only has Delhi data. Show only real station markers (all in Delhi), or switch the map to India/Delhi? | World map with a marker only where there are real stations, plus a zoom ring around Delhi. Caption: "Monitoring coverage: Delhi NCR CAAQMS" |
| D6 | Photography: reuse the existing `public/assets/documentary/*.webp` with a sepia treatment, or download free-licence photos (Unsplash/Pexels) closer to the reference (skyline with a motorbike, smokestacks, forest)? | Download Unsplash photos (licence allows it) and record the credits in `public/assets/documentary/wmd/CREDITS.md` |

---

## 2. Libraries and components to use

Install only what's listed. Every package here is framework-agnostic or React 19-safe.

| Need | Use | Why / notes |
|---|---|---|
| Animation | **gsap 3.15 + ScrollTrigger** (already installed) | Existing engine. Do not add Framer Motion. |
| Icons (search, globe, chart, play, transcript) | **lucide-react** (already installed): `Search`, `Globe`, `ChartNoAxesColumn` (or `BarChart3`), `Play`, `ScrollText` | Use `strokeWidth={1.25}` to match the thin icons |
| World map | **`d3-geo`** + **`topojson-client`** + **`world-atlas`** (`countries-110m.json`) | Render in `<svg>` yourself with `geoNaturalEarth1()`. Avoid `react-simple-maps`: its peer dependency is React ≤18. |
| Contour "exposure" map | **`d3-contour`** (`contours()` on a grid) + **`d3-scale`** | Build the grid from live station values with the existing IDW helpers: `src/components/Heatmap/heatmapRasterUtils.js` / `SchoolSafety/schoolSafetyHelpers.js` → `calculateSchoolIdw` |
| Bar chart | Plain SVG + **`d3-scale`** (`scaleBand`, `scaleLinear`) | ~60 lines. Don't use Recharts: you can't get the hairline look without fighting it. |
| Fonts | Google Fonts, added to the existing `<link>` in `index.html` | See §3.2 |
| Film grain / paper texture | Inline SVG `feTurbulence` filter (no library) | Snippet in §3.4 |
| Sepia photo treatment | CSS `filter` + an SVG `feColorMatrix` duotone | Snippet in §3.4 |
| Image optimisation | `sharp` via the existing `scripts/optimize-images.mjs` | WebP, max 2400 px wide for the hero, 600 px for tiles |

```bash
npm i d3-geo d3-contour d3-scale d3-array topojson-client world-atlas
```

Snippets you can borrow (copy the idea, not the code):
- d3 contour example: observablehq.com/@d3/contours (uses `d3.contours().size([w,h]).thresholds(n)(values)` → `geoPath()`)
- d3-geo world map: observablehq.com/@d3/world-map
- Grain overlay: the CSS-Tricks "grainy gradients" article (feTurbulence `baseFrequency≈0.8`, `numOctaves=4`)

---

## 3. Design system (extracted from the reference)

### 3.1 Colour tokens (put them on `.wmd-doc`, the page root)

```css
.wmd-doc {
  --ink-900: #0d0f0c;   /* page base, deepest black-green */
  --ink-800: #141611;   /* dark band backgrounds (strip, impact row) */
  --ink-700: #1c1f19;   /* cards, map plate */
  --olive-600: #2a2d24; /* chart track, contour low */
  --sage-500: #6f7462;  /* contour mid, muted text */
  --sage-400: #8e927e;  /* secondary text */
  --bone-300: #b9b19c;  /* contour high, bar secondary */
  --bone-200: #d8cfb9;  /* primary text, logo, active tile bg */
  --bone-100: #ece5d3;  /* highlights, play button fill */
  --parchment: #c9c1ab; /* Global Coverage band background */
  --rule: rgba(216, 207, 185, 0.28);       /* 1px hairlines */
  --rule-strong: rgba(216, 207, 185, 0.55);
}
```

The page has **no accent colour**. Remove the per-pollutant `--pollutant-accent` red/amber from the visuals. Keep passing it on the root `style` (the animation code ignores it), but don't use it in the new CSS.

### 3.2 Typography

| Role | Font | Weight | Size @1440 | Tracking | Case |
|---|---|---|---|---|---|
| Logo "WMD" (header) | **Playfair Display** | 700 | 88 px, line-height 0.9 | -0.01em | upper |
| Logo "WMD" (footer) | Playfair Display | 700 | 150 px | -0.01em | upper |
| Hero title "PM2.5" | Playfair Display | 600 | clamp(110px, 12.5vw, 180px), line-height 0.88 | -0.02em | — |
| "A SILENT KILLER" | **Cormorant Garamond** | 500 | 34 px | 0.14em | upper |
| Body paragraph (hero) | Cormorant Garamond | 500 | 22 px / 1.45 | 0 | sentence |
| Section headings ("GLOBAL COVERAGE", "ALL DOCUMENTARIES") | Cormorant Garamond | 500 | 22 px | 0.12em | upper |
| Nav, labels, buttons, table rows | **Archivo** | 400–500 | 13–15 px | 0.16em | upper |
| Small kicker ("DOCUMENTARY 01 / 08") | Archivo | 500 | 15 px | 0.22em | upper |
| Footer italic tagline | Cormorant Garamond | 500 *italic* | 15 px | 0.18em | upper |

Add to the existing Google Fonts URL in `index.html`:
`family=Playfair+Display:wght@600;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Archivo:wght@400;500`

Check the font choice by overlaying the reference at 50% opacity (§8). If "PM2.5" looks too high-contrast, try **Libre Caslon Text 700** before anything else.

### 3.3 Lines, shapes and spacing
- Every divider is **1px `var(--rule)`**. No shadows, no blur, no glassmorphism, no rounded corners. The only round elements are the pill CTA, the play circle and the decorative rings.
- Decorative rings: 1px `var(--rule-strong)` circles, partly cropped by the section edge (hero right, Coverage band, footer).
- Page side gutter: **72 px** (5%). Section vertical padding: 56–64 px.
- Base grid: 12 columns, 24 px gap, inside the 72 px gutters.

### 3.4 Texture and image treatment (this is what makes it look like the reference)

Global grain overlay: one fixed element inside `.wmd-doc`, `pointer-events:none`, `mix-blend-mode: overlay`, opacity 0.18.
```html
<svg class="wmd-grain" aria-hidden="true"><filter id="wmdGrain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#wmdGrain)"/></svg>
```

Sepia duotone for **every** photo (`.wmd-photo` class):
```css
.wmd-photo { filter: grayscale(1) sepia(0.28) contrast(1.08) brightness(0.72); }
```
For a closer match, use an SVG `feColorMatrix` that maps shadows to `#0d0f0c` and highlights to `#d8cfb9` (`filter: url(#wmdDuotone)`).

Vignette on photo sections: `radial-gradient(ellipse at 60% 40%, transparent 30%, rgba(13,15,12,.85) 100%)`, plus a left-to-right gradient behind the hero text (`linear-gradient(90deg, rgba(13,15,12,.9) 0%, rgba(13,15,12,.4) 45%, transparent 70%)`).

Parchment band (Global Coverage): `background: var(--parchment)` + the grain at opacity 0.35 + `radial-gradient` darkening at the edges.

---

## 4. New component tree

Replace the JSX in `PollutantDocumentary.jsx` with this. Put new files in `src/components/PollutantDocumentary/wmd/` and new CSS in `wmd/WmdDocumentary.css`. Delete the old `PollutantDocumentary.css` import only after D4 is settled.

```
<div.wmd-doc.documentary-page ref={containerRef}>      ← keep documentary-page (reduced-motion + scope)
  <WmdGrain/>
  <WmdHeader/>            (§5.1)  absolutely positioned over the hero
  <main.documentary-main-flow>
    <WmdHero/>            (§5.2)  id="documentary-hero-viewport"
    <WmdCoverageBand/>    (§5.3)
    <WmdDocumentaryStrip/>(§5.4)
    <WmdImpactRow/>       (§5.5)
    {D4 = keep: <DocumentaryPinnedStory/>, <DocumentarySection/>, <DocumentaryImageSection/>, <DocumentaryDataSection/> restyled}
    <WmdFooter/>          (§5.6)
  </main>
</div>
```

Props come from what `PollutantDocumentary.jsx` already computes: `pollutantData`, `cinematicTheme.chapterNum`, `currentPollutantValue`, `currentStation`, `internalLiveData.stations`, `weatherVariables`, `handleSelectAnotherPollutant`, `onBack`.

Retire `DocumentaryNav`, `DocumentaryHero`, `DocumentaryDataPanel`, `PollutantValue` and `DocumentaryFooter`. Delete them in a separate final commit after checking nothing else imports them (`grep -r`).

---

## 5. Section-by-section spec (1440 px)

Measurements are from the reference × 1.53. Percentages are of the viewport width.

### 5.1 Header (`WmdHeader`), overlays the top of the hero
- Height 150 px. `position:absolute; top:0; inset-inline:0; z-index:20`. Padding 56 px top, 72 px sides.
- **Left:** "WMD" logo (§3.2), and below it, 10 px gap, "WEAPONS OF MASS DESTRUCTION" in Archivo 13 px, tracking 0.2em.
- **Centre-right nav** (starts at ~40% from the left; gap 64 px between items): `DOCUMENTARIES` (active: 1px underline in `--bone-200`, 8 px below the text, full text width) · `MAP` · `TIMELINE` · `ABOUT`. Archivo 14 px, tracking 0.16em, colour `--bone-200` at 0.85 opacity.
- **Right:** 3 square icon buttons, **56 × 56**, 1px `--rule-strong` border, 16 px gap, icon 22 px.
- **Wiring (all real, no dead links):**
  - DOCUMENTARIES → scrolls to the strip (§5.4)
  - MAP → `window.location.search='?view=map'` (same as the current nav)
  - TIMELINE → scrolls to `#section-08-the-takeaway` (14-day evidence) if D4 = keep; otherwise to the impact row
  - ABOUT → scrolls to the footer
  - Search → opens the strip and focuses it
  - Globe → `?view=map`
  - Chart → scrolls to §5.5
- Root element must carry **`documentary-nav`** (it's an animation hook).

### 5.2 Hero (`WmdHero`), `<section id="documentary-hero-viewport" class="wmd-hero documentary-hero">`
- Height: `min(100vh, 940px)`, min 720 px. Full-bleed.
- **Layers, back to front:**
  1. `.documentary-hero-ambient-backdrop` wrapper
  2. `.documentary-hero-photo-layer.wmd-photo`: photo of a city skyline in smog with a lone rider (D6), `background-size:cover; background-position: 62% 40%`
  3. Foliage framing: if the photo has no trees, add a separate PNG/WebP of tree silhouettes on the left and top-right edges (`mix-blend-mode:multiply`)
  4. `.documentary-hero-haze-layer`: a warm haze gradient, no colour accent
  5. `<HeroAtmosphericCanvas/>` (unchanged), wrapped in `.wmd-hero__particles { opacity:.35; mix-blend-mode:screen; filter: sepia(1) saturate(.4); }` so the particles read as bone-coloured dust
  6. Left-text gradient + vignette (§3.4)
- **Left column** `.documentary-hero-editorial-col` (left 72 px, top 330 px, width 560 px):
  - `.documentary-pollutant-kicker-tag`: `DOCUMENTARY {chapterNum} / {total}` (total = 07 or 08, per D2)
  - `.documentary-pollutant-title-row` > `h1.documentary-pollutant-name`: `{pollutantData.symbol}` → "PM2.5". 4 px below the kicker. **Keep it as plain text**: the engine splits it into `.doc-hero-char` spans itself.
  - `h2.documentary-hero-headline`: "A SILENT KILLER". Add this as a new field `pollutantData.wmdTagline` in `pollutantDocumentaries.js`; for other pollutants, use the existing `heroSubtitle`.
  - `p.documentary-editorial-desc`: 4 lines, max-width 420 px. The reference copy says "a global investigation", but the data is Delhi. Use `pollutantData.shortDescription`, or write a new `wmdIntro` field that is honest about Delhi.
  - CTA row (margin-top 48 px): pill button, height 72 px, width 400 px, 1px `--rule-strong` border, radius 999. Inside it on the left, a **72 px filled `--bone-100` circle** with a `Play` icon in `--ink-900`. Text "WATCH DOCUMENTARY", Archivo 15 px, tracking 0.18em. Behaviour per D3.
  - Transcript row (margin-top 32 px): 38 px square bordered icon (`ScrollText`) + "VIEW TRANSCRIPT". Smooth-scrolls to the editorial sections (D4), otherwise to §5.5.
- **Right column** `.documentary-hero-spatial-col`:
  - Vertical 1px rule, 150 px tall, at right 205 px, top 380 px. Text to its right: "INVISIBLE / PARTICLES. / REAL / CONSEQUENCES." Archivo 14 px, tracking 0.22em, line-height 1.9.
  - Circular inset photo, **290 px diameter**, 1px `--rule-strong` ring 10 px outside it, centred at (right −40 px, top 710 px), so it's cropped by the viewport edge. Contents: forest/foliage photo, `.wmd-photo`.
- Don't render `.documentary-hero-center-col` or `.documentary-hero-bottom-deck`; the engine skips them.

### 5.3 Global Coverage band (`WmdCoverageBand`)
- Height ~510 px. Two zones: **left 75% parchment** (§3.4), **right 25% `--ink-800`**.
- Left zone (padding 48 px 72 px):
  - Heading "GLOBAL COVERAGE" (Cormorant 22 px, `--ink-800` text) followed by an 80 px hairline.
  - **Map plate**: left 72 px, 700 × 395 px, `--ink-700` fill, 1px dark border, grain. Inside it, a `d3-geo` `geoNaturalEarth1` world map: land `--sage-500` at 0.55 with a stipple pattern (`<pattern>` of 1.2 px dots, 3 px pitch), no country borders.
  - Markers: **only real stations**, from `internalLiveData.stations` (lat/lon). Each is a 4 px `--bone-100` dot with a 1 px glow. Group all Delhi stations under one "hotspot" marker: two concentric rings, 28 px and 46 px, in `--bone-200`, as in the reference. Caption below the plate in Archivo 11 px: `MONITORING COVERAGE · {n} CAAQMS STATIONS · DELHI NCR`.
  - **Smokestacks photo**: right of the map plate, full band height, ~300 px wide, `.wmd-photo`, feathered into the parchment on its left edge (mask-image linear-gradient).
  - A decorative ring (radius ~140 px) centred on the parchment/dark boundary at top 30%.
- Right zone (padding 56 px 40 px):
  - "TOPICS" (Cormorant 20 px, tracking 0.12em), hairline under it.
  - 5 rows, each 48 px tall with a hairline below, Archivo 14 px tracking 0.16em. These are anchor links to real sections:
    - AIR POLLUTION → `#section-01-what-are-they`
    - HEALTH IMPACTS → `#section-07-why-it-matters`
    - GLOBAL DATA → `#documentary-data-section`
    - POLICY RESPONSES → standards block
    - SOLUTIONS → footer / petition CTA
  - Bottom-left: a crosshair (1px vertical 90 px + horizontal 40 px). To its right, "CLEANER AIR / BRIGHTER / TOMORROWS." in Archivo 12 px, tracking 0.22em.

### 5.4 All Documentaries strip (`WmdDocumentaryStrip`)
- `--ink-800` band, padding 48 px 72 px 40 px. Root carries **`documentary-data-panel`** (animation hook for the chip stagger).
- Header row: "ALL DOCUMENTARIES" + 90 px hairline on the left; `0{N} TOTAL` on the right (Archivo 15 px, tracking 0.2em).
- Tiles: CSS grid, `repeat(N, 1fr)`, gap 16 px. Each tile is a **`button.doc-pollutant-chip`** (animation hook).
  - Image box: aspect 1 : 1.15 (≈155 × 178 px at 8 columns), 1px `--rule` border, `.wmd-photo`. Images come from `POLLUTANT_CINEMATIC_THEMES[id].heroImage` (existing vehicle photos) or from D6 replacements.
  - Label below: `0{n}.` on line 1, symbol on line 2 (Archivo 14 px, tracking 0.14em).
  - **Active tile** (current pollutant): the whole tile including the label sits on a `--bone-200` card with 8 px padding; label text in `--ink-900`, weight 600.
  - Hover: image `brightness(.85)` and the border goes to `--rule-strong`, 200 ms.
  - Click → `onSelectPollutant(id)` (existing handler; it already resets scroll and re-runs the animations).
  - `aria-current="page"` on the active tile.
- Below 900 px: horizontal scroll (`overflow-x:auto; scroll-snap-type:x mandatory`), tiles 140 px wide.

### 5.5 Global Impact row (`WmdImpactRow`)
- `--ink-800` band, top hairline, padding 40 px 72 px 56 px. Three columns: **[bar chart 33%] [contour + legend 33%] | vertical hairline | [key statistics 30%]**.

**(a) Bar chart, title "GLOBAL IMPACT"** (rename per D5, e.g. "24-HOUR PROFILE · DELHI"):
- Data: `pollutantData.sections.section06.diurnalPoints` (24 real values already in the data file). If D4 keeps the 14-day grid, the observed `dailyEvidenceWindow` days are a valid alternative.
- 24 bars with `scaleBand` padding 0.35. **Two tones as in the reference:** each bar in `--sage-500`, with the part above the CPCB `naaqsLimit` drawn in `--bone-200` (two stacked rects). This makes the threshold the visual story.
- Y axis: 5 ticks, Archivo 11 px `--sage-400`, horizontal hairline at the baseline only, no gridlines. Axis label in the unit (`µg/m³`). **Do not normalise to 0–100** unless the label says "% of peak".
- Size 390 × 170 px. Bar entrance: if you want one, add a GSAP `scaleY` stagger (transform-origin bottom, ScrollTrigger `start: 'top 80%'`) in a **new** small file `wmd/wmdAnimations.js`, called from the same `useEffect` and cleaned up the same way. Don't edit the main engine for this.

**(b) Contour map + legend, "PM2.5 EXPOSURE":**
- Plate 315 × 255 px, `--ink-700`.
- Data: live `internalLiveData.stations` (lat, lon, pm25) → a 60 × 50 IDW grid over the Delhi bounds from `ml/data/spatial_grids.json` (`lat 28.40–28.85`, `lon 76.90–77.40`). Reuse the IDW math in `heatmapRasterUtils.js` instead of writing new interpolation.
- Then `d3.contours().size([60,50]).thresholds([0,25,50,75,100,…])`. Fill each band from the 5-step legend scale `--olive-600 → --sage-500 → --bone-300 → --bone-200 → --bone-100`, with stroke 0.6 px `--ink-900` at 0.6 so it reads as topographic lines.
- **Thresholds in real units.** The legend in the reference reads 0/25/50/75/100. Use µg/m³ thresholds and say so (e.g. 0 / 60 / 120 / 180 / 240+, anchored on the NAAQS of 60). If there are fewer than 3 stations, show the plate with "Insufficient stations for interpolation" instead of a fake surface.
- Legend: a vertical 5-swatch bar (22 × 120 px) to the right of the plate, labels 100 → 0 top to bottom, title "PM2.5 EXPOSURE" in Archivo 11 px.
- Caption: `IDW ESTIMATE FROM {n} CAAQMS STATIONS · {lastUpdated}`.

**(c) Key statistics table:**
- Title "KEY STATISTICS", Cormorant 22 px, with a hairline. Then 4 rows of 52 px, hairline between rows, label left (Archivo 13 px), value right (Archivo 15 px, `--bone-100`).
- Every value must be real and cited. A footnote below the table lists sources in Archivo 10 px `--sage-400`.

| Label | Value | Source |
|---|---|---|
| GLOBAL DEATHS / YEAR | ≈ 6,700,000 (ambient + household air pollution) | WHO fact sheet "Ambient (outdoor) air pollution", 2022. **Verify the current figure before shipping**: WHO cites 6.7 M combined, 4.2 M ambient. Don't round up to 7 M unless the cited source says so. |
| PEOPLE EXPOSED | ≈ 99% (of the world population above WHO guideline levels) | WHO, 2022 |
| CURRENT CONCENTRATION | `{Math.round(currentPollutantValue)} µg/m³` with the station name in a tooltip | Live `/api/delhi-heatmap`; if it fell back to `DEFAULT_DELHI_BASELINE`, add the suffix "(baseline)". |
| WHO GUIDELINE | `{pollutantData.whoLimit} µg/m³ (24-h)` | Data file. The reference shows 5 µg/m³, which is the **annual** guideline. Pick one and label it "24-h" or "annual" correctly. |

- Store the static WHO rows in `pollutantDocumentaries.js` as `globalStats: [{label, value, sourceLabel, sourceUrl}]` per pollutant. Don't hard-code them in JSX.

### 5.6 Footer (`WmdFooter`), root has class **`documentary-footer`**
- Height ~430 px, full-bleed forest/mountain photo with `.wmd-photo` and a vignette.
- Left (left 72 px): a vertical hairline 200 px tall. At its top, a 60 px horizontal hairline. Below, 4 lines "THE AIR / WE BREATHE / SHAPES / TOMORROW." in Cormorant 22 px, tracking 0.16em. Use **`.doc-credo-line-1/2/3`** classes on the lines (animation hooks; combine lines 3 and 4 into `-3`).
- Right (right 72 px): "WMD" Playfair 150 px, "WEAPONS OF MASS DESTRUCTION" Archivo 13 px under it, then a 60 px hairline, then the italic tagline "KNOWLEDGE TODAY. / A SAFER TOMORROW."
- A decorative ring (radius ~230 px) behind the logo, cropped at the top.
- Hidden for screen readers: the decorative rings. Visible: an `onBack` "← Back to Atmospheric Cargo" text link in Archivo 12 px under the tagline. Keeps the existing exit path.

### 5.7 Kept sections (only if D4 = keep)
Restyle `DocumentaryPinnedStory`, `DocumentarySection`, `DocumentaryImageSection` and `DocumentaryDataSection` **with CSS only** (new rules under `.wmd-doc …` in `WmdDocumentary.css`). Keep their markup and class names, because the engine animates them:
- backgrounds `--ink-900/800`, remove all accent colours, glows, rounded cards and box-shadows
- titles → Cormorant uppercase, labels → Archivo
- cards → transparent with 1px `--rule` borders
- photos → `.wmd-photo` treatment

---

## 6. Animation hook contract (must keep)

| Hook class / id the engine looks for | Put it on (new markup) |
|---|---|
| `.documentary-page` (root, reduced-motion scope) | `.wmd-doc` root |
| `.documentary-nav` | `WmdHeader` root |
| `#documentary-hero-viewport` | `WmdHero` section |
| `.documentary-hero-ambient-backdrop`, `.documentary-hero-photo-layer`, `.documentary-hero-haze-layer`, `.hero-atmospheric-canvas` | hero background layers (§5.2) |
| `.documentary-pollutant-kicker-tag` | "DOCUMENTARY 01 / 07" |
| `.documentary-pollutant-title-row` > `.documentary-pollutant-name` | "PM2.5" wrapper and h1 |
| `.documentary-hero-headline`, `.documentary-editorial-quote`, `.documentary-editorial-desc` | tagline, (omit quote), paragraph |
| `.documentary-hero-editorial-col`, `.documentary-hero-spatial-col` | left / right hero columns |
| `.documentary-data-panel` + `.doc-pollutant-chip` | strip root + each tile |
| `.documentary-footer`, `.doc-credo-line-1/2/3` | footer + tagline lines |
| everything inside kept sections (D4) | unchanged |

Allowed edits in `documentaryAnimations.js`. Make **no other changes**.
1. Hero scroll transform (line ~454): `pollutantTitleRow` scales to 1.42 and drifts. Check that it still looks right with the larger serif title. If it overflows, lower `scale` to 1.2. That's the only allowed number change.
2. Kicker tween (line ~127) animates `letterSpacing` to `0.22em`. That already matches §3.2.
3. Add `.wmd-hero__particles` and `.documentary-footer` to the reduced-motion selector list (line 57), so they're visible when motion is off.

---

## 7. Responsive behaviour
- **≥1200 px:** as specified.
- **900–1199:** hero title clamp; header nav gap 32 px. Coverage band: map plate shrinks to 60%, the smokestacks photo is hidden, topics column 30%. Impact row: contour and stats stay side by side, the bar chart moves to full width above them.
- **<900:**
  - Header: logo + a hamburger (`Menu` icon) that opens a full-screen `--ink-900` overlay with the nav and icons.
  - Hero: text column full width at the bottom (top 45%), right tagline hidden, circle inset 160 px.
  - Coverage: stacked (map, then topics).
  - Strip: horizontal scroll.
  - Impact: three stacked blocks.
  - Footer: stacked, logo 96 px.
- 16 px minimum side gutter on phones. No horizontal page scroll (`overflow-x:hidden` already on the root).

---

## 8. Making it "exactly like" the reference: verification loop

1. Add a dev-only overlay: `?documentary=pm25&ref=1` renders the reference image `position:fixed; inset:0; opacity:.5; pointer-events:none; z-index:9999; width:100vw` on top of the page. Use the in-app browser at **1440 px** and **941 px** viewport width.
2. Compare in this order and fix before moving on: hero (logo size and position, title baseline, CTA position) → header icons → coverage band split line → strip tile size → impact column widths → footer.
3. Allowed tolerance: ±8 px position, ±4 px font size at 1440 px.
4. Screenshot each band at 1440 and 375 px and attach them to the PR.
5. Reduced motion: emulate `prefers-reduced-motion: reduce` and confirm every section is visible.
6. Pollutant switch: click every tile. The hero title, chapter number, bars, contour and stats must update, the page must scroll to the top, and the animations must replay with no console errors. Watch for ScrollTrigger leaks (pin spacers piling up).
7. `npm run build`: the `PollutantDocumentary` chunk should grow by < 60 kB gzip (d3 modules + topojson). Load `world-atlas/countries-110m.json` with a dynamic `import()` inside `WmdCoverageBand` so it isn't in the main chunk.
8. `npx oxlint src/components/PollutantDocumentary` must be clean.
9. Data audit: grep the new files for `Math.random`, hard-coded numbers in JSX and "synced"/"live" labels. Every number must trace back to the data file, the API or a cited source.

---

## 9. Suggested commit sequence
1. Fonts, tokens, grain, `wmd/` folder skeleton, reference overlay (no visual change to the page yet)
2. `WmdHeader` + `WmdHero` wired into `PollutantDocumentary.jsx`; check hero animations
3. `WmdCoverageBand` (d3-geo map, topics anchors)
4. `WmdDocumentaryStrip`
5. `WmdImpactRow` (bars, contour, stats + `globalStats` data with sources)
6. `WmdFooter`
7. Restyle the kept sections (D4)
8. Responsive pass
9. Remove the retired components and old CSS (after `grep` confirms they're unused); update `docs/state/FRONTEND_STATE.md`

## 10. Files touched (summary)
- **New:** `src/components/PollutantDocumentary/wmd/{WmdHeader,WmdHero,WmdCoverageBand,WmdDocumentaryStrip,WmdImpactRow,WmdBarChart,WmdContourMap,WmdFooter,WmdGrain}.jsx`, `wmd/WmdDocumentary.css`, optional `wmd/wmdAnimations.js`; `public/assets/documentary/wmd/*` + `CREDITS.md`; `docs/reference/pm25-wmd-reference.webp`
- **Edited:** `PollutantDocumentary.jsx` (JSX tree only), `src/data/pollutantDocumentaries.js` (`wmdTagline`, `wmdIntro`, `globalStats`), `index.html` (fonts), `package.json` (d3 modules), `documentaryAnimations.js` (§6 only)
- **Retired:** `DocumentaryNav.jsx`, `DocumentaryHero.jsx`, `DocumentaryDataPanel.jsx`, `PollutantValue.jsx`, `DocumentaryFooter.jsx`, the old styles in `PollutantDocumentary.css`
