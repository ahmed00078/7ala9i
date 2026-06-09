import { TextStyle } from 'react-native';

/**
 * 7ala9i typography — Phase 0 of PREMIUM_UI_PLAN.md §2.4.
 *
 * Latin = Outfit (Regular → Black for display).
 * Arabic = Tajawal (body), Noto Naskh Arabic (editorial / salon names).
 * Tajawal has no 600, so SemiBold maps to Tajawal_700Bold in App.tsx.
 */
export const latinFonts = {
  regular: 'Outfit-Regular',
  medium: 'Outfit-Medium',
  semiBold: 'Outfit-SemiBold',
  bold: 'Outfit-Bold',
  black: 'Outfit-Black',
} as const;

export const arabicFonts = {
  regular: 'Tajawal-Regular',
  medium: 'Tajawal-Medium',
  semiBold: 'Tajawal-SemiBold',
  bold: 'Tajawal-Bold',
  black: 'Tajawal-Bold',
  serif: 'NotoNaskhArabic-Regular',
  serifBold: 'NotoNaskhArabic-Bold',
} as const;

export const fontFamily = latinFonts;

export function getFontFamily(language: string) {
  return language === 'ar' ? arabicFonts : latinFonts;
}

export const typography: Record<string, TextStyle> = {
  /** Big tabular numbers (revenue, today's bookings). Currency is content, not a label. */
  display: {
    fontFamily: latinFonts.black,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.8,
  },
  /** Section hero titles. */
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    lineHeight: 34,
  },
  header: {
    fontFamily: fontFamily.semiBold,
    fontSize: 18,
    lineHeight: 26,
  },
  subheader: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    lineHeight: 22,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 22,
  },
  bodyMedium: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 22,
  },
  bodySmall: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  button: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    lineHeight: 20,
  },
  /** Tightened caps labels — "TODAY", "THIS WEEK". §2.4. */
  capsLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
};
