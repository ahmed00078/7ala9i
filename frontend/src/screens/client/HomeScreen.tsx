import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Dark navy hero header */}
      <View style={styles.hero}>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.greetingSmall}>{t('home.greeting')}</Text>
            <Text style={styles.greetingName}>{user?.first_name} 👋</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Search bar inside hero */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('Search', {})}
          activeOpacity={0.85}
        >
          <Ionicons name="search-outline" size={18} color={colors.gray} />
          <Text style={styles.searchText}>{t('home.searchPlaceholder')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Upcoming appointment */}
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

        {/* Top rated */}
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

  /* Hero */
  hero: {
    backgroundColor: colors.navy,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greetingSmall: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'auto',
  },
  greetingName: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    color: colors.white,
    textAlign: 'auto',
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchText: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.gray,
    textAlign: 'auto',
    flex: 1,
  },

  /* Content */
  scroll: { padding: 16 },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
    textAlign: 'auto',
    marginBottom: 14,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: 'Outfit-Medium',
    color: colors.accent,
    marginBottom: 14,
  },
});
