import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
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

export type TimeChipState = 'available' | 'selected' | 'booked';

interface TimeChipProps {
  label: string;
  state?: TimeChipState;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * §4.5 — slot picker chip. Booked slots are rendered disabled (not hidden) to
 * communicate scarcity. Selected chip springs in via scale.
 */
export function TimeChip({ label, state = 'available', onPress, style }: TimeChipProps) {
  const isSelected = state === 'selected';
  const isBooked = state === 'booked';

  const scale = useSharedValue(isSelected ? 1 : 1);

  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.04 : 1, {
      damping: 12,
      stiffness: 220,
      mass: 0.6,
    });
  }, [isSelected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <PressablePremium
        haptic={isBooked ? 'none' : 'selection'}
        pressScale={0.94}
        noAnimation={isBooked}
        disabled={isBooked}
        onPress={onPress}
        style={[
          styles.base,
          isSelected && styles.selected,
          isBooked && styles.booked,
          style,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected, disabled: isBooked }}
      >
        <AppText
          style={[
            typography.button,
            styles.label,
            isSelected && styles.labelSelected,
            isBooked && styles.labelBooked,
          ]}
        >
          {label}
        </AppText>
      </PressablePremium>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  booked: {
    backgroundColor: colors.transparent,
    borderColor: colors.hairline,
    opacity: 0.4,
  },
  label: {
    color: colors.ink,
    fontSize: 14,
  },
  labelSelected: {
    color: colors.white,
  },
  labelBooked: {
    color: colors.slate,
    textDecorationLine: 'line-through',
  },
});
