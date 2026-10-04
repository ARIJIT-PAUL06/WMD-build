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

        {/* ============================================================== */}
        {/* DYNAMIC SCROLL-DRIVEN STORYTELLING OVERLAYS                     */}
        {/* ============================================================== */}

        {/* Phase 1: Left / Smog Crisis & Destroyed Delhi */}
        <div
          className="crt-perspective-stage-left"
          style={{
            position: 'absolute',
            left: '6vw',
            bottom: '12vh',
            maxWidth: '520px',
            width: '90%',
            zIndex: 20,
            opacity: isLeftPhase ? 1 - scrollProgress * 2.2 : 0,
            transform: `translateY(${scrollProgress * 50}px)`,
            transition: 'opacity 0.4s ease, transform 0.4s ease',
            pointerEvents: isLeftPhase ? 'auto' : 'none',
          }}
        >
          <div className="crt-curved-card crt-card-left">
            <div className="crt-card-content">
              {/* Telemetry Header */}
              <div className="crt-card-header">
                <span className="crt-station-tag" style={{ color: '#f87171' }}>
                  <Flame size={12} /> DL-ANANDVIHAR-04 • SEVERE INVERSION
                </span>
                <span className="crt-coords-tag">28.6469°N, 77.3160°E • ELEV 214M</span>
              </div>

              {/* Status Badge Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(239, 68, 68, 0.22)',
                    color: '#f87171',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  <AlertTriangle size={11} />
                  HAZARDOUS SMOG INVERSION
                </span>
                <span style={{ fontSize: '0.74rem', color: '#ef4444', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                  AQI: 486 · SEVERE
                </span>
              </div>

              {/* Title */}
              <h1
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '2.2rem',
                  fontWeight: 800,
                  lineHeight: 1.15,
                  color: '#ffffff',
                  margin: '6px 0 10px',
                  letterSpacing: '-0.02em',
                }}
              >
                The Urban Chokehold
              </h1>

              {/* Body Narrative */}
              <p style={{ fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.58, marginBottom: '12px' }}>
                Dense stubble burning plumes and vehicular nitrates remain trapped beneath a rigid 140m thermal ceiling. Sub-micron particulate deposits directly into alveolar walls, turning bronchial pathways into blackened, decaying branches.
              </p>

              {/* Dynamic Segmented Gauge Bar */}
              <div className="crt-gauge-container">
                <div className="crt-gauge-header">
                  <span style={{ color: '#94a3b8' }}>PM2.5 TOXIC LOAD</span>
                  <span style={{ color: '#ef4444' }}>486 µg/m³ [19.4× WHO LIMIT]</span>
                </div>
                <div className="crt-gauge-track">
                  <div
                    className="crt-gauge-fill"
                    style={{
                      width: '94%',
                      background: 'linear-gradient(90deg, #f59e0b 0%, #ef4444 65%, #991b1b 100%)',
                      boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)',
                    }}
                  />
                </div>
              </div>

              {/* Telemetry Mini Data Grid */}
              <div className="crt-telemetry-grid">
                <div className="crt-telemetry-chip">
                  <span className="crt-telemetry-chip-label">Airway Decay</span>
                  <span className="crt-telemetry-chip-value" style={{ color: '#fca5a5' }}>+88% Spasm</span>
                </div>
                <div className="crt-telemetry-chip">
                  <span className="crt-telemetry-chip-label">Inversion Deck</span>
                  <span className="crt-telemetry-chip-value" style={{ color: '#fca5a5' }}>140M Trap</span>
                </div>
                <div className="crt-telemetry-chip">
                  <span className="crt-telemetry-chip-label">Acute Risk</span>
                  <span className="crt-telemetry-chip-value" style={{ color: '#ef4444' }}>CRITICAL</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Phase 2: Center / The Restoration & Turning Point */}
        <div
          className="crt-perspective-stage-center"
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '12vh',
            transform: 'translateX(-50%)',
            maxWidth: '540px',
            width: '92%',
            zIndex: 20,
            opacity: isMidPhase ? 1 - Math.abs(scrollProgress - 0.52) * 4 : 0,
            transition: 'opacity 0.4s ease',
            pointerEvents: isMidPhase ? 'auto' : 'none',
          }}
        >
          <div className="crt-curved-card crt-card-center">
            <div className="crt-card-content">
              {/* Telemetry Header */}
              <div className="crt-card-header">
                <span className="crt-station-tag" style={{ color: '#fbbf24' }}>
                  <Activity size={12} /> AWS IOT TWIN • MITIGATION MATRIX
                </span>
                <span className="crt-coords-tag">AUTONOMOUS DISPATCH ACTIVE</span>
              </div>

              {/* Status Badge Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(245, 158, 11, 0.22)',
                    color: '#fbbf24',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  <Gauge size={11} />
                  CRITICAL EQUILIBRIUM
                </span>
                <span style={{ fontSize: '0.74rem', color: '#f59e0b', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                  AQI: 142 · MODERATE
                </span>
              </div>

              {/* Title */}
              <h2
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '2.1rem',
                  fontWeight: 800,
                  lineHeight: 1.15,
                  color: '#ffffff',
                  margin: '6px 0 10px',
                  letterSpacing: '-0.02em',
                }}
              >
                The Turning Point
              </h2>

              {/* Body Narrative */}
              <p style={{ fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.58, marginBottom: '12px' }}>
                Between toxic stagnation and atmospheric renewal lies the critical intervention barrier. Real-time predictive ML orchestrates targeted anti-smog mist cannons and unlocks clean air corridors, stabilizing air before cellular damage becomes permanent.
              </p>

              {/* Dynamic Segmented Gauge Bar */}
              <div className="crt-gauge-container">
                <div className="crt-gauge-header">
                  <span style={{ color: '#94a3b8' }}>CORRIDOR STABILIZATION</span>
                  <span style={{ color: '#fbbf24' }}>58% STABILIZED [TRANSITION]</span>
                </div>
                <div className="crt-gauge-track">
                  <div
                    className="crt-gauge-fill"
                    style={{
                      width: '58%',
                      background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 55%, #10b981 100%)',
                      boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)',
                    }}
                  />
                </div>
              </div>

              {/* Telemetry Mini Data Grid */}
              <div className="crt-telemetry-grid">
                <div className="crt-telemetry-chip">
                  <span className="crt-telemetry-chip-label">AI SageMaker</span>
                  <span className="crt-telemetry-chip-value" style={{ color: '#fde68a' }}>Active Sync</span>
                </div>
                <div className="crt-telemetry-chip">
                  <span className="crt-telemetry-chip-label">Corridor Shield</span>
                  <span className="crt-telemetry-chip-value" style={{ color: '#fde68a' }}>2.4 KM Bio-Gate</span>
                </div>
                <div className="crt-telemetry-chip">
                  <span className="crt-telemetry-chip-label">Wind Vector</span>
                  <span className="crt-telemetry-chip-value" style={{ color: '#fbbf24' }}>4.8 KM/H WNW</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Phase 3: Right / The Living Canopy & Clean Air */}
        <div
          className="crt-perspective-stage-right"
          style={{
            position: 'absolute',
            right: '6vw',
            bottom: '12vh',
            maxWidth: '520px',
            width: '90%',
            zIndex: 20,
            opacity: isRightPhase ? (scrollProgress - 0.65) * 2.8 : 0,
            transform: `translateY(${(1 - scrollProgress) * 50}px)`,
            transition: 'opacity 0.4s ease, transform 0.4s ease',
            pointerEvents: isRightPhase ? 'auto' : 'none',
          }}
        >
          <div className="crt-curved-card crt-card-right">
            <div className="crt-card-content">
              {/* Telemetry Header */}
              <div className="crt-card-header">
                <span className="crt-station-tag" style={{ color: '#34d399' }}>
                  <Sparkles size={12} /> SECTOR 09 • WESTERN HIMALAYAN CANOPY
                </span>
                <span className="crt-coords-tag">30.3165°N, 78.0322°E • ELEV 640M</span>
              </div>

              {/* Status Badge Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(16, 185, 129, 0.22)',
                    color: '#34d399',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  <ShieldCheck size={11} />
                  NATURAL RESPIRATION
                </span>
                <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                  AQI: 22 · PRISTINE
                </span>
              </div>

              {/* Title */}
              <h2
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '2.2rem',
                  fontWeight: 800,
                  lineHeight: 1.15,
                  color: '#ffffff',
                  margin: '6px 0 10px',
                  letterSpacing: '-0.02em',
                }}
              >
                The Living Canopy
              </h2>

              {/* Body Narrative */}
              <p style={{ fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.58, marginBottom: '12px' }}>
                A healthy human lung processes 11,000 liters of atmospheric air daily. In pristine forest corridors, bronchial cilia oscillate in unhindered rhythm, fueling alveolar gas exchange in perfect synchrony with tree canopies.
              </p>

              {/* Dynamic Segmented Gauge Bar */}
              <div className="crt-gauge-container">
                <div className="crt-gauge-header">
                  <span style={{ color: '#94a3b8' }}>ALVEOLAR GAS EXCHANGE</span>
                  <span style={{ color: '#34d399' }}>98.6% CAPACITY [OPTIMAL]</span>
                </div>
                <div className="crt-gauge-track">
                  <div
                    className="crt-gauge-fill"
                    style={{
                      width: '98%',
                      background: 'linear-gradient(90deg, #059669 0%, #10b981 65%, #34d399 100%)',
                      boxShadow: '0 0 10px rgba(16, 185, 129, 0.6)',
                    }}
                  />
                </div>
              </div>

              {/* Telemetry Mini Data Grid */}
              <div className="crt-telemetry-grid">
                <div className="crt-telemetry-chip">
                  <span className="crt-telemetry-chip-label">Alveolar Flux</span>
                  <span className="crt-telemetry-chip-value" style={{ color: '#a7f3d0' }}>98.8% Flow</span>
                </div>
                <div className="crt-telemetry-chip">
                  <span className="crt-telemetry-chip-label">Bio-Scrubbing</span>
                  <span className="crt-telemetry-chip-value" style={{ color: '#a7f3d0' }}>4.8 T/Day</span>
                </div>
                <div className="crt-telemetry-chip">
                  <span className="crt-telemetry-chip-label">Canopy Grade</span>
                  <span className="crt-telemetry-chip-value" style={{ color: '#34d399' }}>PRISTINE</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={onExploreTwin}
                className="btn-primary"
                style={{
                  width: '100%',
                  marginTop: '16px',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.45)',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  letterSpacing: '0.02em',
                }}
              >
                <span>Explore India National AQI Heatmap</span>
                <ChevronRight size={16} />
              </button>
            </div>
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
