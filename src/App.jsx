import React, { useRef, useState, useEffect } from 'react';
import { Film, MapPin, Truck } from 'lucide-react';
import PanoramicScrollHero from './components/MotionHero/PanoramicScrollHero';
import DelhiAqiHeatmap from './components/Heatmap/DelhiAqiHeatmap';
import AutonomousMonitorModal from './components/Dashboard/AutonomousMonitorModal';
import AtmosphericCargoTruck from './components/CargoTruck/AtmosphericCargoTruck';
import PollutantDetailPage from './components/PollutantDetail/PollutantDetailPage';
import SchoolSafetyContainer from './components/SchoolSafety/SchoolSafetyContainer';
import PollutantDocumentary from './components/PollutantDocumentary/PollutantDocumentary';

export default function App() {
  const heatmapRef = useRef(null);
  const checkIsMonitorRequested = () => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const hash = (window.location.hash || '').toLowerCase();
    const path = (window.location.pathname || '').toLowerCase();
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
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 1024 : false));
  const [activeMobileTab, setActiveMobileTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#heatmap' || hash === '#map' || hash === '#controls' || hash === '#hud' || hash === '#burger') return 'map';
      if (hash === '#cargo' || hash === '#truck') return 'cargo';
    }
    return 'story';
  });
  const [isMapDrawerOpen, setIsMapDrawerOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Active Pollutant Detail Page State with URL Deep-Linking & History API
  const [activePollutant, setActivePollutant] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('pollutant') || null;
    }
    return null;
  });

  // Cinematic Pollutant Documentary State
  const checkDocumentaryState = () => {
    if (typeof window === 'undefined') return { isOpen: false, pollutantId: null };
    const params = new URLSearchParams(window.location.search);
    const hash = (window.location.hash || '').toLowerCase();
    const docParam = params.get('documentary');
    const viewParam = params.get('view');
    const pollutantParam = params.get('pollutant');

    if (docParam != null || viewParam === 'documentary' || hash.startsWith('#documentary')) {
      let polId = 'pm25';
      if (docParam && docParam !== 'true' && docParam !== 'landing') {
        polId = docParam;
      } else if (pollutantParam) {
        polId = pollutantParam;
      }
      return { isOpen: true, pollutantId: polId };
    }
    return { isOpen: false, pollutantId: null };
  };

  const [documentaryState, setDocumentaryState] = useState(checkDocumentaryState);

  // Synchronize browser history (back / forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.toLowerCase();
      setActivePollutant(params.get('pollutant') || null);
      setDocumentaryState(checkDocumentaryState());
      setIsGlobalMonitorOpen(checkIsMonitorRequested());
      if (hash === '#heatmap' || hash === '#map' || hash === '#controls' || hash === '#hud' || hash === '#burger') {
        setActiveMobileTab('map');
      } else if (hash === '#cargo' || hash === '#truck') {
        setActiveMobileTab('cargo');
      } else if (hash === '#story' || hash === '#hero') {
        setActiveMobileTab('story');
      }
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
      if (isMobile) {
        setActiveMobileTab('cargo');
      } else {
        setTimeout(() => {
          const truckEl = document.getElementById('atmospheric-cargo-section');
          if (truckEl) {
            truckEl.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    }
  };

  const handleOpenDocumentary = (pollutantId = 'pm25') => {
    const targetPollutant = pollutantId && pollutantId !== 'true' && pollutantId !== 'landing' ? pollutantId : 'pm25';
    setDocumentaryState({ isOpen: true, pollutantId: targetPollutant });
    if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      url.searchParams.set('documentary', targetPollutant);
      window.history.pushState({}, '', url);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCloseDocumentary = () => {
    setDocumentaryState({ isOpen: false, pollutantId: null });
    if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      url.searchParams.delete('documentary');
      if (url.searchParams.get('view') === 'documentary') {
        url.searchParams.delete('view');
      }
      if (url.hash.startsWith('#documentary')) {
        url.hash = '';
      }
      window.history.pushState({}, '', url);
      if (isMobile) {
        setActiveMobileTab('cargo');
      } else {
        setTimeout(() => {
          const truckEl = document.getElementById('atmospheric-cargo-section');
          if (truckEl) {
            truckEl.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    }
  };

  const handleDocumentarySelectPollutant = (pollutantId = 'pm25') => {
    const targetPollutant = pollutantId && pollutantId !== 'true' && pollutantId !== 'landing' ? pollutantId : 'pm25';
    setDocumentaryState({ isOpen: true, pollutantId: targetPollutant });
    if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      url.searchParams.set('documentary', targetPollutant);
      window.history.pushState({}, '', url);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isSchoolView = typeof window !== 'undefined' && (
    window.location.search.includes('view=school') ||
    window.location.hash === '#school'
  );
  const isMapOnly = typeof window !== 'undefined' && (
    window.location.search.includes('view=map') ||
    window.location.search.includes('map=true') ||
    window.location.hash === '#heatmap'
  );

  const scrollToHeatmap = () => {
    if (isMobile) {
      setActiveMobileTab('map');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (heatmapRef.current) {
      heatmapRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (isSchoolView) {
    return (
      <SchoolSafetyContainer
        onBackToMap={() => {
          if (typeof window !== 'undefined') {
            window.location.search = '?view=map';
          }
        }}
      />
    );
  }

  // Render Full-Screen Cinematic Pollutant Documentary Experience when active
  if (documentaryState.isOpen) {
    return (
      <PollutantDocumentary
        pollutantId={documentaryState.pollutantId}
        onBack={handleCloseDocumentary}
        onSelectPollutant={handleDocumentarySelectPollutant}
      />
    );
  }

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

  // Mobile Experience: Tabbed View Switcher to eliminate touch-scroll traps
  if (isMobile) {
    return (
      <div style={{ width: '100%', minHeight: '100vh', background: '#070a12', position: 'relative' }}>
        {activeMobileTab === 'story' && (
          <div style={{ paddingBottom: '74px' }}>
            <PanoramicScrollHero onExploreTwin={() => setActiveMobileTab('map')} />
          </div>
        )}

        {activeMobileTab === 'map' && (
          <div style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden' }}>
            <DelhiAqiHeatmap onDrawerChange={setIsMapDrawerOpen} />
          </div>
        )}

        {activeMobileTab === 'cargo' && (
          <div style={{ paddingBottom: '74px' }}>
            <AtmosphericCargoTruck
              onSelectPollutant={handleSelectPollutant}
              onOpenDocumentary={handleOpenDocumentary}
            />
          </div>
        )}

        {/* Floating Mobile Bottom Tab Bar */}
        <nav
          className={`mobile-app-nav-bar ${(isMapDrawerOpen || isGlobalMonitorOpen) ? 'hidden' : ''}`}
          aria-label="Mobile Navigation"
        >
          <button
            id="mobile-tab-story"
            className={`mobile-app-nav-btn ${activeMobileTab === 'story' ? 'active' : ''}`}
            onClick={() => {
              setActiveMobileTab('story');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <Film size={18} />
            <span>Story</span>
          </button>

          <button
            id="mobile-tab-map"
            className={`mobile-app-nav-btn ${activeMobileTab === 'map' ? 'active' : ''}`}
            onClick={() => {
              setActiveMobileTab('map');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <MapPin size={18} />
            <span>Live Map</span>
          </button>

          <button
            id="mobile-tab-cargo"
            className={`mobile-app-nav-btn ${activeMobileTab === 'cargo' ? 'active' : ''}`}
            onClick={() => {
              setActiveMobileTab('cargo');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <Truck size={18} />
            <span>Cargo Hauler</span>
          </button>
        </nav>

        {/* Autonomous Atmospheric Shield & Emergency Monitor Test Bench */}
        <AutonomousMonitorModal
          isOpen={isGlobalMonitorOpen}
          onClose={handleCloseMonitor}
        />
      </div>
    );
  }

  // Desktop Experience: Continuous 3-Section Vertical Long-Scroll (100% untouched)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#070a12' }}>
      {/* 1. MOTION HERO: Horizontal Scroll-Scrub Experience */}
      <PanoramicScrollHero onExploreTwin={scrollToHeatmap} />

      {/* 2. MODERN AQI SPATIAL HEATMAP OF DELHI */}
      <div ref={heatmapRef}>
        <DelhiAqiHeatmap />
      </div>

      {/* 3. ATMOSPHERIC LOGISTICS & MASS CARGO TRUCK */}
      <AtmosphericCargoTruck
        onSelectPollutant={handleSelectPollutant}
        onOpenDocumentary={handleOpenDocumentary}
      />

      {/* Autonomous Atmospheric Shield & Emergency Monitor Test Bench */}
      <AutonomousMonitorModal
        isOpen={isGlobalMonitorOpen}
        onClose={handleCloseMonitor}
      />
    </div>
  );
}

