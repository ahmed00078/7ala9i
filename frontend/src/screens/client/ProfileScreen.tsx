import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { AppText } from '../../components/ui/AppText';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAlert } from '../../contexts/AlertContext';
import { usersApi } from '../../api/users';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import {
  ProfileIdentity,
  SettingsGroup,
  SettingsRow,
  LanguagePillRow,
  BottomSheetForm,
  type BottomSheetFormRef,
} from '../../components/premium';

const SUPPORT_WHATSAPP = '+22247000000';
const APP_VERSION = '1.0.0';

export function ProfileScreen() {
  const { t } = useTranslation();
  const { user, logout, updateUser } = useAuth();
  const { language, changeLanguage } = useLanguage();
  const alert = useAlert();

  const editSheetRef = useRef<BottomSheetFormRef>(null);
  const passwordSheetRef = useRef<BottomSheetFormRef>(null);
  const deleteSheetRef = useRef<BottomSheetFormRef>(null);

  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
  });
  const [passwordForm, setPasswordForm] = useState({ current: '', newPw: '', confirm: '' });
  const [deletePassword, setDeletePassword] = useState('');

  const fullName = useMemo(
    () => `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || t('common.guest'),
    [user, t],
  );

  const updateMutation = useMutation({
    mutationFn: () =>
      usersApi.updateProfile({
        first_name: form.first_name.trim() || undefined,
        last_name: form.last_name.trim() || undefined,
        email: form.email.trim() || undefined,
      }),
    onSuccess: ({ data }) => {
      updateUser(data);
      editSheetRef.current?.dismiss();
      alert.show({ type: 'success', title: t('profile.profileUpdated') });
    },
    onError: () =>
      alert.show({ type: 'error', title: t('common.error'), message: t('errors.server') }),
  });

  const changePwMutation = useMutation({
    mutationFn: () => usersApi.changePassword(passwordForm.current, passwordForm.newPw),
    onSuccess: () => {
      passwordSheetRef.current?.dismiss();
      setPasswordForm({ current: '', newPw: '', confirm: '' });
      alert.show({ type: 'success', title: t('profile.changePasswordSuccess') });
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      alert.show({
        type: 'error',
        title: t('common.error'),
        message: detail === 'Current password is incorrect'
          ? t('profile.changePasswordWrongCurrent')
          : t('profile.changePasswordError'),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.deleteAccount(deletePassword),
    onSuccess: () => {
      deleteSheetRef.current?.dismiss();
      logout();
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      if (detail === 'Incorrect password') {
        alert.show({ type: 'error', title: t('profile.deleteAccountWrongPassword') });
      } else {
        alert.show({ type: 'error', title: t('profile.deleteAccountError'), message: detail });
      }
    },
  });

  const onChangePassword = () => {
    if (passwordForm.newPw.length < 6) {
      alert.show({ type: 'error', title: t('validation.passwordMin') });
      return;
    }
    if (passwordForm.newPw !== passwordForm.confirm) {
      alert.show({ type: 'error', title: t('validation.passwordMismatch') });
      return;
    }
    changePwMutation.mutate();
  };

  const onLogout = () => {
    alert.show({
      type: 'confirm',
      title: t('auth.logout'),
      message: t('auth.logoutConfirm'),
      confirmText: t('auth.logout'),
      cancelText: t('common.cancel'),
      onConfirm: () => logout(),
    });
  };

  const onOpenEdit = () => {
    setForm({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
    });
    editSheetRef.current?.present();
  };

  const onAskDelete = () => {
    // Two-step gate so this destructive action can't happen on a single accidental tap.
    alert.show({
      type: 'confirm',
      title: t('profile.deleteAccountTitle'),
      message: t('profile.deleteAccountMessage'),
      confirmText: t('common.continue'),
      cancelText: t('common.cancel'),
      onConfirm: () => {
        setDeletePassword('');
        deleteSheetRef.current?.present();
      },
    });
  };

  const onWhatsapp = () => {
    const url = `https://wa.me/${SUPPORT_WHATSAPP.replace('+', '')}`;
    Linking.openURL(url).catch(() => undefined);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ProfileIdentity
            name={fullName}
            sub={user?.phone || undefined}
            role={t('profile.client')}
            onEdit={onOpenEdit}
          />

          <SettingsGroup
            label={t('profile.personalInfo')}
            action={
              <Pressable onPress={onOpenEdit} hitSlop={8}>
                <AppText style={styles.editLink}>{t('common.edit')}</AppText>
              </Pressable>
            }
          >
            <SettingsRow icon="person-outline" label={t('profile.firstName')} value={user?.first_name || t('profile.notSet')} onPress={onOpenEdit} />
            <SettingsRow icon="person-outline" label={t('profile.lastName')} value={user?.last_name || t('profile.notSet')} onPress={onOpenEdit} />
            <SettingsRow icon="mail-outline" label={t('profile.email')} value={user?.email || t('profile.notSet')} onPress={onOpenEdit} />
            <SettingsRow icon="call-outline" label={t('profile.phone')} value={user?.phone || '-'} />
          </SettingsGroup>

          <View style={styles.langWrap}>
            <AppText style={styles.langLabel}>{t('profile.language')}</AppText>
            <View style={styles.langCard}>
              <LanguagePillRow language={language} onChange={changeLanguage} />
            </View>
          </View>

          <SettingsGroup label={t('profile.security')}>
            <SettingsRow
              icon="lock-closed-outline"
              label={t('profile.changePasswordTitle')}
              onPress={() => passwordSheetRef.current?.present()}
            />
            <SettingsRow
              icon="trash-outline"
              label={t('profile.deleteAccountTitle')}
              onPress={onAskDelete}
              danger
            />
          </SettingsGroup>

          <SettingsGroup label={t('profile.support')}>
            <SettingsRow
              icon="logo-whatsapp"
              label={t('profile.contactSupport')}
              value={t('profile.viaWhatsapp')}
              onPress={onWhatsapp}
            />
          </SettingsGroup>

          <SettingsGroup label={t('profile.about')}>
            <SettingsRow icon="information-circle-outline" label={t('profile.version')} value={APP_VERSION} />
          </SettingsGroup>

          <View style={styles.signOutWrap}>
            <SettingsGroup>
              <SettingsRow icon="log-out-outline" label={t('auth.logout')} onPress={onLogout} danger chevron={false} />
            </SettingsGroup>
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* ── Edit profile sheet ──────────────────────────────────── */}
      <BottomSheetForm
        ref={editSheetRef}
        title={t('profile.editProfile')}
        snapPoints={['80%']}
        footer={
          <Button
            title={t('common.save')}
            onPress={() => updateMutation.mutate()}
            loading={updateMutation.isPending}
          />
        }
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <Input
            label={t('profile.firstName')}
            value={form.first_name}
            onChangeText={(v) => setForm((f) => ({ ...f, first_name: v }))}
          />
          <Input
            label={t('profile.lastName')}
            value={form.last_name}
            onChangeText={(v) => setForm((f) => ({ ...f, last_name: v }))}
          />
          <Input
            label={t('profile.email')}
            value={form.email}
            onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </ScrollView>
      </BottomSheetForm>

      {/* ── Change password sheet ───────────────────────────────── */}
      <BottomSheetForm
        ref={passwordSheetRef}
        title={t('profile.changePasswordTitle')}
        snapPoints={['80%']}
        footer={
          <Button
            title={t('common.save')}
            onPress={onChangePassword}
            loading={changePwMutation.isPending}
          />
        }
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <Input
            label={t('profile.currentPassword')}
            value={passwordForm.current}
            onChangeText={(v) => setPasswordForm((f) => ({ ...f, current: v }))}
            secureTextEntry
          />
          <Input
            label={t('auth.newPassword')}
            value={passwordForm.newPw}
            onChangeText={(v) => setPasswordForm((f) => ({ ...f, newPw: v }))}
            secureTextEntry
          />
          <Input
            label={t('auth.confirmNewPassword')}
            value={passwordForm.confirm}
            onChangeText={(v) => setPasswordForm((f) => ({ ...f, confirm: v }))}
            secureTextEntry
          />
        </ScrollView>
      </BottomSheetForm>

      {/* ── Delete account sheet ────────────────────────────────── */}
      <BottomSheetForm
        ref={deleteSheetRef}
        title={t('profile.deleteAccountTitle')}
        snapPoints={['70%']}
        footer={
          <Button
            title={t('profile.deleteAccountButton')}
            onPress={() => deleteMutation.mutate()}
            loading={deleteMutation.isPending}
            style={{ backgroundColor: colors.danger }}
          />
        }
      >
        <View style={styles.warningWrap}>
          <View style={styles.warningCircle}>
            <Ionicons name="warning-outline" size={28} color={colors.danger} />
          </View>
          <AppText style={styles.warningText}>{t('profile.deleteAccountMessage')}</AppText>
        </View>
        <Input
          label={t('profile.deleteAccountPassword')}
          value={deletePassword}
          onChangeText={setDeletePassword}
          secureTextEntry
        />
      </BottomSheetForm>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  scroll: { paddingBottom: 48 },

  editLink: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  langWrap: { marginTop: 22 },
  langLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 11,
    color: colors.slate,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: spacing.lg,
  },
  langCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },

  signOutWrap: { marginTop: 18 },

  warningWrap: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  warningCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F6E0DE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  warningText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.slate,
    textAlign: 'center',
    lineHeight: 20,
  },
});
