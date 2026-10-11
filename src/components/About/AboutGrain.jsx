import React from 'react';

/**
 * AboutGrain - film grain overlay owned by the About page.
 * Deliberately not shared with WmdGrain/StatsGrain so pages stay decoupled.
 */
export default function AboutGrain() {
  return (
    <svg className="about-grain" aria-hidden="true" focusable="false">
      <filter id="aboutGrainFilter">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#aboutGrainFilter)" />
    </svg>
  );
}
