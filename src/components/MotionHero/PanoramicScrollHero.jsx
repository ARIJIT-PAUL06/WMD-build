import React, { useRef, useState, useEffect } from 'react';
import { ArrowDown, Wind } from 'lucide-react';
import CrtScreenLensCanvas from './CrtScreenLensCanvas';
import './PanoramicScrollHero.css';

/**
 * PanoramicScrollHero - Option A: Cinematic Sensor & Atmospheric Particulate Treatment
 * - Mask low-resolution texture with animated GPU particle field, film grain & optical scanlines
 * - Interactive mouse luminescence flare
 * - Scroll-driven scrub transitioning from toxic smog crisis to pristine living canopy
 */
export default function PanoramicScrollHero({ onExploreTwin }) {
  const trackRef = useRef(null);
  const canvasRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, clientX: 0, clientY: 0 });

  // 1. Scroll-driven scrub tracking
  useEffect(() => {
    const handleScroll = () => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const trackHeight = trackRef.current.offsetHeight - window.innerHeight;
      if (trackHeight <= 0) return;
      const currentScroll = -rect.top;
      const progress = Math.min(1, Math.max(0, currentScroll / trackHeight));
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 2. Mouse tracking for parallax and aperture spotlight
  const handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    setMousePos({ x, y, clientX: e.clientX, clientY: e.clientY });
  };

  // 3. Atmospheric Particle Canvas: Floating Soot / Smoke (Left) -> Glowing Spores / Oxygen (Right)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Particle seed generator
    const particleCount = 48;
    const particles = Array.from({ length: particleCount }).map(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      radius: Math.random() * 2.0 + 0.8,
      speedX: (Math.random() - 0.5) * 0.25, // Gentle, calm natural horizontal drift
      speedY: -Math.random() * 0.45 - 0.15, // Smooth calm upward float
      alpha: Math.random() * 0.45 + 0.2,
      pulse: Math.random() * Math.PI * 2,
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const isClean = scrollProgress > 0.55;

      particles.forEach(p => {
        // Calm, steady physics - NO erratic mouse whipping!
        p.x += p.speedX;
        p.y += p.speedY;
        p.pulse += 0.025;

        // Wrap around viewport edges
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        const currentAlpha = Math.max(0.08, p.alpha + Math.sin(p.pulse) * 0.18);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

        if (!isClean) {
          // Left Phase: Toxic Amber & Red Ash/Soot Particulates
          ctx.fillStyle = `rgba(239, 68, 68, ${currentAlpha * 0.6})`;
          ctx.shadowBlur = p.radius * 3;
          ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
        } else {
          // Right Phase: Bioluminescent Emerald / Cyan Pollen & Spores
          ctx.fillStyle = `rgba(52, 211, 153, ${currentAlpha * 0.75})`;
          ctx.shadowBlur = p.radius * 5;
          ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';
        }
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [scrollProgress]);

  // Determine active phase based on scroll progress
  const isLeftPhase = scrollProgress < 0.38;
  const isMidPhase = scrollProgress >= 0.38 && scrollProgress < 0.68;
  const isRightPhase = scrollProgress >= 0.68;

  // Background tint shifts from dark smog red/amber to clean emerald as you scroll
  const ambientBg = isLeftPhase
    ? 'rgba(239, 68, 68, 0.12)'
    : isMidPhase
    ? 'rgba(245, 158, 11, 0.08)'
    : 'rgba(16, 185, 129, 0.08)';

  // Spotlight color based on active narrative zone
  const spotlightColor = isLeftPhase
    ? 'rgba(239, 68, 68, 0.16)'
    : isMidPhase
    ? 'rgba(245, 158, 11, 0.13)'
    : 'rgba(56, 189, 248, 0.16)';

  return (
    <div
      ref={trackRef}
      onMouseMove={handleMouseMove}
      style={{
        position: 'relative',
        height: '320vh', // Pinned scroll track for smooth scrub
        background: '#070a12',
      }}
    >
      {/* Sticky Fullscreen Viewport */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* ============================================================== */}
        {/* AUTHENTIC CRT CURVED SCREEN LENS WITH IN-SHADER TEMPLATES      */}
        {/* The templates lie flat on the background image inside WebGL,   */}
        {/* sharing the exact spherical barrel distortion & scanlines,     */}
        {/* and rise smoothly from below to up as user scrolls down!       */}
        {/* ============================================================== */}
        <CrtScreenLensCanvas
          scrollProgress={scrollProgress}
          mousePos={mousePos}
          onExploreTwin={onExploreTwin}
        />

        {/* Phase 3 Interactive CTA Hotspot Overlay */}
        {isRightPhase && (
          <button
            type="button"
            onClick={onExploreTwin}
            aria-label="Explore India National AQI Heatmap"
            style={{
              position: 'absolute',
              right: '7vw',
              bottom: '14vh',
              width: 'min(520px, 88vw)',
              height: '48px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              zIndex: 35,
            }}
          />
        )}

        {/* 1. Bulbous Spherical CRT Curvature Swell & Corner Blackout Frame */}
        <div className="hero-crt-screen-curvature" aria-hidden="true">
          {/* Authentic CRT Glass Faceplate Curvature Lens Highlight */}
          <div className="hero-crt-glass-glare" />
        </div>

        {/* 2. Analog Phosphor Micro-Flicker Layer */}
        <div className="hero-crt-flicker-layer" aria-hidden="true" />

        {/* 3. Procedural Film Grain Overlay */}
        <div className="hero-grain-overlay" aria-hidden="true" />

        {/* 6. Calm Floating Particulate Field (Soot & Spores) */}
        <canvas ref={canvasRef} className="hero-particles-canvas" />

        {/* 7. Mouse-reactive Volumetric Lens Spotlight */}
        <div
          className="hero-cursor-luminescence"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 14,
            background: `radial-gradient(circle 420px at ${mousePos.clientX || window.innerWidth / 2}px ${mousePos.clientY || window.innerHeight / 2}px, ${spotlightColor} 0%, transparent 80%)`,
          }}
          aria-hidden="true"
        />

        {/* 8. Seamless Bottom Gradient Fade into Map */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 17,
            pointerEvents: 'none',
            background: `linear-gradient(to bottom, rgba(7, 10, 18, 0.45) 0%, transparent 14%, transparent 60%, rgba(7, 10, 18, 0.88) 85%, #070a12 100%), ${ambientBg}`,
            transition: 'background 0.5s ease',
          }}
        />

        {/* ============================================================== */}
        {/* TOP EDITORIAL HUD TELEMETRY CAPSULE (Clean, Uncluttered)       */}
        {/* ============================================================== */}
        <div className="hero-top-hud">
          <div className="hero-hud-brand">
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isRightPhase ? '#10b981' : isMidPhase ? '#f59e0b' : '#ef4444', boxShadow: `0 0 10px ${isRightPhase ? '#10b981' : isMidPhase ? '#f59e0b' : '#ef4444'}` }} />
            <span>VAYUVITALS</span>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>01 • PROLOGUE</span>
          </div>

          <div className="hero-hud-pill">
            <Wind size={13} color="#38bdf8" />
            <span>Atmospheric Inversion Journey</span>
            <span style={{ color: '#475569' }}>•</span>
            <span style={{ color: isRightPhase ? '#34d399' : isMidPhase ? '#fbbf24' : '#f87171' }}>
              {isRightPhase ? 'Phase III: Canopy Gas Exchange' : isMidPhase ? 'Phase II: Critical Transition' : 'Phase I: Particulate Decay'}
            </span>
          </div>
        </div>

        {/* Scroll Instruction Floating Pill at bottom center */}
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '9999px',
            padding: '8px 18px',
            fontSize: '0.78rem',
            color: '#94a3b8',
            pointerEvents: 'none',
          }}
        >
          <ArrowDown size={14} className="animate-bounce" color="#38bdf8" />
          <span>
            {scrollProgress < 0.95
              ? 'Scroll down to journey from toxic smog to clean atmospheric renewal'
              : 'Continue scrolling down to explore the India National AQI Heatmap'}
          </span>
        </div>
      </div>
    </div>
  );
}
