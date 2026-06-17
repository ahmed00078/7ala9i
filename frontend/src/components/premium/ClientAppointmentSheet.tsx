import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { View, StyleSheet, ScrollView, Linking, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppText } from '../ui/AppText';
import { Avatar } from './Avatar';
import { BottomSheetForm, type BottomSheetFormRef } from './BottomSheetForm';
import { PressablePremium } from './PressablePremium';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/spacing';
import {
  formatCurrency,
  formatTime,
  formatRelativeDate,
  formatDuration,
} from '../../utils/formatters';
import { getImageUrl } from '../../api/client';

export type ClientAppointmentVariant = 'upcoming' | 'past' | 'cancelled';

export interface ClientAppointmentSalon {
  id?: string;
  name?: string;
  name_ar?: string;
  cover_photo_url?: string | null;
  address?: string | null;
  phone?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface ClientAppointmentService {
  name?: string;
  name_ar?: string;
  duration?: number;
}

export interface ClientAppointment {
  id: string;
  booking_date: string;
  start_time: string;
  end_time?: string;
  status: string;
  total_price: number;
  has_review?: boolean;
  salon_id?: string;
  service_id?: string;
  salon?: ClientAppointmentSalon;
  service?: ClientAppointmentService;
}

export interface ClientAppointmentSheetRef {
  present: (appointment: ClientAppointment, variant: ClientAppointmentVariant) => void;
  dismiss: () => void;
}

interface ClientAppointmentSheetProps {
  language: string;
  /** Navigate to the reschedule flow. */
  onReschedule: (appointment: ClientAppointment) => void;
  /** Cancel the booking (parent owns the confirm + mutation). */
  onCancel: (appointment: ClientAppointment) => void;
  /** Open the salon detail screen. */
  onViewSalon: (appointment: ClientAppointment) => void;
  /** Open the write-review flow (only offered when completed + not yet reviewed). */
  onWriteReview: (appointment: ClientAppointment) => void;
  /** Start a fresh booking for the same salon + service. */
  onRebook: (appointment: ClientAppointment) => void;
}

// Same tone vocabulary as the owner AppointmentDetailSheet — keep them in sync.
const STATUS_TONE: Record<string, { dot: string; label: string; bg: string }> = {
  confirmed: { dot: colors.accent, label: 'booking.status.confirmed', bg: colors.accentWash },
  completed: { dot: colors.ok, label: 'booking.status.completed', bg: '#E6F1EA' },
  cancelled: { dot: colors.danger, label: 'booking.status.cancelled', bg: '#F6E0DE' },
  no_show: { dot: colors.warn, label: 'booking.status.no_show', bg: '#F2E6D7' },
};

interface ActionDescriptor {
  key: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  tint: string;
  destructive?: boolean;
}

/**
 * Client-side appointment action sheet. Opens on tap of an appointment card and
 * surfaces context-aware actions per tab — mirror of the owner-side
 * `AppointmentDetailSheet`, kept visually consistent (identity → summary →
 * action list). Call / directions are handled inline via Linking; navigation
 * and the cancel mutation are delegated to the parent so it owns its queries.
 */
export const ClientAppointmentSheet = forwardRef<
  ClientAppointmentSheetRef,
  ClientAppointmentSheetProps
>(function ClientAppointmentSheet(
  { language, onReschedule, onCancel, onViewSalon, onWriteReview, onRebook },
  ref,
) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetFormRef>(null);
  const [appointment, setAppointment] = React.useState<ClientAppointment | null>(null);
  const [variant, setVariant] = React.useState<ClientAppointmentVariant>('upcoming');

  useImperativeHandle(ref, () => ({
    present: (apt, v) => {
      setAppointment(apt);
      setVariant(v);
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }), []);

  const salon = appointment?.salon;
  const salonName = useMemo(() => {
    if (!salon) return '—';
    return (language === 'ar' && salon.name_ar ? salon.name_ar : salon.name) || '—';
  }, [salon, language]);

  const serviceName = useMemo(() => {
    const s = appointment?.service;
    if (!s) return '';
    return (language === 'ar' && s.name_ar ? s.name_ar : s.name) || '';
  }, [appointment, language]);

  const scheduleLine = useMemo(() => {
    if (!appointment) return '';
    const datePart = formatRelativeDate(appointment.booking_date);
    const timePart = appointment.end_time
      ? `${formatTime(appointment.start_time)} → ${formatTime(appointment.end_time)}`
      : formatTime(appointment.start_time);
    const durPart = appointment.service?.duration
      ? formatDuration(appointment.service.duration)
      : '';
    return [datePart, timePart, durPart].filter(Boolean).join(' · ');
  }, [appointment]);

  const statusTone = STATUS_TONE[appointment?.status ?? ''] ?? STATUS_TONE.confirmed;
  const phone = salon?.phone?.trim() ?? '';
  const hasPhone = phone.length > 0;
  const hasCoords =
    salon?.lat != null && salon?.lng != null && !(salon.lat === 0 && salon.lng === 0);
  // Reviews are only allowed on completed bookings (backend rule), so a
  // confirmed-but-past appointment that the owner never closed gets neither the
  // review CTA nor the reviewed badge.
  const isCompleted = appointment?.status === 'completed';
  const isReviewed = isCompleted && !!appointment?.has_review;

  // Dismiss first, then run the side-effect once the sheet has animated out so
  // navigation transitions / confirm alerts don't stack on top of the sheet.
  const act = (fn: () => void) => {
    sheetRef.current?.dismiss();
    setTimeout(fn, 220);
  };

  const openTel = () => {
    if (!hasPhone) return;
    const sanitized = phone.replace(/\s+/g, '');
    Linking.openURL(`tel:${sanitized}`).catch(() => {
      Alert.alert(t('owner.appointmentDetail.callFailed'));
    });
  };

  const openDirections = () => {
    if (!hasCoords || !salon) return;
    const label = encodeURIComponent(salonName);
    const url =
      Platform.OS === 'ios'
        ? `maps:0,0?q=${label}@${salon.lat},${salon.lng}`
        : `geo:0,0?q=${salon.lat},${salon.lng}(${label})`;
    Linking.openURL(url).catch(() => undefined);
  };

  const actions = useMemo<ActionDescriptor[]>(() => {
    if (!appointment) return [];
    const a = appointment;
    const list: ActionDescriptor[] = [];

    if (variant === 'upcoming') {
      list.push({
        key: 'reschedule',
        icon: 'calendar-outline',
        label: t('booking.modifyBooking'),
        tint: colors.accent,
        onPress: () => act(() => onReschedule(a)),
      });
      if (hasCoords) {
        list.push({
          key: 'directions',
          icon: 'navigate-outline',
          label: t('salon.directions'),
          tint: colors.accent,
          onPress: () => act(openDirections),
        });
      }
      if (hasPhone) {
        list.push({
          key: 'call',
          icon: 'call-outline',
          label: t('appointments.callSalon'),
          tint: colors.accent,
          onPress: () => act(openTel),
        });
      }
      list.push({
        key: 'viewSalon',
        icon: 'storefront-outline',
        label: t('appointments.viewSalon'),
        tint: colors.slate,
        onPress: () => act(() => onViewSalon(a)),
      });
      list.push({
        key: 'cancel',
        icon: 'close-circle-outline',
        label: t('booking.cancelBooking'),
        tint: colors.danger,
        destructive: true,
        onPress: () => act(() => onCancel(a)),
      });
      return list;
    }

    // past + cancelled both offer rebook + view salon; past adds the review CTA
    // only when the booking is actually completed and not yet reviewed.
    if (variant === 'past' && isCompleted && !appointment.has_review) {
      list.push({
        key: 'review',
        icon: 'star-outline',
        label: t('review.writeReview'),
        tint: colors.accent,
        onPress: () => act(() => onWriteReview(a)),
      });
    }
    list.push({
      key: 'rebook',
      icon: 'refresh-outline',
      label: t('appointments.bookAgain'),
      tint: colors.accent,
      onPress: () => act(() => onRebook(a)),
    });
    list.push({
      key: 'viewSalon',
      icon: 'storefront-outline',
      label: t('appointments.viewSalon'),
      tint: colors.slate,
      onPress: () => act(() => onViewSalon(a)),
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment, variant, hasCoords, hasPhone, isCompleted, t, language]);

  return (
    <BottomSheetForm
      ref={sheetRef}
      title={t('appointments.detailTitle')}
      snapPoints={['60%']}
      onDismiss={() => setAppointment(null)}
    >
      {appointment && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
          {/* ── Identity ─────────────────────────────────────────────── */}
          <View style={styles.identity}>
            <Avatar
              name={salonName}
              uri={getImageUrl(salon?.cover_photo_url ?? undefined)}
              size={48}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText style={[typography.title, styles.salonName]} numberOfLines={1}>
                {salonName}
              </AppText>
              {serviceName ? (
                <AppText style={[typography.bodySmall, styles.serviceName]} numberOfLines={1}>
                  {serviceName}
                </AppText>
              ) : null}
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusTone.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusTone.dot }]} />
              <AppText style={[typography.caption, styles.statusLabel]}>
                {t(statusTone.label)}
              </AppText>
            </View>
          </View>

          {/* ── Schedule + price ─────────────────────────────────────── */}
          <View style={styles.summary}>
            <View style={styles.summaryLeft}>
              <Ionicons name="time-outline" size={16} color={colors.slate} />
              <AppText style={[typography.bodyMedium, styles.scheduleText]} numberOfLines={1}>
                {scheduleLine}
              </AppText>
            </View>
            <AppText style={[typography.bodyMedium, styles.priceText]}>
              {formatCurrency(appointment.total_price)}
            </AppText>
          </View>

          {/* ── Reviewed note (past + already reviewed) ──────────────── */}
          {variant === 'past' && isReviewed ? (
            <View style={styles.reviewedNote}>
              <Ionicons name="checkmark-circle" size={16} color={colors.ok} />
              <AppText style={[typography.bodySmall, styles.reviewedText]}>
                {t('review.reviewed')}
              </AppText>
            </View>
          ) : null}

          {/* ── Actions ──────────────────────────────────────────────── */}
          <View style={styles.actionsList}>
            {actions.map((action, i) => (
              <ActionRow
                key={action.key}
                icon={action.icon}
                label={action.label}
                tint={action.tint}
                destructive={action.destructive}
                last={i === actions.length - 1}
                onPress={action.onPress}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </BottomSheetForm>
  );
});

/* ── Sub-components ──────────────────────────────────────────────────── */

function ActionRow({
  icon,
  label,
  onPress,
  tint,
  destructive,
  last,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  tint: string;
  destructive?: boolean;
  last?: boolean;
}) {
  return (
    <PressablePremium
      haptic={destructive ? 'heavy' : 'selection'}
      pressScale={0.985}
      onPress={onPress}
      style={[styles.actionRow, last && styles.actionRowLast]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.actionIcon, { backgroundColor: `${tint}1A` }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <AppText
        style={[
          typography.button,
          { color: destructive ? colors.danger : colors.ink, flex: 1 },
        ]}
      >
        {label}
      </AppText>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={destructive ? colors.danger : colors.slateSoft}
      />
    </PressablePremium>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingTop: 4,
    paddingBottom: 24,
    gap: 16,
  },

  /* ── Identity ── */
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  salonName: {
    color: colors.ink,
    fontSize: 19,
    lineHeight: 24,
  },
  serviceName: {
    color: colors.slate,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    color: colors.ink,
    fontFamily: 'Outfit-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 10,
  },

  /* ── Summary ── */
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  scheduleText: {
    color: colors.ink,
    flexShrink: 1,
  },
  priceText: {
    color: colors.accent,
    fontFamily: 'Outfit-SemiBold',
    fontVariant: ['tabular-nums'],
  },

  /* ── Reviewed note ── */
  reviewedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#E6F1EA',
    borderRadius: radius.input,
  },
  reviewedText: {
    color: colors.ok,
    fontFamily: 'Outfit-SemiBold',
  },

  /* ── Actions ── */
  actionsList: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  actionRowLast: {
    borderBottomWidth: 0,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
