import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import ar from './ar.json';
import fr from './fr.json';
import en from './en.json';

const resources = {
  ar: { translation: ar },
  fr: { translation: fr },
  en: { translation: en },
};

const deviceLang = Localization.getLocales()[0]?.languageCode ?? 'ar';
const defaultLang = ['ar', 'fr', 'en'].includes(deviceLang) ? deviceLang : 'ar';

i18n.use(initReactI18next).init({
  resources,
  lng: defaultLang,
  fallbackLng: 'fr',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v3',
});

export default i18n;
