import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { registerSchema, RegisterForm } from '../../utils/validators';
import { colors } from '../../theme/colors';
import type { AuthScreenProps } from '../../types/navigation';

export function RegisterScreen({ navigation }: AuthScreenProps<'Register'>) {
  const { t } = useTranslation();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', phone: '+222', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      await register({
        email: data.email,
        password: data.password,
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
      });
    } catch {
      Alert.alert(t('common.error'), t('auth.registerError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('auth.registerTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.registerSubtitle')}</Text>

        <Controller control={control} name="firstName"
          render={({ field: { onChange, value } }) => (
            <Input label={t('auth.firstName')} value={value} onChangeText={onChange}
              error={errors.firstName ? t(errors.firstName.message!) : undefined} />
          )}
        />
        <Controller control={control} name="lastName"
          render={({ field: { onChange, value } }) => (
            <Input label={t('auth.lastName')} value={value} onChangeText={onChange}
              error={errors.lastName ? t(errors.lastName.message!) : undefined} />
          )}
        />
        <Controller control={control} name="email"
          render={({ field: { onChange, value } }) => (
            <Input label={t('auth.email')} value={value} onChangeText={onChange}
              keyboardType="email-address" autoCapitalize="none"
              error={errors.email ? t(errors.email.message!) : undefined} />
          )}
        />
        <Controller control={control} name="phone"
          render={({ field: { onChange, value } }) => (
            <Input label={t('auth.phone')} value={value} onChangeText={onChange}
              keyboardType="phone-pad" placeholder={t('auth.phonePlaceholder')}
              error={errors.phone ? t(errors.phone.message!) : undefined} />
          )}
        />
        <Controller control={control} name="password"
          render={({ field: { onChange, value } }) => (
            <Input label={t('auth.password')} value={value} onChangeText={onChange}
              secureTextEntry error={errors.password ? t(errors.password.message!) : undefined} />
          )}
        />
        <Controller control={control} name="confirmPassword"
          render={({ field: { onChange, value } }) => (
            <Input label={t('auth.confirmPassword')} value={value} onChangeText={onChange}
              secureTextEntry error={errors.confirmPassword ? t(errors.confirmPassword.message!) : undefined} />
          )}
        />

        <Button title={t('auth.register')} onPress={handleSubmit(onSubmit)} loading={loading} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.hasAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.link}>{t('auth.loginHere')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  scroll: { padding: 24, paddingTop: 32 },
  title: { fontSize: 28, fontWeight: '700', color: colors.black, marginBottom: 8, textAlign: 'auto' },
  subtitle: { fontSize: 14, color: colors.gray, marginBottom: 24, textAlign: 'auto' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24, marginBottom: 32 },
  footerText: { fontSize: 14, color: colors.gray },
  link: { fontSize: 14, color: colors.accent, fontWeight: '600' },
});
