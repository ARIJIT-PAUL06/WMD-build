import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { feature } from 'topojson-client';
import { geoNaturalEarth1, geoPath } from 'd3-geo';

/**
 * WmdCoverageBand - Global Coverage Parchment & Topic Index Band
 * Left 75% parchment with d3 world map + station markers + smokestacks photo.
 * Right 25% ink-800 with Topics anchor links and poetic crosshair mark.
 */
export default function WmdCoverageBand({ stations = [], dataSourceLabel = '', isBaseline = false }) {
  const [worldData, setWorldData] = useState(null);

  // Dynamic import of world atlas to keep initial bundle light (§8.7)
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
        console.warn('Failed to load world-atlas data:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const plateWidth = 700;
  const plateHeight = 395;

  const { pathData, projection } = useMemo(() => {
    if (!worldData) return { pathData: '', projection: null };
    const proj = geoNaturalEarth1().fitSize([plateWidth, plateHeight], worldData);
    const pathGen = geoPath(proj);
    return {
      pathData: pathGen(worldData) || '',
      projection: proj,
    };
  }, [worldData]);

  // Project the returned data points onto the map
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

  // Hotspot center for Delhi NCR
  const delhiHotspot = useMemo(() => {
    if (projectedStations.length === 0) {
      if (!projection) return null;
      const c = projection([77.2090, 28.6139]);
      return c ? { x: c[0], y: c[1] } : null;
    }
    const avgX = projectedStations.reduce((acc, s) => acc + s.x, 0) / projectedStations.length;
    const avgY = projectedStations.reduce((acc, s) => acc + s.y, 0) / projectedStations.length;
    return { x: avgX, y: avgY };
  }, [projectedStations, projection]);

  const scrollToSection = useCallback((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <section id="wmd-coverage-band" className="wmd-coverage-band">
      {/* Decorative Overlap Ring (centered on parchment/dark boundary) */}
      <div className="wmd-coverage__boundary-ring" aria-hidden="true" />

      {/* Left Zone: Parchment Background (75%) */}
      <div className="wmd-coverage__parchment-zone">
        <div className="wmd-coverage__header-row">
          <h2 className="wmd-coverage__title">GLOBAL COVERAGE</h2>
          <div className="wmd-coverage__hairline" />
        </div>

        <div className="wmd-coverage__stage">
          {/* Map Plate */}
          <div className="wmd-coverage__map-plate">
            <svg
              className="wmd-coverage__map-svg"
              viewBox={`0 0 ${plateWidth} ${plateHeight}`}
              preserveAspectRatio="xMidYMid meet"
              aria-label="Global Monitoring Coverage World Map"
            >
              <defs>
                {/* Dot Stipple Pattern for Land Surface */}
                <pattern
                  id="wmdMapStipple"
                  width="3"
                  height="3"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="1.5" cy="1.5" r="0.6" fill="var(--sage-500)" opacity="0.85" />
                </pattern>
                {/* Subtle Station Marker Glow Filter */}
                <filter id="stationGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background Plate Fill */}
              <rect width={plateWidth} height={plateHeight} fill="var(--ink-700)" />

              {/* World Continents Filled with Stipple Texture */}
              {pathData && (
                <path
                  d={pathData}
                  fill="url(#wmdMapStipple)"
                  stroke="var(--sage-500)"
                  strokeWidth="0.5"
                  opacity="0.75"
                />
              )}

              {/* Delhi Concentric Target Hotspot Rings */}
              {delhiHotspot && (
                <g className="wmd-coverage__hotspot-rings" transform={`translate(${delhiHotspot.x}, ${delhiHotspot.y})`}>
                  <circle r="23" fill="none" stroke="var(--bone-200)" strokeWidth="0.8" opacity="0.7" />
                  <circle r="14" fill="none" stroke="var(--bone-200)" strokeWidth="0.8" opacity="0.9" />
                  <circle r="2.5" fill="var(--bone-100)" />
                </g>
              )}

              {/* Data points returned by /api/delhi-heatmap */}
              {projectedStations.map((st) => (
                <g key={st.id || `${st.lat}-${st.lon}`} className="wmd-coverage__station-dot">
                  <circle
                    cx={st.x}
                    cy={st.y}
                    r="2.2"
                    fill="var(--bone-100)"
                    filter="url(#stationGlow)"
                  />
                </g>
              ))}
            </svg>

            {/* Empirical Ground Caption */}
            <div className="wmd-coverage__caption">
              DATA COVERAGE · {stations.length} POINTS · {(dataSourceLabel || 'Unknown source').toUpperCase()}
              {isBaseline ? ' · NOT LIVE' : ''} · DELHI NCR
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
          >
            <span>AIR POLLUTION</span>
          </button>
          <button
            type="button"
            className="wmd-coverage__topic-row"
            onClick={() => scrollToSection('section-07-why-it-matters')}
          >
            <span>HEALTH IMPACTS</span>
          </button>
          <button
            type="button"
            className="wmd-coverage__topic-row"
            onClick={() => scrollToSection('documentary-data-section')}
          >
            <span>GLOBAL DATA</span>
          </button>
          <button
            type="button"
            className="wmd-coverage__topic-row"
            onClick={() => {
              const standards = document.querySelector('.documentary-standards-block') || document.getElementById('documentary-data-section');
              if (standards) standards.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <span>POLICY RESPONSES</span>
          </button>
          <button
            type="button"
            className="wmd-coverage__topic-row"
            onClick={() => scrollToSection('wmd-footer')}
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
