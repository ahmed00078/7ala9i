import React, { useEffect, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
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
 * iOS-style segmented control (§4.4). The indicator's position comes from each
 * option's measured layout rather than computed RTL math — so LTR and Android
 * RTL render identically without any `I18nManager.isRTL` branching.
 */
export function Segment<T extends string = string>({ options, value, onChange }: SegmentProps<T>) {
  const [layouts, setLayouts] = useState<Record<number, { x: number; width: number }>>({});
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);
  const hasInitialized = React.useRef(false);

  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));

  useEffect(() => {
    const target = layouts[activeIndex];
    if (!target) return;
    // First measurement: snap. Subsequent changes: animate.
    if (!hasInitialized.current) {
      indicatorX.value = target.x;
      indicatorW.value = target.width;
      hasInitialized.current = true;
      return;
    }
    indicatorX.value = withSpring(target.x, { damping: 18, stiffness: 220, mass: 0.8 });
    indicatorW.value = withSpring(target.width, { damping: 18, stiffness: 220, mass: 0.8 });
  }, [activeIndex, layouts, indicatorX, indicatorW]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
  }));

  const handleOptionLayout = (idx: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setLayouts((prev) => {
      const existing = prev[idx];
      if (existing && existing.x === x && existing.width === width) return prev;
      return { ...prev, [idx]: { x, width } };
    });
  };

  const ready = layouts[activeIndex] != null;

  return (
    <View style={styles.track}>
      {ready && (
        <Animated.View pointerEvents="none" style={[styles.indicator, indicatorStyle]} />
      )}
      {options.map((option, idx) => {
        const isActive = option.value === value;
        return (
          <View
            key={option.value}
            style={styles.option}
            onLayout={handleOptionLayout(idx)}
          >
            <PressablePremium
              haptic="selection"
              pressScale={0.97}
              onPress={() => onChange(option.value)}
              style={styles.optionInner}
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
          </View>
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
    left: 0,
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
    zIndex: 1,
  },
  optionInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
