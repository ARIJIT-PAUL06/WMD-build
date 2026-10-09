import React from 'react';

/**
 * Tab 5: Live Audit Log Feed from ML data logs
 */
export default function MonitorAuditTab({
  auditList,
  auditFilter,
  setAuditFilter
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
          Showing last {auditList.length} verified events from <code>ml/data/autonomous_monitor_audit.json</code>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['ALL', 'BLOCK_EMERGENCY_DISPATCHED', 'PREDICTIVE_ADVISORY_DISPATCHED', '14_DAY_PETITION_DISPATCHED', 'CYCLE_COMPLETED'].map(f => (
            <button
              key={f}
              onClick={() => setAuditFilter(f)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: auditFilter === f ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                background: auditFilter === f ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                color: auditFilter === f ? '#38bdf8' : '#94a3b8',
                fontSize: '0.68rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxHeight: '440px',
          overflowY: 'auto'
        }}
      >
        {auditList
          .filter(ev => auditFilter === 'ALL' || ev.eventType === auditFilter)
          .reverse()
          .map((ev, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    background: ev.eventType.includes('EMERGENCY')
                      ? 'rgba(239, 68, 68, 0.2)'
                      : ev.eventType.includes('PETITION')
                      ? 'rgba(168, 85, 247, 0.2)'
                      : 'rgba(2, 132, 199, 0.2)',
                    color: ev.eventType.includes('EMERGENCY')
                      ? '#f87171'
                      : ev.eventType.includes('PETITION')
                      ? '#c084fc'
                      : '#38bdf8',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}
                >
                  {ev.eventType}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {new Date(ev.timestamp).toLocaleString()}
                </span>
              </div>

              <div style={{ fontSize: '0.74rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                {ev.eventType === 'BLOCK_EMERGENCY_DISPATCHED' && (
                  <span>
                    🚨 Block <b>{ev.gridId}</b> spike ({ev.pm25} µg/m³) alerted <b>{ev.facilitiesCount} institutions</b>.
                  </span>
                )}
                {ev.eventType === 'PREDICTIVE_ADVISORY_DISPATCHED' && (
                  <span>
                    🌅 Advisory sent to <b>{ev.facilityName}</b> (Predicted Peak: {ev.predictedPeak} µg/m³).
                  </span>
                )}
                {ev.eventType === '14_DAY_PETITION_DISPATCHED' && (
                  <span>
                    ⚖️ Section 10 Petition filed for Block <b>{ev.gridId}</b> ({ev.facilitiesCount} facilities).
                  </span>
                )}
                {ev.eventType === 'CYCLE_COMPLETED' && (
                  <span>
                    🔄 Cycle #{ev.cycleId} completed. Synced {ev.telemetrySync?.syncedBlocksCount || 0} blocks.
                  </span>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
