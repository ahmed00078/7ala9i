import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { AuthStack } from './AuthStack';
import { ClientTabs } from './ClientTabs';
import { OwnerTabs } from './OwnerTabs';
import { AdminTabs } from './AdminTabs';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
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
    </NavigationContainer>
  );
}
