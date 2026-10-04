import React, { useRef, useState, useEffect } from 'react';
import { ArrowDown, Wind, Sparkles, AlertTriangle, ShieldCheck, ChevronRight, Activity, Eye } from 'lucide-react';
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
        {/* FIXED CRT CURVED SCREEN FACEPLATE (DYNAMIC BULGE LENS)         */}
        {/* The screen lens is stationary; as you scroll, the picture      */}
        {/* slides through the center and bulges dynamically outward!      */}
        {/* ============================================================== */}
        <CrtScreenLensCanvas scrollProgress={scrollProgress} mousePos={mousePos} />

        {/* 1. Bulbous Spherical CRT Curvature Swell & Corner Blackout Frame */}
        <div className="hero-crt-screen-curvature" aria-hidden="true">
          {/* Authentic CRT Glass Faceplate Curvature Lens Highlight */}
          <div className="hero-crt-glass-glare" />
        </div>

        {/* 2. Vintage TV Rolling Screen Tear Band (Sweeps up and down) */}
        <div className="hero-crt-rolling-bar" aria-hidden="true" />

        {/* 3. Analog Phosphor Micro-Flicker Layer */}
        <div className="hero-crt-flicker-layer" aria-hidden="true" />

        {/* 4. Procedural Film Grain Overlay */}
        <div className="hero-grain-overlay" aria-hidden="true" />

        {/* 5. Micro-Scanline Optical Matrix (Crisp 1px CRT interlace lines) */}
        <div className="hero-scanline-matrix" aria-hidden="true" />

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

        {/* ============================================================== */}
        {/* DYNAMIC SCROLL-DRIVEN STORYTELLING OVERLAYS                     */}
        {/* ============================================================== */}

        {/* Phase 1: Left / Smog Crisis & Destroyed Delhi */}
        <div
          style={{
            position: 'absolute',
            left: '8vw',
            bottom: '14vh',
            maxWidth: '500px',
            zIndex: 20,
            opacity: isLeftPhase ? 1 - scrollProgress * 2.2 : 0,
            transform: `translateY(${scrollProgress * 60}px)`,
            transition: 'opacity 0.4s ease, transform 0.4s ease',
            pointerEvents: isLeftPhase ? 'auto' : 'none',
          }}
        >
          <div
            className="glass-panel"
            style={{
              padding: '24px 28px',
              border: '1px solid rgba(239, 68, 68, 0.45)',
              background: 'rgba(15, 10, 14, 0.85)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7), 0 0 30px rgba(239, 68, 68, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                <AlertTriangle size={12} />
                Hazardous Smog Inversion
              </span>
              <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}>AQI: 428 · Severe</span>
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '2.4rem',
                fontWeight: 800,
                lineHeight: 1.15,
                color: '#ffffff',
                marginBottom: '12px',
                letterSpacing: '-0.02em',
              }}
            >
              The Urban Crisis
            </h1>

            <p style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '16px' }}>
              Stubble burning, vehicular emissions, and thermal inversions turn Delhi's atmosphere toxic. Toxic particulate matter deposits deep into alveolar walls, turning bronchial pathways into blackened, decaying branches.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fca5a5' }}>
                <AlertTriangle size={16} /> Airway Constriction +88%
              </span>
              <span>•</span>
              <span>PM2.5 &gt; 250 µg/m³</span>
            </div>
          </div>
        </div>

        {/* Phase 2: Center / The Restoration & Turning Point */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '14vh',
            transform: 'translateX(-50%)',
            maxWidth: '520px',
            width: '90%',
            textAlign: 'center',
            zIndex: 20,
            opacity: isMidPhase ? 1 - Math.abs(scrollProgress - 0.52) * 4 : 0,
            transition: 'opacity 0.4s ease',
            pointerEvents: isMidPhase ? 'auto' : 'none',
          }}
        >
          <div
            className="glass-panel"
            style={{
              padding: '24px 28px',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              background: 'rgba(9, 13, 22, 0.8)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7), 0 0 30px rgba(245, 158, 11, 0.15)',
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700, marginBottom: '10px' }}>
              <Activity size={13} />
              THE CRITICAL THRESHOLD · AQI 142
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '2.1rem',
                fontWeight: 800,
                color: '#ffffff',
                marginBottom: '10px',
              }}
            >
              The Turning Point
            </h2>

            <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.6 }}>
              Between toxic exposure and clean atmospheric renewal lies the critical intervention zone—where real-time AI air monitoring, clean corridors, and rapid mitigation breathe life back into the urban ecosystem.
            </p>
          </div>
        </div>

        {/* Phase 3: Right / The Living Canopy & Clean Air */}
        <div
          style={{
            position: 'absolute',
            right: '8vw',
            bottom: '14vh',
            maxWidth: '500px',
            zIndex: 20,
            opacity: isRightPhase ? (scrollProgress - 0.65) * 2.8 : 0,
            transform: `translateY(${(1 - scrollProgress) * 60}px)`,
            transition: 'opacity 0.4s ease, transform 0.4s ease',
            pointerEvents: isRightPhase ? 'auto' : 'none',
          }}
        >
          <div
            className="glass-panel"
            style={{
              padding: '26px 30px',
              border: '1px solid rgba(16, 185, 129, 0.45)',
              background: 'rgba(9, 13, 22, 0.85)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8), 0 0 35px rgba(16, 185, 129, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                <Sparkles size={12} />
                Natural Respiration
              </span>
              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>AQI: 24 · Good</span>
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '2.4rem',
                fontWeight: 800,
                lineHeight: 1.15,
                color: '#ffffff',
                marginBottom: '12px',
                letterSpacing: '-0.02em',
              }}
            >
              The Living Canopy
            </h2>

            <p style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '18px' }}>
              Every healthy human lung processes 11,000 liters of air each day. In clean atmospheres, bronchial cilia oscillate in harmony, fueling alveolar gas exchange just like vibrant leaves converting light to life.
            </p>

            <button
              onClick={onExploreTwin}
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
                padding: '12px 20px',
              }}
            >
              <span>Explore India National AQI Heatmap</span>
              <ChevronRight size={16} />
            </button>
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
