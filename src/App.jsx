import React, { useRef, useState, useEffect } from 'react';
import PanoramicScrollHero from './components/MotionHero/PanoramicScrollHero';
import DelhiAqiHeatmap from './components/Heatmap/DelhiAqiHeatmap';
import AutonomousMonitorModal from './components/Dashboard/AutonomousMonitorModal';
import AtmosphericCargoTruck from './components/CargoTruck/AtmosphericCargoTruck';
import PollutantDetailPage from './components/PollutantDetail/PollutantDetailPage';

export default function App() {
  const heatmapRef = useRef(null);
  const checkIsMonitorRequested = () => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    return (
      params.get('shield') === 'true' ||
      params.get('testbench') === 'true' ||
      params.get('monitor') === 'true' ||
      params.get('view') === 'shield' ||
      params.get('view') === 'testbench' ||
      params.get('view') === 'monitor' ||
      hash === '#shield' ||
      hash === '#testbench' ||
      hash === '#monitor' ||
      path === '/shield' ||
      path === '/testbench' ||
      path === '/monitor'
    );
  };

  const [isGlobalMonitorOpen, setIsGlobalMonitorOpen] = useState(checkIsMonitorRequested);

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
      setIsGlobalMonitorOpen(checkIsMonitorRequested());
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const handleCloseMonitor = () => {
    setIsGlobalMonitorOpen(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      url.searchParams.delete('shield');
      url.searchParams.delete('testbench');
      url.searchParams.delete('monitor');
      if (['shield', 'testbench', 'monitor'].includes(url.searchParams.get('view'))) {
        url.searchParams.delete('view');
      }
      if (['#shield', '#testbench', '#monitor'].includes(url.hash.toLowerCase())) {
        url.hash = '';
      }
      window.history.pushState({}, '', url);
    }
  };

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
          onClose={handleCloseMonitor}
        />
      </div>
    );
  }

  // Render Dedicated Pollutant Deep-Dive Intelligence Page when active
  if (activePollutant) {
    return (
      <>
        <PollutantDetailPage
          pollutantId={activePollutant}
          onBack={handleBackToTruck}
          onSelectPollutant={handleSelectPollutant}
        />
        <AutonomousMonitorModal
          isOpen={isGlobalMonitorOpen}
          onClose={handleCloseMonitor}
        />
      </>
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
        onClose={handleCloseMonitor}
      />
    </div>
  );
}
