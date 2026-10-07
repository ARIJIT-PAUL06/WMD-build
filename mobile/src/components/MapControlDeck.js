import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { INDIA_REGION_PRESETS } from './MapCanvas';

export default function MapControlDeck({
  activePollutant,
  setActivePollutant,
  activePreset,
  setActivePreset,
  showHeatmapLayer,
  setShowHeatmapLayer,
  isAdaptiveMode,
  setIsAdaptiveMode,
  showStateBorders,
  setShowStateBorders,
  showStationPins,
  setShowStationPins,
  is3DBuildings,
  setIs3DBuildings,
  heatIntensity,
  setHeatIntensity,
  isLiveGps,
  onToggleGps,
  onRefreshData,
  isLoadingLive,
  onOpenHud,
  searchQuery,
  onSearchChange,
  searchResults,
  onSelectSearchResult,
  onPlay360Tour,
  isBottomExpanded = false,
}) {
  const [isGlideOpen, setIsGlideOpen] = useState(false);
  const [isControlsDrawerOpen, setIsControlsDrawerOpen] = useState(false);

  const pollutants = [
    { id: 'aqi', label: 'AQI' },
    { id: 'pm25', label: 'PM 2.5' },
    { id: 'pm10', label: 'PM 10' },
    { id: 'no2', label: 'NO2' },
    { id: 'so2', label: 'SO2' },
    { id: 'co', label: 'CO' },
    { id: 'o3', label: 'O3' },
  ];

  const bottomOffset = isBottomExpanded ? 460 : 156;

  return (
    <>
      {/* ============================================================== */}
      {/* 1. TOP COMMAND DECK (HEADER BAR)                                */}
      {/* ============================================================== */}
      <View style={styles.topDeckWrapper}>
        <View style={styles.topDeckContainer}>
          {/* Brand & Live Pulse Dot */}
          <View style={styles.brandGroup}>
            <View style={styles.pulseDot} />
            <Text style={styles.brandTitle}>INDIA AQI</Text>
          </View>

          {/* Action Buttons: GPS, Refresh, Glide & Menu */}
          <View style={styles.topActionsGroup}>
            {/* Live GPS Lock */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onToggleGps}
              title={isLiveGps ? 'GPS Centered' : 'Lock Live GPS'}
              style={[styles.cuboidBtnCompact, isLiveGps && styles.cuboidBtnSuccess]}
            >
              <Ionicons
                name={isLoadingLive ? "sync-outline" : "navigate"}
                size={13}
                color={isLiveGps ? '#10b981' : '#38bdf8'}
              />
            </TouchableOpacity>

            {/* Refresh Data */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onRefreshData}
              disabled={isLoadingLive}
              style={styles.cuboidBtnCompact}
            >
              <Ionicons
                name="refresh"
                size={13}
                color="#38bdf8"
              />
            </TouchableOpacity>

            {/* Adaptive Contrast Mode Toggle */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setIsAdaptiveMode(!isAdaptiveMode)}
              style={[styles.cuboidBtnCompact, isAdaptiveMode && styles.cuboidBtnSuccess]}
            >
              <Ionicons
                name="sparkles"
                size={13}
                color={isAdaptiveMode ? '#10b981' : '#94a3b8'}
              />
              <Text style={[styles.cuboidBtnText, isAdaptiveMode && { color: '#10b981' }]}>
                Adaptive
              </Text>
            </TouchableOpacity>

            {/* Glide Toggle */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setIsGlideOpen(!isGlideOpen)}
              style={[styles.cuboidBtnCompact, isGlideOpen && styles.cuboidBtnActive]}
            >
              <Ionicons
                name="search"
                size={13}
                color={isGlideOpen ? '#38bdf8' : '#94a3b8'}
              />
              <Ionicons
                name={isGlideOpen ? 'chevron-up' : 'chevron-down'}
                size={11}
                color={isGlideOpen ? '#38bdf8' : '#94a3b8'}
              />
            </TouchableOpacity>

            {/* Mobile Controls Drawer Button */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setIsControlsDrawerOpen(true)}
              style={styles.controlsPillBtn}
            >
              <Ionicons name="options-outline" size={13} color="#38bdf8" />
              <Text style={styles.controlsBtnText}>Controls</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tier 2: Glide Shortcuts & Search Bar Dropdown */}
        {isGlideOpen && (
          <View style={styles.glideDropdown}>
            {/* Region Presets Carousel */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.glidePresetsRow}
            >
              <Text style={styles.glideLabel}>GLIDE:</Text>
              {INDIA_REGION_PRESETS.map((preset) => {
                const isActive = activePreset?.id === preset.id;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    activeOpacity={0.75}
                    onPress={() => {
                      setActivePreset(preset);
                      setIsGlideOpen(false);
                    }}
                    style={[styles.glidePill, isActive && styles.glidePillActive]}
                  >
                    <Text style={[styles.glidePillText, isActive && styles.glidePillTextActive]}>
                      {preset.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Autocomplete Search Input */}
            <View style={styles.searchBarWrapper}>
              <Ionicons name="search" size={13} color="#94a3b8" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search station or sector across India..."
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={onSearchChange}
              />
              {Boolean(searchQuery) && (
                <TouchableOpacity onPress={() => onSearchChange('')}>
                  <Ionicons name="close-circle" size={14} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Autocomplete Results Dropdown */}
            {Boolean(searchResults && searchResults.length > 0) && (
              <View style={styles.autocompleteList}>
                {searchResults.slice(0, 5).map((station) => (
                  <TouchableOpacity
                    key={station.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      onSelectSearchResult(station);
                      setIsGlideOpen(false);
                    }}
                    style={styles.autocompleteItem}
                  >
                    <Ionicons name="location" size={13} color="#38bdf8" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.autocompleteName}>{station.name}</Text>
                      <Text style={styles.autocompleteZone}>{station.zone || station.state}</Text>
                    </View>
                    <Text style={styles.autocompleteAqi}>{station.aqi}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {/* ============================================================== */}
      {/* 2. MOBILE FLOATING BOTTOM BAR: POLLUTANT PILLS (FOLLOWS DRAWER) */}
      {/* ============================================================== */}
      <View style={[styles.pollutantBarWrapper, { bottom: bottomOffset }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pollutantPillsRow}
          style={styles.pollutantScroll}
        >
          {pollutants.map((p) => {
            const isActive = activePollutant === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.75}
                onPress={() => setActivePollutant(p.id)}
                style={[styles.pollutantBtn, isActive && styles.pollutantBtnActive]}
              >
                <Text style={[styles.pollutantText, isActive && styles.pollutantTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ============================================================== */}
      {/* 3. MOBILE CONTROLS & LAYERS DRAWER (MODAL)                     */}
      {/* ============================================================== */}
      {isControlsDrawerOpen && (
        <View style={styles.modalBackdrop}>
          <View style={styles.drawerCard}>
            {/* Header */}
            <View style={styles.drawerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="options" size={16} color="#38bdf8" style={{ marginRight: 6 }} />
                <Text style={styles.drawerTitle}>MAP CONTROLS & LAYERS</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsControlsDrawerOpen(false)}
                style={styles.drawerCloseBtn}
              >
                <Ionicons name="close" size={16} color="#cbd5e1" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView style={styles.drawerContent} showsVerticalScrollIndicator={false}>
              {/* Location Mode */}
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.sectionTitle}>LOCATION MODE</Text>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    onToggleGps();
                    setIsControlsDrawerOpen(false);
                  }}
                  style={[styles.layerTile, styles.layerTileSpan, isLiveGps && styles.layerTileSuccess]}
                >
                  <Ionicons name="navigate" size={16} color={isLiveGps ? '#10b981' : '#38bdf8'} />
                  <Text style={styles.layerTileLabel}>
                    {isLiveGps ? 'GPS Centered (Live Active)' : 'Lock Live GPS Location'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Layer Toggles Grid */}
              <Text style={styles.sectionTitle}>MAP LAYERS</Text>
              <View style={styles.layerGrid}>
                {/* Heatmap Toggle */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setShowHeatmapLayer(!showHeatmapLayer)}
                  style={[styles.layerTile, showHeatmapLayer && styles.layerTileActive]}
                >
                  <Ionicons name="layers" size={16} color={showHeatmapLayer ? '#38bdf8' : '#94a3b8'} />
                  <Text style={styles.layerTileLabel}>Heatmap: {showHeatmapLayer ? 'ON' : 'OFF'}</Text>
                </TouchableOpacity>

                {/* Adaptive Toggle */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setIsAdaptiveMode(!isAdaptiveMode)}
                  style={[styles.layerTile, isAdaptiveMode && styles.layerTileSuccess]}
                >
                  <Ionicons name="sparkles" size={16} color={isAdaptiveMode ? '#34d399' : '#94a3b8'} />
                  <Text style={styles.layerTileLabel}>Adaptive: {isAdaptiveMode ? 'ON' : 'OFF'}</Text>
                </TouchableOpacity>

                {/* State Borders Toggle */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setShowStateBorders(!showStateBorders)}
                  style={[styles.layerTile, showStateBorders && styles.layerTileActive]}
                >
                  <Ionicons name="map" size={16} color={showStateBorders ? '#38bdf8' : '#94a3b8'} />
                  <Text style={styles.layerTileLabel}>State Borders</Text>
                </TouchableOpacity>

                {/* Station Pins Toggle */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setShowStationPins(!showStationPins)}
                  style={[styles.layerTile, showStationPins && styles.layerTileActive]}
                >
                  <Ionicons name="pin" size={16} color={showStationPins ? '#38bdf8' : '#94a3b8'} />
                  <Text style={styles.layerTileLabel}>108 Station Pins</Text>
                </TouchableOpacity>

                {/* 3D City Toggle */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setIs3DBuildings(!is3DBuildings)}
                  style={[styles.layerTile, is3DBuildings && styles.layerTileActive]}
                >
                  <Ionicons name="business" size={16} color={is3DBuildings ? '#38bdf8' : '#94a3b8'} />
                  <Text style={styles.layerTileLabel}>3D Buildings</Text>
                </TouchableOpacity>

                {/* 360° Cinematic Tour */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    setIsControlsDrawerOpen(false);
                    if (onPlay360Tour) onPlay360Tour();
                  }}
                  style={[styles.layerTile, styles.layerTileActive]}
                >
                  <Ionicons name="videocam" size={16} color="#38bdf8" />
                  <Text style={styles.layerTileLabel}>360° Cinematic Tour</Text>
                </TouchableOpacity>
              </View>

              {/* Heat Layer Opacity Presets */}
              <View style={styles.opacitySection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={styles.sectionTitle}>HEAT OPACITY</Text>
                  <Text style={styles.opacityValText}>{Math.round(heatIntensity * 100)}%</Text>
                </View>

                <View style={styles.opacityPresetsRow}>
                  {[
                    { label: '35% Subtle', val: 0.35 },
                    { label: '55% Balanced', val: 0.55 },
                    { label: '75% Vivid', val: 0.75 },
                  ].map((p) => {
                    const isSelected = Math.abs(heatIntensity - p.val) < 0.05;
                    return (
                      <TouchableOpacity
                        key={p.val}
                        activeOpacity={0.75}
                        onPress={() => setHeatIntensity(p.val)}
                        style={[styles.presetBtn, isSelected && styles.presetBtnActive]}
                      >
                        <Text style={[styles.presetBtnText, isSelected && styles.presetBtnTextActive]}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  topDeckWrapper: {
    position: 'absolute',
    top: 14,
    left: 12,
    right: 12,
    zIndex: 35,
  },
  topDeckContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10, 16, 31, 0.75)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#38bdf8',
    marginRight: 6,
    shadowColor: '#38bdf8',
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  brandTitle: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  topActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cuboidBtnCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(28, 41, 62, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  cuboidBtnActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(2, 132, 199, 0.35)',
  },
  cuboidBtnSuccess: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
  },
  cuboidBtnText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#94a3b8',
  },
  controlsPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(2, 132, 199, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.5)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  controlsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  glideDropdown: {
    marginTop: 6,
    backgroundColor: 'rgba(10, 16, 31, 0.92)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.28)',
    padding: 8,
  },
  glidePresetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 6,
  },
  glideLabel: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#38bdf8',
    marginRight: 4,
  },
  glidePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  glidePillActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    borderColor: '#38bdf8',
  },
  glidePillText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#94a3b8',
  },
  glidePillTextActive: {
    color: '#38bdf8',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.7)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 10,
    height: 34,
    marginTop: 2,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 11,
    paddingVertical: 0,
  },
  autocompleteList: {
    marginTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 4,
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  autocompleteName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  autocompleteZone: {
    fontSize: 9,
    color: '#94a3b8',
  },
  autocompleteAqi: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#38bdf8',
  },
  pollutantBarWrapper: {
    position: 'absolute',
    left: 12,
    right: 56, // Leave room on the right so map zoom/compass controls are never obstructed
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 40,
    ...(Platform.OS === 'web' ? { transition: 'bottom 0.3s cubic-bezier(0.16, 1, 0.3, 1)' } : {}),
  },
  pollutantScroll: {
    flex: 1,
    backgroundColor: 'rgba(10, 16, 31, 0.75)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    padding: 3,
  },
  pollutantPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pollutantBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(28, 41, 62, 0.65)',
    borderWidth: 0.5,
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  pollutantBtnActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.5)',
    borderColor: '#38bdf8',
  },
  pollutantText: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#94a3b8',
  },
  pollutantTextActive: {
    color: '#38bdf8',
  },
  hudLaunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.5)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hudLaunchText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#ffffff',
  },
  modalBackdrop: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(3, 7, 18, 0.75)',
    zIndex: 90,
    justifyContent: 'flex-end',
  },
  drawerCard: {
    backgroundColor: 'rgba(10, 16, 31, 0.95)',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    maxHeight: '75%',
    paddingBottom: 24,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  drawerTitle: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  drawerCloseBtn: {
    padding: 4,
  },
  drawerContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#38bdf8',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  layerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  layerTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '48%',
    backgroundColor: 'rgba(28, 41, 62, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  layerTileSpan: {
    width: '100%',
  },
  layerTileActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.35)',
    borderColor: '#38bdf8',
  },
  layerTileSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: '#10b981',
  },
  layerTileLabel: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#f8fafc',
  },
  opacitySection: {
    marginTop: 4,
    marginBottom: 16,
  },
  opacityValText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#38bdf8',
  },
  opacityPresetsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  presetBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    borderColor: '#38bdf8',
  },
  presetBtnText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#94a3b8',
  },
  presetBtnTextActive: {
    color: '#38bdf8',
  },
});
