import React, { useMemo } from 'react';
import { contours as d3Contours } from 'd3-contour';
import { geoPath } from 'd3-geo';
import { scaleLinear } from 'd3-scale';

// Delhi NCR bounds (same as ml/data/spatial_grids.json)
const BOUNDS = { minLon: 76.9, maxLon: 77.4, minLat: 28.4, maxLat: 28.85 };
const GRID_COLS = 120;
const GRID_ROWS = 100;
const MIN_POINTS = 3;

const BAND_COLORS = ['var(--olive-600)', 'var(--sage-500)', 'var(--bone-300)', 'var(--bone-200)', 'var(--bone-100)'];

/**
 * WmdContourMap - inverse-distance-weighted surface of the active pollutant over Delhi,
 * drawn as filled bands (5-step legend, real units) plus finer isolines.
 * Uses only points that report this pollutant; never borrows another pollutant's values.
 */
export default function WmdContourMap({
  stations = [],
  pollutantKey = 'pm25',
  symbol = 'PM2.5',
  unit = 'µg/m³',
  dataSourceLabel = '',
  isBaseline = false,
  lastUpdated,
}) {
  const points = useMemo(
    () =>
      stations
        .filter(
          (s) =>
            typeof s[pollutantKey] === 'number' &&
            Number.isFinite(s[pollutantKey]) &&
            typeof s.lat === 'number' &&
            typeof s.lon === 'number'
        )
        .map((s) => ({ lat: s.lat, lon: s.lon, val: s[pollutantKey] })),
    [stations, pollutantKey]
  );

  const surface = useMemo(() => {
    if (points.length < MIN_POINTS) return null;

    // Quadratic IDW on a regular grid, row 0 = north
    const values = new Float64Array(GRID_COLS * GRID_ROWS);
    for (let j = 0; j < GRID_ROWS; j++) {
      const lat = BOUNDS.maxLat - (j / (GRID_ROWS - 1)) * (BOUNDS.maxLat - BOUNDS.minLat);
      for (let i = 0; i < GRID_COLS; i++) {
        const lon = BOUNDS.minLon + (i / (GRID_COLS - 1)) * (BOUNDS.maxLon - BOUNDS.minLon);
        let wSum = 0;
        let vSum = 0;
        let exact = null;
        for (const p of points) {
          const d2 = (lat - p.lat) ** 2 + (lon - p.lon) ** 2;
          if (d2 < 1e-8) {
            exact = p.val;
            break;
          }
          wSum += 1 / d2;
          vSum += p.val / d2;
        }
        values[j * GRID_COLS + i] = exact ?? vSum / wSum;
      }
    }

    let min = Infinity;
    let max = -Infinity;
    for (const v of values) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const domain = scaleLinear().domain([min, max]).nice(5);
    const bandThresholds = domain.ticks(5).filter((t) => t > min && t < max);
    const lineThresholds = domain.ticks(14).filter((t) => t > min && t < max);
    // Bands start at the surface minimum so the whole plate is covered
    const bands = d3Contours().size([GRID_COLS, GRID_ROWS]).thresholds([min, ...bandThresholds])(values);
    const lines = d3Contours().size([GRID_COLS, GRID_ROWS]).thresholds(lineThresholds)(values);
    const path = geoPath();
    return {
      bands: bands.map((b, idx) => ({
        d: path(b),
        color: BAND_COLORS[Math.min(BAND_COLORS.length - 1, Math.round((idx / Math.max(1, bands.length - 1)) * (BAND_COLORS.length - 1)))],
        from: b.value,
      })),
      lines: lines.map((l) => path(l)),
      min,
      max,
    };
  }, [points]);

  const timeLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST'
    : null;

  return (
    <div className="wmd-contour">
      <div className="wmd-contour__header">
        <h3 className="wmd-contour__title">{symbol} EXPOSURE</h3>
      </div>

      <div className="wmd-contour__stage">
        <div className="wmd-contour__plate">
          {surface ? (
            <svg
              className="wmd-contour__svg"
              viewBox={`0 0 ${GRID_COLS} ${GRID_ROWS}`}
              role="img"
              aria-label={`${symbol} interpolated surface over Delhi, ${Math.round(surface.min)} to ${Math.round(surface.max)} ${unit}`}
            >
              {surface.bands.map((b) => (
                <path key={`b-${b.from}`} d={b.d} style={{ fill: b.color }} />
              ))}
              {surface.lines.map((d, idx) => (
                <path
                  key={`l-${idx}`}
                  d={d}
                  fill="none"
                  stroke="var(--ink-900)"
                  strokeWidth={0.6}
                  strokeOpacity={0.55}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          ) : (
            <div className="wmd-contour__insufficient-banner">
              <p>
                No spatial {symbol} data from current sources ({points.length} point
                {points.length === 1 ? '' : 's'} report it; {MIN_POINTS} needed).
              </p>
            </div>
          )}
        </div>

        {surface && (
          <div className="wmd-contour__legend" aria-label={`${symbol} legend in ${unit}`}>
            <span className="wmd-contour__legend-title">{unit}</span>
            <div className="wmd-contour__legend-swatches">
              {surface.bands
                .slice()
                .reverse()
                .map((b) => (
                  <div key={b.from} className="wmd-contour__legend-row">
                    <div className="wmd-contour__legend-swatch" style={{ background: b.color }} />
                    <span className="wmd-contour__legend-label">{Math.round(b.from)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      <p className="wmd-chart-caption">
        IDW ESTIMATE · {points.length} POINTS · {(dataSourceLabel || 'Unknown source').toUpperCase()}
        {isBaseline ? ' · NOT LIVE' : timeLabel ? ` · ${timeLabel}` : ''}
      </p>
    </div>
  );
}
