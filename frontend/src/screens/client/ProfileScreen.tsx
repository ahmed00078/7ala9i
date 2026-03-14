import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAlert } from '../../contexts/AlertContext';
import { usersApi } from '../../api/users';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';

const LANG_LABELS: Record<string, string> = { ar: 'العربية', fr: 'Français', en: 'English' };

export function ProfileScreen() {
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { t } = useTranslation();
  const { user, logout, updateUser } = useAuth();
  const { language, changeLanguage } = useLanguage();
  const alert = useAlert();

  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
  });

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();

  const updateMutation = useMutation({
    mutationFn: () => usersApi.updateProfile({
      first_name: form.first_name.trim() || undefined,
      last_name: form.last_name.trim() || undefined,
      email: form.email.trim() || undefined,
    }),
    onSuccess: ({ data }) => {
      updateUser(data);
      setEditModalOpen(false);
      alert.show({ type: 'success', title: t('profile.profileUpdated') });
    },
    onError: () => {
      alert.show({ type: 'error', title: t('common.error'), message: t('errors.server') });
    },
  });

  const openEdit = () => {
    setForm({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
    });
    setEditModalOpen(true);
  };

  const handleLogout = () => {
    alert.show({
      type: 'confirm',
      title: t('auth.logout'),
      message: t('auth.logoutConfirm'),
      confirmText: t('auth.logout'),
      cancelText: t('common.cancel'),
      onConfirm: () => logout(),
    });
  };

  const handleLanguage = () => setShowLanguagePicker(!showLanguagePicker);

  const handleSelectLanguage = (lang: string) => {
    changeLanguage(lang);
    setShowLanguagePicker(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || '?'}</Text>
          </View>
          <Text style={styles.fullName}>{user?.first_name} {user?.last_name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{t('profile.client')}</Text>
          </View>
        </View>

        {/* Personal Info */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>{t('profile.personalInfo')}</Text>
          <TouchableOpacity onPress={openEdit} style={styles.editBtn}>
            <Ionicons name="pencil-outline" size={14} color={colors.accent} />
            <Text style={styles.editBtnText}>{t('common.edit')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <InfoRow icon="call-outline" label={t('profile.phone')} value={user?.phone || '-'} />
          <Divider />
          <InfoRow icon="mail-outline" label={t('profile.email')} value={user?.email || t('profile.notSet')} />
          <Divider />
          <InfoRow icon="person-outline" label={t('profile.firstName')} value={user?.first_name || '-'} />
          <Divider />
          <InfoRow icon="person-outline" label={t('profile.lastName')} value={user?.last_name || '-'} />
        </View>

        {/* Settings */}
        <Text style={styles.sectionLabel}>{t('profile.settings')}</Text>
        <View style={styles.card}>
          <ActionRow icon="language-outline" label={t('profile.language')} value={LANG_LABELS[language] || language.toUpperCase()} onPress={handleLanguage} />
          {showLanguagePicker && (
            <View style={styles.languagePickerContainer}>
              {['en', 'ar', 'fr'].map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[styles.languageOption, language === lang && styles.languageOptionActive]}
                  onPress={() => handleSelectLanguage(lang)}
                >
                  <View style={styles.languageOptionContent}>
                    <Ionicons
                      name={language === lang ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={language === lang ? colors.accent : colors.gray}
                    />
                    <Text style={[styles.languageOptionText, language === lang && styles.languageOptionTextActive]}>
                      {LANG_LABELS[lang]}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Logout */}
        <View style={[styles.card, styles.logoutCard]}>
          <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
            <View style={[styles.iconCircle, styles.iconCircleRed]}>
              <Ionicons name="log-out-outline" size={18} color={colors.error} />
            </View>
            <Text style={styles.logoutText}>{t('auth.logout')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>{t('profile.version')} 1.0.0</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModalOpen} animationType="slide" transparent onRequestClose={() => setEditModalOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('profile.editProfile')}</Text>
                <TouchableOpacity onPress={() => setEditModalOpen(false)}>
                  <Ionicons name="close" size={22} color={colors.gray} />
                </TouchableOpacity>
              </View>
              <Input
                label={t('profile.firstName')}
                value={form.first_name}
                onChangeText={(v) => setForm(f => ({ ...f, first_name: v }))}
              />
              <Input
                label={t('profile.lastName')}
                value={form.last_name}
                onChangeText={(v) => setForm(f => ({ ...f, last_name: v }))}
              />
              <Input
                label={`${t('profile.email')} (${t('common.optional')})`}
                value={form.email}
                onChangeText={(v) => setForm(f => ({ ...f, email: v }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Button
                title={t('common.save')}
                onPress={() => updateMutation.mutate()}
                loading={updateMutation.isPending}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.iconCircle}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>
      <View style={rowStyles.content}>
        <Text style={rowStyles.label}>{label}</Text>
        <Text style={rowStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

function ActionRow({ icon, label, value, onPress }: { icon: any; label: string; value?: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={rowStyles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={rowStyles.iconCircle}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>
      <View style={rowStyles.content}>
        <Text style={rowStyles.label}>{label}</Text>
        {value ? <Text style={rowStyles.value}>{value}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.gray} />
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border, marginStart: 52 }} />;
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  iconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.accentLight,
    alignItems: 'center', justifyContent: 'center', marginEnd: 12,
  },
  content: { flex: 1 },
  label: { fontSize: 13, color: colors.gray, marginBottom: 1, fontFamily: 'Outfit-Regular' },
  value: { fontSize: 14, color: colors.black, fontFamily: 'Outfit-Medium' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 32 },
  header: {
    backgroundColor: colors.navy,
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: colors.accent, fontFamily: 'Outfit-Bold' },
  fullName: { fontSize: 20, fontWeight: '700', color: colors.white, fontFamily: 'Outfit-Bold', marginBottom: 6 },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  roleText: { fontSize: 12, color: colors.white, fontFamily: 'Outfit-Medium' },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 24, marginBottom: 6, paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 12, color: colors.grayDark, fontFamily: 'Outfit-SemiBold',
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: 13, color: colors.accent, fontFamily: 'Outfit-SemiBold' },
  card: {
    backgroundColor: colors.white, marginHorizontal: 16, borderRadius: 16,
    overflow: 'hidden', shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  logoutCard: { marginTop: 12 },
  logoutRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginEnd: 12 },
  iconCircleRed: { backgroundColor: '#FEE2E2' },
  logoutText: { flex: 1, fontSize: 14, color: colors.error, fontFamily: 'Outfit-SemiBold' },
  version: { textAlign: 'center', color: colors.gray, fontSize: 12, marginTop: 24, fontFamily: 'Outfit-Regular' },
  languagePickerContainer: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  languageOption: { paddingVertical: 12, paddingHorizontal: 16, marginStart: 52, flexDirection: 'row', alignItems: 'center' },
  languageOptionActive: { backgroundColor: '#F0F9FF' },
  languageOptionContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  languageOptionText: { fontSize: 13, color: colors.gray, fontFamily: 'Outfit-Regular' },
  languageOptionTextActive: { color: colors.accent, fontWeight: '600', fontFamily: 'Outfit-SemiBold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: colors.black },
});
