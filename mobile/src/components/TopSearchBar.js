import React, { useEffect, useRef } from 'react';
import { View, TextInput, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function TopSearchBar({ value, onChangeText, onClear }) {
  // Smooth Glide Animation from Left/Top as requested in user's sketch
  const glideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(glideAnim, {
        toValue: 0,
        friction: 8,
        tension: 45,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();
  }, [glideAnim, opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [{ translateY: glideAnim }],
          opacity: opacityAnim,
        }
      ]}
    >
      <View style={styles.glassContainer}>
        <Ionicons name="search" size={18} color={theme.colors.neonCyan} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Search station or sector..."
          placeholderTextColor={theme.colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {Boolean(value && value.length > 0) && (
          <TouchableOpacity onPress={onClear} style={styles.clearBtn} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 54,
    left: 16,
    right: 16,
    zIndex: 50,
  },
  glassContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 14, 28, 0.82)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    height: 48,
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 14,
    letterSpacing: 0.3,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  }
});
