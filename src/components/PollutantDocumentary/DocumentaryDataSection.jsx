/**
 * DocumentaryDataSection.jsx
 * VayuVitals - Editorial Science & Telemetry Data Section
 *
 * Implements Section 9 of the new unified UI system:
 * - Large typography, simple data blocks, subtle dividers, editorial layout
 * - CPCB NAAQS Standard vs WHO 2021 Benchmark comparison
 * - Physical scale & aerodynamic particle dimension / molecular properties
 * - 24-Hour diurnal dynamics curve
 * - Active Delhi CAAQMS monitoring network readings
 * - STRICTLY NO dashboard grids, NO technical vehicle cards, NO excessive glass cards
 */

import React, { useMemo } from 'react';
import { ShieldCheck, AlertCircle, BarChart3, Radio } from 'lucide-react';

export default function DocumentaryDataSection({
  pollutantData,
  currentValue,
  currentStation,
  stationsList = [],
}) {
  const { sections = {}, visualMetadata = {} } = pollutantData;
  const unit = pollutantData.unit || 'µg/m³';
  const comparisonItems = sections.section02?.comparisonItems || [];
  const diurnalPoints = sections.section06?.diurnalPoints || [];

  // Comparison metrics against national standard and WHO guideline
  const naaqsRatio = useMemo(() => {
    if (currentValue == null || !pollutantData.naaqsLimit) return null;
    return (currentValue / pollutantData.naaqsLimit).toFixed(1);
  }, [currentValue, pollutantData.naaqsLimit]);

  const whoRatio = useMemo(() => {
    if (currentValue == null || !pollutantData.whoLimit) return null;
    return (currentValue / pollutantData.whoLimit).toFixed(1);
  }, [currentValue, pollutantData.whoLimit]);

  // Visual Diurnal Aggregates (PEAK, AVERAGE, LOW, CURRENT)
  const diurnalMetrics = useMemo(() => {
    if (!diurnalPoints || diurnalPoints.length === 0) return null;
    const values = diurnalPoints.map((p) => p.value || 0);
    const peak = Math.max(...values);
    const low = Math.min(...values);
    const avg = Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
    const curr = currentValue != null ? Math.round(currentValue) : (diurnalPoints[diurnalPoints.length - 1]?.value || 0);
    return { peak, low, avg, curr };
  }, [diurnalPoints, currentValue]);

  return (
    <section className="documentary-data-section" id="documentary-data-section">
      <div className="documentary-data-container">
        {/* Section Header */}
        <header className="documentary-data-header">
          <div className="doc-data-kicker">
            <Radio size={13} />
            <span>EMPIRICAL TELEMETRY & SCIENTIFIC STANDARDS</span>
          </div>
          <h2 className="documentary-data-title">WHAT THE DATA SHOWS</h2>
          <p className="documentary-data-lead">
            Verified ambient concentrations recorded by Central Pollution Control Board (CPCB) and DPCC continuous telemetry stations.
          </p>
        </header>

        {/* 1. STANDARDS COMPARISON BLOCKS */}
        <div className="documentary-standards-tableau">
          <div className="doc-standard-card">
            <span className="doc-card-kicker">CURRENT FIELD READING</span>
            <div className="doc-card-value-row">
              <span className="doc-card-big-num">
                {currentValue != null ? Math.round(currentValue) : '—'}
              </span>
              <span className="doc-card-unit">{unit}</span>
            </div>
            <p className="doc-card-note">
              {currentStation?.name || 'Delhi CAAQMS Monitoring Station'}
            </p>
          </div>

          <div className="doc-standard-card">
            <span className="doc-card-kicker">INDIAN NAAQS 24-HR LIMIT</span>
            <div className="doc-card-value-row">
              <span className="doc-card-big-num">{pollutantData.naaqsLimit}</span>
              <span className="doc-card-unit">{unit}</span>
            </div>
            <p className="doc-card-note">
              {naaqsRatio
                ? `${naaqsRatio}x of legal statutory limit`
                : 'National Ambient Air Quality Standard'}
            </p>
          </div>

          <div className="doc-standard-card">
            <span className="doc-card-kicker">WHO 2021 AIR QUALITY GUIDELINE</span>
            <div className="doc-card-value-row">
              <span className="doc-card-big-num">{pollutantData.whoLimit}</span>
              <span className="doc-card-unit">{unit}</span>
            </div>
            <p className="doc-card-note">
              {whoRatio
                ? `${whoRatio}x of health-protective threshold`
                : 'Global Epidemiological Health Standard'}
            </p>
          </div>
        </div>

        {/* 2. SCALE / PROPORTIONAL PHYSICAL PROPERTY */}
        {comparisonItems.length > 0 && (
          <div className="documentary-scale-editorial-block">
            <div className="doc-block-header">
              <h3 className="doc-block-title">AERODYNAMIC SCALE COMPARISON</h3>
              <span className="doc-block-subtitle">
                {sections.section02?.lead || 'Scale defines the biological penetration depth.'}
              </span>
            </div>

            <div className="doc-scale-rows">
              {comparisonItems.map((item, idx) => (
                <div key={idx} className="doc-scale-row">
                  <div className="doc-scale-labels">
                    <span className="doc-scale-name">{item.label}</span>
                    <span className="doc-scale-size">{item.sizeMicrons} µm</span>
                  </div>
                  <div className="doc-scale-track">
                    <div
                      className={`doc-scale-fill ${item.visualClass || ''}`}
                      style={{ width: `${Math.max(2, item.barWidthPercent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="doc-scale-prose single-line">
              {sections.section02?.body
                ? sections.section02.body.split('.')[0] + '.'
                : 'Particles ≤ 2.5 µm bypass natural anatomical filters, descending into terminal pulmonary alveoli.'}
            </p>
          </div>
        )}

        {/* 3. 24-HOUR DIURNAL PROGRESSION CHART */}
        {diurnalPoints.length > 0 && (
          <div className="documentary-diurnal-block">
            <div className="doc-block-header">
              <h3 className="doc-block-title">24-HOUR DIURNAL CONCENTRATION CYCLE</h3>
              <span className="doc-block-subtitle">
                Night inversion traps emissions near the ground; afternoon solar heating expands the boundary layer.
              </span>
            </div>

            {/* Visual 4-Metric Aggregates: PEAK, AVERAGE, LOW, CURRENT */}
            {diurnalMetrics && (
              <div className="doc-diurnal-summary-strip">
                <div className="doc-diurnal-metric-pill peak">
                  <span className="doc-d-lbl">PEAK</span>
                  <span className="doc-d-val">{diurnalMetrics.peak} {unit}</span>
                </div>
                <div className="doc-diurnal-metric-pill avg">
                  <span className="doc-d-lbl">AVERAGE</span>
                  <span className="doc-d-val">{diurnalMetrics.avg} {unit}</span>
                </div>
                <div className="doc-diurnal-metric-pill low">
                  <span className="doc-d-lbl">LOW</span>
                  <span className="doc-d-val">{diurnalMetrics.low} {unit}</span>
                </div>
                <div className="doc-diurnal-metric-pill curr">
                  <span className="doc-d-lbl">CURRENT</span>
                  <span className="doc-d-val">{diurnalMetrics.curr} {unit}</span>
                </div>
              </div>
            )}

            <div className="doc-diurnal-chart-wrap">
              <svg
                className="doc-diurnal-svg"
                viewBox="0 0 640 180"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="docDiurnalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {(() => {
                  const maxVal = Math.max(...diurnalPoints.map((p) => p.value || 100)) * 1.15;
                  const coords = diurnalPoints.map((p, idx) => ({
                    x: 40 + (idx / (diurnalPoints.length - 1)) * 560,
                    y: 150 - (p.value / maxVal) * 120,
                    val: p.value,
                    label: p.label,
                  }));
                  let pathD = `M ${coords[0].x} ${coords[0].y}`;
                  for (let i = 1; i < coords.length; i++) {
                    pathD += ` L ${coords[i].x} ${coords[i].y}`;
                  }
                  const areaD = `${pathD} L 600 160 L 40 160 Z`;
                  return (
                    <>
                      <path d={areaD} fill="url(#docDiurnalGrad)" />
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                      />
                      {coords.map((c, i) => (
                        <g key={i}>
                          <circle
                            cx={c.x}
                            cy={c.y}
                            r="4"
                            fill="#ffffff"
                            stroke="#10b981"
                            strokeWidth="2"
                          />
                          <text
                            x={c.x}
                            y={c.y - 12}
                            fill="#cbd5e1"
                            fontSize="11"
                            textAnchor="middle"
                            fontWeight="600"
                          >
                            {c.val}
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>

              <div className="doc-diurnal-time-axis">
                {diurnalPoints.map((p, idx) => (
                  <span key={idx} className="doc-time-point">{p.label}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. REAL CAAQMS STATIONS GRID */}
        {stationsList.length > 0 && (
          <div className="documentary-stations-editorial-block">
            <div className="doc-block-header">
              <h3 className="doc-block-title">CAAQMS REGIONAL GROUND STATIONS</h3>
              <span className="doc-block-subtitle">
                Continuous Beta Attenuation Monitors & Spectrometry across Delhi NCR
              </span>
            </div>

            <div className="documentary-stations-row">
              {stationsList.slice(0, 4).map((st) => (
                <div key={st.id} className="doc-station-mini-card">
                  <div className="doc-st-zone">{st.zone || 'Delhi NCR'}</div>
                  <h4 className="doc-st-name">{st.name.split(',')[0]}</h4>
                  <div className="doc-st-value-row">
                    <span className="doc-st-num">
                      {st[pollutantData.id] ?? st.pm25 ?? '—'}
                    </span>
                    <span className="doc-st-unit">{unit}</span>
                  </div>
                  <div className="doc-st-badge">VERIFIED SENSOR</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
