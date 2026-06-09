import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../ui/AppText';
import { PressablePremium } from './PressablePremium';
import { colors } from '../../theme/colors';

export const LANG_LABELS: Record<string, string> = {
  ar: 'العربية',
  fr: 'Français',
  en: 'English',
};
export const LANG_ORDER: ReadonlyArray<'ar' | 'fr' | 'en'> = ['ar', 'fr', 'en'];

interface LanguagePillRowProps {
  /** Currently selected language code. */
  language: string;
  /** Called when the user picks a new language. */
  onChange: (lang: string) => void;
}

/**
 * Tri-state pill row used by all profile screens. Active = ink fill, inactive
 * = surfaceAlt fill. RTL-safe.
 */
export function LanguagePillRow({ language, onChange }: LanguagePillRowProps) {
  return (
    <View style={styles.row}>
      {LANG_ORDER.map((lang) => {
        const active = language === lang;
        return (
          <PressablePremium
            key={lang}
            onPress={() => onChange(lang)}
            haptic="selection"
            pressScale={0.97}
            style={[styles.pill, active && styles.pillActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <AppText style={[styles.text, active && styles.textActive]}>
              {LANG_LABELS[lang]}
            </AppText>
          </PressablePremium>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  pillActive: { backgroundColor: colors.ink },
  text: {
    fontFamily: 'Outfit-Medium',
    fontSize: 13,
    color: colors.slate,
  },
  textActive: {
    color: colors.surface,
    fontFamily: 'Outfit-SemiBold',
  },
});
