import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Platform, I18nManager } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSpring,
  Easing,
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

const RING_SIZE = 48;
const STROKE = 3;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const BTN_HEIGHT = 60;
const SIDE_PADDING = 8; // gap between ring and pill edge

/**
 * §5.8 — Apple-Pay-style hold-to-confirm primitive. Press and hold for ~700ms;
 * a thin accent ring on the trailing edge fills as you hold. Releasing early
 * smoothly resets. On completion: success haptic + `onConfirm` fires.
 *
 * Layout: a flex row [ring · label · spacer]. The ring lives at the LOGICAL
 * end of the button so it naturally flips in RTL with the same flex flow that
 * positions the rest of the content.
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
  const progress = useSharedValue(0);
  const press = useSharedValue(0);
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

  useEffect(() => {
    const id = setInterval(() => {
      if (progress.value >= 0.5) fireMidHaptic();
      if (progress.value >= 1) commit();
    }, 40);
    return () => clearInterval(id);
  }, [progress, fireMidHaptic, commit]);

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
        {/* Trailing-edge progress ring — flex order keeps it at the logical end. */}
        <View style={styles.ringWrap} pointerEvents="none">
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke={`${textColor}30`}
              strokeWidth={STROKE}
              fill="transparent"
            />
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke={ringColor}
              strokeWidth={STROKE}
              fill="transparent"
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              animatedProps={animatedCircleProps}
              transform={`rotate(${I18nManager.isRTL ? 90 : -90} ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>
        </View>

        <AppText style={[styles.label, { color: textColor }]} numberOfLines={1}>
          {loading ? '…' : label}
        </AppText>

        {/* Mirror spacer so the label stays optically centered. */}
        <View style={styles.spacer} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIDE_PADDING,
    borderRadius: 999,
    minHeight: BTN_HEIGHT,
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
    flex: 1,
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    width: RING_SIZE,
    height: RING_SIZE,
  },
});
