import React from 'react';
import {
  Crosshair,
  Layers,
  Sparkles,
  Map as MapIcon,
  MapPin,
  Building2,
  Sliders,
  FileText,
  ShieldCheck
} from 'lucide-react';

export default function HeatmapControlsDeck({
  isMobile,
  isSidebarOpen,
  getPanelClass,
  getBtnFlickerClass,
  getBtnFlickerStyle,
  showHeatmapLayer,
  setShowHeatmapLayer,
  isAdaptiveMode,
  setIsAdaptiveMode,
  activeRange,
  showStateBorders,
  setShowStateBorders,
  showStationPins,
  setShowStationPins,
  is3DBuildings,
  setIs3DBuildings,
  mapInstanceRef,
  heatIntensity,
  setHeatIntensity,
  setIsPetitionModalOpen,
  displayStation,
  setPetitionStation,
  setPetitionLocality,
  setPetitionPm25
}) {
  if (isMobile) return null;

  return (
    <div
      className={`glass-panel-master ${getPanelClass()}`}
      style={{
        position: 'absolute',
        bottom: isMobile ? '20px' : '52px',
        left: isMobile ? '12px' : '24px',
        right: isMobile ? '12px' : (isSidebarOpen ? '444px' : '24px'),
        maxWidth: isMobile ? 'calc(100% - 24px)' : (isSidebarOpen ? 'calc(100% - 468px)' : 'calc(100% - 48px)'),
        zIndex: 25,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: isMobile ? '8px 12px' : '11px 16px',
        borderRadius: '16px',
        maxHeight: isMobile ? '38vh' : 'none',
        overflowY: isMobile ? 'auto' : 'visible',
        transition: 'right 0.35s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Click hint & Telemetry status row */}
      <div className={getBtnFlickerClass()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', ...getBtnFlickerStyle(520) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#cbd5e1' }}>
          <Crosshair size={12} color="#f43f5e" />
          <span>Click anywhere on map for <strong style={{ color: '#f43f5e' }}>micro-zone AQI</strong></span>
        </div>
        {!isSidebarOpen && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.68rem', color: '#94a3b8' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
              108 Ground Monitoring Stations Active
            </span>
          </div>
        )}
      </div>

      <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', width: '100%' }} />

      {/* TIER 1: PRIMARY MAP LAYERS & DISPLAY MODES */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span className={getBtnFlickerClass()} style={{ fontSize: '0.68rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: '2px', ...getBtnFlickerStyle(640) }}>
          Layers:
        </span>

        {/* Heatmap Layer Toggle */}
        <button
          onClick={() => setShowHeatmapLayer((v) => !v)}
          className={`glass-cuboid-btn ${showHeatmapLayer ? 'glass-cuboid-btn-active' : ''} ${getBtnFlickerClass()}`}
          style={getBtnFlickerStyle(760)}
          title="Toggle spatial continuous IDW air quality heatmap layer"
        >
          <Layers size={14} color={showHeatmapLayer ? '#38bdf8' : '#94a3b8'} />
          <span>Heatmap</span>
        </button>

        {/* Adaptive Contrast Mode Toggle */}
        <button
          onClick={() => setIsAdaptiveMode((v) => !v)}
          title="Dynamically recalibrate palette: lowest visible AQI becomes green, highest becomes bright red as you zoom in"
          className={`glass-cuboid-btn ${isAdaptiveMode ? 'glass-cuboid-btn-success' : ''} ${getBtnFlickerClass()}`}
          style={getBtnFlickerStyle(880)}
        >
          <Sparkles size={14} color={isAdaptiveMode ? '#34d399' : '#94a3b8'} />
          <span>Adaptive</span>
          {isAdaptiveMode && activeRange.isZoomed && (
            <span
              style={{
                background: '#10b981',
                color: '#040711',
                fontSize: '9px',
                fontWeight: 800,
                padding: '1px 5px',
                borderRadius: '4px',
                marginLeft: '2px',
              }}
            >
              ZOOMED
            </span>
          )}
        </button>

        {/* State Borders Toggle */}
        <button
          onClick={() => setShowStateBorders((v) => !v)}
          className={`glass-cuboid-btn ${showStateBorders ? 'glass-cuboid-btn-active' : ''} ${getBtnFlickerClass()}`}
          style={getBtnFlickerStyle(1000)}
          title="Toggle official Survey of India administrative state borders"
        >
          <MapIcon size={14} color={showStateBorders ? '#38bdf8' : '#94a3b8'} />
          <span>Borders</span>
        </button>

        {/* 108 Monitoring Pins Toggle */}
        <button
          onClick={() => setShowStationPins((v) => !v)}
          className={`glass-cuboid-btn ${showStationPins ? 'glass-cuboid-btn-active' : ''} ${getBtnFlickerClass()}`}
          style={getBtnFlickerStyle(1120)}
          title="Toggle 108 nationwide ground monitoring stations"
        >
          <MapPin size={13} color={showStationPins ? '#38bdf8' : '#94a3b8'} />
          <span>Stations</span>
        </button>

        {/* 3D Buildings Toggle */}
        <button
          onClick={() => {
            setIs3DBuildings((v) => {
              const next = !v;
              const map = mapInstanceRef.current;
              if (map && next && map.getPitch() < 20) {
                map.easeTo({ pitch: 55, duration: 800 });
              }
              return next;
            });
          }}
          className={`glass-cuboid-btn ${is3DBuildings ? 'glass-cuboid-btn-active' : ''} ${getBtnFlickerClass()}`}
          style={getBtnFlickerStyle(1240)}
          title="Toggle 3D urban building extrusions and tilt camera"
        >
          <Building2 size={13} color={is3DBuildings ? '#38bdf8' : '#94a3b8'} />
          <span>3D City</span>
        </button>

        {/* Section 10: Civic Action & Formal Petition Generator */}
        <button
          onClick={() => {
            if (setPetitionStation && displayStation) {
              setPetitionStation(displayStation?.name || 'DTU (Delhi Technological University)');
              setPetitionLocality(displayStation?.zone ? `${displayStation.name}, ${displayStation.zone}` : 'Rohini Sector 16, North Delhi');
              setPetitionPm25(displayStation?.pm25 || displayStation?.aqi || 142);
            }
            if (setIsPetitionModalOpen) setIsPetitionModalOpen(true);
          }}
          id="petition-action-deck-btn"
          title="Transform air quality telemetry into a formal civic complaint or school petition"
          className="glass-cuboid-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#34d399',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(6, 182, 212, 0.22) 100%)',
            border: '1px solid rgba(52, 211, 153, 0.45)',
            padding: '6px 13px',
            borderRadius: '9px',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <FileText size={13} color="#34d399" />
          <span>Petition & Action</span>
        </button>

        {/* SafeRecess™ School Safety Launcher Button */}
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              const url = new URL(window.location);
              url.searchParams.set('view', 'school');
              window.history.pushState({}, '', url);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
          }}
          id="school-safety-deck-btn"
          title="SafeRecess™ School Safety Dashboard & Activity Guidance"
          className="glass-cuboid-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#38bdf8',
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.22) 0%, rgba(99, 102, 241, 0.22) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.45)',
            padding: '6px 13px',
            borderRadius: '9px',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <ShieldCheck size={13} color="#38bdf8" />
          <span>School Safety</span>
        </button>
      </div>

      {/* HAIRLINE DIVIDER */}
      <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', width: '100%' }} />

      {/* TIER 2: ATMOSPHERIC HEAT OPACITY CONTROLS & PRESETS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div className={getBtnFlickerClass()} style={{ display: 'flex', alignItems: 'center', gap: '7px', ...getBtnFlickerStyle(1380) }}>
          <Sliders size={13} color="#38bdf8" />
          <span style={{ color: '#cbd5e1', fontWeight: 600, fontSize: '0.72rem' }}>Heat Opacity:</span>
          <input
            type="range"
            min="0.10"
            max="0.85"
            step="0.02"
            value={heatIntensity}
            onChange={(e) => setHeatIntensity(parseFloat(e.target.value))}
            style={{ width: '70px', accentColor: '#38bdf8', cursor: 'pointer' }}
          />
          <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.74rem', minWidth: '32px' }}>
            {Math.round(heatIntensity * 100)}%
          </span>
        </div>

        {/* Quick Opacity Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className={getBtnFlickerClass()} style={{ color: '#cbd5e1', fontSize: '0.68rem', marginRight: '2px', fontWeight: 600, ...getBtnFlickerStyle(1500) }}>Presets:</span>
          {[
            { label: 'Subtle', val: 0.28 },
            { label: 'Balanced', val: 0.45 },
            { label: 'Vivid', val: 0.68 },
          ].map((p, pIdx) => {
            const isSelected = Math.abs(heatIntensity - p.val) < 0.05;
            return (
              <button
                key={p.label}
                onClick={() => setHeatIntensity(p.val)}
                className={`glass-cuboid-btn ${isSelected ? 'glass-cuboid-btn-active' : ''} ${getBtnFlickerClass()}`}
                style={{
                  padding: '3px 9px',
                  borderRadius: '7px',
                  fontSize: '0.70rem',
                  ...getBtnFlickerStyle(1600 + pIdx * 100),
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
