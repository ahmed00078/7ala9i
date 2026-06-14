// `react-native-gesture-handler` MUST be the very first import in the entry
// file — its native handlers attach during module load.
import 'react-native-gesture-handler';

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ToastProvider } from './src/components/premium/ToastProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/contexts/AuthContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { AlertProvider } from './src/contexts/AlertContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useNotificationHandler } from './src/hooks/useNotificationHandler';
import { useFonts } from 'expo-font';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_900Black,
} from '@expo-google-fonts/outfit';
import {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
} from '@expo-google-fonts/tajawal';
import {
  NotoNaskhArabic_400Regular,
  NotoNaskhArabic_700Bold,
} from '@expo-google-fonts/noto-naskh-arabic';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';
import './src/i18n';

// Only set up push notification handler in real builds — use dynamic import so
// the module is never loaded in Expo Go (SDK 53+ removed remote push support there)
if (Constants.appOwnership !== 'expo') {
  import('expo-notifications').then((Notifications) => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
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

function NotificationHandlerSetup() {
  useNotificationHandler();
  return null;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'Outfit-Regular': Outfit_400Regular,
    'Outfit-Medium': Outfit_500Medium,
    'Outfit-SemiBold': Outfit_600SemiBold,
    'Outfit-Bold': Outfit_700Bold,
    'Outfit-Black': Outfit_900Black,
    'Tajawal-Regular': Tajawal_400Regular,
    'Tajawal-Medium': Tajawal_500Medium,
    'Tajawal-SemiBold': Tajawal_700Bold,
    'Tajawal-Bold': Tajawal_700Bold,
    'NotoNaskhArabic-Regular': NotoNaskhArabic_400Regular,
    'NotoNaskhArabic-Bold': NotoNaskhArabic_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <AuthProvider>
              <AlertProvider>
                <ToastProvider>
                  <BottomSheetModalProvider>
                    <RootNavigator />
                  </BottomSheetModalProvider>
                  <NotificationHandlerSetup />
                  <StatusBar style="auto" />
                </ToastProvider>
              </AlertProvider>
            </AuthProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
