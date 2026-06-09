import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  useWindowDimensions,
  View,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
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

const SlideItem = React.memo(function SlideItem({ Illo, title, desc, width }: {
  Illo: Slide['Illo'];
  title: string;
  desc: string;
  width: number;
}) {
  return (
    <View style={[styles.slide, { width }]}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.illoWrap}>
        <Illo size={180} color={colors.accent} strokeWidth={1.5} />
      </Animated.View>
      <AppText style={styles.title} numberOfLines={2}>{title}</AppText>
      <AppText style={styles.desc} numberOfLines={3}>{desc}</AppText>
    </View>
  );
});

export function OnboardingScreen({ navigation }: AuthScreenProps<'Onboarding'>) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const finish = useCallback(async () => {
    await storage.setOnboardingDone();
    navigation.replace('Login');
  }, [navigation]);

  const handleNext = useCallback(() => {
    if (activeIndex < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      finish();
    }
  }, [activeIndex, finish]);

  const handleSkip = useCallback(() => {
    Haptics.selectionAsync().catch(() => undefined);
    finish();
  }, [finish]);

  const onMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== activeIndex) {
      Haptics.selectionAsync().catch(() => undefined);
      setActiveIndex(idx);
    }
  }, [activeIndex, width]);

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

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => (
          <SlideItem
            Illo={item.Illo}
            title={t(item.titleKey)}
            desc={t(item.descKey)}
            width={width}
          />
        )}
        style={styles.list}
      />

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
  list: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.section,
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
    lineHeight: 34,
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
