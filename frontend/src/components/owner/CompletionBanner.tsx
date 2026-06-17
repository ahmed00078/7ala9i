import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../ui/AppText';
import { PressablePremium } from '../premium';
import { useSalonCompletion } from '../../hooks/useSalonCompletion';
import { useIsRTL } from '../../i18n/useIsRTL';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

/**
 * Soft-nudge banner on the owner Dashboard. Hidden once the profile is fully
 * complete (or while the salon is still loading). Warning tone while the salon
 * can't take bookings yet; calmer accent tone once it's bookable but still has
 * recommended steps left. Taps through to the profile-completion checklist.
 */
export function CompletionBanner() {
  const { t } = useTranslation();
  const rtl = useIsRTL();
  const navigation = useNavigation<any>();
  const { done, total, isLiveReady, allComplete, loading } = useSalonCompletion();

  if (loading || allComplete) return null;

  const tone = isLiveReady ? colors.accent : colors.warn;
  const toneSoft = isLiveReady ? colors.accentSoft : colors.warningLight;
  const icon = isLiveReady ? 'sparkles' : 'alert-circle';
  const heading = isLiveReady
    ? t('owner.completion.banner.recommendedTitle')
    : t('owner.completion.banner.notReadyTitle');
  const sub = isLiveReady
    ? t('owner.completion.banner.recommended')
    : t('owner.completion.banner.notReady', { done, total });

  return (
    <PressablePremium
      haptic="selection"
      pressScale={0.985}
      onPress={() => navigation.navigate('ProfileCompletion')}
      style={[styles.banner, { borderLeftColor: tone }]}
      accessibilityRole="button"
      accessibilityLabel={heading}
    >
      <View style={[styles.iconDisc, { backgroundColor: toneSoft }]}>
        <Ionicons name={icon as any} size={18} color={tone} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={styles.heading} numberOfLines={1}>{heading}</AppText>
        <AppText style={styles.sub} numberOfLines={1}>{sub}</AppText>
      </View>
      <Ionicons
        name={rtl ? 'chevron-back' : 'chevron-forward'}
        size={18}
        color={colors.slateSoft}
      />
    </PressablePremium>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.base,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    borderLeftWidth: 3,
  },
  iconDisc: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  sub: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.slate,
    marginTop: 2,
  },
});
