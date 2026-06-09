import React, { useState } from 'react';
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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppText } from '../../components/ui/AppText';
import { useAlert } from '../../contexts/AlertContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { authApi } from '../../api/auth';
import { phoneRegex } from '../../utils/validators';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import {
  AuthHeader,
  PhoneInput,
  PressablePremium,
} from '../../components/premium';
import type { AuthScreenProps } from '../../types/navigation';

const schema = z.object({
  phone: z.string().min(1, 'validation.phoneRequired').regex(phoneRegex, 'validation.phoneInvalid'),
});
type FormData = z.infer<typeof schema>;

export function ForgotPasswordScreen({ navigation }: AuthScreenProps<'ForgotPassword'>) {
  const { t } = useTranslation();
  const alert = useAlert();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await authApi.forgotPassword(data.phone, language);
      alert.show({
        type: 'success',
        title: t('auth.forgotPasswordSent'),
      });
      navigation.navigate('ResetPassword', { phone: data.phone });
    } catch {
      alert.show({
        type: 'error',
        title: t('common.error'),
        message: t('errors.server'),
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
            title={t('auth.forgotPasswordTitle')}
            subtitle={t('auth.forgotPasswordSubtitle')}
            onBack={() => navigation.goBack()}
          />

          <View style={styles.form}>
            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, value } }) => (
                <PhoneInput
                  label={t('auth.phone')}
                  value={value}
                  onChangeText={onChange}
                  error={errors.phone ? t(errors.phone.message!) : undefined}
                />
              )}
            />
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
              {loading ? t('common.loading') : t('auth.forgotPasswordSend')}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  kav: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingTop: 8, paddingBottom: 24 },
  form: { paddingHorizontal: spacing.section, gap: 4 },
  footer: { paddingHorizontal: spacing.section, paddingBottom: 12, paddingTop: 12, gap: 12 },
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
  backLink: { alignItems: 'center', paddingVertical: 6 },
  backLinkText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 13,
    color: colors.slate,
  },
});
