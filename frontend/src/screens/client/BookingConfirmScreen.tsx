import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { bookingsApi } from '../../api/bookings';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { formatDate, formatTime, formatCurrency, formatDuration } from '../../utils/formatters';
import { colors } from '../../theme/colors';
import type { ClientHomeScreenProps } from '../../types/navigation';

export function BookingConfirmScreen({ route, navigation }: ClientHomeScreenProps<'BookingConfirm'>) {
  const { salonId, serviceId, serviceName, date, startTime, duration, price } = route.params;
  const { t } = useTranslation();
  const [booked, setBooked] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      bookingsApi.create({
        salon_id: salonId,
        service_id: serviceId,
        booking_date: date,
        start_time: startTime,
      }),
    onSuccess: () => setBooked(true),
    onError: () => Alert.alert(t('common.error'), t('errors.server')),
  });

  if (booked) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>{'\u2713'}</Text>
          <Text style={styles.successTitle}>{t('booking.bookingSuccess')}</Text>
          <Text style={styles.successMessage}>{t('booking.bookingSuccessMessage')}</Text>
          <View style={styles.paymentNote}>
            <Text style={styles.paymentTitle}>{t('booking.paymentNote')}</Text>
            <Text style={styles.paymentMethods}>{t('booking.paymentMethods')}</Text>
          </View>
          <Button
            title={t('booking.viewAppointments')}
            onPress={() => navigation.getParent()?.navigate('AppointmentsTab')}
            style={{ marginTop: 24 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{t('booking.confirmTitle')}</Text>
        <Text style={styles.subtitle}>{t('booking.confirmSubtitle')}</Text>

        <Card style={styles.detailCard}>
          <DetailRow label={t('booking.service')} value={serviceName} />
          <DetailRow label={t('booking.date')} value={formatDate(date)} />
          <DetailRow label={t('booking.time')} value={formatTime(startTime)} />
          <DetailRow label={t('booking.duration')} value={formatDuration(duration)} />
          <DetailRow label={t('booking.price')} value={formatCurrency(price)} bold />
        </Card>

        <View style={styles.paymentNote}>
          <Text style={styles.paymentTitle}>{t('booking.paymentNote')}</Text>
          <Text style={styles.paymentMethods}>{t('booking.paymentMethods')}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={t('booking.confirmBooking')}
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
        />
      </View>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={detailStyles.row}>
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={[detailStyles.value, bold && detailStyles.bold]}>{value}</Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  label: { fontSize: 14, color: colors.gray, textAlign: 'auto' },
  value: { fontSize: 14, color: colors.black, fontWeight: '500' },
  bold: { fontWeight: '700', fontSize: 16 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  scroll: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: colors.black, marginBottom: 4, textAlign: 'auto' },
  subtitle: { fontSize: 14, color: colors.gray, marginBottom: 24, textAlign: 'auto' },
  detailCard: { marginBottom: 24 },
  paymentNote: {
    backgroundColor: colors.background, borderRadius: 12, padding: 16,
  },
  paymentTitle: { fontSize: 14, fontWeight: '600', color: colors.black, marginBottom: 4, textAlign: 'auto' },
  paymentMethods: { fontSize: 13, color: colors.grayDark, textAlign: 'auto' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  successIcon: { fontSize: 48, color: colors.success, marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '700', color: colors.black, marginBottom: 8 },
  successMessage: { fontSize: 14, color: colors.gray, textAlign: 'center', marginBottom: 24 },
});
