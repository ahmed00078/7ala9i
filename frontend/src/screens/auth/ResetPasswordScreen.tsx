import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { AppText } from '../../components/ui/AppText';
import { useAlert } from '../../contexts/AlertContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { authApi } from '../../api/auth';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import {
  AuthHeader,
  FloatingInput,
  OtpBoxes,
  OtpBoxesRef,
  PressablePremium,
} from '../../components/premium';
import type { AuthScreenProps } from '../../types/navigation';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export function ResetPasswordScreen({ route, navigation }: AuthScreenProps<'ResetPassword'>) {
  const { phone } = route.params;
  const { t } = useTranslation();
  const alert = useAlert();
  const { language } = useLanguage();
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [error, setError] = useState<string | null>(null);

  const otpRef = useRef<OtpBoxesRef>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const cooldownText = useMemo(() => {
    const m = Math.floor(resendCooldown / 60);
    const s = resendCooldown % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }, [resendCooldown]);

  // Auto-redirect to Login 1.5s after success (per plan: §5.10).
  useEffect(() => {
    if (!success) return;
    const id = setTimeout(() => navigation.navigate('Login'), 1500);
    return () => clearTimeout(id);
  }, [success, navigation]);

  const handleResend = useCallback(async () => {
    try {
      await authApi.forgotPassword(phone, language);
      setResendCooldown(RESEND_COOLDOWN);
      alert.show({ type: 'success', title: t('auth.forgotPasswordSent') });
    } catch {
      alert.show({ type: 'error', title: t('common.error'), message: t('errors.server') });
    }
  }, [phone, language, alert, t]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    if (code.length < CODE_LENGTH) {
      otpRef.current?.shake();
      return;
    }
    if (newPassword.length < 6) {
      setError(t('validation.passwordMin'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('validation.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(phone, code, newPassword);
      setSuccess(true);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const isInvalidCode = detail === 'Invalid or expired code';
      if (isInvalidCode) {
        otpRef.current?.shake();
        setCode('');
        setTimeout(() => otpRef.current?.focus(), 320);
      }
      alert.show({
        type: 'error',
        title: t('common.error'),
        message: isInvalidCode ? t('auth.otpInvalid') : t('auth.resetPasswordError'),
      });
    } finally {
      setLoading(false);
    }
  }, [code, newPassword, confirmPassword, phone, alert, t]);

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.successWrap}>
          <Animated.View entering={ZoomIn.duration(360)} style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={72} color={colors.accent} />
          </Animated.View>
          <Animated.View entering={FadeIn.delay(160).duration(280)}>
            <AppText style={styles.successTitle}>{t('auth.resetPasswordSuccess')}</AppText>
            <AppText style={styles.successHint}>{t('auth.resetSuccessRedirect')}</AppText>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AuthHeader
            title={t('auth.resetPasswordTitle')}
            subtitle={t('auth.resetPasswordSubtitle')}
            onBack={() => navigation.goBack()}
          />

          <View style={styles.body}>
            <AppText style={styles.sectionLabel}>{t('auth.otpLabel')}</AppText>
            <OtpBoxes
              ref={otpRef}
              value={code}
              onChange={setCode}
            />

            <View style={styles.resendRow}>
              {resendCooldown > 0 ? (
                <AppText style={styles.countdownText}>
                  {t('auth.otpResendInTimer', { time: cooldownText })}
                </AppText>
              ) : (
                <Pressable onPress={handleResend} hitSlop={6}>
                  <AppText style={styles.resendLink}>{t('auth.otpResend')}</AppText>
                </Pressable>
              )}
            </View>

            <View style={styles.passwords}>
              <FloatingInput
                label={t('auth.newPassword')}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoComplete="password-new"
                textContentType="newPassword"
              />
              <FloatingInput
                label={t('auth.confirmNewPassword')}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="password-new"
                textContentType="newPassword"
                error={error ?? undefined}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <PressablePremium
            onPress={handleSubmit}
            disabled={loading || code.length < CODE_LENGTH || !newPassword || !confirmPassword}
            pressScale={0.97}
            haptic="medium"
            style={[
              styles.cta,
              (loading || code.length < CODE_LENGTH) && styles.ctaDisabled,
            ]}
          >
            <AppText style={styles.ctaText}>
              {loading ? t('common.loading') : t('auth.resetPasswordButton')}
            </AppText>
          </PressablePremium>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  kav: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingTop: 8, paddingBottom: 24 },
  body: {
    paddingHorizontal: spacing.section,
    gap: 16,
  },
  sectionLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.slate,
    marginBottom: -4,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  countdownText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.slate,
    fontVariant: ['tabular-nums'],
  },
  resendLink: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    color: colors.accent,
  },
  passwords: { gap: 4 },
  footer: {
    paddingHorizontal: spacing.section,
    paddingBottom: 12,
    paddingTop: 12,
  },
  cta: {
    backgroundColor: colors.ink,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.45 },
  ctaText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    color: colors.surface,
    letterSpacing: 0.3,
  },
  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.section,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    lineHeight: 28,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 6,
  },
  successHint: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: colors.slate,
    textAlign: 'center',
  },
});
