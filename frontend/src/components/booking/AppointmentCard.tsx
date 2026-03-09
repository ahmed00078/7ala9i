import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText as Text } from '../ui/AppText';
import { Ionicons } from '@expo/vector-icons';
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

const STATUS_STYLE: Record<string, { bar: string; badgeBg: string; badgeText: string }> = {
  confirmed: { bar: colors.success,  badgeBg: colors.successLight, badgeText: colors.successDark },
  completed: { bar: colors.accent,   badgeBg: colors.accentLight,  badgeText: colors.accentDark  },
  cancelled: { bar: colors.error,    badgeBg: colors.errorLight,   badgeText: colors.error       },
  no_show:   { bar: colors.warning,  badgeBg: colors.warningLight, badgeText: '#B45309'          },
};

export function AppointmentCard({ booking, onPress, language }: AppointmentCardProps) {
  const { t } = useTranslation();
  const salonName   = language === 'ar' && booking.salon?.name_ar   ? booking.salon.name_ar   : booking.salon?.name;
  const serviceName = language === 'ar' && booking.service?.name_ar ? booking.service.name_ar : booking.service?.name;
  const s = STATUS_STYLE[booking.status] || { bar: colors.gray, badgeBg: colors.background, badgeText: colors.grayDark };

  return (
    <TouchableOpacity style={[styles.card, { borderLeftColor: s.bar }]} onPress={onPress} activeOpacity={0.75}>
      {/* Top row */}
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={styles.salonName} numberOfLines={1}>{salonName || ''}</Text>
          <Text style={styles.serviceName} numberOfLines={1}>{serviceName || ''}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: s.badgeBg }]}>
          <Text style={[styles.badgeText, { color: s.badgeText }]}>
            {t(`booking.status.${booking.status}`)}
          </Text>
        </View>
      </View>

      {/* Bottom row */}
      <View style={styles.footer}>
        <View style={styles.meta}>
          <Ionicons name="calendar-outline" size={12} color={colors.gray} style={styles.metaIcon} />
          <Text style={styles.metaText}>{formatDate(booking.booking_date)}</Text>
        </View>
        <View style={styles.meta}>
          <Ionicons name="time-outline" size={12} color={colors.gray} style={styles.metaIcon} />
          <Text style={styles.metaText}>
            {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
          </Text>
        </View>
        <Text style={styles.price}>{formatCurrency(booking.total_price)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleGroup: { flex: 1, marginEnd: 8 },
  salonName: {
    fontSize: 15,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
    marginBottom: 2,
    textAlign: 'auto',
  },
  serviceName: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: colors.grayDark,
    textAlign: 'auto',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Outfit-SemiBold',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    marginEnd: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: colors.gray,
  },
  price: {
    marginStart: 'auto',
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: colors.black,
  },
});
