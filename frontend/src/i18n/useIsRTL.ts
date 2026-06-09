import { useTranslation } from 'react-i18next';

import i18n from './index';

export const RTL_LANGUAGES = ['ar'];

/**
 * Reactive RTL check tied to the current i18n language (not `I18nManager.isRTL`,
 * which doesn't update until the JS bundle reloads after `forceRTL`). Use this
 * for any direction-sensitive icon/glyph choice (chevrons, arrows, etc.) so the
 * UI stays in sync with the user-selected language immediately.
 */
export function useIsRTL(): boolean {
  const { i18n: instance } = useTranslation();
  return RTL_LANGUAGES.includes(instance.language);
}

/** Non-hook variant for module-level / non-React contexts. */
export function isRTL(): boolean {
  return RTL_LANGUAGES.includes(i18n.language);
}
