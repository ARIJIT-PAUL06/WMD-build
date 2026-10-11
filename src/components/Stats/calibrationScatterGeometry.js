/**
 * Shared axis geometry for the observed-vs-predicted calibration scatters.
 * Both axes share one µg/m³ domain so the 1:1 diagonal runs corner to corner of the plot box,
 * and grid lines are placed on the same tick values that are labelled on each axis.
 */

// Default plot box (FIG. 02): viewBox 540 × 300
export const SCATTER_BOX = { width: 540, height: 300, left: 52, right: 524, top: 14, bottom: 246 };

const CORRIDOR = 20; // ±20 µg/m³ operational corridor
const TICK_STEP = 100;
const DOMAIN_STEP = 50;

export function buildCalibrationGeometry(points, box = SCATTER_BOX) {
  const peak = points.reduce((m, p) => Math.max(m, p.actual, p.pred), 0);
  // Tight domain (next 50 µg/m³) so the cloud fills the box instead of hugging the origin
  const axisMax = Math.max(100, Math.ceil(peak / DOMAIN_STEP) * DOMAIN_STEP);
  const { left, right, top, bottom } = box;

  const toX = (v) => left + (Math.min(v, axisMax) / axisMax) * (right - left);
  const toY = (v) => bottom - (Math.min(v, axisMax) / axisMax) * (bottom - top);

  const ticks = [];
  for (let v = 0; v <= axisMax; v += TICK_STEP) ticks.push(v);

  // ±20 band around the diagonal, in data space, clipped to the axis box
  const corridor = [
    [0, 0], [0, CORRIDOR], [axisMax - CORRIDOR, axisMax], [axisMax, axisMax], [axisMax, axisMax - CORRIDOR], [CORRIDOR, 0],
  ];
  const corridorPath =
    corridor.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${toX(x).toFixed(1)} ${toY(y).toFixed(1)}`).join(' ') + ' Z';

  return {
    box,
    axisMax,
    ticks,
    toX,
    toY,
    corridorPath,
    diagonal: { x1: toX(0), y1: toY(0), x2: toX(axisMax), y2: toY(axisMax) },
  };
}
