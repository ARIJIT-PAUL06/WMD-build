import React, { useRef, useState, useEffect } from 'react';
import { ArrowDown, Wind, Sparkles, AlertTriangle, ShieldCheck, ChevronRight, Activity } from 'lucide-react';

/**
 * PanoramicScrollHero
 * Cinematic motion landing page:
 * - As the user scrolls vertically, the 32:9 panoramic image (spanning two 16:9 viewports)
 *   moves from left (pristine lush green tree-lung) to right (charcoal decaying tree-lung with smog).
 * - Synchronized narrative overlays and atmospheric lighting transitions.
 */
export default function PanoramicScrollHero({ onExploreTwin }) {
  const trackRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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

  const handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    setMousePos({ x, y });
  };

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
        {/* Hybrid Depth Vignette & Seamless Bottom Gradient Fade */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            pointerEvents: 'none',
            background: `radial-gradient(ellipse 90% 80% at center, transparent 45%, rgba(7, 10, 18, 0.55) 80%, rgba(7, 10, 18, 0.88) 100%), linear-gradient(to bottom, rgba(7, 10, 18, 0.35) 0%, transparent 15%, transparent 60%, rgba(7, 10, 18, 0.8) 85%, #070a12 100%), ${ambientBg}`,
            transition: 'background 0.5s ease',
          }}
        />

        {/* ============================================================== */}
        {/* ULTRA-WIDE PANORAMIC 32:9 STRIP (Spanning two 16:9 viewports)   */}
        {/* ============================================================== */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '200vw', // Spans two full 16:9 viewports side-by-side
            height: '100vh',
            transform: `translate3d(calc(-${scrollProgress * 50}% + ${mousePos.x * 0.3}px), ${mousePos.y * 0.3}px, 0)`,
            transition: 'transform 0.08s cubic-bezier(0.1, 0.9, 0.2, 1)',
            willChange: 'transform',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <img
            src="/lungs-panoramic.png"
            alt="Smog-Decayed Lungs vs Pristine Green Foliage Lungs"
            style={{
              width: '200vw',
              height: '100vh',
              objectFit: 'cover',
              objectPosition: 'center',
              filter: `contrast(1.08) brightness(${0.88 + scrollProgress * 0.12})`,
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
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
