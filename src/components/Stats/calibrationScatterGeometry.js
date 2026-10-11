/**
 * Shared axis geometry for the observed-vs-predicted calibration scatters.
 * Both axes share one µg/m³ domain so the 1:1 diagonal is a true 45° agreement line.
 */

// Plot box inside the 540 × 220 viewBox used by both scatter SVGs
export const SCATTER_BOX = { left: 50, right: 500, top: 15, bottom: 185 };

const CORRIDOR = 20; // ±20 µg/m³ operational corridor

export function buildCalibrationGeometry(points) {
  const peak = points.reduce((m, p) => Math.max(m, p.actual, p.pred), 0);
  const axisMax = Math.max(100, Math.ceil(peak / 100) * 100);
  const { left, right, top, bottom } = SCATTER_BOX;

  const toX = (v) => left + (Math.min(v, axisMax) / axisMax) * (right - left);
  const toY = (v) => bottom - (Math.min(v, axisMax) / axisMax) * (bottom - top);

  const ticks = [];
  for (let v = 0; v <= axisMax; v += 100) ticks.push(v);

  // ±20 band around the diagonal, in data space, clipped to the axis box
  const corridor = [
    [0, 0], [0, CORRIDOR], [axisMax - CORRIDOR, axisMax], [axisMax, axisMax], [axisMax, axisMax - CORRIDOR], [CORRIDOR, 0],
  ];
  const corridorPath =
    corridor.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${toX(x).toFixed(1)} ${toY(y).toFixed(1)}`).join(' ') + ' Z';

  return {
    axisMax,
    ticks,
    toX,
    toY,
    corridorPath,
    diagonal: { x1: toX(0), y1: toY(0), x2: toX(axisMax), y2: toY(axisMax) },
  };
}
