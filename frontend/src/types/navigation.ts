import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// Auth Stack
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

// Client Stack (nested in tabs)
export type ClientHomeStackParamList = {
  Home: undefined;
  Search: { query?: string };
  SalonDetail: { salonId: string };
  BookingFlow: { salonId: string; serviceId: string; serviceName: string; duration: number; price: number };
  BookingConfirm: {
    salonId: string;
    serviceId: string;
    serviceName: string;
    date: string;
    startTime: string;
    duration: number;
    price: number;
    salonName: string;
  };
  MapSearch: undefined;
  WriteReview: { salonId: string; bookingId: string; salonName: string };
};

export type ClientAppointmentsStackParamList = {
  Appointments: undefined;
  SalonDetail: { salonId: string };
  WriteReview: { salonId: string; bookingId: string; salonName: string };
};

export type ClientFavoritesStackParamList = {
  Favorites: undefined;
  SalonDetail: { salonId: string };
};

export type ClientProfileStackParamList = {
  Profile: undefined;
};

export type ClientTabParamList = {
  HomeTab: NavigatorScreenParams<ClientHomeStackParamList>;
  AppointmentsTab: NavigatorScreenParams<ClientAppointmentsStackParamList>;
  FavoritesTab: NavigatorScreenParams<ClientFavoritesStackParamList>;
  ProfileTab: NavigatorScreenParams<ClientProfileStackParamList>;
};

// Owner Stack
export type OwnerDashboardStackParamList = {
  Dashboard: undefined;
};

export type OwnerCalendarStackParamList = {
  Calendar: undefined;
};

export type OwnerServicesStackParamList = {
  ManageServices: undefined;
};

export type OwnerHoursStackParamList = {
  WorkingHours: undefined;
};

export type OwnerPreviewStackParamList = {
  SalonPreview: undefined;
};

export type OwnerProfileStackParamList = {
  OwnerProfile: undefined;
};

export type OwnerTabParamList = {
  DashboardTab: NavigatorScreenParams<OwnerDashboardStackParamList>;
  CalendarTab: NavigatorScreenParams<OwnerCalendarStackParamList>;
  ServicesTab: NavigatorScreenParams<OwnerServicesStackParamList>;
  HoursTab: NavigatorScreenParams<OwnerHoursStackParamList>;
  PreviewTab: NavigatorScreenParams<OwnerPreviewStackParamList>;
  ProfileTab: NavigatorScreenParams<OwnerProfileStackParamList>;
};

// Root
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  ClientMain: NavigatorScreenParams<ClientTabParamList>;
  OwnerMain: NavigatorScreenParams<OwnerTabParamList>;
};

// Screen Props helpers
export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>;
export type ClientHomeScreenProps<T extends keyof ClientHomeStackParamList> = NativeStackScreenProps<ClientHomeStackParamList, T>;
export type ClientAppointmentsScreenProps<T extends keyof ClientAppointmentsStackParamList> = NativeStackScreenProps<ClientAppointmentsStackParamList, T>;
export type ClientFavoritesScreenProps<T extends keyof ClientFavoritesStackParamList> = NativeStackScreenProps<ClientFavoritesStackParamList, T>;
export type ClientProfileScreenProps<T extends keyof ClientProfileStackParamList> = NativeStackScreenProps<ClientProfileStackParamList, T>;
export type OwnerDashboardScreenProps<T extends keyof OwnerDashboardStackParamList> = NativeStackScreenProps<OwnerDashboardStackParamList, T>;
export type OwnerCalendarScreenProps<T extends keyof OwnerCalendarStackParamList> = NativeStackScreenProps<OwnerCalendarStackParamList, T>;
export type OwnerServicesScreenProps<T extends keyof OwnerServicesStackParamList> = NativeStackScreenProps<OwnerServicesStackParamList, T>;
export type OwnerHoursScreenProps<T extends keyof OwnerHoursStackParamList> = NativeStackScreenProps<OwnerHoursStackParamList, T>;
export type OwnerPreviewScreenProps<T extends keyof OwnerPreviewStackParamList> = NativeStackScreenProps<OwnerPreviewStackParamList, T>;
export type OwnerProfileScreenProps<T extends keyof OwnerProfileStackParamList> = NativeStackScreenProps<OwnerProfileStackParamList, T>;
