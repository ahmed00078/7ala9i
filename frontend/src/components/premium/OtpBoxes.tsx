import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, TextInput, StyleSheet, NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';

const CODE_LENGTH = 6;

export interface OtpBoxesRef {
  /** Trigger the shake + clear, e.g. when the server rejects the code. */
  shake: () => void;
  /** Programmatically focus the first box. */
  focus: () => void;
}

interface OtpBoxesProps {
  /** Current 0–6 char code. Parent owns the state. */
  value: string;
  onChange: (next: string) => void;
  /** Fires as soon as the 6th digit is entered. */
  onComplete?: (code: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}

/**
 * §5.10 — six flush boxes that auto-advance, support backspace navigation,
 * accept SMS-autofill on Android (first box wired with `autoComplete="sms-otp"`),
 * and shake when the parent calls `ref.current.shake()`.
 *
 * Visual: idle box has a 1.5pt hairline; active box (the one currently focused
 * or the first empty box) gets an accent border; filled boxes get an ink fill
 * with white digits.
 */
export const OtpBoxes = forwardRef<OtpBoxesRef, OtpBoxesProps>(function OtpBoxes(
  { value, onChange, onComplete, autoFocus, disabled },
  ref,
) {
  const inputs = useRef<(TextInput | null)[]>([]);
  const [focusIdx, setFocusIdx] = useState(0);

  const shakeX = useSharedValue(0);

  const digits = useMemo(() => {
    const arr = new Array(CODE_LENGTH).fill('');
    for (let i = 0; i < Math.min(value.length, CODE_LENGTH); i++) arr[i] = value[i];
    return arr;
  }, [value]);

  useImperativeHandle(ref, () => ({
    shake: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      shakeX.value = withSequence(
        withTiming(-10, { duration: 60, easing: Easing.linear }),
        withTiming(10, { duration: 60, easing: Easing.linear }),
        withTiming(-7, { duration: 60, easing: Easing.linear }),
        withTiming(7, { duration: 60, easing: Easing.linear }),
        withSpring(0, { mass: 0.4, damping: 14, stiffness: 220 }),
      );
    },
    focus: () => inputs.current[0]?.focus(),
  }));

  useEffect(() => {
    if (autoFocus) {
      const handle = setTimeout(() => inputs.current[0]?.focus(), 250);
      return () => clearTimeout(handle);
    }
  }, [autoFocus]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const handleChange = useCallback(
    (text: string, idx: number) => {
      // Filter to digits, support multi-char paste in any box.
      const onlyDigits = text.replace(/[^0-9]/g, '');
      if (!onlyDigits.length) {
        const next = digits.slice();
        next[idx] = '';
        const code = next.join('');
        onChange(code);
        return;
      }
      if (onlyDigits.length === 1) {
        const next = digits.slice();
        next[idx] = onlyDigits;
        const code = next.join('');
        onChange(code);
        Haptics.selectionAsync().catch(() => undefined);
        if (idx < CODE_LENGTH - 1) {
          inputs.current[idx + 1]?.focus();
        } else if (code.length === CODE_LENGTH) {
          onComplete?.(code);
        }
        return;
      }
      // Paste or autofill — distribute starting at the current box.
      const merged = digits.slice();
      for (let i = 0; i < onlyDigits.length && idx + i < CODE_LENGTH; i++) {
        merged[idx + i] = onlyDigits[i];
      }
      const code = merged.join('');
      onChange(code);
      const lastFilled = Math.min(idx + onlyDigits.length, CODE_LENGTH) - 1;
      const target = Math.min(lastFilled + 1, CODE_LENGTH - 1);
      inputs.current[target]?.focus();
      if (code.length === CODE_LENGTH) {
        onComplete?.(code);
      }
    },
    [digits, onChange, onComplete],
  );

  const handleKeyPress = useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>, idx: number) => {
      if (e.nativeEvent.key === 'Backspace') {
        if (!digits[idx] && idx > 0) {
          inputs.current[idx - 1]?.focus();
          const next = digits.slice();
          next[idx - 1] = '';
          onChange(next.join('').replace(/\s+$/g, ''));
        }
      }
    },
    [digits, onChange],
  );

  const activeIdx = digits.findIndex((d: string) => !d);
  const liveIdx = activeIdx === -1 ? CODE_LENGTH - 1 : activeIdx;

  return (
    <Animated.View style={[styles.row, containerStyle]}>
      {digits.map((d: string, i: number) => {
        const filled = Boolean(d);
        const isActive = !filled && (focusIdx === i || liveIdx === i);
        return (
          <View
            key={i}
            style={[
              styles.box,
              filled && styles.boxFilled,
              isActive && styles.boxActive,
            ]}
          >
            <TextInput
              ref={(r) => { inputs.current[i] = r; }}
              value={d}
              onChangeText={(t) => handleChange(t, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              onFocus={() => setFocusIdx(i)}
              keyboardType="number-pad"
              maxLength={i === 0 ? CODE_LENGTH : 1}
              autoComplete={i === 0 ? 'sms-otp' : 'off'}
              textContentType={i === 0 ? 'oneTimeCode' : 'none'}
              importantForAutofill={i === 0 ? 'yes' : 'no'}
              editable={!disabled}
              selectionColor={colors.accent}
              caretHidden
              style={[
                styles.input,
                filled ? styles.inputFilled : styles.inputIdle,
              ]}
            />
          </View>
        );
      })}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  box: {
    flex: 1,
    aspectRatio: 0.82,
    maxWidth: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  boxActive: {
    borderColor: colors.accent,
    borderWidth: 2,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  boxFilled: {
    borderColor: colors.ink,
    backgroundColor: colors.ink,
  },
  input: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    paddingVertical: 0,
  },
  inputIdle: {
    color: colors.ink,
  },
  inputFilled: {
    color: colors.surface,
  },
});
