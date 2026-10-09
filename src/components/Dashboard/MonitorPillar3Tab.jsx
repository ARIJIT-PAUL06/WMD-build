import React from 'react';
import { FileText } from 'lucide-react';

/**
 * Tab 4: Pillar 3: 14-Day Chronic Non-Compliance Legal Petition Test Bench
 */
export default function MonitorPillar3Tab({
  p3GridId,
  setP3GridId,
  grids,
  p3Compliance,
  p3ForcePetition,
  setP3ForcePetition,
  handleTestPillar3,
  p3Loading,
  p3Result
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px' }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
          Pillar 3: 14-Day Chronic Non-Compliance Legal Petition Test Bench
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '0.78rem', color: '#94a3b8' }}>
          Tracks continuous regulatory buffers. If any 5km×5km block suffers 14 days of sustained hazardous air exceeding statutory thresholds, it generates and dispatches a formal Section 10 filing notice to facility heads.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Select Grid Block */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
              Select Block to Inspect Compliance:
            </label>
            <select
              value={p3GridId}
              onChange={(e) => setP3GridId(e.target.value)}
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
                  {g.gridId} • {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Compliance Scorecard */}
          {p3Compliance && (
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '12px 16px',
                fontSize: '0.75rem'
              }}
            >
              <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
                14-Day Continuous Telemetry Metrics:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', color: '#cbd5e1' }}>
                <div>Evaluated Hours: <strong style={{ color: '#ffffff' }}>{p3Compliance.totalHours} hrs</strong></div>
                <div>Severe Hours: <strong style={{ color: '#f87171' }}>{p3Compliance.severeHours} hrs</strong></div>
                <div>14-Day Mean: <strong style={{ color: '#fbbf24' }}>{p3Compliance.avgPm25} µg/m³</strong></div>
                <div>Status: <strong style={{ color: p3Compliance.petitionEligible ? '#ef4444' : '#10b981' }}>
                  {p3Compliance.petitionEligible ? 'Non-Compliant' : 'Within Limits'}
                </strong></div>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={p3ForcePetition}
              onChange={(e) => setP3ForcePetition(e.target.checked)}
            />
            <span>Force petition dispatch for demonstration</span>
          </label>

          <button
            onClick={handleTestPillar3}
            disabled={p3Loading}
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
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
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)'
            }}
          >
            <FileText size={15} />
            <span>{p3Loading ? 'Dispatching Dossier...' : 'Dispatch Section 10 Legal Notice'}</span>
          </button>
        </div>
      </div>

      {/* PILLAR 3 TEST RESULTS */}
      {p3Result && (
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(167, 139, 250, 0.3)',
            borderRadius: '16px',
            padding: '20px'
          }}
        >
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800, color: '#c4b5fd' }}>
            Section 10 Legal Petition Dispatched:
          </h4>
          <pre
            style={{
              margin: 0,
              padding: '14px',
              background: '#070a12',
              borderRadius: '10px',
              fontSize: '0.74rem',
              color: '#e9d5ff',
              overflowX: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            {JSON.stringify(p3Result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
