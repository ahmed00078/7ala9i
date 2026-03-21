import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAlert } from '../../contexts/AlertContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { authApi } from '../../api/auth';
import { phoneRegex } from '../../utils/validators';
import { colors } from '../../theme/colors';
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
            <Ionicons name="lock-closed" size={28} color={colors.accent} />
          </View>
          <Text style={styles.heroTitle}>{t('auth.forgotPasswordTitle')}</Text>
          <Text style={styles.heroSubtitle}>{t('auth.forgotPasswordSubtitle')}</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, value } }) => (
              <Input
                label={t('profile.phone')}
                placeholder="XXXXXXXX"
                value={value}
                onChangeText={onChange}
                keyboardType="phone-pad"
                error={errors.phone ? t(errors.phone.message!) : undefined}
              />
            )}
          />

          <Button
            title={t('auth.forgotPasswordSend')}
            onPress={handleSubmit(onSubmit)}
            loading={loading}
          />

          <TouchableOpacity
            style={styles.footer}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.link}>{t('auth.backToLogin')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1, backgroundColor: colors.navy },
  container: { flex: 1, backgroundColor: colors.navy },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
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
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 12,
    flex: 1.2,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  link: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.accent },
});
