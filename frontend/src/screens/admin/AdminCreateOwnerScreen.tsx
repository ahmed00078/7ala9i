import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Share,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { useAlert } from '../../contexts/AlertContext';
import { adminApi } from '../../api/admin';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import {
  AuthHeader,
  FloatingInput,
  PhoneInput,
  BottomSheetForm,
  type BottomSheetFormRef,
  PressablePremium,
} from '../../components/premium';
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

const EMPTY: CreateForm = {
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
};

export function AdminCreateOwnerScreen({ navigation }: AdminCreateOwnerScreenProps<'CreateOwner'>) {
  const { t } = useTranslation();
  const alert = useAlert();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<CreateForm>(EMPTY);
  const set = (key: keyof CreateForm) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const successSheetRef = useRef<BottomSheetFormRef>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    phone: string;
    password: string;
  } | null>(null);

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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setCreatedCredentials({
        name: `${form.first_name} ${form.last_name}`.trim(),
        phone: `+222 ${form.phone}`,
        password: form.password,
      });
      successSheetRef.current?.present();
      setForm(EMPTY);
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
    if (
      !form.first_name ||
      !form.last_name ||
      !form.phone ||
      form.phone.length !== 8 ||
      !form.password ||
      !form.salon_name
    ) {
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
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <AuthHeader
              title={t('admin.createOwnerTitle')}
              subtitle={t('admin.createOwnerSubtitle')}
              onBack={() => navigation.goBack()}
            />

            {/* ── Owner section ─────────────────────────────── */}
            <AppText style={styles.sectionLabel}>
              {t('admin.dashboard.ownerInfoHeading')}
            </AppText>
            <View style={styles.fields}>
              <FloatingInput
                label={t('auth.firstName')}
                value={form.first_name}
                onChangeText={set('first_name')}
                autoCapitalize="words"
              />
              <FloatingInput
                label={t('auth.lastName')}
                value={form.last_name}
                onChangeText={set('last_name')}
                autoCapitalize="words"
              />
              <PhoneInput
                label={t('auth.phone')}
                value={form.phone}
                onChangeText={set('phone')}
              />
              <FloatingInput
                label={`${t('auth.email')} (${t('common.optional')})`}
                value={form.email}
                onChangeText={set('email')}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <FloatingInput
                label={t('auth.password')}
                value={form.password}
                onChangeText={set('password')}
                secureTextEntry
              />
            </View>

            {/* ── Salon section ─────────────────────────────── */}
            <AppText style={styles.sectionLabel}>
              {t('admin.dashboard.salonInfoHeading')}
            </AppText>
            <View style={styles.fields}>
              <FloatingInput
                label={t('admin.salonName')}
                value={form.salon_name}
                onChangeText={set('salon_name')}
              />
              <FloatingInput
                label={t('admin.salonNameAr')}
                value={form.salon_name_ar}
                onChangeText={set('salon_name_ar')}
              />
              <FloatingInput
                label={t('admin.address')}
                value={form.address}
                onChangeText={set('address')}
              />
              <FloatingInput
                label={t('admin.city')}
                value={form.city}
                onChangeText={set('city')}
              />
              <FloatingInput
                label={t('admin.salonPhone')}
                value={form.salon_phone}
                onChangeText={set('salon_phone')}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.cta}>
              <Button
                title={t('admin.dashboard.saveAndCreate')}
                onPress={handleSubmit}
                loading={createMut.isPending}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* ── Success sheet ──────────────────────────────────── */}
      <BottomSheetForm
        ref={successSheetRef}
        title={t('admin.dashboard.createSuccessTitle')}
        snapPoints={['65%']}
        onDismiss={() => setCreatedCredentials(null)}
        footer={
          createdCredentials ? (
            <View style={{ gap: 10 }}>
              <Button
                title={t('admin.dashboard.shareWhatsapp')}
                onPress={() => shareViaWhatsapp(createdCredentials)}
              />
              <Button
                title={t('admin.dashboard.copyAll')}
                variant="outline"
                onPress={() => shareCredentials(createdCredentials)}
              />
            </View>
          ) : undefined
        }
      >
        {createdCredentials && (
          <View>
            <AppText style={styles.successBody}>
              {t('admin.dashboard.createSuccessBody')}
            </AppText>

            <View style={styles.credCard}>
              <CredentialRow
                icon="call-outline"
                label={t('admin.dashboard.credentialsPhone')}
                value={createdCredentials.phone}
              />
              <View style={styles.credDivider} />
              <CredentialRow
                icon="key-outline"
                label={t('admin.dashboard.credentialsPassword')}
                value={createdCredentials.password}
                mono
              />
            </View>
          </View>
        )}
      </BottomSheetForm>
    </View>
  );
}

/* ── Credential row ─────────────────────────────────────────────── */

function CredentialRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.credRow}>
      <View style={styles.credIcon}>
        <Ionicons name={icon} size={16} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={styles.credLabel}>{label}</AppText>
        <AppText
          selectable
          style={[styles.credValue, mono && { fontFamily: 'Outfit-SemiBold', letterSpacing: 0.5 }]}
        >
          {value}
        </AppText>
      </View>
    </View>
  );
}

/* ── share helpers ──────────────────────────────────────────────── */

function buildMessage(creds: { name: string; phone: string; password: string }) {
  return `7ala9i — ${creds.name}\nPhone: ${creds.phone}\nPassword: ${creds.password}`;
}

async function shareCredentials(creds: { name: string; phone: string; password: string }) {
  try {
    await Share.share({ message: buildMessage(creds) });
    Haptics.selectionAsync().catch(() => undefined);
  } catch {
    /* user dismissed */
  }
}

async function shareViaWhatsapp(creds: { name: string; phone: string; password: string }) {
  const msg = encodeURIComponent(buildMessage(creds));
  const url = `whatsapp://send?text=${msg}`;
  const can = await Linking.canOpenURL(url).catch(() => false);
  if (can) {
    Linking.openURL(url).catch(() => undefined);
  } else {
    // Fall back to native Share when WhatsApp isn't installed
    Share.share({ message: buildMessage(creds) }).catch(() => undefined);
  }
  Haptics.selectionAsync().catch(() => undefined);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  scroll: {
    paddingBottom: 40,
  },

  sectionLabel: {
    ...typography.capsLabel,
    color: colors.slateSoft,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: spacing.section,
  },
  fields: {
    paddingHorizontal: spacing.section,
    gap: 4,
  },

  cta: {
    paddingHorizontal: spacing.section,
    paddingTop: 28,
  },

  /* Success sheet */
  successBody: {
    ...typography.body,
    color: colors.slate,
    marginBottom: 18,
  },
  credCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  credRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  credIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  credLabel: {
    ...typography.caption,
    color: colors.slate,
  },
  credValue: {
    ...typography.bodyMedium,
    color: colors.ink,
    marginTop: 2,
  },
  credDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
    marginStart: 44,
  },
});
