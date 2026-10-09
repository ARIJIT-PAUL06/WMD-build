/**
 * DocumentaryLocationMap.jsx
 * VayuVitals - Interactive Geospatial Monitoring Location Card
 *
 * Implements a high-performance, dark-themed Mapbox GL JS map component
 * embedded within the documentary hero spatial column across all 7 pollutant pages:
 * - Real vector map tiles rendering roads, neighbourhoods, and locality labels
 * - Centered on target monitoring station (defaults to [77.0510, 28.7762], North West Delhi)
 * - Restrained, geographically anchored pulsing marker pinned to coordinates
 * - Single persistent Mapbox instance shared across all 7 routes via documentaryMapService
 * - Non-intrusive navigation controls with scrollZoom disabled to prevent hijacking page scroll
 * - Strict lifecycle handling with DOM detach and re-attach preserving WebGL context
 * - Zero duplicated Mapbox instances or redundant tile re-fetches
 * - Accessible region label and graceful token error handling
 */

import React, { useRef, useEffect, useState } from 'react';
import { documentaryMapService } from '../../services/documentaryMapService.js';

export default function DocumentaryLocationMap({
  longitude = 77.0510,
  latitude = 28.7762,
  locationName = 'North West Delhi',
  stationName = 'Bawana Industrial Area',
  accentColor = '#f97316',
}) {
  const containerRef = useRef(null);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Mount or re-parent the shared Mapbox instance
    const { map, error } = documentaryMapService.mountMap(container, {
      longitude,
      latitude,
      locationName,
      accentColor,
    });

    if (error) {
      setInitError(error);
    } else {
      setInitError(null);
    }

    // On unmount (e.g. route transition or component unmount):
    // Detach host element cleanly without destroying WebGL context or Mapbox instance
    return () => {
      documentaryMapService.detachFromContainer(container);
    };
  }, []);

  // Handle dynamic coordinate updates smoothly across prop changes
  useEffect(() => {
    documentaryMapService.updateLocation(longitude, latitude, locationName, accentColor);
  }, [longitude, latitude, locationName, accentColor]);

  // Fallback UI when Mapbox token is missing or WebGL fails
  if (initError) {
    return (
      <div
        className="doc-spatial-map-graphic doc-spatial-map-error-state"
        role="alert"
        aria-label={`Location map unavailable for ${locationName}`}
      >
        <div className="doc-spatial-error-content">
          <span className="doc-spatial-error-badge">MAPBOX OFFLINE</span>
          <p className="doc-spatial-error-text">{initError}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="doc-spatial-map-graphic doc-spatial-mapbox-wrapper"
      role="region"
      aria-label={`Geographical monitoring location map for ${locationName}`}
    >
      <div
        ref={containerRef}
        className="doc-spatial-mapbox-canvas"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
