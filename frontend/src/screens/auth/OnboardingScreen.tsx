import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { storage } from '../../utils/storage';
import type { AuthScreenProps } from '../../types/navigation';

type Slide = {
  key: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  titleKey: string;
  descKey: string;
};

const SLIDES: Slide[] = [
  { key: '1', icon: 'location-outline',  titleKey: 'onboarding.slide1.title', descKey: 'onboarding.slide1.desc' },
  { key: '2', icon: 'calendar-outline',  titleKey: 'onboarding.slide2.title', descKey: 'onboarding.slide2.desc' },
  { key: '3', icon: 'briefcase-outline', titleKey: 'onboarding.slide3.title', descKey: 'onboarding.slide3.desc' },
];

type SlideItemProps = {
  slide: Slide;
  width: number;
  t: (key: string) => string;
};

const SlideItem = React.memo(({ slide, width, t }: SlideItemProps) => (
  <View style={[styles.slide, { width }]}>
    <View style={styles.illustrationBox}>
      <Ionicons name={slide.icon} size={80} color={colors.accent} />
    </View>
    <Text style={styles.title}>{t(slide.titleKey)}</Text>
    <Text style={styles.desc}>{t(slide.descKey)}</Text>
  </View>
));

export function OnboardingScreen({ navigation }: AuthScreenProps<'Onboarding'>) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleFinish = useCallback(async () => {
    await storage.setOnboardingDone();
    navigation.replace('Login');
  }, [navigation]);

  const handleNext = useCallback(() => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      handleFinish();
    }
  }, [activeIndex, handleFinish]);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  );

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Skip button — top right corner */}
      {!isLast && (
        <TouchableOpacity onPress={handleFinish} style={styles.skipBtn} activeOpacity={0.7}>
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => <SlideItem slide={item} width={width} t={t} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        style={styles.list}
      />

      {/* Dot indicators */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>

      {/* Footer — Next / Get Started only */}
      <View style={styles.footer}>
        <Button
          title={isLast ? t('onboarding.getStarted') : t('common.next')}
          onPress={handleNext}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipBtn: {
    position: 'absolute',
    top: 56,
    end: 20,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 15,
    fontFamily: 'Outfit-Medium',
    color: colors.grayDark,
  },
  list: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  illustrationBox: {
    width: 160,
    height: 160,
    borderRadius: 40,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Outfit-Bold',
    color: colors.black,
    textAlign: 'center',
    marginBottom: 16,
  },
  desc: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: colors.grayDark,
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.grayLight,
  },
  dotActive: {
    width: 20,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
});
