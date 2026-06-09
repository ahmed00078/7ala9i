import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/spacing';
import { AppText } from '../ui/AppText';

type ToastVariant = 'saved' | 'success' | 'error' | 'info';

interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  /** Milliseconds the toast stays visible. Default 1500. */
  duration?: number;
}

interface ToastContextValue {
  show: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => undefined });

/**
 * Global toast provider. Renders a single Reanimated pill that slides up from
 * just above the tab bar safe area (§5.4 — the "Saved" toast for auto-save
 * flows like Working Hours). Replace `<AlertContext>` calls over time.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<ToastOptions | null>(null);
  const translateY = useSharedValue(120);
  const opacity = useSharedValue(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => setCurrent(null), []);

  const show = useCallback(
    (options: ToastOptions) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setCurrent(options);
      // Light haptic on the value's success-y variants
      if (options.variant !== 'error') {
        Haptics.selectionAsync().catch(() => undefined);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      }
    },
    [],
  );

  useEffect(() => {
    if (!current) return;
    const duration = current.duration ?? 1500;
    const ENTER = 240;
    const EXIT = 200;

    translateY.value = withSequence(
      withTiming(0, { duration: ENTER, easing: Easing.out(Easing.cubic) }),
      withDelay(duration, withTiming(120, { duration: EXIT, easing: Easing.in(Easing.cubic) })),
    );
    opacity.value = withSequence(
      withTiming(1, { duration: ENTER }),
      withDelay(duration, withTiming(0, { duration: EXIT }, (finished) => {
        if (finished) runOnJS(reset)();
      })),
    );
  }, [current, translateY, opacity, reset]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {current && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wrap,
            { bottom: Math.max(insets.bottom, 8) + 78 }, // sit above the tab bar
            animatedStyle,
          ]}
        >
          <View style={styles.pill}>
            {iconFor(current.variant)}
            <AppText style={[typography.bodyMedium, styles.text]}>{current.message}</AppText>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

function iconFor(variant: ToastVariant = 'saved') {
  const map = {
    saved: { name: 'checkmark-circle' as const, color: colors.accent },
    success: { name: 'checkmark-circle' as const, color: colors.ok },
    error: { name: 'alert-circle' as const, color: colors.danger },
    info: { name: 'information-circle' as const, color: colors.slateSoft },
  };
  const { name, color } = map[variant];
  return <Ionicons name={name} size={16} color={color} />;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.ink,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  text: {
    color: colors.white,
  },
});
