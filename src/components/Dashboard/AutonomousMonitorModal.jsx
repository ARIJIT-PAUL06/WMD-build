import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Activity,
  RefreshCw,
  FileText,
  X,
  Zap,
  Clock,
  Key
} from 'lucide-react';
import MonitorStatusTab from './MonitorStatusTab';
import MonitorPillar1Tab from './MonitorPillar1Tab';
import MonitorPillar2Tab from './MonitorPillar2Tab';
import MonitorPillar3Tab from './MonitorPillar3Tab';
import MonitorAuditTab from './MonitorAuditTab';

export default function AutonomousMonitorModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('status'); // 'status' | 'pillar1' | 'pillar2' | 'pillar3' | 'audit'
  
  // Ephemeral demo session admin key (sessionStorage only, no persistent localStorage)
  const [sessionAdminKey, setSessionAdminKey] = useState(() => {
    return (typeof window !== 'undefined' && sessionStorage.getItem('wmd_admin_key')) || '';
  });
  const [showKeyInput, setShowKeyInput] = useState(false);

  const handleKeySave = (val) => {
    setSessionAdminKey(val);
    if (typeof window !== 'undefined') {
      if (val) sessionStorage.setItem('wmd_admin_key', val);
      else sessionStorage.removeItem('wmd_admin_key');
    }
  };
  
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
  const getAuthHeaders = () => {
    const adminKey = sessionAdminKey || (typeof window !== 'undefined' && sessionStorage.getItem('wmd_admin_key')) || '';
    const headers = { 'Content-Type': 'application/json' };
    if (adminKey) headers['x-admin-key'] = adminKey;
    return headers;
  };

  const handleRunFullCycle = async () => {
    try {
      setCycleLoading(true);
      setActionMessage(null);
      const res = await fetch('/api/monitor/run-cycle', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ dispatchViaSes: false, isSandbox: true })
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMessage(`Cycle Note: ${data.error || 'Admin key required for live monitoring execution.'}`);
        return;
      }
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
      const res = await fetch('/api/monitor/clear-debounces', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMessage(`Clear Note: ${data.error || 'Admin key required.'}`);
        return;
      }
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
        headers: getAuthHeaders(),
        body: JSON.stringify({
          facilityId: p1FacilityId,
          thresholdPm25: p1Threshold,
          simulatedPm25: simulatedValue,
          dispatchViaSes: false,
          isSandbox: true,
          ignoreDebounce: true
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setP1Result({ error: data.error || 'Admin key required to run simulation.' });
        return;
      }
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
        headers: getAuthHeaders(),
        body: JSON.stringify({
          gridId: p2GridId,
          currentPm25: p2CurrentPm25,
          anomalyType: p2AnomalyType,
          dispatchViaSes: false,
          isSandbox: true,
          ignoreDebounce: p2IgnoreDebounce
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setP2Result({ error: data.error || 'Admin key required.' });
        return;
      }
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
        headers: getAuthHeaders(),
        body: JSON.stringify({
          gridId: p3GridId,
          dispatchViaSes: false,
          isSandbox: true,
          ignoreDebounce: true,
          forcePetition: p3ForcePetition
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setP3Result({ error: data.error || 'Admin key required.' });
        return;
      }
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
            {showKeyInput ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="password"
                  placeholder="x-admin-key"
                  value={sessionAdminKey}
                  onChange={(e) => handleKeySave(e.target.value)}
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    color: '#38bdf8',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '0.74rem',
                    width: '120px',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={() => setShowKeyInput(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    color: '#94a3b8',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    cursor: 'pointer'
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowKeyInput(true)}
                title={sessionAdminKey ? 'Admin session active' : 'Enter admin key for demo testing'}
                style={{
                  background: sessionAdminKey ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${sessionAdminKey ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.12)'}`,
                  color: sessionAdminKey ? '#34d399' : '#94a3b8',
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
                <Key size={14} />
                <span>{sessionAdminKey ? 'Authorized' : 'Admin Key'}</span>
              </button>
            )}

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
          {activeTab === 'status' && (
            <MonitorStatusTab
              daemonStatus={daemonStatus}
              setActiveTab={setActiveTab}
              handleRunFullCycle={handleRunFullCycle}
              cycleLoading={cycleLoading}
              handleClearDebounces={handleClearDebounces}
              cycleReport={cycleReport}
            />
          )}

          {activeTab === 'pillar1' && (
            <MonitorPillar1Tab
              p1Search={p1Search}
              setP1Search={setP1Search}
              p1FacilityId={p1FacilityId}
              setP1FacilityId={setP1FacilityId}
              filteredFacilities={filteredFacilities}
              p1Scenario={p1Scenario}
              setP1Scenario={setP1Scenario}
              p1SimulatedPm25={p1SimulatedPm25}
              setP1SimulatedPm25={setP1SimulatedPm25}
              selectedFacility={selectedFacility}
              handleTestPillar1={handleTestPillar1}
              p1Loading={p1Loading}
              p1Result={p1Result}
            />
          )}

          {activeTab === 'pillar2' && (
            <MonitorPillar2Tab
              p2GridId={p2GridId}
              setP2GridId={setP2GridId}
              grids={grids}
              p2CurrentPm25={p2CurrentPm25}
              setP2CurrentPm25={setP2CurrentPm25}
              facilitiesInP2Grid={facilitiesInP2Grid}
              p2IgnoreDebounce={p2IgnoreDebounce}
              setP2IgnoreDebounce={setP2IgnoreDebounce}
              handleTestPillar2={handleTestPillar2}
              p2Loading={p2Loading}
              p2Result={p2Result}
            />
          )}

          {activeTab === 'pillar3' && (
            <MonitorPillar3Tab
              p3GridId={p3GridId}
              setP3GridId={setP3GridId}
              grids={grids}
              p3Compliance={p3Compliance}
              p3ForcePetition={p3ForcePetition}
              setP3ForcePetition={setP3ForcePetition}
              handleTestPillar3={handleTestPillar3}
              p3Loading={p3Loading}
              p3Result={p3Result}
            />
          )}

          {activeTab === 'audit' && (
            <MonitorAuditTab
              auditList={auditList}
              auditFilter={auditFilter}
              setAuditFilter={setAuditFilter}
            />
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
