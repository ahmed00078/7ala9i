import React, { forwardRef, useCallback } from 'react';
import { Pressable, PressableProps, View, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type HapticStyle = 'selection' | 'light' | 'medium' | 'heavy' | 'none';

export interface PressablePremiumProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Scale target on press-in. Defaults to 0.97. Use 0.94 for big tappable cards. */
  pressScale?: number;
  /** Haptic on press-in. Defaults to `selection`. Set to `none` for chrome-only presses. */
  haptic?: HapticStyle;
  /** Disables the scale animation entirely (e.g. for non-interactive wrappers). */
  noAnimation?: boolean;
  children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
}

const SPRING_IN = { mass: 0.4, damping: 14, stiffness: 240 } as const;
const SPRING_OUT = { mass: 0.4, damping: 16, stiffness: 200 } as const;

/**
 * The base interactive primitive for the premium redesign — replaces every
 * `TouchableOpacity` (§4.1). Scale-only press feedback (no opacity drop),
 * selection haptic on press-in, spring-back on release.
 */
export const PressablePremium = forwardRef<View, PressablePremiumProps>(function PressablePremium(
  { style, pressScale = 0.97, haptic = 'selection', noAnimation, onPressIn, onPressOut, disabled, children, ...rest },
  ref,
) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
      if (!noAnimation) scale.value = withSpring(pressScale, SPRING_IN);
      if (haptic !== 'none' && !disabled) {
        fireHaptic(haptic);
      }
      onPressIn?.(e);
    },
    [scale, pressScale, noAnimation, haptic, disabled, onPressIn],
  );

  const handlePressOut = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
      if (!noAnimation) scale.value = withSpring(1, SPRING_OUT);
      onPressOut?.(e);
    },
    [scale, noAnimation, onPressOut],
  );

  return (
    <AnimatedPressable
      ref={ref as never}
      style={[style as ViewStyle, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      {...rest}
    >
      {children as never}
    </AnimatedPressable>
  );
});

function fireHaptic(style: HapticStyle) {
  // Fire-and-forget — haptics are best-effort and shouldn't throw on Android
  // devices that lack the hardware.
  if (style === 'selection') Haptics.selectionAsync().catch(() => undefined);
  else if (style === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  else if (style === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  else if (style === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
}
