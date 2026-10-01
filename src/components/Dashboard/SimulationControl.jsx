import React from 'react';
import { Sliders, RefreshCw, Zap } from 'lucide-react';

export default function SimulationControl({
  isSimulating,
  simulatedAqi,
  onToggleSimulate,
  onChangeSimulatedAqi,
  onResetToLive,
}) {
  const PRESETS = [
    { label: 'Clean (32)', aqi: 32, color: '#10b981' },
    { label: 'Moderate (85)', aqi: 85, color: '#f59e0b' },
    { label: 'Sensitive (135)', aqi: 135, color: '#f97316' },
    { label: 'Unhealthy (180)', aqi: 180, color: '#ef4444' },
    { label: 'Severe Smog (420)', aqi: 420, color: '#7f1d1d' },
  ];

  return (
    <div
      className="glass-panel"
      style={{
        padding: '16px 20px',
        border: isSimulating ? '1px solid rgba(255, 153, 0, 0.4)' : '1px solid var(--border-glass)',
        background: isSimulating ? 'rgba(35, 47, 62, 0.6)' : 'var(--bg-glass)',
        boxShadow: isSimulating ? '0 0 20px rgba(255, 153, 0, 0.15)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={18} color={isSimulating ? '#ff9900' : '#38bdf8'} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            Interactive 3D Lung Reactor
          </span>
          {isSimulating ? (
            <span className="badge badge-aws">Simulation Active</span>
          ) : (
            <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Live Telemetry Feed
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isSimulating && (
            <button
              onClick={onResetToLive}
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              title="Return to real live sensor feed"
            >
              <RefreshCw size={12} />
              Reset to Live Feed
            </button>
          )}
          <button
            onClick={onToggleSimulate}
            style={{
              background: isSimulating ? '#ff9900' : 'rgba(255, 255, 255, 0.08)',
              color: isSimulating ? '#000000' : '#ffffff',
              border: 'none',
              padding: '5px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Zap size={13} />
            {isSimulating ? 'Exit Slider' : 'Test Slider Mode'}
          </button>
        </div>
      </div>

      {/* Range Slider */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
          <span>Drag to simulate AQI impact on biological tissues:</span>
          <span style={{ fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
            AQI: {simulatedAqi}
          </span>
        </div>
        <input
          type="range"
          min="10"
          max="500"
          value={simulatedAqi}
          onChange={(e) => onChangeSimulatedAqi(Number(e.target.value))}
          style={{
            '--color-current':
              simulatedAqi <= 50 ? '#10b981' :
              simulatedAqi <= 100 ? '#f59e0b' :
              simulatedAqi <= 150 ? '#f97316' :
              simulatedAqi <= 250 ? '#ef4444' : '#7f1d1d',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          <span>0 (Pristine)</span>
          <span>50 (Good)</span>
          <span>100 (Moderate)</span>
          <span>200 (Unhealthy)</span>
          <span>500 (Hazardous)</span>
        </div>
      </div>

      {/* Preset Buttons for Quick Testing */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick Zones:</span>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => onChangeSimulatedAqi(p.aqi)}
            style={{
              padding: '3px 9px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 500,
              background: 'rgba(30, 41, 59, 0.6)',
              border: `1px solid ${p.color}40`,
              color: p.color,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
