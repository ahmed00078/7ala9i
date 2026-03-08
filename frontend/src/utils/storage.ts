import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = '7ala9i_access_token';
const REFRESH_TOKEN_KEY = '7ala9i_refresh_token';
const LANGUAGE_KEY = '7ala9i_language';
const ONBOARDING_KEY = '7ala9i_onboarding_done';

export const storage = {
  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setAccessToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  },

  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },

  async getLanguage(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(LANGUAGE_KEY);
    } catch {
      return null;
    }
  },

  async setLanguage(lang: string): Promise<void> {
    await SecureStore.setItemAsync(LANGUAGE_KEY, lang);
  },

  async isOnboardingDone(): Promise<boolean> {
    try {
      const val = await SecureStore.getItemAsync(ONBOARDING_KEY);
      return val === 'true';
    } catch {
      return false;
    }
  },

  async setOnboardingDone(): Promise<void> {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
  },
};
