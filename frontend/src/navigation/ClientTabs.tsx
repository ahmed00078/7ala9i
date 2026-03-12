import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

import { HomeScreen } from '../screens/client/HomeScreen';
import { SearchScreen } from '../screens/client/SearchScreen';
import { SalonDetailScreen } from '../screens/client/SalonDetailScreen';
import { BookingFlowScreen } from '../screens/client/BookingFlowScreen';
import { BookingConfirmScreen } from '../screens/client/BookingConfirmScreen';
import { MapSearchScreen } from '../screens/client/MapSearchScreen';
import { WriteReviewScreen } from '../screens/client/WriteReviewScreen';
import { AppointmentsScreen } from '../screens/client/AppointmentsScreen';
import { RescheduleBookingScreen } from '../screens/client/RescheduleBookingScreen';
import { FavoritesScreen } from '../screens/client/FavoritesScreen';
import { ProfileScreen } from '../screens/client/ProfileScreen';
import { NotificationsScreen } from '../screens/shared/NotificationsScreen';

import type {
  ClientTabParamList,
  ClientHomeStackParamList,
  ClientAppointmentsStackParamList,
  ClientFavoritesStackParamList,
  ClientProfileStackParamList,
} from '../types/navigation';

const HomeStack = createNativeStackNavigator<ClientHomeStackParamList>();
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="Search" component={SearchScreen} />
      <HomeStack.Screen name="SalonDetail" component={SalonDetailScreen} />
      <HomeStack.Screen name="BookingFlow" component={BookingFlowScreen} />
      <HomeStack.Screen name="BookingConfirm" component={BookingConfirmScreen} />
      <HomeStack.Screen name="MapSearch" component={MapSearchScreen} />
      <HomeStack.Screen name="WriteReview" component={WriteReviewScreen} />
      <HomeStack.Screen name="Notifications" component={NotificationsScreen} />
    </HomeStack.Navigator>
  );
}

const AppointmentsStack = createNativeStackNavigator<ClientAppointmentsStackParamList>();
function AppointmentsStackNavigator() {
  return (
    <AppointmentsStack.Navigator screenOptions={{ headerShown: false }}>
      <AppointmentsStack.Screen name="Appointments" component={AppointmentsScreen} />
      <AppointmentsStack.Screen name="SalonDetail" component={SalonDetailScreen as any} />
      <AppointmentsStack.Screen name="BookingFlow" component={BookingFlowScreen as any} />
      <AppointmentsStack.Screen name="BookingConfirm" component={BookingConfirmScreen as any} />
      <AppointmentsStack.Screen name="WriteReview" component={WriteReviewScreen as any} />
      <AppointmentsStack.Screen name="RescheduleBooking" component={RescheduleBookingScreen as any} />
    </AppointmentsStack.Navigator>
  );
}

const FavoritesStack = createNativeStackNavigator<ClientFavoritesStackParamList>();
function FavoritesStackNavigator() {
  return (
    <FavoritesStack.Navigator screenOptions={{ headerShown: false }}>
      <FavoritesStack.Screen name="Favorites" component={FavoritesScreen} />
      <FavoritesStack.Screen name="SalonDetail" component={SalonDetailScreen as any} />
      <FavoritesStack.Screen name="BookingFlow" component={BookingFlowScreen as any} />
      <FavoritesStack.Screen name="BookingConfirm" component={BookingConfirmScreen as any} />
    </FavoritesStack.Navigator>
  );
}

const ProfileStack = createNativeStackNavigator<ClientProfileStackParamList>();
function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
    </ProfileStack.Navigator>
  );
}

const Tab = createBottomTabNavigator<ClientTabParamList>();

export function ClientTabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.gray,
        tabBarLabelStyle: { fontFamily: 'Outfit-Medium', fontSize: 11, marginBottom: 2 },
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          backgroundColor: colors.white,
          elevation: 8,
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AppointmentsTab"
        component={AppointmentsStackNavigator}
        options={{
          tabBarLabel: t('tabs.appointments'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesStackNavigator}
        options={{
          tabBarLabel: t('tabs.favorites'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: t('tabs.profile'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
