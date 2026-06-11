import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { AppText as Text } from './AppText';
import { colors } from '../../theme/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, style, testID }: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';

  return (
    <TouchableOpacity
      testID={testID}
      style={[
        styles.base,
        isPrimary ? styles.primary : isSecondary ? styles.secondary : styles.outline,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.surface : colors.ink} />
      ) : (
        <Text style={[styles.text, !isPrimary && styles.textAccent]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  primary: {
    backgroundColor: colors.ink,
  },
  secondary: {
    backgroundColor: colors.accentSoft,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    fontSize: 15,
    fontFamily: 'Outfit-SemiBold',
    color: colors.surface,
    letterSpacing: 0.3,
  },
  textAccent: {
    color: colors.ink,
  },
});
