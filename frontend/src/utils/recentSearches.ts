import * as SecureStore from 'expo-secure-store';

const KEY = '7ala9i_search_recents';
const MAX = 6;

export const recentSearches = {
  async load(): Promise<string[]> {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX) : [];
    } catch {
      return [];
    }
  },

  async push(query: string): Promise<string[]> {
    const trimmed = query.trim();
    if (!trimmed) return this.load();
    const current = await this.load();
    const next = [trimmed, ...current.filter((r) => r !== trimmed)].slice(0, MAX);
    try {
      await SecureStore.setItemAsync(KEY, JSON.stringify(next));
    } catch {
      // silent — recents are best-effort
    }
    return next;
  },

  async clear(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(KEY);
    } catch {
      // silent
    }
  },
};
