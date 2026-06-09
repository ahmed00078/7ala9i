import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../ui/AppText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useIsRTL } from '../../i18n/useIsRTL';

interface AuthHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

/**
 * §5.10 — slim auth header. No hero card, no logo box. Just a back chevron
 * (when applicable), a title, and an optional muted subtitle. Used by
 * Login / Register / Forgot / Reset / OTP screens.
 */
export function AuthHeader({ title, subtitle, onBack }: AuthHeaderProps) {
  const rtl = useIsRTL();
  return (
    <View style={styles.wrap}>
      {onBack && (
        <Pressable onPress={onBack} hitSlop={10} style={styles.back}>
          <Ionicons
            name={rtl ? 'chevron-forward' : 'chevron-back'}
            size={26}
            color={colors.ink}
          />
        </Pressable>
      )}
      <AppText style={styles.title} numberOfLines={2}>{title}</AppText>
      {subtitle ? <AppText style={styles.subtitle} numberOfLines={3}>{subtitle}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.section,
    paddingTop: 8,
    paddingBottom: 24,
  },
  back: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: -8,
    marginBottom: 8,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
    color: colors.ink,
    textAlign: 'left',
  },
  subtitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.slate,
    marginTop: 6,
    textAlign: 'left',
  },
});
