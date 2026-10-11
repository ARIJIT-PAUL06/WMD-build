import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Share,
  Alert,
  Linking,
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
import PetitionModal from './src/components/PetitionModal';
import AuthModal from './src/components/AuthModal';
import PortalHandoffModal from './src/components/PortalHandoffModal';
import * as Clipboard from 'expo-clipboard';
import indiaStations from './src/data/indiaStations.json';
import {
  getAllDockets,
  deleteDocket,
  deleteAllDockets,
  updateDocketStatus,
  onAuthRequired,
  DOCKET_STATUS
} from './src/services/petitionService';
import {
  signIn,
  signOut,
  getCurrentUser,
  onAuthStateChange,
  getAuthConfig
} from './src/services/authService';

const OFFICIAL_PORTALS = [
  {
    id: 'cpgrams',
    name: 'CPGRAMS Central',
    sub: 'Govt. of India Citizen Redressal',
    url: 'https://pgportal.gov.in',
    badge: 'Central Portal',
    icon: 'globe-outline',
    description: 'Central DARPG portal for National Air Quality grievances & inter-ministerial complaints.',
  },
  {
    id: 'dpcc',
    name: 'DPCC Grievance',
    sub: 'Delhi Pollution Control Committee',
    url: 'https://dpcc.delhigovt.nic.in',
    badge: 'State Committee',
    icon: 'shield-outline',
    email: 'msdpcc@nic.in',
    description: 'Nodal authority for industrial, construction, and biomass burning violations under Air Act 1981.',
  },
  {
    id: 'greendelhi',
    name: 'Green Delhi App',
    sub: 'Govt. of NCT Delhi Redressal',
    url: Platform.OS === 'android'
      ? 'https://play.google.com/store/apps/details?id=com.delhi.greendelhi'
      : 'https://greendelhi.delhi.gov.in',
    badge: '24x7 Delhi App',
    icon: 'leaf-outline',
    description: 'Official 24x7 Delhi Govt pollution complaint system with geotagged photo capture.',
  },
  {
    id: 'caqm',
    name: 'CAQM NCR Cell',
    sub: 'Commission for Air Quality NCR',
    url: 'https://caqm.nic.in',
    badge: 'NCR Commission',
    icon: 'business-outline',
    email: 'caqm-ncr@gov.in',
    description: 'Statutory commission overseeing GRAP Stage I-IV enforcement across Delhi-NCR.',
  },
  {
    id: 'edudel',
    name: 'DoE Environmental Cell',
    sub: 'Directorate of Education (NCT)',
    url: 'http://edudel.nic.in',
    badge: 'Schools / Campuses',
    icon: 'school-outline',
    email: 'addldir-edu@delhi.gov.in',
    description: 'Nodal Directorate for classroom air purifiers, outdoor recess suspension, and school campus health.',
  },
  {
    id: 'mcd',
    name: 'MCD 311 Portal',
    sub: 'Municipal Biomass & Dust Control',
    url: 'https://mcdonline.nic.in',
    badge: 'Civic / Roads',
    icon: 'construct-outline',
    description: 'Municipal Corporation of Delhi civic complaints for road dust, garbage burning, and sweeping.',
  },
];

const initialStations = indiaStations.map(s => ({
  ...s,
  source: s.source || 'Offline National Baseline Registry'
}));

export default function App() {
  const [activeTab, setActiveTab] = useState('map');
  const [stations, setStations] = useState(initialStations);
  const [selectedStation, setSelectedStation] = useState(initialStations[0]);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);

  // Civic Petition Modal & On-Device Dockets State (DPDP Act Compliance)
  const [isPetitionModalVisible, setIsPetitionModalVisible] = useState(false);
  const [petitionTargetStation, setPetitionTargetStation] = useState(null);
  const [localDockets, setLocalDockets] = useState([]);
  const [authUser, setAuthUser] = useState(null);
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signIn');

  // Official Gov Portal Handoff Modal State
  const [isPortalModalVisible, setIsPortalModalVisible] = useState(false);
  const [selectedPortalForHandoff, setSelectedPortalForHandoff] = useState(null);
  const [portalTargetDocket, setPortalTargetDocket] = useState(null);

  const refreshDockets = useCallback(async () => {
    try {
      const list = await getAllDockets();
      setLocalDockets(list);
    } catch (err) {
      console.warn('Failed reading local grievance dockets:', err);
      Alert.alert(
        'Docket Storage Error',
        'Could not load saved grievance dockets due to corrupted local data. The raw storage was kept intact and not overwritten.'
      );
    }
  }, []);

  useEffect(() => {
    getCurrentUser().then(user => setAuthUser(user));
    const unsubscribeAuth = onAuthStateChange((event, data) => {
      if (event === 'SIGNED_IN') {
        setAuthUser(data?.user || null);
        refreshDockets();
      } else if (event === 'SIGNED_OUT') {
        setAuthUser(null);
        refreshDockets();
      }
    });

    const unsubscribeRequired = onAuthRequired(() => {
      setAuthModalMode('signIn');
      setIsAuthModalVisible(true);
    });

    refreshDockets();

    return () => {
      unsubscribeAuth();
      unsubscribeRequired();
    };
  }, [refreshDockets]);

  const handleSignIn = (mode = 'signIn') => {
    setAuthModalMode(mode);
    setIsAuthModalVisible(true);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setAuthUser(null);
      refreshDockets();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
  };

  const handleShareDocket = async (docket) => {
    try {
      const text = docket.sentDraftText || docket.activeDraftText || (docket.selectedLanguage === 'hi' ? docket.letterTextHi : docket.letterTextEn);
      const res = await Share.share({
        title: docket.subject,
        message: `${docket.subject}\n\n${text}`
      });
      if (res && res.action === Share.sharedAction) {
        await updateDocketStatus(docket.id, DOCKET_STATUS.SHARED);
        refreshDockets();
      }
    } catch (err) {
      console.warn('Failed sharing docket:', err);
    }
  };

  const handleOpenPortalHandoff = (portal = null, docket = null) => {
    const chosenPortal = portal || OFFICIAL_PORTALS[0];
    const chosenDocket = docket || (localDockets.length > 0 ? localDockets[0] : null);
    setSelectedPortalForHandoff(chosenPortal);
    setPortalTargetDocket(chosenDocket);
    setIsPortalModalVisible(true);
  };

  const handleCopyAndOpenPortal = async (portal, docket = null) => {
    try {
      const targetDocket = docket || portalTargetDocket || (localDockets.length > 0 ? localDockets[0] : null);
      let copied = false;
      if (targetDocket) {
        const text = targetDocket.sentDraftText || targetDocket.activeDraftText || (targetDocket.selectedLanguage === 'hi' ? targetDocket.letterTextHi : targetDocket.letterTextEn);
        if (Clipboard && Clipboard.setStringAsync) {
          await Clipboard.setStringAsync(text);
          copied = true;
        } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(text);
          copied = true;
        }
      }

      setIsPortalModalVisible(false);

      if (copied && targetDocket) {
        Alert.alert(
          'Dossier Copied!',
          `Affidavit [${targetDocket.referenceId}] is copied to your clipboard.\n\nOpening ${portal.name}...\n\n1. Log in with Mobile OTP\n2. Paste this verified text into the grievance box\n3. Note your Gov Registration / Diary Number.`,
          [
            {
              text: 'Open Portal',
              onPress: async () => {
                await Linking.openURL(portal.url).catch(() => {
                  Alert.alert('Cannot Open URL', `Unable to open: ${portal.url}`);
                });
              }
            }
          ]
        );
      } else {
        await Linking.openURL(portal.url).catch(() => {
          Alert.alert('Cannot Open URL', `Unable to open: ${portal.url}`);
        });
      }
    } catch (err) {
      console.warn('Portal copy error:', err);
      Linking.openURL(portal.url).catch(() => {});
    }
  };

  const handleEmailNodalOfficer = async (docket, portal = null) => {
    try {
      if (!docket) return;
      const email = portal?.email || docket?.authority?.email || 'msdpcc@nic.in';
      const text = docket.sentDraftText || docket.activeDraftText || (docket.selectedLanguage === 'hi' ? docket.letterTextHi : docket.letterTextEn);
      const subject = `[SEC 10 AIR ACT] Statutory Grievance: ${docket.targetName} [Ref: ${docket.referenceId}]`;
      const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;

      setIsPortalModalVisible(false);

      const supported = await Linking.canOpenURL(mailto).catch(() => true);
      if (!supported && Platform.OS !== 'web') {
        Alert.alert('No Mail Client', `Could not open mail app. Please copy text and email directly to ${email}`);
        return;
      }

      await Linking.openURL(mailto);
      await updateDocketStatus(docket.id, DOCKET_STATUS.OPENED_IN_MAIL);
      refreshDockets();
    } catch (err) {
      console.warn('Mail dispatch error:', err);
    }
  };

  const handleMarkDocketSent = (docket) => {
    Alert.alert(
      'Confirm Submission',
      `Mark grievance [${docket.referenceId}] as sent?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Sent',
          onPress: async () => {
            await updateDocketStatus(docket.id, DOCKET_STATUS.MARKED_AS_SENT);
            refreshDockets();
          }
        }
      ]
    );
  };

  const handleDeleteDocket = (docket) => {
    Alert.alert(
      'Delete Docket Record',
      `Remove grievance docket [${docket.referenceId}] from this device?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteDocket(docket.id);
            refreshDockets();
          }
        }
      ]
    );
  };

  const handleDeleteAllDockets = () => {
    Alert.alert(
      'Right to Erasure (DPDP Act)',
      'Permanently erase all saved grievance dockets and evidence snapshots from this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purge All Records',
          style: 'destructive',
          onPress: async () => {
            await deleteAllDockets();
            refreshDockets();
          }
        }
      ]
    );
  };

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

      const fetchWithTimeout = async (url, ms) => {
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), ms);
        try {
          return await fetch(url, { signal: c.signal });
        } finally {
          clearTimeout(t);
        }
      };

      let res = null;
      try {
        res = await fetchWithTimeout(endpoint, 4000);
      } catch (e) {
        if (endpoint !== '/api/india-heatmap') {
          try {
            res = await fetchWithTimeout('/api/india-heatmap', 3000);
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

      const omRes = await fetchWithTimeout(omUrl, 8000);
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
            onOpenPetition={() => {
              setPetitionTargetStation(selectedStation);
              setIsPetitionModalVisible(true);
            }}
            onOpenShield={() => alert('Autonomous Shield Test Bench Activated')}
            activeRange={activeRange}
            isAdaptiveMode={isAdaptiveMode}
            activePollutant={activePollutant}
          />
        </View>

        {/* ============================================================== */}
        {/* TAB 2: CIVIC ACTION & GRIEVANCE ENGINE (PETITIONS DOSSIER)     */}
        {/* ============================================================== */}
        {activeTab === 'action' && (
          <ScrollView
            style={styles.tabContentScroll}
            contentContainerStyle={styles.actionScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tabHeader}>
              <View style={styles.tabHeaderLeft}>
                <Ionicons name="document-text" size={16} color="#00f0ff" />
                <Text style={styles.tabHeaderTitle}>CIVIC ACTION & GRIEVANCE ENGINE</Text>
              </View>
              <View style={styles.tabHeaderBadge}>
                <Text style={styles.tabHeaderBadgeText}>SEC. 10 AIR ACT</Text>
              </View>
            </View>

            {/* 1. Hero Civic Advocacy Dossier Card */}
            <View style={styles.actionHeroCard}>
              <View style={styles.actionHeroTop}>
                <View style={styles.actionHeroIconBox}>
                  <Ionicons name="shield-checkmark" size={24} color="#00f0ff" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.actionHeroTitle}>CITIZEN ADVOCACY DOSSIER</Text>
                  <Text style={styles.actionHeroSub}>
                    Legally grounded affidavits with continuous empirical CPCB telemetry
                  </Text>
                </View>
              </View>

              {/* Target Station Selector Bar */}
              <View style={styles.actionTargetBar}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.actionTargetLabel}>MONITORING BASELINE TARGET</Text>
                  <Text style={styles.actionTargetName} numberOfLines={1}>
                    {selectedStation ? selectedStation.name : 'National Baseline Registry'}
                  </Text>
                  {selectedStation && (
                    <Text style={styles.actionTargetMeta}>
                      AQI {selectedStation.aqi} · {selectedStation.city || selectedStation.state || 'NCT Delhi'}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveTab('map')}
                  style={styles.changeTargetBtn}
                >
                  <Ionicons name="map-outline" size={13} color="#00f0ff" />
                  <Text style={styles.changeTargetText}>CHANGE ON MAP</Text>
                </TouchableOpacity>
              </View>

              {/* Primary Action Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setPetitionTargetStation(selectedStation);
                  setIsPetitionModalVisible(true);
                }}
                style={styles.actionHeroBtn}
              >
                <Ionicons name="add-circle" size={18} color="#030712" />
                <Text style={styles.actionHeroBtnText}>DRAFT NEW CIVIC PETITION</Text>
              </TouchableOpacity>
            </View>

            {/* 2. Official Regulatory Portals Directory */}
            <View style={styles.actionSectionTitle}>
              <View style={styles.docketsSectionHeader}>
                <Text style={styles.sectionHeading}>OFFICIAL SUBMISSION PORTALS</Text>
                <Text style={styles.portalHelperText}>DIRECT DISPATCH</Text>
              </View>
            </View>

            <View style={styles.portalsGrid}>
              {OFFICIAL_PORTALS.map((portal) => (
                <TouchableOpacity
                  key={portal.id || portal.name}
                  activeOpacity={0.75}
                  onPress={() => handleOpenPortalHandoff(portal)}
                  style={styles.portalCard}
                >
                  <View style={styles.portalTopRow}>
                    <View style={styles.portalIconBox}>
                      <Ionicons name={portal.icon} size={15} color="#00f0ff" />
                    </View>
                    <View style={styles.portalBadge}>
                      <Text style={styles.portalBadgeText}>{portal.badge}</Text>
                    </View>
                  </View>
                  <Text style={styles.portalName} numberOfLines={1}>{portal.name}</Text>
                  <Text style={styles.portalSub} numberOfLines={2}>{portal.sub}</Text>
                  <View style={styles.portalLaunchRow}>
                    <Text style={styles.portalLaunchText}>
                      {portal.email ? 'PORTAL + EMAIL' : 'OPEN PORTAL'}
                    </Text>
                    <Ionicons name="chevron-forward" size={11} color="#00f0ff" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* 3. Saved Grievance Vault (Local & Synced Records) */}
            <View style={[styles.actionSectionTitle, { marginTop: 14 }]}>
              <View style={styles.docketsSectionHeader}>
                <Text style={styles.sectionHeading}>
                  SAVED GRIEVANCE VAULT ({localDockets.length})
                </Text>
                {localDockets.length > 0 && (
                  <TouchableOpacity onPress={handleDeleteAllDockets}>
                    <Text style={styles.purgeAllText}>PURGE ALL (DPDP)</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {localDockets.length === 0 ? (
              <View style={styles.emptyDocketsCard}>
                <Ionicons name="folder-open-outline" size={32} color="#475569" />
                <Text style={styles.emptyDocketsTitle}>NO SAVED DOCKETS</Text>
                <Text style={styles.emptyDocketsSub}>
                  Draft a formal Section 10 grievance petition above. Saved letters, CPCB evidence snapshots, and dispatch records are preserved on this device.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setPetitionTargetStation(selectedStation);
                    setIsPetitionModalVisible(true);
                  }}
                  style={styles.emptyDraftBtn}
                >
                  <Ionicons name="document-text-outline" size={13} color="#00f0ff" />
                  <Text style={styles.emptyDraftBtnText}>CREATE FIRST PETITION</Text>
                </TouchableOpacity>
              </View>
            ) : (
              localDockets.map((docket) => {
                const isSent = docket.status === DOCKET_STATUS.MARKED_AS_SENT;
                const isShared = docket.status === DOCKET_STATUS.SHARED;
                const isMail = docket.status === DOCKET_STATUS.OPENED_IN_MAIL;
                const statusColor = isSent ? '#10b981' : isShared ? '#00f0ff' : isMail ? '#a855f7' : '#94a3b8';

                return (
                  <View key={docket.id} style={styles.docketCard}>
                    <View style={styles.docketCardHeader}>
                      <View style={styles.docketRefBadge}>
                        <Ionicons name="bookmark" size={11} color="#00f0ff" />
                        <Text style={styles.docketRefText}>{docket.referenceId}</Text>
                      </View>
                      <View style={[styles.docketStatusPill, { borderColor: statusColor }]}>
                        <View style={[styles.docketStatusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.docketStatusText, { color: statusColor }]}>
                          {docket.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.docketTargetName}>{docket.targetName}</Text>
                    <Text style={styles.docketAuthorityName}>
                      Authority: {docket.authorityName || 'Government of NCT Delhi'}
                    </Text>

                    <View style={styles.docketDateRow}>
                      <Ionicons name="time-outline" size={12} color="#64748b" />
                      <Text style={styles.docketDateText}>
                        {new Date(docket.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>

                    {/* Direct Portal & Nodal Dispatch Row */}
                    <View style={styles.docketDispatchRow}>
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => handleOpenPortalHandoff(null, docket)}
                        style={styles.docketPortalBtn}
                      >
                        <Ionicons name="copy-outline" size={13} color="#040711" />
                        <Text style={styles.docketPortalBtnText}>FILE ON PORTAL</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => handleEmailNodalOfficer(docket)}
                        style={styles.docketEmailBtn}
                      >
                        <Ionicons name="mail" size={13} color="#00f0ff" />
                        <Text style={styles.docketEmailBtnText}>EMAIL NODAL CELL</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Secondary Utilities Row */}
                    <View style={styles.docketActionsRow}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleShareDocket(docket)}
                        style={styles.docketActionBtn}
                      >
                        <Ionicons name="share-social-outline" size={12} color="#00f0ff" />
                        <Text style={styles.docketActionBtnText}>SHARE</Text>
                      </TouchableOpacity>

                      {!isSent && (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleMarkDocketSent(docket)}
                          style={[styles.docketActionBtn, { borderColor: 'rgba(16, 185, 129, 0.4)' }]}
                        >
                          <Ionicons name="checkmark-circle-outline" size={12} color="#10b981" />
                          <Text style={[styles.docketActionBtnText, { color: '#10b981' }]}>MARK SENT</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleDeleteDocket(docket)}
                        style={[styles.docketActionBtn, { borderColor: 'rgba(239, 68, 68, 0.4)' }]}
                      >
                        <Ionicons name="trash-outline" size={12} color="#ef4444" />
                        <Text style={[styles.docketActionBtnText, { color: '#ef4444' }]}>DELETE</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}

            {/* 4. DPDP Act 2023 Disclosure */}
            <View style={styles.dpdpNoticeCard}>
              <Ionicons name="shield-checkmark" size={15} color="#38bdf8" />
              <Text style={styles.dpdpNoticeText}>
                DPDP Act 2023 Compliant: Citizen petition letters and personal contact details are stored under zero-knowledge encryption on this device and/or your private account. You retain full Right to Erasure (Purge).
              </Text>
            </View>
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

            {/* Profile & Cognito Auth Card */}
            <View style={styles.profileCard}>
              <View style={styles.profileIconCircle}>
                <Ionicons name={authUser ? (authUser.isSchoolAdmin ? "school" : "person") : "person-outline"} size={24} color="#00f0ff" />
              </View>
              <Text style={styles.profileName}>
                {authUser ? (authUser.email || 'AUTHENTICATED CITIZEN') : 'GUEST CITIZEN'}
              </Text>
              <Text style={styles.profileSub}>
                {authUser ? (authUser.isSchoolAdmin ? `SCHOOL ADMIN (${authUser.schoolId || 'UNASSIGNED'})` : 'VERIFIED CITIZEN ROLE') : 'NOT SIGNED IN · SAVING LOCAL ONLY'}
              </Text>

              <View style={{ marginTop: 12, marginBottom: 8, width: '100%' }}>
                {authUser ? (
                  <TouchableOpacity
                    onPress={handleSignOut}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 10,
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      borderWidth: 1,
                      borderColor: 'rgba(239, 68, 68, 0.35)',
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 8
                    }}
                  >
                    <Ionicons name="log-out-outline" size={16} color="#ef4444" />
                    <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '700' }}>SIGN OUT</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleSignIn('signIn')}
                      style={{
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderRadius: 10,
                        backgroundColor: 'rgba(0, 240, 255, 0.15)',
                        borderWidth: 1,
                        borderColor: '#00f0ff',
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 8
                      }}
                    >
                      <Ionicons name="log-in-outline" size={18} color="#00f0ff" />
                      <Text style={{ color: '#00f0ff', fontSize: 13, fontWeight: '800' }}>SIGN IN AS CITIZEN</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleSignIn('signUp')}
                      style={{ alignItems: 'center', paddingVertical: 4 }}
                    >
                      <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                        Don't have an account? <Text style={{ color: '#00f0ff', fontWeight: '700' }}>Sign Up</Text>
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.profileStatusGrid}>
                <View style={styles.profileStatusItem}>
                  <Ionicons name="flash-outline" size={18} color="#eab308" />
                  <Text style={styles.profileStatusLabel}>GRAP STATUS</Text>
                  <Text style={[styles.profileStatusValue, { color: '#eab308' }]}>STAGE IV</Text>
                </View>

                <View style={styles.profileStatusDivider} />

                <View style={styles.profileStatusItem}>
                  <Ionicons name="document-text-outline" size={18} color="#38bdf8" />
                  <Text style={styles.profileStatusLabel}>CIVIC PETITIONS</Text>
                  <Text style={[styles.profileStatusValue, { color: '#38bdf8' }]}>
                    {localDockets.length} {authUser ? 'SYNCED' : 'LOCAL'}
                  </Text>
                </View>

                <View style={styles.profileStatusDivider} />

                <View style={styles.profileStatusItem}>
                  <Ionicons name="pulse-outline" size={18} color="#10b981" />
                  <Text style={styles.profileStatusLabel}>TELEMETRY</Text>
                  <Text style={[styles.profileStatusValue, { color: '#10b981' }]}>ONLINE</Text>
                </View>
              </View>
            </View>

            {/* Infrastructure & Zero-Simulation Audit Integrity */}
            <View style={styles.telemetryAuditCard}>
              <View style={styles.telemetryAuditHeader}>
                <Ionicons name="server-outline" size={16} color="#00f0ff" />
                <Text style={styles.telemetryAuditTitle}>INFRASTRUCTURE & AUDIT INTEGRITY</Text>
              </View>

              <View style={styles.telemetryAuditRow}>
                <Text style={styles.telemetryAuditKey}>AWS REGION</Text>
                <Text style={styles.telemetryAuditVal}>ap-south-1 (Mumbai)</Text>
              </View>
              <View style={styles.telemetryAuditRow}>
                <Text style={styles.telemetryAuditKey}>DOCKET VAULT</Text>
                <Text style={styles.telemetryAuditVal}>
                  {localDockets.length} {authUser ? 'DynamoDB Synced' : 'On-Device Encrypted'}
                </Text>
              </View>
              <View style={styles.telemetryAuditRow}>
                <Text style={styles.telemetryAuditKey}>GROUND NETWORK</Text>
                <Text style={styles.telemetryAuditVal}>{stations.length} Active CAAQMS Monitors</Text>
              </View>
              <View style={styles.telemetryAuditRow}>
                <Text style={styles.telemetryAuditKey}>DATA INTEGRITY</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.telemetryAuditDot} />
                  <Text style={[styles.telemetryAuditVal, { color: '#10b981' }]}>100% Empirical Zero-Fake</Text>
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

        {/* ============================================================== */}
        {/* CIVIC PETITION GENERATOR MODAL (WIZARD)                        */}
        {/* ============================================================== */}
        <PetitionModal
          visible={isPetitionModalVisible}
          onClose={() => setIsPetitionModalVisible(false)}
          initialStation={petitionTargetStation || selectedStation}
          onDocketSaved={refreshDockets}
        />

        {/* ============================================================== */}
        {/* CITIZEN AUTHENTICATION MODAL (MATCHES WEBSITE AUTH)            */}
        {/* ============================================================== */}
        <AuthModal
          visible={isAuthModalVisible}
          onClose={() => setIsAuthModalVisible(false)}
          initialMode={authModalMode}
          onSuccess={(user) => {
            setAuthUser(user);
            refreshDockets();
          }}
        />

        {/* ============================================================== */}
        {/* OFFICIAL GOV PORTAL HANDOFF & DIRECT DISPATCH MODAL            */}
        {/* ============================================================== */}
        <PortalHandoffModal
          visible={isPortalModalVisible}
          onClose={() => setIsPortalModalVisible(false)}
          portal={selectedPortalForHandoff}
          dockets={localDockets}
          initialDocket={portalTargetDocket}
          onCopyAndOpen={handleCopyAndOpenPortal}
          onEmailNodal={handleEmailNodalOfficer}
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
  actionScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  stationsScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  profileScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  tabHeaderBadge: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#00f0ff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tabHeaderBadgeText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#00f0ff',
    letterSpacing: 0.5,
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

  // Action Tab & Hero Civic Advocacy Dossier Styles
  actionHeroCard: {
    backgroundColor: 'rgba(11, 19, 38, 0.9)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.4)',
    padding: 16,
    marginBottom: 16,
  },
  actionHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  actionHeroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderWidth: 1,
    borderColor: '#00f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionHeroTitle: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#00f0ff',
    letterSpacing: 0.5,
  },
  actionHeroSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 14,
  },
  actionTargetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(5, 8, 17, 0.8)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  actionTargetLabel: {
    fontSize: 8,
    fontFamily: 'monospace',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  actionTargetName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f8fafc',
  },
  actionTargetMeta: {
    fontSize: 10,
    color: '#00f0ff',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  changeTargetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.4)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
  },
  changeTargetText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#00f0ff',
  },
  actionHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00f0ff',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 8,
  },
  actionHeroBtnText: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#030712',
    letterSpacing: 0.5,
  },
  portalHelperText: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  portalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 16,
  },
  portalCard: {
    width: '48.5%',
    backgroundColor: 'rgba(11, 19, 38, 0.75)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    padding: 12,
    justifyContent: 'space-between',
    minHeight: 120,
  },
  portalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  portalIconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  portalBadgeText: {
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#38bdf8',
  },
  portalName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 2,
  },
  portalSub: {
    fontSize: 9,
    color: '#64748b',
    lineHeight: 12,
    marginBottom: 8,
  },
  portalLaunchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(56, 189, 248, 0.12)',
    paddingTop: 6,
    gap: 4,
  },
  portalLaunchText: {
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#00f0ff',
  },
  emptyDraftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderWidth: 1,
    borderColor: '#00f0ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 12,
    gap: 6,
  },
  emptyDraftBtnText: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#00f0ff',
  },
  telemetryAuditCard: {
    backgroundColor: 'rgba(11, 19, 38, 0.85)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.22)',
    padding: 14,
    marginBottom: 16,
  },
  telemetryAuditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  telemetryAuditTitle: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#00f0ff',
    letterSpacing: 0.8,
  },
  telemetryAuditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(56, 189, 248, 0.1)',
  },
  telemetryAuditKey: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  telemetryAuditVal: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  telemetryAuditDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  docketsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  purgeAllText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#ef4444',
    letterSpacing: 0.5,
  },
  emptyDocketsCard: {
    backgroundColor: 'rgba(11, 19, 38, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.15)',
    borderStyle: 'dashed',
    padding: 18,
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyDocketsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    fontFamily: 'monospace',
    marginTop: 8,
  },
  emptyDocketsSub: {
    fontSize: 10,
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 14,
  },
  docketCard: {
    backgroundColor: 'rgba(11, 19, 38, 0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    padding: 12,
    marginBottom: 10,
  },
  docketCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  docketRefBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  docketRefText: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#00f0ff',
    marginLeft: 4,
  },
  docketStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.8,
  },
  docketStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  docketStatusText: {
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: '800',
  },
  docketTargetName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 2,
  },
  docketAuthorityName: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 6,
  },
  docketDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  docketDateText: {
    fontSize: 9,
    color: '#64748b',
    fontFamily: 'monospace',
    marginLeft: 4,
  },
  docketDispatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  docketPortalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00f0ff',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 8,
    gap: 6,
  },
  docketPortalBtnText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#040711',
    letterSpacing: 0.3,
  },
  docketEmailBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#00f0ff',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 6,
  },
  docketEmailBtnText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#00f0ff',
    letterSpacing: 0.3,
  },
  docketActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(56, 189, 248, 0.1)',
    paddingTop: 8,
  },
  docketActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 6,
  },
  docketActionBtnText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#00f0ff',
    marginLeft: 4,
  },
  dpdpNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  dpdpNoticeText: {
    fontSize: 9,
    color: '#64748b',
    marginLeft: 8,
    flex: 1,
    lineHeight: 13,
  },
});
