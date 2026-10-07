export const theme = {
  colors: {
    bg: '#050811',
    bgCard: 'rgba(11, 19, 38, 0.78)',
    bgCardHover: 'rgba(18, 30, 58, 0.85)',
    border: 'rgba(56, 189, 248, 0.22)',
    borderGlow: 'rgba(0, 240, 255, 0.45)',
    
    // Core text colors
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    
    // Accents
    neonCyan: '#00f0ff',
    neonBlue: '#38bdf8',
    neonPurple: '#a855f7',
    
    // Air Quality standard colors
    aqiGood: '#10b981',
    aqiSatisfactory: '#84cc16',
    aqiModerate: '#eab308',
    aqiPoor: '#f97316',
    aqiVeryPoor: '#ef4444',
    aqiSevere: '#991b1b',
  },
  glass: {
    backgroundColor: 'rgba(9, 15, 30, 0.82)',
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
  }
};

export function getAqiMeta(aqi) {
  const val = Number(aqi) || 0;
  if (val <= 50) return { color: theme.colors.aqiGood, label: 'GOOD', symbol: '●' };
  if (val <= 100) return { color: theme.colors.aqiSatisfactory, label: 'SATISFACTORY', symbol: '●' };
  if (val <= 200) return { color: theme.colors.aqiModerate, label: 'MODERATE', symbol: '▲' };
  if (val <= 300) return { color: theme.colors.aqiPoor, label: 'POOR', symbol: '▲' };
  if (val <= 400) return { color: theme.colors.aqiVeryPoor, label: 'VERY POOR', symbol: '■' };
  return { color: theme.colors.aqiSevere, label: 'SEVERE', symbol: '✖' };
}
