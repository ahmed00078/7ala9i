import React, { forwardRef } from 'react';
import { View, StyleSheet, TextInput, I18nManager } from 'react-native';
import { FloatingInput, FloatingInputProps } from './FloatingInput';
import { AppText } from '../ui/AppText';
import { colors } from '../../theme/colors';

/**
 * §5.10 — phone field with a non-removable `+222` chip prefix. The chip sits
 * flush against the value and is rendered with explicit LTR direction so it
 * always reads "+222 12345678" regardless of UI language.
 */
export const PhoneInput = forwardRef<TextInput, Omit<FloatingInputProps, 'keyboardType' | 'leading'>>(function PhoneInput(
  { value, onChangeText, ...rest },
  ref,
) {
  const handleChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '').slice(0, 8);
    onChangeText?.(digitsOnly);
  };

  return (
    <FloatingInput
      ref={ref}
      value={value}
      onChangeText={handleChange}
      keyboardType="phone-pad"
      autoComplete="tel"
      textContentType="telephoneNumber"
      maxLength={8}
      leading={
        <View style={styles.chip}>
          <AppText style={styles.chipText} numberOfLines={1}>+222</AppText>
        </View>
      }
      style={I18nManager.isRTL ? styles.inputLtr : undefined}
      {...rest}
    />
  );
});

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  inputLtr: {
    writingDirection: 'ltr',
    textAlign: 'left',
  },
});
