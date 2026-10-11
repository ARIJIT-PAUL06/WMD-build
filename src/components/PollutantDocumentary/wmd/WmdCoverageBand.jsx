import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { feature } from 'topojson-client';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { ZoomIn, ZoomOut, RotateCcw, MapPin } from 'lucide-react';
import indiaBoundaryGeoJson from '../../../data/indiaBoundary.json';

/**
 * WmdCoverageBand - Global Coverage Parchment & Topic Index Band
 * Features:
 * - Interactive Cached Black & White Map (Zero Mapbox API calls to prevent quota burn)
 * - Wheel zoom, drag-to-pan, Zoom In/Out controls, View presets (Global / India / Delhi NCR)
 * - Delhi NCR target crosshairs and hover station telemetry tooltips
 * - 100% Monochromatic Ink & Bone palette complying with page theme
 * - Perfected TOPICS navigation with exact anchor offsets
 */
export default function WmdCoverageBand({ stations = [], dataSourceLabel = '', isBaseline = false }) {
  const [worldData, setWorldData] = useState(null);
  const [hoveredStation, setHoveredStation] = useState(null);
  const [showWheelHint, setShowWheelHint] = useState(false);
  const wheelHintTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (wheelHintTimer.current) clearTimeout(wheelHintTimer.current);
    };
  }, []);

  // Zoom & Pan transformation state
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const svgRef = useRef(null);

  // Load cached local world atlas (zero network calls, packaged locally)
  useEffect(() => {
    let isMounted = true;
    import('world-atlas/countries-110m.json')
      .then((atlas) => {
        if (isMounted) {
          const raw = atlas.default || atlas;
          if (raw && raw.objects && raw.objects.land) {
            const land = feature(raw, raw.objects.land);
            setWorldData(land);
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load local world-atlas data:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const plateWidth = 700;
  const plateHeight = 395;

  const { pathData, indiaPathData, projection } = useMemo(() => {
    if (!worldData) return { pathData: '', indiaPathData: '', projection: null };
    const proj = geoNaturalEarth1().fitSize([plateWidth, plateHeight], worldData);
    const pathGen = geoPath(proj);
    const worldPath = pathGen(worldData) || '';
    const indiaPath = indiaBoundaryGeoJson ? (pathGen(indiaBoundaryGeoJson) || '') : '';
    return {
      pathData: worldPath,
      indiaPathData: indiaPath,
      projection: proj,
    };
  }, [worldData]);

  // Project stations onto base coordinates
  const projectedStations = useMemo(() => {
    if (!projection || !stations || stations.length === 0) return [];
    return stations.map((st) => {
      const coords = projection([st.lon, st.lat]);
      return {
        ...st,
        x: coords ? coords[0] : null,
        y: coords ? coords[1] : null,
      };
    }).filter((st) => st.x !== null && st.y !== null);
  }, [projection, stations]);

  // Deduplicated stations for zoom levels to avoid overlapping dot clusters
  const visibleStationDots = useMemo(() => {
    if (transform.k < 2.5 || projectedStations.length === 0) return [];
    const minPixelDist = 2.5;
    const kept = [];
    for (const st of projectedStations) {
      const isNearby = kept.some((k) => Math.hypot(k.x - st.x, k.y - st.y) < minPixelDist);
      if (!isNearby) {
        kept.push(st);
      }
    }
    return kept;
  }, [projectedStations, transform.k]);

  // Hotspot center for Delhi NCR
  const delhiHotspot = useMemo(() => {
    if (!projection) return { x: 500, y: 190 };
    const c = projection([77.2090, 28.6139]);
    return c ? { x: c[0], y: c[1] } : { x: 500, y: 190 };
  }, [projection]);

  // Zoom / Pan handlers
  const handleZoomIn = useCallback(() => {
    setTransform((prev) => {
      const newK = Math.min(prev.k * 1.45, 8.0);
      // Zoom centered on canvas center
      const cx = plateWidth / 2;
      const cy = plateHeight / 2;
      const newX = cx - (cx - prev.x) * (newK / prev.k);
      const newY = cy - (cy - prev.y) * (newK / prev.k);
      return { k: newK, x: newX, y: newY };
    });
  }, [plateWidth, plateHeight]);

  const handleZoomOut = useCallback(() => {
    setTransform((prev) => {
      const newK = Math.max(prev.k / 1.45, 1.0);
      if (newK <= 1.0) {
        return { k: 1.0, x: 0, y: 0 };
      }
      const cx = plateWidth / 2;
      const cy = plateHeight / 2;
      const newX = cx - (cx - prev.x) * (newK / prev.k);
      const newY = cy - (cy - prev.y) * (newK / prev.k);
      return { k: newK, x: newX, y: newY };
    });
  }, [plateWidth, plateHeight]);

  const handleReset = useCallback(() => {
    setTransform({ k: 1, x: 0, y: 0 });
  }, []);

  const handleFocusDelhi = useCallback(() => {
    if (!delhiHotspot) return;
    const k = 4.8;
    const x = plateWidth / 2 - delhiHotspot.x * k;
    const y = plateHeight / 2 - delhiHotspot.y * k;
    setTransform({ k, x, y });
  }, [delhiHotspot, plateWidth, plateHeight]);

  const handleFocusIndia = useCallback(() => {
    if (!delhiHotspot) return;
    const k = 2.4;
    const x = plateWidth / 2 - delhiHotspot.x * k;
    const y = plateHeight / 2 - delhiHotspot.y * k;
    setTransform({ k, x, y });
  }, [delhiHotspot, plateWidth, plateHeight]);

  // Pointer drag events for panning
  const handlePointerDown = (e) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    }));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Wheel handling: allow natural document page scroll by default;
  // only zoom the map when Ctrl or Cmd key is held down (standard cooperative gesture behavior).
  const handleWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey) {
      // Natural document scroll: do NOT call preventDefault!
      return;
    }

    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setTransform((prev) => {
      const newK = Math.max(1.0, Math.min(prev.k * zoomFactor, 8.0));
      if (newK === 1.0) return { k: 1.0, x: 0, y: 0 };
      const newX = mouseX - (mouseX - prev.x) * (newK / prev.k);
      const newY = mouseY - (mouseY - prev.y) * (newK / prev.k);
      return { k: newK, x: newX, y: newY };
    });
  };

  // Perfected Topics Navigation: calculates exact document offset taking into account
  // the sticky dossier bar height (64px) and extra breathing margin
  const scrollToSection = useCallback((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const navBar = document.getElementById('documentary-case-dossier-bar');
    const navHeight = navBar ? navBar.offsetHeight : 60;
    const rect = el.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const targetY = scrollTop + rect.top - navHeight - 16;
    window.scrollTo({
      top: Math.max(0, targetY),
      behavior: 'smooth',
    });
  }, []);

  return (
    <section id="wmd-coverage-band" className="wmd-coverage-band">
      {/* Scroll anchor for #map */}
      <div id="map" className="wmd-scroll-anchor" aria-hidden="true" style={{ position: 'relative', top: '-10px' }} />
      {/* Decorative Overlap Ring (centered on parchment/dark boundary) */}
      <div className="wmd-coverage__boundary-ring" aria-hidden="true" />

      {/* Left Zone: Parchment Background (75%) */}
      <div className="wmd-coverage__parchment-zone">
        <div className="wmd-coverage__header-row">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
            <h2 className="wmd-coverage__title">GLOBAL COVERAGE</h2>
            <span
              style={{
                fontFamily: 'var(--doc-font-mono, monospace)',
                fontSize: '0.66rem',
                color: 'var(--sage-500)',
                letterSpacing: '0.1em',
              }}
            >
              {transform.k > 1.0 ? `[ZOOM ${(transform.k).toFixed(1)}X · PAN ACTIVE]` : '[INTERACTIVE CACHED MAP]'}
            </span>
          </div>
          <div className="wmd-coverage__hairline" />
        </div>

        <div className="wmd-coverage__stage">
          {/* Map Plate */}
          <div
            className="wmd-coverage__map-plate"
            style={{
              position: 'relative',
              overflow: 'hidden',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              touchAction: 'pan-y',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onWheel={handleWheel}
          >
            {/* Monochromatic Interactive Mapbox-Free Map SVG */}
            <svg
              ref={svgRef}
              className="wmd-coverage__map-svg"
              viewBox={`0 0 ${plateWidth} ${plateHeight}`}
              preserveAspectRatio="xMidYMid meet"
              aria-label="Interactive Global & Delhi Monitoring Coverage Map"
            >
              {/* Background Plate Fill - Monochromatic Ink */}
              <rect width={plateWidth} height={plateHeight} fill="var(--ink-800)" />

              {/* Reticle Grid Lines for Nautical / Cartographic Black & White Aesthetic */}
              <g opacity="0.12" stroke="var(--bone-200)" strokeWidth="0.5">
                <line x1={plateWidth / 4} y1={0} x2={plateWidth / 4} y2={plateHeight} strokeDasharray="3 4" />
                <line x1={plateWidth / 2} y1={0} x2={plateWidth / 2} y2={plateHeight} strokeDasharray="3 4" />
                <line x1={(3 * plateWidth) / 4} y1={0} x2={(3 * plateWidth) / 4} y2={plateHeight} strokeDasharray="3 4" />
                <line x1={0} y1={plateHeight / 3} x2={plateWidth} y2={plateHeight / 3} strokeDasharray="3 4" />
                <line x1={0} y1={(2 * plateHeight) / 3} x2={plateWidth} y2={(2 * plateHeight) / 3} strokeDasharray="3 4" />
              </g>

              {/* Transformable Geometry Container (Zoom & Pan) */}
              <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
                {/* World Continents Filled with Clean Monochromatic Dark Surface */}
                {pathData && (
                  <path
                    d={pathData}
                    fill="rgba(42, 45, 36, 0.75)"
                    stroke="var(--sage-500)"
                    strokeWidth={0.6 / transform.k}
                    opacity="0.85"
                  />
                )}

                {/* India Detailed National Boundary */}
                {indiaPathData && (
                  <path
                    d={indiaPathData}
                    fill="rgba(216, 207, 185, 0.08)"
                    stroke="var(--bone-200)"
                    strokeWidth={0.9 / transform.k}
                    opacity="0.9"
                  />
                )}

                {/* Delhi NCR Precision Cartographic Reticle & Technical Callout */}
                {delhiHotspot && (
                  <g
                    className="wmd-coverage__delhi-reticle"
                    transform={`translate(${delhiHotspot.x}, ${delhiHotspot.y})`}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() =>
                      setHoveredStation({
                        name: 'Delhi NCR CAAQMS Network',
                        lat: 28.6139,
                        lon: 77.209,
                        source: `${stations.length || 51} Continuous Monitoring Stations · DPCC / CPCB`,
                      })
                    }
                    onMouseLeave={() => setHoveredStation(null)}
                  >
                    {/* Outer Range Ring */}
                    <circle
                      r={15 / Math.sqrt(transform.k)}
                      fill="none"
                      stroke="var(--pollutant-color, var(--bone-200))"
                      strokeWidth={0.7 / transform.k}
                      strokeDasharray="2 2"
                      opacity="0.8"
                    />
                    {/* Inner Aperture Ring (Hollow to avoid solid blob) */}
                    <circle
                      r={3.2 / Math.sqrt(transform.k)}
                      fill="var(--ink-800)"
                      stroke="var(--pollutant-color, var(--bone-200))"
                      strokeWidth={0.8 / transform.k}
                    />
                    {/* Micro Focal Point */}
                    <circle
                      r={1.2 / Math.sqrt(transform.k)}
                      fill="var(--pollutant-color, var(--bone-100))"
                    />
                    {/* 4-Axis Precision Crosshair Ticks */}
                    <line
                      x1={-20 / Math.sqrt(transform.k)}
                      y1={0}
                      x2={-4 / Math.sqrt(transform.k)}
                      y2={0}
                      stroke="var(--pollutant-color, var(--bone-200))"
                      strokeWidth={0.6 / transform.k}
                      opacity="0.75"
                    />
                    <line
                      x1={4 / Math.sqrt(transform.k)}
                      y1={0}
                      x2={20 / Math.sqrt(transform.k)}
                      y2={0}
                      stroke="var(--pollutant-color, var(--bone-200))"
                      strokeWidth={0.6 / transform.k}
                      opacity="0.75"
                    />
                    <line
                      x1={0}
                      y1={-20 / Math.sqrt(transform.k)}
                      x2={0}
                      y2={-4 / Math.sqrt(transform.k)}
                      stroke="var(--pollutant-color, var(--bone-200))"
                      strokeWidth={0.6 / transform.k}
                      opacity="0.75"
                    />
                    <line
                      x1={0}
                      y1={4 / Math.sqrt(transform.k)}
                      x2={0}
                      y2={20 / Math.sqrt(transform.k)}
                      stroke="var(--pollutant-color, var(--bone-200))"
                      strokeWidth={0.6 / transform.k}
                      opacity="0.75"
                    />

                    {/* Technical Leader Line & Annotation */}
                    <polyline
                      points={`
                        ${6 / Math.sqrt(transform.k)},${-6 / Math.sqrt(transform.k)} 
                        ${18 / Math.sqrt(transform.k)},${-18 / Math.sqrt(transform.k)} 
                        ${72 / Math.sqrt(transform.k)},${-18 / Math.sqrt(transform.k)}
                      `}
                      fill="none"
                      stroke="var(--pollutant-color, var(--bone-200))"
                      strokeWidth={0.6 / transform.k}
                      opacity="0.8"
                    />
                    <text
                      x={20 / Math.sqrt(transform.k)}
                      y={-21 / Math.sqrt(transform.k)}
                      fill="var(--pollutant-color, var(--bone-100))"
                      fontSize={Math.max(5.5, 8.5 / Math.sqrt(transform.k))}
                      fontWeight="800"
                      fontFamily="var(--doc-font-mono, monospace)"
                      letterSpacing="0.1em"
                    >
                      DELHI NCR
                    </text>
                    <text
                      x={20 / Math.sqrt(transform.k)}
                      y={-11 / Math.sqrt(transform.k)}
                      fill="var(--sage-400)"
                      fontSize={Math.max(4.5, 6.8 / Math.sqrt(transform.k))}
                      fontFamily="var(--doc-font-mono, monospace)"
                      letterSpacing="0.08em"
                    >
                      {stations.length || 51} MONITORS
                    </text>
                  </g>
                )}

                {/* Spatial Station Pins (rendered cleanly without overlapping blur) */}
                {visibleStationDots.map((st) => (
                  <g
                    key={st.id || `${st.lat}-${st.lon}`}
                    className="wmd-coverage__station-dot"
                    onMouseEnter={() => setHoveredStation(st)}
                    onMouseLeave={() => setHoveredStation(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={st.x}
                      cy={st.y}
                      r={1.5 / Math.sqrt(transform.k)}
                      fill="var(--pollutant-color, var(--bone-100))"
                      stroke="var(--ink-900)"
                      strokeWidth={0.4 / transform.k}
                      opacity="0.9"
                    />
                  </g>
                ))}
              </g>
            </svg>



            {/* In-Map Zoom & View HUD Controls */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                zIndex: 20,
              }}
            >
              <button
                type="button"
                onClick={handleZoomIn}
                title="Zoom In"
                aria-label="Zoom In"
                style={{
                  background: 'rgba(20, 22, 17, 0.92)',
                  border: '1px solid var(--pollutant-btn-border, rgba(216, 207, 185, 0.4))',
                  color: 'var(--bone-100)',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <ZoomIn size={14} />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                title="Zoom Out"
                aria-label="Zoom Out"
                style={{
                  background: 'rgba(20, 22, 17, 0.92)',
                  border: '1px solid var(--pollutant-btn-border, rgba(216, 207, 185, 0.4))',
                  color: 'var(--bone-100)',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <ZoomOut size={14} />
              </button>
              <button
                type="button"
                onClick={handleReset}
                title="Reset View"
                aria-label="Reset View"
                style={{
                  background: 'rgba(20, 22, 17, 0.92)',
                  border: '1px solid var(--pollutant-btn-border, rgba(216, 207, 185, 0.4))',
                  color: 'var(--bone-100)',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <RotateCcw size={12} />
              </button>
            </div>

            {/* Preset View Switcher Pills */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                display: 'flex',
                gap: '4px',
                zIndex: 20,
              }}
            >
              <button
                type="button"
                onClick={handleReset}
                style={{
                  background: transform.k === 1 ? 'var(--pollutant-color)' : 'rgba(20, 22, 17, 0.88)',
                  color: transform.k === 1 ? '#0d0f0c' : 'var(--bone-200)',
                  border: transform.k === 1 ? '1px solid var(--pollutant-color)' : '1px solid var(--pollutant-btn-border, rgba(216, 207, 185, 0.4))',
                  boxShadow: transform.k === 1 ? 'var(--pollutant-glow)' : 'none',
                  fontSize: '0.62rem',
                  fontFamily: 'var(--doc-font-mono, monospace)',
                  letterSpacing: '0.08em',
                  padding: '3px 8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  transition: 'all 0.2s ease',
                }}
              >
                GLOBAL
              </button>
              <button
                type="button"
                onClick={handleFocusIndia}
                style={{
                  background: Math.abs(transform.k - 2.4) < 0.2 ? 'var(--pollutant-color)' : 'rgba(20, 22, 17, 0.88)',
                  color: Math.abs(transform.k - 2.4) < 0.2 ? '#0d0f0c' : 'var(--bone-200)',
                  border: Math.abs(transform.k - 2.4) < 0.2 ? '1px solid var(--pollutant-color)' : '1px solid var(--pollutant-btn-border, rgba(216, 207, 185, 0.4))',
                  boxShadow: Math.abs(transform.k - 2.4) < 0.2 ? 'var(--pollutant-glow)' : 'none',
                  fontSize: '0.62rem',
                  fontFamily: 'var(--doc-font-mono, monospace)',
                  letterSpacing: '0.08em',
                  padding: '3px 8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  transition: 'all 0.2s ease',
                }}
              >
                INDIA
              </button>
              <button
                type="button"
                onClick={handleFocusDelhi}
                style={{
                  background: Math.abs(transform.k - 5.2) < 0.2 ? 'var(--pollutant-color)' : 'rgba(20, 22, 17, 0.88)',
                  color: Math.abs(transform.k - 5.2) < 0.2 ? '#0d0f0c' : 'var(--bone-200)',
                  border: Math.abs(transform.k - 5.2) < 0.2 ? '1px solid var(--pollutant-color)' : '1px solid var(--pollutant-btn-border, rgba(216, 207, 185, 0.4))',
                  boxShadow: Math.abs(transform.k - 5.2) < 0.2 ? 'var(--pollutant-glow)' : 'none',
                  fontSize: '0.62rem',
                  fontFamily: 'var(--doc-font-mono, monospace)',
                  letterSpacing: '0.08em',
                  padding: '3px 8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  transition: 'all 0.2s ease',
                }}
              >
                DELHI NCR
              </button>
            </div>

            {/* Hovered Station Monochromatic HUD Card */}
            {hoveredStation && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '34px',
                  left: '12px',
                  background: 'rgba(14, 16, 12, 0.95)',
                  border: '1px solid var(--pollutant-color, var(--bone-200))',
                  boxShadow: 'var(--pollutant-glow, none)',
                  padding: '6px 12px',
                  color: 'var(--bone-100)',
                  fontFamily: 'var(--doc-font-mono, monospace)',
                  fontSize: '0.68rem',
                  zIndex: 25,
                  maxWidth: '280px',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ fontWeight: 800, color: 'var(--bone-100)' }}>{hoveredStation.name}</div>
                <div style={{ color: 'var(--sage-400)', fontSize: '0.62rem' }}>
                  {hoveredStation.lat?.toFixed(4)}° N, {hoveredStation.lon?.toFixed(4)}° E · {hoveredStation.source || 'DPCC'}
                </div>
              </div>
            )}

            {/* Empirical Ground Caption */}
            <div className="wmd-coverage__caption">
              DATA COVERAGE · {stations.length} POINTS · {(dataSourceLabel || 'Delhi Airshed Baseline').toUpperCase()}
              {isBaseline ? ' · BASELINE CACHE' : ''} · DELHI NCR
            </div>
          </div>

          {/* Smokestacks Photo with Soft Feathered Mask */}
          <div className="wmd-coverage__smokestacks-frame" aria-hidden="true">
            <div
              className="wmd-coverage__smokestacks-photo wmd-photo"
              style={{
                backgroundImage: 'url(/assets/documentary/wmd/wmd_smokestacks.webp)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Right Zone: Topics Index in Ink-800 (25%) */}
      <div className="wmd-coverage__topics-zone">
        <div className="wmd-coverage__topics-header">
          <h3 className="wmd-coverage__topics-title">TOPICS</h3>
          <div className="wmd-coverage__topics-hairline" />
        </div>

        <nav className="wmd-coverage__topics-list" aria-label="Editorial Topics Anchor Index">
          <button
            type="button"
            className="wmd-coverage__topic-row"
            onClick={() => scrollToSection('section-01-what-are-they')}
            title="Jump to Chemical Composition & Air Pollution Profile"
          >
            <span>AIR POLLUTION</span>
          </button>
          <button
            type="button"
            className="wmd-coverage__topic-row"
            onClick={() => scrollToSection('section-07-why-it-matters')}
            title="Jump to Health Impacts & Campus Vulnerability Matrix"
          >
            <span>HEALTH IMPACTS</span>
          </button>
          <button
            type="button"
            className="wmd-coverage__topic-row"
            onClick={() => scrollToSection('wmd-impact-row')}
            title="Jump to Global Telemetry, Key Statistics & Exposure Surface"
          >
            <span>GLOBAL DATA</span>
          </button>
          <button
            type="button"
            className="wmd-coverage__topic-row"
            onClick={() => scrollToSection('section-where-it-comes-from')}
            title="Jump to Policy Responses & Statutory CPCB Standards"
          >
            <span>POLICY RESPONSES</span>
          </button>
          <button
            type="button"
            className="wmd-coverage__topic-row"
            onClick={() => scrollToSection('section-08-the-takeaway')}
            title="Jump to 14-Day Evidence Window & Environmental Solutions"
          >
            <span>SOLUTIONS</span>
          </button>
        </nav>

        {/* Poetic Telemetry Crosshair Mark */}
        <div className="wmd-coverage__credo-mark">
          <div className="wmd-coverage__crosshair" aria-hidden="true">
            <div className="wmd-coverage__crosshair-vert" />
            <div className="wmd-coverage__crosshair-horiz" />
          </div>
          <div className="wmd-coverage__credo-text">
            CLEANER AIR<br />
            BRIGHTER<br />
            TOMORROWS.
          </div>
        </div>
      </div>
    </section>
  );
}
