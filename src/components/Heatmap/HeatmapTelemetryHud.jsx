import React from 'react';
import {
  Activity,
  ChevronRight,
  Crosshair,
  Radio,
  Navigation,
  Locate,
  RefreshCw
} from 'lucide-react';
import AqiSporeAura from './AqiSporeAura';
import AnimatedCounter from '../common/AnimatedCounter';

export default function HeatmapTelemetryHud({
  isMobile,
  isSidebarOpen,
  handleCloseSidebar,
  uiBootStage,
  activePollutant,
  inspectedPoint,
  setInspectedPoint,
  activeRange,
  userLocation,
  handleCenterOnUser,
  userColor,
  userAqiEstimate,
  nearestStation,
  startLiveGpsTracking,
  isLocating,
  gpsStatus,
  gpsError,
  displayStation,
  isLoadingAdvisory,
  geminiAdvisory,
  isAdaptiveMode,
  getPollutantValue,
  getPollutantMeta,
}) {
  return (
    <aside
      style={{
        position: 'absolute',
        top: isMobile ? '12px' : '20px',
        bottom: isMobile ? '12px' : '24px',
        right: isSidebarOpen ? (isMobile ? '12px' : '24px') : (isMobile ? '-105vw' : '-440px'),
        width: isMobile ? 'calc(100vw - 24px)' : 'min(410px, calc(100vw - 48px))',
        maxWidth: '430px',
        zIndex: isMobile ? 60 : 25,
        transition: 'right 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: isSidebarOpen ? 'auto' : 'none',
      }}
    >
      <div
        className={`glass-panel-master ${uiBootStage === 0 ? 'crt-ui-hidden' : ''}`}
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '20px',
          overflow: 'hidden',
        }}
      >
        {/* HUD Header Bar */}
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
            <Activity size={16} color="#38bdf8" />
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {activePollutant === 'aqi' ? 'Air Quality & Advisory HUD' : `${activePollutant.toUpperCase()} Atmospheric Telemetry HUD`}
            </span>
          </div>

          <button
            onClick={handleCloseSidebar}
            title="Hide telemetry panel to maximize map view"
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
            <span>Hide</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Scrollable HUD Content Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* 1. PINPOINT INSPECTION OR YOUR REAL-TIME GPS POSITION CARD */}
          {inspectedPoint ? (() => {
            const pVal = getPollutantValue(inspectedPoint, activePollutant);
            const color = getPollutantMeta(pVal, activePollutant, activeRange);
            return (
              <div
                className="glass-panel-sub"
                style={{
                  padding: '20px',
                  borderRadius: '16px',
                  border: `1px solid ${color.hex ? color.hex + '66' : 'rgba(244, 63, 94, 0.45)'}`,
                  boxShadow: `0 12px 30px rgba(0, 0, 0, 0.5), 0 0 25px ${color.hex ? color.hex + '22' : 'rgba(244, 63, 94, 0.1)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Crosshair size={16} color={color.hex || '#f43f5e'} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: color.hex || '#f43f5e', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Pinpoint Micro-Zone Analysis
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setInspectedPoint(null);
                      if (userLocation.isLiveGps) handleCenterOnUser();
                    }}
                    className="glass-pill"
                    style={{
                      fontSize: '0.7rem',
                      color: '#cbd5e1',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Reset to GPS
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '8px' }}>
                  <div style={{ position: 'relative', display: 'inline-flex' }}>
                    <AqiSporeAura color={color.hex} />
                    <span
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '3.85rem',
                        fontWeight: 900,
                        lineHeight: 1,
                        color: color.hex,
                        textShadow: `0 0 25px ${color.hex}55`,
                        zIndex: 1,
                      }}
                    >
                      {pVal}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: color.textHex }}>
                      {activePollutant.toUpperCase()} · {color.label}
                    </span>
                    <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>
                      {activeRange.isZoomed
                        ? `Calibrated to local zoom viewport (${activeRange.min} → ${activeRange.max} ${color.unit})`
                        : `Subcontinental spatial IDW estimate (${color.unit}) at clicked point`}
                    </p>
                  </div>
                </div>

                <div
                  className="glass-panel-sub"
                  style={{
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginTop: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '0.76rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Target Coordinates:</span>
                    <span style={{ color: '#ffffff', fontFamily: 'monospace', fontWeight: 600 }}>
                      {inspectedPoint.lat}° N, {inspectedPoint.lon}° E
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>{activePollutant.toUpperCase()} Concentration:</span>
                    <strong style={{ color: color.textHex }}>{pVal} {color.unit}</strong>
                  </div>
                  {activePollutant !== 'aqi' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                      <span>Equivalent Overall AQI:</span>
                      <strong style={{ color: '#38bdf8' }}>{inspectedPoint.aqi} AQI</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Nearest Ground Station:</span>
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                      {inspectedPoint?.nearestStation
                        ? `${(typeof inspectedPoint.nearestStation === 'string' ? inspectedPoint.nearestStation.split('(')[0]?.trim() : inspectedPoint.nearestStation) || 'Monitoring Node'} (${inspectedPoint.distanceKm ?? 0} km)`
                        : 'Nearby Monitoring Station'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })() : userLocation.isLiveGps && userLocation.lat && userLocation.lon ? (
            <div
              className="glass-panel-sub"
              style={{
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid rgba(16, 185, 129, 0.45)',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5), 0 0 25px rgba(16, 185, 129, 0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Radio size={16} color="#10b981" />
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#10b981', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Your Live GPS Vitals
                  </span>
                </div>
                <span
                  className="glass-pill glass-pill-success"
                  style={{
                    fontSize: '0.7rem',
                    padding: '3px 9px',
                    borderRadius: '9999px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', animation: 'pulse 1.2s infinite' }} />
                  Satellite Lock
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '8px' }}>
                <div style={{ position: 'relative', display: 'inline-flex' }}>
                  <AqiSporeAura color={userColor.hex} />
                  <span
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '3.85rem',
                      fontWeight: 900,
                      lineHeight: 1,
                      color: userColor.hex,
                      textShadow: `0 0 25px ${userColor.hex}55`,
                      zIndex: 1,
                    }}
                  >
                    {userAqiEstimate !== null ? userAqiEstimate : '--'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: userColor.textHex }}>
                    {activePollutant.toUpperCase()} · {userColor.label}
                  </span>
                  <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>
                    Spatial IDW estimate ({userColor.unit}) at your exact position
                  </p>
                </div>
              </div>

              <div
                className="glass-panel-sub"
                style={{
                  borderRadius: '12px',
                  padding: '12px 14px',
                  marginTop: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '0.76rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>Location:</span>
                  <strong style={{ color: '#ffffff' }}>{userLocation.label || 'Detecting place...'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>Coordinates:</span>
                  <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>
                    {userLocation.lat.toFixed(5)}° N, {userLocation.lon.toFixed(5)}° E
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>GPS Accuracy:</span>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>
                    ±{userLocation.accuracy || 15} meters
                  </span>
                </div>
                {nearestStation && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Nearest CAAQMS Sensor:</span>
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                      {nearestStation.station?.name
                        ? `${nearestStation.station.name.split(',')[0]?.trim() || nearestStation.station.name} (${nearestStation.distance ?? 0} km)`
                        : 'Nearby CAAQMS Sensor'}
                    </span>
                  </div>
                )}
                {nearestStation?.station && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Nearest Node {activePollutant.toUpperCase()}:</span>
                    <strong style={{ color: userColor.textHex }}>
                      {getPollutantValue(nearestStation.station, activePollutant)} {userColor.unit}
                    </strong>
                  </div>
                )}
                {userLocation.speed !== null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Motion Speed:</span>
                    <span style={{ color: '#e2e8f0' }}>{userLocation.speed} km/h</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* GPS Inactive / Requesting State (ZERO DEMO DATA) */
            <div
              className="glass-panel-sub"
              style={{
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
                textAlign: 'center',
              }}
            >
              <div
                className="glass-pill"
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <Navigation size={20} color="#38bdf8" className={isLocating ? 'animate-spin' : ''} />
              </div>

              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px' }}>
                {isLocating ? 'Connecting to GPS...' : 'Live GPS Location Tracking'}
              </h3>

              <p style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5, margin: '0 0 14px' }}>
                {gpsStatus === 'requesting' || isLocating
                  ? 'Connecting to your device GPS satellites... Please allow location permission in your browser.'
                  : gpsStatus === 'denied'
                  ? 'GPS permission was denied. Please enable location permissions in your browser address bar to track your position in real time.'
                  : gpsStatus === 'unavailable' || gpsStatus === 'timeout'
                  ? 'GPS satellite signal timed out. Click below to reconnect to your device location.'
                  : 'Activate live GPS to continuously track your position and get instant micro-zone AQI telemetry wherever you travel.'}
              </p>

              {gpsError && (
                <div style={{ marginBottom: '12px', fontSize: '0.7rem', color: '#f87171' }}>
                  * {gpsError}
                </div>
              )}

              <button
                onClick={startLiveGpsTracking}
                disabled={isLocating}
                className="glass-pill glass-pill-active"
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  borderRadius: '9px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Locate size={14} />
                <span>{isLocating ? 'Locating...' : 'Connect Live GPS'}</span>
              </button>
            </div>
          )}

          {/* 2. SELECTED CAAQMS STATION DEEP DIVE */}
          <div
            className="glass-panel-sub"
            style={{
              padding: '20px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Selected Monitoring Node
              </span>
              <span
                className="glass-pill"
                style={{
                  fontSize: '0.68rem',
                  color: getPollutantMeta(getPollutantValue(displayStation, activePollutant), activePollutant, activeRange).hex,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: 700,
                }}
              >
                {displayStation.type || 'CAAQMS Node'}
              </span>
            </div>

            {/* Station Hero Header with Large AQI / Pollutant Concentration & Radiating Spores */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '14px' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {displayStation.name}
                </h3>
                <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>
                  {displayStation.zone || displayStation.state || 'India'} · Multi-Source Ground Grid
                </p>
              </div>

              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <AqiSporeAura color={getPollutantMeta(getPollutantValue(displayStation, activePollutant), activePollutant, activeRange).hex} />
                <span
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '3.6rem',
                    fontWeight: 900,
                    lineHeight: 1,
                    color: getPollutantMeta(getPollutantValue(displayStation, activePollutant), activePollutant, activeRange).hex,
                    textShadow: `0 0 25px ${getPollutantMeta(getPollutantValue(displayStation, activePollutant), activePollutant, activeRange).hex}55`,
                    zIndex: 1,
                  }}
                >
                  <AnimatedCounter value={getPollutantValue(displayStation, activePollutant)} duration={600} />
                </span>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: getPollutantMeta(getPollutantValue(displayStation, activePollutant), activePollutant, activeRange).textHex, zIndex: 1, marginTop: '2px' }}>
                  {activePollutant.toUpperCase()} ({getPollutantMeta(getPollutantValue(displayStation, activePollutant), activePollutant).unit}) · {getPollutantMeta(getPollutantValue(displayStation, activePollutant), activePollutant, activeRange).label}
                </span>
              </div>
            </div>

            {/* Station Comprehensive 6-Pollutant Matrix */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
              {[
                { id: 'pm25', label: 'PM2.5', val: displayStation.pm25, unit: 'µg', color: '#f87171' },
                { id: 'pm10', label: 'PM10', val: displayStation.pm10, unit: 'µg', color: '#fb923c' },
                { id: 'no2', label: 'NO2', val: displayStation.no2 != null ? displayStation.no2 : 24, unit: 'µg', color: '#38bdf8' },
                { id: 'so2', label: 'SO2', val: displayStation.so2 != null ? displayStation.so2 : 10, unit: 'µg', color: '#a78bfa' },
                { id: 'co', label: 'CO', val: displayStation.co != null ? displayStation.co : 0.8, unit: 'mg', color: '#34d399' },
                { id: 'o3', label: 'O3', val: displayStation.o3 != null ? displayStation.o3 : 30, unit: 'µg', color: '#facc15' },
              ].map((p) => {
                const isActive = activePollutant === p.id;
                return (
                  <div
                    key={p.id}
                    className="glass-panel-sub"
                    style={{
                      padding: '8px 6px',
                      borderRadius: '8px',
                      textAlign: 'center',
                      border: isActive ? `1px solid ${p.color}` : '1px solid rgba(255, 255, 255, 0.05)',
                      background: isActive ? `${p.color}18` : 'rgba(255, 255, 255, 0.02)',
                      boxShadow: isActive ? `0 0 12px ${p.color}33` : 'none',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <span style={{ fontSize: '0.62rem', color: isActive ? p.color : '#64748b', display: 'block', fontWeight: isActive ? 800 : 600 }}>
                      {p.label}
                    </span>
                    <strong style={{ fontSize: '0.95rem', color: isActive ? '#ffffff' : p.color }}>
                      <AnimatedCounter value={p.val != null ? p.val : 0} duration={600} /> <span style={{ fontSize: '0.6rem', color: '#64748b' }}>{p.unit}</span>
                    </strong>
                  </div>
                );
              })}
            </div>

            {/* Google Gemini AI Health & Commute Advisory - Zero size jumping */}
            <div
              className="glass-panel-sub"
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid rgba(56, 189, 248, 0.22)',
                minHeight: '84px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <strong style={{ color: '#38bdf8', fontSize: '0.74rem', letterSpacing: '0.03em', textTransform: 'uppercase', fontWeight: 800 }}>
                  Recommendations
                </strong>
                <span
                  className="glass-pill"
                  style={{
                    fontSize: '0.65rem',
                    color: '#94a3b8',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {isLoadingAdvisory && <RefreshCw size={10} className="animate-spin" color="#38bdf8" />}
                  {isLoadingAdvisory ? 'Updating...' : 'Live Guidance'}
                </span>
              </div>
              <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.76rem', lineHeight: 1.45, opacity: isLoadingAdvisory ? 0.75 : 1, transition: 'opacity 0.2s ease' }}>
                {geminiAdvisory}
              </p>
            </div>
          </div>

          {/* 3. CALIBRATED SEAMLESS ZOOM SPECTRUM */}
          <div
            className="glass-panel-sub"
            style={{
              padding: '14px 18px',
              borderRadius: '16px',
              border: isAdaptiveMode && activeRange.isZoomed ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(15, 23, 42, 0.65)',
              transition: 'border-color 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '8px' }}>
              <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.76rem' }}>{activePollutant.toUpperCase()} Spectrum</span>
              <span
                className={`glass-pill ${isAdaptiveMode && activeRange.isZoomed ? 'glass-pill-success' : 'glass-pill-active'}`}
                style={{
                  fontWeight: 700,
                  fontSize: '0.68rem',
                  padding: '2px 8px',
                  borderRadius: '6px',
                }}
              >
                {isAdaptiveMode && activeRange.isZoomed
                  ? `Zoom ${activeRange.zoom}x (${activeRange.min} → ${activeRange.max} ${getPollutantMeta(0, activePollutant).unit})`
                  : `NAAQS (${getPollutantMeta(0, activePollutant).unit})`}
              </span>
            </div>

            {/* Colored continuous gradient bar */}
            <div
              style={{
                height: '11px',
                borderRadius: '6px',
                background:
                  'linear-gradient(90deg, #10b981 0%, #34d399 14%, #a3e635 28%, #eab308 42%, #f97316 58%, #ea580c 72%, #dc2626 86%, #b91c1c 100%)',
                marginBottom: '8px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.45), inset 0 1px 2px rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            />

            {/* Dynamic tick labels synchronized with viewport AQI range */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#cbd5e1', fontWeight: 700 }}>
              <span style={{ color: '#10b981' }}>{activeRange.min} (Min)</span>
              <span style={{ color: '#a3e635' }}>
                {Math.round(activeRange.min + (activeRange.max - activeRange.min) * 0.33)}
              </span>
              <span style={{ color: '#fb923c' }}>
                {Math.round(activeRange.min + (activeRange.max - activeRange.min) * 0.66)}
              </span>
              <span style={{ color: '#f87171' }}>{activeRange.max} (Max)</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
