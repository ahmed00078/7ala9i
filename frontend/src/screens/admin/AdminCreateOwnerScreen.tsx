import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AppText as Text } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { useAlert } from '../../contexts/AlertContext';
import { adminApi } from '../../api/admin';
import { colors } from '../../theme/colors';
import type { AdminCreateOwnerScreenProps } from '../../types/navigation';

interface CreateForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  salon_name: string;
  salon_name_ar: string;
  address: string;
  city: string;
  salon_phone: string;
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  required,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  required?: boolean;
}) {
  return (
    <View style={field.container}>
      <Text style={field.label}>
        {label}{required && <Text style={field.required}> *</Text>}
      </Text>
      <TextInput
        style={field.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.gray}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
    </View>
  );
}

const field = StyleSheet.create({
  container: { marginBottom: 14 },
  label: {
    fontSize: 12,
    fontFamily: 'Outfit-SemiBold',
    color: colors.grayDark,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  required: { color: colors.error },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.black,
    backgroundColor: colors.white,
  },
});

export function AdminCreateOwnerScreen({ navigation }: AdminCreateOwnerScreenProps<'CreateOwner'>) {
  const { t } = useTranslation();
  const alert = useAlert();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<CreateForm>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    salon_name: '',
    salon_name_ar: '',
    address: '',
    city: 'Nouakchott',
    salon_phone: '',
  });

  const set = (key: keyof CreateForm) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const createMut = useMutation({
    mutationFn: () =>
      adminApi.createOwner({
        phone: form.phone,
        email: form.email || undefined,
        first_name: form.first_name,
        last_name: form.last_name,
        password: form.password,
        salon_name: form.salon_name,
        salon_name_ar: form.salon_name_ar || undefined,
        address: form.address || undefined,
        city: form.city,
        salon_phone: form.salon_phone || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      alert.show({
        type: 'success',
        title: t('admin.ownerCreated'),
        message: t('admin.ownerCreatedMsg'),
      });
      setForm({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        salon_name: '',
        salon_name_ar: '',
        address: '',
        city: 'Nouakchott',
        salon_phone: '',
      });
    },
    onError: (err: any) => {
      alert.show({
        type: 'error',
        title: t('common.error'),
        message: err?.response?.data?.detail ?? t('admin.createOwnerError'),
      });
    },
  });

  const handleSubmit = () => {
    if (!form.first_name || !form.last_name || !form.phone || !form.password || !form.salon_name) {
      alert.show({
        type: 'error',
        title: t('common.error'),
        message: t('admin.fillRequired'),
      });
      return;
    }
    createMut.mutate();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="person-add" size={22} color={colors.accent} />
        </View>
        <View>
          <Text style={styles.title}>{t('admin.createOwnerTitle')}</Text>
          <Text style={styles.subtitle}>{t('admin.createOwnerSubtitle')}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionLabel}>{t('admin.ownerInfo')}</Text>
          <FormField label={t('auth.firstName')} value={form.first_name} onChangeText={set('first_name')} required />
          <FormField label={t('auth.lastName')} value={form.last_name} onChangeText={set('last_name')} required />
          <FormField label={t('auth.phone')} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="XXXXXXXX" required />
          <FormField label={`${t('auth.email')} (${t('common.optional')})`} value={form.email} onChangeText={set('email')} keyboardType="email-address" />
          <FormField label={t('auth.password')} value={form.password} onChangeText={set('password')} secureTextEntry required />

          <Text style={styles.sectionLabel}>{t('admin.salonInfo')}</Text>
          <FormField label={t('admin.salonName')} value={form.salon_name} onChangeText={set('salon_name')} required />
          <FormField label={t('admin.salonNameAr')} value={form.salon_name_ar} onChangeText={set('salon_name_ar')} />
          <FormField label={t('admin.address')} value={form.address} onChangeText={set('address')} />
          <FormField label={t('admin.city')} value={form.city} onChangeText={set('city')} />
          <FormField label={t('admin.salonPhone')} value={form.salon_phone} onChangeText={set('salon_phone')} keyboardType="phone-pad" placeholder="XXXXXXXX" />

          <Button
            title={t('admin.createOwnerBtn')}
            onPress={handleSubmit}
            loading={createMut.isPending}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.navy,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: colors.white,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: 'rgba(255,255,255,0.6)',
  },
  scroll: { padding: 20, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 13,
    fontFamily: 'Outfit-SemiBold',
    color: colors.navy,
    marginBottom: 14,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    paddingLeft: 10,
  },
});
