# Hero CRT Corner Relocation: Implementation Plan

**Goal:** On the landing hero (`PanoramicScrollHero`), move the `VAYUVITALS` wordmark into the **top-left corner of the CRT glass** and the **Sign In** button into the **top-right corner of the CRT glass**. Both should look like they sit on the curved TV screen: tucked inside the bezel and tilted to follow the barrel curvature, as in the owner's inspiration screenshot.

**Scope:** Only relocate and tilt these two elements, plus one optional landing-only restyle of the Sign In button (Phase 4). Nothing else on the page changes.

---

## 0. Hard rules for the implementing agent

1. **Do not touch** `src/components/MotionHero/CrtScreenLensCanvas.jsx`. That includes the shader, the cards, the hit-testing and the curvature values. The new math *mirrors* the shader and doesn't change it.
2. **Do not change** the scroll behaviour. The brand colour still shifts amber → gold → green through `updateBrandStyles`. The auth cluster still slides up and fades out through the `authContainerRef` scroll code. The sidebar, the particles, the CTA hotspot and the bottom fade all stay as they are.
3. **Do not change any visible text, icons or `aria-label`s.** The DOM text stays `VAYUVITALS` and `Sign In`. Uppercase is done with CSS `text-transform` only.
4. **`AuthHeaderBadge` is also rendered in `src/App.jsx` (lines ~420 and ~433)** on other pages. Its default look and behaviour must stay byte-for-byte the same. Any restyle is opt-in through a new prop that only the hero passes.
5. Keep the class names `hero-top-hud` and `hero-hud-brand` and the text `VAYUVITALS`. `tests/navigationVerification.test.js` asserts on them.
6. All of `npm test` must pass before and after.

---

## 1. Why this approach (decision record)

The CRT image is a WebGL quad. `curveFaceplate()` in the fragment shader barrel-distorts everything sampled from the panorama and from the offscreen "template" canvas (the DELHI NCR AIR ALERT cards). The wordmark and Sign In are **DOM elements layered on top**. Today they sit in the dark bezel at `top:26px; left:96px` and `top:24px; right:28px`, so they look like they're outside the TV.

| Option | Verdict |
|---|---|
| A. Paint the wordmark and Sign In into the shader's text canvas | ❌ You get exact curvature, but Sign In becomes canvas pixels. You'd have to rebuild hit-testing, the hover and focus states, keyboard access, the signed-in and loading variants, and the modal trigger. It also edits `CrtScreenLensCanvas`, which rule 0.1 forbids. Too much risk for a relocation. |
| B. Hand-tune `top`/`left` px plus a fixed `rotate()` | ❌ The glass corner moves a lot with viewport size and aspect ratio (see the table below), so fixed numbers break off the tuned screen. |
| **C. Keep both as DOM. Compute their position and tilt from the same barrel formula the shader uses, recompute on resize, and push the values in as CSS custom properties.** | ✅ Chosen. Auth, a11y and the tests stay intact. The elements land exactly where a point painted on the curved glass would land, on every viewport. |

Where the glass corner lands (faceplate inset `0.045 × 0.05`, computed with the shader's own formula):

| Viewport | Brand anchor (left, top) | Brand tilt | Auth anchor (right, top) | Auth tilt |
|---|---|---|---|---|
| 1920×1080 | 254px, 147px | −7.9° | 254px, 147px | +8.2° |
| 1440×900 | 179px, 116px | −7.1° | 179px, 116px | +7.6° |
| 1366×768 | 181px, 105px | −7.5° | 181px, 105px | +8.0° |
| 820×1180 | 72px, 110px | −3.1° | 72px, 110px | +3.7° |
| 390×844 | 20px, 48px | −0.2° | 20px, 48px | +0.4° |

(Below 600px wide the shader drops curvature from `0.28` to `0.04`. The screen is nearly flat there, so the tilt is close to 0 and the insets are small. The formula covers that case without special code.)

The left sidebar is 70px wide. Every desktop anchor is well clear of it.

---

## 2. Files touched

| File | Change |
|---|---|
| `src/components/MotionHero/crtFaceplate.js` | **New.** Pure functions that mirror the shader's barrel math. |
| `src/components/MotionHero/PanoramicScrollHero.jsx` | Add a ref plus a resize effect that writes CSS variables. Add a tilt wrapper element inside each of the two containers. Remove the inline `top`/`right` from the auth container. |
| `src/components/MotionHero/PanoramicScrollHero.css` | Fix the stray merge marker. Position both elements from the CSS variables. Add the tilt classes. Add the optional `crt` Sign In look. |
| `src/components/Auth/AuthHeaderBadge.jsx` | *(Phase 4 only)* An optional `variant` prop. The default is unchanged. |
| `tests/crtFaceplate.test.js` | **New.** Unit tests for the math. |

No other files change.

---

## Phase 0: Fix the pre-existing merge marker (required)

`src/components/MotionHero/PanoramicScrollHero.css` line 259 contains a leftover conflict marker:

```
>>>>>>> origin/main
.hero-hud-brand {
```

CSS parses that as one invalid selector (`>>>>>>> origin/main .hero-hud-brand`), so the browser **drops the whole `.hero-hud-brand` rule today**. Delete only the `>>>>>>> origin/main` line. Change nothing else in that rule.

Visual impact is negligible. The wordmark `<span>` carries its own inline font, size and colour, which win anyway. The rule only adds `display:flex` to the container, which the tilt wrapper relies on.

---

## Phase 1: `crtFaceplate.js` (new file)

Create `src/components/MotionHero/crtFaceplate.js`:

```js
/**
 * Mirrors curveFaceplate() and the uCurvature values in CrtScreenLensCanvas.jsx.
 * If the shader's barrel math or curvature values change, update this file to match.
 *
 * Coordinates are normalised viewport units, 0..1, with y pointing DOWN (DOM space).
 * The distortion is symmetric, so the shader's y-up convention gives the same result.
 */

export const crtCurvature = (width) => (width < 600 ? 0.04 : 0.28);

// Forward map, identical to the shader: viewport uv -> faceplate (template-canvas) uv
export function curveFaceplate(u, v, aspect, curvature) {
  const x = (u * 2 - 1) * aspect;
  const y = v * 2 - 1;
  const s = 1 + curvature * (x * x + y * y) * 0.38;
  return [((x * s) / aspect) * 0.5 + 0.5, y * s * 0.5 + 0.5];
}

// Inverse map: where on the viewport does a point painted at faceplate (fx, fy) appear?
// Damped fixed-point iteration; converges to < 1e-4 in well under 60 steps for all supported viewports.
export function faceplateToViewport(fx, fy, width, height) {
  const aspect = width / height;
  const k = crtCurvature(width);
  let u = fx;
  let v = fy;
  for (let i = 0; i < 60; i++) {
    const [cu, cv] = curveFaceplate(u, v, aspect, k);
    u += (fx - cu) * 0.5;
    v += (fy - cv) * 0.5;
  }
  return [u * width, v * height];
}

/**
 * Pixel anchor + tilt for an element whose outer top corner sits at faceplate (fx, fy).
 * side 'left'  -> returns { x: left inset px,  y: top px, angle: deg } (element extends rightwards)
 * side 'right' -> returns { x: right inset px, y: top px, angle: deg } (element extends leftwards)
 * spanPx is the element's width, used to sample the local curve slope.
 * Positive angle = clockwise (CSS rotate convention).
 */
export function crtCornerAnchor(fx, fy, spanPx, width, height, side) {
  const dx = spanPx / width;
  const corner = faceplateToViewport(fx, fy, width, height);
  const other = faceplateToViewport(side === 'left' ? fx + dx : fx - dx, fy, width, height);
  const [a, b] = side === 'left' ? [corner, other] : [other, corner];
  const angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  return {
    x: side === 'left' ? corner[0] : width - corner[0],
    y: corner[1],
    angle,
  };
}
```

This file has no React, no DOM and no side effects. That makes it SSR-safe and unit-testable.

---

## Phase 2: Wire it into `PanoramicScrollHero.jsx`

### 2a. Imports, refs and constants

```js
import { crtCornerAnchor } from './crtFaceplate';
```

Above the component, add tunable constants. These are the only knobs for matching the inspiration image:

```js
// Faceplate-space inset of the brand / auth corners on the curved CRT glass (0..1 of the screen).
// Hard glass edge is at 0.025 and the shader vignette fades in up to 0.06; 0.035–0.06 is the usable range.
const CRT_CORNER_INSET_X = 0.045;
const CRT_CORNER_INSET_Y = 0.05;
// 1 = follow the glass exactly; lower to soften the tilt.
const CRT_TILT_FACTOR = 1;
```

Inside the component, add:

```js
const viewportRef = useRef(null);
const brandHudRef = useRef(null);
```

### 2b. Resize effect: write CSS variables, no React state

Follow the file's existing pattern: high-frequency style updates go through refs and direct DOM writes, not state. Add this effect next to the other effects:

```js
// Pin the brand and auth cluster to the curved CRT glass corners (mirrors the shader's barrel math)
useEffect(() => {
  const place = () => {
    const root = viewportRef.current;
    if (!root) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const brandW = brandHudRef.current ? brandHudRef.current.offsetWidth : 240;
    const authW = authContainerRef.current ? authContainerRef.current.offsetWidth : 120;

    const brand = crtCornerAnchor(CRT_CORNER_INSET_X, CRT_CORNER_INSET_Y, brandW, w, h, 'left');
    const auth = crtCornerAnchor(1 - CRT_CORNER_INSET_X, CRT_CORNER_INSET_Y, authW, w, h, 'right');

    root.style.setProperty('--crt-brand-left', `${brand.x}px`);
    root.style.setProperty('--crt-brand-top', `${brand.y}px`);
    root.style.setProperty('--crt-brand-tilt', `${brand.angle * CRT_TILT_FACTOR}deg`);
    root.style.setProperty('--crt-auth-right', `${auth.x}px`);
    root.style.setProperty('--crt-auth-top', `${auth.y}px`);
    root.style.setProperty('--crt-auth-tilt', `${auth.angle * CRT_TILT_FACTOR}deg`);
  };

  place();
  window.addEventListener('resize', place);
  // Re-measure once web fonts settle (the wordmark width changes when Outfit loads)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  // Auth badge width changes between loading / Sign In / signed-in states
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null;
  if (ro && authContainerRef.current) ro.observe(authContainerRef.current);

  return () => {
    window.removeEventListener('resize', place);
    if (ro) ro.disconnect();
  };
}, []);
```

`useEffect` never runs during SSR, so `renderToString` in the tests is unaffected. The CSS fallbacks in Phase 3 cover the first paint.

### 2c. JSX changes (structure only)

1. Put `ref={viewportRef}` on the **sticky fullscreen viewport `<div>`** (the one with `position: 'sticky'`). Don't change its inline styles.

2. Brand. Add the ref and a tilt wrapper. Keep both class names and the span exactly as they are:

```jsx
<div className="hero-top-hud" ref={brandHudRef}>
  <div className="hero-crt-tilt hero-crt-tilt--left">
    <div className="hero-hud-brand">
      <span ref={brandTextRef} style={{ /* UNCHANGED */ }}>
        VAYUVITALS
      </span>
    </div>
  </div>
</div>
```

3. Auth cluster. **Remove `top: '24px'` and `right: '28px'` from its inline `style`.** Inline styles beat CSS, so leaving them would pin the cluster in the bezel. Keep `position`, `zIndex: 15`, `transition` and `willChange`. Wrap the badge:

```jsx
<div ref={authContainerRef} className="hero-top-auth-cluster" style={{ position: 'absolute', zIndex: 15, transition: 'transform 0.06s linear, opacity 0.1s ease', willChange: 'transform, opacity' }}>
  <div className="hero-crt-tilt hero-crt-tilt--right">
    <AuthHeaderBadge variant="crt" />   {/* variant only if Phase 4 is done; otherwise plain <AuthHeaderBadge /> */}
  </div>
</div>
```

> ⚠️ **Why the wrapper is mandatory:** the scroll handler writes `authContainerRef.current.style.transform = translateY(...)` on every scroll. A `rotate()` on that same element would be overwritten on the first scroll tick. The tilt has to live on a **child** element. The brand gets the same wrapper for symmetry, and to keep the tilt clear of any future transform on `.hero-top-hud`.

---

## Phase 3: CSS (`PanoramicScrollHero.css`)

### 3a. Position from the variables. Old values stay as fallbacks.

Change the existing rules as follows (only the lines shown change):

```css
.hero-top-hud {
  position: absolute;
  top: var(--crt-brand-top, 26px);
  left: var(--crt-brand-left, 96px);
  z-index: 15;            /* was 30: now sits under the CRT glass (.hero-crt-screen-curvature, z 16) like the auth cluster */
  display: flex;
  align-items: center;
  gap: 14px;
  pointer-events: none;   /* was auto: the wordmark is not interactive; keeps the canvas beneath clickable */
}

.hero-top-auth-cluster {
  position: absolute;
  top: var(--crt-auth-top, 24px);
  right: var(--crt-auth-right, 28px);
  z-index: 15;
  pointer-events: auto;
}
```

Add the tilt helpers right after them:

```css
/* Tilt follows the CRT barrel curvature; lives on a child so scroll-driven transforms on the parent don't clobber it */
.hero-crt-tilt {
  display: flex;
  align-items: center;
}

.hero-crt-tilt--left {
  transform: rotate(var(--crt-brand-tilt, 0deg));
  transform-origin: top left;
}

.hero-crt-tilt--right {
  transform: rotate(var(--crt-auth-tilt, 0deg));
  transform-origin: top right;
}
```

The `transform-origin` matters. The anchor point is the element's **outer** top corner, the one nearest the TV corner, so the rotation must pivot there or the element drifts off its anchor.

### 3b. Media queries

In the existing `@media (max-width: 900px)` and `@media (max-width: 768px)` blocks, replace the hard-coded `top`/`left`/`right` on `.hero-top-hud` and `.hero-top-auth-cluster` with the same `var(--crt-…, <old value>)` form, keeping each block's old value as the fallback. For example:

```css
@media (max-width: 768px) {
  .hero-top-hud {
    top: var(--crt-brand-top, 14px);
    left: var(--crt-brand-left, 14px);
    gap: 8px;
  }
  .hero-top-auth-cluster {
    top: var(--crt-auth-top, 14px);
    right: var(--crt-auth-right, 14px);
  }
  /* .hero-hud-brand span font-size rule: UNCHANGED */
}
```

Leave every other rule in those blocks as it is.

### 3c. About z-index 15

Both elements now sit **under** `.hero-crt-screen-curvature` (z 16, `pointer-events:none`), so the glass vignette and glare fall across them, and **under** the bottom-fade layer (z 17), which darkens the top 14% slightly. That's what puts them "inside the TV". The auth cluster already worked this way, and clicks still pass through, because both overlays are `pointer-events:none`.

If the wordmark looks too dim after the move, raise **only** `.hero-top-hud` back to `z-index: 30`. Don't edit the overlays.

---

## Phase 4 (matches the inspiration image): CRT-style Sign In, landing hero only

The inspiration shows Sign In as a red, glowing, monospace, uppercase button that matches the in-TV DELHI NCR AIR ALERT card. If the owner says "relocate only, no restyle", **skip this phase** and render plain `<AuthHeaderBadge />`.

### 4a. `AuthHeaderBadge.jsx`: opt-in variant, default untouched

- Change the signature to `export default function AuthHeaderBadge({ variant = 'default' } = {})`.
- **Only in the signed-out branch** (the final `return`), when `variant === 'crt'`, render the same `<button>` with the same `type`, `onClick`, `<LogIn …/>` icon and `<span>Sign In</span>`, but:
  - use `className="auth-badge-crt"` instead of the inline `style` object;
  - leave out the `onMouseEnter` and `onMouseLeave` handlers, since CSS `:hover` handles them.
- The loading and signed-in branches are **unchanged** for both variants. They get relocated and tilted, not restyled.
- With `variant` absent (`App.jsx`), the output must be identical to today's.

Keep the existing `LogIn` icon. Swapping it for the person icon in the inspiration image is a content change and is out of scope.

### 4b. CSS: add to `PanoramicScrollHero.css`, scoped under the hero

```css
/* Landing-hero Sign In: phosphor-red CRT button echoing the DELHI NCR AIR ALERT card */
.hero-top-auth-cluster .auth-badge-crt {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  background: rgba(6, 10, 18, 0.72);
  border: 1.5px solid rgba(239, 68, 68, 0.85);
  color: #f87171;
  font-family: 'Share Tech Mono', 'JetBrains Mono', monospace;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-shadow: 0 0 8px rgba(239, 68, 68, 0.7);
  box-shadow: 0 0 14px rgba(239, 68, 68, 0.35), inset 0 0 10px rgba(239, 68, 68, 0.12);
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;
}

.hero-top-auth-cluster .auth-badge-crt:hover {
  color: #fecaca;
  background: rgba(239, 68, 68, 0.12);
  box-shadow: 0 0 22px rgba(239, 68, 68, 0.55), inset 0 0 12px rgba(239, 68, 68, 0.2);
}

.hero-top-auth-cluster .auth-badge-crt:focus-visible {
  outline: 2px solid #fca5a5;
  outline-offset: 3px;
}
```

`Share Tech Mono` is already loaded in `index.html`, so no new font request is needed. The red fits because the button fades out by about 21% scroll (`opacity = 1 − progress × 4.8`), which is entirely within the red Phase 1 of the hero.

---

## Phase 5: Tests

### 5a. New `tests/crtFaceplate.test.js`

This file uses `node:test` and `node:assert/strict`, like the other tests. Import with a plain relative ESM import, since the module is pure. It should assert the following:

1. **Round trip:** for viewports 1920×1080, 1366×768 and 390×844, `curveFaceplate(faceplateToViewport(fx, fy)/size)` returns `(fx, fy)` within `1e-4`, for `(0.045, 0.05)` and `(0.955, 0.05)`.
2. **The centre is fixed:** `faceplateToViewport(0.5, 0.5, w, h)` returns `(w/2, h/2)`.
3. **Pulled inward:** at 1920×1080 the brand anchor `x` is greater than `0.045 × 1920`, and `y` is greater than `0.05 × 1080`.
4. **Mirror symmetry:** the left anchor `x` equals the right anchor `x` (within 0.5px), and `left.angle ≈ −right.angle` in sign. Magnitudes differ slightly because the spans differ, so only the signs need to be opposite.
5. **Tilt direction:** the left anchor angle is less than 0 and the right anchor angle is greater than 0 at 1920×1080.
6. **Clears the sidebar:** at 1280×800 and above, the brand anchor `x` is greater than 70.
7. **Curvature parity with the shader:** `crtCurvature(599) === 0.04` and `crtCurvature(600) === 0.28`. Also read `CrtScreenLensCanvas.jsx` as text and assert it still contains `width < 600 ? 0.04 : 0.28` and `uCurvature * r2 * 0.38`, so drift between the shader and the mirror fails loudly.

### 5b. Existing tests

`tests/navigationVerification.test.js` must pass unchanged. `hero-top-hud`, `hero-hud-brand` and `VAYUVITALS` are all still in the SSR output.

Run:

```bash
npm test
```

---

## Phase 6: Manual visual verification

Run `npm run dev:frontend` and open the landing page.

| Check | Expected |
|---|---|
| 1920×1080, scroll 0 | The wordmark is inside the glass at the top-left, tilted counter-clockwise (right end higher). Sign In is inside the glass at the top-right, tilted clockwise. Neither sits in the black bezel. |
| Compare with the inspiration screenshot | Same corners, same lean. If they sit too deep or too shallow, tune only `CRT_CORNER_INSET_X/Y` (and `CRT_TILT_FACTOR` if the lean is too strong). |
| Scroll down | The wordmark colour still shifts amber → green. Sign In still slides up and fades by about 20%, **and keeps its tilt while moving**. |
| Click Sign In | The auth modal opens, as before. |
| Signed in | The user pill shows in the same corner with the same tilt, and logout works. |
| Resize the window live | Both elements track the glass corners with no jump. |
| 1366×768, 820×1180, 390×844 (DevTools) | Inside the glass, nothing overlaps, the tilt is close to 0 on phones, and the sidebar is hidden at ≤900px as before. |
| Keyboard Tab to Sign In | The focus ring is visible. |
| Stats and About pages (`App.jsx` header) | The Sign In button looks **exactly** as before. |
| Cards, particles, CTA hotspot, sidebar tooltips | Unchanged. |

---

## Rollback

Everything is additive or local to the two containers. To roll back, revert the five files listed in section 2. The CSS fallbacks (`var(--crt-…, <old px>)`) mean that even if the effect fails to run, the elements render at their old positions instead of disappearing.
