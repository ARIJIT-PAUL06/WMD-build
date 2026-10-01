import React, { useState } from 'react';
import { Database, TrendingUp, Calendar, Clock } from 'lucide-react';

export default function HistoryChart({ historyData = [], currentCity, isLoading }) {
  const [hoveredItem, setHoveredItem] = useState(null);

  if (!historyData || historyData.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Database size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
        <p style={{ fontSize: '0.85rem' }}>Loading DynamoDB historical telemetry...</p>
      </div>
    );
  }

  // Calculate stats
  const aqiValues = historyData.map((d) => d.aqi);
  const maxAqi = Math.max(...aqiValues);
  const minAqi = Math.min(...aqiValues);
  const avgAqi = Math.round(aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length);

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={18} color="#ff9900" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                DynamoDB 24-Hour Synced Arc
              </span>
              <span className="badge badge-aws" style={{ fontSize: '0.65rem' }}>
                Partition: {currentCity}
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Historical pulmonary exposure trends over past 24 hours
            </span>
          </div>
        </div>

        {/* Stats Pill */}
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Avg: </span>
            <strong style={{ color: '#ffffff' }}>{avgAqi}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Peak: </span>
            <strong style={{ color: maxAqi > 200 ? '#ef4444' : '#f59e0b' }}>{maxAqi}</strong>
          </div>
        </div>
      </div>

      {/* SVG Trend Bar/Line Chart */}
      <div style={{ position: 'relative', height: '140px', width: '100%', display: 'flex', alignItems: 'flex-end', gap: '4px', paddingTop: '20px' }}>
        {historyData.map((item, idx) => {
          const heightPercent = Math.min(100, Math.max(12, (item.aqi / 400) * 100));
          const isHighest = item.aqi === maxAqi;
          const barColor =
            item.aqi <= 50 ? '#10b981' :
            item.aqi <= 100 ? '#f59e0b' :
            item.aqi <= 150 ? '#f97316' :
            item.aqi <= 200 ? '#ef4444' : '#7f1d1d';

          const timeLabel = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredItem({ ...item, timeLabel })}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                flex: 1,
                height: `${heightPercent}%`,
                background: isHighest ? `linear-gradient(to top, ${barColor}, #ffffff)` : barColor,
                borderRadius: '3px 3px 0 0',
                cursor: 'pointer',
                opacity: hoveredItem && hoveredItem.timestamp !== item.timestamp ? 0.4 : 0.85,
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
            >
              {isHighest && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-18px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    background: '#ef4444',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Peak
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Time Axis Markers */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px' }}>
        <span>24h ago</span>
        <span>18h ago</span>
        <span>12h ago</span>
        <span>6h ago</span>
        <span style={{ color: '#38bdf8', fontWeight: 600 }}>Now</span>
      </div>

      {/* Hover Card Detail */}
      {hoveredItem && (
        <div
          style={{
            marginTop: '10px',
            padding: '8px 12px',
            background: 'rgba(30, 41, 59, 0.7)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={14} color="#38bdf8" />
            <span>Time: <strong>{hoveredItem.timeLabel}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span>AQI: <strong style={{ color: hoveredItem.aqi > 150 ? '#ef4444' : '#10b981' }}>{hoveredItem.aqi}</strong> ({hoveredItem.status})</span>
            <span>PM2.5: <strong>{hoveredItem.pm25} µg/m³</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
