import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { AppText } from '../../components/ui/AppText';
import { useLanguage } from '../../contexts/LanguageContext';
import { salonsApi } from '../../api/salons';
import { bookingsApi } from '../../api/bookings';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { formatCurrency, formatDuration, formatDate } from '../../utils/formatters';
import {
  DayStrip,
  SlotPicker,
  HoldToConfirm,
  EmptyBookingsIllustration,
  Skeleton,
} from '../../components/premium';
import type { ClientAppointmentsScreenProps } from '../../types/navigation';

type Props = ClientAppointmentsScreenProps<'RescheduleBooking'>;

export function RescheduleBookingScreen({ route }: Props) {
  const { bookingId, salonId, serviceId, salonName, serviceName, currentDate, duration, price } = route.params;
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { data, isFetching } = useQuery({
    queryKey: ['reschedule', 'availability', salonId, serviceId, selectedDate],
    queryFn: () => salonsApi.getAvailability(salonId, { date: selectedDate, service_id: serviceId }),
  });

  const slots: string[] = data?.data?.slots || [];

  const slotLabels = useMemo(
    () => ({
      morning: t('booking.morning'),
      afternoon: t('booking.afternoon'),
      evening: t('booking.evening'),
    }),
    [t],
  );

  const mutation = useMutation({
    mutationFn: () =>
      bookingsApi.reschedule(bookingId, { booking_date: selectedDate, start_time: selectedSlot! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setSuccess(true);
      setTimeout(() => navigation.goBack(), 1400);
    },
  });

  if (success) {
    return (
      <View style={styles.successBackdrop}>
        <Animated.View entering={ZoomIn.duration(280)} style={styles.successCircle}>
          <Ionicons name="checkmark" size={40} color={colors.surface} />
        </Animated.View>
        <Animated.View entering={FadeIn.duration(220).delay(120)}>
          <AppText style={styles.successTitle}>{t('booking.rescheduleSuccess')}</AppText>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Pressable
        onPress={() => navigation.goBack()}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <View style={styles.grabber} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.headerBlock}>
            <AppText style={styles.title}>{t('booking.rescheduleTitle')}</AppText>
            <AppText style={styles.salonName} numberOfLines={1}>{salonName}</AppText>
          </View>

          {/* Current slot anchor */}
          <View style={styles.currentPill}>
            <Ionicons name="time-outline" size={14} color={colors.slateSoft} />
            <AppText style={styles.currentPillLabel}>{t('booking.currentSlot')}</AppText>
            <AppText style={styles.currentPillValue} numberOfLines={1}>
              {formatDate(currentDate)}
            </AppText>
          </View>

          {/* Service summary */}
          <View style={styles.serviceCard}>
            <View style={styles.serviceIcon}>
              <Ionicons name="cut-outline" size={16} color={colors.surface} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={styles.serviceName} numberOfLines={1}>{serviceName}</AppText>
              <View style={styles.serviceMetaRow}>
                <AppText style={styles.serviceMeta}>{formatDuration(duration)}</AppText>
                <AppText style={styles.serviceSep}>·</AppText>
                <AppText style={styles.servicePrice}>{formatCurrency(price)}</AppText>
              </View>
            </View>
          </View>

          {/* Date */}
          <AppText style={styles.sectionLabel}>{t('booking.selectDate')}</AppText>
          <DayStrip
            selectedDate={selectedDate}
            onSelectDate={(d) => {
              setSelectedDate(d);
              setSelectedSlot(null);
            }}
            language={language}
          />

          {/* Slots */}
          <View style={styles.slotsBlock}>
            <AppText style={styles.sectionLabel}>{t('booking.selectTime')}</AppText>
            {isFetching ? (
              <View style={styles.loadingWrap}>
                <Skeleton.Row gap={8}>
                  <Skeleton.Block width={72} height={40} radius={20} />
                  <Skeleton.Block width={72} height={40} radius={20} />
                  <Skeleton.Block width={72} height={40} radius={20} />
                  <Skeleton.Block width={72} height={40} radius={20} />
                </Skeleton.Row>
                <Skeleton.Row gap={8} style={{ marginTop: 10 }}>
                  <Skeleton.Block width={72} height={40} radius={20} />
                  <Skeleton.Block width={72} height={40} radius={20} />
                  <Skeleton.Block width={72} height={40} radius={20} />
                </Skeleton.Row>
              </View>
            ) : slots.length === 0 ? (
              <View style={styles.emptyWrap}>
                <EmptyBookingsIllustration size={110} color={colors.accent} />
                <AppText style={styles.emptyTitle}>{t('booking.noSlots')}</AppText>
                <AppText style={styles.emptyHint}>{t('booking.noSlotsHint')}</AppText>
              </View>
            ) : (
              <SlotPicker
                slots={slots}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
                labels={slotLabels}
              />
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <HoldToConfirm
            label={t('booking.moveAppointment')}
            onConfirm={() => selectedSlot && mutation.mutate()}
            disabled={!selectedSlot}
            loading={mutation.isPending}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
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
  scroll: {
    paddingHorizontal: spacing.section,
    paddingBottom: 16,
  },
  headerBlock: { marginBottom: 14 },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  salonName: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.slate,
    marginTop: 4,
  },

  currentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  currentPillLabel: {
    fontFamily: 'Outfit-Medium',
    fontSize: 11,
    color: colors.slate,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  currentPillValue: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 12,
    color: colors.ink,
    maxWidth: 200,
  },

  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginBottom: 22,
  },
  serviceIcon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceName: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    color: colors.ink,
  },
  serviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  serviceMeta: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.slate,
  },
  serviceSep: { fontFamily: 'Outfit-Regular', color: colors.slateSoft, marginHorizontal: 2 },
  servicePrice: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
    color: colors.ink,
  },

  sectionLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.slate,
    marginBottom: 12,
  },

  slotsBlock: {
    marginTop: 20,
  },
  loadingWrap: { paddingVertical: 30, alignItems: 'center' },
  emptyWrap: { alignItems: 'center', paddingVertical: 18 },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: colors.ink,
    marginTop: 12,
  },
  emptyHint: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.slate,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  footer: {
    paddingHorizontal: spacing.section,
    paddingTop: 8,
    paddingBottom: 8,
  },

  /* Success */
  successBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11,14,20,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.ok,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 17,
    color: colors.surface,
    textAlign: 'center',
  },
});
