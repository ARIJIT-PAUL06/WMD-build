import React from 'react';
import { Activity, Flame, Droplets, Thermometer, Wind, AlertCircle } from 'lucide-react';

export default function PollutantGrid({ metrics }) {
  if (!metrics) return null;

  const pollutants = metrics.pollutants || {};
  const weather = metrics.weather || {};
  const aqi = metrics.aqi || 45;

  const getStatusColor = (val, threshold) => {
    if (val <= threshold) return '#10b981';
    if (val <= threshold * 2) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Hero AQI Card */}
      <div
        className="glass-panel"
        style={{
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: `radial-gradient(circle at left, ${metrics.categoryColor}15, rgba(15, 23, 42, 0.85))`,
          border: `1px solid ${metrics.categoryColor}40`,
        }}
      >
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Air Quality Index (AQI) · {metrics.city}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '4px' }}>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '3.2rem',
                fontWeight: 900,
                color: metrics.categoryColor,
                lineHeight: 1,
                textShadow: `0 0 25px ${metrics.categoryColor}60`,
              }}
            >
              {aqi}
            </span>
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#ffffff',
              }}
            >
              {metrics.status}
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Source: {metrics.source || 'Open-Meteo & CPCB Sensors'}
          </div>
        </div>

        {/* Ambient Biological Indicator */}
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              background: `${metrics.categoryColor}20`,
              border: `1px solid ${metrics.categoryColor}50`,
              color: metrics.categoryColor,
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Activity size={16} />
            <span>
              {aqi <= 50 ? 'Cellular Resilience' : aqi <= 100 ? 'Mild Stress' : aqi <= 200 ? 'Bronchial Constriction' : 'Acute Inflammation'}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Primary Driver: <strong style={{ color: '#ffffff' }}>{metrics.dominantPollutant || 'PM2.5'}</strong>
          </div>
        </div>
      </div>

      {/* Grid of Micro-Pollutants */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px',
        }}
      >
        {/* PM2.5 */}
        <div className="glass-panel" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            <span>PM2.5</span>
            <span style={{ color: getStatusColor(pollutants.pm25, 15) }}>WHO: 15</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            {pollutants.pm25}
            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '3px' }}>µg/m³</span>
          </div>
          <div style={{ height: '4px', background: '#334155', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, (pollutants.pm25 / 150) * 100)}%`,
                height: '100%',
                background: getStatusColor(pollutants.pm25, 15),
              }}
            />
          </div>
        </div>

        {/* PM10 */}
        <div className="glass-panel" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            <span>PM10</span>
            <span style={{ color: getStatusColor(pollutants.pm10, 45) }}>WHO: 45</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            {pollutants.pm10}
            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '3px' }}>µg/m³</span>
          </div>
          <div style={{ height: '4px', background: '#334155', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, (pollutants.pm10 / 250) * 100)}%`,
                height: '100%',
                background: getStatusColor(pollutants.pm10, 45),
              }}
            />
          </div>
        </div>

        {/* NO2 */}
        <div className="glass-panel" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            <span>NO₂</span>
            <span>Vehicle Smog</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            {pollutants.no2}
            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '3px' }}>ppb</span>
          </div>
        </div>

        {/* SO2 */}
        <div className="glass-panel" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            <span>SO₂</span>
            <span>Sulfur</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            {pollutants.so2}
            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '3px' }}>ppb</span>
          </div>
        </div>

        {/* Temperature & Humidity */}
        <div className="glass-panel" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            <span>Ambient</span>
            <Thermometer size={14} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, marginTop: '4px' }}>
            {weather.temp ?? 29}°C
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
              {weather.humidity ?? 55}% RH
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
