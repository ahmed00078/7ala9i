import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Service info banner */}
      <View style={styles.serviceBanner}>
        <View style={styles.serviceIconBox}>
          <Ionicons name="cut-outline" size={22} color={colors.accent} />
        </View>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{serviceName}</Text>
          <Text style={styles.serviceDetail}>
            {formatDuration(duration)} · {formatCurrency(price)}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Date section */}
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar-outline" size={16} color={colors.accent} />
          <Text style={styles.sectionTitle}>{t('booking.selectDate')}</Text>
        </View>
        <CalendarPicker
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setSelectedSlot(null);
          }}
          language={language}
        />

        {/* Time section */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Ionicons name="time-outline" size={16} color={colors.accent} />
          <Text style={styles.sectionTitle}>{t('booking.selectTime')}</Text>
        </View>
        {isLoading ? (
          <LoadingScreen />
        ) : slots.length === 0 ? (
          <View style={styles.noSlotsBox}>
            <Ionicons name="calendar-clear-outline" size={32} color={colors.grayLight} />
            <Text style={styles.noSlots}>{t('booking.noSlots')}</Text>
          </View>
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

  serviceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.navy,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  serviceIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceInfo: { flex: 1 },
  serviceName: {
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
    color: colors.white,
    textAlign: 'auto',
  },
  serviceDetail: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
    textAlign: 'auto',
  },

  scroll: { padding: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
    textAlign: 'auto',
  },
  noSlotsBox: {
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  noSlots: {
    color: colors.gray,
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
});
