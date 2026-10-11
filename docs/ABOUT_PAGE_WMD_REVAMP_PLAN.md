# About Page — Editorial (WMD-Style) Frontend Revamp

**Target:** `?page=about` (`src/components/About/`).
**Goal:** restyle the About page into the same editorial family as the Pollutant Documentary (`src/components/PollutantDocumentary/wmd/`), using the **same decisions already agreed for the Stats page** (`docs/STATS_PAGE_WMD_REVAMP_PLAN.md`): warm ink/bone palette, brass accent, serif editorial type with a thin mono/label layer, film grain, hairline rules, square corners, one parchment band.
**Nature of the change:** **presentation only.** No content, data, routing, state, animation or behaviour changes.

This document is written to be executed by an AI coding agent. Read §0 and §1 completely before editing anything. Work phase by phase (§5) and run the checks in §6 after every phase.

---

## 0. Hard rules (non-negotiable)

1. **Blast radius = the About page only.** You may edit **only** the files in §1.1. Any diff outside that list is a bug. Check with `git diff --name-only` before finishing.
2. **No content changes.** Do not add, remove, reword, re-case or reorder any visible text, number, label, tag, `alt`, `aria-label` or tooltip in the JSX. This includes the constants `POLLUTANT_ART_MAP`, `POLLUTANT_EDITORIAL_DESCRIPTIONS` and `VERIFIED_STATS`. CSS `text-transform` changes are allowed. Don't add new visible copy.
3. **No behaviour changes.** Keep, unchanged:
   - `handleGoBack`, `handleGoToDashboard`, `handlePollutantClick`, the inline Stats-button `onClick`, and all props (`onBack`, `onSelectPollutant`, `onOpenDashboard`).
   - State: `activePollutantIdx`, `activeStatIndex`, the scroll-reset effect.
   - **The entire GSAP `useEffect`** (lines ~158–360): selectors, refs, timings, `clipPath` values, ScrollTriggers, the `[activeStatIndex]` dependency. Don't edit it at all.
   - The `ref`s: `containerRef`, `heroMediaRef`, `smokeMediaRef`, `closingMediaRef`.
   - Every image `src` and the `loading="lazy"` attributes.
4. **Keep every existing `className` and `id`.** You may *add* classes (modifiers) and purely decorative `aria-hidden` elements. Never rename or remove one. Several are asserted by tests (§1.3) or targeted by GSAP (§1.4).
5. **Don't fight GSAP.** For elements GSAP animates (§1.4), CSS must not set `transform`, `opacity`, `clip-path` or `transition` on `transform`/`opacity`. Hover effects on those elements may only change `border-color`, `box-shadow`, `background-color`, `color` or `filter`.
6. **Zero-Faking Directive (`AGENTS.md`) still applies.** Don't add decorative numbers, badges or status labels. Decorative additions must be non-textual (rules, grain, corner marks).
7. **No new dependencies, no `index.html` edits.** All fonts (Playfair Display 600/700, Cormorant Garamond 500/600 + italic 500, Archivo 400/500, IBM Plex Mono) are already loaded.
8. **Scope every CSS rule** under `.about-page` (or an `about-`-prefixed class). Define tokens on `.about-page`, **never on `:root`, `body` or `html`**. No `@layer`. Do **not** import or reference anything from `PollutantDocumentary/` or `Stats/` (separate lazy chunks; cross-imports couple the pages).

---

## 1. Files

### 1.1 Allowed to edit / create

| File | What changes |
|---|---|
| `src/components/About/AboutPage.css` | Full restyle (bulk of the work) |
| `src/components/About/AboutPage.jsx` | Add the grain component, add modifier classes, replace colour literals in the trend SVG. Nothing else. |
| `src/components/About/AboutGrain.jsx` | **New.** About-owned film grain overlay |

### 1.2 Do NOT touch

- `src/components/PollutantDocumentary/**`: the style reference. Read `wmd/WmdDocumentary.css`, `wmd/WmdHero.jsx`, `wmd/WmdFooter.jsx` for idioms only.
- `src/components/Stats/**`: a sibling page with its own revamp.
- `src/App.jsx`, `src/App.css`, `src/index.css`, `index.html`, `src/main.jsx`
- `src/data/**` (including `pollutantDocumentaries.js`, which feeds the poster grid)
- `public/assets/**`: reuse the existing images; don't add, replace or re-encode any.
- `tests/**`, `package.json`, `vite.config.js`

### 1.3 Test contract (`tests/aboutPageVerification.test.js`)

The test server-renders `AboutPage`. All of these must still be present after the revamp:

- Classes: `about-page`, `about-ambient-background`, `about-back-button`, `about-map-mesh-visual`, `about-spectral-visual`, `about-trend-graph-visual`
- Hero: `THE AIR`, `WE BREATHE.`, `Every breath tells a story.`, `delhi_photochemical_smog.webp`, `Scroll`
- Scale: `DID YOU KNOW?`, `76%`, `Indians`, the two fact sentences, `Source: CSE Report, 2019`, `billowing_smoke_infographic.jpg`
- Pollutants: `WHAT WE BREATHE.`, the `aria-label="Open interactive documentary for …"` pattern, every pollutant `name`, `symbol` and `NAAQS · {limit}`
- Threat: the three headlines (`INVISIBLE DOESN'T MEAN HARMLESS.`, `THE AIR CHANGES. EVERY DAY.`, `WHAT YOU CAN MEASURE, YOU CAN UNDERSTAND.`)
- Why: `WHY VAYUVITALS.`, `MONITOR.`, `UNDERSTAND.`, `MAKE INFORMED DECISIONS.`
- Closing: `THE FIRST STEP`, `IS AWARENESS.`, `Explore the air around you.`, `EXPLORE LIVE AIR`
- **Negative assertion:** the HTML must **not** contain `about-footer`. Don't add a footer, and don't use `about-footer` in any new class name (e.g. avoid `about-footer-rule`).

> ⚠️ `about-ambient-background` must stay in the DOM. Repurpose it as the grain host (§5.1).

### 1.4 GSAP-animated elements (CSS must not set transform/opacity/clip-path/transitions on these)

`.about-hero-word`, `.about-hero-subline`, `.about-scroll-indicator`, `.about-hero-media` (scale + clipPath), `.about-scale-media` (scale + yPercent), `.about-infographic-header`, `.about-infographic-stat-number`, `.about-pollutant-poster`, `.about-threat-headline`, `.about-why-composition`, `.about-closing-media` (scale).

> Existing CSS puts `transform: scale(1.02)` on the three media images and `transition: all` plus a `translateY` hover on `.about-pollutant-poster`. These already conflict with GSAP. **Remove them** as part of this revamp (Phases 3, 4, 7, 8); this fixes jitter and doesn't change any intended behaviour.

---

## 2. Design direction

| | Pollutant Documentary (reference) | Stats (agreed) | **About (target)** |
|---|---|---|---|
| Mood | Cinematic documentary | Archival research instrument | **Editorial photo essay / poster sequence** |
| Palette | Ink/bone + per-pollutant accent | Ink/bone + brass | **Ink/bone + brass** for page chrome; **per-pollutant accent only on its own poster** (data-driven, already in JSX) |
| Type | Playfair / Cormorant / Archivo | Same + IBM Plex Mono for figures | **Same as Stats.** Mono is limited to source/benchmark lines, NAAQS tags and the visual HUD labels. |
| Photos | Full sepia duotone | None (particle canvases) | **Toned sepia**: slightly warmer and less monochrome than the documentary (see `--about-photo-filter`) |
| Parchment band | Global Coverage | Dataset section | **Why VayuVitals** (dark visual plates on parchment, mirroring the Stats dataset band) |
| Signature details | Grain, hairlines, portal, tour pill | Grain, hairlines, brass corner marks | **Grain, hairlines, brass corner marks on the three "Why" plates, brass scene kickers** |

**Family resemblance:** tokens, serif hierarchy, hairlines, square corners, grain, alternating ink bands, a parchment band.
**Kept distinct from the documentary:** brass instead of per-page pollutant colour, lighter photo toning, poster-grid composition, no portal/tour/header nav.
**Kept consistent with Stats:** same brass accent, same chrome (square back button, label-style top actions), same grain, same corner marks.

### 2.1 Decisions applied by default (change before execution if needed)

| # | Decision | Default used in this plan |
|---|---|---|
| A1 | Accent | Brass `#b8935a`, same as Stats. Stats and About read as the "VayuVitals institutional" pages; documentaries keep pollutant colours. |
| A2 | Parchment band | Section `#why` (Why VayuVitals) |
| A3 | Pollutant posters | Sepia at rest; **colour returns on hover/focus/active** with the pollutant's own accent border. This previews the documentary each poster opens. |
| A4 | Grain + corner marks | Grain on the whole page; corner marks only on the three "Why" visual plates (no canvases here) |

---

## 3. Design tokens

Replace the current `--about-font-*` block on `.about-page` with the block below. Afterwards, raw hex/rgba values in `AboutPage.css` may only appear **inside this token block**, with one exception: the illustrative pollutant fills in Phase 6.

```css
.about-page {
  /* Base palette: mirrors .wmd-doc (copied, not imported) */
  --about-ink-900: #0d0f0c;
  --about-ink-800: #141611;
  --about-ink-700: #1c1f19;
  --about-olive-600: #2a2d24;
  --about-sage-500: #6f7462;   /* decorative / large muted only */
  --about-sage-400: #8e927e;   /* secondary text */
  --about-bone-300: #b9b19c;
  --about-bone-200: #d8cfb9;   /* primary text */
  --about-bone-100: #ece5d3;   /* display text */
  --about-parchment: #c9c1ab;

  --about-rule: rgba(216, 207, 185, 0.18);
  --about-rule-strong: rgba(216, 207, 185, 0.38);
  --about-rule-ink: rgba(13, 15, 12, 0.22);

  /* Brass accent: identical to Stats */
  --about-accent: #b8935a;
  --about-accent-rgb: 184, 147, 90;
  --about-accent-deep: #7a5c2e;          /* rules/marks/large text on parchment only */
  --about-accent-rule: rgba(184, 147, 90, 0.35);
  --about-accent-tint: rgba(184, 147, 90, 0.08);
  --about-accent-glow: rgba(184, 147, 90, 0.35);

  /* Photography */
  --about-photo-filter: grayscale(0.85) sepia(0.32) contrast(1.08) brightness(0.72);
  --about-photo-filter-dim: grayscale(0.9) sepia(0.3) contrast(1.06) brightness(0.5);
  --about-photo-filter-reveal: grayscale(0.15) sepia(0.1) contrast(1.1) brightness(0.62);
  --about-scrim: 13, 15, 12;             /* rgb of ink-900, for gradients: rgba(var(--about-scrim), a) */
  --about-text-shadow: 0 2px 18px rgba(0, 0, 0, 0.75);
  --about-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);

  /* Typography */
  --about-font-display: 'Playfair Display', Georgia, serif;
  --about-font-serif: 'Cormorant Garamond', Georgia, serif;
  --about-font-label: 'Archivo', -apple-system, BlinkMacSystemFont, sans-serif;
  --about-font-mono: 'IBM Plex Mono', 'JetBrains Mono', monospace;

  /* Spacing */
  --about-gutter: clamp(16px, 5vw, 72px);
  --about-section-pad-y: clamp(72px, 9vw, 120px);
  --about-max: 1360px;

  background-color: var(--about-ink-900);
  color: var(--about-bone-200);
  font-family: var(--about-font-serif);
}
```

**Colour rules** (same as Stats)
- Small text (< 18px) on ink or on photos behind a scrim: `bone-200`, `bone-100`, `sage-400` or `accent`. Never `sage-500`.
- Small text on parchment: `ink-900` or `olive-600` only.
- Brass is reserved for: scene kickers (`.about-poster-index`), active tabs, CTA, focus rings, hover borders, hairline accents, corner marks, the scroll-line sweep.
- The only non-brass accent is `var(--pollutant-accent)`, set inline per poster from data. Use it **only inside `.about-pollutant-poster`**.
- No `backdrop-filter`/glassmorphism anywhere. Remove all existing `backdrop-filter` declarations.
- `text-shadow: var(--about-text-shadow)` is allowed **only** on text sitting over photography.

### 3.1 Type scale

| Role | Selector(s) | Font | Size | Wt | Tracking | Case | Colour |
|---|---|---|---|---|---|---|---|
| Hero headline | `.about-hero-headline` | Playfair | `clamp(3.6rem, 10vw, 9rem)`, lh 0.9 | 600 | `-0.01em` | uppercase (as authored) | bone-100 |
| Poster / threat / closing headline | `.about-threat-headline`, `.about-closing-headline` | Playfair | `clamp(2.6rem, 7vw, 6rem)`, lh 0.95 | 600 | `-0.01em` | uppercase (as authored) | bone-100 |
| Section headline | `.about-section-headline` | Playfair | `clamp(2.4rem, 5.2vw, 4.4rem)`, lh 1 | 600 | `-0.005em` | uppercase (as authored) | bone-100 |
| Big statistic | `.about-infographic-stat-number` | Playfair | `clamp(6rem, 16vw, 13.5rem)`, lh 0.85 | 600 | `-0.02em` | — | bone-100 |
| Stat target ("Indians") | `.about-infographic-target-label` | **Cormorant italic** | `clamp(3.2rem, 9vw, 8rem)`, lh 0.9 | 500 | `0` | as authored | bone-200 |
| Kicker headline ("DID YOU KNOW?") | `.about-did-you-know` | Cormorant | `clamp(1.4rem, 2.6vw, 2.1rem)` | 500 | `0.14em` | uppercase | bone-100 |
| Lead / subline | `.about-hero-subline`, `.about-closing-subline`, `.about-section-subline` | Cormorant | `clamp(1.25rem, 2.2vw, 1.75rem)`, lh 1.35 | 500 | 0 | — | bone-200 |
| Body / fact / micro | `.about-infographic-fact`, `.about-threat-micro`, `.about-why-sentence`, `.about-pollutant-short-phrase` | Cormorant | 17–22px (see phases), lh 1.45 | 500 | 0 | — | bone-200 @ .85 |
| Scene kicker | `.about-poster-index` | Archivo | 12px | 600 | `0.22em` | uppercase | accent |
| Category label | `.about-poster-category` | Archivo | 12px | 500 | `0.18em` | uppercase | sage-400 (bone-200 @ .8 over photos) |
| Data / source / HUD | `.about-source-*`, `.about-poster-tag`, `.spec-*`, `.station-label`, `.about-*-meta` HUD rows | IBM Plex Mono | 11–13px | 400–500 | `0.06–0.1em` | as authored | sage-400 / bone-200 |

Use `font-variant-numeric: tabular-nums` on `.about-infographic-stat-number`, `.spec-val`, `.about-poster-tag`.

### 3.2 Shape, rules, motion

- `border-radius: 0` everywhere **except**: the stat-tab group and tab pills, the closing CTA (pills, 999px), radar rings and station pulse dots (circles). This mirrors WMD's pill/circle exception.
- Hairlines are 1px using `--about-rule*`. Sections are separated by `border-top: 1px solid var(--about-rule)`.
- Transitions: 150–300ms `ease` on `color`, `background-color`, `border-color`, `box-shadow`, `filter` only. **No `transition: all`.**
- Hover never moves elements (no `translate`/`scale`) **except** the icon nudges that already exist (`.about-back-icon`, `.about-poster-arrow`, `.about-closing-cta-arrow`), which are not GSAP targets and may keep their `translateX`.
- Keep the existing `@keyframes` (`aboutScrollLineAnim`, `radarSweepAnim`, `pulseStation`) and keep the existing `prefers-reduced-motion` block, extending it in Phase 9.

---

## 4. Page layout (band order, unchanged)

| # | Section (unchanged id / class) | Band | Treatment |
|---|---|---|---|
| — | `.about-ambient-background` | fixed | grain host (multicolour radial glows removed) |
| — | `.about-back-button-root`, `.about-top-bar` | fixed chrome | restyled to match Stats chrome |
| 01 | `#hero` `.about-hero-section` | photo, full-bleed | toned sepia + ink scrim |
| 02 | `#scale` `.about-scale-section` | photo, full-bleed | toned sepia smoke + left-to-right ink scrim |
| T | `#threat` `.about-threat-section` | 3 photo frames | toned sepia, frames separated by brass hairlines (gap → 0) |
| 03 | `#pollutants` `.about-pollutants-section` | `ink-800` | sepia poster grid, colour reveal on hover/active |
| 04 | `#why` `.about-why-section` | **parchment** (add `about-why-section--parchment`) | dark plates with brass corner marks |
| 05 | `#closing` `.about-closing-section` | photo, full-bleed | toned sepia forest + ink scrim |

Content width: `max-width: var(--about-max)`, horizontal padding `var(--about-gutter)` (replaces the mixed 40/48/20/24px values).

---

## 5. Implementation phases

Do them in order. After each phase run §6.1.

### Phase 1: Tokens, root, grain

**CSS**
1. Replace `.about-page` root with the §3 token block. Keep `overflow-x: clip`, `box-sizing`, font smoothing, and the `.about-page *` box-sizing rule.
2. Rewrite `.about-ambient-background`: delete the three multicolour radial gradients and `#07090e`. Keep `position: fixed; inset: 0; pointer-events: none;`. Set `z-index: 90` (above content at `z-index: 2`, below chrome at 110/120).
3. Add `.about-page .about-grain { width: 100%; height: 100%; display: block; mix-blend-mode: overlay; opacity: 0.16; }`.
4. Replace **every** `#07090e` / `rgba(7, 9, 14, …)` in the file with `var(--about-ink-900)` / `rgba(var(--about-scrim), …)`.

**New file `src/components/About/AboutGrain.jsx`**
```jsx
import React from 'react';

/**
 * AboutGrain - film grain overlay owned by the About page.
 * Deliberately not shared with WmdGrain/StatsGrain so pages stay decoupled.
 */
export default function AboutGrain() {
  return (
    <svg className="about-grain" aria-hidden="true" focusable="false">
      <filter id="aboutGrainFilter">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#aboutGrainFilter)" />
    </svg>
  );
}
```

**JSX**
- `import AboutGrain from './AboutGrain';`
- `<div className="about-ambient-background" aria-hidden="true" />` → 
  ```jsx
  <div className="about-ambient-background" aria-hidden="true">
    <AboutGrain />
  </div>
  ```

### Phase 2: Fixed chrome (match Stats)

CSS only. Keep positions (`28px`/`24px`, mobile `18px`).

- `.about-back-button`: 44×44, `border-radius: 0`, `background: var(--about-ink-900)`, `border: 1px solid var(--about-accent-rule)`, `color: var(--about-bone-200)`. Remove `backdrop-filter`, the heavy shadow, `transition: all` and `outline: none`.
  - `:hover` → `border-color: var(--about-accent); color: var(--about-accent); background: var(--about-accent-tint); box-shadow: 0 0 14px var(--about-accent-glow);`. Remove the `translateX(-3px)` on the button (keep the icon nudge).
  - `:active` → remove the transform rule.
  - `:focus-visible` → `outline: 1px solid var(--about-accent); outline-offset: 3px;` (replaces the blue ring).
- `.about-back-tooltip`: square, `background: var(--about-ink-700)`, `border: 1px solid var(--about-rule-strong)`, Archivo 11px `0.16em` uppercase, bone-200, no blur.
- `.about-nav-pill-btn` (Stats / Live Air): **square label buttons**. `border-radius: 0`, `background: rgba(var(--about-scrim), 0.72)` (solid-ish, no blur), `border: 1px solid var(--about-accent-rule)`, Archivo 12px 500 `0.18em` uppercase, bone-200, padding `10px 16px`, icon colour `var(--about-accent)`.
  - `:hover` → brass border + text, `background: var(--about-accent-tint)`. Remove `translateY`.
  - `:focus-visible` → brass outline as above.

### Phase 3: Hero (`#hero`)

- `.about-hero-section`: padding `120px var(--about-gutter) clamp(56px, 8vw, 88px)`. Layout is unchanged (bottom-aligned).
- `.about-hero-media`: `filter: var(--about-photo-filter)`. **Delete `transform: scale(1.02)`** (GSAP owns transform). Keep `object-fit`, `object-position`, `will-change`.
- `.about-hero-gradient-overlay` → WMD-style scrim:
  ```css
  background:
    linear-gradient(90deg, rgba(var(--about-scrim), 0.82) 0%, rgba(var(--about-scrim), 0.35) 45%, transparent 70%),
    linear-gradient(180deg, rgba(var(--about-scrim), 0.35) 0%, transparent 35%, rgba(var(--about-scrim), 0.9) 92%, var(--about-ink-900) 100%);
  ```
- `.about-hero-content`: `max-width: var(--about-max)`.
- `.about-hero-badge-wrap`: **no pill**. Remove background, border, radius, blur and padding. Becomes a row with a leading 40px brass hairline: `::before { content: ''; width: 40px; height: 1px; background: var(--about-accent); }`, `gap: 14px`, `margin-bottom: 22px`.
- `.about-hero-headline`: per §3.1, with `text-shadow: var(--about-text-shadow)`. Don't touch `.about-hero-word` styles except colour inheritance (it's a GSAP target: keep `display: inline-block`, `transform-origin`, `will-change`).
- `.about-hero-subline`: Cormorant lead per §3.1, `max-width: 34ch`, `margin-bottom: 44px`. **Do not** set opacity (GSAP target); remove the existing `opacity: 0.92` and use `color: var(--about-bone-200)` instead.
- `.about-scroll-indicator`: Archivo 11px `0.22em` uppercase, sage-400 (no opacity rule; GSAP target).
- `.about-scroll-line`: `background: var(--about-rule-strong)`; `::after` background `var(--about-accent)`.

### Phase 4: Scale of the problem (`#scale`)

- `.about-scale-section`: `background-color: var(--about-ink-900)`; padding `var(--about-section-pad-y) var(--about-gutter)`.
- `.about-scale-media`: `filter: var(--about-photo-filter)`. **Delete `transform: scale(1.02)`.**
- `.about-scale-overlay`: same geometry as today, colours tokenised:
  ```css
  background:
    linear-gradient(90deg, transparent 0%, transparent 28%, rgba(var(--about-scrim), 0.5) 52%, rgba(var(--about-scrim), 0.9) 100%),
    linear-gradient(180deg, var(--about-ink-900) 0%, transparent 18%, transparent 82%, var(--about-ink-900) 100%);
  ```
- `.about-infographic-header`: `border-bottom: 1px solid var(--about-accent-rule)`. (GSAP target: no transform/opacity.)
- `.about-did-you-know`: Cormorant per §3.1, `text-shadow: var(--about-text-shadow)`.
- `.about-scale-cloud-tag`: **no pill/blur**. Transparent background, `border-left: 1px solid var(--about-accent)`, padding `4px 0 4px 12px`, radius 0. `.about-cloud-tag-dot`: brass, glow `0 0 10px var(--about-accent-glow)`. `.about-cloud-tag-text`: Plex Mono 11px bone-200 @ .85.
- **Stat tabs** (`.about-stat-tabs`, `.about-stat-tab-pill`): keep the pill shape. Group: `background: rgba(var(--about-scrim), 0.7)`, `border: 1px solid var(--about-rule-strong)`, no blur/shadow. Pill: Archivo 11px 500 `0.14em` uppercase, sage-400 → hover bone-100. `.active`: `background: var(--about-accent); color: var(--about-ink-900); font-weight: 600; box-shadow: none`. Add `:focus-visible` brass outline. Replace `transition: all` with colour/background transitions. Add `flex-wrap: wrap` so the three tabs wrap at phone width.
- `.about-infographic-prefix`: Cormorant italic 500 `clamp(1.3rem, 2.4vw, 2rem)`, bone-200, keep `margin-bottom: -6px`.
- `.about-infographic-stat-number`: Playfair per §3.1, `text-shadow: var(--about-text-shadow)`. GSAP target: no transform/opacity.
- `.about-infographic-target-label`: Cormorant italic per §3.1, `text-shadow: var(--about-text-shadow)`, `margin-bottom: 24px`.
- `.about-infographic-fact`: Cormorant 500 `clamp(1.15rem, 2vw, 1.5rem)`, lh 1.45, bone-100, `max-width: 34ch`.
- **Source box** → editorial citation strip: `.about-infographic-source-box`: `background: rgba(var(--about-scrim), 0.72)`, no blur, `border-radius: 0`, `border: 0; border-top: 1px solid var(--about-accent-rule); border-bottom: 1px solid var(--about-rule)`, padding `14px 0`, no shadow, `max-width: 680px`.
  - `.about-source-meta`: Plex Mono 12px, bone-200. `.about-source-label`: bone-100 500. `.about-source-divider`: sage-500. `.about-source-benchmark`: `var(--about-accent)` 11px (was sky blue).
  - `.about-source-link`: square, transparent, `border: 1px solid var(--about-accent-rule)`, Archivo 11px 600 `0.16em` uppercase, bone-100. Hover → brass border + text + tint, **no translateY**. Focus → brass outline.

### Phase 5: Invisible Threat frames (`#threat`)

- `.about-threat-section`: `background: var(--about-ink-900)`.
- `.about-threat-sequence`: `gap: 0`. Add `.about-threat-frame + .about-threat-frame { border-top: 1px solid var(--about-accent-rule); }`.
- `.about-threat-frame`: padding `clamp(64px, 8vw, 96px) var(--about-gutter)`. Keep `min-height`.
- `.about-threat-media`: `filter: var(--about-photo-filter)`.
- `.about-threat-gradient`: tokenise the existing two gradients (`rgba(var(--about-scrim), …)`, end stop `var(--about-ink-900)`).
- `.about-threat-content`: `max-width: var(--about-max)`.
- `.about-threat-meta`: add the same 40px brass leading hairline as the hero badge (`::before`).
- `.about-threat-headline`: Playfair per §3.1, `max-width: 16ch`, `text-shadow: var(--about-text-shadow)`. GSAP target: no transform/opacity.
- `.about-threat-micro`: Cormorant 500 `clamp(1.1rem, 1.8vw, 1.4rem)`, bone-200, `max-width: 46ch`.

### Phase 6: What We Breathe (`#pollutants`)

**Section shell + shared section header** (`.about-section-header` is shared with `#why`; the parchment overrides come in Phase 7):
- `.about-pollutants-section`: `background: var(--about-ink-800)`; `padding: var(--about-section-pad-y) 0`; `border-top: 1px solid var(--about-rule)`.
- `.about-section-header`: `max-width: var(--about-max)`; `padding: 0 var(--about-gutter)`; `margin: 0 auto 48px`; no border. Draw the hairline on a pseudo element so it lines up with the content edge, not the padded box: `.about-section-header::after { content:''; display:block; height:1px; background: var(--about-accent-rule); margin-top: 28px; }`.
- `.about-header-meta`: the same 40px brass leading hairline (`::before`).
- `.about-section-headline`: Playfair per §3.1. `.about-section-subline`: Cormorant lead, `max-width: 40ch`.

**Poster grid**
- `.about-pollutants-poster-grid`: `max-width: var(--about-max)`; `padding: 0 var(--about-gutter)`; `grid-template-columns: repeat(auto-fill, minmax(min(340px, 100%), 1fr))` (the `min()` prevents overflow at 375px); `gap: 24px`.

**Poster card** (`.about-pollutant-poster`, a `<button>` and a GSAP target):
- `border-radius: 0`; `border: 1px solid var(--about-rule)`; `background: var(--about-ink-700)`; `box-shadow: none`; padding `28px`; `min-height: 440px`.
- **Remove** `transition: all`, the hover `transform: translateY(-6px)` and `outline: none`. Use `transition: border-color .25s ease, box-shadow .25s ease;`.
- `:hover`, `.is-active-pollutant`, `:focus-visible` → `border-color: var(--pollutant-accent); box-shadow: inset 0 0 0 1px var(--pollutant-accent), 0 0 24px var(--pollutant-glow);` (accent comes from the inline style already in JSX).
- `:focus-visible` additionally: `outline: 1px solid var(--about-accent); outline-offset: 4px;`.
- `.about-poster-bg-img`: `filter: var(--about-photo-filter-dim)`; transition `filter .5s ease, transform .6s ease` (the image is **not** a GSAP target, so the subtle zoom may stay).
  - Poster `:hover` / `.is-active-pollutant` / `:focus-visible` → `.about-poster-bg-img { filter: var(--about-photo-filter-reveal); transform: scale(1.04); }`. This is the colour-reveal preview (decision A3).
- `.about-poster-vignette`: tokenised gradient `linear-gradient(180deg, rgba(var(--about-scrim),0.45) 0%, rgba(var(--about-scrim),0.15) 40%, rgba(var(--about-scrim),0.92) 88%, var(--about-ink-900) 100%)`.
- `.about-poster-tag` (NAAQS): Plex Mono 11px bone-200, square, `background: rgba(var(--about-scrim), 0.7)`, `border: 1px solid var(--about-rule-strong)`, no blur.
- `.about-poster-arrow-wrap`: 36×36 **square**, transparent, `border: 1px solid var(--about-rule-strong)`, bone-200, no blur. Poster hover → `background: var(--pollutant-accent); border-color: var(--pollutant-accent); color: var(--about-ink-900)`. Remove `translateX` on the wrap; keep the existing icon nudge by moving it to `.about-poster-arrow { transition: transform .25s ease }` + `:hover .about-poster-arrow { transform: translateX(3px) }`.
- `.about-pollutant-huge-symbol`: Playfair 600 `clamp(3rem, 6vw, 5rem)`, lh 0.95, bone-100, `text-shadow: var(--about-text-shadow)`.
- `.about-pollutant-editorial-name`: Cormorant 600 `1.45rem`, bone-100.
- `.about-pollutant-short-phrase`: Cormorant 500 `1.05rem`, lh 1.4, bone-200 @ .82, `max-width: 32ch`.

### Phase 7: Why VayuVitals: parchment band (`#why`)

**JSX:** add a modifier class only:
`<section className="about-why-section about-why-section--parchment" id="why" …>`

**Section**
```
.about-why-section--parchment                background: var(--about-parchment); color: var(--about-ink-900);
                                             padding: var(--about-section-pad-y) 0; border-top: 0
  .about-section-header::after               background: var(--about-rule-ink)
  .about-header-meta::before                 background: var(--about-accent-deep)
  .about-poster-index                        color: var(--about-accent-deep)  (12px/600 caps; if contrast tooling flags it, use --about-ink-900)
  .about-poster-category                     color: var(--about-olive-600)
  .about-section-headline                    color: var(--about-ink-900); text-shadow: none
```

**Compositions** (`.about-why-composition` is a GSAP target: no transform/opacity):
- `.about-why-compositions-container`: `max-width: var(--about-max)`; `padding: 0 var(--about-gutter)`; `gap: 0`.
- `.about-why-composition`: **unboxed rows**. `background: transparent; border: 0; border-radius: 0; box-shadow: none; padding: 48px 0; border-top: 1px solid var(--about-rule-ink);`. Keep the grid `1.25fr 1fr`, `gap: 56px`.
  - Alternate the layout for rhythm with CSS only: `.about-why-composition:nth-child(even) { grid-template-columns: 1fr 1.25fr; } .about-why-composition:nth-child(even) .about-why-visual-display { order: 2; }`. DOM order is unchanged.
- `.about-why-visual-display` → **dark plate with brass corner marks**: `background: var(--about-ink-900); border: 1px solid var(--about-ink-900); border-radius: 0; box-shadow: none;`. Corner marks are pure CSS (no markup) on `::after`:
  ```css
  .about-page .about-why-visual-display::after {
    content: ''; position: absolute; inset: 10px; pointer-events: none; z-index: 3;
    --m: var(--about-accent); --l: 14px;
    background:
      linear-gradient(var(--m),var(--m)) top left / var(--l) 1px no-repeat,
      linear-gradient(var(--m),var(--m)) top left / 1px var(--l) no-repeat,
      linear-gradient(var(--m),var(--m)) top right / var(--l) 1px no-repeat,
      linear-gradient(var(--m),var(--m)) top right / 1px var(--l) no-repeat,
      linear-gradient(var(--m),var(--m)) bottom left / var(--l) 1px no-repeat,
      linear-gradient(var(--m),var(--m)) bottom left / 1px var(--l) no-repeat,
      linear-gradient(var(--m),var(--m)) bottom right / var(--l) 1px no-repeat,
      linear-gradient(var(--m),var(--m)) bottom right / 1px var(--l) no-repeat;
  }
  ```
- **Text block on parchment:** `.about-why-step-num`: Plex Mono 13px 600, `var(--about-accent-deep)`, plus a 24px hairline after it (`::after`, inline-block, `vertical-align: middle; margin-left: 10px; background: var(--about-accent-deep)`). `.about-why-title`: Playfair 600 `clamp(2rem, 3.8vw, 3.1rem)`, ink-900, `text-transform: none` is **not** applied (text is authored uppercase). `.about-why-sentence`: Cormorant 500 `clamp(1.1rem, 1.6vw, 1.35rem)`, lh 1.5, olive-600, `max-width: 38ch`.

**Inside the plates (dark context: reuse ink tokens).** All of these selectors are currently **unscoped globals** (`.ring-1`, `.pin-1`, `.station-pulse`, `.station-label`, `.spec-*`, `.fill-*`). Rewrite every one as `.about-page .ring-1`, etc. No other page uses them today; scoping removes the latent leak.
- `.about-map-mesh-visual`: background → `radial-gradient(circle at center, var(--about-accent-tint) 0%, transparent 70%)` + grid lines `rgba(216,207,185,0.04)` (move that value into the token block as `--about-plate-grid`).
- `.about-map-radar-ring`: `border-color: var(--about-accent-rule)`. `.about-map-sweep`: `conic-gradient(from 0deg, rgba(var(--about-accent-rgb), 0.22) 0deg, transparent 60deg)`.
- `.station-pulse`: keep the circle and animation; `pin-1`/`pin-2` → `#ef4444` (PM2.5 accent), `pin-3` → `#f97316` (PM10 accent), with matching glows. These are the documentary's own pollutant colours, so add them to the token block as `--about-marker-hi` / `--about-marker-mid`.
- `.station-label`: square, Plex Mono 11px bone-100, `background: rgba(var(--about-scrim), 0.88)`, `border: 1px solid var(--about-rule-strong)`.
- `.about-map-hud-meta`, `.about-spectral-meta`, `.about-trend-meta`: Plex Mono 11px, sage-400, top hairline `var(--about-rule)`.
- `.spec-label`: Archivo 12px 600 `0.1em` bone-100. `.spec-track`: `background: var(--about-olive-600)`, `height: 6px`, radius 0. `.spec-fill`: radius 0. `.spec-val`: Plex Mono 12px sage-400.
- Spec fills: replace the multicolour gradients with **flat documentary pollutant accents** (the one allowed literal exception, via tokens): `.fill-pm25` `#ef4444`, `.fill-pm10` `#f97316`, `.fill-no2` `#eab308`, `.fill-o3` `#06b6d4`. Define them in the token block as `--about-pm25`, `--about-pm10`, `--about-no2`, `--about-o3`.
- **Trend SVG (JSX: colour values only).** Replace the literals with inline-style token references (presentation attributes don't reliably accept `var()`):
  | Element | Current | New |
  |---|---|---|
  | `<stop offset="0%">` | `stopColor="#f43f5e" stopOpacity="0.4"` | `style={{ stopColor: 'var(--about-accent)', stopOpacity: 0.4 }}` |
  | `<stop offset="60%">` | `stopColor="#f59e0b" stopOpacity="0.15"` | `style={{ stopColor: 'var(--about-accent)', stopOpacity: 0.15 }}` |
  | `<stop offset="100%">` | `stopColor="#10b981" stopOpacity="0.0"` | `style={{ stopColor: 'var(--about-accent)', stopOpacity: 0 }}` |
  | dashed `<line>` | `stroke="rgba(255,255,255,0.2)"` | `style={{ stroke: 'var(--about-rule-strong)' }}` (keep `strokeDasharray`) |
  | line `<path>` | `stroke="#f43f5e"` | `style={{ stroke: 'var(--about-accent)' }}` (keep `strokeWidth`, `fill="none"`, `d`) |

  Don't change `d`, `viewBox`, `preserveAspectRatio`, or the `trendGradient` id.

### Phase 8: Closing (`#closing`)

- `.about-closing-section`: padding `var(--about-section-pad-y) var(--about-gutter)`; `border-top: 1px solid var(--about-accent-rule)`.
- `.about-closing-media`: `filter: var(--about-photo-filter)`. **Delete `transform: scale(1.02)`** (GSAP target).
- `.about-closing-overlay`: tokenised version of the existing gradients plus a bottom fade: `radial-gradient(ellipse at center, rgba(var(--about-scrim),0.3) 0%, rgba(var(--about-scrim),0.6) 100%), linear-gradient(180deg, var(--about-ink-900) 0%, rgba(var(--about-scrim),0.35) 25%, transparent 60%, rgba(var(--about-scrim),0.55) 100%)`.
- `.about-closing-meta`: centred; brass hairlines on **both** sides (`::before` and `::after`, 40px each).
- `.about-closing-headline`: Playfair per §3.1, `text-shadow: var(--about-text-shadow)`.
- `.about-closing-subline`: Cormorant lead, bone-200, `margin-bottom: 40px`.
- **CTA** (`.about-closing-cta-btn`) styled after `wmd-hero__watch-pill`: `height: 60px; padding: 0 32px; border-radius: 999px; background: var(--about-accent-tint); border: 1px solid var(--about-accent-rule); color: var(--about-bone-100);` Archivo 13px 600 `0.2em` uppercase; arrow `color: var(--about-accent)`.
  - `:hover` → `background: var(--about-accent); border-color: var(--about-accent); color: var(--about-ink-900); box-shadow: 0 0 24px var(--about-accent-glow);` arrow inherits ink. **Remove** the `translateY/scale` hover and the `:active` transform (keep the arrow nudge).
  - `:focus-visible` → `outline: 1px solid var(--about-accent); outline-offset: 4px;`. Remove `outline: none`.
  - Replace `transition: all` with explicit properties.

### Phase 9: Responsive & reduced motion

Replace the 1024/768 breakpoints with **1199 / 899 / 479px** (WMD-aligned, same as Stats).

| Element | ≥ 1200 | 900–1199 | ≤ 899 | ≤ 479 |
|---|---|---|---|---|
| Scale layout | 2 cols (`1fr 1.35fr`) | 1 col, cloud stage collapses (`min-height: auto`) | 1 col | 1 col |
| Scale overlay | horizontal scrim | vertical scrim (existing 1024 rule, tokenised) | same | same |
| Infographic header | row | row | column, gap 12px | column |
| Source strip | row | row | column | column |
| Poster grid | auto-fill ≥340px | auto-fill | 1 col | 1 col, `min-height: 380px`, padding 22px |
| Why composition | 2 cols, alternating | 1 col, visual first (reset `order` and alternate columns) | 1 col | 1 col, padding-block 32px |
| Threat frame | `min-height: 85vh` | same | `70vh` | `64vh` |
| Top bar | shown | shown | shown, `top/right: 18px`, buttons padding `8px 12px` | both buttons and labels stay visible; letter-spacing `0.12em` |
| Back button | 44px @ 28px | same | 40px @ 18px | same |
| Station labels | shown | shown | shown | `font-size: 10px` |

- All horizontal padding comes from `--about-gutter`, which gives 16px on phones. **No horizontal page scroll at 375px.**
- Long uppercase headlines (`WHAT YOU CAN MEASURE, YOU CAN UNDERSTAND.`, `MAKE INFORMED DECISIONS.`) must wrap. Add `overflow-wrap: anywhere` only if a word overflows at 375px; prefer the clamp floor.
- **Reduced motion:** keep the existing block and extend it:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .about-page *, .about-page *::before, .about-page *::after { transition: none !important; }
    .about-page .about-poster-bg-img { transform: none !important; }
  }
  ```
  Keep the existing `animation: none` rules for `.about-scroll-line::after`, `.about-map-sweep`, `.station-pulse`, now scoped under `.about-page`. Also add `.about-cloud-tag-dot`, which uses `pulseStation`.

---

## 6. Verification

### 6.1 After every phase
```bash
npm test
```
Every suite must pass, especially `tests/aboutPageVerification.test.js` and `tests/navigationVerification.test.js`. **Never edit tests to make them pass.**

```bash
git diff --name-only
```
The output must be a subset of §1.1.

### 6.2 Final checks
1. `npm run build` passes with no new warnings.
2. Grep guards (each should return **no matches**):
   ```bash
   grep -nE ":root|^body|^html|@layer|backdrop-filter|transition: all" src/components/About/AboutPage.css
   grep -nE "#07090e|rgba\(7, 9, 14|#38bdf8|#f43f5e|#94a3b8|#cbd5e1" src/components/About/AboutPage.css
   grep -nE "^\.(ring|pin|station|spec|fill)-" src/components/About/AboutPage.css
   grep -nE "stopColor=\"#|stroke=\"#|stroke=\"rgba" src/components/About/AboutPage.jsx
   grep -nE "wmd-|WmdGrain|StatsGrain|PollutantDocumentary/|Stats/" src/components/About/
   grep -n "about-footer" src/components/About/
   ```
   Check by hand that raw hex/rgba values in `AboutPage.css` appear only inside the `.about-page { … }` token block.
3. **Animation integrity.** Diff the GSAP `useEffect` in `AboutPage.jsx`: it must have **zero** changed lines.
4. Visual QA in the browser pane (`npm run dev`, open `/?page=about`) at **1440×900, 768×1024, 375×812**:
   - Hero: toned-sepia photo; the clip-path/scale reveal plays on scroll without jitter; words stagger in.
   - Scale: the three stat tabs switch content (76% → 99% → 2.1M); the brass active pill; the "Verify Study" link opens in a new tab.
   - Threat: three frames, brass hairlines between them, headlines fade up.
   - Pollutants: posters are sepia at rest. Hover or keyboard focus reveals colour with that pollutant's accent border. While scrolling, the active poster (`is-active-pollutant`) highlights. Clicking a poster opens its documentary.
   - Why: parchment band, dark plates with brass corner marks, alternating layout on desktop, radar sweep and pulses animate.
   - Closing: CTA hover fills brass; click opens the live dashboard.
   - Chrome: the back button returns correctly (tooltip on hover, focus ring on Tab). The "Stats" top button opens the Stats page and "Live Air" opens the dashboard.
   - No horizontal scroll at 375px. Reduced-motion emulation leaves a static, legible page.
5. **Regression on other pages** (must be unchanged):
   - `/?documentary=pm25` and one other pollutant, `/?page=stats`, the Dashboard (`/`), the Heatmap and School Safety.
   - Cross-navigate in one session: Dashboard → About → poster (documentary) → back → About → Stats → back. This loads several CSS chunks together. Confirm no page's styling changes after another has loaded. In particular, check the Heatmap and School Safety pages after visiting About; that's what the scoping of `.ring-*`/`.station-*` protects.

### 6.3 Definition of done
- [ ] Only §1.1 files changed; `AboutGrain.jsx` added.
- [ ] `npm test` and `npm run build` pass.
- [ ] All §6.2 grep guards are clean; the GSAP effect is unchanged.
- [ ] Visual QA passes at 3 widths, including all interactions and reduced motion.
- [ ] Other pages are unchanged after cross-navigation.
- [ ] `git diff` on `AboutPage.jsx` shows only: the new import, the grain wrapper, the `about-why-section--parchment` modifier, and the SVG colour → token swaps.

---

## 7. Out of scope (flag only, do not change)

- **Illustrative numbers in the "Why VayuVitals" visuals.** `Anand Vihar · 312`, `ITO · 245`, `RK Puram · 189` and the spectral values (`82 µg/m³`, `136 µg/m³`, `43 µg/m³`, `78 µg/m³`) are hard-coded and not labelled as illustrative. Under `AGENTS.md`'s Zero-Faking Directive they should either be wired to live data or visibly marked as illustrative. That's a content change and needs a separate task and the owner's sign-off.
- **The GSAP hero reveal uses `clipPath: … round 16px`** (rounded corners at the start of the animation) in JS. It conflicts slightly with the square-corner language, but changing it means editing the animation effect, which this task forbids.
- Adding a footer, new imagery, new copy, or any shared design-system refactor across Documentary/Stats/About.
