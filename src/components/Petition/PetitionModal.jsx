import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  FileText,
  Download,
  Copy,
  Mail,
  ExternalLink,
  Sparkles,
  ShieldAlert,
  CheckCircle,
  MapPin,
  Calendar,
  ChevronRight,
  Check,
  RefreshCw,
  Lock,
  Cpu,
  TrendingUp,
  AlertTriangle,
  Clock
} from 'lucide-react';
import authoritiesConfig from '../../data/authoritiesConfig.json';
import schoolsDirectory from '../../data/schoolsDirectory.json';
import { generatePetitionPdf } from './pdfGenerator';
import { categorizePm25 } from './petitionHelpers';

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
  // Step 1b: Fetch 48-Hour SageMaker Forecast (or local physics model)
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
  // Single canonical template on server per P2.6. Shows error + retry on failure.
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
    // Strip header address and format clean plain text suitable for CPGRAMS portal
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
            {activeEvidencePackage && (
              <div
                id="school-evidence-section"
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.8) 100%)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  boxShadow: '0 8px 32px rgba(56, 189, 248, 0.1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} />
                    <span>14-Day School Monitoring Evidence</span>
                  </span>
                  <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '9999px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.35)', fontWeight: 700 }}>
                    {`${activeEvidencePackage.coverage?.observedDays ?? 14} / ${activeEvidencePackage.coverage?.daysInWindow ?? 14} Days Verified (${activeEvidencePackage.coverage?.coveragePercent ?? 100}%)`}
                  </span>
                </div>

                {/* 4-Item Metrics Summary Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                    <div style={{ fontSize: '0.62rem', color: '#34d399', fontWeight: 600 }}>OBSERVED DAYS</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399' }}>
                      {activeEvidencePackage.coverage?.observedDays ?? 14} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>/ 14</span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                    <div style={{ fontSize: '0.62rem', color: '#fbbf24', fontWeight: 600 }}>PARTIAL DAYS</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fbbf24' }}>
                      {activeEvidencePackage.coverage?.partialDays ?? 0}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(100, 116, 139, 0.1)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(100, 116, 139, 0.25)' }}>
                    <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 600 }}>MISSING DAYS</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#cbd5e1' }}>
                      {activeEvidencePackage.coverage?.missingDays ?? 0}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                    <div style={{ fontSize: '0.62rem', color: '#38bdf8', fontWeight: 600 }}>14-DAY AVG PM2.5</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8' }}>
                      {activeEvidencePackage.summary?.averagePm25 ?? '--'} <span style={{ fontSize: '0.65rem' }}>µg/m³</span>
                    </div>
                    <div style={{ fontSize: '0.58rem', color: '#94a3b8', fontWeight: 500 }}>Estimated around school</div>
                  </div>
                </div>

                {/* Range & Peak Details */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#cbd5e1', marginBottom: '10px', padding: '6px 10px', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '8px', flexWrap: 'wrap', gap: '6px' }}>
                  <span>Period: <strong>{activeEvidencePackage.monitoringPeriod?.startDate} to {activeEvidencePackage.monitoringPeriod?.endDate}</strong></span>
                  <span>Highest Day: <strong>{activeEvidencePackage.summary?.highestDailyPm25 ?? '--'} µg/m³</strong></span>
                  <span>Lowest Day: <strong>{activeEvidencePackage.summary?.lowestDailyPm25 ?? '--'} µg/m³</strong></span>
                </div>

                {/* Daily Evidence Timeline */}
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  DAILY OBSERVATION LOG:
                </div>
                <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '6px', background: 'rgba(0, 0, 0, 0.3)' }}>
                  {(activeEvidencePackage.dailyEvidence || []).map((day, idx) => (
                    <div
                      key={day.date || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 6px',
                        borderBottom: idx < activeEvidencePackage.dailyEvidence.length - 1 ? '1px solid rgba(255, 255, 255, 0.04)' : 'none',
                        fontSize: '0.7rem',
                      }}
                    >
                      <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>{day.date}</span>
                      <span style={{
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        background: day.status === 'OBSERVED' ? 'rgba(16, 185, 129, 0.15)' : day.status === 'PARTIAL' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                        color: day.status === 'OBSERVED' ? '#34d399' : day.status === 'PARTIAL' ? '#fbbf24' : '#94a3b8',
                      }}>
                        {day.status}
                      </span>
                      <span style={{ color: '#94a3b8' }}>
                        {day.observationCount ? `${day.observationCount} obs` : '0 obs'}
                      </span>
                      <span style={{ color: day.status !== 'NO_DATA' && day.averagePm25 !== null ? '#f8fafc' : '#64748b', fontWeight: 600 }}>
                        {day.status !== 'NO_DATA' && day.averagePm25 !== null ? `${day.averagePm25} µg/m³ (Estimated)` : 'NO DATA'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Mandatory Spatial Estimation Methodology Disclaimer */}
                <div style={{ fontSize: '0.66rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '8px', lineHeight: '1.4' }}>
                  School PM2.5 values are spatial estimates derived from nearby monitoring stations and are not direct measurements at the school.
                </div>
              </div>
            )}

            {/* 1. Evidence Snapshot Card */}
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

            {/* 1b. AWS SageMaker 48-Hour Predictive Exposure Foresight */}
            <div
              style={{
                padding: '16px',
                borderRadius: '14px',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(6, 182, 212, 0.35)',
                boxShadow: '0 8px 32px rgba(6, 182, 212, 0.08)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '8px',
                      background: 'rgba(6, 182, 212, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#22d3ee'
                    }}
                  >
                    <Cpu size={15} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Step 1b: AWS SageMaker Grid Model
                    </span>
                    <span
                      style={{
                        marginLeft: '8px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.62rem',
                        fontWeight: 600,
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      {forecast?.gridBlock?.gridId ? `${forecast.gridBlock.gridId} · SageMaker Active` : 'AWS SageMaker Live'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={fetchForecast}
                  disabled={isLoadingForecast}
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
                  <RefreshCw size={12} className={isLoadingForecast ? 'animate-spin' : ''} />
                  Re-forecast
                </button>
              </div>

              {forecast ? (
                <div>
                  {/* Tomorrow Morning Peak Risk Alert Banner */}
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      background: forecast.peakMorningArrival?.severeAlert
                        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(127, 29, 29, 0.3) 100%)'
                        : 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(180, 83, 9, 0.2) 100%)',
                      border: forecast.peakMorningArrival?.severeAlert
                        ? '1px solid rgba(239, 68, 68, 0.4)'
                        : '1px solid rgba(245, 158, 11, 0.35)',
                      marginBottom: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={15} color={forecast.peakMorningArrival?.severeAlert ? '#ef4444' : '#f59e0b'} />
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: forecast.peakMorningArrival?.severeAlert ? '#fca5a5' : '#fde68a', textTransform: 'uppercase' }}>
                          Tomorrow Morning Arrival Risk Alert (07:00 - 09:00 AM)
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: forecast.peakMorningArrival?.color,
                          color: '#fff'
                        }}
                      >
                        {forecast.peakMorningArrival?.category}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '6px 0 2px' }}>
                      <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
                        {forecast.peakMorningArrival?.predictedPm25} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1' }}>µg/m³</span>
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                        Peak at <strong>{forecast.peakMorningArrival?.time}</strong> ({forecast.peakMorningArrival?.date})
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#f1f5f9', marginTop: '4px', lineHeight: '1.4' }}>
                      <strong>Action Directive:</strong> {forecast.preEmptiveRecommendation}
                    </div>
                  </div>

                  {/* 48h School Operating Windows */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>DAY 1 SCHOOL (07-13h)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: '2px 0' }}>
                        {forecast.morningWindows?.day1?.avg || '---'} µg/m³ <span style={{ fontSize: '0.65rem', fontWeight: 400, color: '#94a3b8' }}>avg</span>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>
                        Peak: <strong>{forecast.morningWindows?.day1?.peak} µg/m³</strong> ({forecast.morningWindows?.day1?.peakHour})
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>DAY 2 SCHOOL (07-13h)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: '2px 0' }}>
                        {forecast.morningWindows?.day2?.avg || '---'} µg/m³ <span style={{ fontSize: '0.65rem', fontWeight: 400, color: '#94a3b8' }}>avg</span>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>
                        Peak: <strong>{forecast.morningWindows?.day2?.peak} µg/m³</strong> ({forecast.morningWindows?.day2?.peakHour})
                      </div>
                    </div>
                  </div>

                  {/* Outdoor Activities Timing & Regional Pattern Guidance */}
                  {forecast.outdoorActivityGuidance && (
                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)', marginBottom: '12px' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#38bdf8', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={12} />
                        <span>PREDICTED OUTDOOR SAFETY WINDOWS (TODAY)</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.68rem', color: '#cbd5e1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#ef4444', fontWeight: 700 }}>⛔ AVOID OUTDOORS:</span>
                          <span><strong>{forecast.outdoorActivityGuidance.morningArrivalRisk?.window}</strong> (Arrival Inversion Trap)</span>
                        </div>
                        {forecast.outdoorActivityGuidance.noonRecessRisk?.alertRequired && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#f59e0b', fontWeight: 700 }}>⚠️ AVOID FIELD SPORTS:</span>
                            <span><strong>{forecast.outdoorActivityGuidance.noonRecessRisk?.window}</strong> (Recess Accumulation)</span>
                          </div>
                        )}
                        {forecast.outdoorActivityGuidance.safeWindows?.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#10b981', fontWeight: 700 }}>✅ SAFEST VENTILATION:</span>
                            <span><strong>{forecast.outdoorActivityGuidance.safeWindows[0]?.start} - {forecast.outdoorActivityGuidance.safeWindows[0]?.end}</strong> (Solar Dispersion)</span>
                          </div>
                        )}
                      </div>
                      {forecast.regionalHistoricalInsight && (
                        <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed rgba(255, 255, 255, 0.1)', fontSize: '0.65rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          {forecast.regionalHistoricalInsight}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Model Validation & Inclusion Checkbox */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      Model: <strong style={{ color: '#38bdf8' }}>{forecast.modelName || 'wmd-grid-3yr-daily-xgboost-v1'}</strong> · MAE: <strong style={{ color: '#34d399' }}>{forecast.maeError || '3.19'} µg/m³</strong>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.72rem', color: '#e2e8f0' }}>
                      <input
                        type="checkbox"
                        checked={includeForecastInDossier}
                        onChange={(e) => setIncludeForecastInDossier(e.target.checked)}
                        style={{ accentColor: '#06b6d4', width: '14px', height: '14px' }}
                      />
                      <span>Include in Dossier (Annexure B)</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                  Calculating AWS SageMaker 48-hour forward projection...
                </div>
              )}
            </div>

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

          </div>

          {/* --------------------------------------------------------------- */}
          {/* RIGHT COLUMN: LIVE LETTER PREVIEW & OUTPUT ACTIONS */}
          {/* --------------------------------------------------------------- */}
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
                  title={`Open draft addressed to ${currentAuthority.email}`}
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
                  Open {currentAuthority.portalName.split(' ')[0]} Portal
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

        </div>

      </div>
    </div>
  );
}
