import React from 'react';

/**
 * StatsGrain - film grain overlay owned by the Stats page.
 * Deliberately self-contained so pages stay decoupled.
 */
export default function StatsGrain() {
  return (
    <svg className="stats-grain" aria-hidden="true" focusable="false">
      <filter id="statsGrainFilter">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#statsGrainFilter)" />
    </svg>
  );
}
