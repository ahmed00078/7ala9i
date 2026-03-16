import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { registerSchema, RegisterForm } from '../../utils/validators';
import { colors } from '../../theme/colors';
import type { AuthScreenProps } from '../../types/navigation';

const ROLE_OPTIONS: { value: 'client' | 'owner'; labelKey: string; icon: string }[] = [
  { value: 'client', labelKey: 'auth.roles.client', icon: 'person' },
  { value: 'owner', labelKey: 'auth.roles.owner', icon: 'storefront' },
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
      {/* Navy hero */}
      <View style={styles.hero}>
        <View style={styles.logoBox}>
          <Ionicons name="cut" size={28} color={colors.accent} />
        </View>
        <Text style={styles.heroTitle}>{t('auth.registerTitle')}</Text>
        <Text style={styles.heroSubtitle}>{t('auth.registerSubtitle')}</Text>
      </View>

      {/* Form card */}
      <ScrollView
        style={styles.card}
        contentContainerStyle={{ padding: 28, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Role selector */}
        <Text style={styles.sectionLabel}>{t('auth.selectRole')}</Text>
        <View style={styles.roleRow}>
          {ROLE_OPTIONS.map((r) => {
            const isActive = selectedRole === r.value;
            return (
              <TouchableOpacity
                key={r.value}
                style={[styles.roleBtn, isActive && styles.roleBtnActive]}
                onPress={() => setValue('role', r.value)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={r.icon as any}
                  size={20}
                  color={isActive ? colors.white : colors.gray}
                />
                <Text style={[styles.roleLabel, isActive && styles.roleLabelActive]}>
                  {t(r.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Owner info banner */}
        {selectedRole === 'owner' && (
          <View style={styles.ownerBanner}>
            <Ionicons name="information-circle" size={18} color={colors.accent} />
            <Text style={styles.ownerBannerText}>{t('auth.ownerInfo')}</Text>
          </View>
        )}

        {/* First Name */}
        <Controller
          control={control}
          name="firstName"
          render={({ field: { onChange, value } }) => (
            <Input
              label={t('auth.firstName')}
              value={value}
              onChangeText={onChange}
              error={errors.firstName ? t(errors.firstName.message!) : undefined}
            />
          )}
        />

        {/* Last Name */}
        <Controller
          control={control}
          name="lastName"
          render={({ field: { onChange, value } }) => (
            <Input
              label={t('auth.lastName')}
              value={value}
              onChangeText={onChange}
              error={errors.lastName ? t(errors.lastName.message!) : undefined}
            />
          )}
        />

        {/* Phone */}
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, value } }) => (
            <Input
              label={t('auth.phone')}
              value={value}
              onChangeText={onChange}
              keyboardType="phone-pad"
              placeholder={t('auth.phonePlaceholder')}
              error={errors.phone ? t(errors.phone.message!) : undefined}
            />
          )}
        />

        {/* Email (optional) */}
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <Input
              label={`${t('auth.email')} (${t('common.optional')})`}
              value={value}
              onChangeText={onChange}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email ? t(errors.email.message!) : undefined}
            />
          )}
        />

        {/* Password */}
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <Input
              label={t('auth.password')}
              value={value}
              onChangeText={onChange}
              secureTextEntry
              error={errors.password ? t(errors.password.message!) : undefined}
            />
          )}
        />

        {/* Confirm Password */}
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, value } }) => (
            <Input
              label={t('auth.confirmPassword')}
              value={value}
              onChangeText={onChange}
              secureTextEntry
              error={errors.confirmPassword ? t(errors.confirmPassword.message!) : undefined}
            />
          )}
        />

        <Button
          title={t('auth.register')}
          onPress={handleSubmit(onSubmit)}
          loading={loading}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.hasAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>{t('auth.loginHere')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 28,
  },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: 'Outfit-Bold',
    color: colors.white,
    marginBottom: 4,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flex: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: 'Outfit-SemiBold',
    color: colors.grayDark,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  roleBtnActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  roleLabel: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: colors.gray,
  },
  roleLabelActive: { color: colors.white },
  ownerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.accentLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  ownerBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: colors.accent,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  footerText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.gray },
  link: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.accent },
});
