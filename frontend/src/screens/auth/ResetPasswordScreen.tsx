import React, { useState, useRef, useEffect } from 'react';
import {
  View, StyleSheet, KeyboardAvoidingView, Platform,
  TouchableOpacity, TextInput,
} from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAlert } from '../../contexts/AlertContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { authApi } from '../../api/auth';
import { colors } from '../../theme/colors';
import type { AuthScreenProps } from '../../types/navigation';

const CODE_LENGTH = 6;

export function ResetPasswordScreen({ route, navigation }: AuthScreenProps<'ResetPassword'>) {
  const { phone } = route.params;
  const { t } = useTranslation();
  const alert = useAlert();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    if (text && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    try {
      await authApi.forgotPassword(phone, language);
      setResendCooldown(60);
      alert.show({ type: 'success', title: t('auth.forgotPasswordSent') });
    } catch {
      alert.show({ type: 'error', title: t('common.error'), message: t('errors.server') });
    }
  };

  const handleSubmit = async () => {
    const fullCode = code.join('');
    if (fullCode.length < CODE_LENGTH) {
      alert.show({ type: 'error', title: t('auth.otpIncomplete') });
      return;
    }
    if (newPassword.length < 6) {
      alert.show({ type: 'error', title: t('validation.passwordMin') });
      return;
    }
    if (newPassword !== confirmPassword) {
      alert.show({ type: 'error', title: t('validation.passwordMismatch') });
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(phone, fullCode, newPassword);
      alert.show({
        type: 'success',
        title: t('auth.resetPasswordSuccess'),
      });
      navigation.navigate('Login');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      alert.show({
        type: 'error',
        title: t('common.error'),
        message: detail === 'Invalid or expired code'
          ? t('auth.otpInvalid')
          : t('auth.resetPasswordError'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Navy hero */}
        <View style={styles.hero}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.logoBox}>
            <Ionicons name="shield-checkmark" size={28} color={colors.accent} />
          </View>
          <Text style={styles.heroTitle}>{t('auth.resetPasswordTitle')}</Text>
          <Text style={styles.heroSubtitle}>{t('auth.resetPasswordSubtitle')}</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          {/* OTP row */}
          <Text style={styles.otpLabel}>{t('auth.otpLabel')}</Text>
          <View style={styles.codeRow}>
            {code.map((digit, i) => (
              <TextInput
                key={i}
                ref={(ref) => { inputRefs.current[i] = ref; }}
                style={[styles.codeInput, digit ? styles.codeInputFilled : null]}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(text) => handleCodeChange(text, i)}
                onKeyPress={({ nativeEvent }) => handleCodeKeyPress(nativeEvent.key, i)}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Resend */}
          <TouchableOpacity
            onPress={handleResend}
            disabled={resendCooldown > 0}
            style={styles.resendBtn}
          >
            <Text style={[styles.resendText, resendCooldown > 0 && styles.resendDisabled]}>
              {resendCooldown > 0
                ? `${t('auth.resendIn')} ${resendCooldown}s`
                : t('auth.resendOtp')}
            </Text>
          </TouchableOpacity>

          <Input
            label={t('auth.newPassword')}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <Input
            label={t('auth.confirmNewPassword')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <Button
            title={t('auth.resetPasswordButton')}
            onPress={handleSubmit}
            loading={loading}
          />
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1, backgroundColor: colors.navy },
  container: { flex: 1, backgroundColor: colors.navy },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 48,
    paddingBottom: 24,
  },
  backBtn: {
    position: 'absolute',
    top: 12,
    left: 20,
    padding: 4,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: 'Outfit-Bold',
    color: colors.white,
    marginBottom: 6,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
  },
  otpLabel: {
    fontSize: 13,
    fontFamily: 'Outfit-SemiBold',
    color: colors.grayDark,
    marginBottom: 10,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 8,
  },
  codeInput: {
    width: 46,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    textAlign: 'center',
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    color: colors.black,
    backgroundColor: colors.white,
  },
  codeInputFilled: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  resendBtn: { alignSelf: 'center', marginBottom: 16 },
  resendText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: colors.accent },
  resendDisabled: { color: colors.gray },
});
