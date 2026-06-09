import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { radius as radiusTokens } from '../../theme/spacing';

export type SurfaceVariant = 'raised' | 'sunken' | 'flush' | 'hero';

interface SurfaceProps {
  variant?: SurfaceVariant;
  /** Override the corner radius. Defaults: raised/sunken=card, hero=hero, flush=0. */
  radius?: number;
  /** Override the inner padding. */
  padding?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * The card primitive for the premium redesign (§4.2).
 *
 *  - **raised**: white card + two-layer shadow. The default replacement for `<Card>`.
 *  - **sunken**: warm `surfaceAlt` paper, no shadow. Use for grouped settings rows.
 *  - **flush**: transparent w/ a 0.5px hairline. Use for borderless list rows.
 *  - **hero**: `inkSoft → ink` gradient. The new owner dashboard hero block.
 */
export function Surface({ variant = 'raised', radius, padding, style, children }: SurfaceProps) {
  if (variant === 'hero') {
    return (
      <LinearGradient
        colors={[colors.inkSoft, colors.ink]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.base,
          { borderRadius: radius ?? radiusTokens.hero, padding: padding ?? 24 },
          style,
        ]}
      >
        {children}
      </LinearGradient>
    );
  }

  if (variant === 'flush') {
    return (
      <View
        style={[
          styles.flush,
          { borderRadius: radius ?? 0, padding: padding ?? 16 },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  const variantStyle = variant === 'sunken' ? styles.sunken : styles.raised;
  return (
    <View
      style={[
        styles.base,
        variantStyle,
        { borderRadius: radius ?? radiusTokens.card, padding: padding ?? 16 },
        style,
      ]}
    >
      {/*
        Premium two-layer shadow (§2.6): the View itself owns the *crisp* near
        shadow; the underlay below is rendered by callers when they want a
        secondary diffused shadow (kept opt-in to avoid double draw cost on
        screens with many cards).
       */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  raised: {
    backgroundColor: colors.surface,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sunken: {
    backgroundColor: colors.surfaceAlt,
  },
  flush: {
    backgroundColor: colors.transparent,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
});
