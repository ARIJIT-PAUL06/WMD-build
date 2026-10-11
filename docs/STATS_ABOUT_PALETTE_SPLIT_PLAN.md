# Stats & About: Palette Split

**Problem:** after the editorial revamps (`docs/STATS_PAGE_WMD_REVAMP_PLAN.md`, `docs/ABOUT_PAGE_WMD_REVAMP_PLAN.md`), both pages use the same ink/bone/brass/parchment palette and look almost identical.
**Decision (agreed):** both pages move away from brass, in opposite directions:

| Page | New identity | Accent | Light band | Rationale |
|---|---|---|---|---|
| **Stats** | **Cyanotype / instrument**: cool slate ink, mist text | Verdigris `#7fa89b` | Blueprint `#b7c3c5` | Data, lab, measurement. A cool palette reads as "instrument". |
| **About** | **Ember / smoke**: charred ink, ash text | Ember `#c0714f` | Clay `#c7b2a0` | Smoke, combustion, photography. A warm palette suits the sepia photo essay. |

The Pollutant Documentary keeps its ink/bone + per-pollutant palette. All three pages now share the *editorial language* (type, rules, grain, square corners) but each has its own colour identity.

**Scope:** colour values only. Layout, typography, spacing, content, animation and behaviour stay exactly as they are now.

---

## 0. Rules for the implementer

1. **Only edit these files:**
   - `src/components/Stats/StatsPage.css` (token block only, plus the file header comment)
   - `src/components/Stats/ParticleTerrainCanvas.jsx` (colour constants only)
   - `src/components/Stats/ParticleWaveCanvas.jsx` (colour constants only)
   - `src/components/About/AboutPage.css` (token block only, plus the file header comment)

   Nothing else. In particular, don't touch `StatsPage.jsx`, `AboutPage.jsx`, `StatsEvaluationPlots.jsx`, the grain components, tests, or anything under `PollutantDocumentary/`.
2. **Change values, not names.** Keep every token name (`--stats-bone-200`, `--about-parchment`, `--stats-accent-deep`, …) and every class name (including the `stats-section--parchment` / `about-why-section--parchment` modifiers). Hundreds of rules already reference these names, so renaming them adds risk and no visual value. Update the inline comments so they describe the new colour (e.g. `/* primary text: mist */`). A role-based rename can be a separate follow-up.
3. **No new literals outside the token blocks.** A check found no raw colours outside the token blocks in either CSS file. Keep it that way.
4. **Leave pollutant colours alone.** `--about-marker-hi`, `--about-marker-mid`, `--about-pm25`, `--about-pm10`, `--about-no2`, `--about-o3` and the per-poster `--pollutant-accent` are data colours shared with the documentary. Don't change them.
5. **The verdigris and ember accents were picked to avoid colliding with any pollutant accent** (SO₂ `#10b981`, O₃ `#06b6d4`, PM10 `#f97316`, PM2.5 `#ef4444`). Both are deliberately desaturated. Don't make them brighter.

---

## 1. Stats: Cyanotype palette

### 1.1 Token replacements (`StatsPage.css`, `.stats-page { … }` block)

| Token | Old | **New** | Role |
|---|---|---|---|
| `--stats-ink-900` | `#0d0f0c` | **`#0c0f12`** | page base: slate |
| `--stats-ink-800` | `#141611` | **`#12161a`** | alternate band |
| `--stats-ink-700` | `#1c1f19` | **`#1a1f24`** | plates, tooltips |
| `--stats-olive-600` | `#2a2d24` | **`#262c32`** | bar tracks; muted text on band |
| `--stats-sage-500` | `#6f7462` | **`#66707a`** | decorative / large muted only |
| `--stats-sage-400` | `#8e927e` | **`#8c969f`** | secondary text |
| `--stats-bone-300` | `#b9b19c` | **`#aeb8bf`** | chart marks |
| `--stats-bone-200` | `#d8cfb9` | **`#d3d9dc`** | primary text: mist |
| `--stats-bone-100` | `#ece5d3` | **`#e8ecee`** | emphasis, values |
| `--stats-parchment` | `#c9c1ab` | **`#b7c3c5`** | dataset band: blueprint paper |
| `--stats-rule` | `rgba(216, 207, 185, 0.18)` | **`rgba(211, 217, 220, 0.18)`** | hairlines |
| `--stats-rule-strong` | `rgba(216, 207, 185, 0.38)` | **`rgba(211, 217, 220, 0.38)`** | |
| `--stats-rule-ink` | `rgba(13, 15, 12, 0.22)` | **`rgba(12, 15, 18, 0.22)`** | hairlines on band |
| `--stats-accent` | `#b8935a` | **`#7fa89b`** | verdigris |
| `--stats-accent-rgb` | `184, 147, 90` | **`127, 168, 155`** | |
| `--stats-accent-deep` | `#7a5c2e` | **`#3f6a5e`** | marks/large text on band only |
| `--stats-accent-rule` | `rgba(184, 147, 90, 0.35)` | **`rgba(127, 168, 155, 0.35)`** | |
| `--stats-accent-tint` | `rgba(184, 147, 90, 0.08)` | **`rgba(127, 168, 155, 0.08)`** | |
| `--stats-accent-glow` | `rgba(184, 147, 90, 0.35)` | **`rgba(127, 168, 155, 0.35)`** | |
| `--stats-accent-row-hover` | `rgba(184, 147, 90, 0.04)` | **`rgba(127, 168, 155, 0.04)`** | |
| `--stats-plot-grid` | `rgba(216, 207, 185, 0.07)` | **`rgba(211, 217, 220, 0.07)`** | |
| `--stats-plot-axis` | `rgba(216, 207, 185, 0.30)` | **`rgba(211, 217, 220, 0.30)`** | |
| `--stats-plot-hover-band` | `rgba(184, 147, 90, 0.06)` | **`rgba(127, 168, 155, 0.06)`** | |
| `--stats-plot-corridor` | `rgba(184, 147, 90, 0.06)` | **`rgba(127, 168, 155, 0.06)`** | |
| `--stats-shadow` | `rgba(0, 0, 0, 0.6)` | unchanged | |

Tokens that alias other tokens (`--stats-plot-bg`, `--stats-plot-mark`, `--stats-plot-mark-active`, `--stats-plot-label`) update automatically. If you find any other token in the block that encodes `216, 207, 185`, `13, 15, 12` or `184, 147, 90`, convert it with the same mapping: bone → `211, 217, 220`, ink → `12, 15, 18`, brass → `127, 168, 155`.

Update the file header comment: replace "fixed aged brass accent" with "cyanotype palette: slate ink, mist text, verdigris accent, blueprint band".

### 1.2 Canvas colour constants (Three.js)

Both files currently tint the particles toward the old bone colour. Retint them toward mist.

**`ParticleTerrainCanvas.jsx`**
| Line (approx.) | Old | **New** |
|---|---|---|
| 4 (comment) | `// Bone tint (bone-200 #d8cfb9 …)` | `// Mist tint (bone-200 token #d3d9dc normalised to its max channel) for the cyanotype palette.` |
| 5 | `const PARTICLE_TINT = [1.0, 0.958, 0.856];` | **`const PARTICLE_TINT = [0.959, 0.986, 1.0];`** |
| ~171 | `color: 0xd8cfb9,` (lattice lines) | **`color: 0xd3d9dc,`** |
| ~180 | `GridHelper(92, 36, 0x6f7462, 0x2a2d24)` | **`GridHelper(92, 36, 0x66707a, 0x262c32)`** |
| ~350 | fallback `rgba(216,207,185,0.06) … rgba(13,15,12,0.96)` | **`rgba(211,217,220,0.06) … rgba(12,15,18,0.96)`** |
| ~351 | fallback `color: '#8e927e'` | **`color: '#8c969f'`** |

**`ParticleWaveCanvas.jsx`**
| Line (approx.) | Old | **New** |
|---|---|---|
| 4–5 | comment + `PARTICLE_TINT` | same as the terrain file |
| ~211 | `color: 0xd8cfb9,` | **`color: 0xd3d9dc,`** |
| ~378 | fallback `background: 'rgba(216,207,185,0.03)'` | **`'rgba(211,217,220,0.03)'`** |
| ~379 | fallback `color: '#8e927e'` | **`'#8c969f'`** |

Don't touch the white radial sprite gradient (`rgba(255, 255, 255, …)` in `addColorStop`). It's an alpha mask. The tint comes from the vertex colours, which are multiplied by `PARTICLE_TINT` in both places (the initial write and the per-frame write). Check that both multiplications are still there.

### 1.3 Contrast (WCAG, computed)

| Foreground | on ink-900 | on ink-800 | on ink-700 | Allowed use |
|---|---|---|---|---|
| bone-100 `#e8ecee` | 16.2 | 15.3 | 14.0 | any |
| bone-200 `#d3d9dc` | 13.5 | 12.8 | 11.6 | any |
| bone-300 `#aeb8bf` | 9.5 | 9.0 | 8.2 | any |
| sage-400 `#8c969f` | 6.4 | 6.0 | 5.5 | small text OK |
| sage-500 `#66707a` | 3.8 | 3.6 | 3.3 | decorative / large only (unchanged rule) |
| accent `#7fa89b` | 7.3 | 6.9 | 6.3 | small text OK |
| ink-900 text on accent fill (active pills) | 7.3 | | | OK |

On the blueprint band `#b7c3c5`: ink-900 **10.6**, olive-600 **7.8**, accent-deep **3.4** (marks / large text only, the same rule as before).

---

## 2. About: Ember palette

### 2.1 Token replacements (`AboutPage.css`, `.about-page { … }` block)

| Token | Old | **New** | Role |
|---|---|---|---|
| `--about-ink-900` | `#0d0f0c` | **`#110d0b`** | page base: charred |
| `--about-ink-800` | `#141611` | **`#18120f`** | alternate band |
| `--about-ink-700` | `#1c1f19` | **`#211a16`** | cards, tooltips |
| `--about-olive-600` | `#2a2d24` | **`#33281f`** | spec tracks; muted text on band |
| `--about-sage-500` | `#6f7462` | **`#7a6a5e`** | decorative / large muted only |
| `--about-sage-400` | `#8e927e` | **`#9c8b7e`** | secondary text |
| `--about-bone-300` | `#b9b19c` | **`#bfae9f`** | |
| `--about-bone-200` | `#d8cfb9` | **`#ddd3c8`** | primary text: ash |
| `--about-bone-200-85` | `rgba(216, 207, 185, 0.85)` | **`rgba(221, 211, 200, 0.85)`** | |
| `--about-bone-200-82` | `rgba(216, 207, 185, 0.82)` | **`rgba(221, 211, 200, 0.82)`** | |
| `--about-bone-100` | `#ece5d3` | **`#efe7de`** | display text |
| `--about-parchment` | `#c9c1ab` | **`#c7b2a0`** | Why band: clay |
| `--about-rule` | `rgba(216, 207, 185, 0.18)` | **`rgba(221, 211, 200, 0.18)`** | |
| `--about-rule-strong` | `rgba(216, 207, 185, 0.38)` | **`rgba(221, 211, 200, 0.38)`** | |
| `--about-rule-ink` | `rgba(13, 15, 12, 0.22)` | **`rgba(17, 13, 11, 0.22)`** | |
| `--about-accent` | `#b8935a` | **`#c0714f`** | ember |
| `--about-accent-rgb` | `184, 147, 90` | **`192, 113, 79`** | |
| `--about-accent-deep` | `#7a5c2e` | **`#7e3f26`** | marks/large text on band only |
| `--about-accent-rule` | `rgba(184, 147, 90, 0.35)` | **`rgba(192, 113, 79, 0.35)`** | |
| `--about-accent-tint` | `rgba(184, 147, 90, 0.08)` | **`rgba(192, 113, 79, 0.08)`** | |
| `--about-accent-glow` | `rgba(184, 147, 90, 0.35)` | **`rgba(192, 113, 79, 0.35)`** | |
| `--about-scrim` | `13, 15, 12` | **`17, 13, 11`** | rgb of ink-900 for photo scrims |
| `--about-plate-grid` | `rgba(216, 207, 185, 0.04)` | **`rgba(221, 211, 200, 0.04)`** | |
| `--about-photo-filter` | `grayscale(0.85) sepia(0.32) contrast(1.08) brightness(0.72)` | **`grayscale(0.8) sepia(0.5) saturate(1.15) hue-rotate(-10deg) contrast(1.08) brightness(0.7)`** | warmer, rust-toned photos |
| `--about-photo-filter-dim` | `grayscale(0.9) sepia(0.3) contrast(1.06) brightness(0.5)` | **`grayscale(0.85) sepia(0.48) saturate(1.1) hue-rotate(-10deg) contrast(1.06) brightness(0.48)`** | poster rest state |
| `--about-photo-filter-reveal` | unchanged | unchanged | colour reveal on hover stays neutral so pollutant accents read true |
| `--about-text-shadow`, `--about-shadow` | | unchanged | |
| `--about-marker-*`, `--about-pm25/pm10/no2/o3` | | **unchanged** | data colours (§0.4) |

Same rule for anything missed: bone `216, 207, 185` → `221, 211, 200`, ink `13, 15, 12` → `17, 13, 11`, brass `184, 147, 90` → `192, 113, 79`.

Update the file header comment to "ember palette: charred ink, ash text, ember accent, clay band".

### 2.2 Contrast (WCAG, computed)

| Foreground | on ink-900 | on ink-800 | on ink-700 | Allowed use |
|---|---|---|---|---|
| bone-100 `#efe7de` | 15.8 | 15.2 | 14.0 | any |
| bone-200 `#ddd3c8` | 13.1 | 12.6 | 11.6 | any |
| bone-300 `#bfae9f` | 9.0 | 8.6 | 8.0 | any |
| sage-400 `#9c8b7e` | 5.9 | 5.7 | 5.2 | small text OK |
| sage-500 `#7a6a5e` | 3.7 | 3.6 | 3.3 | decorative / large only |
| accent `#c0714f` | 5.3 | 5.1 | 4.7 | small text OK (AA) |
| ink-900 text on accent fill (active tab, CTA hover) | 5.3 | | | OK |

On the clay band `#c7b2a0`: ink-900 **9.5**, olive-600 **7.0**, accent-deep **3.9** (marks / large text only).

> Photo text sits on `rgba(var(--about-scrim), …)` scrims, which now take the charred tone automatically. Spot-check the hero headline, the "76%" block and the poster symbols in QA (§4).

---

## 3. Side-by-side reference

| Role | Documentary (unchanged) | **Stats** | **About** |
|---|---|---|---|
| Base | `#0d0f0c` ink | `#0c0f12` slate | `#110d0b` charred |
| Primary text | `#d8cfb9` bone | `#d3d9dc` mist | `#ddd3c8` ash |
| Accent | per pollutant | `#7fa89b` verdigris | `#c0714f` ember |
| Light band | `#c9c1ab` parchment | `#b7c3c5` blueprint | `#c7b2a0` clay |
| Photo tone | grey sepia | n/a (canvases, mist-tinted) | rust sepia |

---

## 4. Verification

1. `npm test` passes (no test asserts colours; the run confirms nothing else broke).
2. `npm run build` passes.
3. `git diff --name-only` lists only the four files in §0.1.
4. Leftover-palette guards. Each should return **no matches**:
   ```bash
   grep -nE "b8935a|7a5c2e|184, 147, 90|216, 207, 185|13, 15, 12|d8cfb9|c9c1ab" src/components/Stats/ src/components/About/
   grep -nE "0xd8cfb9|0x6f7462|0x2a2d24|#8e927e" src/components/Stats/
   ```
5. Visual QA in the browser pane at 1440 / 768 / 375 px. Open `/?page=stats` and `/?page=about` in two tabs and compare:
   - **Stats:** slate background, mist text, verdigris kickers/corner marks/active pills/selected table row, a blueprint dataset band with a dark plate, mist-tinted particles both at first paint **and after a few seconds** (per-frame tint), a cool ground grid.
   - **About:** charred background, ash text, ember kickers/hairlines/stat tabs/CTA, a clay Why band with dark plates, rust-toned photos. Pollutant posters still reveal their own accent colours on hover.
   - The two pages should be told apart at a glance from any section.
   - Focus rings (Tab key) are visible in each page's accent.
6. **Regression:** `/?documentary=pm25` looks unchanged; Dashboard, Heatmap and School Safety look unchanged after navigating Stats → About → back.

## 5. Out of scope

- Renaming tokens to role-based names (e.g. `--stats-bone-200` → `--stats-text`). That's a worthwhile clean-up, but a separate change.
- Any layout, typography, content or animation change.
