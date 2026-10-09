import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  FileText,
  Shield,
  Trash2,
  ExternalLink,
  RefreshCw,
  School,
  User,
  Clock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { apiFetch } from '../../utils/apiFetch';
import { useAuth } from '../../context/AuthContext';

export default function PetitionsManagerModal({ isOpen, onClose, defaultTab = 'myPetitions' }) {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState(defaultTab); // 'myPetitions' | 'schoolPetitions'
  const [myPetitions, setMyPetitions] = useState([]);
  const [schoolPetitions, setSchoolPetitions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPetition, setSelectedPetition] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchMyPetitions = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/petitions');
      if (res.ok) {
        const data = await res.json();
        setMyPetitions(data.petitions || []);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed loading your petitions.');
      }
    } catch (err) {
      setError(err.message || 'Network error loading petitions.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const fetchSchoolPetitions = useCallback(async () => {
    if (!isAuthenticated || !user?.isSchoolAdmin) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/petition/school');
      if (res.ok) {
        const data = await res.json();
        setSchoolPetitions(data.petitions || []);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || errData.error || 'Failed loading school petitions.');
      }
    } catch (err) {
      setError(err.message || 'Network error loading school petitions.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.isSchoolAdmin]);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'myPetitions') {
        fetchMyPetitions();
      } else if (activeTab === 'schoolPetitions') {
        fetchSchoolPetitions();
      }
    }
  }, [isOpen, activeTab, fetchMyPetitions, fetchSchoolPetitions]);

  const handleDeleteOne = async (petitionId) => {
    if (!window.confirm('Are you sure you want to delete this petition?')) return;
    try {
      const res = await apiFetch(`/api/petitions/${petitionId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setMyPetitions(prev => prev.filter(p => p.petitionId !== petitionId));
        if (selectedPetition?.petitionId === petitionId) {
          setSelectedPetition(null);
        }
        setActionSuccess('Petition deleted successfully.');
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err) {
      alert('Failed to delete petition: ' + err.message);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Right to Erasure (DPDP Act): This will permanently delete ALL petitions filed under your account from the database. Are you absolutely sure?')) {
      return;
    }
    try {
      const res = await apiFetch('/api/petitions', {
        method: 'DELETE'
      });
      if (res.ok) {
        setMyPetitions([]);
        setSelectedPetition(null);
        setActionSuccess('All petitions for your account have been permanently erased.');
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err) {
      alert('Failed to erase all petitions: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          maxHeight: '85vh',
          background: '#090d16',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden'
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.6)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8'
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                Civic Grievances & Petitions Registry
              </h2>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#94a3b8' }}>
                Server-backed records stored securely in Mumbai (ap-south-1) under Indian privacy protections
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* TABS */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.2)',
            padding: '0 24px',
            gap: '12px'
          }}
        >
          <button
            onClick={() => setActiveTab('myPetitions')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'myPetitions' ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeTab === 'myPetitions' ? '#38bdf8' : '#94a3b8',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <User size={15} />
            <span>My Petitions ({myPetitions.length})</span>
          </button>

          {user?.isSchoolAdmin && (
            <button
              onClick={() => setActiveTab('schoolPetitions')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'schoolPetitions' ? '2px solid #38bdf8' : '2px solid transparent',
                color: activeTab === 'schoolPetitions' ? '#38bdf8' : '#94a3b8',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <School size={15} />
              <span>School Petitions (Admin View)</span>
            </button>
          )}
        </div>

        {/* NOTICES */}
        {actionSuccess && (
          <div style={{ padding: '8px 24px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.78rem' }}>
            ✓ {actionSuccess}
          </div>
        )}

        {/* CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {!isAuthenticated ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Shield size={36} color="#38bdf8" style={{ marginBottom: '12px' }} />
              <h3 style={{ margin: '0 0 8px 0', color: '#ffffff', fontSize: '1rem' }}>Sign In Required</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', maxWidth: '400px', margin: '0 auto 16px auto' }}>
                Please sign in to access your saved civic grievance petitions or institutional administrator dashboard.
              </p>
              <button
                onClick={() => { onClose(); openAuthModal('signIn'); }}
                className="btn-primary"
                style={{ padding: '8px 20px', borderRadius: '10px' }}
              >
                Sign In
              </button>
            </div>
          ) : activeTab === 'myPetitions' ? (
            <div>
              {/* PRIVACY NOTICE BANNER */}
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontSize: '0.76rem',
                  color: '#94a3b8',
                  marginBottom: '18px',
                  lineHeight: '1.5'
                }}
              >
                <strong style={{ color: '#38bdf8' }}>Privacy Guarantee:</strong> When you save, your letter, including your name and contact, is stored on our server in Mumbai (ap-south-1), visible only to you, and you can delete it. Your school only sees the date, authority, subject and air-quality summary.
              </div>

              {/* LIST / DETAIL */}
              {selectedPetition ? (
                <div>
                  <button
                    onClick={() => setSelectedPetition(null)}
                    style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.78rem', cursor: 'pointer', marginBottom: '14px' }}
                  >
                    ← Back to list
                  </button>

                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Petition ID: {selectedPetition.petitionId}</span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399'
                        }}
                      >
                        {selectedPetition.status}
                      </span>
                    </div>

                    <h3 style={{ margin: '0 0 10px 0', color: '#ffffff', fontSize: '1rem' }}>
                      {selectedPetition.letterSubject}
                    </h3>
                    <p style={{ margin: '0 0 16px 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                      Authority: <strong>{selectedPetition.authorityName}</strong> ({selectedPetition.authorityRole}) • School: {selectedPetition.schoolName || selectedPetition.targetName}
                    </p>

                    <pre
                      style={{
                        background: 'rgba(0, 0, 0, 0.4)',
                        padding: '16px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        color: '#cbd5e1',
                        fontSize: '0.75rem',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'var(--font-mono, monospace)',
                        maxHeight: '300px',
                        overflowY: 'auto'
                      }}
                    >
                      {selectedPetition.letterText}
                    </pre>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                      <button
                        onClick={() => handleDeleteOne(selectedPetition.petitionId)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '0.76rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Trash2 size={14} /> Delete this petition
                      </button>
                    </div>
                  </div>
                </div>
              ) : myPetitions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '0.82rem' }}>
                  No saved petitions yet. Generate a petition from the SafeRecess action deck and click "Save to My petitions".
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.76rem', color: '#64748b' }}>{myPetitions.length} Petitions on file</span>
                    <button
                      onClick={handleDeleteAll}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#f87171',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      Right to Erasure (Delete All)
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {myPetitions.map(p => (
                      <div
                        key={p.petitionId}
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '12px',
                          padding: '14px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '14px'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'rgba(56, 189, 248, 0.15)',
                                color: '#38bdf8'
                              }}
                            >
                              {p.status || 'DRAFT_SAVED'}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.letterSubject}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {p.authorityName} • {p.schoolName || p.targetName}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => setSelectedPetition(p)}
                            style={{
                              background: 'rgba(255, 255, 255, 0.08)',
                              border: 'none',
                              color: '#38bdf8',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Open
                          </button>
                          <button
                            onClick={() => handleDeleteOne(p.petitionId)}
                            title="Delete"
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: 'none',
                              color: '#f87171',
                              padding: '6px 8px',
                              borderRadius: '8px',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* SCHOOL PETITIONS (ADMIN VIEW) */}
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontSize: '0.76rem',
                  color: '#94a3b8',
                  marginBottom: '18px',
                  lineHeight: '1.5'
                }}
              >
                <strong style={{ color: '#34d399' }}>Institutional Administrator Privacy Protection:</strong> Under Indian privacy regulations (DPDP Act), citizen contact details and full grievance letter text are not accessible. Administrators can review filing dates, target authorities, grievance subjects, and verified air-quality evidence summaries.
              </div>

              {schoolPetitions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '0.82rem' }}>
                  No citizen petitions currently recorded for your school.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {schoolPetitions.map(p => (
                    <div
                      key={p.petitionId}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '16px 20px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Filing Date: {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399'
                          }}
                        >
                          Status: {p.status}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                        {p.letterSubject}
                      </div>

                      <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginBottom: '8px' }}>
                        Addressed to: <strong>{p.authorityName}</strong>
                      </div>

                      {p.evidenceSummary && (
                        <div
                          style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.04)',
                            display: 'flex',
                            gap: '16px',
                            flexWrap: 'wrap',
                            fontSize: '0.72rem',
                            color: '#cbd5e1'
                          }}
                        >
                          <span>Peak PM2.5: <strong style={{ color: '#f87171' }}>{p.evidenceSummary.peakPm25 ?? 'N/A'} µg/m³</strong></span>
                          <span>Avg Morning: <strong>{p.evidenceSummary.avgMorningPm25 ?? 'N/A'} µg/m³</strong></span>
                          <span>Exceedances: <strong>{p.evidenceSummary.exceedanceCount ?? 0} days</strong></span>
                          <span>Horizon: <strong>{p.evidenceSummary.timeHorizonDays ?? 14} days</strong></span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#e2e8f0',
              padding: '6px 16px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
