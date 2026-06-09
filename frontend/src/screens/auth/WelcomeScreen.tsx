import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { AppText } from '../../components/ui/AppText';
import { useLanguage } from '../../contexts/LanguageContext';
import { storage } from '../../utils/storage';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { PressablePremium, AuthWordmarkIllustration } from '../../components/premium';
import type { AuthScreenProps } from '../../types/navigation';

const LANGS: Array<{ code: 'ar' | 'fr' | 'en'; short: string }> = [
  { code: 'ar', short: 'ع' },
  { code: 'fr', short: 'FR' },
  { code: 'en', short: 'EN' },
];

/**
 * §5.10 Welcome — full-bleed ink hero with a hand-illustrated wordmark mark,
 * the brand tagline as a tri-lingual single line ("تحجز · Réservez · Book"),
 * and two CTAs (filled ink "Get Started" + ghost "I have an account"). The
 * AR · FR · EN language pill lives bottom-end so it's reachable but quiet.
 */
export function WelcomeScreen({ navigation }: AuthScreenProps<'Welcome'>) {
  const { t } = useTranslation();
  const { changeLanguage, language } = useLanguage();

  const triLine = useMemo(() => 'تحجز  ·  Réservez  ·  Book', []);

  const handleStart = async () => {
    const done = await storage.isOnboardingDone();
    if (done) navigation.replace('Login');
    else navigation.navigate('Onboarding');
  };

  return (
    <View style={styles.container}>
      {/* Subtle ink → softer ink gradient — sets the editorial tone. */}
      <LinearGradient
        colors={[colors.inkSoft, colors.ink]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Wordmark + brand */}
        <Animated.View entering={FadeIn.duration(420)} style={styles.heroBlock}>
          <View style={styles.markWrap}>
            <AuthWordmarkIllustration size={86} color={colors.accentSoft} strokeWidth={1.4} />
          </View>
          <AppText style={styles.wordmark} numberOfLines={1}>{t('app.name')}</AppText>
          <AppText style={styles.triLine} numberOfLines={1}>{triLine}</AppText>
        </Animated.View>

        {/* CTAs */}
        <Animated.View entering={FadeInDown.duration(380).delay(120)} style={styles.ctaBlock}>
          <AppText style={styles.lead} numberOfLines={2}>
            {t('welcome.lead')}
          </AppText>
          <PressablePremium
            onPress={handleStart}
            pressScale={0.97}
            haptic="medium"
            style={styles.primaryBtn}
          >
            <AppText style={styles.primaryText}>{t('welcome.getStarted')}</AppText>
          </PressablePremium>
          <PressablePremium
            onPress={() => navigation.navigate('Login')}
            pressScale={0.97}
            haptic="selection"
            style={styles.ghostBtn}
          >
            <AppText style={styles.ghostText}>{t('welcome.haveAccount')}</AppText>
          </PressablePremium>

          {/* Tri-state language pill, quiet, anchored bottom-end */}
          <View style={styles.langPillRow}>
            <View style={styles.langPill}>
              {LANGS.map((l, i) => {
                const active = language === l.code;
                return (
                  <Pressable
                    key={l.code}
                    onPress={() => changeLanguage(l.code)}
                    style={[styles.langItem, active && styles.langItemActive]}
                    hitSlop={6}
                  >
                    <AppText style={[styles.langText, active && styles.langTextActive]} numberOfLines={1}>
                      {l.short}
                    </AppText>
                    {i < LANGS.length - 1 && <View style={styles.langSep} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  safe: { flex: 1, paddingHorizontal: spacing.section, justifyContent: 'space-between' },
  heroBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  markWrap: {
    width: 110,
    height: 110,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: 'Outfit-Black',
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1.2,
    color: colors.surface,
    textAlign: 'center',
  },
  triLine: {
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  ctaBlock: {
    paddingBottom: 12,
    gap: 12,
  },
  lead: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  primaryBtn: {
    backgroundColor: colors.surface,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    color: colors.ink,
    letterSpacing: 0.3,
  },
  ghostBtn: {
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  ghostText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    color: colors.surface,
    letterSpacing: 0.3,
  },
  langPillRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'flex-end',
    marginTop: 18,
  },
  langPill: {
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  langItemActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  langText: {
    ...typography.caption,
    fontFamily: 'Outfit-Medium',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.2,
  },
  langTextActive: {
    color: colors.surface,
  },
  langSep: {
    width: StyleSheet.hairlineWidth,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginStart: 10,
  },
});
