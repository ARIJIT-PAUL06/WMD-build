import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

export default function BottomNavBar({ activeTab, onSelectTab }) {
  const tabs = [
    {
      id: 'map',
      label: 'MAP',
      iconActive: 'earth',
      iconInactive: 'earth-outline',
    },
    {
      id: 'stations',
      label: 'STATIONS',
      iconActive: 'radio',
      iconInactive: 'radio-outline',
    },
    {
      id: 'profile',
      label: 'PROFILE',
      iconActive: 'shield',
      iconInactive: 'shield-outline',
    },
  ];

  return (
    <View style={styles.dockWrapper}>
      <View style={styles.dockContainer}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.75}
              onPress={() => onSelectTab(tab.id)}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
            >
              <Ionicons
                name={isActive ? tab.iconActive : tab.iconInactive}
                size={22}
                color={isActive ? theme.colors.neonCyan : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? theme.colors.neonCyan : theme.colors.textMuted }
                ]}
              >
                {tab.label}
              </Text>
              {isActive && <View style={styles.activeGlowDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dockWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: 'rgba(5, 8, 17, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(56, 189, 248, 0.2)',
    paddingBottom: 6,
    zIndex: 50,
  },
  dockContainer: {
    flexDirection: 'row',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 16,
    minWidth: 80,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
  },
  tabLabel: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    marginTop: 3,
    letterSpacing: 0.8,
  },
  activeGlowDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.neonCyan,
    marginTop: 2,
  },
});
