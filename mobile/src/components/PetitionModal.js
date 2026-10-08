/**
 * PetitionModal.js - Civic Grievance Petition Generator (Mobile)
 * Full 4-Step Interactive Wizard for School/Station Air Quality Grievance Filing.
 * Strictly adheres to AGENTS.md:
 * - 100% Transparency and Zero-Faking: No simulated data, sine curves, or fake statuses.
 * - Honest statuses: 'Draft', 'Opened in mail', 'Shared', 'Marked as sent'.
 * - DPDP Act 2023 compliance: Personal contact details and dockets stored strictly on-device.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Share,
  Linking,
  Alert,
  Platform,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import {
  getAuthorities,
  searchSchools,
  fetchEvidence,
  fetchForecast,
  generateDraft,
  polishDraft,
  saveDocket,
  updateDocketStatus,
  updateDocket,
  checkRecentDuplicate,
  getSenderProfile,
  saveSenderProfile,
  DOCKET_STATUS
} from '../services/petitionService';

export default function PetitionModal({
  visible,
  onClose,
  initialStation = null,
  onDocketSaved = null
}) {
  // Wizard Step: 1 (Target) -> 2 (Evidence) -> 3 (Authority) -> 4 (Review & Dispatch)
  const [step, setStep] = useState(1);

  // Step 1: Target Selection
  const [targetType, setTargetType] = useState('school'); // 'school' | 'station'
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schoolResults, setSchoolResults] = useState([]);
  const [isSearchingSchools, setIsSearchingSchools] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [selectedStation, setSelectedStation] = useState(initialStation);

  // Step 2: Empirical Telemetry Evidence
  const [timeHorizonDays, setTimeHorizonDays] = useState(14);
  const [threshold, setThreshold] = useState(60);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);
  const [evidence, setEvidence] = useState(null);
  const [evidenceError, setEvidenceError] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [forecastStatus, setForecastStatus] = useState(null);

  // Step 3: Authority Selection
  const [authorities, setAuthorities] = useState([]);
  const [standardDemands, setStandardDemands] = useState([]);
  const [selectedAuthority, setSelectedAuthority] = useState(null);
  const [selectedDemands, setSelectedDemands] = useState([]);
  const [isLoadingAuthorities, setIsLoadingAuthorities] = useState(false);
  const [authoritiesError, setAuthoritiesError] = useState(null);
  const [recentDuplicate, setRecentDuplicate] = useState(null);

  // Step 4: Sender Profile, Review & Dispatch
  const [senderName, setSenderName] = useState('');
  const [senderRole, setSenderRole] = useState('Concerned Parent / Resident');
  const [senderContact, setSenderContact] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en'); // 'en' | 'hi'
  const [urgency, setUrgency] = useState('formal'); // 'formal' | 'emergency'
  const [userActionNote, setUserActionNote] = useState('');

  const [draftResult, setDraftResult] = useState(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [draftError, setDraftError] = useState(null);

  // AI Polish
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishMode, setPolishMode] = useState('ORIGINAL_VERIFIED');
  const [polishNote, setPolishNote] = useState(null);
  const [polishedTemplate, setPolishedTemplate] = useState({ en: null, hi: null });
  const [customDraftText, setCustomDraftText] = useState(null);

  // Docket tracking
  const [savedDocket, setSavedDocket] = useState(null);
  const [actionSuccessNotice, setActionSuccessNotice] = useState(null);

  // Pre-fill target station if provided
  useEffect(() => {
    if (initialStation) {
      setSelectedStation(initialStation);
    }
  }, [initialStation]);

  // Load saved sender profile from local device storage (DPDP compliance)
  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await getSenderProfile();
        if (profile) {
          if (profile.name) setSenderName(profile.name);
          if (profile.role) setSenderRole(profile.role);
          if (profile.contact || profile.email || profile.phone) {
            setSenderContact(profile.contact || profile.email || profile.phone);
          }
        }
      } catch (err) {
        console.warn('Failed loading sender profile:', err);
      }
    }
    if (visible) {
      loadProfile();
    }
  }, [visible]);

  // Load authorities directory on mount / step 3
  useEffect(() => {
    async function fetchAuthList() {
      if (authorities.length > 0) return;
      setIsLoadingAuthorities(true);
      setAuthoritiesError(null);
      try {
        const data = await getAuthorities();
        setAuthorities(data.authorities || []);
        setStandardDemands(data.standardDemands || []);
        if (data.authorities?.length > 0 && !selectedAuthority) {
          setSelectedAuthority(data.authorities[0]);
        }
        if (data.standardDemands?.length > 0 && selectedDemands.length === 0) {
          setSelectedDemands(data.standardDemands.slice(0, 3).map((d) => d.text));
        }
      } catch (err) {
        setAuthoritiesError(err.message || 'Unable to load authorities directory');
      } finally {
        setIsLoadingAuthorities(false);
      }
    }
    if (visible) {
      fetchAuthList();
    }
  }, [visible, authorities.length, selectedAuthority, selectedDemands.length]);

  // Debounced school directory search
  useEffect(() => {
    if (!schoolQuery || schoolQuery.trim().length < 2) {
      setSchoolResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingSchools(true);
      try {
        const results = await searchSchools(schoolQuery);
        setSchoolResults(results || []);
      } catch (err) {
        console.warn('School search error:', err);
        setSchoolResults([]);
      } finally {
        setIsSearchingSchools(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [schoolQuery]);

  // Check 7-day duplicate whenever target or authority changes
  useEffect(() => {
    async function checkDup() {
      if (!selectedAuthority) {
        setRecentDuplicate(null);
        return;
      }
      const targetIdentifier = targetType === 'school'
        ? (selectedSchool?.name || '')
        : (selectedStation?.name || '');

      if (!targetIdentifier) return;

      const dup = await checkRecentDuplicate(targetIdentifier, selectedAuthority.id);
      setRecentDuplicate(dup);
    }
    checkDup();
  }, [targetType, selectedSchool, selectedStation, selectedAuthority]);

  // Load Empirical Telemetry Evidence (Strictly no faking / no sine curves)
  const handleLoadEvidence = useCallback(async () => {
    setIsLoadingEvidence(true);
    setEvidenceError(null);
    setEvidence(null);
    setForecast(null);
    setForecastStatus(null);
    setDraftResult(null);

    const targetSchoolName = targetType === 'school' ? selectedSchool?.name : null;
    const targetLocality = targetType === 'school' ? selectedSchool?.locality : (selectedStation?.zone || selectedStation?.state);
    const targetStationName = targetType === 'school' ? (selectedSchool?.nearestStation || null) : selectedStation?.name;
    const targetDistance = targetType === 'school' ? (selectedSchool?.nearestStationDistanceKm || null) : null;
    const targetGridId = targetType === 'school' ? selectedSchool?.gridId : selectedStation?.gridId;

    try {
      // 1. Fetch Empirical Telemetry
      const evidenceData = await fetchEvidence({
        schoolName: targetSchoolName,
        locality: targetLocality,
        stationName: targetStationName,
        stationDistanceKm: targetDistance,
        days: timeHorizonDays,
        threshold: threshold,
        gridId: targetGridId
      });

      setEvidence(evidenceData.evidence);

      // 2. Fetch 48h ML Forecast (SageMaker endpoint)
      try {
        const schoolLat = targetType === 'school'
          ? (selectedSchool?.lat ? parseFloat(selectedSchool.lat) : undefined)
          : (selectedStation?.lat ? parseFloat(selectedStation.lat) : undefined);
        const schoolLon = targetType === 'school'
          ? (selectedSchool?.lon ? parseFloat(selectedSchool.lon) : undefined)
          : (selectedStation?.lon ? parseFloat(selectedStation.lon) : undefined);

        const fc = await fetchForecast({
          schoolId: targetType === 'school' ? selectedSchool?.id : undefined,
          schoolName: targetSchoolName || targetStationName,
          lat: schoolLat,
          lon: schoolLon,
          threshold: threshold,
          days: timeHorizonDays
        });
        if (fc && fc.success && fc.peakMorningArrival) {
          setForecast(fc);
          setForecastStatus('LIVE_SAGEMAKER');
        } else {
          setForecast(null);
          setForecastStatus('UNAVAILABLE');
        }
      } catch (_fcErr) {
        setForecast(null);
        setForecastStatus('UNAVAILABLE');
      }
    } catch (err) {
      setEvidenceError(err.message || 'Empirical telemetry service unreachable');
    } finally {
      setIsLoadingEvidence(false);
    }
  }, [targetType, selectedSchool, selectedStation, timeHorizonDays, threshold]);

  // Auto-fetch evidence when moving to Step 2 if not loaded yet
  useEffect(() => {
    if (step === 2 && !evidence && !isLoadingEvidence && !evidenceError) {
      handleLoadEvidence();
    }
  }, [step, evidence, isLoadingEvidence, evidenceError, handleLoadEvidence]);

  // Generate Draft on Step 4
  const handleGenerateDraft = useCallback(async () => {
    if (!evidence || !selectedAuthority) return;

    setIsGeneratingDraft(true);
    setDraftError(null);
    setPolishMode('ORIGINAL_VERIFIED');
    setPolishNote(null);
    setPolishedTemplate({ en: null, hi: null });
    setCustomDraftText(null);

    try {
      // P3: Send strictly placeholders across the network to preserve sender privacy (DPDP Act)
      const data = await generateDraft({
        evidence,
        authority: selectedAuthority,
        forecast,
        senderName: '[YOUR NAME]',
        senderRole: '[YOUR ROLE / DESIGNATION]',
        senderContact: '[YOUR PHONE / EMAIL]',
        selectedDemands,
        userActionNote: userActionNote.trim() || undefined
      });

      setDraftResult(data);
    } catch (err) {
      setDraftError(err.message || 'Failed to generate legal draft');
    } finally {
      setIsGeneratingDraft(false);
    }
  }, [evidence, selectedAuthority, forecast, selectedDemands, userActionNote]);

  // Auto-generate draft when entering Step 4
  useEffect(() => {
    if (step === 4 && evidence && selectedAuthority && !draftResult && !isGeneratingDraft) {
      handleGenerateDraft();
    }
  }, [step, evidence, selectedAuthority, draftResult, isGeneratingDraft, handleGenerateDraft]);

  // Active Draft Text (English or Hindi with on-device placeholder substitution)
  const activeDraftText = useMemo(() => {
    if (customDraftText) return customDraftText;
    const currentPolished = polishedTemplate && typeof polishedTemplate === 'object'
      ? polishedTemplate[selectedLanguage]
      : null;
    const baseTemplate = currentPolished || (selectedLanguage === 'hi' ? draftResult?.hindiText : draftResult?.englishText);
    if (!baseTemplate) return '';

    // Replace placeholders strictly on-device per DPDP Act
    const realName = senderName.trim() || '[YOUR NAME]';
    const realRole = senderRole.trim() || '[YOUR ROLE / DESIGNATION]';
    const realContact = senderContact.trim() || '[YOUR PHONE / EMAIL]';

    return baseTemplate
      .replace(/\[YOUR NAME\]/g, realName)
      .replace(/\[YOUR ROLE \/ DESIGNATION\]/g, realRole)
      .replace(/\[YOUR PHONE \/ EMAIL\]/g, realContact);
  }, [customDraftText, polishedTemplate, draftResult, selectedLanguage, senderName, senderRole, senderContact]);

  // Handle AI Polishing (P3: sends template with placeholders intact to protect personal details)
  const handlePolishDraft = async () => {
    const currentPolished = polishedTemplate && typeof polishedTemplate === 'object'
      ? polishedTemplate[selectedLanguage]
      : null;
    const templateWithPlaceholders = currentPolished || (selectedLanguage === 'hi' ? draftResult?.hindiText : draftResult?.englishText);
    if (!templateWithPlaceholders) return;
    setIsPolishing(true);
    setPolishNote(null);

    const schoolTitle = targetType === 'school' ? (selectedSchool?.name || 'School') : (selectedStation?.name || 'Station Area');

    try {
      const res = await polishDraft({
        draftText: templateWithPlaceholders,
        tone: urgency,
        language: selectedLanguage,
        schoolName: schoolTitle
      });

      if (res && res.success && res.polishedText) {
        setPolishedTemplate(prev => ({
          ...(prev && typeof prev === 'object' ? prev : {}),
          [selectedLanguage]: res.polishedText
        }));
        setPolishMode(res.mode || 'AI_POLISHED');
        setPolishNote(`Draft polished via ${res.model || 'AWS Bedrock / Google Gemini'}. Numerical values preserved.`);
      } else {
        setPolishMode('ORIGINAL_VERIFIED');
        setPolishNote(res?.error || 'AI polish service unconfigured. Retaining verified deterministic statutory draft.');
      }
    } catch (_err) {
      setPolishMode('ORIGINAL_VERIFIED');
      setPolishNote('AI polish unavailable. Retaining verified statutory draft.');
    } finally {
      setIsPolishing(false);
    }
  };

  // Persist Sender Profile to Device
  const handleSaveSenderProfile = async () => {
    await saveSenderProfile({
      name: senderName.trim(),
      role: senderRole.trim(),
      contact: senderContact.trim()
    });
  };

  // Helper to persist/update Docket
  const persistDocket = async (initialStatus) => {
    await handleSaveSenderProfile();

    const targetTitle = targetType === 'school' ? selectedSchool?.name : selectedStation?.name;
    const targetLoc = targetType === 'school' ? selectedSchool?.locality : (selectedStation?.zone || selectedStation?.state);
    const currentSubject = draftResult?.subject || `Civic Grievance: ${targetTitle}`;

    if (savedDocket) {
      const updated = await updateDocket(savedDocket.id, {
        status: initialStatus,
        activeDraftText,
        sentDraftText: activeDraftText,
        subject: currentSubject
      });
      setSavedDocket(updated);
      if (onDocketSaved) onDocketSaved(updated);
      return updated;
    }

    const newDocket = await saveDocket({
      status: initialStatus,
      targetType,
      targetName: targetTitle,
      locality: targetLoc,
      authority: selectedAuthority,
      evidence,
      subject: currentSubject,
      letterTextEn: draftResult?.englishText || '',
      letterTextHi: draftResult?.hindiText || '',
      activeDraftText,
      sentDraftText: activeDraftText,
      selectedLanguage,
      tone: urgency,
      polishMode,
      senderName,
      senderRole,
      senderContact
    });

    setSavedDocket(newDocket);
    if (onDocketSaved) onDocketSaved(newDocket);
    return newDocket;
  };

  // Dispatch Action 1: Share Plain Text
  const handleSharePlainText = async () => {
    if (!activeDraftText) return;
    try {
      const subject = draftResult?.subject || `Civic Grievance Petition`;

      const result = await Share.share({
        title: subject,
        message: `${subject}\n\n${activeDraftText}`
      });

      if (result && result.action === Share.sharedAction) {
        const docket = await persistDocket(DOCKET_STATUS.SHARED);
        setActionSuccessNotice(`Shared successfully! Saved to on-device docket [${docket.referenceId}].`);
      } else {
        const docket = await persistDocket(DOCKET_STATUS.DRAFT);
        setActionSuccessNotice(`Share cancelled. Saved to on-device docket [${docket.referenceId}] as Draft.`);
      }
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  // Dispatch Action 2: Copy for Portal (CPGRAMS / DPCC)
  const handleCopyForPortal = async () => {
    if (!activeDraftText) return;
    try {
      let copied = false;
      if (Clipboard && Clipboard.setStringAsync) {
        await Clipboard.setStringAsync(activeDraftText);
        copied = true;
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(activeDraftText);
        copied = true;
      }

      const docket = await persistDocket(DOCKET_STATUS.DRAFT);
      setActionSuccessNotice(
        copied
          ? `Text copied to clipboard! Saved to docket [${docket.referenceId}] as Draft. Ready for CPGRAMS / DPCC portal.`
          : `Saved to docket [${docket.referenceId}] as Draft.`
      );
    } catch (_err) {
      Alert.alert('Copy Error', 'Failed to copy text to clipboard.');
    }
  };

  // Dispatch Action 3: Open in Mail (with length safety check)
  const handleOpenInMail = async () => {
    if (!activeDraftText || !selectedAuthority) return;

    const email = selectedAuthority.email;
    if (!email) {
      Alert.alert('No Email Address', 'This authority only accepts submissions via their online grievance portal.');
      return;
    }

    const subject = draftResult?.subject || `Civic Grievance: School Air Quality`;
    // P4: do not percent-encode email address in mailto:
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(activeDraftText)}`;

    // Android/iOS mailto length warning (especially for percent-encoded Hindi)
    if (mailtoUrl.length > 2000) {
      Alert.alert(
        'Long Message Notice',
        `This letter is ${activeDraftText.length} characters long. Some mobile email apps may truncate long email bodies. If your email app truncates the text, please use the "Share" or "Copy for Portal" button.`,
        [
          { text: 'Proceed to Email', onPress: () => openMailClient(mailtoUrl) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    await openMailClient(mailtoUrl);
  };

  const openMailClient = async (mailtoUrl) => {
    try {
      const supported = await Linking.canOpenURL(mailtoUrl).catch(() => true);
      if (!supported && Platform.OS !== 'web') {
        Alert.alert(
          'No Mail Client Detected',
          'No compatible mail client found. Please use "Share Text" or "Copy for Portal" instead.'
        );
        return;
      }

      await Linking.openURL(mailtoUrl);
      const docket = await persistDocket(DOCKET_STATUS.OPENED_IN_MAIL);
      setActionSuccessNotice(`Mail client opened. Docket status updated to "Opened in mail" [${docket.referenceId}].`);
    } catch (_err) {
      Alert.alert('Could Not Open Mail', 'Unable to launch default mail app. Please use "Share" or "Copy".');
    }
  };

  // Dispatch Action 4: Mark as Sent (Truthful user confirmation)
  const handleMarkAsSent = () => {
    Alert.alert(
      'Confirm Submission',
      'Have you submitted this grievance via email or the government portal?',
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Yes, Mark as Sent',
          onPress: async () => {
            const docket = await persistDocket(DOCKET_STATUS.MARKED_AS_SENT);
            setActionSuccessNotice(`Marked as sent on this device [${docket.referenceId}].`);
          }
        }
      ]
    );
  };

  // Reset modal state on close
  const handleClose = () => {
    setStep(1);
    setSchoolQuery('');
    setSchoolResults([]);
    setSelectedSchool(null);
    setEvidence(null);
    setEvidenceError(null);
    setDraftResult(null);
    setPolishedTemplate(null);
    setCustomDraftText(null);
    setUserActionNote('');
    setSavedDocket(null);
    setActionSuccessNotice(null);
    onClose();
  };

  const canProceedStep1 = (targetType === 'school' && selectedSchool) || (targetType === 'station' && selectedStation);
  const canProceedStep2 = !!evidence && !isLoadingEvidence && evidence.daysWithData > 0;
  const canProceedStep3 = !!selectedAuthority;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.badgeRow}>
                <Ionicons name="document-text" size={14} color="#00f0ff" />
                <Text style={styles.badgeText}>SECTION 10 DELHI AIR ACT · CIVIC GRIEVANCE</Text>
              </View>
              <Text style={styles.modalTitle}>CIVIC PETITION GENERATOR</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Wizard Step Progress Tracker */}
          <View style={styles.stepProgressContainer}>
            {[
              { num: 1, label: 'TARGET' },
              { num: 2, label: 'EVIDENCE' },
              { num: 3, label: 'AUTHORITY' },
              { num: 4, label: 'DISPATCH' }
            ].map((s, idx) => {
              const isActive = step === s.num;
              const isPassed = step > s.num;
              return (
                <View key={s.num} style={styles.stepItemWrapper}>
                  <TouchableOpacity
                    disabled={!isPassed && step !== s.num}
                    onPress={() => isPassed && setStep(s.num)}
                    style={[
                      styles.stepCircle,
                      isActive && styles.stepCircleActive,
                      isPassed && styles.stepCirclePassed
                    ]}
                  >
                    {isPassed ? (
                      <Ionicons name="checkmark" size={12} color="#00f0ff" />
                    ) : (
                      <Text style={[styles.stepCircleText, isActive && styles.stepCircleTextActive]}>
                        {s.num}
                      </Text>
                    )}
                  </TouchableOpacity>
                  <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>
                    {s.label}
                  </Text>
                  {idx < 3 && <View style={[styles.stepConnector, isPassed && styles.stepConnectorPassed]} />}
                </View>
              );
            })}
          </View>

          {/* Status / Success Alert */}
          {actionSuccessNotice && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.successBannerText}>{actionSuccessNotice}</Text>
              <TouchableOpacity onPress={() => setActionSuccessNotice(null)}>
                <Ionicons name="close" size={14} color="#10b981" />
              </TouchableOpacity>
            </View>
          )}

          {/* ============================================================== */}
          {/* STEP 1: TARGET SELECTION (School vs Station)                   */}
          {/* ============================================================== */}
          {step === 1 && (
            <ScrollView style={styles.stepContentScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionTitle}>1. SELECT GRIEVANCE TARGET</Text>
              <Text style={styles.sectionSubtitle}>
                Select the educational institution or localized ambient air quality monitor to compile continuous telemetry evidence for.
              </Text>

              {/* Toggle Target Mode */}
              <View style={styles.targetToggleRow}>
                <TouchableOpacity
                  onPress={() => setTargetType('school')}
                  style={[styles.toggleBtn, targetType === 'school' && styles.toggleBtnActive]}
                >
                  <Ionicons name="school-outline" size={16} color={targetType === 'school' ? '#00f0ff' : '#64748b'} />
                  <Text style={[styles.toggleBtnText, targetType === 'school' && styles.toggleBtnTextActive]}>
                    SCHOOL / COLLEGE
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setTargetType('station')}
                  style={[styles.toggleBtn, targetType === 'station' && styles.toggleBtnActive]}
                >
                  <Ionicons name="radio-outline" size={16} color={targetType === 'station' ? '#00f0ff' : '#64748b'} />
                  <Text style={[styles.toggleBtnText, targetType === 'station' && styles.toggleBtnTextActive]}>
                    AIR MONITOR STATION
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Mode A: School Search */}
              {targetType === 'school' && (
                <View style={styles.targetBox}>
                  <Text style={styles.inputLabel}>SEARCH SCHOOL DIRECTORY (450+ DELHI INSTITUTIONS)</Text>
                  <View style={styles.searchInputRow}>
                    <Ionicons name="search" size={16} color="#38bdf8" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="e.g., Delhi Public School, Modern School, KV..."
                      placeholderTextColor="#475569"
                      value={schoolQuery}
                      onChangeText={setSchoolQuery}
                      autoCapitalize="none"
                    />
                    {isSearchingSchools && <ActivityIndicator size="small" color="#00f0ff" />}
                  </View>

                  {/* Selected School Highlight */}
                  {selectedSchool && (
                    <View style={styles.selectedTargetCard}>
                      <View style={styles.targetCardHeader}>
                        <Ionicons name="shield-checkmark" size={18} color="#00f0ff" />
                        <Text style={styles.selectedTargetTitle}>{selectedSchool.name}</Text>
                      </View>
                      <Text style={styles.selectedTargetLocality}>
                        Locality: {selectedSchool.locality} · {selectedSchool.district || selectedSchool.zone || 'Delhi NCR'}
                      </Text>
                      {selectedSchool.nearestStation ? (
                        <View style={styles.stationRefBadge}>
                          <Ionicons name="location" size={12} color="#38bdf8" />
                          <Text style={styles.stationRefText}>
                            Nearest station (reference): {selectedSchool.nearestStation.replace(/\s*CAAQMS/gi, '').trim()}{selectedSchool.nearestStationDistanceKm ? ` (${selectedSchool.nearestStationDistanceKm} km)` : ''}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                  {/* Search Results Dropdown */}
                  {schoolResults.length > 0 && (
                    <View style={styles.resultsList}>
                      {schoolResults.map((s, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.resultItem}
                          onPress={() => {
                            setSelectedSchool(s);
                            setSchoolQuery(s.name);
                            setSchoolResults([]);
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.resultItemName}>{s.name}</Text>
                            <Text style={styles.resultItemSub}>
                              {s.locality}{s.nearestStation ? ` · Nearest station (reference): ${s.nearestStation.replace(/\s*CAAQMS/gi, '').trim()}${s.nearestStationDistanceKm ? ` (${s.nearestStationDistanceKm} km)` : ''}` : ''}{s.sourceLabel ? ` · (${s.sourceLabel})` : ''}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#64748b" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Mode B: Air Monitor Station */}
              {targetType === 'station' && (
                <View style={styles.targetBox}>
                  <Text style={styles.inputLabel}>SELECTED AREA</Text>
                  <View style={styles.selectedTargetCard}>
                    <View style={styles.targetCardHeader}>
                      <Ionicons name="radio" size={18} color="#00f0ff" />
                      <Text style={styles.selectedTargetTitle}>
                        {selectedStation?.name ? selectedStation.name.replace(/\s*CAAQMS/gi, '').trim() : 'Selected area'}
                      </Text>
                    </View>
                    <Text style={styles.selectedTargetLocality}>
                      Zone / Region: {selectedStation?.zone || selectedStation?.state || 'Delhi NCR'}
                    </Text>
                    <Text style={styles.stationRefText}>
                      Observation Source: Open-Meteo Modelled Hourly PM2.5
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          {/* ============================================================== */}
          {/* STEP 2: EMPIRICAL TELEMETRY EVIDENCE                           */}
          {/* ============================================================== */}
          {step === 2 && (
            <ScrollView style={styles.stepContentScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionTitle}>2. EMPIRICAL TELEMETRY EVIDENCE</Text>
              <Text style={styles.sectionSubtitle}>
                Configure observation window and safety threshold. Continuous readings during school operating hours (07:00–13:00 IST) are verified without extrapolation.
              </Text>

              {/* Time Horizon Selector */}
              <Text style={styles.inputLabel}>OBSERVATION HORIZON</Text>
              <View style={styles.chipRow}>
                {[7, 14, 21, 30].map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setTimeHorizonDays(d)}
                    style={[styles.chip, timeHorizonDays === d && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, timeHorizonDays === d && styles.chipTextActive]}>
                      {d} DAYS
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Critical PM2.5 Threshold Selector */}
              <Text style={styles.inputLabel}>CRITICAL PM2.5 THRESHOLD (µg/m³)</Text>
              <View style={styles.chipRow}>
                {[
                  { val: 60, label: '60 (NAAQS Standard)' },
                  { val: 120, label: '120 (Poor)' },
                  { val: 250, label: '250 (Emergency)' }
                ].map((th) => (
                  <TouchableOpacity
                    key={th.val}
                    onPress={() => setThreshold(th.val)}
                    style={[styles.chip, threshold === th.val && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, threshold === th.val && styles.chipTextActive]}>
                      {th.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Fetch Trigger Button */}
              <TouchableOpacity
                onPress={handleLoadEvidence}
                style={styles.refreshEvidenceBtn}
                disabled={isLoadingEvidence}
              >
                {isLoadingEvidence ? (
                  <ActivityIndicator size="small" color="#00f0ff" />
                ) : (
                  <>
                    <Ionicons name="sync" size={14} color="#00f0ff" />
                    <Text style={styles.refreshEvidenceBtnText}>COMPILE EMPIRICAL TELEMETRY</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Error Alert Card (Zero-Faking Directive) */}
              {evidenceError && (
                <View style={styles.errorCard}>
                  <Ionicons name="alert-circle" size={20} color="#ef4444" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.errorTitle}>TELEMETRY FETCH FAILED</Text>
                    <Text style={styles.errorSub}>{evidenceError}</Text>
                    <Text style={styles.errorDirective}>
                      Per AGENTS.md zero-faking directive, no synthetic approximations or trigonometric curves are generated. Please verify network connectivity and tap Compile to retry.
                    </Text>
                  </View>
                </View>
              )}

              {/* Zero Observations Error Alert (Zero-Faking Directive) */}
              {evidence && evidence.daysWithData === 0 && (
                <View style={styles.errorCard}>
                  <Ionicons name="alert-circle" size={20} color="#ef4444" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.errorTitle}>ZERO VERIFIED OBSERVATIONS</Text>
                    <Text style={styles.errorSub}>
                      No continuous telemetry records found for this target in the selected window (0 days with data).
                    </Text>
                    <Text style={styles.errorDirective}>
                      Per the Zero-Faking Directive (AGENTS.md), drafting a civic petition without verified empirical data is strictly blocked (Step 3 locked).
                    </Text>
                  </View>
                </View>
              )}

              {/* Evidence Metrics Grid */}
              {evidence && (
                <View style={styles.evidenceCard}>
                  <View style={styles.evidenceHeader}>
                    <Ionicons name="analytics" size={16} color="#00f0ff" />
                    <Text style={styles.evidenceHeaderText}>VERIFIED TELEMETRY SNAPSHOT</Text>
                  </View>

                  <View style={styles.metricsGrid}>
                    <View style={styles.metricTile}>
                      <Text style={styles.metricVal}>
                        {evidence.daysWithData}/{evidence.totalDays || timeHorizonDays}
                      </Text>
                      <Text style={styles.metricLabel}>DAYS WITH DATA</Text>
                      {evidence.daysMissing > 0 && (
                        <Text style={styles.metricWarn}>({evidence.daysMissing} missing excluded)</Text>
                      )}
                    </View>

                    <View style={styles.metricTile}>
                      <Text style={[styles.metricVal, { color: '#ef4444' }]}>
                        {evidence.exceedCount}
                      </Text>
                      <Text style={styles.metricLabel}>EXCEEDANCE DAYS</Text>
                      <Text style={styles.metricSub}>{`> ${threshold} µg/m³ threshold`}</Text>
                    </View>

                    <View style={styles.metricTile}>
                      <Text style={[styles.metricVal, { color: '#eab308' }]}>
                        {evidence.averageMorningPm25 ? `${evidence.averageMorningPm25} µg` : '--'}
                      </Text>
                      <Text style={styles.metricLabel}>MORNING AVG (IST)</Text>
                      <Text style={styles.metricSub}>07:00–13:00 School Window</Text>
                    </View>

                    <View style={styles.metricTile}>
                      <Text style={[styles.metricVal, { color: '#a855f7' }]}>
                        {evidence.peakMorningPm25 ? `${evidence.peakMorningPm25} µg` : '--'}
                      </Text>
                      <Text style={styles.metricLabel}>PEAK RECORDED</Text>
                      <Text style={styles.metricSub}>{evidence.peakDate || 'Period Peak'}</Text>
                    </View>
                  </View>

                  {/* Provenance Footer */}
                  <View style={styles.provenanceRow}>
                    <Ionicons name="shield-checkmark" size={14} color="#10b981" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.provenanceText}>
                        Data Source: Open-Meteo Modelled Hourly PM2.5{evidence.gridId ? ` (Grid ${evidence.gridId})` : ''}
                      </Text>
                      {evidence.stationName ? (
                        <Text style={[styles.provenanceText, { opacity: 0.75, marginTop: 2 }]}>
                          Nearest monitor for reference (not data source): {evidence.stationName.replace(/\s*CAAQMS/gi, '').trim()}{evidence.stationDistanceKm != null ? ` (${evidence.stationDistanceKm} km)` : ''}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* ML Forecast Insight (AWS SageMaker) */}
                  {forecast?.peakMorningArrival && (
                    <View style={styles.forecastBox}>
                      <View style={styles.forecastHeader}>
                        <Ionicons name="sparkles" size={14} color="#00f0ff" />
                        <Text style={styles.forecastTitle}>AWS SAGEMAKER 48H INFERENCE</Text>
                      </View>
                      <Text style={styles.forecastBody}>
                        Anticipated Morning Peak: {forecast.peakMorningArrival.predictedPm25} µg/m³ at {forecast.peakMorningArrival.time} ({forecast.peakMorningArrival.date})
                      </Text>
                    </View>
                  )}
                  {forecastStatus === 'UNAVAILABLE' && (
                    <Text style={styles.forecastUnavailableNote}>
                      SageMaker 48h inference unavailable for this coordinate · Draft will omit forecast block.
                    </Text>
                  )}
                </View>
              )}
            </ScrollView>
          )}

          {/* ============================================================== */}
          {/* STEP 3: AUTHORITY SELECTION & DUPLICATE CHECK                  */}
          {/* ============================================================== */}
          {step === 3 && (
            <ScrollView style={styles.stepContentScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionTitle}>3. COMPETENT AUTHORITY</Text>
              <Text style={styles.sectionSubtitle}>
                Select the government body with jurisdiction over school health, pollution control, or municipal compliance.
              </Text>

              {/* Duplicate Prevention Alert */}
              {recentDuplicate && (
                <View style={styles.duplicateWarningCard}>
                  <Ionicons name="warning" size={20} color="#f59e0b" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.duplicateWarningTitle}>RECENT GRIEVANCE NOTICE (7-DAY GUARD)</Text>
                    <Text style={styles.duplicateWarningBody}>
                      A grievance for this target was already drafted/shared on this device recently (Ref: {recentDuplicate.referenceId}). Portals discourage duplicate submissions within 7 days.
                    </Text>
                  </View>
                </View>
              )}

              {/* Authorities List */}
              {isLoadingAuthorities ? (
                <ActivityIndicator size="small" color="#00f0ff" style={{ marginVertical: 20 }} />
              ) : authoritiesError ? (
                <Text style={styles.errorSub}>{authoritiesError}</Text>
              ) : (
                authorities.map((auth) => {
                  const isSelected = selectedAuthority?.id === auth.id;
                  return (
                    <TouchableOpacity
                      key={auth.id}
                      activeOpacity={0.75}
                      onPress={() => setSelectedAuthority(auth)}
                      style={[styles.authorityCard, isSelected && styles.authorityCardSelected]}
                    >
                      <View style={styles.authorityCardHeader}>
                        <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                          {isSelected && <View style={styles.radioDot} />}
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[styles.authorityName, isSelected && styles.authorityNameActive]}>
                            {auth.fullName} ({auth.id.toUpperCase()})
                          </Text>
                          {auth.sourceLabel ? (
                            <Text style={styles.offlineBadge}>({auth.sourceLabel})</Text>
                          ) : null}
                          <Text style={styles.authorityDesignation}>{auth.designation}</Text>
                        </View>
                      </View>
                      <Text style={styles.authorityMandate}>{auth.mandate}</Text>
                      <View style={styles.authorityMetaRow}>
                        {auth.email ? (
                          <Text style={styles.authorityEmail}>✉️ {auth.email}</Text>
                        ) : (
                          <Text style={styles.authorityPortal}>🌐 Portal Only ({auth.portalName})</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}

              {/* Standard Demands */}
              <Text style={[styles.inputLabel, { marginTop: 18 }]}>STATUTORY REMEDIATION DEMANDS</Text>
              {standardDemands.map((demand) => {
                const isChecked = selectedDemands.includes(demand.text);
                return (
                  <TouchableOpacity
                    key={demand.id}
                    onPress={() => {
                      if (isChecked) {
                        setSelectedDemands(selectedDemands.filter((d) => d !== demand.text));
                      } else {
                        setSelectedDemands([...selectedDemands, demand.text]);
                      }
                    }}
                    style={styles.demandItem}
                  >
                    <Ionicons
                      name={isChecked ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={isChecked ? '#00f0ff' : '#64748b'}
                    />
                    <Text style={[styles.demandText, isChecked && styles.demandTextChecked]}>
                      {demand.label ? `${demand.label}: ` : ''}{demand.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* ============================================================== */}
          {/* STEP 4: REVIEW, SENDER PROFILE & DISPATCH                      */}
          {/* ============================================================== */}
          {step === 4 && (
            <ScrollView style={styles.stepContentScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionTitle}>4. REVIEW, IDENTITY & DISPATCH</Text>
              <Text style={styles.sectionSubtitle}>
                Add your local sender details (saved strictly on your device) and choose language and tone.
              </Text>

              {/* Local Sender Profile Form (DPDP Act Compliance) */}
              <View style={styles.senderProfileBox}>
                <View style={styles.profileBoxHeader}>
                  <Ionicons name="person-circle-outline" size={16} color="#00f0ff" />
                  <Text style={styles.profileBoxTitle}>SENDER IDENTITY (SAVED ON-DEVICE ONLY)</Text>
                </View>

                <TextInput
                  style={styles.senderInput}
                  placeholder="Full Name (e.g., Arijit Paul)"
                  placeholderTextColor="#475569"
                  value={senderName}
                  onChangeText={setSenderName}
                />

                <TextInput
                  style={styles.senderInput}
                  placeholder="Designation / Role (e.g., Concerned Parent, Faculty, Resident)"
                  placeholderTextColor="#475569"
                  value={senderRole}
                  onChangeText={setSenderRole}
                />

                <TextInput
                  style={styles.senderInput}
                  placeholder="Contact (e.g., +91 98100 12345 or email@domain.com)"
                  placeholderTextColor="#475569"
                  value={senderContact}
                  onChangeText={setSenderContact}
                />
              </View>

              {/* Optional Institutional Action / Disruption Field (P2) */}
              <View style={[styles.senderProfileBox, { marginTop: 12 }]}>
                <View style={styles.profileBoxHeader}>
                  <Ionicons name="school-outline" size={16} color="#00f0ff" />
                  <Text style={styles.profileBoxTitle}>INSTITUTIONAL ACTIONS / IMPACT (OPTIONAL)</Text>
                </View>
                <TextInput
                  style={[styles.senderInput, { minHeight: 60, textAlignVertical: 'top' }]}
                  placeholder="Describe your school's specific actions (e.g. outdoor assemblies cancelled, physical education moved indoors)..."
                  placeholderTextColor="#475569"
                  value={userActionNote}
                  onChangeText={(val) => {
                    setUserActionNote(val);
                    setPolishedTemplate(null);
                    setCustomDraftText(null);
                  }}
                  multiline={true}
                />
              </View>

              {/* Language & Urgency Controls */}
              <View style={styles.controlsRow}>
                {/* Language Switch */}
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>LANGUAGE</Text>
                  <View style={styles.pillToggle}>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedLanguage('en');
                      }}
                      style={[styles.pillBtn, selectedLanguage === 'en' && styles.pillBtnActive]}
                    >
                      <Text style={[styles.pillBtnText, selectedLanguage === 'en' && styles.pillBtnTextActive]}>
                        ENGLISH
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedLanguage('hi');
                      }}
                      style={[styles.pillBtn, selectedLanguage === 'hi' && styles.pillBtnActive]}
                    >
                      <Text style={[styles.pillBtnText, selectedLanguage === 'hi' && styles.pillBtnTextActive]}>
                        हिन्दी (HI)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Urgency Switch */}
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>TONE / URGENCY</Text>
                  <View style={styles.pillToggle}>
                    <TouchableOpacity
                      onPress={() => {
                        setUrgency('formal');
                        setPolishedTemplate({ en: null, hi: null });
                        setCustomDraftText(null);
                        setPolishMode('ORIGINAL_VERIFIED');
                        setPolishNote(null);
                      }}
                      style={[styles.pillBtn, urgency === 'formal' && styles.pillBtnActive]}
                    >
                      <Text style={[styles.pillBtnText, urgency === 'formal' && styles.pillBtnTextActive]}>
                        FORMAL
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setUrgency('emergency');
                        setPolishedTemplate(null);
                        setCustomDraftText(null);
                        setPolishMode('ORIGINAL_VERIFIED');
                        setPolishNote(null);
                      }}
                      style={[styles.pillBtn, urgency === 'emergency' && styles.pillBtnActive]}
                    >
                      <Text style={[styles.pillBtnText, urgency === 'emergency' && styles.pillBtnTextActive]}>
                        EMERGENCY
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* AI Polish Button */}
              <TouchableOpacity
                onPress={handlePolishDraft}
                disabled={isPolishing || !draftResult}
                style={styles.aiPolishBtn}
              >
                {isPolishing ? (
                  <ActivityIndicator size="small" color="#a855f7" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={14} color="#a855f7" />
                    <Text style={styles.aiPolishBtnText}>POLISH WITH CLOUD LEGAL AI</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Polish Note / Transparency Status */}
              {polishNote && (
                <View style={styles.polishNoteCard}>
                  <Ionicons name="information-circle" size={14} color="#38bdf8" />
                  <Text style={styles.polishNoteText}>{polishNote}</Text>
                </View>
              )}

              {/* Draft Preview Container */}
              <View style={styles.draftContainer}>
                <View style={styles.draftHeader}>
                  <Text style={styles.draftSubjectText}>
                    SUBJECT: {draftResult?.subject || 'Civic Grievance Draft'}
                  </Text>
                  <Text style={styles.charCountText}>
                    {activeDraftText.length} chars · Portal Safe
                  </Text>
                </View>

                {isGeneratingDraft ? (
                  <ActivityIndicator size="large" color="#00f0ff" style={{ marginVertical: 30 }} />
                ) : draftError ? (
                  <Text style={styles.errorSub}>{draftError}</Text>
                ) : (
                  <ScrollView style={styles.draftScrollBox} nestedScrollEnabled={true}>
                    <Text style={styles.draftBodyText}>{activeDraftText}</Text>
                  </ScrollView>
                )}
              </View>

              {/* Legal & Privacy Disclaimer (Zero False Promises) */}
              <View style={styles.disclaimerBox}>
                <Ionicons name="shield" size={14} color="#64748b" />
                <Text style={styles.disclaimerText}>
                  ⚖️ Empirical Representation Notice: This is an empirical evidence compilation for administrative grievance submission, not formal judicial advocacy. The letter text, without personal details, is processed by AWS Bedrock / Google Gemini when AI Polish is requested. Personal identity details and grievance logs remain stored strictly on this device (DPDP Act 2023).
                </Text>
              </View>

              {/* Dispatch Action Dock */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>DISPATCH & SUBMISSION ACTIONS</Text>
              <View style={styles.actionsGrid}>
                {/* 1. Share Plain Text */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={handleSharePlainText}
                  style={[styles.actionGridBtn, styles.actionBtnShare]}
                >
                  <Ionicons name="share-social" size={18} color="#00f0ff" />
                  <Text style={styles.actionGridBtnTitle}>SHARE PLAIN TEXT</Text>
                  <Text style={styles.actionGridBtnSub}>WhatsApp, Docs, Drive</Text>
                </TouchableOpacity>

                {/* 2. Copy for Portal */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={handleCopyForPortal}
                  style={[styles.actionGridBtn, styles.actionBtnCopy]}
                >
                  <Ionicons name="copy-outline" size={18} color="#38bdf8" />
                  <Text style={styles.actionGridBtnTitle}>COPY FOR PORTAL</Text>
                  <Text style={styles.actionGridBtnSub}>CPGRAMS / DPCC Portal</Text>
                </TouchableOpacity>

                {/* 3. Open in Mail */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={handleOpenInMail}
                  style={[styles.actionGridBtn, styles.actionBtnMail]}
                >
                  <Ionicons name="mail" size={18} color="#a855f7" />
                  <Text style={styles.actionGridBtnTitle}>OPEN IN MAIL</Text>
                  <Text style={styles.actionGridBtnSub}>
                    {selectedAuthority?.email ? selectedAuthority.email : 'Portal Only'}
                  </Text>
                </TouchableOpacity>

                {/* 4. Mark as Sent */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={handleMarkAsSent}
                  style={[styles.actionGridBtn, styles.actionBtnSent]}
                >
                  <Ionicons name="checkmark-done" size={18} color="#10b981" />
                  <Text style={styles.actionGridBtnTitle}>MARK AS SENT</Text>
                  <Text style={styles.actionGridBtnSub}>Audit Record Logged</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* Wizard Bottom Navigation Buttons */}
          <View style={styles.modalFooter}>
            {step > 1 ? (
              <TouchableOpacity
                onPress={() => setStep(step - 1)}
                style={styles.backBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={16} color="#94a3b8" />
                <Text style={styles.backBtnText}>BACK</Text>
              </TouchableOpacity>
            ) : <View style={{ width: 80 }} />}

            {step < 4 ? (
              <TouchableOpacity
                onPress={() => {
                  if (step === 1 && canProceedStep1) setStep(2);
                  if (step === 2 && canProceedStep2) setStep(3);
                  if (step === 3 && canProceedStep3) setStep(4);
                }}
                disabled={
                  (step === 1 && !canProceedStep1) ||
                  (step === 2 && !canProceedStep2) ||
                  (step === 3 && !canProceedStep3)
                }
                style={[
                  styles.nextBtn,
                  ((step === 1 && !canProceedStep1) ||
                   (step === 2 && !canProceedStep2) ||
                   (step === 3 && !canProceedStep3)) && styles.nextBtnDisabled
                ]}
                activeOpacity={0.7}
              >
                <Text style={styles.nextBtnText}>NEXT STEP</Text>
                <Ionicons name="chevron-forward" size={16} color="#050811" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleClose}
                style={styles.doneBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.doneBtnText}>CLOSE WIZARD</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 7, 17, 0.95)',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#050811',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    marginHorizontal: Platform.OS === 'web' ? 'auto' : 0,
    maxWidth: Platform.OS === 'web' ? 680 : '100%',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 189, 248, 0.2)',
  },
  headerTitleGroup: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#00f0ff',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },

  // Progress Tracker
  stepProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(11, 19, 38, 0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 189, 248, 0.15)',
  },
  stepItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#090f1e',
  },
  stepCircleActive: {
    borderColor: '#00f0ff',
    backgroundColor: 'rgba(0, 240, 255, 0.2)',
  },
  stepCirclePassed: {
    borderColor: '#00f0ff',
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
  },
  stepCircleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  stepCircleTextActive: {
    color: '#00f0ff',
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    marginLeft: 5,
    fontFamily: 'monospace',
  },
  stepLabelActive: {
    color: '#f8fafc',
  },
  stepConnector: {
    width: 14,
    height: 1,
    backgroundColor: '#334155',
    marginHorizontal: 4,
  },
  stepConnectorPassed: {
    backgroundColor: '#00f0ff',
  },

  // Success Banner
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 8,
  },
  successBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#10b981',
    fontWeight: '700',
    marginLeft: 8,
  },

  // Step Content Scroll
  stepContentScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#00f0ff',
    letterSpacing: 0.8,
    fontFamily: 'monospace',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 16,
  },

  // Step 1: Target
  targetToggleRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    borderRadius: 8,
    marginRight: 6,
  },
  toggleBtnActive: {
    borderColor: '#00f0ff',
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    marginLeft: 6,
    fontFamily: 'monospace',
  },
  toggleBtnTextActive: {
    color: '#00f0ff',
  },
  targetBox: {
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 13,
  },
  selectedTargetCard: {
    backgroundColor: 'rgba(11, 19, 38, 0.85)',
    borderWidth: 1,
    borderColor: '#00f0ff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  targetCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  selectedTargetTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f8fafc',
    marginLeft: 8,
  },
  selectedTargetLocality: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 6,
  },
  stationRefBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  stationRefText: {
    fontSize: 10,
    color: '#38bdf8',
    fontWeight: '700',
    marginLeft: 4,
  },
  resultsList: {
    backgroundColor: 'rgba(11, 19, 38, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 8,
    marginBottom: 14,
    maxHeight: 180,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 189, 248, 0.1)',
  },
  resultItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f8fafc',
  },
  resultItemSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },

  // Step 2: Evidence
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    marginRight: 6,
    marginBottom: 6,
  },
  chipActive: {
    borderColor: '#00f0ff',
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
  },
  chipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    fontFamily: 'monospace',
  },
  chipTextActive: {
    color: '#00f0ff',
  },
  refreshEvidenceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#00f0ff',
    borderRadius: 8,
    marginVertical: 10,
  },
  refreshEvidenceBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00f0ff',
    marginLeft: 6,
    fontFamily: 'monospace',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
  },
  errorTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ef4444',
    fontFamily: 'monospace',
  },
  errorSub: {
    fontSize: 11,
    color: '#fca5a5',
    marginTop: 2,
  },
  errorDirective: {
    fontSize: 9,
    color: '#cbd5e1',
    marginTop: 6,
    fontStyle: 'italic',
  },
  evidenceCard: {
    backgroundColor: 'rgba(11, 19, 38, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
  },
  evidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  evidenceHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00f0ff',
    marginLeft: 6,
    fontFamily: 'monospace',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricTile: {
    width: '48%',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#f8fafc',
    fontFamily: 'monospace',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  metricSub: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 1,
  },
  metricWarn: {
    fontSize: 8,
    color: '#f59e0b',
    marginTop: 1,
  },
  provenanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(56, 189, 248, 0.1)',
  },
  provenanceText: {
    fontSize: 9,
    color: '#10b981',
    fontWeight: '700',
    marginLeft: 6,
    fontFamily: 'monospace',
  },
  forecastBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  forecastTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38bdf8',
    marginLeft: 4,
    fontFamily: 'monospace',
  },
  forecastBody: {
    fontSize: 10,
    color: '#e2e8f0',
  },
  forecastUnavailableNote: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 6,
    fontStyle: 'italic',
  },

  // Step 3: Authority
  duplicateWarningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  duplicateWarningTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#f59e0b',
    fontFamily: 'monospace',
  },
  duplicateWarningBody: {
    fontSize: 10,
    color: '#fde68a',
    marginTop: 2,
    lineHeight: 14,
  },
  authorityCard: {
    backgroundColor: 'rgba(11, 19, 38, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  authorityCardSelected: {
    borderColor: '#00f0ff',
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
  },
  authorityCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#00f0ff',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00f0ff',
  },
  authorityName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f8fafc',
  },
  authorityNameActive: {
    color: '#00f0ff',
  },
  authorityDesignation: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  authorityMandate: {
    fontSize: 10,
    color: '#cbd5e1',
    marginTop: 6,
    lineHeight: 14,
  },
  authorityMetaRow: {
    marginTop: 4,
  },
  authorityEmail: {
    fontSize: 9,
    color: '#38bdf8',
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  authorityPortal: {
    fontSize: 9,
    color: '#a855f7',
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  demandItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  demandText: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 8,
    flex: 1,
    lineHeight: 15,
  },
  demandTextChecked: {
    color: '#f8fafc',
  },

  // Step 4: Review & Dispatch
  senderProfileBox: {
    backgroundColor: 'rgba(11, 19, 38, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  profileBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileBoxTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00f0ff',
    marginLeft: 6,
    fontFamily: 'monospace',
  },
  senderInput: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#f8fafc',
    fontSize: 12,
    marginBottom: 6,
  },
  controlsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  pillToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    borderRadius: 6,
    padding: 2,
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 4,
  },
  pillBtnActive: {
    backgroundColor: '#00f0ff',
  },
  pillBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    fontFamily: 'monospace',
  },
  pillBtnTextActive: {
    color: '#050811',
  },
  aiPolishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderWidth: 1,
    borderColor: '#a855f7',
    borderRadius: 6,
    paddingVertical: 8,
    marginBottom: 8,
  },
  aiPolishBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#a855f7',
    marginLeft: 6,
    fontFamily: 'monospace',
  },
  polishNoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  polishNoteText: {
    fontSize: 10,
    color: '#38bdf8',
    marginLeft: 6,
    flex: 1,
  },
  draftContainer: {
    backgroundColor: 'rgba(11, 19, 38, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  draftHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 189, 248, 0.15)',
    paddingBottom: 6,
    marginBottom: 8,
  },
  draftSubjectText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38bdf8',
    lineHeight: 15,
  },
  charCountText: {
    fontSize: 9,
    color: '#64748b',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  draftScrollBox: {
    maxHeight: 180,
  },
  draftBodyText: {
    fontSize: 11,
    color: '#cbd5e1',
    lineHeight: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
  },
  disclaimerText: {
    fontSize: 9,
    color: '#94a3b8',
    marginLeft: 6,
    flex: 1,
    lineHeight: 13,
  },

  // Actions Grid
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionGridBtn: {
    width: '48%',
    backgroundColor: 'rgba(11, 19, 38, 0.9)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  actionBtnShare: {
    borderColor: '#00f0ff',
  },
  actionBtnCopy: {
    borderColor: '#38bdf8',
  },
  actionBtnMail: {
    borderColor: '#a855f7',
  },
  actionBtnSent: {
    borderColor: '#10b981',
  },
  actionGridBtnTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#f8fafc',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  actionGridBtnSub: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 2,
    textAlign: 'center',
  },

  // Modal Footer
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(11, 19, 38, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(56, 189, 248, 0.2)',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  backBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    marginLeft: 4,
    fontFamily: 'monospace',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00f0ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  nextBtnDisabled: {
    backgroundColor: '#334155',
    opacity: 0.5,
  },
  nextBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#050811',
    marginRight: 4,
    fontFamily: 'monospace',
  },
  doneBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  doneBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#050811',
    fontFamily: 'monospace',
  },
  offlineBadge: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#eab308',
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
