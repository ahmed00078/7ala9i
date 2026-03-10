import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { authApi } from '../api/auth';
import { usersApi } from '../api/users';
import { notificationsApi } from '../api/notifications';
import { storage } from '../utils/storage';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: 'client' | 'owner' | 'admin';
  language_pref: string;
  is_approved: boolean;
}

interface RegisterResult {
  isPending: boolean;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    role: 'client' | 'owner';
  }) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => ({ isPending: false }),
  logout: async () => {},
  updateUser: () => {},
});

async function registerForPushNotifications(): Promise<void> {
  // expo-notifications push support was removed from Expo Go in SDK 53.
  // Use a dynamic import so the module is never loaded in Expo Go.
  if (Constants.appOwnership === 'expo') return;
  try {
    const Notifications = await import('expo-notifications');
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    const projectId =
      (Constants.expoConfig?.extra as any)?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    await notificationsApi.registerPushToken(tokenData.data, platform);
  } catch {
    // Silently fail — never block login
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const loadUser = useCallback(async () => {
    try {
      const token = await storage.getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      const { data } = await usersApi.getProfile();
      setUser(data);
    } catch {
      await storage.clearTokens();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Register push token whenever a user session becomes active
  useEffect(() => {
    if (user) {
      registerForPushNotifications();
    }
  }, [user?.id]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    await storage.setAccessToken(data.access_token);
    await storage.setRefreshToken(data.refresh_token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (regData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    role: 'client' | 'owner';
  }): Promise<RegisterResult> => {
    const { data } = await authApi.register(regData);

    if (data.is_pending) {
      // Owner application received — do NOT auto-login
      return { isPending: true, message: data.message };
    }

    // Client — auto-login
    await storage.setAccessToken(data.access_token!);
    await storage.setRefreshToken(data.refresh_token!);
    setUser(data.user);
    return { isPending: false };
  }, []);

  const logout = useCallback(async () => {
    await storage.clearTokens();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
