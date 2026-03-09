import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { bookingsApi } from '../../api/bookings';
import { Button } from '../../components/ui/Button';
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
          {/* Success circle */}
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={48} color={colors.white} />
          </View>
          <Text style={styles.successTitle}>{t('booking.bookingSuccess')}</Text>
          <Text style={styles.successMessage}>{t('booking.bookingSuccessMessage')}</Text>

          {/* Summary card */}
          <View style={styles.summaryCard}>
            <SummaryRow
              icon="cut-outline"
              label={t('booking.service')}
              value={serviceName}
            />
            <SummaryRow
              icon="calendar-outline"
              label={t('booking.date')}
              value={formatDate(date)}
            />
            <SummaryRow
              icon="time-outline"
              label={t('booking.time')}
              value={formatTime(startTime)}
            />
            <SummaryRow
              icon="cash-outline"
              label={t('booking.price')}
              value={formatCurrency(price)}
              bold
            />
          </View>

          {/* Payment info */}
          <View style={styles.paymentNote}>
            <Ionicons name="wallet-outline" size={18} color={colors.accent} />
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentTitle}>{t('booking.paymentNote')}</Text>
              <Text style={styles.paymentMethods}>{t('booking.paymentMethods')}</Text>
            </View>
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.pageHeader}>
        <Text style={styles.title}>{t('booking.confirmTitle')}</Text>
        <Text style={styles.subtitle}>{t('booking.confirmSubtitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Detail card */}
        <View style={styles.detailCard}>
          <DetailRow icon="cut-outline"      label={t('booking.service')}  value={serviceName}            />
          <Divider />
          <DetailRow icon="calendar-outline" label={t('booking.date')}     value={formatDate(date)}       />
          <Divider />
          <DetailRow icon="time-outline"     label={t('booking.time')}     value={formatTime(startTime)}  />
          <Divider />
          <DetailRow icon="hourglass-outline" label={t('booking.duration')} value={formatDuration(duration)} />
          <Divider />
          <DetailRow icon="cash-outline"     label={t('booking.price')}    value={formatCurrency(price)}  bold />
        </View>

        {/* Payment note */}
        <View style={styles.paymentNote}>
          <Ionicons name="wallet-outline" size={18} color={colors.accent} />
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentTitle}>{t('booking.paymentNote')}</Text>
            <Text style={styles.paymentMethods}>{t('booking.paymentMethods')}</Text>
          </View>
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

function DetailRow({ icon, label, value, bold }: { icon: any; label: string; value: string; bold?: boolean }) {
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.iconBox}>
        <Ionicons name={icon} size={16} color={colors.accent} />
      </View>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, bold && rowStyles.bold]}>{value}</Text>
    </View>
  );
}

function SummaryRow({ icon, label, value, bold }: { icon: any; label: string; value: string; bold?: boolean }) {
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.iconBox}>
        <Ionicons name={icon} size={15} color={colors.accent} />
      </View>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, bold && rowStyles.bold]}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border, marginStart: 52 }} />;
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 12,
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.gray,
    textAlign: 'auto',
  },
  value: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: colors.black,
  },
  bold: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: colors.accent,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  pageHeader: {
    backgroundColor: colors.navy,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    color: colors.white,
    marginBottom: 4,
    textAlign: 'auto',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'auto',
  },

  scroll: { padding: 16 },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  paymentNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  paymentInfo: { flex: 1 },
  paymentTitle: {
    fontSize: 14,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
    marginBottom: 2,
    textAlign: 'auto',
  },
  paymentMethods: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: colors.grayDark,
    textAlign: 'auto',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },

  /* Success screen */
  successContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 28,
    paddingTop: 60,
    backgroundColor: colors.background,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: 'Outfit-Bold',
    color: colors.black,
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.gray,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
});
