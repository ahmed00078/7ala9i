import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { AppText } from '../../components/ui/AppText';
import { useAlert } from '../../contexts/AlertContext';
import { authApi } from '../../api/auth';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import {
  AuthHeader,
  FloatingInput,
  PressablePremium,
} from '../../components/premium';
import type { AuthScreenProps } from '../../types/navigation';

/**
 * Step 2 of forgot-password flow: choose the new password. The 6-digit code is
 * threaded through from `ResetPasswordScreen` as a route param so we can call
 * `authApi.resetPassword(phone, code, newPassword)` in one go. If the server
 * returns "invalid code" we bounce back to step 1 so the user can re-enter it.
 */
export function SetNewPasswordScreen({ route, navigation }: AuthScreenProps<'SetNewPassword'>) {
  const { phone, code } = route.params;
  const { t } = useTranslation();
  const alert = useAlert();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!success) return;
    const id = setTimeout(() => navigation.navigate('Login'), 1500);
    return () => clearTimeout(id);
  }, [success, navigation]);

  const handleSubmit = useCallback(async () => {
    setError(null);
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
        alert.show({
          type: 'error',
          title: t('common.error'),
          message: t('auth.otpInvalid'),
        });
        // Code is bad — send the user back to step 1 to re-enter it.
        navigation.goBack();
        return;
      }
      alert.show({
        type: 'error',
        title: t('common.error'),
        message: t('auth.resetPasswordError'),
      });
    } finally {
      setLoading(false);
    }
  }, [newPassword, confirmPassword, phone, code, alert, t, navigation]);

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

  const disabled = loading || newPassword.length < 6 || !confirmPassword;

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
            title={t('auth.setNewPasswordTitle')}
            subtitle={t('auth.setNewPasswordSubtitle')}
            onBack={() => navigation.goBack()}
          />

          <View style={styles.body}>
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
        </ScrollView>

        <View style={styles.footer}>
          <PressablePremium
            onPress={handleSubmit}
            disabled={disabled}
            pressScale={0.97}
            haptic="medium"
            style={[styles.cta, disabled && styles.ctaDisabled]}
          >
            <AppText style={styles.ctaText}>
              {loading ? t('common.loading') : t('auth.setNewPasswordButton')}
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
    gap: 4,
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
