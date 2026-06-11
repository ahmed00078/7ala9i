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
import { useTranslation } from 'react-i18next';
import { AppText } from '../../components/ui/AppText';
import { useAlert } from '../../contexts/AlertContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { authApi } from '../../api/auth';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import {
  AuthHeader,
  OtpBoxes,
  OtpBoxesRef,
  PressablePremium,
} from '../../components/premium';
import type { AuthScreenProps } from '../../types/navigation';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;

/**
 * Step 1 of forgot-password flow: collect the 6-digit code we sent by SMS.
 * The code is not verified server-side here — we only validate length and pass
 * the code forward to the SetNewPassword step. On the password step, if the
 * code turns out to be invalid, we bounce back here.
 */
export function ResetPasswordScreen({ route, navigation }: AuthScreenProps<'ResetPassword'>) {
  const { phone, clearCode } = route.params;
  const { t } = useTranslation();
  const alert = useAlert();
  const { language } = useLanguage();
  const [code, setCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [verifying, setVerifying] = useState(false);
  const otpRef = useRef<OtpBoxesRef>(null);

  // When bounced back from SetNewPassword with an invalid code, clear the boxes.
  useEffect(() => {
    if (!clearCode) return;
    setCode('');
    setTimeout(() => otpRef.current?.focus(), 100);
    navigation.setParams({ clearCode: false });
  }, [clearCode, navigation]);

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

  const handleResend = useCallback(async () => {
    try {
      await authApi.forgotPassword(phone, language);
      setResendCooldown(RESEND_COOLDOWN);
      alert.show({ type: 'success', title: t('auth.forgotPasswordSent') });
    } catch {
      alert.show({ type: 'error', title: t('common.error'), message: t('errors.server') });
    }
  }, [phone, language, alert, t]);

  const handleContinue = useCallback(async () => {
    if (code.length < CODE_LENGTH) {
      otpRef.current?.shake();
      return;
    }
    setVerifying(true);
    try {
      // Verify the code with the backend BEFORE showing the new-password screen
      // so the user can't enter a fresh password against an invalid OTP.
      await authApi.verifyResetCode(phone, code);
      navigation.navigate('SetNewPassword', { phone, code });
    } catch (err: any) {
      otpRef.current?.shake();
      setCode('');
      setTimeout(() => otpRef.current?.focus(), 320);
      alert.show({
        type: 'error',
        title: t('common.error'),
        message: t('auth.otpInvalid'),
      });
    } finally {
      setVerifying(false);
    }
  }, [code, navigation, phone, alert, t]);

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
            subtitle={t('auth.resetPasswordSubtitle', { phone })}
            onBack={() => navigation.goBack()}
          />

          <View style={styles.body}>
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
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <PressablePremium
            onPress={handleContinue}
            disabled={code.length < CODE_LENGTH || verifying}
            pressScale={0.97}
            haptic="medium"
            style={[
              styles.cta,
              (code.length < CODE_LENGTH || verifying) && styles.ctaDisabled,
            ]}
          >
            <AppText style={styles.ctaText}>
              {verifying ? t('common.loading') : t('auth.verifyCodeContinue')}
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
  resendRow: {
    alignItems: 'center',
    marginTop: 12,
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
});
