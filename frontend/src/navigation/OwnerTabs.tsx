import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

import { DashboardScreen } from '../screens/owner/DashboardScreen';
import { CalendarScreen } from '../screens/owner/CalendarScreen';
import { ManageServicesScreen } from '../screens/owner/ManageServicesScreen';
import { WorkingHoursScreen } from '../screens/owner/WorkingHoursScreen';
import { SalonPreviewScreen } from '../screens/owner/SalonPreviewScreen';
import { OwnerProfileScreen } from '../screens/owner/OwnerProfileScreen';
import { NotificationsScreen } from '../screens/shared/NotificationsScreen';

import type {
  OwnerTabParamList,
  OwnerDashboardStackParamList,
  OwnerCalendarStackParamList,
  OwnerServicesStackParamList,
  OwnerHoursStackParamList,
  OwnerPreviewStackParamList,
  OwnerProfileStackParamList,
} from '../types/navigation';

const DashStack = createNativeStackNavigator<OwnerDashboardStackParamList>();
function DashStackNav() {
  return (
    <DashStack.Navigator screenOptions={{ headerShown: false }}>
      <DashStack.Screen name="Dashboard" component={DashboardScreen} />
      <DashStack.Screen name="Notifications" component={NotificationsScreen} />
    </DashStack.Navigator>
  );
}

const CalStack = createNativeStackNavigator<OwnerCalendarStackParamList>();
function CalStackNav() {
  return (
    <CalStack.Navigator screenOptions={{ headerShown: false }}>
      <CalStack.Screen name="Calendar" component={CalendarScreen} />
    </CalStack.Navigator>
  );
}

const SvcStack = createNativeStackNavigator<OwnerServicesStackParamList>();
function SvcStackNav() {
  return (
    <SvcStack.Navigator screenOptions={{ headerShown: false }}>
      <SvcStack.Screen name="ManageServices" component={ManageServicesScreen} />
    </SvcStack.Navigator>
  );
}

const HrsStack = createNativeStackNavigator<OwnerHoursStackParamList>();
function HrsStackNav() {
  return (
    <HrsStack.Navigator screenOptions={{ headerShown: false }}>
      <HrsStack.Screen name="WorkingHours" component={WorkingHoursScreen} />
    </HrsStack.Navigator>
  );
}

const PrevStack = createNativeStackNavigator<OwnerPreviewStackParamList>();
function PrevStackNav() {
  return (
    <PrevStack.Navigator screenOptions={{ headerShown: false }}>
      <PrevStack.Screen name="SalonPreview" component={SalonPreviewScreen} />
    </PrevStack.Navigator>
  );
}

const ProfileStack = createNativeStackNavigator<OwnerProfileStackParamList>();
function ProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="OwnerProfile" component={OwnerProfileScreen} />
    </ProfileStack.Navigator>
  );
}

const Tab = createBottomTabNavigator<OwnerTabParamList>();

export function OwnerTabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.gray,
        tabBarLabelStyle: { fontFamily: 'Outfit-Medium', fontSize: 10, marginBottom: 2 },
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
        name="DashboardTab"
        component={DashStackNav}
        options={{
          tabBarLabel: t('tabs.dashboard'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalStackNav}
        options={{
          tabBarLabel: t('tabs.calendar'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ServicesTab"
        component={SvcStackNav}
        options={{
          tabBarLabel: t('tabs.services'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'cut' : 'cut-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="HoursTab"
        component={HrsStackNav}
        options={{
          tabBarLabel: t('tabs.hours'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'time' : 'time-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PreviewTab"
        component={PrevStackNav}
        options={{
          tabBarLabel: t('tabs.preview'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'eye' : 'eye-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNav}
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
