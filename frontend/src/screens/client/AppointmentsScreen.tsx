import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
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
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{t('appointments.title')}</Text>
      <View style={styles.tabs}>
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

      {isLoading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.list}
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
                  <Ionicons name="star-outline" size={16} color={colors.accent} />
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
  title: { fontSize: 22, fontWeight: '700', color: colors.black, padding: 16, textAlign: 'auto' },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.accent },
  tabText: { fontSize: 14, color: colors.gray, fontWeight: '500' },
  tabTextActive: { color: colors.accent, fontWeight: '600' },
  list: { padding: 16 },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -8,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.accentLight,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  reviewBtnText: { fontSize: 13, color: colors.accent, fontWeight: '600' },
});
