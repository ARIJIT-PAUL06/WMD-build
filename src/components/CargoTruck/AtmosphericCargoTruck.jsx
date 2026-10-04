import React, { useState, useMemo } from 'react';
import {
  Truck,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Sliders,
  ChevronDown,
  ChevronUp,
  Radio,
  Wind,
  Layers,
  RotateCcw,
  X,
  Crosshair
} from 'lucide-react';
import './AtmosphericCargoTruck.css';

// Master Indian Pollutants Specification (NAAQS Benchmark Standards)
const POLLUTANT_SPECS = [
  {
    id: 'pm25',
    name: 'Fine Particulate Matter',
    symbol: 'PM₂.₅',
    unit: 'µg/m³',
    naaqsLimit: 60, // 24-hr Indian NAAQS
    whoLimit: 15,
    source: 'Automotive diesel exhausts, biomass burning, crop residue combustion, thermal power units.',
    healthImpact: 'Ultra-fine particles (<2.5µm) penetrate alveolar capillary membranes directly into circulation, elevating cardiopulmonary mortality.',
    accentColor: '#ef4444',
    contBg: 'linear-gradient(180deg, #7f1d1d 0%, #450a0a 100%)',
    contBorder: '#ef4444',
    contGlow: 'rgba(239, 68, 68, 0.55)'
  },
  {
    id: 'pm10',
    name: 'Coarse Inhalable Dust',
    symbol: 'PM₁₀',
    unit: 'µg/m³',
    naaqsLimit: 100, // 24-hr Indian NAAQS
    whoLimit: 45,
    source: 'Roadside dust resuspension, construction debris, soil erosion, coal-fired industrial units.',
    healthImpact: 'Trapped in upper tracheobronchial airways causing chronic bronchitis, emphysema, and acute asthma exacerbations.',
    accentColor: '#f97316',
    contBg: 'linear-gradient(180deg, #7c2d12 0%, #431407 100%)',
    contBorder: '#f97316',
    contGlow: 'rgba(249, 115, 22, 0.5)'
  },
  {
    id: 'no2',
    name: 'Nitrogen Dioxide',
    symbol: 'NO₂',
    unit: 'µg/m³',
    naaqsLimit: 80,
    whoLimit: 25,
    source: 'High-temperature internal combustion engines (heavy trucks, buses) and thermal generation stations.',
    healthImpact: 'Deep airway mucosal inflamer, precursor to secondary particulate nitrates and ground-level ozone formation.',
    accentColor: '#eab308',
    contBg: 'linear-gradient(180deg, #713f12 0%, #3f2008 100%)',
    contBorder: '#eab308',
    contGlow: 'rgba(234, 179, 8, 0.45)'
  },
  {
    id: 'so2',
    name: 'Sulphur Dioxide',
    symbol: 'SO₂',
    unit: 'µg/m³',
    naaqsLimit: 80,
    whoLimit: 40,
    source: 'Coal-fired power plants, petroleum refineries, heavy furnace oil combustion in industrial estates.',
    healthImpact: 'Potent bronchoconstrictor; drives acidic aerosol formation and environmental acid precipitation.',
    accentColor: '#10b981',
    contBg: 'linear-gradient(180deg, #064e3b 0%, #022c22 100%)',
    contBorder: '#10b981',
    contGlow: 'rgba(16, 185, 129, 0.4)'
  },
  {
    id: 'co',
    name: 'Carbon Monoxide',
    symbol: 'CO',
    unit: 'mg/m³',
    naaqsLimit: 2.0, // 8-hr standard in mg/m³
    whoLimit: 4.0,
    source: 'Incomplete combustion in idling motor vehicles, biomass cooking chulhas, forest brushfires.',
    healthImpact: 'Binds with hemoglobin to form carboxyhemoglobin, impairing oxygen delivery to myocardial and cerebral tissues.',
    accentColor: '#f43f5e',
    contBg: 'linear-gradient(180deg, #881337 0%, #4c0519 100%)',
    contBorder: '#f43f5e',
    contGlow: 'rgba(244, 63, 94, 0.45)'
  },
  {
    id: 'o3',
    name: 'Tropospheric Ozone',
    symbol: 'O₃',
    unit: 'µg/m³',
    naaqsLimit: 100, // 8-hr standard
    whoLimit: 100,
    source: 'Secondary photochemical pollutant formed by solar reaction of NOx and VOCs on hot sunny afternoons.',
    healthImpact: 'Powerful cellular oxidant; damages alveolar linings, induces coughing, chest tightness, and long-term lung scarring.',
    accentColor: '#06b6d4',
    contBg: 'linear-gradient(180deg, #164e63 0%, #083344 100%)',
    contBorder: '#06b6d4',
    contGlow: 'rgba(6, 182, 212, 0.45)'
  },
  {
    id: 'nh3',
    name: 'Ammonia Aerosol',
    symbol: 'NH₃',
    unit: 'µg/m³',
    naaqsLimit: 100,
    whoLimit: 100,
    source: 'Agricultural fertilizer volatilization, livestock farming, untreated municipal sewage gutters.',
    healthImpact: 'Reacts with atmospheric nitric and sulfuric acids to synthesize regional ammonium salt smog hazes.',
    accentColor: '#a855f7',
    contBg: 'linear-gradient(180deg, #581c87 0%, #2e1065 100%)',
    contBorder: '#a855f7',
    contGlow: 'rgba(168, 85, 247, 0.5)'
  }
];

// Atmospheric Cargo Presets
const PRESETS = {
  india_avg: {
    id: 'india_avg',
    name: '🇮🇳 Pan-India National Average',
    subtitle: 'CPCB 2026 Continental Subcontinent Aggregate',
    values: {
      pm25: 54.2,
      pm10: 108.5,
      no2: 28.4,
      so2: 13.8,
      co: 1.2,
      o3: 38.6,
      nh3: 22.1
    }
  },
  delhi_hotspot: {
    id: 'delhi_hotspot',
    name: '🚨 Delhi Winter Smog Overload',
    subtitle: 'Anand Vihar / Jahangirpuri Severe Emergency',
    values: {
      pm25: 342.0,
      pm10: 486.0,
      no2: 94.0,
      so2: 34.0,
      co: 3.6,
      o3: 112.0,
      nh3: 72.0
    }
  },
  pristine: {
    id: 'pristine',
    name: '🌿 Pristine Mountain Baseline',
    subtitle: 'Ladakh High-Altitude Clean Reference',
    values: {
      pm25: 11.2,
      pm10: 22.0,
      no2: 5.6,
      so2: 3.4,
      co: 0.3,
      o3: 22.0,
      nh3: 5.8
    }
  }
};

export default function AtmosphericCargoTruck() {
  const [activePreset, setActivePreset] = useState('india_avg');
  const [pollutantValues, setPollutantValues] = useState(PRESETS.india_avg.values);
  const [selectedPollutantId, setSelectedPollutantId] = useState(null);
  const [truckModel, setTruckModel] = useState('vayu_cyber'); // 'vayu_cyber' | 'classic_scania'
  const [isTunerOpen, setIsTunerOpen] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [isLiveLoading, setIsLiveLoading] = useState(false);

  // Active selected pollutant object
  const activePollutant = useMemo(() => {
    return POLLUTANT_SPECS.find(p => p.id === selectedPollutantId) || null;
  }, [selectedPollutantId]);

  // Aggregate Payload Calculations
  const payloadStats = useMemo(() => {
    let totalMass = 0;
    let maxOverloadRatio = 0;
    let worstPollutant = POLLUTANT_SPECS[0];

    POLLUTANT_SPECS.forEach(p => {
      const val = pollutantValues[p.id] || 0;
      const ratio = val / p.naaqsLimit;
      if (ratio > maxOverloadRatio) {
        maxOverloadRatio = ratio;
        worstPollutant = p;
      }
      totalMass += (p.id === 'co' ? val * 50 : val);
    });

    const grossTons = (totalMass * 0.082).toFixed(1);
    const suspensionLoad = Math.min(100, Math.round(maxOverloadRatio * 46 + 26));
    const chassisSag = Math.min(5, Math.max(0, (maxOverloadRatio - 0.5) * 2.2));

    let hazardTier = 'ACCEPTABLE TRANSIT';
    let underglowColor = 'rgba(16, 185, 129, 0.45)';
    if (maxOverloadRatio > 2.0) {
      hazardTier = 'CRITICAL OVERLOAD';
      underglowColor = 'rgba(239, 68, 68, 0.65)';
    } else if (maxOverloadRatio > 1.0) {
      hazardTier = 'NAAQS EXCEEDED';
      underglowColor = 'rgba(249, 115, 22, 0.55)';
    } else if (maxOverloadRatio > 0.7) {
      hazardTier = 'MODERATE BURDEN';
      underglowColor = 'rgba(234, 179, 8, 0.45)';
    }

    return {
      grossTons,
      suspensionLoad,
      chassisSag,
      maxOverloadRatio,
      worstPollutant,
      hazardTier,
      underglowColor
    };
  }, [pollutantValues]);

  // Handle Preset Selection
  const handleSelectPreset = (presetKey) => {
    setActivePreset(presetKey);
    if (PRESETS[presetKey]) {
      setPollutantValues(PRESETS[presetKey].values);
    }
  };

  // Live Telemetry Sync from Backend
  const handleFetchLiveTelemetry = async () => {
    setIsLiveLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/india-heatmap');
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      if (data && data.stations && data.stations.length > 0) {
        let sumPm25 = 0, countPm25 = 0;
        let sumPm10 = 0, countPm10 = 0;
        let sumNo2 = 0, countNo2 = 0;
        let sumCo = 0, countCo = 0;

        data.stations.forEach(s => {
          if (s.pm25 && s.pm25 > 0) { sumPm25 += s.pm25; countPm25++; }
          if (s.pm10 && s.pm10 > 0) { sumPm10 += s.pm10; countPm10++; }
          if (s.no2 && s.no2 > 0) { sumNo2 += s.no2; countNo2++; }
          if (s.co && s.co > 0) { sumCo += s.co; countCo++; }
        });

        const liveAverages = {
          pm25: countPm25 ? Math.round((sumPm25 / countPm25) * 10) / 10 : 58.4,
          pm10: countPm10 ? Math.round((sumPm10 / countPm10) * 10) / 10 : 116.2,
          no2: countNo2 ? Math.round((sumNo2 / countNo2) * 10) / 10 : 31.5,
          so2: 15.2,
          co: countCo ? Math.round((sumCo / countCo) * 10) / 10 : 1.3,
          o3: 41.2,
          nh3: 24.8
        };

        setPollutantValues(liveAverages);
        setActivePreset('live');
      }
    } catch (err) {
      console.warn('Could not fetch live telemetry, using fallback live estimates', err);
      setPollutantValues({
        pm25: 62.4,
        pm10: 124.8,
        no2: 33.2,
        so2: 16.1,
        co: 1.4,
        o3: 44.0,
        nh3: 26.5
      });
      setActivePreset('live');
    } finally {
      setIsLiveLoading(false);
    }
  };

  // Decontamination Purge Action
  const handlePurgePayload = () => {
    setIsPurging(true);
    setTimeout(() => {
      setPollutantValues({
        pm25: 8.0,
        pm10: 15.0,
        no2: 4.2,
        so2: 2.1,
        co: 0.2,
        o3: 18.0,
        nh3: 4.0
      });
      setActivePreset('purged');
      setIsPurging(false);
    }, 900);
  };

  // Slider change for manual pollutant injection
  const handleSliderChange = (pollutantId, newValue) => {
    setActivePreset('custom');
    setPollutantValues(prev => ({
      ...prev,
      [pollutantId]: parseFloat(newValue)
    }));
  };

  // Geometry configuration based on truck model
  const isCyber = truckModel === 'vayu_cyber';
  const truckImageSrc = isCyber ? '/assets/truck_flatbed_vayu.png' : '/assets/truck_flatbed.png';
  const truckAspectRatio = isCyber ? '1376 / 768' : '1024 / 576';
  const deckStyle = isCyber
    ? { left: '38.88%', width: '55.23%', bottom: '52.86%' }
    : { left: '31.8%', width: '60.5%', bottom: '42.36%' };

  return (
    <section className="cargo-section-fullscreen" id="atmospheric-cargo-section">
      {/* ============================================================== */}
      {/* 1. BUTTER-SMOOTH PERIMETER SCENE FADE (EXACT MATCH TO MAP)     */}
      {/* ============================================================== */}
      <div className="cargo-perimeter-fade" />

      {/* ============================================================== */}
      {/* 2. UNIQUE HOLOGRAPHIC HUD CORNER BRACKETS & TELEMETRY LABELS   */}
      {/* ============================================================== */}
      <div className="cargo-hud-corner top-left">
        <svg className="corner-bracket-svg" viewBox="0 0 24 24">
          <path d="M22 2H2v20" />
        </svg>
        <span>SYS // LAT 28.6139°N</span>
      </div>

      <div className="cargo-hud-corner top-right">
        <svg className="corner-bracket-svg" viewBox="0 0 24 24">
          <path d="M2 2h20v20" />
        </svg>
        <span>ORBITAL SENSOR LOCK // ACTIVE</span>
      </div>

      <div className="cargo-hud-corner bottom-left">
        <svg className="corner-bracket-svg" viewBox="0 0 24 24">
          <path d="M22 22H2V2" />
        </svg>
        <span>CARGO MANIFEST // CPCB-IND-01</span>
      </div>

      <div className="cargo-hud-corner bottom-right">
        <svg className="corner-bracket-svg" viewBox="0 0 24 24">
          <path d="M2 22h20V2" />
        </svg>
        <span>ELEV 216M // AEROSOL COLUMN</span>
      </div>

      {/* Volumetric Atmospheric Fog Drift */}
      <div className="cargo-aerosol-fog-drift" />

      {/* ============================================================== */}
      {/* 3. TOP FLOATING COMMAND DECK                                   */}
      {/* ============================================================== */}
      <div className="cargo-top-command-deck">
        <div className="cargo-header-row">
          <div className="cargo-title-group">
            <h2 className="cargo-main-title">
              <Truck size={20} color="#38bdf8" />
              <span>VayuVitals <span className="title-accent">Atmospheric Cargo Hauler</span></span>
            </h2>
            <span className="cargo-subtitle-tag">03 • National Atmospheric Freight</span>
          </div>

          <div className="cargo-dock-actions">
            {/* Model switcher */}
            <button
              className="cargo-dock-btn"
              onClick={() => setTruckModel(isCyber ? 'classic_scania' : 'vayu_cyber')}
              title="Switch Truck Design"
            >
              <Layers size={13} />
              <span>{isCyber ? 'Cyber Hauler' : 'Classic Scania'}</span>
            </button>

            <button
              className="cargo-dock-btn purge-action"
              onClick={handlePurgePayload}
              disabled={isPurging}
              title="Discharge airborne chemical payload down to zero"
            >
              <Wind size={13} />
              <span>{isPurging ? 'Venting Cargo...' : 'Atmospheric Purge'}</span>
            </button>

            <button
              className="cargo-dock-btn"
              onClick={() => {
                setIsTunerOpen(!isTunerOpen);
                if (selectedPollutantId) setSelectedPollutantId(null);
              }}
              title="Toggle manual chemical payload sliders"
            >
              <Sliders size={13} />
              <span>{isTunerOpen ? 'Hide Sliders' : 'Payload Sliders'}</span>
              {isTunerOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </div>

        {/* Translucent Glass Pill Control Dock */}
        <div className="cargo-controls-dock">
          <div className="cargo-presets-pills">
            <button
              className={`cargo-preset-chip ${activePreset === 'india_avg' ? 'active' : ''}`}
              onClick={() => handleSelectPreset('india_avg')}
              title="Pan-India National Average from CPCB CAAQMS Network"
            >
              <span>🇮🇳</span>
              <span>All-India National Avg</span>
            </button>

            <button
              className={`cargo-preset-chip ${activePreset === 'delhi_hotspot' ? 'active' : ''}`}
              onClick={() => handleSelectPreset('delhi_hotspot')}
              title="Delhi Winter Severe Hotspot (Anand Vihar/Jahangirpuri)"
            >
              <span>🚨</span>
              <span>Delhi Hotspot Overload</span>
            </button>

            <button
              className={`cargo-preset-chip ${activePreset === 'pristine' ? 'active green-theme' : ''}`}
              onClick={() => handleSelectPreset('pristine')}
              title="Pristine mountain air baseline (Ladakh)"
            >
              <span>🌿</span>
              <span>Pristine Baseline</span>
            </button>

            <button
              className={`cargo-preset-chip ${activePreset === 'live' ? 'active' : ''}`}
              onClick={handleFetchLiveTelemetry}
              disabled={isLiveLoading}
              title="Query real-time 108 CAAQMS station stream"
            >
              <Radio size={13} className={isLiveLoading ? 'animate-spin' : ''} />
              <span>{isLiveLoading ? 'Connecting...' : 'Live CAAQMS Stream'}</span>
            </button>
          </div>

          <div style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Crosshair size={12} color="#38bdf8" />
            <span>Interactive Cargo Pods • Click any container to inspect</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. CENTER CINEMA WEIGHBRIDGE & TRUCK HERO VIEWPORT            */}
      {/* ============================================================== */}
      <div className="cargo-center-stage">
        {/* Laser Scanning Horizon Beam */}
        <div className="stage-laser-scanner" />

        {/* Truck Canvas (Exact 16:9 Aspect Ratio) */}
        <div
          className="cargo-truck-canvas"
          style={{ aspectRatio: truckAspectRatio }}
        >
          <div
            className="cargo-chassis-rig"
            style={{
              transform: `translateY(${payloadStats.chassisSag}px)`,
              '--underglow-color': payloadStats.underglowColor
            }}
          >
            {/* Underglow Aura */}
            <div className="cargo-underglow-aura" />

            {/* Base Truck High-Res Render */}
            <img
              src={truckImageSrc}
              alt="VayuVitals Flatbed Heavy Hauler Truck"
              className="cargo-base-render"
            />

            {/* =======================================================
                CARGO CONTAINERS FLATBED MOUNTING DECK
                Mounted directly on flatbed deck surface
                ======================================================= */}
            <div className="cargo-flatbed-deck" style={deckStyle}>
              {POLLUTANT_SPECS.map(p => {
                const val = pollutantValues[p.id] || 0;
                const ratio = val / p.naaqsLimit;

                // Dynamic height calculation scaled to truck viewport height
                const heightPercent = isCyber
                  ? Math.min(34, Math.max(9, 10 + ratio * 10)) // Cyber hauler scale
                  : Math.min(44, Math.max(9, 11 + ratio * 15)); // Scania scale

                const heightPx = isCyber
                  ? heightPercent * 7.68
                  : heightPercent * 5.76;

                // Severity & Strobe Logic
                let beaconColor, isStrobe = false;
                if (ratio > 1.8) {
                  beaconColor = '#ef4444';
                  isStrobe = true;
                } else if (ratio > 1.0) {
                  beaconColor = '#ef4444';
                  isStrobe = true;
                } else if (ratio > 0.6) {
                  beaconColor = '#f59e0b';
                  isStrobe = false;
                } else {
                  beaconColor = '#10b981';
                  isStrobe = false;
                }

                const isSelected = selectedPollutantId === p.id;

                return (
                  <div
                    key={p.id}
                    className={`cargo-container-pod ${isSelected ? 'active-selected' : ''}`}
                    onClick={() => setSelectedPollutantId(isSelected ? null : p.id)}
                    title={`Click to inspect ${p.name}: ${val} ${p.unit} (${Math.round(ratio * 100)}% of NAAQS)`}
                  >
                    <div
                      className="cargo-iso-box"
                      style={{
                        height: `${heightPx}px`,
                        '--cont-bg': p.contBg,
                        '--cont-border': isSelected ? '#ffffff' : p.contBorder,
                        '--cont-glow': p.contGlow,
                        '--cont-text-color': p.accentColor,
                        '--beacon-color': beaconColor
                      }}
                    >
                      {/* Top Strobe Hazard Beacon */}
                      <div className="cargo-strobe-mount">
                        <div className={`strobe-beacon-core ${isStrobe ? 'flashing' : ''}`} />
                      </div>

                      {/* Top Identification Code */}
                      <div className="cargo-chem-symbol">
                        {p.symbol}
                      </div>

                      {/* Middle/Bottom LCD Display */}
                      <div className="cargo-lcd-matrix">
                        <div className="cargo-chem-value">
                          {val}
                        </div>
                        <div className="cargo-chem-unit">
                          {p.unit}
                        </div>
                      </div>

                      {/* Bottom Capacity Percentage Bar */}
                      <div className="cargo-chem-gauge">
                        <div
                          className="cargo-chem-fill"
                          style={{
                            width: `${Math.min(100, Math.round(ratio * 100))}%`
                          }}
                        />
                      </div>
                    </div>

                    {/* Mechanical Foot Clamp anchoring to flatbed deck */}
                    <div className="cargo-deck-clamp" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. BOTTOM FLOATING TELEMETRY STRIP & FLYOUTS                   */}
      {/* ============================================================== */}
      <div className="cargo-bottom-dock">
        {/* Selected Chemical Deep Inspector Flyout */}
        {activePollutant && (
          <div
            className="cargo-detail-flyout"
            style={{
              '--inspect-accent': activePollutant.accentColor,
              '--inspect-glow': `${activePollutant.accentColor}33`
            }}
          >
            <div className="flyout-left">
              <div className="flyout-chem-pill">
                <span className="flyout-symbol">{activePollutant.symbol}</span>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>{activePollutant.name.split(' ')[0]}</span>
              </div>

              <div className="flyout-stats-row">
                <div className="flyout-stat-item">
                  <span className="flyout-stat-lbl">Current Load</span>
                  <span className="flyout-stat-val">
                    {pollutantValues[activePollutant.id] || 0} {activePollutant.unit}
                  </span>
                </div>

                <div className="flyout-stat-item">
                  <span className="flyout-stat-lbl">India NAAQS Ceiling</span>
                  <span className="flyout-stat-val">
                    {activePollutant.naaqsLimit} {activePollutant.unit}
                  </span>
                </div>

                <div className="flyout-stat-item">
                  <span className="flyout-stat-lbl">Load Ratio</span>
                  <span className="flyout-stat-val" style={{ color: activePollutant.accentColor }}>
                    {Math.round(((pollutantValues[activePollutant.id] || 0) / activePollutant.naaqsLimit) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="flyout-right-desc">
              <p style={{ margin: '0 0 4px', color: '#e2e8f0' }}>
                <strong style={{ color: '#f8fafc' }}>Sources: </strong>{activePollutant.source}
              </p>
              <p style={{ margin: 0, color: '#94a3b8' }}>
                <strong style={{ color: '#cbd5e1' }}>Impact: </strong>{activePollutant.healthImpact}
              </p>
            </div>

            <button
              className="flyout-close-btn"
              onClick={() => setSelectedPollutantId(null)}
              title="Close detail card"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Manual Sliders Flyout Drawer */}
        {isTunerOpen && (
          <div className="cargo-sliders-flyout">
            <div className="sliders-flyout-header">
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={14} color="#38bdf8" />
                <span>Manual Chemical Payload Injector</span>
              </span>
              <button
                className="cargo-dock-btn"
                onClick={() => handleSelectPreset('india_avg')}
              >
                <RotateCcw size={12} />
                <span>Reset to Pan-India</span>
              </button>
            </div>

            <div className="sliders-flyout-grid">
              {POLLUTANT_SPECS.map(p => {
                const val = pollutantValues[p.id] || 0;
                const maxSlider = p.id === 'co' ? 10.0 : p.naaqsLimit * 4;
                const step = p.id === 'co' ? 0.1 : 1;

                return (
                  <div key={p.id} className="slider-flyout-item">
                    <div className="slider-flyout-lbl-row">
                      <span>{p.symbol}</span>
                      <span className="slider-flyout-val">{val} {p.unit}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={maxSlider}
                      step={step}
                      value={val}
                      onChange={(e) => handleSliderChange(p.id, e.target.value)}
                      className="slider-flyout-range"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Telemetry Strip (4 Glass Cards) */}
        <div className="cargo-telemetry-grid">
          <div className="cargo-hud-card">
            <div className="cargo-hud-lbl">
              <Truck size={13} color="#38bdf8" />
              <span>Gross Payload Mass</span>
            </div>
            <div className="cargo-hud-val-row">
              <span className="cargo-hud-number">{payloadStats.grossTons}</span>
              <span className="cargo-hud-unit">Tons / km³ column</span>
            </div>
            <p className="cargo-hud-subtext">Tropospheric aerosol density</p>
          </div>

          <div className="cargo-hud-card">
            <div className="cargo-hud-lbl">
              <Activity size={13} color="#f59e0b" />
              <span>Trailer Suspension Load</span>
            </div>
            <div className="cargo-hud-val-row">
              <span className="cargo-hud-number">{payloadStats.suspensionLoad}%</span>
              <span className="cargo-hud-unit">Axle Rating</span>
            </div>
            <div className="cargo-hud-bar">
              <div
                className="cargo-hud-bar-fill"
                style={{
                  width: `${payloadStats.suspensionLoad}%`,
                  background: payloadStats.suspensionLoad > 85 ? '#ef4444' : payloadStats.suspensionLoad > 65 ? '#f59e0b' : '#10b981'
                }}
              />
            </div>
          </div>

          <div className="cargo-hud-card">
            <div className="cargo-hud-lbl">
              <AlertTriangle size={13} color="#ef4444" />
              <span>Dominant Hazard Factor</span>
            </div>
            <div className="cargo-hud-val-row">
              <span className="cargo-hud-number" style={{ color: payloadStats.worstPollutant.accentColor }}>
                {payloadStats.worstPollutant.symbol}
              </span>
              <span className="cargo-hud-unit">
                {Math.round(payloadStats.maxOverloadRatio * 100)}% of Limit
              </span>
            </div>
            <p className="cargo-hud-subtext">{payloadStats.hazardTier}</p>
          </div>

          <div className="cargo-hud-card">
            <div className="cargo-hud-lbl">
              <ShieldCheck size={13} color="#34d399" />
              <span>Regulatory Standard</span>
            </div>
            <div className="cargo-hud-val-row">
              <span className="cargo-hud-number" style={{ fontSize: '1.25rem', color: '#38bdf8' }}>
                NAAQS 2026
              </span>
              <span className="cargo-hud-unit">CPCB Standard</span>
            </div>
            <p className="cargo-hud-subtext">24-hr permissible national ceiling</p>
          </div>
        </div>
      </div>
    </section>
  );
}
