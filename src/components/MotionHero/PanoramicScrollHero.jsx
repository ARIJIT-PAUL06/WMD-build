import React, { useRef, useState, useEffect } from 'react';
import CrtScreenLensCanvas from './CrtScreenLensCanvas';
import AnimatedCounter from '../common/AnimatedCounter';
import './PanoramicScrollHero.css';

/**
 * Continuous smooth color transition for VAYUVITALS brand text and ambient field
 * Left (pollution red: 248, 113, 113) -> Mid (amber: 251, 191, 36) -> Right (clean green: 52, 211, 153)
 */
function getBrandTheme(progress) {
  const p = Math.max(0, Math.min(1, progress));
  let r, g, b;
  if (p <= 0.5) {
    const t = p / 0.5;
    r = Math.round(248 + (251 - 248) * t);
    g = Math.round(113 + (191 - 113) * t);
    b = Math.round(113 + (36 - 113) * t);
  } else {
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
}

/**
 * PanoramicScrollHero - Option A: Cinematic Sensor & Atmospheric Particulate Treatment
 * - Mask low-resolution texture with animated GPU particle field, film grain & optical scanlines
 * - Interactive mouse luminescence flare
 * - Scroll-driven scrub transitioning from toxic smog crisis to pristine living canopy
 */
export default function PanoramicScrollHero({ onExploreTwin }) {
  const trackRef = useRef(null);
  const canvasRef = useRef(null);
  const spotlightRef = useRef(null);
  const brandTextRef = useRef(null);
  const bottomFadeRef = useRef(null);

  // High-frequency values use refs instead of React state to eliminate re-renders during interaction
  const scrollProgressRef = useRef(0);
  const mousePosRef = useRef({ x: 0, y: 0, clientX: 0, clientY: 0 });
  const spotlightColorRef = useRef('rgba(248, 113, 113, 0.16)');

  // Read by the particle loop each frame so it never has to be torn down on scroll
  const isCleanRef = useRef(false);

  // Low-frequency phase state: only re-renders when crossing the 0.68 threshold for the CTA button overlay
  const [isRightPhase, setIsRightPhase] = useState(false);

  const airshedLabelRef = useRef(null);

  // Direct DOM style calibration on scroll without triggering React state updates
  const updateBrandStyles = (progress) => {
    const theme = getBrandTheme(progress);
    spotlightColorRef.current = theme.spotlight;

    if (brandTextRef.current) {
      brandTextRef.current.style.color = theme.textColor;
      brandTextRef.current.style.textShadow = `0 0 16px ${theme.glow}, 0 0 32px ${theme.glowSoft}`;
    }
    if (bottomFadeRef.current) {
      bottomFadeRef.current.style.background = `linear-gradient(to bottom, rgba(7, 10, 18, 0.45) 0%, transparent 14%, transparent 60%, rgba(7, 10, 18, 0.88) 85%, #070a12 100%), ${theme.ambient}`;
    }
    if (airshedLabelRef.current) {
      airshedLabelRef.current.style.color = theme.textColor;
      airshedLabelRef.current.textContent = progress < 0.38 ? 'WINTER INVERSION' : progress < 0.68 ? 'SCRUB TRANSITION' : 'LIVING CANOPY';
    }
  };

  // 1. Scroll-driven scrub tracking using refs
  useEffect(() => {
    const handleScroll = () => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const trackHeight = trackRef.current.offsetHeight - window.innerHeight;
      if (trackHeight <= 0) return;
      const currentScroll = -rect.top;
      const progress = Math.min(1, Math.max(0, currentScroll / trackHeight));

      scrollProgressRef.current = progress;
      isCleanRef.current = progress > 0.55;

      updateBrandStyles(progress);

      const rightPhase = progress >= 0.68;
      setIsRightPhase(prev => (prev !== rightPhase ? rightPhase : prev));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 2. Mouse tracking for parallax and aperture spotlight using refs and direct style updates
  const handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    mousePosRef.current = { x, y, clientX: e.clientX, clientY: e.clientY };

    if (spotlightRef.current) {
      spotlightRef.current.style.background = `radial-gradient(circle 420px at ${e.clientX}px ${e.clientY}px, ${spotlightColorRef.current} 0%, transparent 80%)`;
    }
  };

  // 3. Atmospheric Particle Canvas: created once and keeps running without recreation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Particle seed generator - created strictly once!
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
      animId = requestAnimationFrame(render);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const isClean = isCleanRef.current;

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
    };

    // Only animate while the hero is on screen and the tab is visible
    let inView = true;
    const sync = () => {
      const shouldRun = inView && !document.hidden;
      if (shouldRun && !animId) render();
      else if (!shouldRun && animId) {
        cancelAnimationFrame(animId);
        animId = 0;
      }
    };
    const observer = new IntersectionObserver(
      (entries) => {
        inView = entries[entries.length - 1].isIntersecting;
        sync();
      },
      { threshold: 0 }
    );
    observer.observe(canvas);
    document.addEventListener('visibilitychange', sync);
    sync();

    return () => {
      cancelAnimationFrame(animId);
      animId = 0;
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('resize', resize);
    };
  }, []);

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
          scrollProgressRef={scrollProgressRef}
          mousePosRef={mousePosRef}
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

        {/* Phosphor flicker and film grain now live in the CRT shader (see CrtScreenLensCanvas) */}

        {/* 6. Calm Floating Particulate Field (Soot & Spores) */}
        <canvas ref={canvasRef} className="hero-particles-canvas" />

        {/* 7. Mouse-reactive Volumetric Lens Spotlight */}
        <div
          ref={spotlightRef}
          className="hero-cursor-luminescence"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 14,
            background: 'radial-gradient(circle 420px at 50vw 50vh, rgba(248, 113, 113, 0.16) 0%, transparent 80%)',
          }}
          aria-hidden="true"
        />

        {/* 8. Seamless Bottom Gradient Fade into Map */}
        <div
          ref={bottomFadeRef}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 17,
            pointerEvents: 'none',
            background: 'linear-gradient(to bottom, rgba(7, 10, 18, 0.45) 0%, transparent 14%, transparent 60%, rgba(7, 10, 18, 0.88) 85%, #070a12 100%), rgba(248, 113, 113, 0.12)',
            transition: 'background 0.5s ease',
          }}
        />

        {/* ============================================================== */}
        {/* TOP BRAND DISPLAY (Clean, Modern, Uncluttered)                */}
        {/* ============================================================== */}
        <div className="hero-top-hud">
          <div className="hero-hud-brand">
            <span
              ref={brandTextRef}
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 900,
                fontSize: '1.45rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#f87171',
                textShadow: '0 0 16px rgba(248, 113, 113, 0.65), 0 0 32px rgba(248, 113, 113, 0.25)',
                transition: 'color 0.15s ease, text-shadow 0.15s ease',
              }}
            >
              VAYUVITALS
            </span>
          </div>

          <div className="hero-hud-telemetry-cluster">
            <div className="hero-hud-pill live-network">
              <span className="hero-hud-pulse-dot" />
              <span>
                <strong><AnimatedCounter value={108} duration={800} /></strong> CAAQMS STATIONS
              </span>
            </div>
            <div className="hero-hud-pill phase-indicator">
              <span>
                AIRSHED: <strong ref={airshedLabelRef} style={{ color: '#f87171', transition: 'color 0.15s ease' }}>WINTER INVERSION</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
