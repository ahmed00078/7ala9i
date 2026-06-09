import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText } from '../../components/ui/AppText';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
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

export function OTPVerificationScreen({ route, navigation }: AuthScreenProps<'OTPVerification'>) {
  const { phone } = route.params;
  const { t } = useTranslation();
  const { verifyOtp, resendOtp } = useAuth();
  const alert = useAlert();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const otpRef = useRef<OtpBoxesRef>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const formattedCountdown = useMemo(() => {
    const m = Math.floor(countdown / 60);
    const s = countdown % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }, [countdown]);

  const handleVerify = useCallback(async (override?: string) => {
    const submitted = override ?? code;
    if (submitted.length < CODE_LENGTH) {
      otpRef.current?.shake();
      return;
    }
    setLoading(true);
    try {
      const result = await verifyOtp(phone, submitted);
      if (result.isPending) {
        setPendingMessage(result.message ?? t('auth.ownerPendingDefault'));
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      otpRef.current?.shake();
      setCode('');
      setTimeout(() => otpRef.current?.focus(), 320);
      alert.show({
        type: 'error',
        title: t('common.error'),
        message: detail === 'invalid_otp' ? t('auth.otpInvalid') : t('auth.otpError'),
      });
    } finally {
      setLoading(false);
    }
  }, [code, phone, verifyOtp, t, alert]);

  const handleResend = useCallback(async () => {
    try {
      await resendOtp(phone);
      setCountdown(RESEND_COOLDOWN);
      setCode('');
      otpRef.current?.focus();
      alert.show({ type: 'success', title: t('auth.otpSent'), message: '' });
    } catch {
      alert.show({ type: 'error', title: t('common.error'), message: t('auth.otpResendError') });
    }
  }, [phone, resendOtp, alert, t]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.flex}>
          <AuthHeader
            title={t('auth.otpTitle')}
            subtitle={t('auth.otpSubtitle', { phone })}
            onBack={() => navigation.goBack()}
          />

          <View style={styles.body}>
            <OtpBoxes
              ref={otpRef}
              value={code}
              onChange={setCode}
              onComplete={(c) => handleVerify(c)}
              autoFocus
              disabled={loading}
            />

            <View style={styles.resendRow}>
              {countdown > 0 ? (
                <AppText style={styles.countdownText}>
                  {t('auth.otpResendInTimer', { time: formattedCountdown })}
                </AppText>
              ) : (
                <Pressable onPress={handleResend} hitSlop={6}>
                  <AppText style={styles.resendLink}>{t('auth.otpResend')}</AppText>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <PressablePremium
            onPress={() => handleVerify()}
            disabled={loading || code.length < CODE_LENGTH}
            pressScale={0.97}
            haptic="medium"
            style={[
              styles.cta,
              (loading || code.length < CODE_LENGTH) && styles.ctaDisabled,
            ]}
          >
            <AppText style={styles.ctaText}>
              {loading ? t('common.loading') : t('auth.otpVerify')}
            </AppText>
          </PressablePremium>

          <Pressable
            onPress={() => navigation.navigate('Login')}
            style={styles.backLink}
            hitSlop={6}
          >
            <AppText style={styles.backLinkText}>{t('auth.backToLogin')}</AppText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Owner pending — kept as modal for now (own redesign in §5.20) */}
      <Modal visible={!!pendingMessage} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons name="checkmark-circle" size={48} color={colors.accent} />
            </View>
            <AppText style={styles.modalTitle}>{t('auth.ownerPendingTitle')}</AppText>
            <AppText style={styles.modalMessage}>{pendingMessage}</AppText>
            <PressablePremium
              onPress={() => {
                setPendingMessage(null);
                navigation.navigate('Login');
              }}
              pressScale={0.97}
              haptic="selection"
              style={styles.modalCta}
            >
              <AppText style={styles.ctaText}>{t('auth.ownerPendingButton')}</AppText>
            </PressablePremium>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  kav: { flex: 1 },
  flex: { flex: 1 },
  body: {
    paddingHorizontal: spacing.section,
    paddingTop: 8,
    gap: 24,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 8,
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
    gap: 12,
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
  backLink: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  backLinkText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 13,
    color: colors.slate,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11,14,20,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  modalIcon: { marginBottom: 4 },
  modalTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    lineHeight: 26,
    color: colors.ink,
    textAlign: 'center',
  },
  modalMessage: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: colors.slate,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalCta: {
    backgroundColor: colors.ink,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
});
