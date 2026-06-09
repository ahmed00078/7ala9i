import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AppText } from '../../components/ui/AppText';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIsRTL } from '../../i18n/useIsRTL';
import { salonsApi } from '../../api/salons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { formatCurrency, formatDuration } from '../../utils/formatters';
import {
  DayStrip,
  SlotPicker,
  PressablePremium,
  EmptyBookingsIllustration,
  Skeleton,
} from '../../components/premium';
import type { ClientHomeScreenProps } from '../../types/navigation';

export function BookingFlowScreen({ route, navigation }: ClientHomeScreenProps<'BookingFlow'>) {
  const { salonId, serviceId, serviceName, duration, price } = route.params;
  const { t } = useTranslation();
  const { language } = useLanguage();
  const rtl = useIsRTL();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const { data: salonData } = useQuery({
    queryKey: ['salon', salonId],
    queryFn: () => salonsApi.getDetail(salonId),
  });
  const salon: any = salonData?.data;
  const salonName = language === 'ar' && salon?.name_ar ? salon.name_ar : salon?.name ?? '';

  const { data, isFetching } = useQuery({
    queryKey: ['availability', salonId, serviceId, selectedDate],
    queryFn: () =>
      salonsApi.getAvailability(salonId, { date: selectedDate, service_id: serviceId }),
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

  const handleContinue = () => {
    if (!selectedSlot) return;
    navigation.navigate('BookingConfirm', {
      salonId,
      serviceId,
      serviceName,
      date: selectedDate,
      startTime: selectedSlot,
      duration,
      price,
      salonName,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Slim header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={styles.backBtn}
        >
          <Ionicons
            name={rtl ? 'chevron-forward' : 'chevron-back'}
            size={22}
            color={colors.ink}
          />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText style={styles.headerLabel}>{t('booking.title')}</AppText>
          <AppText style={styles.headerSalon} numberOfLines={1}>
            {salonName || t('booking.selectingSlot')}
          </AppText>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Service summary card */}
        <View style={styles.serviceCard}>
          <View style={styles.serviceIcon}>
            <Ionicons name="cut-outline" size={18} color={colors.surface} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={styles.serviceName} numberOfLines={1}>{serviceName}</AppText>
            <View style={styles.serviceMetaRow}>
              <Ionicons name="time-outline" size={11} color={colors.slate} />
              <AppText style={styles.serviceMeta}>{formatDuration(duration)}</AppText>
              <AppText style={styles.serviceSep}>·</AppText>
              <AppText style={styles.servicePrice}>{formatCurrency(price)}</AppText>
            </View>
          </View>
        </View>

        {/* Date section */}
        <SectionLabel label={t('booking.selectDate')} />
        <DayStrip
          selectedDate={selectedDate}
          onSelectDate={(d) => {
            setSelectedDate(d);
            setSelectedSlot(null);
          }}
          language={language}
        />

        {/* Slot section */}
        <View style={styles.slotsBlock}>
          <SectionLabel label={t('booking.selectTime')} />
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
            <Animated.View entering={FadeIn.duration(220)} style={styles.emptyWrap}>
              <EmptyBookingsIllustration size={120} color={colors.accent} />
              <AppText style={styles.emptyTitle}>{t('booking.noSlots')}</AppText>
              <AppText style={styles.emptyHint}>{t('booking.noSlotsHint')}</AppText>
            </Animated.View>
          ) : (
            <SlotPicker
              slots={slots}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
              labels={slotLabels}
            />
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Bottom-pinned continue */}
      <View style={styles.footer}>
        <View style={styles.totalBlock}>
          <AppText style={styles.totalLabel}>{t('booking.total')}</AppText>
          <AppText style={styles.totalValue}>{formatCurrency(price)}</AppText>
        </View>
        <PressablePremium
          onPress={handleContinue}
          disabled={!selectedSlot}
          pressScale={0.97}
          haptic="medium"
          style={[styles.cta, !selectedSlot && styles.ctaDisabled]}
        >
          <AppText style={styles.ctaText}>{t('common.next')}</AppText>
          <Ionicons
            name={rtl ? 'arrow-back' : 'arrow-forward'}
            size={16}
            color={colors.surface}
            style={{ marginStart: 6 }}
          />
        </PressablePremium>
      </View>
    </SafeAreaView>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <AppText style={styles.sectionLabel}>{label}</AppText>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.slate,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerSalon: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 16,
    color: colors.ink,
    marginTop: 2,
  },

  scroll: { paddingBottom: 24 },

  /* Service card */
  serviceCard: {
    marginHorizontal: spacing.section,
    marginTop: 4,
    marginBottom: 24,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceName: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    color: colors.ink,
  },
  serviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  serviceMeta: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.slate,
  },
  serviceSep: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.slateSoft,
    marginHorizontal: 2,
  },
  servicePrice: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
    color: colors.ink,
  },

  /* Section label */
  sectionLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.slate,
    marginHorizontal: spacing.section,
    marginBottom: 12,
  },

  /* Slots */
  slotsBlock: {
    paddingHorizontal: spacing.section,
    marginTop: 24,
  },
  loadingWrap: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: colors.ink,
    marginTop: 14,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.slate,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 12,
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: spacing.section,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    backgroundColor: colors.canvas,
  },
  totalBlock: {
    flex: 0,
  },
  totalLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.slate,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  totalValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: colors.ink,
    marginTop: 2,
    letterSpacing: -0.3,
  },
  cta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: colors.ink,
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    color: colors.surface,
    letterSpacing: 0.3,
  },
});
