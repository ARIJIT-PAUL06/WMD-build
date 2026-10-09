import React from 'react';

/**
 * Subtle Atmospheric Spores / Micro-Particle Radiator
 * Gently radiates soft ambient spores matching the exact AQI color that dissolve into surroundings.
 */
export default function AqiSporeAura({ color = '#10b981' }) {
  const sporeTrajectories = [
    { tx: 0, ty: -32, size: 3.2, delay: 0, dur: 3.4 },
    { tx: 22, ty: -24, size: 2.6, delay: 0.8, dur: 3.8 },
    { tx: 34, ty: -6, size: 3.0, delay: 1.6, dur: 3.2 },
    { tx: 28, ty: 18, size: 2.4, delay: 0.4, dur: 4.0 },
    { tx: 12, ty: 32, size: 2.8, delay: 2.1, dur: 3.6 },
    { tx: -10, ty: 34, size: 2.6, delay: 1.1, dur: 3.3 },
    { tx: -28, ty: 20, size: 3.0, delay: 2.5, dur: 3.7 },
    { tx: -34, ty: -4, size: 2.4, delay: 0.6, dur: 3.5 },
    { tx: -20, ty: -26, size: 3.2, delay: 1.8, dur: 4.1 },
    { tx: 14, ty: -34, size: 2.4, delay: 2.9, dur: 3.9 },
    { tx: 30, ty: 6, size: 2.8, delay: 1.4, dur: 3.4 },
    { tx: -16, ty: 18, size: 2.5, delay: 2.2, dur: 3.6 },
  ];

  return (
    <div className="aqi-spore-container" aria-hidden="true">
      {sporeTrajectories.map((s, idx) => (
        <span
          key={idx}
          className="aqi-spore"
          style={{
            '--spore-color': color,
            '--spore-size': `${s.size}px`,
            '--spore-delay': `${s.delay}s`,
            '--spore-duration': `${s.dur}s`,
            '--tx': `${s.tx}px`,
            '--ty': `${s.ty}px`,
          }}
        />
      ))}
    </div>
  );
}
