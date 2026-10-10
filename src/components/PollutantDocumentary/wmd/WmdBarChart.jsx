import React, { useMemo } from 'react';
import { scaleBand, scaleLinear } from 'd3-scale';

const MIN_SLOTS = 24; // keeps bars thin (as in the reference) even when few readings exist

const STORAGE_LABELS = {
  AWS_DYNAMODB: 'DynamoDB · AirQualityReadings',
  LOCAL_SESSION_STORE: 'Server session memory (not persisted)',
  EMPTY_NO_RECORDS: 'No stored records',
};

const formatStamp = (ts) =>
  new Date(ts).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });

/**
 * WmdBarChart - stored readings for the active pollutant from /api/history.
 * One bar per stored reading, oldest left; the part of a bar above the CPCB
 * limit is drawn in bone. Nothing is interpolated or filled in: with few
 * readings the chart shows few bars and says how many there are.
 */
export default function WmdBarChart({
  history,
  pollutantKey = 'pm25',
  symbol = 'PM2.5',
  naaqsLimit = 60,
  unit = 'µg/m³',
}) {
  const width = 390;
  const height = 190;
  const margin = { top: 16, right: 8, bottom: 8, left: 34 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const readings = useMemo(
    () =>
      (history?.records || [])
        .filter((rec) => typeof rec[pollutantKey] === 'number' && Number.isFinite(rec[pollutantKey]))
        .map((rec) => ({ ts: rec.timestamp, value: rec[pollutantKey] })),
    [history, pollutantKey]
  );

  const scales = useMemo(() => {
    if (readings.length === 0) return null;
    const slots = Math.max(readings.length, MIN_SLOTS);
    const offset = slots - readings.length; // right-align: newest reading sits at the right edge
    const x = scaleBand()
      .domain(Array.from({ length: slots }, (_, i) => i))
      .range([0, innerWidth])
      .padding(0.35);
    const maxVal = Math.max(...readings.map((r) => r.value), naaqsLimit);
    const y = scaleLinear().domain([0, maxVal * 1.1]).nice().range([innerHeight, 0]);
    return { x, y, offset };
  }, [readings, naaqsLimit, innerWidth, innerHeight]);

  const storageLabel = STORAGE_LABELS[history?.mode] || history?.mode || 'Unknown storage';
  const rangeLabel =
    readings.length === 0
      ? ''
      : readings.length === 1
        ? formatStamp(readings[0].ts)
        : `${formatStamp(readings[0].ts)} – ${formatStamp(readings[readings.length - 1].ts)}`;

  let body;
  if (!history || history.status === 'loading') {
    body = <p className="wmd-chart-empty">Loading stored readings…</p>;
  } else if (history.status === 'error') {
    body = <p className="wmd-chart-empty">Stored readings unavailable: {history.error}</p>;
  } else if (!scales) {
    body = (
      <p className="wmd-chart-empty">
        No stored {symbol} readings yet ({storageLabel}).
      </p>
    );
  } else {
    const { x, y, offset } = scales;
    const yLimit = y(naaqsLimit);
    body = (
      <svg
        className="wmd-barchart__svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${readings.length} stored ${symbol} readings, ${rangeLabel} IST`}
      >
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {y.ticks(4).map((tick) => (
            <text key={tick} x={-8} y={y(tick) + 3} textAnchor="end" className="wmd-barchart__tick-label">
              {tick}
            </text>
          ))}
          <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke="var(--rule)" />

          {readings.map((r, i) => {
            const bx = x(i + offset);
            const bw = x.bandwidth();
            const top = y(r.value);
            const split = Math.max(top, yLimit);
            return (
              <g key={r.ts} className="wmd-barchart__bar">
                <rect x={bx} y={split} width={bw} height={Math.max(0, innerHeight - split)} style={{ fill: 'var(--sage-500)' }} />
                {r.value > naaqsLimit && (
                  <rect x={bx} y={top} width={bw} height={Math.max(0, yLimit - top)} style={{ fill: 'var(--bone-200)' }} />
                )}
                <title>{`${formatStamp(r.ts)} IST: ${r.value} ${unit}`}</title>
              </g>
            );
          })}

          <line
            x1={0}
            y1={yLimit}
            x2={innerWidth}
            y2={yLimit}
            stroke="var(--bone-200)"
            strokeDasharray="2 3"
            strokeWidth={0.8}
            opacity={0.7}
          />
          <text x={2} y={yLimit - 5} className="wmd-barchart__limit-label">
            CPCB 24-H LIMIT {naaqsLimit}
          </text>

        </g>
      </svg>
    );
  }

  return (
    <div className="wmd-barchart">
      <div className="wmd-barchart__header">
        <h3 className="wmd-barchart__title">STORED READINGS · DELHI</h3>
        <span className="wmd-barchart__unit">{unit}</span>
      </div>
      {body}
      <p className="wmd-chart-caption">
        {scales ? `${readings.length} READING${readings.length === 1 ? '' : 'S'} · ${rangeLabel.toUpperCase()} IST · ` : ''}
        {storageLabel.toUpperCase()}
        {scales ? ' · EVENLY SPACED, NOT A TIME AXIS' : ''}
      </p>
    </div>
  );
}
