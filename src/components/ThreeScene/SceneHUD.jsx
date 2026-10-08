import React from 'react';
import { HeartPulse, Wind, AlertTriangle, ShieldCheck } from 'lucide-react';
import AnimatedCounter from '../common/AnimatedCounter';

export default function SceneHUD({ aqi = 45 }) {
  // Biological metrics calculated from AQI
  const isGood = aqi <= 50;
  const isModerate = aqi > 50 && aqi <= 100;
  const isSensitive = aqi > 100 && aqi <= 150;
  const isUnhealthy = aqi > 150 && aqi <= 250;
  const isSevere = aqi > 250;

  const bpm = isGood ? 13 : isModerate ? 16 : isSensitive ? 21 : isUnhealthy ? 27 : 34;
  const constriction = isGood ? 0 : isModerate ? 15 : isSensitive ? 38 : isUnhealthy ? 62 : 88;
  const inhaledPmHourly = Math.round((aqi * 0.65) * 0.48 * 10) / 10; // rough biological deposition

  const badgeColor = isGood ? '#10b981' : isModerate ? '#f59e0b' : isSensitive ? '#f97316' : '#ef4444';

  return (
    <div
      style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        right: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      {/* Top Left: Respiratory Vitals */}
      <div
        className="glass-panel"
        style={{
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          pointerEvents: 'auto',
          minWidth: '180px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <HeartPulse size={14} color={badgeColor} />
          <span>Simulated Respiration</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
            <AnimatedCounter value={bpm} />
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>breaths / min</span>
        </div>
        <div style={{ fontSize: '0.7rem', color: badgeColor, fontWeight: 600 }}>
          {isGood ? 'Eupnea (Normal Deep)' : isModerate ? 'Mild Elevation' : isSevere ? 'Distressed Tachypnea' : 'Labored Shallow'}
        </div>
      </div>

      {/* Top Right: Biological Airway Constriction */}
      <div
        className="glass-panel"
        style={{
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          pointerEvents: 'auto',
          textAlign: 'right',
          minWidth: '180px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>Bronchial Resistance</span>
          <Wind size={14} color={badgeColor} />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '6px' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: badgeColor, fontFamily: 'var(--font-mono)' }}>
            +<AnimatedCounter value={constriction} suffix="%" />
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>narrowing</span>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Deposition: <strong style={{ color: '#ffffff' }}><AnimatedCounter value={inhaledPmHourly} decimals={1} /> µg/hr</strong>
        </div>
      </div>
    </div>
  );
}
