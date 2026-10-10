# Documentary Series Theming — Implementation Plan

Companion to [PM25_DOCUMENTARY_REDESIGN_PLAN.md](PM25_DOCUMENTARY_REDESIGN_PLAN.md). That plan builds the new "WMD" layout. This one gives each pollutant documentary its own accent colour on top of it.

## 0. Key fact: there is only one page

All 7 documentaries (`?documentary=pm25|pm10|no2|so2|co|o3|nh3`) are rendered by **the same component**, `src/components/PollutantDocumentary/PollutantDocumentary.jsx`. It switches content using `POLLUTANT_DOCUMENTARIES[id]` and `POLLUTANT_CINEMATIC_THEMES[id]`. Once the PM2.5 redesign lands, every pollutant page gets the new layout automatically.

"Doing the other pages" therefore means two things only:
1. a **theme layer**: colour tokens per pollutant (this doc)
2. **content and imagery** per pollutant: tagline, intro, `globalStats`, photos (§5)

Don't copy the components per pollutant.

## 1. Colour system

### 1.1 Shared tokens (pages other than PM2.5)
| Token | Hex | Use |
|---|---|---|
| `--charcoal` | `#20231F` | page and band backgrounds |
| `--ivory` | `#E5DFCC` | primary text, logo, rules (at alpha) |
| `--fog` | `#747467` | secondary **panels**, plates, chart tracks |

PM2.5 keeps the original forest-charcoal and bone tokens from the redesign plan §3.1. Its accent is `--bone-200` (`#d8cfb9`).

### 1.2 Signature accents
| id | Accent | Mood | Photo direction |
|---|---|---|---|
| pm25 | `#D8CFB9` (bone; existing) | forest charcoal & ivory | smog skyline, forest |
| pm10 | `#B58A55` | dusty ochre · sand beige · charcoal | road dust, construction, desert haze |
| no2 | `#AC5045` | brick red · rust · warm ivory | traffic exhaust, flyovers at dusk |
| so2 | `#85866B` | smoky olive · ash grey · cream | factories, stacks, hazy industrial land |
| co | `#687B88` | slate blue · graphite · pale grey | fog, underpasses, cold mist |
| o3 | `#789184` | sage green · mist grey · warm ivory | hazy sky, misty landscapes |
| nh3 | `#92916A` | muted olive · earth brown · parchment | fields, farms, fertiliser plants |

**These are design accents, not AQI or severity colours.** Anything that encodes AQI categories (heatmap, AQI badges, `src/components/Heatmap/heatmapConstants.js`) keeps the CPCB/standard colours and must not use these tokens.

### 1.3 Contrast rules (measured; charcoal background `#20231F`)
| Accent | Accent vs charcoal | Ivory text on accent fill |
|---|---|---|
| pm10 | 5.09 | 2.34 ✗ |
| no2 | **3.02** | 3.95 |
| so2 | 4.25 | 2.80 ✗ |
| co | **3.61** | 3.30 |
| o3 | 4.68 | 2.55 ✗ |
| nh3 | 4.90 | 2.43 ✗ |

Ivory on charcoal is 11.92. Fog on charcoal is **3.36**.

Rules that follow from these numbers:
- **Accent is for UI and large graphics only.** Use it for fills, bars, rings, underlines, active borders, and text ≥ 24 px. Never use it for body text or small labels (NO₂ and CO fail 4.5:1).
- Text on an accent-filled control (play circle, active tile card) is **charcoal** (≥3:1 on every accent). Ivory fails on most accents.
- `--fog` is a **surface** colour (as the palette intends). Don't use it for small text. Secondary text is `color-mix(in oklab, var(--ivory) 70%, var(--charcoal))`; check that it stays ≥ 4.5:1.

## 2. Where the accent is applied
Use exactly these places, so all pages feel like one series:
- Header: active nav underline, icon-button hover border
- Hero: play-circle fill (icon in charcoal), CTA pill border on hover, the vertical rule next to the right tagline
- Coverage band: hotspot rings on the map, topic-row hover marker
- Documentary strip: active tile card background (label text in charcoal)
- Impact row: bar portion above the NAAQS limit, top two contour bands, the top legend swatch
- Footer: short horizontal rules
- Everything else stays neutral (charcoal / ivory / fog). Photos get a duotone tinted toward the accent (§3.3).

## 3. Implementation

### 3.1 Files (new; the PM2.5 agent does not create or own these)
- `src/components/PollutantDocumentary/wmd/wmdThemes.js`: the source of truth
- `src/components/PollutantDocumentary/wmd/wmdThemes.css`: per-pollutant token overrides

```js
// wmdThemes.js
export const WMD_SHARED = { charcoal: '#20231F', ivory: '#E5DFCC', fog: '#747467' };
export const WMD_THEMES = {
  pm25: { accent: '#D8CFB9', mood: 'Forest charcoal · Ivory', usesShared: false },
  pm10: { accent: '#B58A55', mood: 'Dusty ochre · Sand beige · Charcoal', usesShared: true },
  no2:  { accent: '#AC5045', mood: 'Brick red · Rust · Warm ivory', usesShared: true },
  so2:  { accent: '#85866B', mood: 'Smoky olive · Ash grey · Cream', usesShared: true },
  co:   { accent: '#687B88', mood: 'Slate blue · Graphite · Pale grey', usesShared: true },
  o3:   { accent: '#789184', mood: 'Sage green · Mist grey · Warm ivory', usesShared: true },
  nh3:  { accent: '#92916A', mood: 'Muted olive · Earth brown · Parchment', usesShared: true },
};
```

### 3.2 Token mapping (CSS)
The redesign plan defines `--ink-900 … --bone-100`, `--rule`, `--parchment` on `.wmd-doc`. **Remap those tokens.** Don't add new class rules, so the layout CSS never needs to know about themes.

```css
/* wmdThemes.css (imported after WmdDocumentary.css) */
.wmd-doc { --accent: var(--bone-200); --on-accent: var(--ink-900); }

.wmd-doc[data-pollutant]:not([data-pollutant="pm25"]) {
  --charcoal: #20231F; --ivory: #E5DFCC; --fog: #747467;
  --ink-900: color-mix(in oklab, var(--charcoal) 82%, black);
  --ink-800: var(--charcoal);
  --ink-700: color-mix(in oklab, var(--charcoal) 80%, var(--fog));
  --olive-600: color-mix(in oklab, var(--fog) 45%, var(--charcoal));
  --sage-500: var(--fog);
  --sage-400: color-mix(in oklab, var(--ivory) 70%, var(--charcoal));
  --bone-300: color-mix(in oklab, var(--ivory) 70%, var(--accent));
  --bone-200: var(--ivory);
  --bone-100: color-mix(in oklab, var(--ivory) 85%, white);
  --parchment: color-mix(in oklab, var(--ivory) 82%, var(--accent));
  --rule: color-mix(in oklab, var(--ivory) 28%, transparent);
  --rule-strong: color-mix(in oklab, var(--ivory) 55%, transparent);
  --on-accent: var(--charcoal);
}
.wmd-doc[data-pollutant="pm10"] { --accent: #B58A55; }
.wmd-doc[data-pollutant="no2"]  { --accent: #AC5045; }
.wmd-doc[data-pollutant="so2"]  { --accent: #85866B; }
.wmd-doc[data-pollutant="co"]   { --accent: #687B88; }
.wmd-doc[data-pollutant="o3"]   { --accent: #789184; }
.wmd-doc[data-pollutant="nh3"]  { --accent: #92916A; }

/* Chart ramp (contour legend, bars), derived from the accent, not hand-picked */
.wmd-doc {
  --ramp-0: var(--olive-600);
  --ramp-1: var(--sage-500);
  --ramp-2: color-mix(in oklab, var(--sage-500) 50%, var(--accent));
  --ramp-3: var(--accent);
  --ramp-4: color-mix(in oklab, var(--accent) 60%, var(--bone-100));
}
```

`color-mix()` works in every evergreen browser (Chrome 111+, Safari 16.2+, Firefox 113+). No fallback is needed for this demo.

### 3.3 Photo duotone per pollutant
Extend `WmdGrain`/the SVG `defs` with one `feColorMatrix` duotone filter whose shadow is `--ink-900` and highlight is `mix(ivory 80%, accent 20%)`. Compute the matrix in JS from `WMD_THEMES[id]` and render it as `<filter id="wmdDuotone">`. `.wmd-photo` then uses `filter: url(#wmdDuotone) contrast(1.05) brightness(.8)`. Keep **one filter id**, re-rendered when the pollutant changes. Don't render 7 filters.

For PM2.5, keep the sepia treatment from the redesign plan.

### 3.4 Charts read the tokens
In `WmdBarChart` / `WmdContourMap`, get colours with `getComputedStyle(root).getPropertyValue('--ramp-n')`, or (simpler) set `fill="var(--ramp-3)"` directly in the SVG. SVG presentation attributes accept CSS variables when written as `style={{ fill: 'var(--ramp-3)' }}`. Prefer the inline-style form.

### 3.5 Integration (two lines, done **after** the PM2.5 work is merged)
In `PollutantDocumentary.jsx`:
- add `data-pollutant={currentPollutantKey}` to the `.wmd-doc` root
- `import './wmd/wmdThemes.css';`

## 4. Animation and engine
Nothing in `documentaryAnimations.js` changes. Accent changes are pure CSS, so they switch at the same moment the engine replays on pollutant change. Add a `transition: background-color .4s, color .4s, border-color .4s` on the accent-using elements only (not on `*`). Respect `prefers-reduced-motion` (no transition).

## 5. Per-pollutant content (data file, not components)
Add to each entry in `src/data/pollutantDocumentaries.js`. The PM2.5 agent adds the field **shape**; fill these in afterwards:
- `wmdTagline` (e.g. PM10 "THE DUST WE BREATHE", NO₂ "EXHAUST OF THE CITY"). Draft them and get the user to sign off.
- `wmdIntro`: honest Delhi-scoped intro
- `globalStats`: real, **cited** figures per pollutant (WHO/CPCB/peer-reviewed). If no reliable global figure exists for a pollutant (e.g. NH₃ deaths), show the CPCB/WHO limits and the live Delhi value instead. **Don't fill gaps with estimates.**
- Photos: 1 hero, 1 coverage-band image, 1 circular inset, 1 footer per pollutant, following §1.2. Free-licence sources only, credited in `public/assets/documentary/wmd/CREDITS.md`, optimised with the asset script.

## 6. Verification
1. Visit all 7 `?documentary=` ids at 1440 and 375 px. The layout must be pixel-identical between ids; only colours and photos differ.
2. Switching pollutants via the strip must recolour without a reload and with no flash of the PM2.5 palette.
3. Run axe (or the in-browser contrast checker) on each page. No small-text contrast failures.
4. Grep: no AQI/severity component imports `wmdThemes`.
5. `npm run build` and `npx oxlint src/components/PollutantDocumentary` are clean.
