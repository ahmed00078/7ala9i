import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useLanguage } from '../../contexts/LanguageContext';
import { salonsApi } from '../../api/salons';
import { CalendarPicker } from '../../components/booking/CalendarPicker';
import { TimeSlotGrid } from '../../components/booking/TimeSlotGrid';
import { Button } from '../../components/ui/Button';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { formatCurrency, formatDuration } from '../../utils/formatters';
import { colors } from '../../theme/colors';
import type { ClientHomeScreenProps } from '../../types/navigation';

export function BookingFlowScreen({ route, navigation }: ClientHomeScreenProps<'BookingFlow'>) {
  const { salonId, serviceId, serviceName, duration, price } = route.params;
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['availability', salonId, serviceId, selectedDate],
    queryFn: () => salonsApi.getAvailability(salonId, { date: selectedDate, service_id: serviceId }),
  });

  const slots = data?.data?.slots || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{serviceName}</Text>
          <Text style={styles.serviceDetail}>
            {formatDuration(duration)} · {formatCurrency(price)}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{t('booking.selectDate')}</Text>
        <CalendarPicker
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setSelectedSlot(null);
          }}
          language={language}
        />

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{t('booking.selectTime')}</Text>
        {isLoading ? (
          <LoadingScreen />
        ) : slots.length === 0 ? (
          <Text style={styles.noSlots}>{t('booking.noSlots')}</Text>
        ) : (
          <TimeSlotGrid
            slots={slots}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={t('common.next')}
          disabled={!selectedSlot}
          onPress={() =>
            navigation.navigate('BookingConfirm', {
              salonId,
              serviceId,
              serviceName,
              date: selectedDate,
              startTime: selectedSlot!,
              duration,
              price,
              salonName: '',
            })
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  scroll: { padding: 16 },
  serviceInfo: {
    backgroundColor: colors.background, borderRadius: 12, padding: 16, marginBottom: 24,
  },
  serviceName: { fontSize: 16, fontWeight: '600', color: colors.black, textAlign: 'auto' },
  serviceDetail: { fontSize: 14, color: colors.grayDark, marginTop: 4, textAlign: 'auto' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.black, marginBottom: 12, textAlign: 'auto' },
  noSlots: { textAlign: 'center', color: colors.gray, padding: 24 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
});
