import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  View,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { AppText } from '../../components/ui/AppText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { storage } from '../../utils/storage';
import {
  PressablePremium,
  AuthDiscoverIllustration,
  AuthBookIllustration,
  AuthBarberIllustration,
} from '../../components/premium';
import type { AuthScreenProps } from '../../types/navigation';

type Slide = {
  key: string;
  Illo: (props: { size?: number; color?: string; strokeWidth?: number }) => React.ReactElement;
  titleKey: string;
  descKey: string;
};

const SLIDES: Slide[] = [
  { key: '1', Illo: AuthDiscoverIllustration, titleKey: 'onboarding.slide1.title', descKey: 'onboarding.slide1.desc' },
  { key: '2', Illo: AuthBookIllustration, titleKey: 'onboarding.slide2.title', descKey: 'onboarding.slide2.desc' },
  { key: '3', Illo: AuthBarberIllustration, titleKey: 'onboarding.slide3.title', descKey: 'onboarding.slide3.desc' },
];

export function OnboardingScreen({ navigation }: AuthScreenProps<'Onboarding'>) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const offset = useSharedValue(0);
  const dragX = useSharedValue(0);

  const finish = useCallback(async () => {
    await storage.setOnboardingDone();
    // Onboarding is reached from Welcome's "Get Started" CTA — finish into Register
    // so the user lands on account-creation, not on the sign-in form they didn't ask for.
    navigation.replace('Register');
  }, [navigation]);

  const goToIndex = useCallback((next: number) => {
    if (next < 0 || next > SLIDES.length - 1) return;
    Haptics.selectionAsync().catch(() => undefined);
    setActiveIndex(next);
    const dir = I18nManager.isRTL ? 1 : -1;
    offset.value = withSpring(next * width * dir, {
      damping: 22,
      stiffness: 180,
      mass: 0.9,
    });
  }, [offset, width]);

  const handleNext = useCallback(() => {
    if (activeIndex < SLIDES.length - 1) {
      goToIndex(activeIndex + 1);
    } else {
      finish();
    }
  }, [activeIndex, finish, goToIndex]);

  const handleSkip = useCallback(() => {
    Haptics.selectionAsync().catch(() => undefined);
    finish();
  }, [finish]);

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value + dragX.value }],
  }));

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onUpdate((e) => {
      dragX.value = e.translationX;
    })
    .onEnd((e) => {
      const threshold = width * 0.18;
      const swiped = Math.abs(e.translationX) > threshold;
      const rtlSign = I18nManager.isRTL ? -1 : 1;
      // In LTR: swiping LEFT (negative translation) → next slide.
      // In RTL: swiping RIGHT (positive translation) → next slide.
      let next = activeIndex;
      if (swiped) {
        const swipeForward = e.translationX * rtlSign < 0;
        next = swipeForward ? activeIndex + 1 : activeIndex - 1;
        next = Math.max(0, Math.min(SLIDES.length - 1, next));
      }
      dragX.value = withSpring(0, { damping: 22, stiffness: 200 });
      if (next !== activeIndex) {
        runOnJS(goToIndex)(next);
      }
    });

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topRow}>
        <View style={{ width: 60 }} />
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>
        {!isLast ? (
          <PressablePremium onPress={handleSkip} pressScale={0.94} haptic="selection" style={styles.skipBtn}>
            <AppText style={styles.skipText}>{t('onboarding.skip')}</AppText>
          </PressablePremium>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <GestureDetector gesture={pan}>
        <View style={styles.viewport}>
          <Animated.View style={[styles.track, { width: width * SLIDES.length }, trackStyle]}>
            {SLIDES.map((slide) => (
              <View key={slide.key} style={[styles.slide, { width }]}>
                <Animated.View entering={FadeIn.duration(280)} style={styles.illoWrap}>
                  <slide.Illo size={180} color={colors.accent} strokeWidth={1.5} />
                </Animated.View>
                <AppText
                  style={styles.title}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {t(slide.titleKey)}
                </AppText>
                <AppText style={styles.desc} numberOfLines={3}>{t(slide.descKey)}</AppText>
              </View>
            ))}
          </Animated.View>
        </View>
      </GestureDetector>

      <View style={styles.footer}>
        <PressablePremium
          onPress={handleNext}
          pressScale={0.97}
          haptic="medium"
          style={styles.cta}
        >
          <AppText style={styles.ctaText}>
            {isLast ? t('onboarding.getStarted') : t('common.next')}
          </AppText>
        </PressablePremium>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  skipBtn: {
    width: 60,
    paddingVertical: 6,
    alignItems: 'flex-end',
  },
  skipText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
    color: colors.slateSoft,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.hairline,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.ink,
  },
  viewport: {
    flex: 1,
    overflow: 'hidden',
  },
  track: {
    flex: 1,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  illoWrap: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 26,
    lineHeight: 36,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.4,
  },
  desc: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.slate,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  footer: {
    paddingHorizontal: spacing.section,
    paddingBottom: 20,
    paddingTop: 12,
  },
  cta: {
    backgroundColor: colors.ink,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    color: colors.surface,
    letterSpacing: 0.3,
  },
});
