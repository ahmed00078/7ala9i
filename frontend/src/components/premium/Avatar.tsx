import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '../../theme/colors';
import { AppText } from '../ui/AppText';

interface AvatarProps {
  /** Full name (e.g. "Mohamed El-Hadj"). Used to derive monogram + earth-tone. */
  name?: string | null;
  /** Optional image URI; falls back to monogram if missing or fails to load. */
  uri?: string | null;
  /** Diameter in pixels. */
  size?: number;
  /** Verified salon owner ring (§4.6). */
  verified?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Six muted earth tones, deterministically picked per name. No rainbow. */
const EARTH_TONES = [
  { bg: '#D8C7A7', ink: '#5C4A28' }, // sand
  { bg: '#C58E73', ink: '#5B2F1C' }, // terracotta
  { bg: '#A6B19A', ink: '#2F4030' }, // sage
  { bg: '#9CA4AE', ink: '#262C36' }, // slate
  { bg: '#D1A55C', ink: '#5A3C0F' }, // ochre
  { bg: '#B57B5A', ink: '#4A2616' }, // rust
] as const;

export function Avatar({ name, uri, size = 40, verified, style }: AvatarProps) {
  const initials = deriveInitials(name);
  const tone = EARTH_TONES[hashStringToIndex(name ?? 'guest', EARTH_TONES.length)];
  const ringWidth = verified ? 2 : 0;
  const outerSize = size + (verified ? 6 : 0);

  const innerCircle = (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tone.bg,
        },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <AppText
          style={{
            fontFamily: 'Outfit-SemiBold',
            fontSize: size * 0.4,
            color: tone.ink,
          }}
        >
          {initials}
        </AppText>
      )}
    </View>
  );

  if (!verified) return <View style={style}>{innerCircle}</View>;

  return (
    <View
      style={[
        styles.ringWrap,
        {
          width: outerSize,
          height: outerSize,
          borderRadius: outerSize / 2,
          borderWidth: ringWidth,
          borderColor: colors.accent,
        },
        style,
      ]}
    >
      {innerCircle}
    </View>
  );
}

function deriveInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function hashStringToIndex(input: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % modulo;
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
