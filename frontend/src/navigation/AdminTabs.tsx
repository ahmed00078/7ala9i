import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminOwnersScreen } from '../screens/admin/AdminOwnersScreen';
import { AdminCreateOwnerScreen } from '../screens/admin/AdminCreateOwnerScreen';

import type {
  AdminTabParamList,
  AdminDashboardStackParamList,
  AdminOwnersStackParamList,
  AdminCreateOwnerStackParamList,
} from '../types/navigation';

const DashStack = createNativeStackNavigator<AdminDashboardStackParamList>();
function DashStackNav() {
  return (
    <DashStack.Navigator screenOptions={{ headerShown: false }}>
      <DashStack.Screen name="Dashboard" component={AdminDashboardScreen} />
    </DashStack.Navigator>
  );
}

const OwnersStack = createNativeStackNavigator<AdminOwnersStackParamList>();
function OwnersStackNav() {
  return (
    <OwnersStack.Navigator screenOptions={{ headerShown: false }}>
      <OwnersStack.Screen name="Owners" component={AdminOwnersScreen} />
    </OwnersStack.Navigator>
  );
}

const CreateStack = createNativeStackNavigator<AdminCreateOwnerStackParamList>();
function CreateStackNav() {
  return (
    <CreateStack.Navigator screenOptions={{ headerShown: false }}>
      <CreateStack.Screen name="CreateOwner" component={AdminCreateOwnerScreen} />
    </CreateStack.Navigator>
  );
}

const Tab = createBottomTabNavigator<AdminTabParamList>();

export function AdminTabs() {
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
          tabBarLabel: t('admin.tabs.dashboard'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="OwnersTab"
        component={OwnersStackNav}
        options={{
          tabBarLabel: t('admin.tabs.owners'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CreateOwnerTab"
        component={CreateStackNav}
        options={{
          tabBarLabel: t('admin.tabs.create'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person-add' : 'person-add-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
