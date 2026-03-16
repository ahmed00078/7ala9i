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
  phone: string;
  email: string | null;
  first_name: string;
  last_name: string;
  role: 'client' | 'owner' | 'admin';
  language_pref: string;
  is_approved: boolean;
}

interface RegisterResult {
  isPending: boolean;
  requiresVerification?: boolean;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: {
    phone: string;
    email?: string;
    password: string;
    first_name: string;
    last_name: string;
    role: 'client' | 'owner';
    language?: string;
  }) => Promise<RegisterResult>;
  verifyOtp: (phone: string, code: string) => Promise<RegisterResult>;
  resendOtp: (phone: string, language?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => ({ isPending: false }),
  verifyOtp: async () => ({ isPending: false }),
  resendOtp: async () => {},
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
    // Push token registration failed — silently ignore
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

  const login = useCallback(async (identifier: string, password: string) => {
    const { data } = await authApi.login(identifier, password);
    await storage.setAccessToken(data.access_token);
    await storage.setRefreshToken(data.refresh_token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (regData: {
    phone: string;
    email?: string;
    password: string;
    first_name: string;
    last_name: string;
    role: 'client' | 'owner';
    language?: string;
  }): Promise<RegisterResult> => {
    const { data } = await authApi.register(regData);
    // Always requires OTP verification — never auto-login here
    return {
      requiresVerification: true,
      isPending: data.is_pending ?? false,
      message: data.message,
    };
  }, []);

  const verifyOtp = useCallback(async (phone: string, code: string): Promise<RegisterResult> => {
    const { data } = await authApi.verifyOtp(phone, code);

    if (data.is_pending) {
      return { isPending: true, message: data.message };
    }

    // Client — store tokens and set user
    await storage.setAccessToken(data.access_token!);
    await storage.setRefreshToken(data.refresh_token!);
    setUser(data.user);
    return { isPending: false };
  }, []);

  const resendOtp = useCallback(async (phone: string, language = 'fr'): Promise<void> => {
    await authApi.resendOtp(phone, language);
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
        verifyOtp,
        resendOtp,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
