import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { View, StyleSheet, ScrollView, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppText } from '../ui/AppText';
import { Avatar } from './Avatar';
import { BottomSheetForm, type BottomSheetFormRef } from './BottomSheetForm';
import { PressablePremium } from './PressablePremium';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/spacing';
import { formatCurrency, formatTime, formatRelativeDate, formatPhone, formatDuration } from '../../utils/formatters';
import { getImageUrl } from '../../api/client';

export interface AppointmentDetailClient {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}

export interface AppointmentDetailService {
  name?: string | null;
  name_ar?: string | null;
  duration?: number | null;
}

export interface AppointmentDetailAppointment {
  id: string;
  booking_date?: string | null;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
  notes?: string | null;
  client?: AppointmentDetailClient | null;
  service?: AppointmentDetailService | null;
}

type StatusAction = 'completed' | 'no_show' | 'cancelled';
export type PaymentMethod = 'cash' | 'mobile';

export interface AppointmentDetailSheetRef {
  present: (appointment: AppointmentDetailAppointment) => void;
  dismiss: () => void;
}

interface AppointmentDetailSheetProps {
  /** Current appointment in scope (controlled). When omitted, use the imperative `present`. */
  appointment?: AppointmentDetailAppointment | null;
  /** Language for picking name vs name_ar. */
  language: string;
  /** Whether status mutation is in-flight (disables action buttons). */
  loading?: boolean;
  /** Called when owner chooses one of the status transitions. The third arg is the
   *  payment method when transitioning to `completed` (sheet picks it inline). */
  onChangeStatus?: (
    appointmentId: string,
    status: StatusAction,
    paymentMethod?: PaymentMethod,
  ) => void;
  onDismiss?: () => void;
}

const STATUS_TONE: Record<string, { dot: string; label: string; bg: string }> = {
  confirmed: { dot: colors.accent, label: 'owner.status.confirmed', bg: colors.accentWash },
  completed: { dot: colors.ok, label: 'owner.status.completed', bg: '#E6F1EA' },
  cancelled: { dot: colors.danger, label: 'owner.status.cancelled', bg: '#F6E0DE' },
  no_show: { dot: colors.slateSoft, label: 'owner.status.no_show', bg: colors.surfaceAlt },
};

/**
 * Shared owner-side appointment detail sheet. Surfaces client identity + phone,
 * service info, schedule meta, and the three status transitions allowed from
 * `confirmed` (complete / no-show / cancel). Call/WhatsApp shortcuts route via
 * Linking; the parent owns the mutation so it can invalidate its own queries.
 */
export const AppointmentDetailSheet = forwardRef<
  AppointmentDetailSheetRef,
  AppointmentDetailSheetProps
>(function AppointmentDetailSheet(
  { appointment: controlled, language, loading, onChangeStatus, onDismiss },
  ref,
) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetFormRef>(null);
  const [internal, setInternal] = React.useState<AppointmentDetailAppointment | null>(null);
  // When true, the body swaps the 3-status list for the payment-method picker.
  const [pendingComplete, setPendingComplete] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('cash');

  // Imperative present(apt) sets internal state, then opens the sheet.
  useImperativeHandle(ref, () => ({
    present: (apt) => {
      setInternal(apt);
      setPendingComplete(false);
      setPaymentMethod('cash');
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }), []);

  const appointment = controlled ?? internal;

  const clientName = useMemo(() => {
    if (!appointment?.client) return '—';
    return `${appointment.client.first_name ?? ''} ${appointment.client.last_name ?? ''}`.trim() || '—';
  }, [appointment]);

  const serviceName = useMemo(() => {
    const s = appointment?.service;
    if (!s) return '';
    return language === 'ar' && s.name_ar ? s.name_ar : s.name ?? '';
  }, [appointment, language]);

  const statusTone = STATUS_TONE[appointment?.status ?? ''] ?? STATUS_TONE.no_show;
  const isConfirmed = appointment?.status === 'confirmed';
  const phone = appointment?.client?.phone ?? '';
  const hasPhone = phone.trim().length > 0;

  const openTel = () => {
    if (!hasPhone) return;
    const sanitized = phone.replace(/\s+/g, '');
    Linking.openURL(`tel:${sanitized}`).catch(() => {
      Alert.alert(t('owner.appointmentDetail.callFailed'));
    });
  };

  const handleStatus = (status: StatusAction) => {
    if (!appointment) return;
    if (status === 'completed') {
      // Don't fire yet — let the owner pick how the client paid first.
      setPaymentMethod('cash');
      setPendingComplete(true);
      return;
    }
    onChangeStatus?.(appointment.id, status);
  };

  const confirmComplete = () => {
    if (!appointment) return;
    onChangeStatus?.(appointment.id, 'completed', paymentMethod);
  };

  // Build the schedule string: "Today · 14:30 → 15:00 · 30 min"
  const scheduleLine = useMemo(() => {
    if (!appointment) return '';
    const datePart = appointment.booking_date ? formatRelativeDate(appointment.booking_date) : '';
    const timePart = `${formatTime(appointment.start_time)} → ${formatTime(appointment.end_time)}`;
    const duration = appointment.service?.duration;
    const durPart = duration ? formatDuration(duration) : '';
    return [datePart, timePart, durPart].filter(Boolean).join(' · ');
  }, [appointment]);

  return (
    <BottomSheetForm
      ref={sheetRef}
      title={t('owner.appointmentDetail.title')}
      snapPoints={['65%', '92%']}
      onDismiss={() => {
        setInternal(null);
        setPendingComplete(false);
        onDismiss?.();
      }}
    >
      {appointment && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
          {/* ── Identity card ───────────────────────────────────────── */}
          <View style={styles.identity}>
            <Avatar name={clientName} uri={getImageUrl(appointment?.client?.avatar_url)} size={56} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText style={[typography.title, styles.clientName]} numberOfLines={1}>
                {clientName}
              </AppText>
              {hasPhone ? (
                <PressablePremium
                  haptic="selection"
                  pressScale={0.97}
                  onPress={openTel}
                  style={styles.phonePress}
                  accessibilityRole="button"
                  accessibilityLabel={t('owner.appointmentDetail.call')}
                >
                  <Ionicons name="call" size={13} color={colors.accent} />
                  <AppText style={[typography.bodySmall, styles.phoneText]} numberOfLines={1}>
                    {formatPhone(phone)}
                  </AppText>
                </PressablePremium>
              ) : (
                <AppText style={[typography.bodySmall, styles.clientPhoneMissing]}>
                  {t('owner.appointmentDetail.noPhone')}
                </AppText>
              )}
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusTone.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusTone.dot }]} />
              <AppText style={[typography.caption, styles.statusLabel]}>
                {t(statusTone.label)}
              </AppText>
            </View>
          </View>

          {/* ── Schedule + service info ─────────────────────────────── */}
          <View style={styles.infoCard}>
            <InfoRow
              icon="calendar-outline"
              label={t('owner.appointmentDetail.when')}
              value={scheduleLine}
            />
            <View style={styles.hairline} />
            <InfoRow
              icon="cut-outline"
              label={t('owner.appointmentDetail.service')}
              value={serviceName || '—'}
            />
            <View style={styles.hairline} />
            <InfoRow
              icon="cash-outline"
              label={t('owner.appointmentDetail.price')}
              value={formatCurrency(appointment.total_price)}
              emphasis
            />
            {appointment.notes ? (
              <>
                <View style={styles.hairline} />
                <InfoRow
                  icon="document-text-outline"
                  label={t('owner.appointmentDetail.notes')}
                  value={appointment.notes}
                  multiline
                />
              </>
            ) : null}
          </View>

          {/* ── Status actions ──────────────────────────────────────── */}
          {isConfirmed && !pendingComplete ? (
            <View style={styles.actionsBlock}>
              <AppText style={[typography.capsLabel, styles.actionsLabel]}>
                {t('owner.appointmentDetail.updateStatus')}
              </AppText>
              <View style={styles.actionsList}>
                <StatusButton
                  icon="checkmark-circle-outline"
                  label={t('owner.calendar.markCompleted')}
                  onPress={() => handleStatus('completed')}
                  tint={colors.ok}
                  disabled={loading}
                />
                <StatusButton
                  icon="alert-circle-outline"
                  label={t('owner.calendar.markNoShow')}
                  onPress={() => handleStatus('no_show')}
                  tint={colors.warn}
                  disabled={loading}
                />
                <StatusButton
                  icon="close-circle-outline"
                  label={t('owner.calendar.cancelAppointment')}
                  onPress={() => handleStatus('cancelled')}
                  tint={colors.danger}
                  disabled={loading}
                  destructive
                />
              </View>
            </View>
          ) : isConfirmed && pendingComplete ? (
            <View style={styles.actionsBlock}>
              <PressablePremium
                haptic="selection"
                pressScale={0.97}
                onPress={() => setPendingComplete(false)}
                style={styles.backRow}
                accessibilityRole="button"
                accessibilityLabel={t('common.back')}
              >
                <Ionicons name="chevron-back" size={16} color={colors.slate} />
                <AppText style={[typography.bodySmall, styles.backText]}>
                  {t('common.back')}
                </AppText>
              </PressablePremium>
              <AppText style={[typography.title, styles.payTitle]}>
                {t('owner.payment.title')}
              </AppText>
              <AppText style={[typography.bodySmall, styles.paySubtitle]}>
                {t('owner.payment.subtitle')}
              </AppText>
              <View style={styles.payChips}>
                <PaymentChip
                  active={paymentMethod === 'cash'}
                  icon="cash-outline"
                  label={t('owner.payment.cash')}
                  onPress={() => setPaymentMethod('cash')}
                />
                <PaymentChip
                  active={paymentMethod === 'mobile'}
                  icon="phone-portrait-outline"
                  label={t('owner.payment.mobile')}
                  onPress={() => setPaymentMethod('mobile')}
                />
              </View>
              <PressablePremium
                haptic="medium"
                pressScale={0.985}
                onPress={confirmComplete}
                disabled={loading}
                style={[styles.confirmBtn, loading && { opacity: 0.5 }]}
                accessibilityRole="button"
                accessibilityLabel={t('owner.payment.confirm')}
              >
                <Ionicons name="checkmark" size={18} color={colors.white} />
                <AppText style={[typography.button, styles.confirmBtnText]}>
                  {t('owner.payment.confirm')}
                </AppText>
              </PressablePremium>
            </View>
          ) : (
            <View style={styles.lockedNote}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.slateSoft} />
              <AppText style={[typography.bodySmall, styles.lockedText]}>
                {t('owner.appointmentDetail.lockedStatus')}
              </AppText>
            </View>
          )}
        </ScrollView>
      )}
    </BottomSheetForm>
  );
});

/* ── Sub-components ──────────────────────────────────────────────────── */

function InfoRow({
  icon,
  label,
  value,
  emphasis,
  multiline,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  emphasis?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBox}>
        <Ionicons name={icon} size={16} color={colors.slate} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={[typography.capsLabel, styles.infoLabel]}>{label}</AppText>
        <AppText
          style={[
            typography.bodyMedium,
            styles.infoValue,
            emphasis && styles.infoValueEmphasis,
          ]}
          numberOfLines={multiline ? undefined : 2}
        >
          {value}
        </AppText>
      </View>
    </View>
  );
}

function PaymentChip({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <PressablePremium
      haptic="selection"
      pressScale={0.97}
      onPress={onPress}
      style={[styles.payChip, active && styles.payChipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <View style={[styles.payChipIcon, active && styles.payChipIconActive]}>
        <Ionicons
          name={icon}
          size={18}
          color={active ? colors.white : colors.slate}
        />
      </View>
      <AppText
        style={[
          typography.bodySmall,
          styles.payChipLabel,
          active && styles.payChipLabelActive,
        ]}
        numberOfLines={1}
      >
        {label}
      </AppText>
    </PressablePremium>
  );
}

function StatusButton({
  icon,
  label,
  onPress,
  tint,
  disabled,
  destructive,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  tint: string;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <PressablePremium
      haptic={destructive ? 'heavy' : 'selection'}
      pressScale={0.985}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.statusBtn,
        destructive && styles.statusBtnDestructive,
        disabled && { opacity: 0.5 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.statusBtnIcon, { backgroundColor: `${tint}1A` }]}>
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
    gap: 18,
  },

  /* ── Identity ── */
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  clientName: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 26,
  },
  phonePress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: -8,
    borderRadius: radius.pill,
  },
  phoneText: {
    color: colors.accent,
    fontFamily: 'Outfit-SemiBold',
    fontVariant: ['tabular-nums'],
  },
  clientPhoneMissing: {
    color: colors.slateSoft,
    fontStyle: 'italic',
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

  /* ── Info card ── */
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
    marginHorizontal: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  infoIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  infoLabel: {
    color: colors.slateSoft,
    fontSize: 10,
  },
  infoValue: {
    color: colors.ink,
    marginTop: 2,
  },
  infoValueEmphasis: {
    fontFamily: 'Outfit-SemiBold',
    color: colors.accent,
    fontVariant: ['tabular-nums'],
  },

  /* ── Status actions ── */
  actionsBlock: {
    gap: 10,
  },
  actionsLabel: {
    color: colors.slateSoft,
    paddingHorizontal: 4,
  },
  actionsList: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  statusBtnDestructive: {
    borderBottomWidth: 0,
  },
  statusBtnIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Payment method picker ── */
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginLeft: -6,
    borderRadius: radius.pill,
  },
  backText: {
    color: colors.slate,
    fontFamily: 'Outfit-SemiBold',
  },
  payTitle: {
    color: colors.ink,
    fontSize: 18,
    marginTop: 4,
  },
  paySubtitle: {
    color: colors.slate,
    marginTop: 2,
    marginBottom: 8,
  },
  payChips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  payChip: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  payChipActive: {
    backgroundColor: colors.accentWash,
    borderColor: colors.accent,
  },
  payChipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payChipIconActive: {
    backgroundColor: colors.accent,
  },
  payChipLabel: {
    color: colors.slate,
    fontFamily: 'Outfit-SemiBold',
  },
  payChipLabelActive: {
    color: colors.accent,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: colors.accent,
    borderRadius: radius.card,
    marginTop: 8,
  },
  confirmBtnText: {
    color: colors.white,
  },

  /* ── Locked state ── */
  lockedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.input,
  },
  lockedText: {
    color: colors.slate,
  },
});
