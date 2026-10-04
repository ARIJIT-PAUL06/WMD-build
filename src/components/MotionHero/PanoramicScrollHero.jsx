import React, { useRef, useState, useEffect } from 'react';
import { ArrowDown, Wind, Sparkles, AlertTriangle, ShieldCheck, ChevronRight, Activity, Eye, Flame, Gauge } from 'lucide-react';
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

  // Minimal templates glide horizontally across the screen with the panoramic image
  const p1Offset = (0.05 - scrollProgress) * 110;
  const p1Opacity = Math.max(0, Math.min(1, 1 - scrollProgress * 3.4));
  const p1RotY = Math.max(-2, Math.min(10, 6 + (0.05 - scrollProgress) * 16));

  const p2Dist = scrollProgress - 0.50;
  const p2Offset = -p2Dist * 140;
  const p2Opacity = Math.max(0, Math.min(1, (0.24 - Math.abs(p2Dist)) / 0.12));
  const p2RotY = Math.max(-10, Math.min(10, -p2Dist * 28));

  const p3Offset = Math.max(0, (0.88 - scrollProgress) * 120);
  const p3Opacity = Math.max(0, Math.min(1, (scrollProgress - 0.65) / 0.18));
  const p3RotY = Math.max(-10, Math.min(4, -6 + (0.88 - scrollProgress) * 16));

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
        {/* FIXED CRT CURVED SCREEN FACEPLATE (DYNAMIC BULGE LENS)         */}
        {/* The screen lens is stationary; as you scroll, the picture      */}
        {/* slides through the center and bulges dynamically outward!      */}
        {/* ============================================================== */}
        <CrtScreenLensCanvas scrollProgress={scrollProgress} mousePos={mousePos} />

        {/* ============================================================== */}
        {/* BEHIND-THE-FILTER MINIMAL TEMPLATES (Arriving with the image)   */}
        {/* Placed at zIndex: 9, beneath CRT glare, grain, flicker & beam  */}
        {/* ============================================================== */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 9,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          {/* Phase 1: Left / Smog Crisis */}
          <div
            className="crt-stage-left"
            style={{
              position: 'absolute',
              left: '6vw',
              bottom: '12vh',
              opacity: p1Opacity,
              transform: `translate3d(${p1Offset}vw, 0, 0)`,
              transition: 'opacity 0.25s ease',
              pointerEvents: p1Opacity > 0.05 ? 'auto' : 'none',
            }}
          >
            <div
              className="crt-minimal-card crt-card-toxic"
              style={{
                transform: `perspective(1000px) rotateY(${p1RotY}deg) rotateX(-2deg)`,
              }}
            >
              <div className="crt-minimal-content">
                <div className="crt-minimal-badge" style={{ color: '#f87171' }}>
                  <Flame size={12} /> 01 • PROLOGUE // DELHI NCR
                </div>
                <h1 className="crt-minimal-title">A City Choking in Silence.</h1>
                <p className="crt-minimal-statement">
                  A 140-meter thermal ceiling traps toxic stubble smoke and particulate soot over 30 million people. Microscopic soot settles deep into alveolar walls, destroying lung capacity breath by breath.
                </p>
                <div className="crt-minimal-stat-line" style={{ color: '#ef4444' }}>
                  <span className="crt-minimal-stat-pill" style={{ background: 'rgba(239, 68, 68, 0.22)', color: '#f87171' }}>
                    AQI 486 · SEVERE
                  </span>
                  <span style={{ color: '#94a3b8' }}>PM2.5: 19.4× WHO Limit</span>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 2: Center / The Turning Point */}
          <div
            className="crt-stage-center"
            style={{
              position: 'absolute',
              left: '50%',
              bottom: '12vh',
              opacity: p2Opacity,
              transform: `translate3d(calc(-50% + ${p2Offset}vw), 0, 0)`,
              transition: 'opacity 0.25s ease',
              pointerEvents: p2Opacity > 0.05 ? 'auto' : 'none',
            }}
          >
            <div
              className="crt-minimal-card crt-card-turning"
              style={{
                transform: `perspective(1000px) rotateY(${p2RotY}deg) rotateX(2deg) scale(1.02)`,
              }}
            >
              <div className="crt-minimal-content">
                <div className="crt-minimal-badge" style={{ color: '#fbbf24' }}>
                  <Activity size={12} /> 02 • INTERVENTION // THE CORRIDOR
                </div>
                <h2 className="crt-minimal-title">The Line Between Decay & Renewal.</h2>
                <p className="crt-minimal-statement">
                  Where predictive atmospheric intelligence intercepts the smog plume. Automated clean air corridors and mist cannons deploy dynamically to halt cellular damage before it becomes permanent.
                </p>
                <div className="crt-minimal-stat-line" style={{ color: '#f59e0b' }}>
                  <span className="crt-minimal-stat-pill" style={{ background: 'rgba(245, 158, 11, 0.22)', color: '#fbbf24' }}>
                    AQI 142 · TURNING POINT
                  </span>
                  <span style={{ color: '#94a3b8' }}>Autonomous Mitigation Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 3: Right / The Living Canopy */}
          <div
            className="crt-stage-right"
            style={{
              position: 'absolute',
              right: '6vw',
              bottom: '12vh',
              opacity: p3Opacity,
              transform: `translate3d(${p3Offset}vw, 0, 0)`,
              transition: 'opacity 0.25s ease',
              pointerEvents: p3Opacity > 0.05 ? 'auto' : 'none',
            }}
          >
            <div
              className="crt-minimal-card crt-card-canopy"
              style={{
                transform: `perspective(1000px) rotateY(${p3RotY}deg) rotateX(-2deg)`,
              }}
            >
              <div className="crt-minimal-content">
                <div className="crt-minimal-badge" style={{ color: '#34d399' }}>
                  <Sparkles size={12} /> 03 • RESTORATION // HIMALAYAN CANOPY
                </div>
                <h2 className="crt-minimal-title">11,000 Liters of Pure Life.</h2>
                <p className="crt-minimal-statement">
                  Every healthy human lung processes 11,000 liters of atmospheric gas daily. In pristine forest air, bronchial cilia oscillate freely, synchronizing human respiration with the Himalayan canopy.
                </p>
                <div className="crt-minimal-stat-line" style={{ color: '#10b981' }}>
                  <span className="crt-minimal-stat-pill" style={{ background: 'rgba(16, 185, 129, 0.22)', color: '#34d399' }}>
                    AQI 22 · PRISTINE
                  </span>
                  <span style={{ color: '#94a3b8' }}>Alveolar Flux: 98.8% Optimal</span>
                </div>
                <button onClick={onExploreTwin} className="crt-minimal-cta">
                  <span>Explore India National AQI Heatmap</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>

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
