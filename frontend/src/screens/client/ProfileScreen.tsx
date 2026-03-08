import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { colors } from '../../theme/colors';

const LANG_LABELS: Record<string, string> = { ar: 'العربية', fr: 'Français', en: 'English' };

export function ProfileScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { language, changeLanguage } = useLanguage();

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();

  const handleLogout = () => {
    Alert.alert(t('auth.logout'), t('auth.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.logout'), style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleLanguage = () => {
    Alert.alert(t('profile.changeLanguage'), '', [
      { text: 'العربية', onPress: () => changeLanguage('ar') },
      { text: 'Français', onPress: () => changeLanguage('fr') },
      { text: 'English', onPress: () => changeLanguage('en') },
    ]);
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
          <ActionRow icon="language-outline" label={t('profile.language')} value={LANG_LABELS[language] || language.toUpperCase()} onPress={handleLanguage} />
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 12,
  },
  content: { flex: 1 },
  label: { fontSize: 13, color: colors.gray, marginBottom: 1, fontFamily: 'Outfit-Regular' },
  value: { fontSize: 14, color: colors.black, fontFamily: 'Outfit-Medium' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 32 },
  header: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: colors.accent, fontFamily: 'Outfit-Bold' },
  fullName: { fontSize: 20, fontWeight: '700', color: colors.white, fontFamily: 'Outfit-Bold', marginBottom: 6 },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: { fontSize: 12, color: colors.white, fontFamily: 'Outfit-Medium' },
  sectionLabel: {
    fontSize: 12,
    color: colors.grayDark,
    fontFamily: 'Outfit-SemiBold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 6,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  logoutCard: { marginTop: 0 },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconCircleRed: {
    backgroundColor: '#FEE2E2',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 12,
  },
  logoutText: { flex: 1, fontSize: 14, color: colors.error, fontFamily: 'Outfit-SemiBold' },
  version: { textAlign: 'center', color: colors.gray, fontSize: 12, marginTop: 24, fontFamily: 'Outfit-Regular' },
});
