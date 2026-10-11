# Hero Brand (VAYUVITALS) Legibility & Alignment Fix: Implementation Plan

**Follows:** `docs/HERO_CRT_CORNER_RELOCATION_PLAN.md` (implemented in commit `0c1cdd5`).
**Goal:** The `VAYUVITALS` wordmark now sits correctly in the top-left of the CRT glass, but it **blends into the picture**. Make it read clearly through the whole hero scroll and line it up optically with the Sign In button. **Only the wordmark changes.**

---

## 0. Hard rules for the implementing agent

1. **Do not touch Sign In in any way.** That covers `AuthHeaderBadge.jsx`, the `.auth-badge-crt` CSS, the `.hero-top-auth-cluster` rules, `authContainerRef`, the auth CSS variables (`--crt-auth-*`) and the scroll code that slides and fades the auth cluster. It has been verified working: it's positioned, tilted, keeps its tilt while scrolling, is clickable and opens the modal.
2. **Do not touch** `CrtScreenLensCanvas.jsx`, `crtFaceplate.js`, `tests/crtFaceplate.test.js`, or the shared constants `CRT_CORNER_INSET_X`, `CRT_CORNER_INSET_Y` and `CRT_TILT_FACTOR`. Sign In uses them too.
3. **Do not change the wordmark text, the brand colour journey or its timing.** `getBrandTheme` still runs amber → gold → green with the same RGB stops. You only *add* fields to its return value.
4. Keep `hero-top-hud`, `hero-hud-brand` and `VAYUVITALS` in the SSR output (`tests/navigationVerification.test.js`).
5. Before and after, `npm test` should show the **same 8 pre-existing failures and nothing new**. The 8 failures are all in `tests/pollutantDocumentaryCinematicUpgrade.test.js`, caused by the missing `src/components/PollutantDocumentary/DocumentaryHero.jsx`. They're unrelated, so don't try to fix them here.

---

## 1. Diagnosis (measured in the running app at 1440×900, 1920×1080 and 390×844)

| # | Problem | Root cause |
|---|---|---|
| D1 | **Amber on amber.** At scroll 0 the wordmark (`#f59e0b`) sits on the sepia smog sky, which has nearly the same hue and luminance. The contrast is roughly 1.1:1. Its glow (`0 0 16px` amber at 0.65, `0 0 32px` amber at 0.25) is the *same colour as the sky*, so it widens the blur instead of separating the text. | Before the move, the wordmark sat on the dark bezel, which supplied the contrast. Inside the glass there's nothing dark behind it. Sign In doesn't have this problem because it has its own dark plate (`rgba(6,10,18,0.72)`). |
| D2 | **Green on green.** Around 85% scroll the wordmark turns green and lands over the green canopy and the lung-tree trunk. It's unreadable, worse than D1. | Same as D1. The fix has to hold across the whole colour journey, not just the first frame. |
| D3 | **Washed by the overlays.** The wordmark is at `z-index: 15`, under the glass overlay (`.hero-crt-screen-curvature`, z 16) and the bottom-fade layer (z 17). The bottom-fade layer paints a full-screen `theme.ambient` tint (the brand colour at 0.12) over the wordmark, plus a dark top gradient that dims its upper half. | z-order chosen in the relocation plan. Sign In is fine there; the bare wordmark isn't. |
| D4 | **Glow fix would be overwritten.** `updateBrandStyles()` rewrites `brandTextRef.current.style.textShadow` on **every scroll event**, and `handleScroll()` runs once on mount. | Any `text-shadow` set in CSS, or only in the JSX inline style, is overwritten. **The glow must be changed in `updateBrandStyles`.** |
| D5 | **Sits slightly high next to Sign In.** Both are anchored by their **top edge** to the same glass y. The wordmark box is shorter (29px at 1440, about 22px on phones) than the Sign In box (36px), so its centreline is 3.5–7px higher. You can see it clearly on phones. | The anchor maths aligns top edges, but the eye compares centrelines. |
| D6 | **Light for its role.** At 1.45rem desktop / 1.15rem mobile, the wordmark looks smaller than the Sign In button across the screen. The inspiration screenshot shows it with more presence. | Size carried over from when it sat in the bezel. |

**Prototype check:** a live-DOM prototype of fixes F1–F4 below (applied in the browser without editing source) made the wordmark crisp and readable on both the amber sky (scroll 0) and the green canopy (scroll 0.85). Sign In was untouched.

---

## 2. Files touched

| File | Change |
|---|---|
| `src/components/MotionHero/PanoramicScrollHero.jsx` | Add two fields to `getBrandTheme`, add a `brandTextShadow()` helper, use it in `updateBrandStyles` and in the initial inline style, change the inline `fontSize`, centre-align the brand in the existing `place()` effect, and observe the brand box. |
| `src/components/MotionHero/PanoramicScrollHero.css` | Raise `.hero-top-hud` to z 18, add a scrim to `.hero-hud-brand`, and change the mobile font size. |
| `tests/navigationVerification.test.js` *(or a new `tests/heroBrandLegibility.test.js`, preferred so the existing file stays untouched)* | One SSR assertion for the dark separation layer. |

No other files change.

---

## F1: Dark separation halo in the glow (fixes D1, D2, D4)

The rule: **a dark, tight shadow first, then the coloured glow.** The dark layer outlines each glyph against any background. The coloured layers keep the phosphor look.

### 1a. Extend `getBrandTheme` (add fields only)

In the returned object, keep every existing field and add:

```js
glowCore: `rgba(${rgb}, 0.85)`,
glowMid: `rgba(${rgb}, 0.5)`,
```

`glow`, `glowSoft`, `ambient` and `spotlight` stay as they are. `spotlight` and `ambient` are used elsewhere.

### 1b. Add a helper right under `getBrandTheme`

```js
// Dark separation layers first (keeps the wordmark legible on bright smog sky and green canopy),
// then the phosphor glow in the current brand colour.
function brandTextShadow(theme) {
  return [
    '0 1px 0 rgba(7, 10, 18, 0.85)',
    '0 0 3px rgba(7, 10, 18, 0.9)',
    `0 0 8px ${theme.glowCore}`,
    `0 0 22px ${theme.glowMid}`,
    `0 0 44px ${theme.glowSoft}`,
  ].join(', ');
}
```

### 1c. Use it in `updateBrandStyles` (this is the one that matters, see D4)

Replace:

```js
brandTextRef.current.style.textShadow = `0 0 16px ${theme.glow}, 0 0 32px ${theme.glowSoft}`;
```

with:

```js
brandTextRef.current.style.textShadow = brandTextShadow(theme);
```

Leave the `color` line and the `bottomFadeRef` block in that function unchanged.

### 1d. Use it in the wordmark's initial inline style

This is for the first paint and SSR. In the `<span ref={brandTextRef} …>` style object, replace the hard-coded `textShadow` string with:

```js
textShadow: brandTextShadow(getBrandTheme(0)),
```

Keep `color: '#f59e0b'`, the `transition` and all other properties as they are, apart from `fontSize` (see F4).

---

## F2: Soft CRT-corner scrim behind the wordmark (fixes D1, D2)

The halo outlines the glyphs. The scrim gives the whole word a slightly darker patch of "glass" to sit on, like the natural darkening in a CRT corner in the inspiration image. It's a pseudo-element, so there's no new DOM, and nothing in JS touches it.

In `PanoramicScrollHero.css`, add to the existing `.hero-hud-brand` rule (the one revived in Phase 0 of the previous plan):

```css
  position: relative;
  isolation: isolate;   /* keeps the ::before scrim behind the text but inside this box */
```

Then add right after that rule:

```css
/* Soft CRT-corner shadow behind the wordmark so it separates from bright sky / foliage */
.hero-hud-brand::before {
  content: '';
  position: absolute;
  inset: -16px -26px;
  border-radius: 50%;
  background: radial-gradient(ellipse closest-side, rgba(7, 10, 18, 0.62) 0%, rgba(7, 10, 18, 0.38) 55%, transparent 100%);
  z-index: -1;
  pointer-events: none;
}
```

Notes:
- It's an ellipse fading to transparent, not a box. That's deliberate: it must not look like a second button next to Sign In.
- It sits inside `.hero-crt-tilt--left`, so it inherits the tilt automatically.
- Tuning: if it's too visible, lower the two alphas together (for example 0.5 / 0.3). Don't go below 0.4 at the centre, or D2 comes back over the canopy.

---

## F3: Lift the wordmark above the wash layers (fixes D3)

In `PanoramicScrollHero.css`, `.hero-top-hud`:

```css
  z-index: 18;  /* above the CRT glass (16) and bottom-fade/ambient tint (17); below the sidebar (28) and CTA hotspot (35) */
```

- **Leave `.hero-top-auth-cluster` at 15.** Sign In is not to be touched.
- `pointer-events: none` on `.hero-top-hud` stays, so nothing underneath loses clicks.
- The glass glare (`.hero-crt-glass-glare`) no longer falls over the wordmark. That's acceptable: the shader's scanlines and the halo still make it read as part of the screen.

---

## F4: Centreline alignment with Sign In, and size (fixes D5, D6)

### 4a. Size

- Inline style on the wordmark `<span>`: `fontSize: '1.45rem'` → `fontSize: '1.6rem'`.
- `PanoramicScrollHero.css`, `@media (max-width: 768px)`, `.hero-hud-brand span`: `font-size: 1.15rem !important` → `font-size: 1.25rem !important`. Leave the `letter-spacing` line in that rule as it is.

### 4b. Centre the wordmark on Sign In's centreline

In the existing "Pin the brand and auth cluster…" `useEffect`, inside `place()`, change **only the `--crt-brand-top` line**. Leave every `--crt-auth-*` line exactly as it is.

```js
const brandH = brandHudRef.current ? brandHudRef.current.offsetHeight : 0;
const authH = authContainerRef.current ? authContainerRef.current.offsetHeight : brandH;
// Both anchors share the same glass y (mirror-symmetric); offset the brand so the two centrelines match
root.style.setProperty('--crt-brand-top', `${brand.y + (authH - brandH) / 2}px`);
```

Reading `authContainerRef.current.offsetHeight` is read-only, so Sign In is still untouched. `offsetHeight` ignores transforms, so the scroll `translateY` on the auth cluster doesn't affect it.

### 4c. Re-measure when the brand box changes size

The font size now matters for both the width (tilt) and the height (centring). In the same effect, right after the existing `ro.observe(authContainerRef.current)` line, add:

```js
if (ro && brandHudRef.current) ro.observe(brandHudRef.current);
```

The existing `ResizeObserver(place)`, the `document.fonts.ready.then(place)` call and the cleanup `ro.disconnect()` already cover the rest.

---

## F5: Test

Add `tests/heroBrandLegibility.test.js`. Use the same harness as `navigationVerification.test.js`: a Vite SSR server, `ssrLoadModule('./src/components/MotionHero/PanoramicScrollHero.jsx')` and `renderToString`. The tests:

1. The SSR HTML still contains `hero-top-hud`, `hero-hud-brand` and `VAYUVITALS`.
2. The wordmark's inline `text-shadow` contains the dark separation layer `rgba(7, 10, 18, 0.9)` **before** the amber glow `rgba(245, 158, 11, 0.85)`. Assert with `indexOf` ordering.
3. The SSR HTML does **not** contain the old two-layer shadow string `0 0 16px rgba(245, 158, 11, 0.65), 0 0 32px rgba(245, 158, 11, 0.25)`.

React serialises the style as `text-shadow:…`, so match on substrings, not on exact attribute order.

Run:

```bash
npm test
```

Expected: the same 8 pre-existing `pollutantDocumentaryCinematicUpgrade` failures and no others. The new tests and all `navigationVerification` and `crtFaceplate` tests pass.

---

## F6: Manual verification

Run `npm run dev:frontend`. Port 5173 may already be taken; Vite prints the actual port.

| Check | Expected |
|---|---|
| 1440×900 and 1920×1080, scroll 0 | VAYUVITALS reads crisply against the smog sky, with amber glow and dark-edged glyphs. No visible box or plate. |
| Scroll slowly to about 85% (green phase) | The wordmark, now green, stays readable over the canopy and trunk. |
| Centreline | The middle of VAYUVITALS lines up with the middle of the Sign In box at 1440, 1920 and 390 widths. |
| Tilt | Unchanged: counter-clockwise, following the glass. |
| 390×844 | The wordmark and Sign In don't overlap. The wordmark is visibly a little larger than before. |
| Sign In | **Identical to before**: same spot, tilt, red style, slides and fades on scroll, click opens the "Citizen Sign In" modal. |
| Sidebar tooltips | Still render above the wordmark (z 28 vs 18). |
| Stats and About pages | Unchanged. |

---

## Rollback

Revert the two source files. `getBrandTheme` only gained fields and the wordmark only gained a pseudo-element, so nothing else depends on these changes.
