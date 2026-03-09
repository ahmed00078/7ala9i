import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { useLanguage } from '../../contexts/LanguageContext';
import { storage } from '../../utils/storage';
import { colors } from '../../theme/colors';
import type { AuthScreenProps } from '../../types/navigation';

const LANGUAGES = [
  { code: 'ar', label: 'العربية', icon: '🇲🇷' },
  { code: 'fr', label: 'Français', icon: '🇫🇷' },
  { code: 'en', label: 'English',  icon: '🇬🇧' },
];

export function WelcomeScreen({ navigation }: AuthScreenProps<'Welcome'>) {
  const { t } = useTranslation();
  const { changeLanguage, language } = useLanguage();

  const handleContinue = async () => {
    await storage.setOnboardingDone();
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top hero */}
      <View style={styles.hero}>
        <View style={styles.logoBox}>
          <Ionicons name="cut" size={36} color={colors.accent} />
        </View>
        <Text style={styles.logo}>{t('app.name')}</Text>
        <Text style={styles.tagline}>{t('welcome.description')}</Text>
      </View>

      {/* Language selection */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('welcome.subtitle')}</Text>
        <View style={styles.languages}>
          {LANGUAGES.map((lang) => {
            const isActive = language === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.langBtn, isActive && styles.langBtnActive]}
                onPress={() => changeLanguage(lang.code)}
                activeOpacity={0.75}
              >
                <Text style={styles.langFlag}>{lang.icon}</Text>
                <Text style={[styles.langLabel, isActive && styles.langLabelActive]}>
                  {lang.label}
                </Text>
                {isActive && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.accent} style={{ marginStart: 'auto' }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        <Button title={t('welcome.continue')} onPress={handleContinue} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: {
    backgroundColor: colors.navy,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logo: {
    fontSize: 40,
    fontFamily: 'Outfit-Bold',
    color: colors.white,
    marginBottom: 10,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 15,
    fontFamily: 'Outfit-Regular',
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
    marginBottom: 16,
    textAlign: 'auto',
  },
  languages: { gap: 10 },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  langBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  langFlag: { fontSize: 22 },
  langLabel: {
    fontSize: 15,
    fontFamily: 'Outfit-Medium',
    color: colors.black,
    textAlign: 'auto',
  },
  langLabelActive: { color: colors.accent, fontFamily: 'Outfit-SemiBold' },
  footer: { backgroundColor: colors.white, padding: 24, paddingTop: 12 },
});
