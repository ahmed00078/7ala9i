import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

interface BlockProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * §4.8 — single skeleton block. Compose multiple Blocks inside a Row/Group to
 * sketch a screen's content shape, then mount instead of `<ActivityIndicator>`.
 */
function SkeletonBlock({ width = '100%', height = 14, radius = 6, style }: BlockProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [progress]);

  const sweepStyle = useAnimatedStyle(() => {
    const x = interpolate(progress.value, [0, 1], [-1, 1]);
    return {
      transform: [{ translateX: `${x * 100}%` as `${number}%` }],
    };
  });

  return (
    <View
      style={[
        styles.block,
        { width, height, borderRadius: radius },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, sweepStyle]}>
        <LinearGradient
          colors={[colors.transparent, 'rgba(255,255,255,0.6)', colors.transparent]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}

interface RowProps {
  gap?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}
function SkeletonRow({ gap = 12, style, children }: RowProps) {
  return <View style={[{ flexDirection: 'row', gap }, style]}>{children}</View>;
}

interface GroupProps {
  gap?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}
function SkeletonGroup({ gap = 10, style, children }: GroupProps) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

export const Skeleton = {
  Block: SkeletonBlock,
  Row: SkeletonRow,
  Group: SkeletonGroup,
};

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.hairline,
    overflow: 'hidden',
  },
});
