import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText as Text } from '../ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { formatTime, formatCurrency, formatDate } from '../../utils/formatters';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAlert } from '../../contexts/AlertContext';
import { ownerApi } from '../../api/owner';

interface Appointment {
  id: string;
  booking_date?: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
  client?: { first_name: string; last_name: string };
  service?: { name: string; name_ar?: string };
}

interface DayScheduleProps {
  appointments: Appointment[];
  language?: string;
  showDate?: boolean;
  allowActions?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  confirmed: { label: '●', bg: colors.accentLight, text: colors.accentDark },
  completed: { label: '✓', bg: '#DCFCE7', text: '#15803D' },
  cancelled: { label: '✕', bg: '#FEE2E2', text: '#DC2626' },
  no_show: { label: '–', bg: '#F3F4F6', text: '#6B7280' },
};

export function DaySchedule({ appointments, language, showDate = false, allowActions = true }: DayScheduleProps) {
  const { t } = useTranslation();
  const alert = useAlert();
  const queryClient = useQueryClient();
  const [compact, setCompact] = useState(false);

  // Auto-switch to compact mode when there are many appointments
  useEffect(() => {
    setCompact(appointments.length >= 10);
  }, [appointments.length]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'completed' | 'no_show' | 'cancelled' }) =>
      ownerApi.updateBookingStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner'] });
    },
  });

  const handleAction = (apt: Appointment) => {
    if (apt.status !== 'confirmed') return;

    alert.show({
      type: 'confirm',
      title: t('owner.calendar.updateStatus'),
      message: `${apt.client?.first_name} ${apt.client?.last_name} — ${apt.service?.name}`,
      confirmText: t('owner.calendar.markComplete'),
      cancelText: t('common.cancel'),
      onConfirm: () => statusMutation.mutate({ id: apt.id, status: 'completed' }),
    });
  };

  if (!appointments.length) {
    return (
      <View style={styles.empty}>
        <Ionicons name="calendar-outline" size={32} color={colors.grayLight} />
        <Text style={styles.emptyText}>{t('owner.calendar.noAppointments')}</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Compact/full toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, !compact && styles.toggleBtnActive]}
          onPress={() => setCompact(false)}
        >
          <Ionicons name="list" size={14} color={!compact ? colors.accent : colors.gray} />
          <Text style={[styles.toggleText, !compact && styles.toggleTextActive]}>{t('owner.calendar.full')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, compact && styles.toggleBtnActive]}
          onPress={() => setCompact(true)}
        >
          <Ionicons name="reorder-three" size={14} color={compact ? colors.accent : colors.gray} />
          <Text style={[styles.toggleText, compact && styles.toggleTextActive]}>{t('owner.calendar.compact')}</Text>
        </TouchableOpacity>
      </View>

      {appointments.map((apt) => {
        const serviceName = language === 'ar' && apt.service?.name_ar ? apt.service.name_ar : apt.service?.name;
        const statusCfg = STATUS_CONFIG[apt.status] || STATUS_CONFIG.confirmed;
        const isActionable = allowActions && apt.status === 'confirmed';
        const clientFullName = apt.client ? `${apt.client.first_name} ${apt.client.last_name}` : '-';

        if (compact) {
          return (
            <TouchableOpacity
              key={apt.id}
              style={styles.compactItem}
              onPress={() => isActionable && handleAction(apt)}
              activeOpacity={isActionable ? 0.7 : 1}
            >
              <View style={[styles.compactBar, { backgroundColor: statusCfg.bg }]} />
              <Text style={styles.compactTime}>{formatTime(apt.start_time)}</Text>
              <View style={styles.compactInfo}>
                <Text style={styles.compactClientName} numberOfLines={1}>{clientFullName}</Text>
                <Text style={styles.compactSep}> — </Text>
                <Text style={styles.compactServiceName} numberOfLines={1}>{serviceName || ''}</Text>
              </View>
              <View style={[styles.compactBadge, { backgroundColor: statusCfg.bg }]}>
                <Text style={[styles.compactBadgeText, { color: statusCfg.text }]}>
                  {t(`owner.status.${apt.status}`, apt.status)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={apt.id}
            style={styles.item}
            onPress={() => isActionable && handleAction(apt)}
            activeOpacity={isActionable ? 0.7 : 1}
          >
            <View style={styles.timeCol}>
              <Text style={styles.time}>{formatTime(apt.start_time)}</Text>
              <Text style={styles.timeEnd}>{formatTime(apt.end_time)}</Text>
              {showDate && apt.booking_date && (
                <Text style={styles.dateLabel}>{formatDate(apt.booking_date)}</Text>
              )}
            </View>
            <View style={[styles.bar, { backgroundColor: statusCfg.bg }]} />
            <View style={styles.details}>
              <View style={styles.detailsTop}>
                <Text style={styles.clientName}>
                  {clientFullName}
                </Text>
                <View style={[styles.badge, { backgroundColor: statusCfg.bg }]}>
                  <Text style={[styles.badgeText, { color: statusCfg.text }]}>
                    {t(`owner.status.${apt.status}`, apt.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.service}>{serviceName || ''}</Text>
              <Text style={styles.price}>{formatCurrency(apt.total_price)}</Text>
            </View>
            {isActionable && (
              <Ionicons name="chevron-forward" size={18} color={colors.grayLight} style={styles.chevron} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  toggleBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  toggleText: {
    fontSize: 11,
    fontFamily: 'Outfit-Medium',
    color: colors.gray,
  },
  toggleTextActive: {
    color: colors.accent,
  },
  compactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
    paddingRight: 4,
  },
  compactBar: {
    width: 4,
    height: 28,
    borderRadius: 2,
  },
  compactTime: {
    fontSize: 11,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
    width: 46,
  },
  compactInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  compactClientName: {
    fontSize: 12,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
    flexShrink: 1,
  },
  compactSep: {
    fontSize: 12,
    color: colors.gray,
  },
  compactServiceName: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: colors.grayDark,
    flexShrink: 1,
  },
  compactBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  compactBadgeText: {
    fontSize: 9,
    fontFamily: 'Outfit-Medium',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    color: colors.gray,
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timeCol: {
    width: 58,
    alignItems: 'center',
  },
  time: {
    fontSize: 13,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
  },
  timeEnd: {
    fontSize: 11,
    fontFamily: 'Outfit-Regular',
    color: colors.gray,
  },
  dateLabel: {
    fontSize: 9,
    fontFamily: 'Outfit-Regular',
    color: colors.gray,
    textAlign: 'center',
    marginTop: 2,
  },
  bar: {
    width: 4,
    height: '100%',
    minHeight: 44,
    borderRadius: 2,
    marginHorizontal: 12,
  },
  details: {
    flex: 1,
  },
  detailsTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  clientName: {
    fontSize: 14,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
    flex: 1,
    textAlign: 'auto',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Outfit-Medium',
  },
  service: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: colors.grayDark,
    marginTop: 1,
    textAlign: 'auto',
  },
  price: {
    fontSize: 12,
    fontFamily: 'Outfit-SemiBold',
    color: colors.accent,
    marginTop: 3,
  },
  chevron: {
    marginLeft: 4,
  },
});
