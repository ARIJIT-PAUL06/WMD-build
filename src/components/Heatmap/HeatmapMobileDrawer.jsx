import React from 'react';
import {
  Sliders,
  X,
  Navigation,
  Search,
  RefreshCw,
  MapPin,
  Layers,
  Sparkles,
  Map as MapIcon,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';

export default function HeatmapMobileDrawer({
  isMobileControlsOpen,
  handleCloseMobileControls,
  handleCenterOnUser,
  userLocation,
  INDIA_REGION_PRESETS,
  activePreset,
  handleGlideToRegion,
  setIsMobileControlsOpen,
  searchQuery,
  handleSearchInput,
  isSearching,
  searchResults,
  handleSelectSearchResult,
  showHeatmapLayer,
  setShowHeatmapLayer,
  isAdaptiveMode,
  setIsAdaptiveMode,
  showStateBorders,
  setShowStateBorders,
  showStationPins,
  setShowStationPins,
  is3DBuildings,
  setIs3DBuildings,
  heatIntensity,
  setHeatIntensity,
  setIsMonitorModalOpen,
}) {
  if (!isMobileControlsOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 55,
        background: 'rgba(3, 7, 18, 0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <div
        className="glass-panel-master"
        style={{
          width: '100%',
          maxHeight: '85vh',
          borderTopLeftRadius: '22px',
          borderTopRightRadius: '22px',
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderBottom: 'none',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -15px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(56, 189, 248, 0.15)',
          overflow: 'hidden',
          animation: 'slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={16} color="#d4a359" />
            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Map Controls & Layers
            </span>
          </div>
          <button
            id="close-mobile-controls-btn"
            onClick={handleCloseMobileControls}
            className="glass-pill"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: '#cbd5e1',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <X size={14} />
            <span>Close</span>
          </button>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* Section 1: Location & GPS Lock */}
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#d4a359', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              Location Mode
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCenterOnUser}
                className={`glass-cuboid-btn ${userLocation.isLiveGps ? 'glass-cuboid-btn-success' : ''}`}
                style={{ flex: 1, padding: '8px 12px', justifyContent: 'center' }}
              >
                <Navigation size={14} color={userLocation.isLiveGps ? '#e8c87a' : '#d4a359'} />
                <span>{userLocation.isLiveGps ? 'GPS Centered (Active)' : 'Lock Live GPS'}</span>
              </button>
            </div>
          </div>

          {/* Section 2: Capital City Glide */}
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#d4a359', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              Quick Glide Regions
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {INDIA_REGION_PRESETS.map((preset) => {
                const isActive = activePreset.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      handleGlideToRegion(preset);
                      setIsMobileControlsOpen(false);
                    }}
                    className={`glass-pill ${isActive ? 'glass-pill-active' : ''}`}
                    style={{
                      padding: '5px 11px',
                      borderRadius: '9999px',
                      fontSize: '0.7rem',
                      fontWeight: isActive ? 700 : 600,
                      cursor: 'pointer',
                    }}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Place Search Bar */}
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#d4a359', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              Search Location
            </span>
            <div
              className="glass-input"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '10px',
                padding: '8px 12px',
              }}
            >
              <Search size={14} color="#9c9180" />
              <input
                type="text"
                placeholder="Search house, society, PIN code across India..."
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ede6d6',
                  fontSize: '0.8rem',
                  width: '100%',
                }}
              />
              {isSearching && <RefreshCw size={12} className="animate-spin" color="#d4a359" />}
            </div>

            {searchResults.length > 0 && (
              <div
                className="glass-panel-sub"
                style={{
                  marginTop: '6px',
                  borderRadius: '10px',
                  maxHeight: '160px',
                  overflowY: 'auto',
                }}
              >
                {searchResults.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => {
                      handleSelectSearchResult(f);
                      setIsMobileControlsOpen(false);
                    }}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      borderBottom: '1px solid rgba(216, 196, 162, 0.08)',
                      fontSize: '0.74rem',
                    }}
                  >
                    <MapPin size={13} color="#d4a359" style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
                        <strong style={{ color: '#ede6d6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.text}</strong>
                        {f.badge && (
                          <span style={{
                            fontSize: '0.6rem',
                            padding: '1px 6px',
                            borderRadius: '999px',
                            background: 'rgba(217, 155, 65, 0.18)',
                            color: '#f3ce85',
                            border: '1px solid rgba(217, 155, 65, 0.35)',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}>
                            {f.badge}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.place_name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Map Layers */}
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#d4a359', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              Map Layers
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                onClick={() => setShowHeatmapLayer((v) => !v)}
                className={`glass-cuboid-btn ${showHeatmapLayer ? 'glass-cuboid-btn-active' : ''}`}
                style={{ padding: '8px 12px', justifyContent: 'center' }}
              >
                <Layers size={14} color={showHeatmapLayer ? '#f3ce85' : '#9c9180'} />
                <span>Heatmap: {showHeatmapLayer ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => setIsAdaptiveMode((v) => !v)}
                className={`glass-cuboid-btn ${isAdaptiveMode ? 'glass-cuboid-btn-success' : ''}`}
                style={{ padding: '8px 12px', justifyContent: 'center' }}
              >
                <Sparkles size={14} color={isAdaptiveMode ? '#edd18a' : '#9c9180'} />
                <span>Adaptive: {isAdaptiveMode ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => setShowStateBorders((v) => !v)}
                className={`glass-cuboid-btn ${showStateBorders ? 'glass-cuboid-btn-active' : ''}`}
                style={{ padding: '8px 12px', justifyContent: 'center' }}
              >
                <MapIcon size={14} color={showStateBorders ? '#f3ce85' : '#9c9180'} />
                <span>State Borders</span>
              </button>

              <button
                onClick={() => setShowStationPins((v) => !v)}
                className={`glass-cuboid-btn ${showStationPins ? 'glass-cuboid-btn-active' : ''}`}
                style={{ padding: '8px 12px', justifyContent: 'center' }}
              >
                {showStationPins ? <Eye size={14} color="#f3ce85" /> : <EyeOff size={14} color="#9c9180" />}
                <span>108 Station Pins</span>
              </button>

              <button
                onClick={() => setIs3DBuildings((v) => !v)}
                className={`glass-cuboid-btn ${is3DBuildings ? 'glass-cuboid-btn-active' : ''}`}
                style={{ gridColumn: 'span 2', padding: '8px 12px', justifyContent: 'center' }}
              >
                <span>3D Urban Extrusions: {is3DBuildings ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {/* Section 5: Atmospheric Heat Opacity */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#d4a359', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Heat Layer Opacity
              </span>
              <span style={{ color: '#f3ce85', fontWeight: 700, fontSize: '0.8rem' }}>
                {Math.round(heatIntensity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.85"
              step="0.02"
              value={heatIntensity}
              onChange={(e) => setHeatIntensity(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#d4a359', cursor: 'pointer', marginBottom: '8px' }}
            />
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { label: '35% Subtle', val: 0.35 },
                { label: '55% Balanced', val: 0.55 },
                { label: '75% Vivid', val: 0.75 },
              ].map((p) => (
                <button
                  key={p.val}
                  onClick={() => setHeatIntensity(p.val)}
                  className={`glass-pill ${Math.abs(heatIntensity - p.val) < 0.05 ? 'glass-pill-active' : ''}`}
                  style={{ flex: 1, padding: '4px 6px', fontSize: '0.68rem', textAlign: 'center', cursor: 'pointer' }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 6: Autonomous Shield Test Bench */}
          <div style={{ marginTop: '8px' }}>
            <button
              id="mobile-launch-shield-btn"
              onClick={() => {
                setIsMobileControlsOpen(false);
                setIsMonitorModalOpen(true);
              }}
              className="glass-pill glass-pill-active"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, rgba(200, 145, 55, 0.45) 0%, rgba(160, 105, 30, 0.35) 100%)',
                border: '1px solid rgba(225, 175, 85, 0.5)',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <ShieldCheck size={16} color="#f3ce85" />
              <span>Launch Autonomous Shield Test Bench ►</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
