import React, { useState } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { bookingsApi } from '../../api/bookings';
import { AppointmentCard } from '../../components/booking/AppointmentCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { colors } from '../../theme/colors';
import type { ClientAppointmentsScreenProps } from '../../types/navigation';

export function AppointmentsScreen({ navigation }: ClientAppointmentsScreenProps<'Appointments'>) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', tab],
    queryFn: () => bookingsApi.getMyBookings({ status: tab }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => bookingsApi.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  });

  const bookings = data?.data || [];

  const handlePress = (booking: any) => {
    if (booking.status === 'confirmed') {
      Alert.alert(
        t('booking.cancelBooking'),
        t('booking.cancelConfirm'),
        [
          { text: t('common.no'), style: 'cancel' },
          { text: t('common.yes'), style: 'destructive', onPress: () => cancelMutation.mutate(booking.id) },
        ]
      );
    } else if (booking.status === 'completed') {
      navigation.navigate('WriteReview', {
        salonId: booking.salon_id || booking.salon?.id,
        bookingId: booking.id,
        salonName: booking.salon?.name || '',
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Dark header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('appointments.title')}</Text>

        {/* Pill tabs */}
        <View style={styles.tabContainer}>
          {(['upcoming', 'past'] as const).map((t2) => (
            <TouchableOpacity
              key={t2}
              style={[styles.tab, tab === t2 && styles.tabActive]}
              onPress={() => setTab(t2)}
            >
              <Text style={[styles.tabText, tab === t2 && styles.tabTextActive]}>
                {t(`appointments.${t2}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View>
              <AppointmentCard booking={item} onPress={() => handlePress(item)} language={language} />
              {item.status === 'completed' && (
                <TouchableOpacity
                  style={styles.reviewBtn}
                  onPress={() => navigation.navigate('WriteReview', {
                    salonId: item.salon_id || item.salon?.id,
                    bookingId: item.id,
                    salonName: item.salon?.name || '',
                  })}
                >
                  <Ionicons name="star-outline" size={15} color={colors.accent} />
                  <Text style={styles.reviewBtnText}>{t('review.writeReview')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              title={t(`appointments.no${tab === 'upcoming' ? 'Upcoming' : 'Past'}`)}
              subtitle={t(`appointments.no${tab === 'upcoming' ? 'Upcoming' : 'Past'}Hint`)}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    color: colors.white,
    marginBottom: 16,
    textAlign: 'auto',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: colors.white,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: 'rgba(255,255,255,0.65)',
  },
  tabTextActive: {
    color: colors.navy,
    fontFamily: 'Outfit-SemiBold',
  },
  list: { padding: 16 },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -8,
    marginBottom: 12,
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: colors.accentLight,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  reviewBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit-SemiBold',
    color: colors.accent,
  },
});
