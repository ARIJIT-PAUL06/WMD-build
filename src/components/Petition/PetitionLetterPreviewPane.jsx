import React from 'react';
import {
  Sparkles,
  CheckCircle,
  Copy,
  Check,
  Mail,
  ExternalLink,
  Download
} from 'lucide-react';

/**
 * Renders the Right Column Live Letter Preview, Language & AI Tone Polish Controls,
 * and the Bottom Action Dock (Copy, Email, Portal, PDF Dossier).
 */
export default function PetitionLetterPreviewPane({
  language,
  setLanguage,
  tone,
  setTone,
  handlePolishWithAi,
  isPolishing,
  aiTelemetry,
  schoolName,
  todayFormatted,
  draftError,
  isGeneratingDraft,
  generateDraft,
  editableLetterEn,
  setEditableLetterEn,
  editableLetterHi,
  setEditableLetterHi,
  days,
  evidence,
  activeLetterText,
  copyFeedback,
  handleCopyCpgrams,
  handleOpenEmailDraft,
  currentAuthority,
  handleOpenOfficialPortal,
  handleDownloadPdf,
  isGeneratingPdf
}) {
  return (
    <div
      style={{
        width: '58%',
        display: 'flex',
        flexDirection: 'column',
        background: '#090d16',
        overflow: 'hidden'
      }}
    >
      {/* Review Controls Header */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.8)'
        }}
      >
        {/* Language Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginRight: '4px' }}>Language:</span>
          <button
            onClick={() => setLanguage('en')}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: language === 'en' ? '#0284c7' : 'rgba(255, 255, 255, 0.05)',
              color: language === 'en' ? '#fff' : '#94a3b8',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              cursor: 'pointer'
            }}
          >
            English
          </button>
          <button
            onClick={() => setLanguage('hi')}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: language === 'hi' ? '#0284c7' : 'rgba(255, 255, 255, 0.05)',
              color: language === 'hi' ? '#fff' : '#94a3b8',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              cursor: 'pointer'
            }}
          >
            हिंदी (राजकीय प्रारूप)
          </button>
        </div>

        {/* Tone Switcher & AI Polish Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#e2e8f0',
              fontSize: '0.72rem'
            }}
          >
            <option value="formal">Tone: Formal & Administrative</option>
            <option value="urgent">Tone: Urgent Health Alert</option>
            <option value="collaborative">Tone: Collaborative Civic</option>
          </select>

          <button
            onClick={handlePolishWithAi}
            disabled={isPolishing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(56, 189, 248, 0.3))',
              border: '1px solid rgba(168, 85, 247, 0.5)',
              color: '#e9d5ff',
              cursor: isPolishing ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Sparkles size={13} className={isPolishing ? 'animate-spin' : ''} />
            {isPolishing ? 'Polishing...' : 'Polish Tone with AI'}
          </button>
        </div>
      </div>

      {/* AI Telemetry Badge (if polished) */}
      {aiTelemetry && (
        <div style={{ padding: '4px 20px', background: 'rgba(168, 85, 247, 0.1)', fontSize: '0.7rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle size={12} />
          <span>Refined with <strong>{aiTelemetry.mode}</strong> ({aiTelemetry.model}) · Tone: <em>{aiTelemetry.tone}</em> · Numbers strictly preserved</span>
        </div>
      )}

      {/* Editable Letter Canvas */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        <div
          style={{
            background: '#ffffff',
            color: '#1e293b',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
            padding: '28px 32px',
            minHeight: '100%',
            fontFamily: 'Georgia, Cambria, "Times New Roman", serif',
            fontSize: '0.88rem',
            lineHeight: '1.6',
            position: 'relative'
          }}
        >
          {/* Official Letterhead Strip */}
          <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#0f172a', letterSpacing: '0.02em' }}>
                  OFFICIAL CIVIC GRIEVANCE & PETITION DRAFT
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Prepared by {schoolName} · Verified with Sensor Telemetry
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#64748b' }}>
                <div>Date: {todayFormatted}</div>
                <div style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '0.7rem' }}>[DRAFT FOR CITIZEN SUBMISSION]</div>
              </div>
            </div>
          </div>

          {draftError ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px dashed #fca5a5' }}>
              <div style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '8px' }}>
                Draft Generation Error
              </div>
              <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '16px' }}>
                {draftError}
              </div>
              <button
                type="button"
                onClick={generateDraft}
                disabled={isGeneratingDraft}
                style={{
                  padding: '6px 14px',
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                {isGeneratingDraft ? 'Retrying...' : 'Retry Generating Draft'}
              </button>
            </div>
          ) : (
            <textarea
              value={language === 'hi' ? editableLetterHi : editableLetterEn}
              onChange={(e) => {
                if (language === 'hi') {
                  setEditableLetterHi(e.target.value);
                } else {
                  setEditableLetterEn(e.target.value);
                }
              }}
              style={{
                width: '100%',
                minHeight: '440px',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                lineHeight: 'inherit',
                color: '#1e293b',
                background: 'transparent',
                whiteSpace: 'pre-wrap'
              }}
              placeholder={isGeneratingDraft ? 'Drafting formal grievance from verified telemetry...' : 'Drafting formal grievance...'}
            />
          )}

          {/* Empirical Watermark Note */}
          <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>
            <strong>Annexure Attached:</strong> Verified continuous {days}-day morning exposure log ({evidence?.stationName || 'CAAQMS Station'}) compiled via VayuVitals SafeRecess Protocol.
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* STEP 4: OUTPUT ACTIONS BAR */}
      {/* ============================================================= */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}
      >
        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          CPGRAMS Character count: <strong style={{ color: activeLetterText.length > 4000 ? '#ef4444' : '#38bdf8' }}>{activeLetterText.length}</strong> / 4,000 max
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* 1. Copy CPGRAMS Text */}
          <button
            onClick={handleCopyCpgrams}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 600,
              background: copyFeedback ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              border: `1px solid ${copyFeedback ? 'rgba(52, 211, 153, 0.4)' : 'rgba(255, 255, 255, 0.15)'}`,
              color: copyFeedback ? '#34d399' : '#e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {copyFeedback ? <Check size={14} /> : <Copy size={14} />}
            {copyFeedback ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
          </button>

          {/* 2. Open Official Mailto */}
          <button
            onClick={handleOpenEmailDraft}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 600,
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              cursor: 'pointer'
            }}
            title={`Open draft addressed to ${currentAuthority?.email}`}
          >
            <Mail size={14} />
            Email Authority Draft
          </button>

          {/* 3. Open Official Grievance Portal */}
          <button
            onClick={handleOpenOfficialPortal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 600,
              background: 'rgba(168, 85, 247, 0.15)',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              color: '#c084fc',
              cursor: 'pointer'
            }}
            title="Open official government grievance submission portal"
          >
            <ExternalLink size={14} />
            Open {currentAuthority?.portalName?.split(' ')[0] || 'Portal'} Portal
          </button>

          {/* 4. Download Formal PDF Dossier */}
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              color: '#ffffff',
              cursor: isGeneratingPdf ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              transition: 'all 0.15s ease'
            }}
          >
            <Download size={15} />
            {isGeneratingPdf ? 'Compiling Dossier...' : 'Download PDF Dossier'}
          </button>
        </div>
      </div>
    </div>
  );
}
