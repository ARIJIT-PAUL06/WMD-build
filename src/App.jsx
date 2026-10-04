import React, { useRef, useState } from 'react';
import PanoramicScrollHero from './components/MotionHero/PanoramicScrollHero';
import DelhiAqiHeatmap from './components/Heatmap/DelhiAqiHeatmap';
import AutonomousMonitorModal from './components/Dashboard/AutonomousMonitorModal';
import AtmosphericCargoTruck from './components/CargoTruck/AtmosphericCargoTruck';
import { ShieldCheck, FileText } from 'lucide-react';

export default function App() {
  const heatmapRef = useRef(null);
  const [isGlobalMonitorOpen, setIsGlobalMonitorOpen] = useState(false);

  const isMapOnly = typeof window !== 'undefined' && (
    window.location.search.includes('view=map') ||
    window.location.search.includes('map=true') ||
    window.location.hash === '#heatmap'
  );

  const scrollToHeatmap = () => {
    if (heatmapRef.current) {
      heatmapRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (isMapOnly) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#070a12', overflow: 'hidden' }}>
        <DelhiAqiHeatmap />
        <AutonomousMonitorModal
          isOpen={isGlobalMonitorOpen}
          onClose={() => setIsGlobalMonitorOpen(false)}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#070a12' }}>
      {/* Floating Global Quick Launch Toolbar */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <a
          href="/vayuvitals_executive_system_report.pdf"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 41, 59, 0.95) 100%)',
            border: '1.5px solid rgba(148, 163, 184, 0.4)',
            color: '#f1f5f9',
            padding: '8px 14px',
            borderRadius: '9999px',
            fontSize: '0.78rem',
            fontWeight: 700,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(12px)',
            transition: 'transform 0.2s, border-color 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.borderColor = '#38bdf8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1.0)'; e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.4)'; }}
          title="Open Executive System Architecture & Prediction Engine v2 PDF Report"
        >
          <FileText size={15} color="#38bdf8" />
          <span>System Report PDF</span>
        </a>

        <button
          onClick={() => setIsGlobalMonitorOpen(true)}
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(2, 132, 199, 0.88) 100%)',
            border: '1.5px solid rgba(56, 189, 248, 0.5)',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: '9999px',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.25)',
            backdropFilter: 'blur(12px)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
          title="Open Autonomous Atmospheric Shield Test Bench"
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
          <ShieldCheck size={16} color="#38bdf8" />
          <span>Autonomous Monitor</span>
        </button>
      </div>

      {/* 1. MOTION HERO: Horizontal Scroll-Scrub Experience */}
      <PanoramicScrollHero onExploreTwin={scrollToHeatmap} />

      {/* 2. MODERN AQI SPATIAL HEATMAP OF DELHI */}
      <div ref={heatmapRef}>
        <DelhiAqiHeatmap />
      </div>

      {/* 3. ATMOSPHERIC LOGISTICS & MASS CARGO TRUCK */}
      <AtmosphericCargoTruck />

      {/* Autonomous Atmospheric Shield & Emergency Monitor Test Bench */}
      <AutonomousMonitorModal
        isOpen={isGlobalMonitorOpen}
        onClose={() => setIsGlobalMonitorOpen(false)}
      />
    </div>
  );
}

