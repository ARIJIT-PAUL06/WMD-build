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
    mouseRadius: 105,
    mouseForce: 0.55,
    returnSpring: 0.065,
    swirlFactor: 0.20,
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
    mouseRadius: 130,
    mouseForce: 0.40,
    returnSpring: 0.038,
    swirlFactor: 0.10,
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
    mouseRadius: 110,
    mouseForce: 0.65,
    returnSpring: 0.085,
    swirlFactor: 0.25,
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
    mouseRadius: 125,
    mouseForce: 0.45,
    returnSpring: 0.045,
    swirlFactor: 0.35,
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
    mouseRadius: 140,
    mouseForce: 0.35,
    returnSpring: 0.050,
    swirlFactor: 0.15,
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
    mouseRadius: 120,
    mouseForce: 0.60,
    returnSpring: 0.075,
    swirlFactor: 0.30,
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
    mouseRadius: 115,
    mouseForce: 0.48,
    returnSpring: 0.055,
    swirlFactor: 0.45,
  },
};

export default function HeroAtmosphericCanvas({
  pollutantId = 'pm25',
  windSpeed = 2.4,
  mouseStateRef,
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
      p.disturbVx = 0;
      p.disturbVy = 0;
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

      // Check for live atmospheric mouse disturbance
      const mouse = mouseStateRef?.current;
      const isMouseActive = mouse && mouse.active && mouse.x > -500;

      // 1. Draw subtle regional airshed flow filaments across the hero
      if (preset.streamlines) {
        filaments.forEach((fil) => {
          ctx.beginPath();
          const baseY = cssHeight * fil.yRatio;
          const timeOffset = currentTime * fil.speed;
          ctx.moveTo(0, baseY + Math.sin(timeOffset) * fil.amp);

          for (let x = 0; x <= cssWidth; x += 40) {
            let mouseDeflection = 0;
            if (isMouseActive) {
              const dx = x - mouse.x;
              const dy = baseY - mouse.y;
              const d = Math.hypot(dx, dy);
              if (d < 160 && d > 1) {
                const normD = 1 - d / 160;
                mouseDeflection =
                  Math.sin(normD * Math.PI) *
                  (dy > 0 ? 8 : -8) *
                  (mouse.proximity ? 0.4 + 0.6 * mouse.proximity : 0.6);
              }
            }
            const y = baseY + Math.sin(x * fil.freq + timeOffset) * fil.amp + mouseDeflection;
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

        // Atmospheric mouse disturbance physics:
        // When cursor approaches, air is gently pushed away with subtle rotational wake
        if (isMouseActive) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          const radius = preset.mouseRadius || 110;

          if (dist < radius && dist > 1.5) {
            const normDist = dist / radius; // 0 (at cursor) to 1 (at perimeter)
            const force = (1 - normDist) * (preset.mouseForce || 0.5);
            const nx = dx / dist;
            const ny = dy / dist;

            // 1. Radial displacement away from cursor (air displacement)
            p.disturbVx += nx * force * 1.8;
            p.disturbVy += ny * force * 1.8;

            // 2. Tangential wake curl
            if (preset.swirlFactor) {
              p.disturbVx += -ny * force * preset.swirlFactor * 1.4;
              p.disturbVy += nx * force * preset.swirlFactor * 1.4;
            }
          }
        }

        // Smooth return spring to neutral flow
        const spring = preset.returnSpring || 0.06;
        p.disturbVx *= 1 - spring;
        p.disturbVy *= 1 - spring;

        // Clamp disturbance to maintain subtle cinematic stability
        const maxDisturb = 2.8;
        p.disturbVx = Math.max(-maxDisturb, Math.min(maxDisturb, p.disturbVx));
        p.disturbVy = Math.max(-maxDisturb, Math.min(maxDisturb, p.disturbVy));

        // Fluid organic wave motion + disturbance
        const wave = Math.sin(p.x * 0.004 + currentTime * 0.001 + p.phase) * 0.35;
        p.x += (p.vx + p.disturbVx) * 60 * dt;
        p.y += (p.vy + wave + p.disturbVy) * 60 * dt;

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
          ctx.lineTo(
            p.x - (p.vx + p.disturbVx * 0.5) * 14,
            p.y - (p.vy + wave + p.disturbVy * 0.5) * 14
          );
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
