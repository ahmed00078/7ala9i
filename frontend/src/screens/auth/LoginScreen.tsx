import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppText } from '../../components/ui/AppText';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { authApi } from '../../api/auth';
import { useLanguage } from '../../contexts/LanguageContext';
import { loginSchema, LoginForm } from '../../utils/validators';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import {
  AuthHeader,
  FloatingInput,
  PressablePremium,
} from '../../components/premium';
import type { AuthScreenProps } from '../../types/navigation';

export function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const { t } = useTranslation();
  const { login } = useAuth();
  const alert = useAlert();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await login(data.identifier, data.password);
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;

      if (status === 403 && detail === 'phone_not_verified') {
        try {
          await authApi.resendOtp(data.identifier, language);
        } catch {
          // Ignore — navigate anyway.
        }
        navigation.navigate('OTPVerification', {
          phone: data.identifier,
          isOwner: false,
        });
        return;
      }

      const isPending = status === 403;
      alert.show({
        type: isPending ? 'warning' : 'error',
        title: isPending ? t('auth.ownerPendingTitle') : t('common.error'),
        message: isPending ? t('auth.loginPending') : t('auth.loginError'),
      });
    } finally {
      setLoading(false);
    }
  };

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
            title={t('auth.loginTitle')}
            subtitle={t('auth.loginSubtitle')}
            onBack={() => navigation.goBack()}
          />

          <View style={styles.form}>
            <Controller
              control={control}
              name="identifier"
              render={({ field: { onChange, value } }) => (
                <FloatingInput
                  testID="login-identifier"
                  label={t('auth.identifier')}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  error={errors.identifier ? t(errors.identifier.message!) : undefined}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <FloatingInput
                  testID="login-password"
                  label={t('auth.password')}
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry
                  autoComplete="password"
                  textContentType="password"
                  error={errors.password ? t(errors.password.message!) : undefined}
                />
              )}
            />

            <Pressable
              onPress={() => navigation.navigate('ForgotPassword')}
              hitSlop={6}
              style={styles.forgot}
            >
              <AppText style={styles.forgotText}>{t('auth.forgotPassword')}</AppText>
            </Pressable>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <PressablePremium
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            pressScale={0.97}
            haptic="medium"
            style={[styles.cta, loading && styles.ctaDisabled]}
          >
            <AppText style={styles.ctaText}>
              {loading ? t('common.loading') : t('auth.login')}
            </AppText>
          </PressablePremium>

          <View style={styles.altRow}>
            <AppText style={styles.altText}>{t('auth.noAccount')} </AppText>
            <Pressable onPress={() => navigation.navigate('Register')} hitSlop={6}>
              <AppText style={styles.altLink}>{t('auth.registerHere')}</AppText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  kav: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 24,
  },
  form: {
    paddingHorizontal: spacing.section,
    gap: 4,
  },
  forgot: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 4,
  },
  forgotText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 13,
    color: colors.accent,
  },
  footer: {
    paddingHorizontal: spacing.section,
    paddingBottom: 12,
    paddingTop: 12,
    gap: 14,
  },
  cta: {
    backgroundColor: colors.ink,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    color: colors.surface,
    letterSpacing: 0.3,
  },
  altRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  altText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.slate,
  },
  altLink: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    color: colors.accent,
  },
});
