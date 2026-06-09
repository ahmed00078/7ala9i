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
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppText } from '../../components/ui/AppText';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { registerSchema, RegisterForm } from '../../utils/validators';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import {
  AuthHeader,
  FloatingInput,
  PhoneInput,
  PressablePremium,
} from '../../components/premium';
import type { AuthScreenProps } from '../../types/navigation';

const ROLE_OPTIONS: { value: 'client' | 'owner'; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'client', labelKey: 'auth.roles.client', icon: 'person-outline' },
  { value: 'owner', labelKey: 'auth.roles.owner', icon: 'storefront-outline' },
];

export function RegisterScreen({ navigation }: AuthScreenProps<'Register'>) {
  const { t } = useTranslation();
  const { register } = useAuth();
  const alert = useAlert();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'client',
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      const result = await register({
        phone: data.phone,
        email: data.email || undefined,
        password: data.password,
        first_name: data.firstName,
        last_name: data.lastName,
        role: data.role,
        language,
      });

      if (result.requiresVerification) {
        navigation.navigate('OTPVerification', {
          phone: data.phone,
          isOwner: data.role === 'owner',
        });
      }
    } catch {
      alert.show({
        type: 'error',
        title: t('common.error'),
        message: t('auth.registerError'),
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
            title={t('auth.registerTitle')}
            subtitle={t('auth.registerSubtitle')}
            onBack={() => navigation.goBack()}
          />

          <View style={styles.form}>
            {/* Role segmented pill */}
            <View style={styles.rolePill}>
              {ROLE_OPTIONS.map((r) => {
                const active = selectedRole === r.value;
                return (
                  <PressablePremium
                    key={r.value}
                    onPress={() => setValue('role', r.value)}
                    haptic="selection"
                    pressScale={0.98}
                    style={[styles.roleItem, active && styles.roleItemActive]}
                  >
                    <Ionicons
                      name={r.icon}
                      size={16}
                      color={active ? colors.surface : colors.slate}
                    />
                    <AppText
                      style={[styles.roleText, active && styles.roleTextActive]}
                      numberOfLines={1}
                    >
                      {t(r.labelKey)}
                    </AppText>
                  </PressablePremium>
                );
              })}
            </View>

            {selectedRole === 'owner' && (
              <View style={styles.ownerNote}>
                <Ionicons name="information-circle-outline" size={16} color={colors.accentInk} />
                <AppText style={styles.ownerNoteText} numberOfLines={3}>
                  {t('auth.ownerInfo')}
                </AppText>
              </View>
            )}

            <Controller
              control={control}
              name="firstName"
              render={({ field: { onChange, value } }) => (
                <FloatingInput
                  label={t('auth.firstName')}
                  value={value}
                  onChangeText={onChange}
                  autoCapitalize="words"
                  autoComplete="given-name"
                  textContentType="givenName"
                  error={errors.firstName ? t(errors.firstName.message!) : undefined}
                />
              )}
            />

            <Controller
              control={control}
              name="lastName"
              render={({ field: { onChange, value } }) => (
                <FloatingInput
                  label={t('auth.lastName')}
                  value={value}
                  onChangeText={onChange}
                  autoCapitalize="words"
                  autoComplete="family-name"
                  textContentType="familyName"
                  error={errors.lastName ? t(errors.lastName.message!) : undefined}
                />
              )}
            />

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

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <FloatingInput
                  label={`${t('auth.email')} · ${t('common.optional')}`}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  error={errors.email ? t(errors.email.message!) : undefined}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <FloatingInput
                  label={t('auth.password')}
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry
                  autoComplete="password-new"
                  textContentType="newPassword"
                  error={errors.password ? t(errors.password.message!) : undefined}
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <FloatingInput
                  label={t('auth.confirmPassword')}
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry
                  autoComplete="password-new"
                  textContentType="newPassword"
                  error={errors.confirmPassword ? t(errors.confirmPassword.message!) : undefined}
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
              {loading ? t('common.loading') : t('auth.register')}
            </AppText>
          </PressablePremium>

          <View style={styles.altRow}>
            <AppText style={styles.altText}>{t('auth.hasAccount')} </AppText>
            <Pressable onPress={() => navigation.navigate('Login')} hitSlop={6}>
              <AppText style={styles.altLink}>{t('auth.loginHere')}</AppText>
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
  rolePill: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    padding: 4,
    marginBottom: 16,
  },
  roleItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
  },
  roleItemActive: {
    backgroundColor: colors.ink,
  },
  roleText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 13,
    color: colors.slate,
  },
  roleTextActive: {
    color: colors.surface,
  },
  ownerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  ownerNoteText: {
    flex: 1,
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    lineHeight: 18,
    color: colors.accentInk,
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
