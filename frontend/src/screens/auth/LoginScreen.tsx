import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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
import { loginSchema, LoginForm } from '../../utils/validators';
import { colors } from '../../theme/colors';
import type { AuthScreenProps } from '../../types/navigation';

export function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const { t } = useTranslation();
  const { login } = useAuth();
  const alert = useAlert();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
    } catch {
      alert.show({
        type: 'error',
        title: t('common.error'),
        message: t('auth.loginError'),
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
        <Text style={styles.heroTitle}>{t('auth.loginTitle')}</Text>
        <Text style={styles.heroSubtitle}>{t('auth.loginSubtitle')}</Text>
      </View>

      {/* Form card */}
      <View style={styles.card}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                label={t('auth.email')}
                value={value}
                onChangeText={onChange}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email ? t(errors.email.message!) : undefined}
              />
            )}
          />
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

          <Button title={t('auth.login')} onPress={handleSubmit(onSubmit)} loading={loading} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.noAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.link}>{t('auth.registerHere')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
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
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  footerText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.gray },
  link: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.accent },
});
