import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { I18nManager } from 'react-native';
import i18n from '../i18n';
import { storage } from '../utils/storage';
import { usersApi } from '../api/users';

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
      // In production, would call Updates.reloadAsync() here
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
