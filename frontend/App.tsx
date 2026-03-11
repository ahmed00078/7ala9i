import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/contexts/AuthContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { AlertProvider } from './src/contexts/AlertContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useFonts } from 'expo-font';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
} from '@expo-google-fonts/tajawal';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';
import './src/i18n';

// Only set up push notification handler in real builds — use dynamic import so
// the module is never loaded in Expo Go (SDK 53+ removed remote push support there)
if (Constants.appOwnership !== 'expo') {
  import('expo-notifications').then((Notifications) => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  });
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

export default function App() {
  const [fontsLoaded] = useFonts({
    'Outfit-Regular': Outfit_400Regular,
    'Outfit-Medium': Outfit_500Medium,
    'Outfit-SemiBold': Outfit_600SemiBold,
    'Outfit-Bold': Outfit_700Bold,
    'Tajawal-Regular': Tajawal_400Regular,
    'Tajawal-Medium': Tajawal_500Medium,
    'Tajawal-SemiBold': Tajawal_700Bold,
    'Tajawal-Bold': Tajawal_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <AlertProvider>
            <RootNavigator />
            <StatusBar style="auto" />
          </AlertProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
