import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { AppText } from '../ui/AppText';
import { colors } from '../../theme/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface HoldToConfirmProps {
  label: string;
  /** Total hold duration in ms before commit. Defaults to 700ms. */
  duration?: number;
  /** Disable the button entirely. */
  disabled?: boolean;
  /** Loading state — disables presses + shows pulse. */
  loading?: boolean;
  /** Fired after the progress ring completes a full sweep. */
  onConfirm: () => void;
  /** Stroke color of the progress ring. Defaults to canvas (looks good on ink). */
  ringColor?: string;
  /** Background color of the button. Defaults to ink. */
  backgroundColor?: string;
  /** Label color. Defaults to surface. */
  textColor?: string;
}

const SIZE = 64; // diameter of the ring at the right end
const STROKE = 3;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * §5.8 — Apple-Pay-style hold-to-confirm primitive. Press and hold for ~700ms;
 * a thin accent ring around the right edge fills as you hold. Releasing early
 * smoothly resets. On completion: success haptic + `onConfirm` fires.
 *
 * Haptic crescendo while filling: light (0%) → medium (50%) → notification on
 * completion. We intentionally do NOT fire a haptic on press-in beyond the
 * initial light one; the crescendo is part of what makes this feel premium.
 */
export function HoldToConfirm({
  label,
  duration = 700,
  disabled,
  loading,
  onConfirm,
  ringColor = colors.canvas,
  backgroundColor = colors.ink,
  textColor = colors.surface,
}: HoldToConfirmProps) {
  const progress = useSharedValue(0); // 0 → 1
  const press = useSharedValue(0); // 0 = released, 1 = held
  const [committed, setCommitted] = useState(false);
  const midHapticFired = useRef(false);

  const fireMidHaptic = useCallback(() => {
    if (midHapticFired.current) return;
    midHapticFired.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  }, []);

  const commit = useCallback(() => {
    if (committed) return;
    setCommitted(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    onConfirm();
  }, [committed, onConfirm]);

  // Watch progress; fire mid-haptic + commit when reached.
  useEffect(() => {
    const id = setInterval(() => {
      if (progress.value >= 0.5) fireMidHaptic();
      if (progress.value >= 1) commit();
    }, 40);
    return () => clearInterval(id);
  }, [progress, fireMidHaptic, commit]);

  // Reset when parent flips loading off after commit fires.
  useEffect(() => {
    if (loading) return;
    setCommitted(false);
    midHapticFired.current = false;
    progress.value = withTiming(0, { duration: 200 });
  }, [loading, progress]);

  const handlePressIn = useCallback(() => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    press.value = 1;
    cancelAnimation(progress);
    progress.value = withTiming(1, { duration, easing: Easing.bezier(0.4, 0, 0.6, 1) });
  }, [disabled, loading, press, progress, duration]);

  const handlePressOut = useCallback(() => {
    press.value = 0;
    if (progress.value < 1 && !committed) {
      cancelAnimation(progress);
      progress.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
      midHapticFired.current = false;
    }
  }, [press, progress, committed]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(press.value === 1 ? 0.98 : 1, { mass: 0.5, damping: 14, stiffness: 220 }) }],
  }));

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <Animated.View style={containerStyle}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.btn,
          { backgroundColor, opacity: disabled ? 0.45 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Hold to confirm"
      >
        <AppText style={[styles.label, { color: textColor }]} numberOfLines={1}>
          {loading ? '…' : label}
        </AppText>

        {/* Right-edge progress ring */}
        <View style={styles.ringWrap} pointerEvents="none">
          <Svg width={SIZE} height={SIZE}>
            {/* Idle track */}
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={`${textColor}30`}
              strokeWidth={STROKE}
              fill="transparent"
            />
            {/* Progress */}
            <AnimatedCircle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={ringColor}
              strokeWidth={STROKE}
              fill="transparent"
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              animatedProps={animatedCircleProps}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
          </Svg>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    paddingEnd: 64 + 24,
    borderRadius: 999,
    minHeight: 64,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  label: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  ringWrap: {
    position: 'absolute',
    right: 8,
    top: '50%',
    marginTop: -SIZE / 2,
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
