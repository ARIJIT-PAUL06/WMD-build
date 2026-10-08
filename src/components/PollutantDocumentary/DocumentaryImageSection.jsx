/**
 * DocumentaryImageSection.jsx
 * VayuVitals - Cinematic Environmental Photographic Showcase
 *
 * Implements Section 8 of the new unified UI system:
 * - Pollutant-specific environmental imagery (authentic Indian documentary photographs)
 * - PM2.5: Delhi diesel truck / bus in morning smog
 * - PM10: Construction / dusty road tipper truck
 * - NO2: Dense Delhi traffic
 * - SO2: Industrial manufacturing / thermal belt
 * - CO: Congested underpass traffic
 * - O3: Sunlit tropospheric highway
 * - NH3: Agrarian tractor & fertilizer fields
 * - Realistic, documentary, cinematic, environmental (NO CGI, NO Western stock aesthetic)
 */

import React from 'react';
import { Camera, MapPin, Compass } from 'lucide-react';

export default function DocumentaryImageSection({
  pollutantData,
  cinematicTheme,
  environmentData,
}) {
  const env = environmentData || {};
  const imageSrc = env.vehicleImage || cinematicTheme.heroImage;

  return (
    <section className="documentary-image-section" id="documentary-cinematic-exhibit">
      <div className="documentary-image-container">
        {/* Top Photographic Metadata Tag */}
        <div className="documentary-image-kicker-row">
          <div className="doc-img-badge">
            <Camera size={13} />
            <span>FIELD DOCUMENTARY EVIDENCE // {pollutantData.symbol}</span>
          </div>

          <div className="doc-img-location">
            <Compass size={13} />
            <span>{env.environmentContext || 'Delhi NCR Airshed Corridor'}</span>
          </div>
        </div>

        {/* Cinematic Photographic Stage */}
        <div className="documentary-image-frame">
          <img
            src={imageSrc}
            alt={`${pollutantData.name} emission and atmospheric context in ${env.environmentContext || 'Delhi NCR'}`}
            className="documentary-image-element"
            loading="lazy"
          />

          {/* Environmental Vignette & Lighting Scrim */}
          <div className="documentary-image-scrim" />

          {/* Overlay Editorial Caption */}
          <div className="documentary-image-caption-overlay">
            <div className="doc-caption-kicker">
              {env.sourceContext || 'ATMOSPHERIC EMISSION VECTOR'}
            </div>
            <h3 className="doc-caption-title">
              {env.visualCaption || `${pollutantData.name} in the Urban Airshed`}
            </h3>
            <p className="doc-caption-detail single-line">
              Real-world documentation of primary emission vectors shaping ground-level human inhalation exposure across Delhi NCR.
            </p>
            <div className="doc-caption-tags">
              <span className="doc-c-tag">BOUNDARY LAYER: SURFACE</span>
              <span className="doc-c-tag">AIRSHED: DELHI NCR</span>
              <span className="doc-c-tag">TELEMETRY: VERIFIED</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
