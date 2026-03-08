import { TextStyle } from 'react-native';

export const latinFonts = {
  regular: 'Outfit-Regular',
  medium: 'Outfit-Medium',
  semiBold: 'Outfit-SemiBold',
  bold: 'Outfit-Bold',
} as const;

export const arabicFonts = {
  regular: 'Tajawal-Regular',
  medium: 'Tajawal-Medium',
  semiBold: 'Tajawal-SemiBold',
  bold: 'Tajawal-Bold',
} as const;

// Default export — used by static StyleSheets (Latin/Outfit)
export const fontFamily = latinFonts;

export function getFontFamily(language: string) {
  return language === 'ar' ? arabicFonts : latinFonts;
}

export const typography: Record<string, TextStyle> = {
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
};
