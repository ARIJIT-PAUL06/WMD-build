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
