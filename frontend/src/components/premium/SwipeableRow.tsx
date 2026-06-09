import React, { useCallback } from 'react';
import { View, StyleSheet, I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { AppText } from '../ui/AppText';

export interface SwipeAction {
  /** Display label inside the action panel. */
  label: string;
  /** Ionicons name. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Background color of the action panel. Defaults to `danger` for destructive look. */
  color?: string;
  /** Text/icon color. Defaults to white. */
  textColor?: string;
  /** Called when the user commits the swipe (past `commitThreshold`) OR taps the action button. */
  onPress: () => void;
  /** Mark as the primary destructive action (fires a warning haptic on commit). Default false. */
  destructive?: boolean;
}

interface SwipeableRowProps {
  /** Action revealed on left swipe (i.e. action appears on the trailing edge). */
  trailingAction?: SwipeAction;
  /** Action revealed on right swipe (leading edge — less common, used for "complete" style affordances). */
  leadingAction?: SwipeAction;
  /** Width of the action panel. Default 88. */
  actionWidth?: number;
  /** Fraction of action width past which a swipe auto-commits. Default 0.65. */
  commitThreshold?: number;
  children: React.ReactNode;
}

const SPRING = { damping: 18, stiffness: 220, mass: 0.6 } as const;

/**
 * §5.3 / §5.13 — swipeable list row. Pan left to reveal the trailing action;
 * release past threshold to commit. Spring-back if not committed.
 *
 * Use for: services list, calendar booking rows, appointment cards,
 * notifications. The destructive action is hidden by default — the row reads
 * clean, the affordance is the gesture.
 */
export function SwipeableRow({
  trailingAction,
  leadingAction,
  actionWidth = 88,
  commitThreshold = 0.65,
  children,
}: SwipeableRowProps) {
  const translateX = useSharedValue(0);
  const isRTL = I18nManager.isRTL;

  // In RTL, the "trailing" edge is on the left, so the gesture direction flips.
  // We normalize to a "trailing offset" that's always negative when revealed.
  const trailingDir = isRTL ? 1 : -1;
  const leadingDir = isRTL ? -1 : 1;

  const fireHaptic = useCallback((destructive: boolean) => {
    if (destructive) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  }, []);

  const triggerTrailing = useCallback(() => {
    if (!trailingAction) return;
    fireHaptic(!!trailingAction.destructive);
    trailingAction.onPress();
  }, [trailingAction, fireHaptic]);

  const triggerLeading = useCallback(() => {
    if (!leadingAction) return;
    fireHaptic(!!leadingAction.destructive);
    leadingAction.onPress();
  }, [leadingAction, fireHaptic]);

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-16, 16])
    .onChange((e) => {
      const next = translateX.value + e.changeX;
      // Clamp inside [-actionWidth*1.6, +actionWidth*1.6] for a small overshoot feel
      const clampMin = trailingAction ? trailingDir * actionWidth * 1.6 : 0;
      const clampMax = leadingAction ? leadingDir * actionWidth * 1.6 : 0;
      const lo = Math.min(clampMin, clampMax);
      const hi = Math.max(clampMin, clampMax);
      translateX.value = Math.min(hi, Math.max(lo, next));
    })
    .onEnd(() => {
      const offset = translateX.value;
      const commitTrailing =
        trailingAction != null && offset * trailingDir > actionWidth * commitThreshold;
      const commitLeading =
        leadingAction != null && offset * leadingDir > actionWidth * commitThreshold;

      if (commitTrailing) {
        translateX.value = withTiming(trailingDir * actionWidth, { duration: 140 }, () => {
          runOnJS(triggerTrailing)();
          translateX.value = withSpring(0, SPRING);
        });
      } else if (commitLeading) {
        translateX.value = withTiming(leadingDir * actionWidth, { duration: 140 }, () => {
          runOnJS(triggerLeading)();
          translateX.value = withSpring(0, SPRING);
        });
      } else {
        translateX.value = withSpring(0, SPRING);
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Trailing action panel (revealed when row slides toward leading edge) */}
      {trailingAction && (
        <View
          style={[
            styles.actionPanel,
            isRTL ? styles.actionPanelLeading : styles.actionPanelTrailing,
            {
              width: actionWidth,
              backgroundColor: trailingAction.color ?? colors.danger,
            },
          ]}
        >
          {trailingAction.icon && (
            <Ionicons
              name={trailingAction.icon}
              size={20}
              color={trailingAction.textColor ?? colors.white}
            />
          )}
          <AppText
            style={[styles.actionLabel, { color: trailingAction.textColor ?? colors.white }]}
          >
            {trailingAction.label}
          </AppText>
        </View>
      )}

      {/* Leading action panel */}
      {leadingAction && (
        <View
          style={[
            styles.actionPanel,
            isRTL ? styles.actionPanelTrailing : styles.actionPanelLeading,
            {
              width: actionWidth,
              backgroundColor: leadingAction.color ?? colors.ok,
            },
          ]}
        >
          {leadingAction.icon && (
            <Ionicons
              name={leadingAction.icon}
              size={20}
              color={leadingAction.textColor ?? colors.white}
            />
          )}
          <AppText
            style={[styles.actionLabel, { color: leadingAction.textColor ?? colors.white }]}
          >
            {leadingAction.label}
          </AppText>
        </View>
      )}

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.row, rowStyle]}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  row: {
    backgroundColor: colors.surface,
  },
  actionPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionPanelTrailing: {
    right: 0,
  },
  actionPanelLeading: {
    left: 0,
  },
  actionLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 11,
    letterSpacing: 0.4,
  },
});
