import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAlert } from '../../contexts/AlertContext';
import { colors } from '../../theme/colors';

const LANG_LABELS: Record<string, string> = { ar: 'العربية', fr: 'Français', en: 'English' };

export function AdminProfileScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { language, changeLanguage } = useLanguage();
  const alert = useAlert();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();

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
            <Ionicons name="shield-checkmark" size={12} color={colors.white} style={{ marginEnd: 4 }} />
            <Text style={styles.roleText}>Admin</Text>
          </View>
        </View>

        {/* Account Info */}
        <Text style={styles.sectionLabel}>{t('profile.personalInfo')}</Text>
        <View style={styles.card}>
          <InfoRow icon="mail-outline" label={t('profile.email')} value={user?.email || '-'} />
          <Divider />
          <InfoRow icon="call-outline" label={t('profile.phone')} value={user?.phone || t('profile.notSet')} />
          <Divider />
          <InfoRow icon="person-outline" label={t('profile.firstName')} value={user?.first_name || '-'} />
          <Divider />
          <InfoRow icon="person-outline" label={t('profile.lastName')} value={user?.last_name || '-'} />
        </View>

        {/* Settings */}
        <Text style={styles.sectionLabel}>{t('profile.settings')}</Text>
        <View style={styles.card}>
          <ActionRow
            icon="language-outline"
            label={t('profile.language')}
            value={LANG_LABELS[language] || language.toUpperCase()}
            onPress={() => setShowLanguagePicker(v => !v)}
          />
          {showLanguagePicker && (
            <View style={styles.languagePickerContainer}>
              {['en', 'ar', 'fr'].map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[styles.languageOption, language === lang && styles.languageOptionActive]}
                  onPress={() => handleSelectLanguage(lang)}
                >
                  <Ionicons
                    name={language === lang ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={language === lang ? colors.accent : colors.gray}
                  />
                  <Text style={[styles.languageOptionText, language === lang && styles.languageOptionTextActive]}>
                    {LANG_LABELS[lang]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Logout */}
        <View style={[styles.card, styles.logoutCard]}>
          <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
            <View style={styles.iconCircleRed}>
              <Ionicons name="log-out-outline" size={18} color={colors.error} />
            </View>
            <Text style={styles.logoutText}>{t('auth.logout')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>{t('profile.version')} 1.0.0</Text>
      </ScrollView>
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
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentLight,
    alignItems: 'center', justifyContent: 'center', marginEnd: 12,
  },
  content: { flex: 1 },
  label: { fontSize: 13, color: colors.gray, fontFamily: 'Outfit-Regular', marginBottom: 1 },
  value: { fontSize: 14, color: colors.black, fontFamily: 'Outfit-Medium' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 32 },
  header: {
    backgroundColor: colors.navy, alignItems: 'center',
    paddingTop: 32, paddingBottom: 28,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    shadowColor: colors.black, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
  avatarText: { fontSize: 28, fontFamily: 'Outfit-Bold', color: colors.accent },
  fullName: { fontSize: 20, fontFamily: 'Outfit-Bold', color: colors.white, marginBottom: 6 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
  },
  roleText: { fontSize: 12, color: colors.white, fontFamily: 'Outfit-Medium' },
  sectionLabel: {
    fontSize: 12, color: colors.grayDark, fontFamily: 'Outfit-SemiBold',
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginTop: 24, marginBottom: 6, paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.white, marginHorizontal: 16, borderRadius: 16, overflow: 'hidden',
    shadowColor: colors.black, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  logoutCard: { marginTop: 12 },
  logoutRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  iconCircleRed: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center', marginEnd: 12,
  },
  logoutText: { flex: 1, fontSize: 14, color: colors.error, fontFamily: 'Outfit-SemiBold' },
  version: { textAlign: 'center', color: colors.gray, fontSize: 12, marginTop: 24, fontFamily: 'Outfit-Regular' },
  languagePickerContainer: {
    borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 8,
  },
  languageOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 16, marginStart: 52,
  },
  languageOptionActive: { backgroundColor: '#F0F9FF' },
  languageOptionText: { fontSize: 13, color: colors.gray, fontFamily: 'Outfit-Regular' },
  languageOptionTextActive: { color: colors.accent, fontFamily: 'Outfit-SemiBold' },
});
