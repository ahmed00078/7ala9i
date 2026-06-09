import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { AppText } from '../ui/AppText';
import { colors } from '../../theme/colors';

interface InkPinProps {
  initial?: string;
  selected?: boolean;
  size?: number;
}

/**
 * §5.11 — ink teardrop map marker. Replaces the default Google blue dot.
 * Selected state scales up + lifts via a translateY so the active salon
 * reads as foregrounded against the map.
 */
export function InkPin({ initial, selected = false, size = 40 }: InkPinProps) {
  const scale = useSharedValue(selected ? 1.15 : 1);
  const lift = useSharedValue(selected ? -6 : 0);

  React.useEffect(() => {
    scale.value = withSpring(selected ? 1.15 : 1, { mass: 0.4, damping: 14, stiffness: 200 });
    lift.value = withSpring(selected ? -8 : 0, { mass: 0.4, damping: 14, stiffness: 200 });
  }, [selected, scale, lift]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scale: scale.value }],
  }));

  const dotSize = size;
  const stemHeight = size * 0.32;

  return (
    <Animated.View style={[styles.wrap, animatedStyle]}>
      <View
        style={[
          styles.bubble,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: selected ? colors.accent : colors.ink,
          },
        ]}
      >
        <View
          style={[
            styles.inner,
            {
              width: dotSize - 8,
              height: dotSize - 8,
              borderRadius: (dotSize - 8) / 2,
              backgroundColor: selected ? colors.surface : colors.surface,
            },
          ]}
        >
          <AppText
            style={{
              fontFamily: 'Outfit-Bold',
              fontSize: dotSize * 0.36,
              color: selected ? colors.accent : colors.ink,
              lineHeight: dotSize * 0.42,
            }}
          >
            {(initial || '?').toUpperCase()}
          </AppText>
        </View>
      </View>
      <View
        style={[
          styles.stem,
          {
            borderTopColor: selected ? colors.accent : colors.ink,
            borderTopWidth: stemHeight,
            borderLeftWidth: stemHeight * 0.5,
            borderRightWidth: stemHeight * 0.5,
            marginTop: -2,
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stem: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
