import React from 'react';
import {
  Sparkles,
  CheckCircle,
  Copy,
  Check,
  Mail,
  ExternalLink,
  Download,
  Bookmark,
  SendHorizontal
} from 'lucide-react';

/**
 * Renders the Right Column Live Letter Preview, Language & AI Tone Polish Controls,
 * and the Bottom Action Dock (Save, Copy, Email, Portal, PDF Dossier).
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
  isGeneratingPdf,
  handleSaveToMyPetitions,
  isSavingPetition,
  savedPetitionId,
  savedPetitionStatus,
  saveError = null,
  handleMarkAsSent,
  onOpenMyPetitions
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              color: '#e2e8f0',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '0.75rem',
              outline: 'none'
            }}
          >
            <option value="formal">Formal Administrative (Standard)</option>
            <option value="urgent">Urgent Public Health Alert</option>
            <option value="collaborative">Collaborative Partnership</option>
          </select>

          <button
            onClick={handlePolishWithAi}
            disabled={isPolishing || !activeLetterText}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#fff',
              border: 'none',
              cursor: isPolishing ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
            }}
          >
            <Sparkles size={13} className={isPolishing ? 'animate-spin' : ''} />
            {isPolishing ? 'Refining...' : 'Polish with AI'}
          </button>
        </div>
      </div>

      {/* Polish Verification Telemetry Tag */}
      {aiTelemetry && (
        <div
          style={{
            padding: '6px 20px',
            background: 'rgba(99, 102, 241, 0.1)',
            borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.72rem',
            color: '#a5b4fc'
          }}
        >
          <CheckCircle size={12} color="#818cf8" />
          <span>
            Refined via {aiTelemetry.mode === 'AWS_BEDROCK_LIVE' ? 'AWS Bedrock (Claude 3 Haiku)' : 'Google Gemini AI'} • Empirical evidence strictly preserved
          </span>
        </div>
      )}

      {/* Editor & Preview Area */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {draftError && (
          <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', fontSize: '0.78rem' }}>
            {draftError}
          </div>
        )}

        <textarea
          value={language === 'hi' ? editableLetterHi : editableLetterEn}
          onChange={(e) => {
            if (language === 'hi') {
              setEditableLetterHi(e.target.value);
            } else {
              setEditableLetterEn(e.target.value);
            }
          }}
          placeholder="Draft will generate automatically from verified numbers..."
          style={{
            flex: 1,
            minHeight: '340px',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '16px',
            color: '#e2e8f0',
            fontSize: '0.82rem',
            lineHeight: '1.6',
            fontFamily: 'var(--font-mono, monospace)',
            resize: 'none',
            outline: 'none'
          }}
        />

        {/* Privacy Notice Wording */}
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(56, 189, 248, 0.06)',
            border: '1px solid rgba(56, 189, 248, 0.18)',
            borderRadius: '8px',
            fontSize: '0.73rem',
            color: '#94a3b8',
            lineHeight: '1.45'
          }}
        >
          <strong style={{ color: '#38bdf8' }}>Privacy Notice:</strong> When you save, your letter, including your name and contact, is stored on our server in Mumbai (ap-south-1), visible only to you, and you can delete it. Your school only sees the date, authority, subject and air-quality summary.
        </div>
      </div>

      {/* Bottom Action Dock */}
      <div
        style={{
          padding: '14px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
            Count: <strong style={{ color: activeLetterText.length > 4000 ? '#ef4444' : '#38bdf8' }}>{activeLetterText.length}</strong> / 4,000 max
          </div>
          {savedPetitionStatus && (
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399'
              }}
            >
              Status: {savedPetitionStatus}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Save to My Petitions Button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              onClick={handleSaveToMyPetitions}
              disabled={isSavingPetition || !activeLetterText}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: savedPetitionId ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                border: `1px solid ${savedPetitionId ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.35)'}`,
                color: savedPetitionId ? '#34d399' : '#38bdf8',
                cursor: isSavingPetition ? 'wait' : 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Bookmark size={14} />
              {isSavingPetition ? 'Saving...' : savedPetitionId ? 'Saved to My Petitions' : 'Save to My petitions'}
            </button>
            {saveError && (
              <span style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: 600, paddingLeft: '4px' }}>
                {saveError}
              </span>
            )}
          </div>

          {/* Mark as sent (when petition is saved) */}
          {savedPetitionId && savedPetitionStatus !== 'MARKED_AS_SENT' && (
            <button
              onClick={handleMarkAsSent}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#fbbf24',
                cursor: 'pointer'
              }}
            >
              <SendHorizontal size={13} />
              Mark as sent
            </button>
          )}

          {/* 1. Copy CPGRAMS Text */}
          <button
            onClick={handleCopyCpgrams}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 600,
              background: copyFeedback ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              border: `1px solid ${copyFeedback ? 'rgba(52, 211, 153, 0.4)' : 'rgba(255, 255, 255, 0.15)'}`,
              color: copyFeedback ? '#34d399' : '#e2e8f0',
              cursor: 'pointer'
            }}
          >
            {copyFeedback ? <Check size={14} /> : <Copy size={14} />}
            {copyFeedback ? 'Copied!' : 'Copy to Clipboard'}
          </button>

          {/* 2. Open Official Mailto */}
          <button
            onClick={handleOpenEmailDraft}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 600,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#e2e8f0',
              cursor: 'pointer'
            }}
            title={`Open draft addressed to ${currentAuthority?.email}`}
          >
            <Mail size={14} />
            Email Draft
          </button>

          {/* 3. Open Official Grievance Portal */}
          <button
            onClick={handleOpenOfficialPortal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
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
            Portal
          </button>

          {/* 4. Download Formal PDF Dossier */}
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              color: '#ffffff',
              cursor: isGeneratingPdf ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
            }}
          >
            <Download size={14} />
            {isGeneratingPdf ? 'Compiling PDF...' : 'Download PDF Dossier'}
          </button>
        </div>
      </div>
    </div>
  );
}
