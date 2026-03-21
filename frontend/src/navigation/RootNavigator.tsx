import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import * as Linking from 'expo-linking';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { OfflineBanner } from '../components/ui/OfflineBanner';
import { AuthStack } from './AuthStack';
import { ClientTabs } from './ClientTabs';
import { OwnerTabs } from './OwnerTabs';
import { AdminTabs } from './AdminTabs';
import { linking } from './linking';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Module-level pending URL — stored before React state is ready
let pendingDeepLink: string | null = null;

export function RootNavigator() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const prevAuthenticated = useRef(isAuthenticated);

  // When unauthenticated: capture deep links that arrive so we can replay after login
  useEffect(() => {
    if (!isAuthenticated) {
      Linking.getInitialURL().then((url) => {
        if (url) pendingDeepLink = url;
      });
      const sub = Linking.addEventListener('url', ({ url }) => {
        pendingDeepLink = url;
      });
      return () => sub.remove();
    }
  }, [isAuthenticated]);

  // When user logs in: replay any stored deep link
  useEffect(() => {
    if (isAuthenticated && !prevAuthenticated.current && pendingDeepLink) {
      const url = pendingDeepLink;
      pendingDeepLink = null;
      setTimeout(() => Linking.openURL(url), 100);
    }
    prevAuthenticated.current = isAuthenticated;
  }, [isAuthenticated]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <View testID="app-ready" style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef} linking={linking}>
        <>
          <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
            {!isAuthenticated ? (
              <Stack.Screen name="Auth" component={AuthStack} />
            ) : user?.role === 'admin' ? (
              <Stack.Screen name="AdminMain" component={AdminTabs} />
            ) : user?.role === 'owner' ? (
              <Stack.Screen name="OwnerMain" component={OwnerTabs} />
            ) : (
              <Stack.Screen name="ClientMain" component={ClientTabs} />
            )}
          </Stack.Navigator>
          <OfflineBanner />
        </>
      </NavigationContainer>
    </View>
  );
}
