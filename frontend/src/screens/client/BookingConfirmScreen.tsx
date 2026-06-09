import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { AppText } from '../../components/ui/AppText';
import { bookingsApi } from '../../api/bookings';
import { useAlert } from '../../contexts/AlertContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { formatDate, formatTime, formatCurrency, formatDuration } from '../../utils/formatters';
import {
  HoldToConfirm,
  PressablePremium,
} from '../../components/premium';
import type { ClientHomeScreenProps } from '../../types/navigation';

type PaymentMethod = 'cash' | 'bankily' | 'sedad';

const PAYMENT_METHODS: Array<{ value: PaymentMethod; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: 'cash', icon: 'cash-outline' },
  { value: 'bankily', icon: 'phone-portrait-outline' },
  { value: 'sedad', icon: 'card-outline' },
];

export function BookingConfirmScreen({ route, navigation }: ClientHomeScreenProps<'BookingConfirm'>) {
  const { salonId, serviceId, serviceName, date, startTime, duration, price, salonName } = route.params;
  const { t } = useTranslation();
  const alert = useAlert();
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [booked, setBooked] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      bookingsApi.create({
        salon_id: salonId,
        service_id: serviceId,
        booking_date: date,
        start_time: startTime,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setBooked(true);
    },
    onError: () => {
      alert.show({ type: 'error', title: t('common.error'), message: t('errors.server') });
    },
  });

  if (booked) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.successWrap}>
          <Animated.View entering={ZoomIn.duration(360)} style={styles.successCircle}>
            <Ionicons name="checkmark" size={48} color={colors.surface} />
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(280).delay(120)} style={styles.successText}>
            <AppText style={styles.successTitle}>{t('booking.bookingSuccess')}</AppText>
            <AppText style={styles.successMessage}>{t('booking.bookingSuccessMessage')}</AppText>
          </Animated.View>

          <Animated.View entering={FadeIn.duration(280).delay(220)} style={styles.successCard}>
            <SummaryRow icon="storefront-outline" label={t('booking.salonName')} value={salonName} />
            <Divider />
            <SummaryRow icon="cut-outline" label={t('booking.service')} value={serviceName} />
            <Divider />
            <SummaryRow icon="calendar-outline" label={t('booking.date')} value={formatDate(date)} />
            <Divider />
            <SummaryRow icon="time-outline" label={t('booking.time')} value={formatTime(startTime)} />
          </Animated.View>

          <View style={styles.successButtons}>
            <PressablePremium
              onPress={() => navigation.getParent()?.navigate('AppointmentsTab')}
              pressScale={0.97}
              haptic="selection"
              style={styles.primaryBtn}
            >
              <AppText style={styles.primaryBtnText}>{t('booking.viewAppointments')}</AppText>
            </PressablePremium>
            <Pressable
              onPress={() => navigation.popToTop()}
              hitSlop={6}
              style={styles.ghostBtn}
            >
              <AppText style={styles.ghostBtnText}>{t('booking.bookAnother')}</AppText>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.sheetRoot}>
      {/* Backdrop tap → close */}
      <Pressable
        style={StyleSheet.absoluteFillObject}
        onPress={() => navigation.goBack()}
      />

      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <View style={styles.grabber} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetScroll}
          keyboardShouldPersistTaps="handled"
        >
          <AppText style={styles.sheetTitle}>{t('booking.confirmTitle')}</AppText>
          <AppText style={styles.sheetSubtitle}>{t('booking.confirmSubtitle')}</AppText>

          {/* Summary card */}
          <View style={styles.summaryCard}>
            <SummaryRow icon="storefront-outline" label={t('booking.salonName')} value={salonName} />
            <Divider />
            <SummaryRow icon="cut-outline" label={t('booking.service')} value={serviceName} />
            <Divider />
            <SummaryRow icon="calendar-outline" label={t('booking.date')} value={formatDate(date)} />
            <Divider />
            <SummaryRow icon="time-outline" label={t('booking.time')} value={formatTime(startTime)} />
            <Divider />
            <SummaryRow
              icon="hourglass-outline"
              label={t('booking.duration')}
              value={formatDuration(duration)}
            />
            <Divider />
            <SummaryRow
              icon="cash-outline"
              label={t('booking.price')}
              value={formatCurrency(price)}
              accent
            />
          </View>

          {/* Payment method */}
          <AppText style={styles.sectionLabel}>{t('booking.paymentMethod')}</AppText>
          <View style={styles.paymentList}>
            {PAYMENT_METHODS.map((m, i) => {
              const isActive = paymentMethod === m.value;
              const isLast = i === PAYMENT_METHODS.length - 1;
              return (
                <PressablePremium
                  key={m.value}
                  haptic="selection"
                  pressScale={0.99}
                  onPress={() => setPaymentMethod(m.value)}
                  style={[styles.paymentRow, !isLast && styles.paymentDivider]}
                >
                  <View style={styles.paymentIcon}>
                    <Ionicons name={m.icon} size={18} color={colors.ink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.paymentLabel}>{t(`booking.paymentOptions.${m.value}`)}</AppText>
                    <AppText style={styles.paymentHint}>{t(`booking.paymentHints.${m.value}`)}</AppText>
                  </View>
                  <View style={[styles.radio, isActive && styles.radioActive]}>
                    {isActive && <View style={styles.radioDot} />}
                  </View>
                </PressablePremium>
              );
            })}
          </View>

          <AppText style={styles.holdHint}>{t('booking.holdToConfirmHint')}</AppText>
        </ScrollView>

        <View style={styles.sheetFooter}>
          <HoldToConfirm
            label={t('booking.confirmBooking')}
            onConfirm={() => mutation.mutate()}
            loading={mutation.isPending}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={summaryStyles.row}>
      <View style={summaryStyles.iconWrap}>
        <Ionicons name={icon} size={16} color={colors.slate} />
      </View>
      <AppText style={summaryStyles.label} numberOfLines={1}>{label}</AppText>
      <AppText style={[summaryStyles.value, accent && summaryStyles.valueAccent]} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

function Divider() {
  return <View style={summaryStyles.divider} />;
}

const summaryStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.slate,
  },
  value: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    color: colors.ink,
    maxWidth: '52%',
    textAlign: 'right',
  },
  valueAccent: {
    fontFamily: 'Outfit-Bold',
    color: colors.ink,
    fontSize: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
    marginStart: 56,
  },
});

const styles = StyleSheet.create({
  /* Sheet feel */
  sheetRoot: {
    flex: 1,
    backgroundColor: 'rgba(11,14,20,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.hairline,
    marginBottom: 8,
  },
  sheetScroll: {
    paddingHorizontal: spacing.section,
    paddingBottom: 24,
  },
  sheetTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.4,
    marginTop: 4,
  },
  sheetSubtitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.slate,
    marginTop: 4,
    marginBottom: 18,
  },

  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 18,
  },

  sectionLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.slate,
    marginBottom: 10,
  },

  paymentList: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  paymentDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    color: colors.ink,
  },
  paymentHint: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.slate,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.ink },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: colors.ink,
  },

  holdHint: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.slateSoft,
    textAlign: 'center',
    marginTop: 4,
  },

  sheetFooter: {
    paddingHorizontal: spacing.section,
    paddingBottom: 8,
    paddingTop: 8,
  },

  /* Success state */
  container: { flex: 1, backgroundColor: colors.canvas },
  successWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.section,
    paddingTop: 80,
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.ok,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ok,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  successText: {
    alignItems: 'center',
    marginTop: 24,
  },
  successTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    color: colors.ink,
    textAlign: 'center',
  },
  successMessage: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: colors.slate,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 12,
  },
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    overflow: 'hidden',
    width: '100%',
    marginTop: 24,
  },
  successButtons: {
    alignSelf: 'stretch',
    marginTop: 22,
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: colors.ink,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    color: colors.surface,
    letterSpacing: 0.3,
  },
  ghostBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  ghostBtnText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 13,
    color: colors.slate,
  },
});
