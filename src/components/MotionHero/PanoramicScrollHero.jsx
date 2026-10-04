import React, { useRef, useState, useEffect, useMemo } from 'react';
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

  // Continuous smooth color transition for VAYUVITALS brand text and ambient field
  // Left (pollution red: 239, 68, 68) -> Mid (amber: 245, 158, 11) -> Right (clean green: 16, 185, 129)
  const brandTheme = useMemo(() => {
    const p = Math.max(0, Math.min(1, scrollProgress));
    let r, g, b;
    if (p <= 0.5) {
      // Phase 1 (Pollution Red) -> Phase 2 (Transition Amber)
      const t = p / 0.5;
      r = Math.round(239 + (245 - 239) * t);
      g = Math.round(68 + (158 - 68) * t);
      b = Math.round(68 + (11 - 68) * t);
    } else {
      // Phase 2 (Transition Amber) -> Phase 3 (Pristine Living Green)
      const t = (p - 0.5) / 0.5;
      r = Math.round(245 + (16 - 245) * t);
      g = Math.round(158 + (185 - 158) * t);
      b = Math.round(11 + (129 - 11) * t);
    }

    return {
      accentColor: `rgb(${r}, ${g}, ${b})`,
      gradient: `linear-gradient(135deg, #ffffff 30%, rgb(${r}, ${g}, ${b}) 100%)`,
      glow: `rgba(${r}, ${g}, ${b}, 0.65)`,
      ambient: `rgba(${r}, ${g}, ${b}, 0.12)`,
      spotlight: `rgba(${r}, ${g}, ${b}, 0.16)`,
    };
  }, [scrollProgress]);

  const ambientBg = brandTheme.ambient;
  const spotlightColor = brandTheme.spotlight;

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
              right: '8vw',
              top: 'calc(48vh + 145px)',
              width: 'min(520px, 86vw)',
              height: '38px',
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
        {/* TOP BRAND DISPLAY (Clean, Modern, Uncluttered)                */}
        {/* ============================================================== */}
        <div className="hero-top-hud">
          <div className="hero-hud-brand">
            <span
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 900,
                fontSize: '1.45rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                background: brandTheme.gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: `drop-shadow(0 2px 14px ${brandTheme.glow})`,
                transition: 'filter 0.2s ease, background 0.2s ease',
              }}
            >
              VAYUVITALS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
