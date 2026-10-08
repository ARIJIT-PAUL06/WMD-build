import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import './src/mapTheme.css';
import { theme } from './src/theme';
import MapCanvas, {
  INDIA_REGION_PRESETS,
  getAqiColorMeta,
  calculateDistanceKm,
} from './src/components/MapCanvas';
import MapControlDeck from './src/components/MapControlDeck';
import BottomDialogBox from './src/components/BottomDialogBox';
import BottomNavBar from './src/components/BottomNavBar';
import indiaStations from './src/data/indiaStations.json';

const initialStations = indiaStations.map(s => ({
  ...s,
  source: s.source || 'Offline National Baseline Registry'
}));

export default function App() {
  const [activeTab, setActiveTab] = useState('map');
  const [stations, setStations] = useState(initialStations);
  const [selectedStation, setSelectedStation] = useState(initialStations[0]);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);

  // Map Filter & Layer States
  const [activePollutant, setActivePollutant] = useState('aqi');
  const [activePreset, setActivePreset] = useState(INDIA_REGION_PRESETS[0]);
  const [showHeatmapLayer, setShowHeatmapLayer] = useState(true);
  const [isAdaptiveMode, setIsAdaptiveMode] = useState(true);
  const [activeRange, setActiveRange] = useState(null);
  const [showStateBorders, setShowStateBorders] = useState(true);
  const [showStationPins, setShowStationPins] = useState(false);
  const [is3DBuildings, setIs3DBuildings] = useState(true);
  const [heatIntensity, setHeatIntensity] = useState(0.55);

  // Real GPS State
  const [userLocation, setUserLocation] = useState(null);
  const [isLiveGps, setIsLiveGps] = useState(false);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const watchIdRef = useRef(null);
  const trigger360TourRef = useRef(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Search Results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return stations.filter((s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.zone && s.zone.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.state && s.state.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [searchQuery, stations]);

  const handleSelectStation = useCallback((station) => {
    setSelectedStation(station);
    setSearchQuery('');
  }, []);

  // REAL LIVE GPS IMPLEMENTATION WITH BROWSER/MOBILE GEOLOCATION
  const handleToggleGps = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      alert('Geolocation is not supported on this device/browser.');
      return;
    }

    // If already active, re-center camera on current location
    if (isLiveGps && userLocation?.lat && userLocation?.lon) {
      setUserLocation((prev) => ({
        ...prev,
        shouldCenter: true,
        timestamp: Date.now(),
      }));
      return;
    }

    setIsLoadingLive(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setIsLoadingLive(false);
        setIsLiveGps(true);

        const newLoc = {
          lat: latitude,
          lon: longitude,
          accuracy: Math.round(accuracy),
          isLiveGps: true,
          shouldCenter: true, // Center viewport ONLY upon explicit user GPS activation
          timestamp: Date.now(),
        };
        setUserLocation(newLoc);

        // Find nearest monitoring station based on real coordinates
        let nearest = stations[0];
        let minDist = Infinity;
        stations.forEach((st) => {
          const d = calculateDistanceKm(latitude, longitude, st.lat, st.lon);
          if (d < minDist) {
            minDist = d;
            nearest = st;
          }
        });

        if (nearest) {
          setSelectedStation(nearest);
        }
      },
      (err) => {
        setIsLoadingLive(false);
        console.warn('GPS Geolocation Error:', err);
        alert(
          err.code === 1
            ? 'GPS location permission was denied. Please allow location access in your browser or phone settings.'
            : 'Unable to retrieve GPS satellite coordinates. Please verify device location services.'
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );

    // Continuous watch position in background: NEVER steals user's camera or overwrites their explored station
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserLocation((prev) => ({
          ...prev,
          lat: latitude,
          lon: longitude,
          accuracy: Math.round(accuracy),
          isLiveGps: true,
          shouldCenter: false, // DO NOT pull camera to GPS on background updates
          timestamp: Date.now(),
        }));
      },
      (err) => console.warn('GPS Watch Error:', err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  }, [isLiveGps, userLocation, stations]);

  // Fetch live national station telemetry identical to web endpoint & Open-Meteo
  const fetchLiveNationalStations = useCallback(async () => {
    setIsLoadingLive(true);
    try {
      let endpoint = '/api/india-heatmap';
      if (Platform.OS === 'android') {
        endpoint = 'http://10.0.2.2:3001/api/india-heatmap';
      } else if (typeof window !== 'undefined' && window.location?.hostname) {
        endpoint = `http://${window.location.hostname}:3001/api/india-heatmap`;
      } else {
        endpoint = 'http://localhost:3001/api/india-heatmap';
      }

      let res = null;
      try {
        res = await fetch(endpoint, { signal: AbortSignal.timeout(4000) });
      } catch (e) {
        if (endpoint !== '/api/india-heatmap') {
          try {
            res = await fetch('/api/india-heatmap', { signal: AbortSignal.timeout(3000) });
          } catch (e2) {}
        }
      }

      if (res && res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.stations) && data.stations.length > 0) {
          setStations(data.stations);
          setSelectedStation((prev) => {
            if (!prev) return data.stations[0];
            const updated = data.stations.find((s) => s.id === prev.id || s.name === prev.name);
            return updated || prev;
          });
          setIsLoadingLive(false);
          return;
        }
      }

      // Direct Open-Meteo High-Resolution Subcontinental Batch API fallback
      const lats = indiaStations.map((s) => s.lat).join(',');
      const lons = indiaStations.map((s) => s.lon).join(',');
      const omUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&timezone=auto`;

      const omRes = await fetch(omUrl, { signal: AbortSignal.timeout(8000) });
      if (omRes.ok) {
        const json = await omRes.json();
        const dataList = Array.isArray(json) ? json : [json];
        const liveStations = indiaStations.map((meta, index) => {
          const live = dataList[index]?.current || {};
          const rawPm25 = Number(live.pm2_5) || meta.pm25;
          const rawPm10 = Number(live.pm10) || meta.pm10;
          return {
            ...meta,
            pm25: Math.round(rawPm25 * 10) / 10,
            pm10: Math.round(rawPm10 * 10) / 10,
            no2: Math.round((Number(live.nitrogen_dioxide) || meta.no2 || 24) * 10) / 10,
            so2: Math.round((Number(live.sulphur_dioxide) || meta.so2 || 10) * 10) / 10,
            co: Math.round((Number(live.carbon_monoxide) ? (Number(live.carbon_monoxide) > 20 ? live.carbon_monoxide / 1000 : live.carbon_monoxide) : (meta.co || 0.8)) * 10) / 10,
            o3: Math.round((Number(live.ozone) || meta.o3 || 30) * 10) / 10,
            source: 'Live Open-Meteo Subcontinental Grid',
            updatedAt: live.time || new Date().toISOString(),
          };
        });

        setStations(liveStations);
        setSelectedStation((prev) => {
          if (!prev) return liveStations[0];
          const updated = liveStations.find((s) => s.id === prev.id || s.name === prev.name);
          return updated || prev;
        });
      }
    } catch (err) {
      console.warn('Mobile live national stations fetch warning:', err.message);
    } finally {
      setIsLoadingLive(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveNationalStations();
  }, [fetchLiveNationalStations]);

  const handleRefreshData = useCallback(() => {
    fetchLiveNationalStations();
  }, [fetchLiveNationalStations]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      <View style={styles.container}>
        {/* ============================================================== */}
        {/* PERSISTENT MAP VIEW (NEVER UNMOUNTED - PRESERVES MAPBOX CREDITS)*/}
        {/* ============================================================== */}
        <View
          style={[
            styles.mapContainer,
            activeTab !== 'map' && styles.mapContainerHidden,
          ]}
        >
          {/* 1. Underlying Mapbox Canvas with Atmospheric Fade & Single Initialization */}
          <MapCanvas
            stations={stations}
            selectedStation={selectedStation}
            onSelectStation={handleSelectStation}
            activePollutant={activePollutant}
            showHeatmapLayer={showHeatmapLayer}
            showStateBorders={showStateBorders}
            showStationPins={showStationPins}
            is3DBuildings={is3DBuildings}
            isAdaptiveMode={isAdaptiveMode}
            heatIntensity={heatIntensity}
            activePreset={activePreset}
            userLocation={userLocation}
            trigger360TourRef={trigger360TourRef}
            onRangeChange={setActiveRange}
          />

          {/* 2. Floating Command Deck, Glide Search & Mobile Layers Modal */}
          <MapControlDeck
            activePollutant={activePollutant}
            setActivePollutant={setActivePollutant}
            activePreset={activePreset}
            setActivePreset={setActivePreset}
            showHeatmapLayer={showHeatmapLayer}
            setShowHeatmapLayer={setShowHeatmapLayer}
            isAdaptiveMode={isAdaptiveMode}
            setIsAdaptiveMode={setIsAdaptiveMode}
            showStateBorders={showStateBorders}
            setShowStateBorders={setShowStateBorders}
            showStationPins={showStationPins}
            setShowStationPins={setShowStationPins}
            is3DBuildings={is3DBuildings}
            setIs3DBuildings={setIs3DBuildings}
            heatIntensity={heatIntensity}
            setHeatIntensity={setHeatIntensity}
            isLiveGps={isLiveGps}
            onToggleGps={handleToggleGps}
            onRefreshData={handleRefreshData}
            isLoadingLive={isLoadingLive}
            onOpenHud={() => setIsDrawerExpanded(!isDrawerExpanded)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchResults={searchResults}
            onSelectSearchResult={handleSelectStation}
            onPlay360Tour={() => trigger360TourRef.current?.()}
            isBottomExpanded={isDrawerExpanded}
          />

          {/* 3. Sliding Bottom Dialog Box (Station Deep Dive & Zoom Spectrum) */}
          <BottomDialogBox
            station={selectedStation}
            isExpanded={isDrawerExpanded}
            onToggleExpand={() => setIsDrawerExpanded(!isDrawerExpanded)}
            onOpenPetition={() => alert('Civic Petition Filed under Section 10 Delhi Air Act')}
            onOpenShield={() => alert('Autonomous Shield Test Bench Activated')}
            activeRange={activeRange}
            isAdaptiveMode={isAdaptiveMode}
            activePollutant={activePollutant}
          />
        </View>

        {/* ============================================================== */}
        {/* TAB 2: MONITORING STATIONS LIST VIEW                           */}
        {/* ============================================================== */}
        {activeTab === 'stations' && (
          <ScrollView
            style={styles.tabContentScroll}
            contentContainerStyle={styles.stationsScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tabHeader}>
              <View style={styles.tabHeaderLeft}>
                <Ionicons name="radio" size={16} color="#00f0ff" />
                <Text style={styles.tabHeaderTitle}>NATIONWIDE GROUND MONITOR MATRIX</Text>
              </View>
              <Text style={styles.tabHeaderCount}>{stations.length} ACTIVE CAAQMS</Text>
            </View>

            {stations.map((station) => {
              const meta = getAqiColorMeta(station.aqi);
              const isSelected = selectedStation?.id === station.id;

              return (
                <TouchableOpacity
                  key={station.id}
                  activeOpacity={0.75}
                  onPress={() => {
                    setSelectedStation(station);
                    setActiveTab('map');
                  }}
                  style={[
                    styles.stationCard,
                    isSelected && styles.stationCardSelected
                  ]}
                >
                  <View style={styles.stationCardLeft}>
                    <View style={[styles.stationCardBadge, { borderColor: meta.hex }]}>
                      <Text style={[styles.stationCardAqi, { color: meta.hex }]}>
                        {station.aqi}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.stationCardName}>{station.name}</Text>
                      <View style={styles.cardMiniStats}>
                        <Text style={styles.cardMiniLabel}>PM2.5: <Text style={styles.cardMiniVal}>{station.pm25}</Text></Text>
                        <Text style={styles.cardMiniDot}>·</Text>
                        <Text style={styles.cardMiniLabel}>PM10: <Text style={styles.cardMiniVal}>{station.pm10}</Text></Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.stationCardRight}>
                    <View style={[styles.statusPill, { backgroundColor: meta.badgeBg, borderColor: meta.hex }]}>
                      <Text style={[styles.statusPillText, { color: meta.textHex }]}>
                        {meta.label}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#64748b" style={{ marginTop: 6 }} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ============================================================== */}
        {/* TAB 3: INSTITUTIONAL COMPLIANCE PROFILE                        */}
        {/* ============================================================== */}
        {activeTab === 'profile' && (
          <ScrollView
            style={styles.tabContentScroll}
            contentContainerStyle={styles.profileScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tabHeader}>
              <View style={styles.tabHeaderLeft}>
                <Ionicons name="shield-checkmark" size={16} color="#00f0ff" />
                <Text style={styles.tabHeaderTitle}>COMPLIANCE & GOVERNANCE</Text>
              </View>
            </View>

            {/* Profile Card */}
            <View style={styles.profileCard}>
              <View style={styles.profileIconCircle}>
                <Ionicons name="business" size={24} color="#00f0ff" />
              </View>
              <Text style={styles.profileName}>DELHI RESISTANCE GRID</Text>
              <Text style={styles.profileSub}>CIVIL DEFENSE · PROTOCOL 2026</Text>

              <View style={styles.profileStatusGrid}>
                <View style={styles.profileStatusItem}>
                  <Ionicons name="flash-outline" size={18} color="#eab308" />
                  <Text style={styles.profileStatusLabel}>GRAP STATUS</Text>
                  <Text style={[styles.profileStatusValue, { color: '#eab308' }]}>STAGE IV</Text>
                </View>

                <View style={styles.profileStatusDivider} />

                <View style={styles.profileStatusItem}>
                  <Ionicons name="document-text-outline" size={18} color="#38bdf8" />
                  <Text style={styles.profileStatusLabel}>SEC 10 PETITION</Text>
                  <Text style={[styles.profileStatusValue, { color: '#38bdf8' }]}>FILED</Text>
                </View>

                <View style={styles.profileStatusDivider} />

                <View style={styles.profileStatusItem}>
                  <Ionicons name="pulse-outline" size={18} color="#10b981" />
                  <Text style={styles.profileStatusLabel}>TELEMETRY</Text>
                  <Text style={[styles.profileStatusValue, { color: '#10b981' }]}>ONLINE</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.actionSectionTitle}>
              <Text style={styles.sectionHeading}>INSTITUTIONAL ACTIONS</Text>
            </View>

            <View style={styles.quickActionTile}>
              <View style={[styles.tileIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444' }]}>
                <Ionicons name="alarm" size={20} color="#ef4444" />
              </View>
              <View style={styles.tileInfo}>
                <Text style={styles.tileTitle}>EMERGENCY RECESS DISPATCH</Text>
                <Text style={styles.tileSub}>Notifies 42 member institutions</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#64748b" />
            </View>

            <View style={styles.quickActionTile}>
              <View style={[styles.tileIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: '#00f0ff' }]}>
                <Ionicons name="cloud-download-outline" size={20} color="#00f0ff" />
              </View>
              <View style={styles.tileInfo}>
                <Text style={styles.tileTitle}>EXPORT AFFIDAVIT EVIDENCE</Text>
                <Text style={styles.tileSub}>CPCB verified empirical logs</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#64748b" />
            </View>
          </ScrollView>
        )}

        {/* ============================================================== */}
        {/* FIXED GLASS BOTTOM NAVIGATION DOCK                             */}
        {/* ============================================================== */}
        <BottomNavBar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#040711',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#040711',
  },
  mapContainer: {
    flex: 1,
  },
  mapContainerHidden: {
    position: 'absolute',
    top: -99999,
    left: -99999,
    opacity: 0,
    pointerEvents: 'none',
  },
  tabContentScroll: {
    flex: 1,
    marginTop: 20,
    marginBottom: 72,
  },
  stationsScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  profileScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  tabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  tabHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabHeaderTitle: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#00f0ff',
    marginLeft: 6,
    letterSpacing: 1,
  },
  tabHeaderCount: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  stationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(11, 19, 38, 0.75)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  stationCardSelected: {
    borderColor: '#00f0ff',
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
  },
  stationCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationCardBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: 'rgba(5, 8, 17, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stationCardAqi: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  stationCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  cardMiniStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  cardMiniLabel: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#64748b',
  },
  cardMiniVal: {
    fontWeight: '700',
    color: '#94a3b8',
  },
  cardMiniDot: {
    color: '#64748b',
    marginHorizontal: 5,
  },
  stationCardRight: {
    alignItems: 'flex-end',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  statusPillText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  profileCard: {
    backgroundColor: 'rgba(11, 19, 38, 0.82)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.22)',
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  profileIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#00f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  profileSub: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#64748b',
    marginTop: 2,
    marginBottom: 16,
    letterSpacing: 0.8,
  },
  profileStatusGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(56, 189, 248, 0.15)',
  },
  profileStatusItem: {
    alignItems: 'center',
    flex: 1,
  },
  profileStatusLabel: {
    fontSize: 8,
    fontFamily: 'monospace',
    color: '#64748b',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  profileStatusValue: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  profileStatusDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  actionSectionTitle: {
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionHeading: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1,
  },
  quickActionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 19, 38, 0.75)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  tileIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tileInfo: {
    flex: 1,
  },
  tileTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: 0.3,
  },
  tileSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
});
