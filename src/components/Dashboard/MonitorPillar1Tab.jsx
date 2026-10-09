import React from 'react';
import { Send } from 'lucide-react';

/**
 * Tab 2: Pillar 1: Conditional Morning Predictive Advisory Test Bench
 */
export default function MonitorPillar1Tab({
  p1Search,
  setP1Search,
  p1FacilityId,
  setP1FacilityId,
  filteredFacilities,
  p1Scenario,
  setP1Scenario,
  p1SimulatedPm25,
  setP1SimulatedPm25,
  selectedFacility,
  handleTestPillar1,
  p1Loading,
  p1Result,
  httpDispatchEnabled = false
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px' }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
          Pillar 1: Conditional Morning Predictive Advisory Test Bench
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '0.78rem', color: '#94a3b8' }}>
          Tests our 6:30 AM predictive dispatch logic. If air quality is acceptable, the email is suppressed to eliminate alert fatigue. If a morning inversion spike is anticipated, a Gemini-driven clinical bulletin is generated and dispatched.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Select Facility */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
              1. Search & Select Facility (Schools & Hospitals):
            </label>
            <input
              type="text"
              placeholder="Type school or hospital name..."
              value={p1Search}
              onChange={(e) => setP1Search(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.78rem',
                marginBottom: '8px',
                outline: 'none'
              }}
            />
            <select
              value={p1FacilityId}
              onChange={(e) => setP1FacilityId(e.target.value)}
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
              {filteredFacilities.map(f => (
                <option key={f.id} value={f.id}>
                  [{f.facilityClass === 'healthcare' ? 'Health' : 'School'}] {f.name} ({f.district || f.locality})
                </option>
              ))}
            </select>
          </div>

          {/* Simulation Scenario */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
              2. Choose Testing Scenario:
            </label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <button
                onClick={() => setP1Scenario('clean')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: p1Scenario === 'clean' ? '1.5px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: p1Scenario === 'clean' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: p1Scenario === 'clean' ? '#34d399' : '#94a3b8',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Clean Day (Suppression Test)
              </button>
              <button
                onClick={() => setP1Scenario('hazardous')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: p1Scenario === 'hazardous' ? '1.5px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: p1Scenario === 'hazardous' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: p1Scenario === 'hazardous' ? '#f87171' : '#94a3b8',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Severe Inversion (Alert Test)
              </button>
            </div>

            {p1Scenario === 'hazardous' && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#cbd5e1' }}>
                  <span>Forecast Peak PM2.5:</span>
                  <span style={{ fontWeight: 800, color: '#f87171' }}>{p1SimulatedPm25} µg/m³</span>
                </div>
                <input
                  type="range"
                  min="130"
                  max="400"
                  step="5"
                  value={p1SimulatedPm25}
                  onChange={(e) => setP1SimulatedPm25(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#ef4444', cursor: 'pointer' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Selected Facility Detail */}
        {selectedFacility && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <div>
              <span style={{ fontWeight: 700, color: '#ffffff' }}>{selectedFacility.name}</span>
              <span style={{ color: '#94a3b8', marginLeft: '8px' }}>• Grid Block: {selectedFacility.gridId}</span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
              Institutional Contact: Registered Nodal Registry (Protected)
            </div>
          </div>
        )}

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          {httpDispatchEnabled ? (
            <button
              onClick={handleTestPillar1}
              disabled={p1Loading}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
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
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
              }}
            >
              <Send size={15} />
              <span>{p1Loading ? 'Evaluating Forecast...' : 'Evaluate & Test Morning Advisory'}</span>
            </button>
          ) : (
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
              Monitoring runs automatically every 30 minutes (Amazon EventBridge). Manual dispatch is disabled in production.
            </div>
          )}
        </div>
      </div>

      {/* PILLAR 1 TEST RESULTS */}
      {p1Result && (
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '16px',
            padding: '20px'
          }}
        >
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8' }}>
            Pillar 1 Test Result:
          </h4>
          <pre
            style={{
              margin: 0,
              padding: '14px',
              background: '#070a12',
              borderRadius: '10px',
              fontSize: '0.74rem',
              color: '#a5f3fc',
              overflowX: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            {JSON.stringify(p1Result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
