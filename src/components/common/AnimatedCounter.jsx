import React, { useState, useEffect, useRef } from 'react';

/**
 * AnimatedCounter
 * Smooth requestAnimationFrame numeric interpolator with easing,
 * formatting, and prefers-reduced-motion support.
 */
export default function AnimatedCounter({
  value = 0,
  duration = 900,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  style = {},
}) {
  const targetVal = typeof value === 'number' ? value : parseFloat(value) || 0;
  const [displayValue, setDisplayValue] = useState(targetVal);
  const startValRef = useRef(0);
  const startTimeRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    // Respect prefers-reduced-motion
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setDisplayValue(targetVal);
      return;
    }

    startValRef.current = 0;
    startTimeRef.current = null;

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(1, Math.max(0, elapsed / duration));

      // Ease-out cubic for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValRef.current + (targetVal - startValRef.current) * easeOut;

      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetVal);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [targetVal, duration]);

  const formattedNumber =
    decimals > 0
      ? displayValue.toFixed(decimals)
      : Math.round(displayValue).toLocaleString('en-IN');

  return (
    <span className={`animated-stat-counter ${className}`} style={style}>
      {prefix}
      {formattedNumber}
      {suffix}
    </span>
  );
}
