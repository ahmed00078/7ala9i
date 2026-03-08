export const colors = {
  white: '#FFFFFF',
  background: '#F2F6F6',
  black: '#0F1923',
  accent: '#0D9488',
  accentLight: '#CCFBF1',
  accentDark: '#0F766E',
  border: '#DDE4E3',
  gray: '#94A3B8',
  grayDark: '#64748B',
  grayLight: '#CBD5E1',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  star: '#FBBF24',
  transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof colors;
