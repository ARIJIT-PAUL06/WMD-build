import React, { useRef, useState, useEffect, useMemo } from 'react';
import CrtScreenLensCanvas from './CrtScreenLensCanvas';
import './PanoramicScrollHero.css';

/**
 * PanoramicScrollHero - Option A: Cinematic Sensor & Atmospheric Particulate Treatment
 * - Mask low-resolution texture with animated GPU particle field, film grain & optical scanlines
 * - Interactive mouse luminescence flare
 * - Scroll-driven scrub transitioning from toxic smog crisis to pristine living canopy
 */
export default function PanoramicScrollHero({ onExploreTwin, isMobile: propIsMobile }) {
  const [isMobileState, setIsMobileState] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  useEffect(() => {
    const checkMobile = () => setIsMobileState(window.innerWidth < 1024);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const isMobile = propIsMobile !== undefined ? propIsMobile : isMobileState;

  const trackRef = useRef(null);
  const canvasRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, clientX: 0, clientY: 0 });

  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const touchStartProgress = useRef(0);
  const targetProgress = useRef(0);
  const currentProgress = useRef(0);

  // Sync progress refs
  useEffect(() => {
    if (!isMobile) {
      targetProgress.current = scrollProgress;
      currentProgress.current = scrollProgress;
    }
  }, [scrollProgress, isMobile]);

  // 1. Scroll-driven scrub tracking (Desktop only)
  useEffect(() => {
    if (isMobile) return;
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
  }, [isMobile]);

  // Mobile Lerp Loop: smooth inertia glide between phases
  useEffect(() => {
    if (!isMobile) return;
    let animId;
    const lerp = () => {
      animId = requestAnimationFrame(lerp);
      const diff = targetProgress.current - currentProgress.current;
      if (Math.abs(diff) > 0.0005) {
        currentProgress.current += diff * 0.16;
        setScrollProgress(currentProgress.current);
      }
    };
    animId = requestAnimationFrame(lerp);
    return () => cancelAnimationFrame(animId);
  }, [isMobile]);

  // Mobile Touch Scrubbing: swipe up/down or left/right to glide across the 3 phases
  const handleTouchStart = (e) => {
    if (!isMobile || !e.touches || e.touches.length === 0) return;
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    touchStartProgress.current = targetProgress.current;
  };

  const handleTouchMove = (e) => {
    if (!isMobile || !e.touches || e.touches.length === 0) return;
    const dy = touchStartY.current - e.touches[0].clientY;
    const dx = touchStartX.current - e.touches[0].clientX;
    const delta = Math.abs(dy) > Math.abs(dx) ? dy : dx;
    const travel = window.innerHeight * 0.60;
    const next = Math.max(0, Math.min(1, touchStartProgress.current + delta / travel));
    targetProgress.current = next;
  };

  // Mobile Wheel Scrubbing (for trackpads and testing)
  const handleWheel = (e) => {
    if (!isMobile) return;
    const delta = e.deltaY * 0.0016;
    targetProgress.current = Math.max(0, Math.min(1, targetProgress.current + delta));
  };

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
  // Left (pollution red: 248, 113, 113) -> Mid (amber: 251, 191, 36) -> Right (clean green: 52, 211, 153)
  const brandTheme = useMemo(() => {
    const p = Math.max(0, Math.min(1, scrollProgress));
    let r, g, b;
    if (p <= 0.5) {
      // Phase 1 (Pollution Red #f87171) -> Phase 2 (Amber #fbbf24)
      const t = p / 0.5;
      r = Math.round(248 + (251 - 248) * t);
      g = Math.round(113 + (191 - 113) * t);
      b = Math.round(113 + (36 - 113) * t);
    } else {
      // Phase 2 (Amber #fbbf24) -> Phase 3 (Living Green #34d399)
      const t = (p - 0.5) / 0.5;
      r = Math.round(251 + (52 - 251) * t);
      g = Math.round(191 + (211 - 191) * t);
      b = Math.round(36 + (153 - 36) * t);
    }

    const rgb = `${r}, ${g}, ${b}`;
    return {
      textColor: `rgb(${rgb})`,
      accentColor: `rgb(${rgb})`,
      glow: `rgba(${rgb}, 0.65)`,
      glowSoft: `rgba(${rgb}, 0.25)`,
      ambient: `rgba(${rgb}, 0.12)`,
      spotlight: `rgba(${rgb}, 0.16)`,
    };
  }, [scrollProgress]);

  const ambientBg = brandTheme.ambient;
  const spotlightColor = brandTheme.spotlight;

  const isLeftPhase = scrollProgress < 0.38;
  const isMidPhase = scrollProgress >= 0.38 && scrollProgress < 0.68;
  const isRightPhase = scrollProgress >= 0.68;

  return (
    <div
      ref={trackRef}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onWheel={handleWheel}
      style={{
        position: 'relative',
        height: isMobile ? '100%' : '320vh', // Pinned scroll track on desktop, fixed container on mobile
        width: '100%',
        overflow: 'hidden',
        background: '#070a12',
        touchAction: isMobile ? 'none' : 'auto',
      }}
    >
      {/* Sticky Fullscreen Viewport on desktop, fixed container on mobile */}
      <div
        style={{
          position: isMobile ? 'absolute' : 'sticky',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: isMobile ? '100%' : '100vw',
          height: isMobile ? '100%' : '100vh',
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
              right: isMobile ? '7vw' : '8vw',
              top: isMobile ? 'calc(36vh + 120px)' : 'calc(48vh + 145px)',
              width: isMobile ? '86vw' : 'min(520px, 86vw)',
              height: isMobile ? '44px' : '38px',
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
            background: isMobile
              ? `linear-gradient(to bottom, rgba(7, 10, 18, 0.20) 0%, transparent 16%, transparent 72%, rgba(7, 10, 18, 0.70) 100%), ${ambientBg}`
              : `linear-gradient(to bottom, rgba(7, 10, 18, 0.45) 0%, transparent 14%, transparent 60%, rgba(7, 10, 18, 0.88) 85%, #070a12 100%), ${ambientBg}`,
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
                fontSize: isMobile ? '1.2rem' : '1.45rem',
                letterSpacing: isMobile ? '0.10em' : '0.15em',
                textTransform: 'uppercase',
                color: brandTheme.textColor,
                textShadow: `0 0 16px ${brandTheme.glow}, 0 0 32px ${brandTheme.glowSoft}`,
                transition: 'color 0.15s ease, text-shadow 0.15s ease',
              }}
            >
              VAYUVITALS
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* FLOATING MOBILE PHASE STEPPER (Tactile, responsive navigation)  */}
        {/* ============================================================== */}
        {isMobile && (
          <div
            style={{
              position: 'absolute',
              bottom: '84px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 36,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 6px',
              background: 'rgba(7, 10, 18, 0.85)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '999px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.65)',
              maxWidth: '92vw',
            }}
          >
            <button
              type="button"
              onClick={() => { targetProgress.current = 0.0; }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '999px',
                border: 'none',
                background: scrollProgress < 0.33 ? 'rgba(239, 68, 68, 0.28)' : 'transparent',
                outline: scrollProgress < 0.33 ? '1px solid #ef4444' : 'none',
                color: scrollProgress < 0.33 ? '#fca5a5' : '#94a3b8',
                fontSize: '0.74rem',
                fontFamily: "'Share Tech Mono', monospace",
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              1. Crisis
            </button>

            <button
              type="button"
              onClick={() => { targetProgress.current = 0.5; }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '999px',
                border: 'none',
                background: (scrollProgress >= 0.33 && scrollProgress < 0.67) ? 'rgba(245, 158, 11, 0.28)' : 'transparent',
                outline: (scrollProgress >= 0.33 && scrollProgress < 0.67) ? '1px solid #f59e0b' : 'none',
                color: (scrollProgress >= 0.33 && scrollProgress < 0.67) ? '#fde68a' : '#94a3b8',
                fontSize: '0.74rem',
                fontFamily: "'Share Tech Mono', monospace",
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
              2. Scrub
            </button>

            <button
              type="button"
              onClick={() => { targetProgress.current = 1.0; }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '999px',
                border: 'none',
                background: scrollProgress >= 0.67 ? 'rgba(16, 185, 129, 0.30)' : 'transparent',
                outline: scrollProgress >= 0.67 ? '1px solid #10b981' : 'none',
                color: scrollProgress >= 0.67 ? '#6ee7b7' : '#94a3b8',
                fontSize: '0.74rem',
                fontFamily: "'Share Tech Mono', monospace",
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              3. Pristine
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
