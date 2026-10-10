import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function BottomNavBar({ activeTab, onSelectTab }) {
  const tabs = [
    {
      id: 'map',
      label: 'MAP',
      iconActive: 'earth',
      iconInactive: 'earth-outline',
      isHero: false,
    },
    {
      id: 'action',
      label: 'ACTION',
      iconActive: 'document-text',
      iconInactive: 'document-text-outline',
      isHero: true,
    },
    {
      id: 'profile',
      label: 'PROFILE',
      iconActive: 'shield',
      iconInactive: 'shield-outline',
      isHero: false,
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
              style={[
                styles.tabBtn,
                tab.isHero && styles.heroTabBtn,
                isActive && !tab.isHero && styles.tabBtnActive,
                isActive && tab.isHero && styles.heroTabBtnActive
              ]}
            >
              <Ionicons
                name={isActive ? tab.iconActive : tab.iconInactive}
                size={tab.isHero ? 23 : 21}
                color={
                  tab.isHero
                    ? (isActive ? '#030712' : theme.colors.neonCyan)
                    : (isActive ? theme.colors.neonCyan : theme.colors.textMuted)
                }
              />
              <Text
                style={[
                  styles.tabLabel,
                  tab.isHero && styles.heroTabLabel,
                  {
                    color: tab.isHero
                      ? (isActive ? '#030712' : theme.colors.neonCyan)
                      : (isActive ? theme.colors.neonCyan : theme.colors.textMuted)
                  }
                ]}
              >
                {tab.label}
              </Text>
              {isActive && !tab.isHero && <View style={styles.activeGlowDot} />}
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
    height: 72,
    backgroundColor: 'rgba(5, 8, 17, 0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(56, 189, 248, 0.22)',
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
    paddingHorizontal: 18,
    borderRadius: 16,
    minWidth: 80,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
  },
  heroTabBtn: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.5)',
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 22,
    minWidth: 92,
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTabBtnActive: {
    backgroundColor: theme.colors.neonCyan,
    borderColor: '#00f0ff',
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  tabLabel: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.8,
  },
  heroTabLabel: {
    fontSize: 9.5,
    letterSpacing: 1,
  },
  activeGlowDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.neonCyan,
    marginTop: 2,
  },
});
