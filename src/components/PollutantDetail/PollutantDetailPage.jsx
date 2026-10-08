import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  Wind,
  ShieldCheck,
  Video,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
  Clock,
  Layers,
  HeartPulse,
  Flame,
  Gauge
} from 'lucide-react';
import { POLLUTANTS_DATA } from '../../data/pollutantsDetailData';
import LungsCanvas from '../ThreeScene/LungsCanvas';
import AnimatedCounter from '../common/AnimatedCounter';
import PhysiologicalImpactMatrix from '../common/PhysiologicalImpactMatrix';
import './PollutantDetailPage.css';

export default function PollutantDetailPage({ pollutantId = 'pm25', onBack, onSelectPollutant }) {
  const [activeDocModal, setActiveDocModal] = useState(null);
  const [hoveredTimeIdx, setHoveredTimeIdx] = useState(null);

  // Pollutant data lookup (fallback to pm25 if invalid id)
  const data = useMemo(() => {
    return POLLUTANTS_DATA[pollutantId] || POLLUTANTS_DATA.pm25;
  }, [pollutantId]);

  const { theme } = data;

  // Custom CSS variables injection for dynamic theme styling per pollutant
  const themeStyles = {
    '--theme-primary': theme.primary,
    '--theme-secondary': theme.secondary,
    '--theme-accent-glow': theme.accentGlow,
    '--theme-card-bg': theme.cardBg,
    '--theme-card-border': theme.cardBorder,
    '--theme-hero-gradient': theme.heroGradient,
    '--theme-badge-color': theme.badgeColor,
  };

  // Diurnal Graph Coordinates (SVG Area Generator)
  const graphCoords = useMemo(() => {
    const points = data.diurnalTrend;
    const maxVal = Math.max(...points.map((p) => p.value)) * 1.15;
    const width = 640;
    const height = 180;
    const paddingX = 40;
    const paddingY = 25;

    const coords = points.map((p, idx) => {
      const x = paddingX + (idx / (points.length - 1)) * (width - 2 * paddingX);
      const y = height - paddingY - (p.value / maxVal) * (height - 2 * paddingY);
      return { x, y, ...p };
    });

    // Generate smooth SVG path
    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      pathD += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height - paddingY} L ${coords[0].x} ${height - paddingY} Z`;

    return { coords, pathD, areaD, width, height, maxVal, paddingY };
  }, [data.diurnalTrend]);

  return (
    <div className="pollutant-page-root" style={themeStyles}>
      {/* Dynamic Ambient Background Glow */}
      <div className="pollutant-ambient-glow" aria-hidden="true" />
      <div className="pollutant-grid-overlay" aria-hidden="true" />

      {/* ============================================================== */}
      {/* 1. STICKY TOP NAVIGATION BAR                                   */}
      {/* ============================================================== */}
      <header className="pollutant-nav-bar">
        <div className="pollutant-nav-left">
          <button
            onClick={onBack}
            className="pollutant-back-btn"
            title="Return to the Atmospheric Cargo Hauler deck"
          >
            <ArrowLeft size={15} />
            <span>Back to Cargo Hauler</span>
          </button>

          <nav className="pollutant-breadcrumb" aria-label="Breadcrumb">
            <span>VayuVitals</span>
            <span className="pollutant-breadcrumb-separator">/</span>
            <span>Cargo Hauler</span>
            <span className="pollutant-breadcrumb-separator">/</span>
            <strong style={{ color: theme.primary }}>{data.symbol}</strong>
          </nav>
        </div>

        {/* Quick Pollutant Selector Switcher */}
        <div className="pollutant-selector-tabs" aria-label="Pollutant Selector">
          {Object.values(POLLUTANTS_DATA).map((p) => {
            const isActive = p.id === data.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPollutant && onSelectPollutant(p.id)}
                className={`pollutant-tab-btn ${isActive ? 'active' : ''}`}
                style={{
                  '--theme-primary': p.theme.primary,
                  '--theme-card-bg': p.theme.cardBg,
                  '--theme-accent-glow': p.theme.accentGlow,
                }}
              >
                <span>{p.symbol}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. MAIN INTELLIGENCE CONTAINER                                 */}
      {/* ============================================================== */}
      <main className="pollutant-content-container">
        {/* HERO CARD */}
        <section className="pollutant-hero-card">
          <div className="pollutant-hero-badge">
            <Activity size={13} color={theme.primary} />
            <span>NAAQS Benchmark Profile · {data.classification}</span>
          </div>

          <div className="pollutant-hero-header-row">
            <div className="pollutant-hero-left">
              <div className="pollutant-hero-title-group">
                <span className="pollutant-symbol-badge" style={{ color: theme.primary }}>
                  {data.symbol}
                </span>
                <h1 className="pollutant-full-name">{data.name}</h1>
              </div>
              <p className="pollutant-tagline">{data.tagline}</p>
              <div className="pollutant-classification-pill">
                <Info size={13} color="#94a3b8" />
                <span>Aerodynamic Diameter: <strong>{data.sizeMicrons} µm</strong> ({data.sizeComparison})</span>
              </div>
            </div>

            {/* Threshold Progress Gauge Strip */}
            <div
              style={{
                flex: '0 1 340px',
                background: 'rgba(15, 23, 42, 0.75)',
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#94a3b8' }}>
                <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>Exposure Benchmark</span>
                <span style={{ color: theme.primary, fontWeight: 700 }}>24-Hour Limits</span>
              </div>

              {/* Delhi Smog vs Limit Bars */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>Delhi Winter Peak:</span>
                  <strong style={{ color: '#ef4444' }}>
                    <AnimatedCounter value={data.delhiPeakSmog} /> {data.unit}
                  </strong>
                </div>
                <div style={{ height: '7px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #f97316, #ef4444)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>India NAAQS Limit:</span>
                  <strong style={{ color: '#fbbf24' }}>
                    <AnimatedCounter value={data.naaqs24h} /> {data.unit}
                  </strong>
                </div>
                <div style={{ height: '7px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (data.naaqs24h / data.delhiPeakSmog) * 100)}%`, height: '100%', background: '#fbbf24' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>WHO Safe Guideline:</span>
                  <strong style={{ color: '#10b981' }}>
                    <AnimatedCounter value={data.whoGuideline} /> {data.unit}
                  </strong>
                </div>
                <div style={{ height: '7px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (data.whoGuideline / data.delhiPeakSmog) * 100)}%`, height: '100%', background: '#10b981' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Metric Highlight Row */}
          <div className="pollutant-metrics-grid">
            <div className="pollutant-metric-box">
              <div className="pollutant-metric-label">Indian Standard (24H)</div>
              <div className="pollutant-metric-value-row">
                <span className="pollutant-metric-val" style={{ color: '#fbbf24' }}>
                  <AnimatedCounter value={data.naaqs24h} />
                </span>
                <span className="pollutant-metric-unit">{data.unit}</span>
              </div>
              <div className="pollutant-metric-note">National Ambient Air Quality Standard</div>
            </div>

            <div className="pollutant-metric-box">
              <div className="pollutant-metric-label">WHO Safe Threshold</div>
              <div className="pollutant-metric-value-row">
                <span className="pollutant-metric-val" style={{ color: '#10b981' }}>
                  <AnimatedCounter value={data.whoGuideline} />
                </span>
                <span className="pollutant-metric-unit">{data.unit}</span>
              </div>
              <div className="pollutant-metric-note">Global Health Organization limit</div>
            </div>

            <div className="pollutant-metric-box">
              <div className="pollutant-metric-label">Delhi Winter Smog Peak</div>
              <div className="pollutant-metric-value-row">
                <span className="pollutant-metric-val" style={{ color: '#ef4444' }}>
                  <AnimatedCounter value={data.delhiPeakSmog} />
                </span>
                <span className="pollutant-metric-unit">{data.unit}</span>
              </div>
              <div className="pollutant-metric-note">Over {Math.round(data.delhiPeakSmog / data.whoGuideline)}x above WHO safe limit</div>
            </div>

            <div className="pollutant-metric-box">
              <div className="pollutant-metric-label">Particle Scale</div>
              <div className="pollutant-metric-value-row">
                <span className="pollutant-metric-val" style={{ color: theme.primary }}>{data.sizeMicrons}</span>
                <span className="pollutant-metric-unit">microns</span>
              </div>
              <div className="pollutant-metric-note">Aerodynamic cutoff diameter</div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 3. 3D PULMONARY HEALTH IMPACT & RESPIRATORY VISUALIZATION     */}
        {/* ============================================================== */}
        <section className="pollutant-lungs-section">
          {/* Interactive 3D Lungs Canvas */}
          <div className="pollutant-canvas-card">
            <div className="pollutant-canvas-header">
              <div className="pollutant-canvas-title">
                <HeartPulse size={15} color={theme.primary} />
                <span>Interactive 3D Pulmonary Tissue Simulation</span>
              </div>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: theme.primary,
                  background: theme.cardBg,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: `1px solid ${theme.cardBorder}`,
                }}
              >
                {data.lungsImpact.severityTag}
              </span>
            </div>

            <div className="pollutant-canvas-viewport">
              <LungsCanvas aqi={data.lungsImpact.lungAqi} interactive={true} />
              <div className="pollutant-canvas-hint">
                Click & drag to rotate 3D lungs · Scroll to zoom
              </div>
            </div>
          </div>

          {/* Biological Pathology & Damage Card */}
          <div className="pollutant-pathology-card">
            <div>
              <div className="pollutant-region-badge">
                <Layers size={13} />
                <span>Target Site: {data.lungsImpact.pulmonaryRegion}</span>
              </div>
              <h2 className="pollutant-pathology-title">
                <span>Pulmonary Pathology & Infiltration</span>
              </h2>
              <p className="pollutant-pathology-desc">
                {data.lungsImpact.pathology}
              </p>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', display: 'block', marginBottom: '10px' }}>
                Primary Clinical Symptoms:
              </span>
              <div className="pollutant-symptoms-list">
                {data.lungsImpact.symptoms.map((symptom, idx) => (
                  <div key={idx} className="pollutant-symptom-item">
                    <AlertTriangle size={14} color={theme.primary} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{symptom}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 3B. PHYSIOLOGICAL VULNERABILITY & DEMOGRAPHIC SENSITIVITY MATRIX */}
        {/* ============================================================== */}
        <section style={{ margin: '14px 0 28px' }}>
          <PhysiologicalImpactMatrix
            pollutantId={data.id}
            pollutantName={data.name}
            accentColor={theme.primary}
          />
        </section>

        {/* ============================================================== */}
        {/* 4. ANALYTICAL GRAPHS & 24-HOUR DIURNAL TELEMETRY              */}
        {/* ============================================================== */}
        <section className="pollutant-data-section">
          {/* Diurnal Trend Area Chart */}
          <div className="pollutant-graph-card">
            <div className="pollutant-graph-title-row">
              <div>
                <h3 className="pollutant-section-h3">
                  <Clock size={16} color={theme.primary} />
                  <span>24-Hour Diurnal Concentration Cycle (Delhi NCR)</span>
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Hourly fluctuations driven by nighttime thermal inversion and morning traffic peaks
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.68rem',
                  color: '#cbd5e1',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '3px 9px',
                  borderRadius: '6px',
                }}
              >
                Hourly Metric ({data.unit})
              </span>
            </div>

            {/* SVG Curve Canvas */}
            <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
              <svg
                viewBox={`0 0 ${graphCoords.width} ${graphCoords.height}`}
                style={{ width: '100%', height: 'auto', minWidth: '480px', display: 'block' }}
              >
                <defs>
                  <linearGradient id={`area-grad-${data.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={theme.primary} stopOpacity="0.4" />
                    <stop offset="100%" stopColor={theme.primary} stopOpacity="0.0" />
                  </linearGradient>
                  <filter id={`glow-${data.id}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Horizontal reference grid lines */}
                <line x1="40" y1={graphCoords.height - 25} x2={graphCoords.width - 40} y2={graphCoords.height - 25} stroke="rgba(255, 255, 255, 0.12)" strokeDasharray="3 3" />
                <line x1="40" y1={graphCoords.height / 2} x2={graphCoords.width - 40} y2={graphCoords.height / 2} stroke="rgba(255, 255, 255, 0.06)" strokeDasharray="3 3" />
                <line x1="40" y1="25" x2={graphCoords.width - 40} y2="25" stroke="rgba(255, 255, 255, 0.06)" strokeDasharray="3 3" />

                {/* Fill Area */}
                <path d={graphCoords.areaD} fill={`url(#area-grad-${data.id})`} />

                {/* Stroke Line */}
                <path
                  d={graphCoords.pathD}
                  fill="none"
                  stroke={theme.primary}
                  strokeWidth="3"
                  strokeLinecap="round"
                  filter={`url(#glow-${data.id})`}
                />

                {/* Data Points */}
                {graphCoords.coords.map((pt, i) => {
                  const isHovered = hoveredTimeIdx === i;
                  return (
                    <g
                      key={i}
                      onMouseEnter={() => setHoveredTimeIdx(i)}
                      onMouseLeave={() => setHoveredTimeIdx(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 7 : 4}
                        fill="#070a12"
                        stroke={theme.primary}
                        strokeWidth={isHovered ? 3 : 2}
                        style={{ transition: 'r 0.15s ease' }}
                      />
                      {/* X-axis time label */}
                      <text
                        x={pt.x}
                        y={graphCoords.height - 8}
                        textAnchor="middle"
                        fill={isHovered ? '#ffffff' : '#94a3b8'}
                        fontSize="9"
                        fontWeight={isHovered ? '700' : '500'}
                      >
                        {pt.time}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Selected Time Scrub Point Callout */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: '0.78rem',
              }}
            >
              {hoveredTimeIdx !== null ? (
                <>
                  <span style={{ color: '#94a3b8' }}>
                    Telemetry at <strong>{data.diurnalTrend[hoveredTimeIdx].time}</strong>: {data.diurnalTrend[hoveredTimeIdx].label}
                  </span>
                  <strong style={{ color: theme.primary, fontSize: '0.95rem' }}>
                    {data.diurnalTrend[hoveredTimeIdx].value} {data.unit}
                  </strong>
                </>
              ) : (
                <span style={{ color: '#94a3b8' }}>
                  Hover over any time point along the curve to inspect atmospheric concentration shifts.
                </span>
              )}
            </div>
          </div>

          {/* Emission Source Attribution Breakdown */}
          <div className="pollutant-graph-card">
            <div>
              <h3 className="pollutant-section-h3">
                <Flame size={16} color={theme.primary} />
                <span>Source Attribution</span>
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Primary metropolitan and regional emitter shares
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {data.sources.map((s, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <strong style={{ color: '#e2e8f0' }}>{s.name}</strong>
                    <span style={{ color: theme.primary, fontWeight: 700 }}>{s.pct}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.07)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${s.pct}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${theme.secondary}, ${theme.primary})`,
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                  <p style={{ margin: 0, fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.35 }}>
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 5. CURATED INVESTIGATIVE DOCUMENTARIES & FIELD STUDIES         */}
        {/* ============================================================== */}
        <section>
          <div style={{ marginBottom: '20px' }}>
            <h2 className="pollutant-section-h3" style={{ fontSize: '1.35rem', marginBottom: '4px' }}>
              <Video size={18} color={theme.primary} />
              <span>Curated Documentaries & Investigative Field Studies</span>
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
              Empirical case studies, satellite sensor data, and ground-level clinical footage for {data.name}
            </p>
          </div>

          <div className="pollutant-docs-grid">
            {data.documentaries.map((doc) => (
              <article key={doc.id} className="pollutant-doc-card">
                <div>
                  <div className="pollutant-doc-header">
                    <span style={{ color: doc.accent, fontWeight: 700 }}>{doc.producer}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={11} />
                      {doc.duration}
                    </span>
                  </div>

                  <h3 className="pollutant-doc-title">{doc.title}</h3>
                  <p className="pollutant-doc-summary">{doc.summary}</p>
                </div>

                <div>
                  <div className="pollutant-doc-takeaway" style={{ borderLeftColor: doc.accent }}>
                    <strong style={{ color: doc.accent, display: 'block', marginBottom: '2px', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                      Scientific Finding:
                    </strong>
                    {doc.keyTakeaway}
                  </div>

                  <button
                    onClick={() => setActiveDocModal(doc)}
                    style={{
                      width: '100%',
                      marginTop: '12px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                  >
                    <span>Read Field Investigation Brief</span>
                    <ExternalLink size={12} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ============================================================== */}
        {/* 6. ACTIONABLE COUNTERMEASURES & MEDICAL PROTOCOL               */}
        {/* ============================================================== */}
        <section>
          <div style={{ marginBottom: '18px' }}>
            <h2 className="pollutant-section-h3" style={{ fontSize: '1.25rem', marginBottom: '4px' }}>
              <ShieldCheck size={18} color="#10b981" />
              <span>Recommended Defense Countermeasures</span>
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
              Actionable engineering, respiratory, and indoor air purification standards to mitigate {data.symbol} exposure
            </p>
          </div>

          <div className="pollutant-countermeasures-grid">
            {data.countermeasures.map((c, i) => (
              <div key={i} className="pollutant-countermeasure-card">
                <div className="pollutant-countermeasure-title">
                  <ShieldCheck size={15} color={theme.primary} />
                  <span>{c.title}</span>
                </div>
                <p className="pollutant-countermeasure-rule">{c.rule}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ============================================================== */}
      {/* DOCUMENTARY BRIEFING MODAL                                     */}
      {/* ============================================================== */}
      {activeDocModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(7, 10, 18, 0.85)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setActiveDocModal(null)}
        >
          <div
            style={{
              maxWidth: '620px',
              width: '100%',
              background: '#0d1322',
              border: `1px solid ${activeDocModal.accent || theme.primary}`,
              borderRadius: '20px',
              padding: '28px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.72rem', color: activeDocModal.accent, fontWeight: 700, textTransform: 'uppercase' }}>
                Field Research Dossier · {activeDocModal.producer}
              </span>
              <button
                onClick={() => setActiveDocModal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', margin: '0 0 14px' }}>
              {activeDocModal.title}
            </h3>

            <p style={{ fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.65, margin: '0 0 18px' }}>
              {activeDocModal.summary}
            </p>

            <div
              style={{
                padding: '14px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.04)',
                borderLeft: `4px solid ${activeDocModal.accent || theme.primary}`,
                marginBottom: '20px',
              }}
            >
              <strong style={{ display: 'block', fontSize: '0.74rem', color: activeDocModal.accent, textTransform: 'uppercase', marginBottom: '4px' }}>
                Key Telemetry Insight
              </strong>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                {activeDocModal.keyTakeaway}
              </p>
            </div>

            <button
              onClick={() => setActiveDocModal(null)}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '9px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Close Dossier
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
 