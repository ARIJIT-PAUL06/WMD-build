import React from 'react';

/**
 * WmdGrain - SVG Film Grain Overlay
 * Fixed texture layer providing authentic vintage editorial paper/film grain.
 */
export default function WmdGrain() {
  return (
    <svg className="wmd-grain" aria-hidden="true">
      <filter id="wmdGrain">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.85"
          numOctaves="4"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#wmdGrain)" />
    </svg>
  );
}
