import React, { useState } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAlert } from '../../contexts/AlertContext';
import { bookingsApi } from '../../api/bookings';
import { AppointmentCard } from '../../components/booking/AppointmentCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { colors } from '../../theme/colors';
import type { ClientAppointmentsScreenProps } from '../../types/navigation';

export function AppointmentsScreen({ navigation }: ClientAppointmentsScreenProps<'Appointments'>) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const alert = useAlert();
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

  const handleCancel = (bookingId: string) => {
    alert.show({
      type: 'confirm',
      title: t('booking.cancelBooking'),
      message: t('booking.cancelConfirm'),
      confirmText: t('common.yes'),
      cancelText: t('common.no'),
      onConfirm: () => cancelMutation.mutate(bookingId),
    });
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
          renderItem={({ item }) => {
            const hasAttached = item.status === 'confirmed' || item.status === 'completed';
            return (
              <View>
                <AppointmentCard
                  booking={item}
                  language={language}
                  noBottomRadius={hasAttached}
                />

                {/* Cancel + Modify buttons for confirmed bookings */}
                {item.status === 'confirmed' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => handleCancel(item.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle-outline" size={14} color={colors.error} />
                      <Text style={styles.cancelBtnText}>{t('booking.cancelBooking')}</Text>
                    </TouchableOpacity>
                    <View style={styles.actionDivider} />
                    <TouchableOpacity
                      style={styles.modifyBtn}
                      onPress={() => navigation.navigate('RescheduleBooking', {
                        bookingId: item.id,
                        salonId: item.salon_id || item.salon?.id,
                        serviceId: item.service_id || item.service?.id,
                        salonName: item.salon?.name || '',
                        serviceName: item.service?.name || '',
                        currentDate: item.booking_date,
                        duration: item.service?.duration || 30,
                        price: item.total_price,
                      })}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create-outline" size={14} color={colors.accentDark} />
                      <Text style={styles.modifyBtnText}>{t('booking.modifyBooking')}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Write Review for completed bookings without a review */}
                {item.status === 'completed' && !item.has_review && (
                  <TouchableOpacity
                    style={styles.reviewBtn}
                    onPress={() => navigation.navigate('WriteReview', {
                      salonId: item.salon_id || item.salon?.id,
                      bookingId: item.id,
                      salonName: item.salon?.name || '',
                    })}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="star-outline" size={15} color={colors.accent} />
                    <Text style={styles.reviewBtnText}>{t('review.writeReview')}</Text>
                  </TouchableOpacity>
                )}

                {/* Already reviewed badge */}
                {item.status === 'completed' && item.has_review === true && (
                  <View style={styles.reviewedBadge}>
                    <Ionicons name="checkmark-circle" size={15} color={colors.success} />
                    <Text style={styles.reviewedText}>{t('review.reviewed')}</Text>
                  </View>
                )}
              </View>
            );
          }}
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
  list: { padding: 16, paddingBottom: 32 },

  // Action buttons attached to confirmed booking cards
  actionRow: {
    flexDirection: 'row',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    backgroundColor: colors.errorLight,
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit-SemiBold',
    color: colors.error,
  },
  actionDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  modifyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    backgroundColor: colors.accentLight,
  },
  modifyBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit-SemiBold',
    color: colors.accentDark,
  },

  // Review button attached to completed booking cards
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.accentLight,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    marginBottom: 12,
  },
  reviewBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit-SemiBold',
    color: colors.accent,
  },

  // Already reviewed badge
  reviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: colors.successLight,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    marginBottom: 12,
  },
  reviewedText: {
    fontSize: 13,
    fontFamily: 'Outfit-SemiBold',
    color: colors.successDark,
  },
});
