import React, { useRef } from 'react';
import PanoramicScrollHero from './components/MotionHero/PanoramicScrollHero';
import DelhiAqiHeatmap from './components/Heatmap/DelhiAqiHeatmap';

export default function App() {
  const heatmapRef = useRef(null);
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
      </div>
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
    </div>
  );
}
