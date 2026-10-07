import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAqiColorMeta, getPollutantValue, getPollutantMeta, AqiSporeAura } from './MapCanvas';

export default function BottomDialogBox({
  station,
  isExpanded,
  onToggleExpand,
  onOpenPetition,
  onOpenShield,
  activeRange,
  isAdaptiveMode,
  activePollutant = 'aqi',
}) {
  if (!station) return null;

  const activeVal = getPollutantValue(station, activePollutant);
  const meta = getPollutantMeta(activeVal, activePollutant);
  const pollutantUpper = activePollutant.toUpperCase();

  // Animated height for smooth drawer slide up/down
  const heightAnim = useRef(new Animated.Value(isExpanded ? 440 : 76)).current;

  useEffect(() => {
    Animated.spring(heightAnim, {
      toValue: isExpanded ? 440 : 76,
      friction: 9,
      tension: 48,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, heightAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          height: heightAnim,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
        },
      ]}
    >
      {/* Top Drag Handle / Chevron Bar */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggleExpand}
        style={styles.handleArea}
      >
        <View style={styles.handleBar} />
      </TouchableOpacity>

      {/* Main Header / Compact Summary Row */}
      <View style={styles.headerRow}>
        <View style={styles.stationInfoGroup}>
          <View style={styles.stationBadgeRow}>
            <Text style={styles.nodeTypeLabel}>CAAQMS NODE</Text>
            <View style={[styles.statusDot, { backgroundColor: meta.hex }]} />
            <Text style={[styles.statusLabel, { color: meta.textHex }]}>{meta.label}</Text>
          </View>
          <Text style={styles.stationName} numberOfLines={1}>{station.name}</Text>
          <Text style={styles.stationZone}>{station.zone || station.state || 'India'} · Multi-Source Ground Grid</Text>
        </View>

        {/* Hero AQI / Pollutant Score & Radiating Spores */}
        <View style={styles.heroAqiGroup}>
          <AqiSporeAura color={meta.hex} />
          <Text style={[styles.heroAqiNumber, { color: meta.hex }]}>
            {activeVal}
          </Text>
          <Text style={[styles.heroAqiSubtitle, { color: meta.textHex }]}>
            {pollutantUpper} ({meta.unit}) · {meta.label}
          </Text>
        </View>

        {/* Toggle Chevron Button */}
        <TouchableOpacity
          onPress={onToggleExpand}
          activeOpacity={0.7}
          style={styles.toggleChevronBtn}
        >
          <Ionicons
            name={isExpanded ? 'chevron-down' : 'chevron-up'}
            size={18}
            color="#38bdf8"
          />
        </TouchableOpacity>
      </View>

      {/* Expanded Deep-Dive Content (Scrollable) */}
      {isExpanded && (
        <ScrollView
          style={styles.expandedContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {/* 1. Secondary Metrics 6-Pollutant Matrix */}
          <View style={styles.metricsGrid}>
            {[
              { id: 'pm25', label: 'PM2.5', val: station.pm25 ?? 85, unit: 'µg', color: '#f87171' },
              { id: 'pm10', label: 'PM10', val: station.pm10 ?? 180, unit: 'µg', color: '#fb923c' },
              { id: 'no2', label: 'NO2', val: station.no2 ?? 24, unit: 'µg', color: '#38bdf8' },
              { id: 'so2', label: 'SO2', val: station.so2 ?? 10, unit: 'µg', color: '#a78bfa' },
              { id: 'co', label: 'CO', val: station.co ?? 0.8, unit: 'mg', color: '#34d399' },
              { id: 'o3', label: 'O3', val: station.o3 ?? 30, unit: 'µg', color: '#facc15' },
            ].map((p) => {
              const isActive = activePollutant === p.id;
              return (
                <View
                  key={p.id}
                  style={[
                    styles.metricCard,
                    isActive && {
                      borderColor: p.color,
                      backgroundColor: `${p.color}18`,
                    },
                  ]}
                >
                  <Text style={[styles.metricCardLabel, isActive && { color: p.color, fontWeight: '800' }]}>
                    {p.label}
                  </Text>
                  <Text style={[styles.metricCardVal, { color: isActive ? '#ffffff' : p.color }]}>
                    {p.val} <Text style={styles.unitText}>{p.unit}</Text>
                  </Text>
                </View>
              );
            })}
          </View>

          {/* 2. Google Gemini AI Health & Commute Advisory Card */}
          <View style={styles.advisoryCard}>
            <View style={styles.advisoryHeader}>
              <Text style={styles.advisoryTitle}>RECOMMENDATIONS</Text>
              <View style={styles.advisoryPill}>
                <View style={styles.advisoryDot} />
                <Text style={styles.advisoryPillText}>Live Guidance</Text>
              </View>
            </View>
            <Text style={styles.advisoryBody}>
              {station.aqi > 200
                ? 'High ambient particulate load detected. Recommend high-efficiency indoor filtration and mandatory N95 protection outdoors.'
                : station.aqi > 100
                ? 'Air quality is moderate. Sensitive groups should minimize prolonged high-intensity outdoor activities during peak hours.'
                : 'Ambient particulate levels are within satisfactory margins. Natural ventilation is safe for open air circulation.'}
            </Text>
          </View>

          {/* 3. Calibrated Zoom Spectrum Continuous Gradient Bar */}
          <View
            style={[
              styles.spectrumCard,
              isAdaptiveMode && activeRange?.isZoomed && styles.spectrumCardAdaptive,
            ]}
          >
            <View style={styles.spectrumHeader}>
              <Text style={styles.spectrumTitle}>{pollutantUpper} SPECTRUM</Text>
              <View
                style={[
                  styles.spectrumBadgeContainer,
                  isAdaptiveMode && activeRange?.isZoomed && styles.spectrumBadgeContainerAdaptive,
                ]}
              >
                <Text
                  style={[
                    styles.spectrumBadge,
                    isAdaptiveMode && activeRange?.isZoomed && styles.spectrumBadgeAdaptive,
                  ]}
                >
                  {isAdaptiveMode && activeRange?.isZoomed
                    ? `Zoom ${activeRange.zoom}x (${activeRange.min} → ${activeRange.max} ${meta.unit})`
                    : `NAAQS Standard (0 → ${meta.maxScale} ${meta.unit})`}
                </Text>
              </View>
            </View>

            {/* Gradient Bar */}
            <View style={styles.gradientBar} />

            {/* Scale Ticks */}
            <View style={styles.scaleTicksRow}>
              <Text style={[styles.scaleTick, { color: '#10b981' }]}>
                {isAdaptiveMode && activeRange?.isZoomed ? activeRange.min : '0 Good'}
              </Text>
              <Text style={[styles.scaleTick, { color: '#a3e635' }]}>
                {isAdaptiveMode && activeRange?.isZoomed
                  ? Math.round(activeRange.min + (activeRange.max - activeRange.min) * 0.25)
                  : Math.round(meta.maxScale * 0.25)}
              </Text>
              <Text style={[styles.scaleTick, { color: '#eab308' }]}>
                {isAdaptiveMode && activeRange?.isZoomed
                  ? Math.round(activeRange.min + (activeRange.max - activeRange.min) * 0.5)
                  : Math.round(meta.maxScale * 0.5)}
              </Text>
              <Text style={[styles.scaleTick, { color: '#fb923c' }]}>
                {isAdaptiveMode && activeRange?.isZoomed
                  ? Math.round(activeRange.min + (activeRange.max - activeRange.min) * 0.75)
                  : Math.round(meta.maxScale * 0.75)}
              </Text>
              <Text style={[styles.scaleTick, { color: '#f87171' }]}>
                {isAdaptiveMode && activeRange?.isZoomed ? activeRange.max : `${meta.maxScale}+`}
              </Text>
            </View>
          </View>

          {/* 4. Action Command Tiles */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onOpenShield}
              style={[styles.actionBtn, styles.actionBtnShield]}
            >
              <Ionicons name="shield-checkmark" size={14} color="#38bdf8" />
              <Text style={styles.actionBtnText}>AUTONOMOUS SHIELD</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onOpenPetition}
              style={[styles.actionBtn, styles.actionBtnPetition]}
            >
              <Ionicons name="document-text" size={14} color="#a855f7" />
              <Text style={styles.actionBtnText}>CIVIC PETITION</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 70, // Sits directly on top of the fixed bottom navigation dock
    left: 0,
    right: 0,
    backgroundColor: 'rgba(9, 15, 30, 0.96)',
    borderTopWidth: 1,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    zIndex: 60,
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: 3,
  },
  handleBar: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(148, 163, 184, 0.4)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  stationInfoGroup: {
    flex: 1,
    paddingRight: 8,
  },
  stationBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  nodeTypeLabel: {
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#64748b',
    marginRight: 6,
    letterSpacing: 0.5,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  statusLabel: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  stationName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  stationZone: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 1,
  },
  heroAqiGroup: {
    alignItems: 'center',
    marginRight: 8,
  },
  heroAqiNumber: {
    fontSize: 26,
    fontFamily: 'monospace',
    fontWeight: '900',
    lineHeight: 28,
  },
  heroAqiSubtitle: {
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  toggleChevronBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(28, 41, 62, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedContent: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  metricCard: {
    width: '31.8%',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 7,
    alignItems: 'center',
  },
  metricCardLabel: {
    fontSize: 8,
    fontFamily: 'monospace',
    color: '#64748b',
    fontWeight: '700',
    marginBottom: 2,
  },
  metricCardVal: {
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '800',
  },
  unitText: {
    fontSize: 8,
    color: '#64748b',
    fontWeight: '600',
  },
  advisoryCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    padding: 10,
    marginBottom: 10,
  },
  advisoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  advisoryTitle: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  advisoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  advisoryDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#38bdf8',
    marginRight: 4,
  },
  advisoryPillText: {
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#94a3b8',
  },
  advisoryBody: {
    fontSize: 10,
    color: '#cbd5e1',
    lineHeight: 14,
  },
  spectrumCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 10,
    marginBottom: 10,
  },
  spectrumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  spectrumTitle: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#e2e8f0',
  },
  spectrumCardAdaptive: {
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  spectrumBadgeContainer: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  spectrumBadgeContainerAdaptive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 0.5,
  },
  spectrumBadge: {
    fontSize: 8,
    fontFamily: 'monospace',
    color: '#94a3b8',
    fontWeight: '700',
  },
  spectrumBadgeAdaptive: {
    color: '#34d399',
  },
  gradientBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 4,
    ...(Platform.OS === 'web'
      ? {
          backgroundImage:
            'linear-gradient(90deg, #10b981 0%, #a3e635 25%, #eab308 50%, #f97316 75%, #dc2626 100%)',
        }
      : {}),
  },
  scaleTicksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleTick: {
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnShield: {
    backgroundColor: 'rgba(2, 132, 199, 0.35)',
    borderColor: 'rgba(56, 189, 248, 0.5)',
  },
  actionBtnPetition: {
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    borderColor: 'rgba(168, 85, 247, 0.5)',
  },
  actionBtnText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
});
