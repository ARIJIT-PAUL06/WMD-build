import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  FileText,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import authoritiesConfig from '../../data/authoritiesConfig.json';
import schoolsDirectory from '../../data/schoolsDirectory.json';
import { generatePetitionPdf } from './pdfGenerator';
import PetitionSchoolEvidenceCard from './PetitionSchoolEvidenceCard';
import PetitionEmpiricalSummaryCard from './PetitionEmpiricalSummaryCard';
import PetitionForecastCard from './PetitionForecastCard';
import PetitionParametersForm from './PetitionParametersForm';
import PetitionLetterPreviewPane from './PetitionLetterPreviewPane';

export default function PetitionModal({
  isOpen,
  onClose,
  initialStation = 'DTU (Delhi Technological University)',
  initialLocality = 'Rohini Sector 16, North Delhi',
  initialPm25 = 142,
  school = null,
  schoolContext = null,
  evidencePackage = null,
  schoolEvidencePackage = null,
}) {
  const activeSchool = schoolContext || school;
  const activeEvidencePackage = evidencePackage || schoolEvidencePackage;

  // --------------------------------------------------------------------------
  // Step State & Configuration
  // --------------------------------------------------------------------------
  const [language, setLanguage] = useState('en'); // 'en' | 'hi'
  const [tone, setTone] = useState('formal'); // 'formal' | 'urgent' | 'collaborative'
  const [isPolishing, setIsPolishing] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const todayFormatted = useMemo(() => new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }), []);

  // Form Fields & Campus Selection
  const [selectedSchoolId, setSelectedSchoolId] = useState(activeSchool?.id || 'dps_rohini');
  const [schoolName, setSchoolName] = useState(activeSchool?.name || 'Delhi Public School, Rohini');
  const [locality, setLocality] = useState(activeSchool?.locality || initialLocality);
  const [stationName, setStationName] = useState(activeSchool?.nearestStation || initialStation);
  const [schoolLat, setSchoolLat] = useState(activeSchool?.lat ?? 28.7188);
  const [schoolLon, setSchoolLon] = useState(activeSchool?.lon ?? 77.1064);
  const stationDistanceKm = activeSchool?.stationDistanceKm || 1.8;
  const [days, setDays] = useState(14);
  const [threshold, setThreshold] = useState(60);

  // AWS SageMaker Predictive Forecast State
  const [forecast, setForecast] = useState(null);
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [includeForecastInDossier, setIncludeForecastInDossier] = useState(true);

  // Authority Selection
  const [selectedAuthorityId, setSelectedAuthorityId] = useState(authoritiesConfig.authorities[0].id);
  const currentAuthority = useMemo(() => {
    return authoritiesConfig.authorities.find(a => a.id === selectedAuthorityId) || authoritiesConfig.authorities[0];
  }, [selectedAuthorityId]);

  // Specific Demands
  const [selectedDemands, setSelectedDemands] = useState([
    authoritiesConfig.standardDemands[0].text,
    authoritiesConfig.standardDemands[1].text,
    authoritiesConfig.standardDemands[2].text
  ]);
  const [customDemand, setCustomDemand] = useState('');

  // Sender Credentials (local state only, DPDPA compliant)
  const [senderName, setSenderName] = useState('Dr. Sunita Sharma');
  const [senderRole, setSenderRole] = useState('Principal / Head of Institution');
  const [senderEmail, setSenderEmail] = useState('principal@dpsrohini.edu.in');
  const [senderPhone, setSenderPhone] = useState('+91 98110 54321');
  const [dpdpaConsent, setDpdpaConsent] = useState(true);

  // Evidence Data State
  const [evidence, setEvidence] = useState(() => {
    if (activeEvidencePackage) {
      const sName = activeSchool?.name || school?.name || 'Delhi Public School, Rohini';
      const sLoc = activeSchool?.locality || school?.locality || initialLocality;
      const stName = activeSchool?.nearestStation || school?.nearestStation || initialStation;
      const sDist = activeSchool?.stationDistanceKm || school?.stationDistanceKm || 1.8;
      const sLogs = (activeEvidencePackage.dailyEvidence || []).map((d) => ({
        date: d.date,
        displayDate: d.date,
        dayOfWeek: new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' }),
        morningAvgPm25: d.averagePm25 ?? 0,
        peakPm25: d.maxPm25 ?? (d.averagePm25 ?? 0),
        category: d.status,
        disruption: d.status === 'NO_DATA' ? 'No observations recorded' : 'Campus outdoor exposure evaluated',
        exceeded: d.averagePm25 > 60
      }));

      return {
        schoolName: sName,
        locality: sLoc,
        threshold: 60,
        schoolDaysTotal: activeEvidencePackage.coverage?.daysInWindow || 14,
        exceedanceCount: (activeEvidencePackage.dailyEvidence || []).filter((d) => d.averagePm25 > 60).length,
        startDate: activeEvidencePackage.monitoringPeriod?.startDate || '',
        endDate: activeEvidencePackage.monitoringPeriod?.endDate || '',
        peakPm25: activeEvidencePackage.summary?.highestDailyPm25 ?? (activeEvidencePackage.summary?.averagePm25 ?? initialPm25),
        peakDate: (activeEvidencePackage.dailyEvidence || []).reduce((maxD, d) => (d.averagePm25 > (maxD?.averagePm25 || 0) ? d : maxD), null)?.date || '',
        avgMorningPm25: activeEvidencePackage.summary?.averagePm25 ?? 85,
        stationName: stName,
        stationDistanceKm: sDist,
        compiledBy: 'VayuVitals SafeRecess Continuous Monitoring Engine',
        compilationDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
        maeError: null,
        dailyLogs: sLogs
      };
    }
    return {
      schoolName: activeSchool?.name || school?.name || 'Delhi Public School, Rohini',
      locality: activeSchool?.locality || school?.locality || initialLocality || 'Rohini Sector 16, North Delhi',
      stationName: activeSchool?.nearestStation || school?.nearestStation || initialStation || 'DTU (Delhi Technological University)',
      stationDistanceKm: activeSchool?.stationDistanceKm || school?.stationDistanceKm || 1.8,
      threshold: 60,
      schoolDaysTotal: 0,
      exceedanceCount: 0,
      startDate: '',
      endDate: '',
      peakPm25: initialPm25 || null,
      peakDate: '',
      avgMorningPm25: initialPm25 || null,
      compiledBy: 'VayuVitals SafeRecess Continuous Monitoring Engine',
      compilationDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
      maeError: null,
      dailyLogs: []
    };
  });
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState(null);
  const [forecastError, setForecastError] = useState(null);
  const [draftError, setDraftError] = useState(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  // Editable Letter Text State
  const [editableLetterEn, setEditableLetterEn] = useState('');
  const [editableLetterHi, setEditableLetterHi] = useState('');
  const [currentSubject, setCurrentSubject] = useState('');
  const [aiTelemetry, setAiTelemetry] = useState(null);

  // Sync initial props or active school
  useEffect(() => {
    if (activeSchool) {
      if (activeSchool.id) setSelectedSchoolId(activeSchool.id);
      if (activeSchool.name) setSchoolName(activeSchool.name);
      if (activeSchool.locality) setLocality(activeSchool.locality);
      if (activeSchool.nearestStation) setStationName(activeSchool.nearestStation);
      if (activeSchool.lat != null) setSchoolLat(activeSchool.lat);
      if (activeSchool.lon != null) setSchoolLon(activeSchool.lon);
    } else {
      if (initialStation) setStationName(initialStation);
      if (initialLocality) setLocality(initialLocality);
    }
  }, [activeSchool, initialStation, initialLocality]);

  // Handle Institution quick selection
  const handleSelectInstitution = (schoolId) => {
    setSelectedSchoolId(schoolId);
    if (schoolId === 'custom') return;
    const inst = schoolsDirectory.educationalInstitutions.find(s => s.id === schoolId);
    if (inst) {
      setSchoolName(inst.name);
      setLocality(inst.locality);
      setStationName(inst.nearestStation);
      setSchoolLat(inst.lat);
      setSchoolLon(inst.lon);
    }
  };

  // --------------------------------------------------------------------------
  // Step 1: Fetch Evidence from API (or local calculation)
  // --------------------------------------------------------------------------
  const fetchEvidence = useCallback(async () => {
    setIsLoadingEvidence(true);
    try {
      const query = new URLSearchParams({
        schoolName,
        locality,
        stationName,
        stationDistanceKm: stationDistanceKm.toString(),
        days: days.toString(),
        threshold: threshold.toString(),
        basePm25: initialPm25.toString()
      });

      const res = await fetch(`/api/petition/evidence?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          setEvidence(data);
          setEvidenceError(null);
          return;
        }
      }
      setEvidence(null);
      setEvidenceError('Continuous monitoring station telemetry could not be loaded from backend.');
    } catch (err) {
      console.warn('[PetitionModal] Failed to fetch evidence:', err);
      setEvidence(null);
      setEvidenceError('Unable to reach telemetry server. Please check your connection and retry.');
    } finally {
      setIsLoadingEvidence(false);
    }
  }, [schoolName, locality, stationName, stationDistanceKm, days, threshold, initialPm25]);

  // --------------------------------------------------------------------------
  // Step 1b: Fetch 48-Hour SageMaker Forecast
  // --------------------------------------------------------------------------
  const fetchForecast = useCallback(async () => {
    setIsLoadingForecast(true);
    try {
      const query = new URLSearchParams({
        schoolId: selectedSchoolId,
        schoolName,
        lat: schoolLat.toString(),
        lon: schoolLon.toString(),
        basePm25: initialPm25.toString(),
        threshold: threshold.toString()
      });
      const res = await fetch(`/api/petition/forecast?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          setForecast(data);
          setForecastError(null);
          return;
        }
      }
      setForecast(null);
      setForecastError('SageMaker forward forecast currently unavailable.');
    } catch (err) {
      console.warn('[PetitionModal] Forecast fetch fallback:', err);
      setForecast(null);
      setForecastError('Unable to connect to SageMaker forecast endpoint.');
    } finally {
      setIsLoadingForecast(false);
    }
  }, [selectedSchoolId, schoolName, schoolLat, schoolLon, initialPm25, threshold]);

  useEffect(() => {
    if (isOpen) {
      if (activeEvidencePackage) {
        // Hydrate from verified 14-day school evidence package
        const sName = activeSchool?.name || schoolName;
        const sLoc = activeSchool?.locality || locality;
        const stName = activeSchool?.nearestStation || stationName;
        const sDist = activeSchool?.stationDistanceKm || stationDistanceKm;
        const sLogs = (activeEvidencePackage.dailyEvidence || []).map((d) => ({
          date: d.date,
          displayDate: d.date,
          dayOfWeek: new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' }),
          morningAvgPm25: d.averagePm25 ?? 0,
          peakPm25: d.maxPm25 ?? (d.averagePm25 ?? 0),
          category: d.status,
          disruption: d.status === 'NO_DATA' ? 'No observations recorded' : 'Campus outdoor exposure evaluated',
          exceeded: d.averagePm25 > threshold
        }));

        setEvidence({
          schoolName: sName,
          locality: sLoc,
          threshold,
          schoolDaysTotal: activeEvidencePackage.coverage?.daysInWindow || 14,
          exceedanceCount: (activeEvidencePackage.dailyEvidence || []).filter((d) => d.averagePm25 > threshold).length,
          startDate: activeEvidencePackage.monitoringPeriod?.startDate || '',
          endDate: activeEvidencePackage.monitoringPeriod?.endDate || '',
          peakPm25: activeEvidencePackage.summary?.highestDailyPm25 ?? (activeEvidencePackage.summary?.averagePm25 ?? initialPm25),
          peakDate: (activeEvidencePackage.dailyEvidence || []).reduce((maxD, d) => (d.averagePm25 > (maxD?.averagePm25 || 0) ? d : maxD), null)?.date || '',
          avgMorningPm25: activeEvidencePackage.summary?.averagePm25 ?? 85,
          stationName: stName,
          stationDistanceKm: sDist,
          compiledBy: 'VayuVitals SafeRecess Continuous Monitoring Engine',
          compilationDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
          maeError: null,
          dailyLogs: sLogs
        });
      } else {
        fetchEvidence();
      }
      fetchForecast();
    }
  }, [isOpen, activeEvidencePackage, activeSchool, fetchEvidence, fetchForecast, initialPm25, locality, schoolName, stationDistanceKm, stationName, threshold]);

  // --------------------------------------------------------------------------
  // Step 2: Generate Draft When Evidence, Authority, or Forecast Changes
  // --------------------------------------------------------------------------
  const generateDraft = useCallback(async () => {
    if (!evidence) return;
    setIsGeneratingDraft(true);
    setDraftError(null);
    const activeForecast = includeForecastInDossier ? forecast : null;
    try {
      const res = await fetch('/api/petition/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidence,
          authority: currentAuthority,
          forecast: activeForecast,
          senderName,
          senderRole,
          senderContact: `${senderEmail} | ${senderPhone}`,
          selectedDemands,
          schoolEvidencePackage: activeEvidencePackage
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          setEditableLetterEn(data.englishText);
          setEditableLetterHi(data.hindiText);
          setCurrentSubject(data.subject);
          setDraftError(null);
          return;
        }
      }
      const errData = await res.json().catch(() => ({}));
      setDraftError(errData.error || 'Server draft generation failed. Please retry.');
      setEditableLetterEn('');
      setEditableLetterHi('');
    } catch (err) {
      console.warn('[PetitionModal] Draft generation failed:', err);
      setDraftError('Unable to generate petition draft from backend. Please check connection and retry.');
      setEditableLetterEn('');
      setEditableLetterHi('');
    } finally {
      setIsGeneratingDraft(false);
    }
  }, [evidence, currentAuthority, forecast, includeForecastInDossier, senderName, senderRole, senderEmail, senderPhone, selectedDemands, activeEvidencePackage]);

  useEffect(() => {
    if (evidence) {
      generateDraft();
    }
  }, [evidence, generateDraft]);

  // --------------------------------------------------------------------------
  // Step 2b: AI Tone Polish (Bedrock or Gemini)
  // --------------------------------------------------------------------------
  const handlePolishWithAi = async () => {
    const textToPolish = language === 'hi' ? editableLetterHi : editableLetterEn;
    if (!textToPolish) return;

    setIsPolishing(true);
    try {
      const res = await fetch('/api/petition/polish-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftText: textToPolish,
          tone,
          language,
          schoolName
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.polishedText) {
          if (language === 'hi') {
            setEditableLetterHi(data.polishedText);
          } else {
            setEditableLetterEn(data.polishedText);
          }
          setAiTelemetry({
            mode: data.mode,
            model: data.model,
            tone
          });
        }
      }
    } catch (err) {
      console.warn('[PetitionModal] AI Polish error:', err);
    } finally {
      setIsPolishing(false);
    }
  };

  // --------------------------------------------------------------------------
  // Actions: PDF, Clipboard, Mailto, Portal
  // --------------------------------------------------------------------------
  const activeLetterText = language === 'hi' ? editableLetterHi : editableLetterEn;

  const handleDownloadPdf = () => {
    if (!evidence) return;
    setIsGeneratingPdf(true);
    try {
      generatePetitionPdf({
        evidence,
        authority: currentAuthority,
        letterText: activeLetterText,
        forecast: includeForecastInDossier ? forecast : null,
        language,
        senderName,
        senderRole,
        senderContact: `${senderEmail} | ${senderPhone}`,
        schoolEvidencePackage: activeEvidencePackage
      });
    } catch (err) {
      console.error('[PetitionModal] PDF generation error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCopyCpgrams = () => {
    const plainText = activeLetterText.replace(/\r\n/g, '\n');
    navigator.clipboard.writeText(plainText);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2500);
  };

  const handleOpenEmailDraft = () => {
    const recipient = currentAuthority.email;
    const subject = encodeURIComponent(currentSubject || `Grievance on Morning Air Quality - ${schoolName}`);
    const body = encodeURIComponent(activeLetterText);
    window.open(`mailto:${recipient}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleOpenOfficialPortal = () => {
    window.open(currentAuthority.portalUrl, '_blank', 'noopener,noreferrer');
  };

  const toggleDemand = (text) => {
    if (selectedDemands.includes(text)) {
      setSelectedDemands(selectedDemands.filter(d => d !== text));
    } else {
      setSelectedDemands([...selectedDemands, text]);
    }
  };

  const handleAddCustomDemand = (e) => {
    e.preventDefault();
    if (customDemand.trim()) {
      setSelectedDemands([...selectedDemands, customDemand.trim()]);
      setCustomDemand('');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="petition-action-modal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(3, 7, 18, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1280px',
          maxHeight: '92vh',
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.96) 0%, rgba(10, 15, 30, 0.98) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(56, 189, 248, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#e2e8f0',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
      >
        {/* ================================================================= */}
        {/* TOP BAR & WORKFLOW STAGES */}
        {/* ================================================================= */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.3))',
                border: '1px solid rgba(52, 211, 153, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34d399'
              }}
            >
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.01em' }}>
                  Petition & Action Module
                </h2>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.3)'
                  }}
                >
                  Evidence to Action
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Transform sensor records into an audit-grade formal complaint for school & civic authorities
              </p>
            </div>
          </div>

          {/* Pipeline Stage Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#94a3b8' }}>
              <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 600 }}>
                1. Evidence
              </span>
              <ChevronRight size={14} />
              <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 600 }}>
                2. Draft
              </span>
              <ChevronRight size={14} />
              <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', fontWeight: 600 }}>
                3. Review
              </span>
              <ChevronRight size={14} />
              <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', fontWeight: 600 }}>
                4. Output
              </span>
            </div>

            <button
              onClick={onClose}
              style={{
                marginLeft: '16px',
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94a3b8';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* HONEST SCOPE / NO AUTOMATIC FILING BANNER (PRD GUARDRAIL) */}
        {/* ================================================================= */}
        <div
          style={{
            padding: '8px 24px',
            background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.1) 0%, rgba(245, 158, 11, 0.08) 100%)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fca5a5' }}>
            <ShieldAlert size={16} color="#ef4444" />
            <span>
              <strong>No automatic filing:</strong> The app prepares the formal dossier; the user reviews, signs, and files it through the official channel (email, CPGRAMS, or portal). The app never claims to be an official government filing.
            </span>
          </div>
          <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
            DPDP Act 2023 Compliant · Data stays local
          </span>
        </div>

        {/* ================================================================= */}
        {/* MAIN DUAL-PANE BODY */}
        {/* ================================================================= */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {/* --------------------------------------------------------------- */}
          {/* LEFT COLUMN: EVIDENCE & REVIEW CONTROLS (SCROLLABLE) */}
          {/* --------------------------------------------------------------- */}
          <div
            style={{
              width: '42%',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              background: 'rgba(10, 15, 26, 0.5)'
            }}
          >
            {/* Phase 6: Dedicated 14-Day School Monitoring Evidence Section */}
            <PetitionSchoolEvidenceCard activeEvidencePackage={activeEvidencePackage} />

            {/* 1. Evidence Snapshot Card */}
            <PetitionEmpiricalSummaryCard
              evidence={evidence}
              isLoadingEvidence={isLoadingEvidence}
              evidenceError={evidenceError}
              fetchEvidence={fetchEvidence}
            />

            {/* 1b. AWS SageMaker 48-Hour Predictive Exposure Foresight */}
            <PetitionForecastCard
              forecast={forecast}
              isLoadingForecast={isLoadingForecast}
              fetchForecast={fetchForecast}
              includeForecastInDossier={includeForecastInDossier}
              setIncludeForecastInDossier={setIncludeForecastInDossier}
            />

            {/* Parameters, Authority, Demands, and Signatory Form */}
            <PetitionParametersForm
              selectedSchoolId={selectedSchoolId}
              handleSelectInstitution={handleSelectInstitution}
              schoolsDirectory={schoolsDirectory}
              schoolName={schoolName}
              setSchoolName={setSchoolName}
              locality={locality}
              setLocality={setLocality}
              days={days}
              setDays={setDays}
              threshold={threshold}
              setThreshold={setThreshold}
              authoritiesConfig={authoritiesConfig}
              selectedAuthorityId={selectedAuthorityId}
              setSelectedAuthorityId={setSelectedAuthorityId}
              selectedDemands={selectedDemands}
              toggleDemand={toggleDemand}
              customDemand={customDemand}
              setCustomDemand={setCustomDemand}
              handleAddCustomDemand={handleAddCustomDemand}
              senderName={senderName}
              setSenderName={setSenderName}
              senderRole={senderRole}
              setSenderRole={setSenderRole}
              senderEmail={senderEmail}
              setSenderEmail={setSenderEmail}
              senderPhone={senderPhone}
              setSenderPhone={setSenderPhone}
              dpdpaConsent={dpdpaConsent}
              setDpdpaConsent={setDpdpaConsent}
            />
          </div>

          {/* --------------------------------------------------------------- */}
          {/* RIGHT COLUMN: LIVE LETTER PREVIEW & OUTPUT ACTIONS */}
          {/* --------------------------------------------------------------- */}
          <PetitionLetterPreviewPane
            language={language}
            setLanguage={setLanguage}
            tone={tone}
            setTone={setTone}
            handlePolishWithAi={handlePolishWithAi}
            isPolishing={isPolishing}
            aiTelemetry={aiTelemetry}
            schoolName={schoolName}
            todayFormatted={todayFormatted}
            draftError={draftError}
            isGeneratingDraft={isGeneratingDraft}
            generateDraft={generateDraft}
            editableLetterEn={editableLetterEn}
            setEditableLetterEn={setEditableLetterEn}
            editableLetterHi={editableLetterHi}
            setEditableLetterHi={setEditableLetterHi}
            days={days}
            evidence={evidence}
            activeLetterText={activeLetterText}
            copyFeedback={copyFeedback}
            handleCopyCpgrams={handleCopyCpgrams}
            handleOpenEmailDraft={handleOpenEmailDraft}
            currentAuthority={currentAuthority}
            handleOpenOfficialPortal={handleOpenOfficialPortal}
            handleDownloadPdf={handleDownloadPdf}
            isGeneratingPdf={isGeneratingPdf}
          />

        </div>

      </div>
    </div>
  );
}
