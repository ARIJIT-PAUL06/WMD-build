import React from 'react';
import AnimatedCounter from './AnimatedCounter';

/**
 * RadialProgressMeter
 * High-precision SVG circular gauge for evidence completion,
 * standard exceedance ratios, or statutory threshold percentages.
 */
export default function RadialProgressMeter({
  value = 0,
  max = 100,
  size = 140,
  strokeWidth = 10,
  label = 'COMPLETION',
  unit = '%',
  color = '#10b981',
  trackColor = 'rgba(255, 255, 255, 0.08)',
  sublabel = '',
  className = '',
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(max, Math.max(0, value));
  const progressRatio = max > 0 ? clampedValue / max : 0;
  const strokeDashoffset = circumference - progressRatio * circumference;

  return (
    <div className={`radial-progress-meter-wrap ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="radial-meter-svg"
      >
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />

        {/* Animated Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: 'stroke-dashoffset 0.85s cubic-bezier(0.16, 1, 0.3, 1)',
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
      </svg>

      {/* Center Readout */}
      <div className="radial-meter-center-content">
        <span className="radial-meter-value">
          <AnimatedCounter value={value} duration={800} />
          {unit && <span className="radial-meter-unit">{unit}</span>}
        </span>
        {label && <span className="radial-meter-label">{label}</span>}
        {sublabel && <span className="radial-meter-sub">{sublabel}</span>}
      </div>
    </div>
  );
}
