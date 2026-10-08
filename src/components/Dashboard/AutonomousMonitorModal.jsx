import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Activity,
  RefreshCw,
  Send,
  FileText,
  X,
  Building2,
  GraduationCap,
  Sliders,
  Search,
  Zap,
  Trash2,
  CheckCircle2,
  Clock,
  ChevronRight,
  ExternalLink,
  Layers,
  MapPin,
  ArrowRight
} from 'lucide-react';
import AnimatedCounter from '../common/AnimatedCounter';

export default function AutonomousMonitorModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('status'); // 'status' | 'pillar1' | 'pillar2' | 'pillar3' | 'audit'
  
  // Daemon status state
  const [statusLoading, setStatusLoading] = useState(false);
  const [daemonStatus, setDaemonStatus] = useState(null);
  
  // Directory & Grid data
  const [facilities, setFacilities] = useState([]);
  const [grids, setGrids] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Pillar 1 state (Morning Predictive Advisory)
  const [p1Search, setP1Search] = useState('');
  const [p1FacilityId, setP1FacilityId] = useState('dps_rk_puram');
  const [p1Threshold, setP1Threshold] = useState(75);
  const [p1SimulatedPm25, setP1SimulatedPm25] = useState(245);
  const [p1Scenario, setP1Scenario] = useState('hazardous'); // 'hazardous' | 'clean'
  const [p1Loading, setP1Loading] = useState(false);
  const [p1Result, setP1Result] = useState(null);

  // Pillar 2 state (Block Emergency Surge)
  const [p2GridId, setP2GridId] = useState('GRID_R03_C05');
  const [p2CurrentPm25, setP2CurrentPm25] = useState(265);
  const [p2AnomalyType, setP2AnomalyType] = useState('Sudden Planetary Boundary Layer Compression & Inversion Trap');
  const [p2IgnoreDebounce, setP2IgnoreDebounce] = useState(true);
  const [p2Loading, setP2Loading] = useState(false);
  const [p2Result, setP2Result] = useState(null);

  // Pillar 3 state (14-Day Chronic Petition)
  const [p3GridId, setP3GridId] = useState('GRID_R03_C05');
  const [p3Compliance, setP3Compliance] = useState(null);
  const [p3ForcePetition, setP3ForcePetition] = useState(true);
  const [p3Loading, setP3Loading] = useState(false);
  const [p3Result, setP3Result] = useState(null);

  // Audit state
  const [auditList, setAuditList] = useState([]);
  const [auditFilter, setAuditFilter] = useState('ALL');
  const [auditLoading, setAuditLoading] = useState(false);

  // General Action state
  const [cycleLoading, setCycleLoading] = useState(false);
  const [cycleReport, setCycleReport] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  // Load Daemon Status
  const fetchStatus = async () => {
    try {
      setStatusLoading(true);
      const res = await fetch('/api/monitor/status');
      if (res.ok) {
        const data = await res.json();
        setDaemonStatus(data);
        if (data.recentAudit) {
          setAuditList(data.recentAudit);
        }
      }
    } catch (err) {
      console.warn('Failed fetching monitor status:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  // Load Facilities & Grids
  const fetchDirectory = async () => {
    try {
      setDataLoading(true);
      const [facRes, gridRes] = await Promise.all([
        fetch('/api/spatial-grids/facilities'),
        fetch('/api/spatial-grids/directory')
      ]);

      if (facRes.ok) {
        const facData = await facRes.json();
        setFacilities(facData.facilities || []);
      }
      if (gridRes.ok) {
        const gridData = await gridRes.json();
        setGrids(gridData.grids || []);
      }
    } catch (err) {
      console.warn('Failed fetching directory:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Load 14-day compliance for Pillar 3
  const fetchP3Compliance = async (gId) => {
    try {
      const res = await fetch(`/api/spatial-grids/${gId}/compliance`);
      if (res.ok) {
        const data = await res.json();
        setP3Compliance(data.compliance || null);
      }
    } catch (err) {
      console.warn('Failed fetching compliance:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      fetchDirectory();
    }
  }, [isOpen]);

  useEffect(() => {
    if (p3GridId) {
      fetchP3Compliance(p3GridId);
    }
  }, [p3GridId]);

  // Filter facilities for Pillar 1 search
  const filteredFacilities = useMemo(() => {
    if (!p1Search.trim()) return facilities.slice(0, 30);
    const q = p1Search.toLowerCase();
    return facilities.filter(f => 
      f.name.toLowerCase().includes(q) || 
      (f.locality && f.locality.toLowerCase().includes(q)) ||
      (f.district && f.district.toLowerCase().includes(q))
    ).slice(0, 30);
  }, [facilities, p1Search]);

  const selectedFacility = useMemo(() => {
    return facilities.find(f => f.id === p1FacilityId) || facilities[0];
  }, [facilities, p1FacilityId]);

  // Facilities in Pillar 2 selected grid
  const facilitiesInP2Grid = useMemo(() => {
    return facilities.filter(f => f.gridId === p2GridId);
  }, [facilities, p2GridId]);

  // Trigger Immediate Full Autonomous Monitoring Cycle
  const handleRunFullCycle = async () => {
    try {
      setCycleLoading(true);
      setActionMessage(null);
      const res = await fetch('/api/monitor/run-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dispatchViaSes: true, isSandbox: true })
      });
      const data = await res.json();
      setCycleReport(data.report);
      setActionMessage('Full autonomous cycle executed and audit trail updated!');
      fetchStatus();
    } catch (err) {
      setActionMessage(`Cycle Error: ${err.message}`);
    } finally {
      setCycleLoading(false);
    }
  };

  // Clear Debounce Cooldowns
  const handleClearDebounces = async () => {
    try {
      const res = await fetch('/api/monitor/clear-debounces', { method: 'POST' });
      const data = await res.json();
      setActionMessage('All 3h and 24h debouncing cooldowns cleared! Ready for immediate re-test.');
      fetchStatus();
    } catch (err) {
      setActionMessage(`Clear Error: ${err.message}`);
    }
  };

  // Run Pillar 1 Test
  const handleTestPillar1 = async () => {
    try {
      setP1Loading(true);
      setP1Result(null);
      const simulatedValue = p1Scenario === 'clean' ? 65 : p1SimulatedPm25;
      
      const res = await fetch('/api/monitor/predictive-advisories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityId: p1FacilityId,
          thresholdPm25: p1Threshold,
          simulatedPm25: simulatedValue,
          dispatchViaSes: true,
          isSandbox: true,
          ignoreDebounce: true
        })
      });
      const data = await res.json();
      setP1Result(data);
      fetchStatus();
    } catch (err) {
      setP1Result({ error: err.message });
    } finally {
      setP1Loading(false);
    }
  };

  // Run Pillar 2 Test
  const handleTestPillar2 = async () => {
    try {
      setP2Loading(true);
      setP2Result(null);
      const res = await fetch('/api/monitor/block-emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gridId: p2GridId,
          currentPm25: p2CurrentPm25,
          anomalyType: p2AnomalyType,
          dispatchViaSes: true,
          isSandbox: true,
          ignoreDebounce: p2IgnoreDebounce
        })
      });
      const data = await res.json();
      setP2Result(data);
      fetchStatus();
    } catch (err) {
      setP2Result({ error: err.message });
    } finally {
      setP2Loading(false);
    }
  };

  // Run Pillar 3 Test
  const handleTestPillar3 = async () => {
    try {
      setP3Loading(true);
      setP3Result(null);
      const res = await fetch('/api/monitor/chronic-petitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gridId: p3GridId,
          dispatchViaSes: true,
          isSandbox: true,
          ignoreDebounce: true,
          forcePetition: p3ForcePetition
        })
      });
      const data = await res.json();
      setP3Result(data);
      fetchStatus();
    } catch (err) {
      setP3Result({ error: err.message });
    } finally {
      setP3Loading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(3, 7, 18, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        animation: 'fadeIn 0.25s ease-out'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '94vh',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(10, 15, 30, 0.99) 100%)',
          borderRadius: '20px',
          border: '1.5px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(56, 189, 248, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#e2e8f0',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
      >
        {/* HEADER BAR */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(2, 132, 199, 0.5)'
              }}
            >
              <ShieldCheck size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                  Autonomous Atmospheric Shield Test Bench
                </h2>
                <span
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                  DAEMON ONLINE
                </span>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                Self-serve verification engine covering 453 institutions across 60 Delhi 5km×5km blocks
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={fetchStatus}
              disabled={statusLoading}
              title="Refresh Daemon Status"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#cbd5e1',
                padding: '8px 12px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.76rem',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              <RefreshCw size={14} className={statusLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(15, 23, 42, 0.6)',
            overflowX: 'auto',
            gap: '8px'
          }}
        >
          {[
            { id: 'status', label: 'Daemon Status & Controls', icon: Activity },
            { id: 'pillar1', label: 'Pillar 1: Morning Predictive Advisory', icon: Zap },
            { id: 'pillar2', label: 'Pillar 2: 5km×5km Block Flash Alerts', icon: AlertTriangle },
            { id: 'pillar3', label: 'Pillar 3: 14-Day Section 10 Legal Petitions', icon: FileText },
            { id: 'audit', label: 'Live Audit Log Feed', icon: Clock },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #38bdf8' : '2px solid transparent',
                  color: isActive ? '#38bdf8' : '#94a3b8',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ACTION FEEDBACK ALERT */}
        {actionMessage && (
          <div
            style={{
              padding: '10px 24px',
              background: 'rgba(2, 132, 199, 0.15)',
              borderBottom: '1px solid rgba(2, 132, 199, 0.3)',
              color: '#38bdf8',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>ℹ️ {actionMessage}</span>
            <button
              onClick={() => setActionMessage(null)}
              style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* TAB CONTENT CONTAINER */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          
          {/* ============================================================== */}
          {/* TAB 1: SYSTEM STATUS & DAEMON CONTROLS                        */}
          {/* ============================================================== */}
          {activeTab === 'status' && (
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
          )}

          {/* ============================================================== */}
          {/* TAB 2: PILLAR 1: MORNING PREDICTIVE ADVISORY                   */}
          {/* ============================================================== */}
          {activeTab === 'pillar1' && (
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
                          {f.facilityClass === 'healthcare' ? '🏥' : '🎓'} {f.name} ({f.district || f.locality})
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
                        🌱 Clean Day (Suppression Test)
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
                        🚨 Severe Inversion (Alert Test)
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
                    <div style={{ color: '#38bdf8' }}>
                      Primary Email: {selectedFacility.primaryEmail || 'vayuvitals@gmail.com'}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
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
          )}

          {/* ============================================================== */}
          {/* TAB 3: PILLAR 2: 5KM X 5KM BLOCK FLASH ALERTS                  */}
          {/* ============================================================== */}
          {activeTab === 'pillar2' && (
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
          )}

          {/* ============================================================== */}
          {/* TAB 4: PILLAR 3: 14-DAY CHRONIC PETITION                      */}
          {/* ============================================================== */}
          {activeTab === 'pillar3' && (
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
                          {p3Compliance.petitionEligible ? 'Non-Compliant ⚠️' : 'Within Limits'}
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
                    <span>{p3Loading ? 'Dispatching Dossier...' : '⚖️ Dispatch Section 10 Legal Notice'}</span>
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
          )}

          {/* ============================================================== */}
          {/* TAB 5: AUDIT LOG FEED                                          */}
          {/* ============================================================== */}
          {activeTab === 'audit' && (
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
          )}

        </div>

        {/* FOOTER BAR */}
        <div
          style={{
            padding: '14px 28px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.74rem',
            color: '#64748b'
          }}
        >
          <div>
            VayuVitals Autonomous Monitoring Engine • Verified AWS SES Sandbox Route (<code>vayuvitals@gmail.com</code>)
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#e2e8f0',
              padding: '6px 14px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close Console
          </button>
        </div>
      </div>
    </div>
  );
}
