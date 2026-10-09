import React from 'react';
import { Lock } from 'lucide-react';

/**
 * Renders the Left Column School, Location, Authority, Demands, and Signatory Parameters Form
 */
export default function PetitionParametersForm({
  selectedSchoolId,
  handleSelectInstitution,
  schoolsDirectory,
  schoolName,
  setSchoolName,
  locality,
  setLocality,
  days,
  setDays,
  threshold,
  setThreshold,
  authoritiesConfig,
  selectedAuthorityId,
  setSelectedAuthorityId,
  selectedDemands,
  toggleDemand,
  customDemand,
  setCustomDemand,
  handleAddCustomDemand,
  senderName,
  setSenderName,
  senderRole,
  setSenderRole,
  senderEmail,
  setSenderEmail,
  senderPhone,
  setSenderPhone,
  dpdpaConsent,
  setDpdpaConsent
}) {
  return (
    <>
      {/* 2. School & Location Parameters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          School & Observation Parameters
        </span>

        {/* Institution Quick-Select (Delhi-NCR Network) */}
        <div>
          <label style={{ fontSize: '0.72rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Select Campus / Institution</span>
            <span style={{ fontSize: '0.65rem', color: '#38bdf8' }}>Delhi-NCR Vulnerable Campuses</span>
          </label>
          <select
            value={selectedSchoolId}
            onChange={(e) => handleSelectInstitution(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#f8fafc',
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            {schoolsDirectory.educationalInstitutions.map((inst) => (
              <option key={inst.id} value={inst.id} style={{ background: '#0f172a', color: '#f8fafc' }}>
                {inst.name} — {inst.type} ({inst.studentCount} students)
              </option>
            ))}
            <option value="custom" style={{ background: '#0f172a', color: '#94a3b8' }}>
              + Custom Educational Campus / College
            </option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.72rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>School / Campus Name</label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#f8fafc',
                fontSize: '0.82rem'
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.72rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Locality / Area</label>
            <input
              type="text"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#f8fafc',
                fontSize: '0.82rem'
              }}
            />
          </div>
        </div>

        {/* Sliders for Days and Threshold */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#cbd5e1', marginBottom: '4px' }}>
              <span>Days Analyzed: <strong>{days} days</strong></span>
            </div>
            <input
              type="range"
              min="7"
              max="30"
              step="1"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#38bdf8' }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#cbd5e1', marginBottom: '4px' }}>
              <span>PM2.5 Threshold: <strong>{threshold} µg/m³</strong></span>
            </div>
            <input
              type="range"
              min="30"
              max="150"
              step="5"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#ef4444' }}
            />
          </div>
        </div>
      </div>

      {/* 3. Target Authority Selection */}
      <div>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
          Target Competent Authority
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {authoritiesConfig.authorities.map((auth) => (
            <label
              key={auth.id}
              onClick={() => setSelectedAuthorityId(auth.id)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: selectedAuthorityId === auth.id ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.6)',
                border: `1px solid ${selectedAuthorityId === auth.id ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <input
                type="radio"
                name="authority"
                checked={selectedAuthorityId === auth.id}
                onChange={() => setSelectedAuthorityId(auth.id)}
                style={{ marginTop: '3px', accentColor: '#38bdf8' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: selectedAuthorityId === auth.id ? '#38bdf8' : '#f1f5f9' }}>
                  {auth.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                  {auth.designation} · {auth.email}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 4. Action Demands Checklist */}
      <div>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
          Specific Administrative Demands
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {authoritiesConfig.standardDemands.map((demand) => {
            const isChecked = selectedDemands.includes(demand.text);
            return (
              <label
                key={demand.id}
                onClick={() => toggleDemand(demand.text)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: isChecked ? 'rgba(16, 185, 129, 0.08)' : 'rgba(15, 23, 42, 0.4)',
                  border: `1px solid ${isChecked ? 'rgba(52, 211, 153, 0.3)' : 'rgba(255, 255, 255, 0.06)'}`,
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  color: isChecked ? '#a7f3d0' : '#94a3b8'
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleDemand(demand.text)}
                  style={{ marginTop: '2px', accentColor: '#10b981' }}
                />
                <span>{demand.text}</span>
              </label>
            );
          })}
        </div>

        {/* Add Custom Demand */}
        <form onSubmit={handleAddCustomDemand} style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
          <input
            type="text"
            placeholder="Add custom demand (e.g. tree buffer / dust barrier)..."
            value={customDemand}
            onChange={(e) => setCustomDemand(e.target.value)}
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: '6px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#f8fafc',
              fontSize: '0.75rem'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'rgba(56, 189, 248, 0.2)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Add
          </button>
        </form>
      </div>

      {/* 5. Sender Credentials (Local Only) */}
      <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
            Signatory / Submitter Details
          </span>
          <span style={{ fontSize: '0.65rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Lock size={10} /> DPDPA Protected
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Full Name</label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Designation / Role</label>
            <input
              type="text"
              value={senderRole}
              onChange={(e) => setSenderRole(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Official Email</label>
            <input
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Phone / Mobile</label>
            <input
              type="text"
              value={senderPhone}
              onChange={(e) => setSenderPhone(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>
        </div>

        {/* DPDPA 2023 Explicit Consent Toggle */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '10px', fontSize: '0.68rem', color: '#94a3b8', cursor: 'pointer', lineHeight: '1.4' }}>
          <input
            type="checkbox"
            checked={dpdpaConsent}
            onChange={(e) => setDpdpaConsent(e.target.checked)}
            style={{ marginTop: '2px', accentColor: '#10b981' }}
          />
          <span>I consent to using these credentials strictly to format this formal civic grievance draft (India DPDP Act 2023). Personal data is processed in browser memory only.</span>
        </label>
      </div>
    </>
  );
}
