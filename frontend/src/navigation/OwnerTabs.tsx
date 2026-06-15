import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { PremiumTabBar } from '../components/premium/PremiumTabBar';

import { DashboardScreen } from '../screens/owner/DashboardScreen';
import { EarningsScreen } from '../screens/owner/EarningsScreen';
import { CalendarScreen } from '../screens/owner/CalendarScreen';
import { ManageServicesScreen } from '../screens/owner/ManageServicesScreen';
import { WorkingHoursScreen } from '../screens/owner/WorkingHoursScreen';
import { SalonPreviewScreen } from '../screens/owner/SalonPreviewScreen';
import { SalonReviewsScreen } from '../screens/owner/SalonReviewsScreen';
import { OwnerProfileScreen } from '../screens/owner/OwnerProfileScreen';
import { EditLocationScreen } from '../screens/owner/EditLocationScreen';
import { ManagePhotosScreen } from '../screens/owner/ManagePhotosScreen';
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
    <DashStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <DashStack.Screen name="Dashboard" component={DashboardScreen} />
      <DashStack.Screen name="Notifications" component={NotificationsScreen} />
      <DashStack.Screen name="Earnings" component={EarningsScreen} />
    </DashStack.Navigator>
  );
}

const CalStack = createNativeStackNavigator<OwnerCalendarStackParamList>();
function CalStackNav() {
  return (
    <CalStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <CalStack.Screen name="Calendar" component={CalendarScreen} />
    </CalStack.Navigator>
  );
}

const SvcStack = createNativeStackNavigator<OwnerServicesStackParamList>();
function SvcStackNav() {
  return (
    <SvcStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <SvcStack.Screen name="ManageServices" component={ManageServicesScreen} />
    </SvcStack.Navigator>
  );
}

const HrsStack = createNativeStackNavigator<OwnerHoursStackParamList>();
function HrsStackNav() {
  return (
    <HrsStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <HrsStack.Screen name="WorkingHours" component={WorkingHoursScreen} />
    </HrsStack.Navigator>
  );
}

const PrevStack = createNativeStackNavigator<OwnerPreviewStackParamList>();
function PrevStackNav() {
  return (
    <PrevStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <PrevStack.Screen name="SalonPreview" component={SalonPreviewScreen} />
      <PrevStack.Screen name="SalonReviews" component={SalonReviewsScreen} />
    </PrevStack.Navigator>
  );
}

const ProfileStack = createNativeStackNavigator<OwnerProfileStackParamList>();
function ProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <ProfileStack.Screen name="OwnerProfile" component={OwnerProfileScreen} />
      <ProfileStack.Screen name="EditLocation" component={EditLocationScreen} />
      <ProfileStack.Screen name="ManagePhotos" component={ManagePhotosScreen} />
    </ProfileStack.Navigator>
  );
}

const Tab = createBottomTabNavigator<OwnerTabParamList>();

export function OwnerTabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <PremiumTabBar {...props} />}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashStackNav}
        options={{
          tabBarLabel: t('tabs.dashboard'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalStackNav}
        options={{
          tabBarLabel: t('tabs.calendar'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ServicesTab"
        component={SvcStackNav}
        options={{
          tabBarLabel: t('tabs.services'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'cut' : 'cut-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="HoursTab"
        component={HrsStackNav}
        options={{
          tabBarLabel: t('tabs.hours'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'time' : 'time-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PreviewTab"
        component={PrevStackNav}
        options={{
          tabBarLabel: t('tabs.preview'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'eye' : 'eye-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNav}
        options={{
          tabBarLabel: t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
