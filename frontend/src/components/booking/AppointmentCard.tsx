import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { formatDate, formatTime, formatCurrency } from '../../utils/formatters';
import { useTranslation } from 'react-i18next';

interface AppointmentCardProps {
  booking: {
    id: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    status: string;
    total_price: number;
    service?: { name: string; name_ar?: string };
    salon?: { name: string; name_ar?: string; address?: string };
  };
  onPress: () => void;
  language?: string;
}

export function AppointmentCard({ booking, onPress, language }: AppointmentCardProps) {
  const { t } = useTranslation();
  const salonName = language === 'ar' && booking.salon?.name_ar ? booking.salon.name_ar : booking.salon?.name;
  const serviceName = language === 'ar' && booking.service?.name_ar ? booking.service.name_ar : booking.service?.name;

  const statusColors: Record<string, string> = {
    confirmed: colors.success,
    completed: colors.accent,
    cancelled: colors.error,
    no_show: colors.warning,
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.salonName}>{salonName || ''}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[booking.status] || colors.gray }]}>
          <Text style={styles.statusText}>
            {t(`booking.status.${booking.status}`)}
          </Text>
        </View>
      </View>
      <Text style={styles.serviceName}>{serviceName || ''}</Text>
      <View style={styles.details}>
        <Text style={styles.detailText}>{formatDate(booking.booking_date)}</Text>
        <Text style={styles.detailText}>
          {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
        </Text>
        <Text style={styles.price}>{formatCurrency(booking.total_price)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  salonName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.black,
    flex: 1,
    textAlign: 'auto',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    color: colors.white,
    fontWeight: '600',
  },
  serviceName: {
    fontSize: 14,
    color: colors.grayDark,
    marginBottom: 8,
    textAlign: 'auto',
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: colors.gray,
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
  },
});
