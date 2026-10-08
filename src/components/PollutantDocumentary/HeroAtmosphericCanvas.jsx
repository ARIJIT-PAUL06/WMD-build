/**
 * HeroAtmosphericCanvas.jsx
 * VayuVitals - Live Atmospheric Flow Field Canvas
 *
 * Implements subtle, organic environmental flow around the hero:
 * - Dynamic micro-particle streamlines communicating air flow, wind velocity, and concentration
 * - Pollutant-specific visual personality (PM2.5 fine particulates, PM10 coarse dust, NO2 urban flow, etc.)
 * - 100% SSR-safe, pauses on visibility/scroll, respects prefers-reduced-motion
 * - Lightweight 60fps 2D canvas with minimal memory and CPU footprint
 */

import React, { useRef, useEffect } from 'react';

const POLLUTANT_PARTICLE_PRESETS = {
  pm25: {
    count: 42,
    minRadius: 0.7,
    maxRadius: 1.6,
    speedMultiplier: 1.0,
    verticalDrift: 0.12,
    brownian: 0.22,
    baseAlpha: 0.30,
    color: '239, 68, 68', // Fine particulate red tint
    streamlines: true,
  },
  pm10: {
    count: 34,
    minRadius: 1.5,
    maxRadius: 3.2,
    speedMultiplier: 0.85,
    verticalDrift: 0.32, // Crustal gravitational settling
    brownian: 0.08,
    baseAlpha: 0.28,
    color: '245, 158, 11', // Coarser crustal dust tint
    streamlines: false,
  },
  no2: {
    count: 36,
    minRadius: 0.9,
    maxRadius: 2.0,
    speedMultiplier: 1.25,
    verticalDrift: 0.08, // Rapid street canyon horizontal displacement
    brownian: 0.12,
    baseAlpha: 0.26,
    color: '249, 115, 22', // Traffic thermal combustion
    streamlines: true,
  },
  so2: {
    count: 30,
    minRadius: 1.0,
    maxRadius: 2.2,
    speedMultiplier: 0.95,
    verticalDrift: -0.36, // Thermal industrial plume chimney loft
    brownian: 0.14,
    baseAlpha: 0.25,
    color: '234, 179, 8', // Industrial plume
    streamlines: true,
  },
  co: {
    count: 28,
    minRadius: 1.1,
    maxRadius: 2.4,
    speedMultiplier: 0.65, // Stagnant sub-grade canyon drift
    verticalDrift: 0.04,
    brownian: 0.16,
    baseAlpha: 0.22,
    color: '244, 63, 94', // Carbon asphyxiant
    streamlines: false,
  },
  o3: {
    count: 36,
    minRadius: 0.8,
    maxRadius: 1.8,
    speedMultiplier: 1.15,
    verticalDrift: -0.28, // Photochemical solar convective loft into open sky
    brownian: 0.14,
    baseAlpha: 0.28,
    color: '56, 189, 248', // Photochemical sky
    streamlines: true,
  },
  nh3: {
    count: 32,
    minRadius: 1.0,
    maxRadius: 2.2,
    speedMultiplier: 0.82,
    verticalDrift: 0.14, // Agrarian canopy wave dispersion
    brownian: 0.15,
    baseAlpha: 0.26,
    color: '52, 211, 153', // Agrarian alkaline aerosol
    streamlines: true,
  },
};

export default function HeroAtmosphericCanvas({
  pollutantId = 'pm25',
  windSpeed = 2.4,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === 'undefined') return;

    // Check reduced motion
    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let isVisible = true;
    const preset = POLLUTANT_PARTICLE_PRESETS[pollutantId] || POLLUTANT_PARTICLE_PRESETS.pm25;

    // Canvas dimensions cache (prevents forced layout reflow at 60fps)
    let cssWidth = 1200;
    let cssHeight = 800;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssWidth = rect.width || 1200;
      cssHeight = rect.height || 800;
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();

    // Particle pool
    const particles = [];
    const baseSpeed = Math.max(0.65, (windSpeed || 2.4) * 0.35 * preset.speedMultiplier);

    const initParticle = (p = {}) => {
      p.x = Math.random() * cssWidth;
      p.y = Math.random() * cssHeight;
      p.radius = preset.minRadius + Math.random() * (preset.maxRadius - preset.minRadius);
      // Flow primarily from west (left) with subtle variation
      p.vx = baseSpeed * (0.8 + Math.random() * 0.55);
      p.vy = (Math.random() - 0.5) * 0.25 + (preset.verticalDrift || 0) * 0.35;
      p.alpha = Math.random() * preset.baseAlpha + 0.08;
      p.maxAlpha = p.alpha;
      p.life = Math.random() * 220;
      p.maxLife = 200 + Math.random() * 160;
      p.phase = Math.random() * Math.PI * 2;
      return p;
    };

    for (let i = 0; i < preset.count; i++) {
      particles.push(initParticle({}));
    }

    // Faint atmospheric airflow filaments (connecting left to center to right)
    const filaments = [
      { yRatio: 0.38, amp: 22, freq: 0.0035, speed: 0.0006, alpha: 0.05 },
      { yRatio: 0.52, amp: 28, freq: 0.0028, speed: 0.0008, alpha: 0.04 },
      { yRatio: 0.68, amp: 20, freq: 0.0040, speed: 0.0005, alpha: 0.035 },
    ];

    // Animation render loop
    let lastTime = performance.now();

    const render = (currentTime) => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      ctx.clearRect(0, 0, cssWidth, cssHeight);

      // 1. Draw subtle regional airshed flow filaments across the hero
      if (preset.streamlines) {
        filaments.forEach((fil) => {
          ctx.beginPath();
          const baseY = cssHeight * fil.yRatio;
          const timeOffset = currentTime * fil.speed;
          ctx.moveTo(0, baseY + Math.sin(timeOffset) * fil.amp);

          for (let x = 0; x <= cssWidth; x += 40) {
            const y = baseY + Math.sin((x * fil.freq) + timeOffset) * fil.amp;
            ctx.lineTo(x, y);
          }

          ctx.strokeStyle = `rgba(${preset.color}, ${fil.alpha})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        });
      }

      // 2. Draw live particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Fluid organic wave motion
        const wave = Math.sin((p.x * 0.004) + (currentTime * 0.001) + p.phase) * 0.35;
        p.x += p.vx * 60 * dt;
        p.y += (p.vy + wave) * 60 * dt;

        // Brownian micro-jitter
        if (preset.brownian) {
          p.x += (Math.random() - 0.5) * preset.brownian;
          p.y += (Math.random() - 0.5) * preset.brownian;
        }

        p.life += 60 * dt;

        // Life cycle fade
        const progress = p.life / p.maxLife;
        let currentAlpha = p.maxAlpha;
        if (progress < 0.2) {
          currentAlpha = p.maxAlpha * (progress / 0.2);
        } else if (progress > 0.8) {
          currentAlpha = p.maxAlpha * (1 - (progress - 0.8) / 0.2);
        }

        // Draw particle node
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${preset.color}, ${Math.max(0, currentAlpha)})`;
        ctx.fill();

        // Subtle streamline tail for a subset of particles
        if (i % 3 === 0) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 14, p.y - (p.vy + wave) * 14);
          ctx.strokeStyle = `rgba(${preset.color}, ${Math.max(0, currentAlpha * 0.35)})`;
          ctx.lineWidth = p.radius * 0.55;
          ctx.stroke();
        }

        // Wrap around boundaries
        if (p.x > cssWidth + 20 || p.y < -20 || p.y > cssHeight + 20 || p.life >= p.maxLife) {
          initParticle(p);
          p.x = -15; // Re-enter from left to sustain continuous air flow
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    // Pause when out of viewport to preserve mobile battery & performance
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);

    window.addEventListener('resize', resizeCanvas);

    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [pollutantId, windSpeed]);

  return (
    <canvas
      ref={canvasRef}
      className="hero-atmospheric-canvas"
      aria-hidden="true"
    />
  );
}
