import React from 'react';
import { RefreshCw, MapPin, Calendar } from 'lucide-react';

/**
 * Renders the Step 1 Empirical Evidence Summary Card
 * with exceedance counts, peak PM2.5, morning averages, nearest station distance, and re-aggregate controls.
 */
export default function PetitionEmpiricalSummaryCard({
  evidence,
  isLoadingEvidence,
  evidenceError,
  fetchEvidence
}) {
  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '14px',
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Step 1: Empirical Evidence Summary
        </span>
        <button
          onClick={fetchEvidence}
          disabled={isLoadingEvidence}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.7rem',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={12} className={isLoadingEvidence ? 'animate-spin' : ''} />
          Re-aggregate
        </button>
      </div>

      {evidence ? (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <div style={{ fontSize: '0.68rem', color: '#f87171', fontWeight: 600 }}>EXCEEDANCE DAYS</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f87171', margin: '2px 0' }}>
                {evidence.exceedanceCount} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#94a3b8' }}>/ {evidence.schoolDaysTotal}</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>&gt;{evidence.threshold} µg/m³ threshold</div>
            </div>

            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
              <div style={{ fontSize: '0.68rem', color: '#fbbf24', fontWeight: 600 }}>PEAK PM2.5</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fbbf24', margin: '2px 0' }}>
                {evidence.peakPm25} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>µg/m³</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{evidence.peakDate}</div>
            </div>

            <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
              <div style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 600 }}>07-13h MORNING</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', margin: '2px 0' }}>
                {evidence.avgMorningPm25} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>µg/m³</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>School hour average</div>
            </div>
          </div>

          <div style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: '1.5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={12} color="#34d399" />
              <span><strong>Nearest Station:</strong> {evidence.stationName} ({evidence.stationDistanceKm} km away)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <Calendar size={12} color="#38bdf8" />
              <span><strong>Observed Range:</strong> {evidence.startDate} – {evidence.endDate} (MAE: {evidence.maeError} µg/m³)</span>
            </div>
          </div>
        </div>
      ) : evidenceError ? (
        <div style={{ padding: '16px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', color: '#fca5a5', fontSize: '0.78rem' }}>
          <div style={{ marginBottom: '8px' }}>{evidenceError}</div>
          <button
            onClick={fetchEvidence}
            disabled={isLoadingEvidence}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.3)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              color: '#ffffff',
              fontSize: '0.72rem',
              cursor: 'pointer'
            }}
          >
            {isLoadingEvidence ? 'Retrying...' : 'Retry Live Fetch'}
          </button>
        </div>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
          Aggregating school hours continuous telemetry...
        </div>
      )}
    </div>
  );
}
