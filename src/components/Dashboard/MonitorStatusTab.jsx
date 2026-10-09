import React from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import AnimatedCounter from '../common/AnimatedCounter';

/**
 * Tab 1: System Status, Coverage Scope Metrics, 3-Pillar Architecture Navigator,
 * and Daemon Trigger & Debounce Controls.
 */
export default function MonitorStatusTab({
  daemonStatus,
  setActiveTab,
  handleRunFullCycle,
  cycleLoading,
  handleClearDebounces,
  cycleReport
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* STATS TILES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '16px' }}>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Coverage Scope</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', margin: '6px 0 2px 0' }}>
            <AnimatedCounter value={453} />
          </div>
          <div style={{ fontSize: '0.72rem', color: '#38bdf8' }}>200 Schools + 253 Hospitals</div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '16px' }}>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Spatial Grids</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399', margin: '6px 0 2px 0' }}>
            <AnimatedCounter value={60} suffix=" Blocks" />
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>5km × 5km Continuous Grids</div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '16px' }}>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Autonomous Cycles</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24', margin: '6px 0 2px 0' }}>
            <AnimatedCounter value={daemonStatus?.state?.totalCyclesExecuted || 1} />
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Runs every 30 mins</div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '16px' }}>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Dispatched Alerts</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f87171', margin: '6px 0 2px 0' }}>
            <AnimatedCounter value={(daemonStatus?.state?.totalEmergenciesDispatched || 0) + (daemonStatus?.state?.totalPredictiveAdvisoriesDispatched || 0)} />
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Verified Amazon SES Sandbox</div>
        </div>
      </div>

      {/* VISUAL 3-PILLAR PROTECTIVE ARCHITECTURE */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            AUTONOMOUS 3-PILLAR PROTECTIVE ARCHITECTURE
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Click any pillar to run testbench simulation</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div
            onClick={() => setActiveTab('pillar1')}
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '12px',
              padding: '14px',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#38bdf8' }}>PILLAR 1</span>
              <span style={{ fontSize: '0.62rem', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.06)', padding: '2px 6px', borderRadius: '4px' }}>07:00 IST</span>
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>Predictive Morning Advisory</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>Simulates school day exposure and suggests PE scheduling changes before campus bells.</div>
          </div>

          <div
            onClick={() => setActiveTab('pillar2')}
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(248, 113, 113, 0.2)',
              borderRadius: '12px',
              padding: '14px',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#f87171' }}>PILLAR 2</span>
              <span style={{ fontSize: '0.62rem', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.06)', padding: '2px 6px', borderRadius: '4px' }}>Real-Time 30m</span>
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>Block Surge Emergency</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>Detects sudden inversion traps and dispatches immediate outdoor sports ground halts.</div>
          </div>

          <div
            onClick={() => setActiveTab('pillar3')}
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(52, 211, 153, 0.2)',
              borderRadius: '12px',
              padding: '14px',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#34d399' }}>PILLAR 3</span>
              <span style={{ fontSize: '0.62rem', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.06)', padding: '2px 6px', borderRadius: '4px' }}>14-Day Cycle</span>
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>Chronic Evidence Petition</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>Aggregates 14 consecutive unmonitored/severe days and triggers DPCC grievance petitions.</div>
          </div>
        </div>
      </div>

      {/* QUICK DAEMON CONTROLS */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#ffffff' }}>
              Interactive Daemon Controls
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              Force an immediate continuous cycle or reset anti-spam debouncing cooldowns to test repeatedly.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleRunFullCycle}
              disabled={cycleLoading}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)'
              }}
            >
              <RefreshCw size={14} className={cycleLoading ? 'animate-spin' : ''} />
              <span>{cycleLoading ? 'Executing Cycle...' : 'Run Full Autonomous Cycle Now'}</span>
            </button>

            <button
              onClick={handleClearDebounces}
              title="Clear 3h block and 24h facility cooldowns"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '10px 16px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Trash2 size={14} />
              <span>Clear Cooldowns</span>
            </button>
          </div>
        </div>

        {/* CYCLE REPORT OUTPUT */}
        {cycleReport && (
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '12px',
              padding: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.76rem'
            }}
          >
            <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '6px' }}>
              ✅ Autonomous Cycle #{cycleReport.cycleId} Execution Summary ({new Date(cycleReport.timestamp).toLocaleTimeString()})
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', color: '#cbd5e1', lineHeight: '1.6' }}>
              <li>Telemetry Sync: {cycleReport.telemetrySync?.syncedBlocksCount || 0} spatial grid blocks synchronized</li>
              <li>Block Emergency Surges: {cycleReport.emergencySurgesDetected?.length || 0} triggered</li>
              <li>14-Day Petitions Evaluated: {cycleReport.petitionsEvaluated?.length || 0} eligible blocks</li>
              <li>Morning Predictive Advisories: {cycleReport.predictiveAdvisoriesEvaluated?.length || 0} facilities analyzed</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
