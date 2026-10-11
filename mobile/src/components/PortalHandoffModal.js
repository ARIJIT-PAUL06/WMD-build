import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function PortalHandoffModal({
  visible,
  onClose,
  portal,
  dockets = [],
  initialDocket = null,
  onCopyAndOpen,
  onEmailNodal
}) {
  const [selectedDocketId, setSelectedDocketId] = useState(
    initialDocket?.id || (dockets.length > 0 ? dockets[0].id : null)
  );

  const activeDocket = dockets.find(d => d.id === selectedDocketId) || initialDocket || (dockets.length > 0 ? dockets[0] : null);

  if (!portal && !visible) return null;

  const currentPortal = portal || {
    name: 'CPGRAMS Central',
    sub: 'Govt. of India Citizen Redressal',
    url: 'https://pgportal.gov.in',
    badge: 'Central Portal',
    icon: 'globe-outline',
    description: 'Central DARPG portal for National Air Quality & inter-departmental grievances.'
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconBox}>
                <Ionicons name={currentPortal.icon || 'globe-outline'} size={20} color="#00f0ff" />
              </View>
              <View style={{ marginLeft: 10 }}>
                <View style={styles.badgeRow}>
                  <View style={styles.portalBadge}>
                    <Text style={styles.portalBadgeText}>{currentPortal.badge || 'Gov Portal'}</Text>
                  </View>
                  <Text style={styles.headerSub}>OFFICIAL GOV DISPATCH</Text>
                </View>
                <Text style={styles.modalTitle}>{currentPortal.name}</Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Portal Description */}
            <View style={styles.portalDescCard}>
              <Text style={styles.portalDescText}>
                {currentPortal.description || currentPortal.sub}
              </Text>
              <View style={styles.portalUrlRow}>
                <Ionicons name="link-outline" size={13} color="#38bdf8" />
                <Text style={styles.portalUrlText}>{currentPortal.url}</Text>
              </View>
            </View>

            {/* Selected Docket Preview */}
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>ATTACHED GRIEVANCE DOSSIER</Text>
              {dockets.length > 1 && (
                <Text style={styles.sectionCounter}>{dockets.length} DOCKETS AVAILABLE</Text>
              )}
            </View>

            {activeDocket ? (
              <View style={styles.docketPreviewCard}>
                <View style={styles.docketPreviewHeader}>
                  <View style={styles.docketRefBadge}>
                    <Ionicons name="bookmark" size={11} color="#00f0ff" />
                    <Text style={styles.docketRefText}>{activeDocket.referenceId}</Text>
                  </View>
                  <Text style={styles.docketTargetText}>{activeDocket.targetName}</Text>
                </View>

                <Text style={styles.docketAuthoritySub}>
                  Authority: {activeDocket.authorityName || 'Government of NCT Delhi'}
                </Text>

                {/* If multiple dockets, let user pick */}
                {dockets.length > 1 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.docketSelectorScroll}
                  >
                    {dockets.map(d => (
                      <TouchableOpacity
                        key={d.id}
                        onPress={() => setSelectedDocketId(d.id)}
                        style={[
                          styles.docketChip,
                          d.id === activeDocket.id && styles.docketChipActive
                        ]}
                      >
                        <Text
                          style={[
                            styles.docketChipText,
                            d.id === activeDocket.id && styles.docketChipTextActive
                          ]}
                        >
                          {d.referenceId}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            ) : (
              <View style={styles.noDocketCard}>
                <Ionicons name="information-circle-outline" size={18} color="#eab308" />
                <Text style={styles.noDocketText}>
                  No saved dockets found. You can open the government portal directly, or draft a verified Section 10 petition first.
                </Text>
              </View>
            )}

            {/* Step-by-Step Filing Guidance */}
            <View style={styles.guidanceBox}>
              <View style={styles.guidanceStepRow}>
                <View style={styles.stepNumCircle}>
                  <Text style={styles.stepNumText}>1</Text>
                </View>
                <Text style={styles.guidanceStepText}>
                  <Text style={{ color: '#00f0ff', fontWeight: '800' }}>One-Tap Copy:</Text> Tap below to copy the verified affidavit and empirical CPCB evidence to your device clipboard.
                </Text>
              </View>
              <View style={styles.guidanceStepRow}>
                <View style={styles.stepNumCircle}>
                  <Text style={styles.stepNumText}>2</Text>
                </View>
                <Text style={styles.guidanceStepText}>
                  <Text style={{ color: '#00f0ff', fontWeight: '800' }}>OTP Login:</Text> Sign in with your Mobile OTP on {currentPortal.name} (required by Indian law to prevent automated bot spam).
                </Text>
              </View>
              <View style={styles.guidanceStepRow}>
                <View style={styles.stepNumCircle}>
                  <Text style={styles.stepNumText}>3</Text>
                </View>
                <Text style={styles.guidanceStepText}>
                  <Text style={{ color: '#00f0ff', fontWeight: '800' }}>Paste & Submit:</Text> Paste the dossier into the grievance description box to receive your official registration acknowledgment.
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsCol}>
              {/* Primary: Copy & Open */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onCopyAndOpen(currentPortal, activeDocket)}
                style={styles.primaryActionBtn}
              >
                <Ionicons name="copy" size={18} color="#040711" />
                <Text style={styles.primaryActionBtnText}>
                  {activeDocket ? 'COPY DOSSIER & OPEN PORTAL' : 'OPEN PORTAL IN BROWSER'}
                </Text>
              </TouchableOpacity>

              {/* Secondary: Email Nodal Officer */}
              {currentPortal.email && activeDocket && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => onEmailNodal(activeDocket, currentPortal)}
                  style={styles.secondaryActionBtn}
                >
                  <Ionicons name="mail" size={17} color="#00f0ff" />
                  <Text style={styles.secondaryActionBtnText}>
                    EMAIL NODAL OFFICER ({currentPortal.email})
                  </Text>
                </TouchableOpacity>
              )}

              {/* Direct Open Link */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onCopyAndOpen(currentPortal, null)}
                style={styles.tertiaryActionBtn}
              >
                <Ionicons name="open-outline" size={15} color="#94a3b8" />
                <Text style={styles.tertiaryActionBtnText}>
                  VISIT PORTAL DIRECTLY (WITHOUT COPYING)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Zero-Faking Regulatory Disclosure */}
            <View style={styles.disclosureCard}>
              <Ionicons name="shield-checkmark" size={14} color="#38bdf8" />
              <Text style={styles.disclosureText}>
                Zero-Faking Transparency: Indian government portals (CPGRAMS, DPCC, Green Delhi) mandate individual citizen mobile OTP verification to lodge grievances. Automated background filing is prohibited by DARPG/NIC.
              </Text>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.95)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#050811',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    maxHeight: '90%',
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 620 : '100%',
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 189, 248, 0.15)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderWidth: 1,
    borderColor: '#00f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  portalBadge: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  portalBadgeText: {
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#00f0ff',
  },
  headerSub: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#f8fafc',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  modalScroll: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  portalDescCard: {
    backgroundColor: 'rgba(11, 19, 38, 0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.15)',
    padding: 12,
    marginBottom: 14,
  },
  portalDescText: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
    marginBottom: 8,
  },
  portalUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  portalUrlText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#38bdf8',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
  },
  sectionCounter: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#00f0ff',
  },
  docketPreviewCard: {
    backgroundColor: 'rgba(11, 19, 38, 0.9)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    padding: 12,
    marginBottom: 14,
  },
  docketPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  docketRefBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  docketRefText: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#00f0ff',
  },
  docketTargetText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f8fafc',
    flex: 1,
  },
  docketAuthoritySub: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 8,
  },
  docketSelectorScroll: {
    flexDirection: 'row',
    marginTop: 4,
  },
  docketChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    marginRight: 6,
  },
  docketChipActive: {
    borderColor: '#00f0ff',
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
  },
  docketChipText: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#64748b',
  },
  docketChipTextActive: {
    color: '#00f0ff',
    fontWeight: '800',
  },
  noDocketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  noDocketText: {
    fontSize: 10,
    color: '#e2e8f0',
    flex: 1,
    lineHeight: 14,
  },
  guidanceBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.15)',
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  guidanceStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNumCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0, 240, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '900',
    color: '#00f0ff',
  },
  guidanceStepText: {
    fontSize: 10,
    color: '#cbd5e1',
    flex: 1,
    lineHeight: 15,
  },
  actionButtonsCol: {
    gap: 10,
    marginBottom: 16,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00f0ff',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  primaryActionBtnText: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#040711',
    letterSpacing: 0.5,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00f0ff',
    paddingVertical: 12,
    gap: 8,
  },
  secondaryActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#00f0ff',
    letterSpacing: 0.3,
  },
  tertiaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  tertiaryActionBtnText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#64748b',
  },
  disclosureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(11, 19, 38, 0.6)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.12)',
    padding: 10,
    marginBottom: 24,
    gap: 8,
  },
  disclosureText: {
    fontSize: 9,
    color: '#64748b',
    flex: 1,
    lineHeight: 13,
  },
});
