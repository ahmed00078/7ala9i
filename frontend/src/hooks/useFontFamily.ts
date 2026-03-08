import { useLanguage } from '../contexts/LanguageContext';
import { getFontFamily } from '../theme/typography';

/**
 * Returns the correct font family names based on the current language.
 * Use Outfit for Latin (en/fr) and Tajawal for Arabic.
 */
export function useFontFamily() {
  const { language } = useLanguage();
  return getFontFamily(language);
}
