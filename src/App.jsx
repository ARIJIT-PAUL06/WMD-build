import React, { useRef, useState, useEffect } from 'react';
import PanoramicScrollHero from './components/MotionHero/PanoramicScrollHero';
import DelhiAqiHeatmap from './components/Heatmap/DelhiAqiHeatmap';
import AutonomousMonitorModal from './components/Dashboard/AutonomousMonitorModal';
import AtmosphericCargoTruck from './components/CargoTruck/AtmosphericCargoTruck';
import PollutantDetailPage from './components/PollutantDetail/PollutantDetailPage';

export default function App() {
  const heatmapRef = useRef(null);
  const [isGlobalMonitorOpen, setIsGlobalMonitorOpen] = useState(false);

  // Active Pollutant Detail Page State with URL Deep-Linking & History API
  const [activePollutant, setActivePollutant] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('pollutant') || null;
    }
    return null;
  });

  // Synchronize browser history (back / forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setActivePollutant(params.get('pollutant') || null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectPollutant = (pollutantId) => {
    setActivePollutant(pollutantId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      url.searchParams.set('pollutant', pollutantId);
      window.history.pushState({}, '', url);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBackToTruck = () => {
    setActivePollutant(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      url.searchParams.delete('pollutant');
      window.history.pushState({}, '', url);
      setTimeout(() => {
        const truckEl = document.getElementById('atmospheric-cargo-section');
        if (truckEl) {
          truckEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

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

  // Render Dedicated Pollutant Deep-Dive Intelligence Page when active
  if (activePollutant) {
    return (
      <PollutantDetailPage
        pollutantId={activePollutant}
        onBack={handleBackToTruck}
        onSelectPollutant={handleSelectPollutant}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#070a12' }}>
      {/* 1. MOTION HERO: Horizontal Scroll-Scrub Experience */}
      <PanoramicScrollHero onExploreTwin={scrollToHeatmap} />

      {/* 2. MODERN AQI SPATIAL HEATMAP OF DELHI */}
      <div ref={heatmapRef}>
        <DelhiAqiHeatmap />
      </div>

      {/* 3. ATMOSPHERIC LOGISTICS & MASS CARGO TRUCK */}
      <AtmosphericCargoTruck onSelectPollutant={handleSelectPollutant} />

      {/* Autonomous Atmospheric Shield & Emergency Monitor Test Bench */}
      <AutonomousMonitorModal
        isOpen={isGlobalMonitorOpen}
        onClose={() => setIsGlobalMonitorOpen(false)}
      />
    </div>
  );
}
