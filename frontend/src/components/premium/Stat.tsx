import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { TextInput } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { AppText } from '../ui/AppText';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface CommonProps {
  value: number;
  label: string;
  /** Optional unit appended to the number, e.g. " MRU" or " min". */
  unit?: string;
  /**
   * Format the number (defaults to integer with locale grouping).
   * MUST be a worklet — runs on the UI thread inside useAnimatedProps.
   * Mark it with the `'worklet'` directive at the top of the function body.
   */
  format?: (n: number) => string;
  /** Animate count-up from 0 on mount. Default `true`. */
  animate?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** §4.3 — the big tabular number used 1x per screen (e.g. today's revenue). */
function StatHeadline({ value, label, unit, format, animate = true, style }: CommonProps) {
  const display = useAnimatedNumber(value, animate);
  const fmt = format ?? defaultIntegerFormat;

  const animatedProps = useAnimatedProps(() => {
    return {
      // TextInput's `text` prop is one of the few that Reanimated can drive
      // on the UI thread — this avoids re-rendering every frame.
      text: `${fmt(display.value)}${unit ?? ''}`,
    } as any;
  });

  return (
    <View style={[styles.headlineContainer, style]}>
      <AnimatedTextInput
        editable={false}
        defaultValue={`${fmt(animate ? 0 : value)}${unit ?? ''}`}
        animatedProps={animatedProps}
        style={[typography.display, styles.headlineNumber, styles.tabularNums]}
      />
      <AppText style={[typography.capsLabel, styles.headlineLabel]}>{label}</AppText>
    </View>
  );
}

interface InlineProps extends CommonProps {
  /** Show a hairline divider underneath. Default `true` — disable on the last row. */
  divider?: boolean;
}

/** §4.3 — compact row: label left, number right. No icon tile. */
function StatInline({ value, label, unit, format, animate = true, divider = true, style }: InlineProps) {
  const display = useAnimatedNumber(value, animate);
  const fmt = format ?? defaultIntegerFormat;

  const animatedProps = useAnimatedProps(() => ({
    text: `${fmt(display.value)}${unit ?? ''}`,
  } as any));

  return (
    <View
      style={[
        styles.inlineRow,
        divider && styles.inlineDivider,
        style,
      ]}
    >
      <AppText style={[typography.capsLabel, styles.inlineLabel]}>{label}</AppText>
      <AnimatedTextInput
        editable={false}
        defaultValue={`${fmt(animate ? 0 : value)}${unit ?? ''}`}
        animatedProps={animatedProps}
        style={[styles.inlineNumber, styles.tabularNums]}
      />
    </View>
  );
}

export const Stat = {
  Headline: StatHeadline,
  Inline: StatInline,
};

function useAnimatedNumber(target: number, animate: boolean) {
  const value = useSharedValue(animate ? 0 : target);
  useEffect(() => {
    value.value = withTiming(target, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [target, value]);
  return value;
}

function defaultIntegerFormat(n: number) {
  'worklet';
  // Worklet-safe digit grouping (Intl/toLocaleString isn't reliable on the
  // UI thread). Groups every 3 digits with a narrow non-breaking space,
  // matching French/Arabic number conventions used in Mauritania.
  const rounded = Math.round(n);
  const negative = rounded < 0;
  const digits = String(negative ? -rounded : rounded);
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) {
      out += ' ';
    }
    out += digits[i];
  }
  return negative ? '-' + out : out;
}

const styles = StyleSheet.create({
  headlineContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  headlineNumber: {
    color: colors.ink,
    padding: 0,
    margin: 0,
    includeFontPadding: false,
  },
  headlineLabel: {
    color: colors.slate,
    marginTop: 6,
  },
  tabularNums: {
    fontVariant: ['tabular-nums'],
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  inlineDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  inlineLabel: {
    color: colors.slate,
  },
  inlineNumber: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 17,
    lineHeight: 22,
    color: colors.ink,
    padding: 0,
    margin: 0,
    includeFontPadding: false,
  },
});
