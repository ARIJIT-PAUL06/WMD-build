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
  RotateCcw
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
  const [selectedPollutantId, setSelectedPollutantId] = useState('pm25');
  const [truckModel, setTruckModel] = useState('vayu_cyber'); // 'vayu_cyber' | 'classic_scania'
  const [isTunerOpen, setIsTunerOpen] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [isLiveLoading, setIsLiveLoading] = useState(false);

  // Active selected pollutant object
  const activePollutant = useMemo(() => {
    return POLLUTANT_SPECS.find(p => p.id === selectedPollutantId) || POLLUTANT_SPECS[0];
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

    let hazardTier = 'ACCEPTABLE';
    let underglowColor = 'rgba(16, 185, 129, 0.45)';
    if (maxOverloadRatio > 2.0) {
      hazardTier = 'CRITICAL OVERLOAD';
      underglowColor = 'rgba(239, 68, 68, 0.65)';
    } else if (maxOverloadRatio > 1.0) {
      hazardTier = 'NAAQS EXCEEDED';
      underglowColor = 'rgba(249, 115, 22, 0.55)';
    } else if (maxOverloadRatio > 0.7) {
      hazardTier = 'MODERATE';
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
    <section className="cargo-section" id="atmospheric-cargo-section">
      {/* 1. Seamless Atmospheric Gradient Bridge (Connecting map to 3rd page with zero harsh seam) */}
      <div className="cargo-transition-bridge" aria-hidden="true" />
      <div className="cargo-ambient-grid" aria-hidden="true" />

      <div className="cargo-container">
        {/* Section Header */}
        <div className="cargo-header">
          <div className="cargo-badge-pill">
            <span className="pulse-dot"></span>
            <span>03 • Industrial Atmospheric Logistics</span>
          </div>
          <h2 className="cargo-title">
            VayuVitals <span className="highlight-gradient">Atmospheric Cargo Hauler</span>
          </h2>
          <p className="cargo-description">
            Physicalizing airborne molecular mass into a standardized freight container payload. Container heights,
            warning strobes, and trailer suspension physics dynamically react to current chemical pollutant densities across India.
          </p>
        </div>

        {/* Top Control Deck: Presets & Purge */}
        <div className="cargo-controls-bar">
          <div className="cargo-presets-group">
            <button
              className={`cargo-preset-btn ${activePreset === 'india_avg' ? 'active' : ''}`}
              onClick={() => handleSelectPreset('india_avg')}
              title="Pan-India National Average from CPCB CAAQMS Network"
            >
              <span>🇮🇳</span>
              <span>All-India National Avg</span>
            </button>

            <button
              className={`cargo-preset-btn ${activePreset === 'delhi_hotspot' ? 'active' : ''}`}
              onClick={() => handleSelectPreset('delhi_hotspot')}
              title="Delhi Winter Severe Hotspot (Anand Vihar/Jahangirpuri)"
            >
              <span>🚨</span>
              <span>Delhi Hotspot Overload</span>
            </button>

            <button
              className={`cargo-preset-btn ${activePreset === 'pristine' ? 'active green-theme' : ''}`}
              onClick={() => handleSelectPreset('pristine')}
              title="Pristine mountain air baseline (Ladakh)"
            >
              <span>🌿</span>
              <span>Pristine Baseline</span>
            </button>

            <button
              className={`cargo-preset-btn ${activePreset === 'live' ? 'active' : ''}`}
              onClick={handleFetchLiveTelemetry}
              disabled={isLiveLoading}
              title="Query real-time 108 CAAQMS station stream"
            >
              <Radio size={14} className={isLiveLoading ? 'animate-spin' : ''} />
              <span>{isLiveLoading ? 'Connecting...' : 'Live CAAQMS Stream'}</span>
            </button>
          </div>

          <div className="cargo-actions-group">
            {/* Model switcher */}
            <button
              className="cargo-action-btn"
              onClick={() => setTruckModel(isCyber ? 'classic_scania' : 'vayu_cyber')}
              title="Switch Truck Design"
            >
              <Layers size={14} />
              <span>{isCyber ? 'Cyber Hauler' : 'Classic Scania'}</span>
            </button>

            <button
              className="cargo-action-btn purge-btn"
              onClick={handlePurgePayload}
              disabled={isPurging}
              title="Discharge airborne chemical payload down to zero"
            >
              <Wind size={15} />
              <span>{isPurging ? 'Venting Cargo...' : 'Atmospheric Purge'}</span>
            </button>

            <button
              className="cargo-action-btn"
              onClick={() => setIsTunerOpen(!isTunerOpen)}
              title="Toggle manual chemical payload sliders"
            >
              <Sliders size={15} />
              <span>{isTunerOpen ? 'Hide Sliders' : 'Payload Sliders'}</span>
              {isTunerOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* The Weighbridge Platform with the Truck */}
        <div className="weighbridge-stage">
          <div className="weighbridge-spotlight"></div>
          <div className="weighbridge-scanner-beam"></div>
          <div className="weighbridge-runway-line"></div>

          {/* Truck Viewport */}
          <div
            className="truck-viewport"
            style={{ aspectRatio: truckAspectRatio }}
          >
            <div
              className="truck-chassis"
              style={{
                transform: `translateY(${payloadStats.chassisSag}px)`,
                '--underglow-color': payloadStats.underglowColor
              }}
            >
              {/* Ground Shadow & Underglow */}
              <div className="truck-ground-shadow"></div>
              <div className="truck-underglow"></div>

              {/* Base Truck Image */}
              <img
                src={truckImageSrc}
                alt="VayuVitals Flatbed Heavy Hauler Truck"
                className="truck-base-image"
              />

              {/* =======================================================
                  CONTAINERS FLATBED DECK
                  Mounted on physical deck surface
                  ======================================================= */}
              <div className="containers-flatbed-deck" style={deckStyle}>
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
                      className={`pollutant-container-unit ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedPollutantId(p.id)}
                      title={`Click to inspect ${p.name}: ${val} ${p.unit} (${Math.round(ratio * 100)}% of NAAQS)`}
                    >
                      <div
                        className="container-box"
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
                        <div className="container-beacon-mount">
                          <div className={`beacon-bulb ${isStrobe ? 'strobe' : ''}`}></div>
                        </div>

                        {/* Top Identification Code */}
                        <div className="container-chemical-code">
                          {p.symbol}
                        </div>

                        {/* Middle/Bottom LCD Display */}
                        <div className="container-lcd-panel">
                          <div className="container-value-text">
                            {val}
                          </div>
                          <div className="container-unit-text">
                            {p.unit}
                          </div>
                        </div>

                        {/* Bottom Capacity Percentage Bar */}
                        <div className="container-capacity-track">
                          <div
                            className="container-capacity-fill"
                            style={{
                              width: `${Math.min(100, Math.round(ratio * 100))}%`
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Mechanical Foot Clamp anchoring to flatbed deck */}
                      <div className="container-foot-clamp"></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry Readout Grid Below Truck */}
        <div className="cargo-telemetry-hud">
          <div className="telemetry-card">
            <div className="telemetry-label">
              <Truck size={14} />
              <span>Gross Payload Mass</span>
            </div>
            <div className="telemetry-value-row">
              <span className="telemetry-big-number">{payloadStats.grossTons}</span>
              <span className="telemetry-unit">Tons / km³ column</span>
            </div>
            <p className="telemetry-subtext">Estimated mass in active troposphere</p>
          </div>

          <div className="telemetry-card">
            <div className="telemetry-label">
              <Activity size={14} />
              <span>Trailer Suspension Load</span>
            </div>
            <div className="telemetry-value-row">
              <span className="telemetry-big-number">{payloadStats.suspensionLoad}%</span>
              <span className="telemetry-unit">Axle Rating</span>
            </div>
            <div className="telemetry-gauge-bar">
              <div
                className="telemetry-gauge-fill"
                style={{
                  width: `${payloadStats.suspensionLoad}%`,
                  background: payloadStats.suspensionLoad > 85 ? '#ef4444' : payloadStats.suspensionLoad > 65 ? '#f59e0b' : '#10b981'
                }}
              ></div>
            </div>
          </div>

          <div className="telemetry-card">
            <div className="telemetry-label">
              <AlertTriangle size={14} />
              <span>Dominant Hazard Factor</span>
            </div>
            <div className="telemetry-value-row">
              <span className="telemetry-big-number" style={{ color: payloadStats.worstPollutant.accentColor }}>
                {payloadStats.worstPollutant.symbol}
              </span>
              <span className="telemetry-unit">
                {Math.round(payloadStats.maxOverloadRatio * 100)}% of Limit
              </span>
            </div>
            <p className="telemetry-subtext">{payloadStats.hazardTier}</p>
          </div>

          <div className="telemetry-card">
            <div className="telemetry-label">
              <ShieldCheck size={14} />
              <span>Standard Protocol</span>
            </div>
            <div className="telemetry-value-row">
              <span className="telemetry-big-number" style={{ fontSize: '1.25rem', color: '#38bdf8' }}>
                NAAQS 2026
              </span>
              <span className="telemetry-unit">CPCB Standard</span>
            </div>
            <p className="telemetry-subtext">Automated 24-hr regulatory ceiling</p>
          </div>
        </div>

        {/* Selected Chemical Deep Inspector Card */}
        {activePollutant && (
          <div
            className="cargo-chemical-inspector"
            style={{
              '--inspect-accent': activePollutant.accentColor,
              '--inspect-glow': `${activePollutant.accentColor}33`,
              '--inspect-pill-bg': `${activePollutant.accentColor}22`
            }}
          >
            <div className="inspector-chemical-badge">
              <span className="inspector-formula">{activePollutant.symbol}</span>
              <span className="inspector-chem-name">{activePollutant.name}</span>
              <span className="inspector-status-pill">
                {((pollutantValues[activePollutant.id] || 0) / activePollutant.naaqsLimit) > 1.0 ? '🚨 CEILING EXCEEDED' : '✅ WITHIN SAFE CEILING'}
              </span>
            </div>

            <div className="inspector-details-pane">
              <div className="inspector-stats-grid">
                <div className="inspector-stat-box">
                  <span className="inspector-stat-lbl">Current Load</span>
                  <div className="inspector-stat-val">
                    {pollutantValues[activePollutant.id] || 0} {activePollutant.unit}
                  </div>
                </div>

                <div className="inspector-stat-box">
                  <span className="inspector-stat-lbl">India NAAQS Ceiling</span>
                  <div className="inspector-stat-val">
                    {activePollutant.naaqsLimit} {activePollutant.unit}
                  </div>
                </div>

                <div className="inspector-stat-box">
                  <span className="inspector-stat-lbl">WHO 2021 Guideline</span>
                  <div className="inspector-stat-val">
                    {activePollutant.whoLimit} {activePollutant.unit}
                  </div>
                </div>

                <div className="inspector-stat-box">
                  <span className="inspector-stat-lbl">Load Ratio</span>
                  <div className="inspector-stat-val" style={{ color: activePollutant.accentColor }}>
                    {Math.round(((pollutantValues[activePollutant.id] || 0) / activePollutant.naaqsLimit) * 100)}%
                  </div>
                </div>
              </div>

              <div className="inspector-sources-block">
                <p style={{ marginBottom: '0.4rem' }}>
                  <strong>Key Anthropogenic & Environmental Sources: </strong>
                  {activePollutant.source}
                </p>
                <p>
                  <strong>Cellular & Pathological Health Impact: </strong>
                  {activePollutant.healthImpact}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Manual Sliders Drawer (Expandable) */}
        {isTunerOpen && (
          <div className="cargo-sliders-drawer">
            <div className="sliders-drawer-header">
              <span className="sliders-title">
                <Sliders size={16} />
                <span>Manual Chemical Payload Injector</span>
              </span>
              <button
                className="cargo-action-btn"
                onClick={() => handleSelectPreset('india_avg')}
              >
                <RotateCcw size={13} />
                <span>Reset to Pan-India</span>
              </button>
            </div>

            <div className="sliders-grid">
              {POLLUTANT_SPECS.map(p => {
                const val = pollutantValues[p.id] || 0;
                const maxSlider = p.id === 'co' ? 10.0 : p.naaqsLimit * 4;
                const step = p.id === 'co' ? 0.1 : 1;

                return (
                  <div key={p.id} className="slider-unit">
                    <div className="slider-label-row">
                      <span>{p.symbol} ({p.name.split(' ')[0]})</span>
                      <span className="slider-current-val">{val} {p.unit}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={maxSlider}
                      step={step}
                      value={val}
                      onChange={(e) => handleSliderChange(p.id, e.target.value)}
                      className="cargo-range-input"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
