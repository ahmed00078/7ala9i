import React, { useEffect, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent, I18nManager } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/spacing';
import { AppText } from '../ui/AppText';
import { PressablePremium } from './PressablePremium';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
}

interface SegmentProps<T extends string = string> {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
}

/**
 * iOS-style segmented control (§4.4). Reanimated indicator slides under the
 * active option. Selected color is *contrast* (ink on white), not fill.
 */
export function Segment<T extends string = string>({ options, value, onChange }: SegmentProps<T>) {
  const [trackWidth, setTrackWidth] = useState(0);
  const indicatorX = useSharedValue(0);

  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const segmentWidth = trackWidth > 0 ? trackWidth / options.length : 0;

  useEffect(() => {
    if (segmentWidth === 0) return;
    const targetIndex = I18nManager.isRTL ? options.length - 1 - activeIndex : activeIndex;
    indicatorX.value = withSpring(targetIndex * segmentWidth, {
      damping: 18,
      stiffness: 220,
      mass: 0.8,
    });
  }, [activeIndex, segmentWidth, indicatorX, options.length]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: segmentWidth,
  }));

  return (
    <View
      style={styles.track}
      onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      {segmentWidth > 0 && (
        <Animated.View pointerEvents="none" style={[styles.indicator, indicatorStyle]} />
      )}
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <PressablePremium
            key={option.value}
            haptic="selection"
            pressScale={0.97}
            onPress={() => onChange(option.value)}
            style={styles.option}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <AppText
              style={[
                typography.button,
                styles.label,
                isActive ? styles.labelActive : styles.labelInactive,
              ]}
            >
              {option.label}
            </AppText>
          </PressablePremium>
        );
      })}
    </View>
  );
}

const TRACK_PADDING = 4;
const TRACK_HEIGHT = 40;

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: TRACK_PADDING,
    height: TRACK_HEIGHT,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: TRACK_PADDING,
    left: TRACK_PADDING,
    bottom: TRACK_PADDING,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  label: {
    fontSize: 13,
  },
  labelActive: {
    color: colors.ink,
  },
  labelInactive: {
    color: colors.slate,
  },
});
