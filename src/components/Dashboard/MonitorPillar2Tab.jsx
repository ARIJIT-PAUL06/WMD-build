import React from 'react';
import { AlertTriangle, Building2, GraduationCap } from 'lucide-react';

/**
 * Tab 3: Pillar 2: 5km × 5km Block Flash Alerts Test Bench
 */
export default function MonitorPillar2Tab({
  p2GridId,
  setP2GridId,
  grids,
  p2CurrentPm25,
  setP2CurrentPm25,
  facilitiesInP2Grid,
  p2IgnoreDebounce,
  setP2IgnoreDebounce,
  handleTestPillar2,
  p2Loading,
  p2Result,
  httpDispatchEnabled = false
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px' }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
          Pillar 2: 5km × 5km Block Emergency Flash Alert Test Bench
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '0.78rem', color: '#94a3b8' }}>
          When any 5km × 5km spatial block experiences an air quality spike (≥ 200 µg/m³), the daemon automatically maps ALL educational and healthcare institutions in that block and triggers rapid mid-day emergency alerts.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Select Grid Block */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
              1. Select Spatial Grid Block (5km × 5km):
            </label>
            <select
              value={p2GridId}
              onChange={(e) => setP2GridId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#0f172a',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            >
              {grids.filter(g => g.totalFacilities > 0).map(g => (
                <option key={g.gridId} value={g.gridId}>
                  {g.gridId} • {g.name} ({g.totalFacilities} facilities: {g.schoolsCount} schools, {g.healthcareCount} health)
                </option>
              ))}
            </select>
          </div>

          {/* Current Spike PM2.5 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
              <span>2. Live Particulate Surge (PM2.5):</span>
              <span style={{ color: '#ef4444', fontWeight: 800 }}>{p2CurrentPm25} µg/m³ (Severe)</span>
            </div>
            <input
              type="range"
              min="105"
              max="480"
              step="5"
              value={p2CurrentPm25}
              onChange={(e) => setP2CurrentPm25(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#ef4444', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', marginTop: '4px' }}>
              <span>105 (Threshold)</span>
              <span>300 (Hazardous)</span>
              <span>480 (Severe Emergency)</span>
            </div>
          </div>
        </div>

        {/* Enclosed Facilities List */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
            Facilities Enclosed in {p2GridId} ({facilitiesInP2Grid.length} Institutions Alerted Simultaneously):
          </div>
          <div
            style={{
              maxHeight: '140px',
              overflowY: 'auto',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '10px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px'
            }}
          >
            {facilitiesInP2Grid.map(f => (
              <span
                key={f.id}
                style={{
                  background: f.facilityClass === 'healthcare' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                  border: `1px solid ${f.facilityClass === 'healthcare' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
                  color: f.facilityClass === 'healthcare' ? '#fca5a5' : '#7dd3fc',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {f.facilityClass === 'healthcare' ? <Building2 size={11} /> : <GraduationCap size={11} />}
                <span>{f.name}</span>
              </span>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
          {httpDispatchEnabled ? (
            <>
              <label style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={p2IgnoreDebounce}
                  onChange={(e) => setP2IgnoreDebounce(e.target.checked)}
                />
                <span>Bypass 3-hour cooldown for testing</span>
              </label>

              <button
                onClick={handleTestPillar2}
                disabled={p2Loading}
                style={{
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)'
                }}
              >
                <AlertTriangle size={15} />
                <span>{p2Loading ? 'Alerting Facilities...' : '🚨 Trigger Block Emergency Surge'}</span>
              </button>
            </>
          ) : (
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
              Monitoring runs automatically every 30 minutes (Amazon EventBridge). Manual dispatch is disabled in production.
            </div>
          )}
        </div>
      </div>

      {/* PILLAR 2 TEST RESULTS */}
      {p2Result && (
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '20px'
          }}
        >
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800, color: '#f87171' }}>
            Pillar 2 Block Alert Results ({p2Result.facilitiesAlerted || 0} Facilities Dispatched):
          </h4>
          <pre
            style={{
              margin: 0,
              padding: '14px',
              background: '#070a12',
              borderRadius: '10px',
              fontSize: '0.74rem',
              color: '#fecaca',
              overflowX: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            {JSON.stringify(p2Result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
