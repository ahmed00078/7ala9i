import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { storage } from '../utils/storage';
import { usersApi } from '../api/users';
import { useAlert } from './AlertContext';

interface LanguageContextType {
  language: string;
  isRTL: boolean;
  changeLanguage: (lang: string) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  isRTL: true,
  changeLanguage: async () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState(i18n.language || 'ar');

  useEffect(() => {
    (async () => {
      const saved = await storage.getLanguage();
      if (saved && saved !== language) {
        await i18n.changeLanguage(saved);
        setLanguage(saved);
        const shouldBeRTL = saved === 'ar';
        if (I18nManager.isRTL !== shouldBeRTL) {
          I18nManager.forceRTL(shouldBeRTL);
        }
      }
    })();
  }, []);

  const changeLanguage = useCallback(async (lang: string) => {
    await i18n.changeLanguage(lang);
    await storage.setLanguage(lang);
    setLanguage(lang);

    // Sync language preference to backend (for push notification language)
    try {
      await usersApi.updateProfile({ language_pref: lang });
    } catch {
      // Ignore — user may not be authenticated yet
    }

    const shouldBeRTL = lang === 'ar';
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.forceRTL(shouldBeRTL);
    }
  }, []);

  return (
    <LanguageContext.Provider
      value={{
        language,
        isRTL: language === 'ar',
        changeLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

/**
 * Switch language with confirm + full app reload. Use this from runtime
 * settings screens (profile). Live-switching language never picks up RTL,
 * cached translations, or expo-localized date/number formats — a full reload
 * is the only consistent way.
 *
 * The hook must be called from inside the AlertProvider tree.
 */
export function useChangeLanguageWithConfirm() {
  const { language, changeLanguage } = useLanguage();
  const { show } = useAlert();
  const { t } = useTranslation();

  return useCallback(
    (lang: string) => {
      if (lang === language) return;
      show({
        type: 'confirm',
        title: t('profile.languageReload.title'),
        message: t('profile.languageReload.message'),
        confirmText: t('profile.languageReload.confirm'),
        cancelText: t('profile.languageReload.cancel'),
        onConfirm: async () => {
          await changeLanguage(lang);
          try {
            const Updates = await import('expo-updates');
            await Updates.reloadAsync();
          } catch (err) {
            console.warn('[lang] reload failed', err);
          }
        },
      });
    },
    [language, changeLanguage, show, t],
  );
}
