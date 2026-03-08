import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { salonsApi } from '../../api/salons';
import { bookingsApi } from '../../api/bookings';
import { SalonCard } from '../../components/salon/SalonCard';
import { AppointmentCard } from '../../components/booking/AppointmentCard';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { colors } from '../../theme/colors';
import type { ClientHomeScreenProps } from '../../types/navigation';

export function HomeScreen({ navigation }: ClientHomeScreenProps<'Home'>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { language } = useLanguage();

  const { data: salonsData, isLoading: salonsLoading } = useQuery({
    queryKey: ['salons', 'top'],
    queryFn: () => salonsApi.search({ per_page: 5 }),
  });

  const { data: bookingsData } = useQuery({
    queryKey: ['bookings', 'upcoming'],
    queryFn: () => bookingsApi.getMyBookings({ status: 'upcoming' }),
  });

  const salons = salonsData?.data?.salons || salonsData?.data || [];
  const upcomingBooking = bookingsData?.data?.[0];

  if (salonsLoading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.greeting}>
          {t('home.greeting')}, {user?.first_name}
        </Text>

        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('Search', {})}
        >
          <Text style={styles.searchText}>{t('home.searchPlaceholder')}</Text>
        </TouchableOpacity>

        {upcomingBooking && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('home.upcomingTitle')}</Text>
            <AppointmentCard
              booking={upcomingBooking}
              onPress={() => {}}
              language={language}
            />
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.topRated')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Search', {})}>
              <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
            </TouchableOpacity>
          </View>
          {salons.map((salon: any) => (
            <SalonCard
              key={salon.id}
              salon={salon}
              language={language}
              onPress={() => navigation.navigate('SalonDetail', { salonId: salon.id })}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16 },
  greeting: { fontSize: 24, fontWeight: '700', color: colors.black, marginBottom: 16, textAlign: 'auto' },
  searchBar: {
    backgroundColor: colors.white, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: colors.border, marginBottom: 24,
  },
  searchText: { fontSize: 14, color: colors.gray, textAlign: 'auto' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.black, textAlign: 'auto', marginBottom: 12 },
  seeAll: { fontSize: 14, color: colors.accent },
});
