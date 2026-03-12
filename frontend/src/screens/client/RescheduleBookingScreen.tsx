import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { salonsApi } from '../../api/salons';
import { bookingsApi } from '../../api/bookings';
import { CalendarPicker } from '../../components/booking/CalendarPicker';
import { TimeSlotGrid } from '../../components/booking/TimeSlotGrid';
import { useLanguage } from '../../contexts/LanguageContext';
import { colors } from '../../theme/colors';
import { formatCurrency } from '../../utils/formatters';
import { ClientAppointmentsScreenProps } from '../../types/navigation';

type Props = ClientAppointmentsScreenProps<'RescheduleBooking'>;

export function RescheduleBookingScreen({ route }: Props) {
  const { bookingId, salonId, serviceId, salonName, serviceName, currentDate, duration, price } = route.params;
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['reschedule', 'availability', salonId, serviceId, selectedDate],
    queryFn: () => salonsApi.getAvailability(salonId, { date: selectedDate, service_id: serviceId }),
  });

  const slots: string[] = data?.data?.slots || [];

  const mutation = useMutation({
    mutationFn: () =>
      bookingsApi.reschedule(bookingId, { booking_date: selectedDate, start_time: selectedSlot! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      Alert.alert(
        t('booking.rescheduleSuccess'),
        '',
        [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
      );
    },
    onError: () => {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    },
  });

  const canSubmit = !!selectedSlot && !mutation.isPending;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('booking.rescheduleTitle')}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{salonName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Service summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Ionicons name="cut-outline" size={16} color={colors.accent} />
            <Text style={styles.summaryService}>{serviceName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="time-outline" size={14} color={colors.gray} />
            <Text style={styles.summaryMeta}>{duration} min</Text>
            <Text style={styles.summarySep}>·</Text>
            <Text style={styles.summaryMeta}>{formatCurrency(price)}</Text>
          </View>
        </View>

        {/* Date picker */}
        <CalendarPicker
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setSelectedSlot(null);
          }}
          language={language}
        />

        {/* Time slots */}
        <View style={styles.slotsSection}>
          <View style={styles.slotsHeader}>
            <Ionicons name="time-outline" size={16} color={colors.accent} />
            <Text style={styles.slotsSectionTitle}>{t('booking.selectTime')}</Text>
          </View>
          <TimeSlotGrid
            slots={slots}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
          />
        </View>
      </ScrollView>

      {/* Confirm button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmBtn, !canSubmit && styles.confirmBtnDisabled]}
          onPress={() => mutation.mutate()}
          disabled={!canSubmit}
        >
          <Text style={styles.confirmBtnText}>
            {mutation.isPending ? t('common.loading') : t('booking.confirmBooking')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Outfit-Bold',
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: 'rgba(255,255,255,0.6)',
  },
  scroll: { padding: 16, paddingBottom: 100 },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryService: {
    fontSize: 15,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
    textAlign: 'auto',
  },
  summaryMeta: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: colors.gray,
  },
  summarySep: {
    color: colors.grayLight,
    fontSize: 13,
  },
  slotsSection: { marginTop: 16 },
  slotsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  slotsSectionTitle: {
    fontSize: 15,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
    textAlign: 'auto',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  confirmBtn: {
    backgroundColor: colors.navy,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.45,
  },
  confirmBtnText: {
    fontSize: 15,
    fontFamily: 'Outfit-SemiBold',
    color: colors.white,
  },
});
