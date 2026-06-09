import React, { forwardRef, useCallback, useState } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  Pressable,
  I18nManager,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { AppText } from '../ui/AppText';

/**
 * §5.10 — flush row with a floating label. No box, no fill. A hairline rules
 * the bottom; it tints to accent on focus and danger on error. The label
 * lifts + shrinks the moment the field is focused or has a value.
 *
 * The eye toggle for password fields fades in only after the user starts
 * typing (per plan: "show/hide eye that fades in only after typing starts").
 */
export interface FloatingInputProps extends Omit<TextInputProps, 'placeholder'> {
  label: string;
  error?: string;
  /** Optional small caption beneath the field when there is no error. */
  helper?: string;
  /** Decoration before the value (e.g. country chip). Not focusable. */
  leading?: React.ReactNode;
  /** Decoration after the value (e.g. custom icon). Eye is auto-managed when secureTextEntry. */
  trailing?: React.ReactNode;
}

export const FloatingInput = forwardRef<TextInput, FloatingInputProps>(function FloatingInput(
  { label, error, helper, leading, trailing, secureTextEntry, value, onChangeText, onFocus, onBlur, style, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const filled = (value ?? '').length > 0;
  const isPassword = secureTextEntry === true;
  const showEye = isPassword && filled;

  const lift = useSharedValue(filled ? 1 : 0);
  const accent = useSharedValue(0); // 0 = idle, 1 = focused, 2 = error

  React.useEffect(() => {
    lift.value = withTiming(focused || filled ? 1 : 0, { duration: 160, easing: Easing.out(Easing.cubic) });
  }, [focused, filled, lift]);

  React.useEffect(() => {
    accent.value = withTiming(error ? 2 : focused ? 1 : 0, { duration: 140 });
  }, [focused, error, accent]);

  const labelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -lift.value * 18 },
    ],
    fontSize: 15 - lift.value * 4, // 15 → 11
  }));

  const labelColor = useAnimatedStyle(() => ({
    color: interpolateColor(
      accent.value,
      [0, 1, 2],
      [colors.slateSoft, colors.accent, colors.danger],
    ),
  }));

  const ruleStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      accent.value,
      [0, 1, 2],
      [colors.hairline, colors.accent, colors.danger],
    ),
    height: 1 + (accent.value > 0 ? 0.5 : 0),
  }));

  const eyeOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(showEye ? 1 : 0, { duration: 140 }),
  }));

  const handleFocus = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
      setFocused(true);
      onFocus?.(e);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
      setFocused(false);
      onBlur?.(e);
    },
    [onBlur],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {leading != null && <View style={styles.leading}>{leading}</View>}
        <View style={styles.fieldCol}>
          <Animated.View style={[styles.labelWrap, labelStyle]} pointerEvents="none">
            <Animated.Text
              style={[
                styles.labelText,
                labelColor,
                I18nManager.isRTL && { textAlign: 'right' },
              ]}
              numberOfLines={1}
            >
              {label}
            </Animated.Text>
          </Animated.View>
          <TextInput
            ref={ref}
            style={[styles.input, style]}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            secureTextEntry={isPassword ? hidden : false}
            placeholderTextColor={colors.transparent}
            selectionColor={colors.accent}
            {...rest}
          />
        </View>
        {isPassword ? (
          <Animated.View style={[styles.trailing, eyeOpacity]} pointerEvents={showEye ? 'auto' : 'none'}>
            <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8}>
              <Ionicons
                name={hidden ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={colors.slateSoft}
              />
            </Pressable>
          </Animated.View>
        ) : trailing != null ? (
          <View style={styles.trailing}>{trailing}</View>
        ) : null}
      </View>
      <Animated.View style={[styles.rule, ruleStyle]} />
      {error ? (
        <AppText style={[typography.caption, styles.error]} numberOfLines={2}>
          {error}
        </AppText>
      ) : helper ? (
        <AppText style={[typography.caption, styles.helper]} numberOfLines={2}>
          {helper}
        </AppText>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 48,
  },
  leading: {
    paddingBottom: 10,
    marginEnd: 12,
  },
  fieldCol: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingTop: 16,
  },
  labelWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
  },
  labelText: {
    fontFamily: 'Outfit-Regular',
    color: colors.slateSoft,
    textAlign: 'left',
  },
  input: {
    fontFamily: 'Outfit-Medium',
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
    paddingVertical: 6,
    paddingHorizontal: 0,
    textAlign: 'auto',
  },
  trailing: {
    paddingBottom: 8,
    marginStart: 12,
    minWidth: 24,
    alignItems: 'flex-end',
  },
  rule: {
    height: 1,
    backgroundColor: colors.hairline,
    marginTop: 4,
  },
  error: {
    color: colors.danger,
    marginTop: 6,
    minHeight: 16,
  },
  helper: {
    color: colors.slateSoft,
    marginTop: 6,
    minHeight: 16,
  },
  spacer: {
    height: 18,
    marginTop: 6,
  },
});
