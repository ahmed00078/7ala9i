import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { AppText } from '../ui/AppText';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/spacing';

interface CompletionMeterProps {
  done: number;
  total: number;
  /** Optional caption above the bar (e.g. "4 of 6 complete"). */
  label?: string;
  /** Fill color — defaults to the single accent teal. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * A thin, rounded progress bar with an animated fill. Used by the owner
 * profile-completion screen; intentionally generic (done/total) so it can be
 * reused for any "N of M" meter. No interactivity (unlike `HoldToConfirm`).
 */
export function CompletionMeter({ done, total, label, color, style }: CompletionMeterProps) {
  const fraction = total > 0 ? Math.min(1, Math.max(0, done / total)) : 0;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(fraction, { damping: 18, stiffness: 120 });
  }, [fraction, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={style}>
      {label != null && <AppText style={styles.label}>{label}</AppText>}
      <View style={styles.track}>
        <Animated.View
          style={[styles.fill, { backgroundColor: color ?? colors.accent }, fillStyle]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
    color: colors.slate,
    marginBottom: 8,
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});
