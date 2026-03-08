import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { useLanguage } from '../../contexts/LanguageContext';
import { storage } from '../../utils/storage';
import { colors } from '../../theme/colors';
import type { AuthScreenProps } from '../../types/navigation';

export function WelcomeScreen({ navigation }: AuthScreenProps<'Welcome'>) {
  const { t } = useTranslation();
  const { changeLanguage, language } = useLanguage();

  const languages = [
    { code: 'ar', label: 'العربية' },
    { code: 'fr', label: 'Français' },
    { code: 'en', label: 'English' },
  ];

  const handleContinue = async () => {
    await storage.setOnboardingDone();
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>{t('app.name')}</Text>
        <Text style={styles.tagline}>{t('welcome.description')}</Text>

        <Text style={styles.subtitle}>{t('welcome.subtitle')}</Text>
        <View style={styles.languages}>
          {languages.map((lang) => (
            <Button
              key={lang.code}
              title={lang.label}
              variant={language === lang.code ? 'primary' : 'outline'}
              onPress={() => changeLanguage(lang.code)}
              style={styles.langButton}
            />
          ))}
        </View>
      </View>
      <View style={styles.bottom}>
        <Button title={t('welcome.continue')} onPress={handleContinue} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.black,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: colors.grayDark,
    textAlign: 'center',
    marginBottom: 48,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.black,
    marginBottom: 16,
    textAlign: 'center',
  },
  languages: {
    width: '100%',
    gap: 12,
  },
  langButton: {
    marginBottom: 0,
  },
  bottom: {
    padding: 24,
  },
});
