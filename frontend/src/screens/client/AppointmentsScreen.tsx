import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { parseISO, isPast } from 'date-fns';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '../../components/ui/AppText';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAlert } from '../../contexts/AlertContext';
import { bookingsApi } from '../../api/bookings';
import { ErrorState } from '../../components/ui/ErrorState';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import {
  Segment,
  SwipeableRow,
  AppointmentTimelineCard,
  PressablePremium,
  EmptyBookingsIllustration,
  Skeleton,
} from '../../components/premium';
import type { ClientAppointmentsScreenProps } from '../../types/navigation';

type Tab = 'upcoming' | 'past' | 'cancelled';

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  status: string;
  total_price: number;
  has_review?: boolean;
  salon_id?: string;
  service_id?: string;
  salon?: { id?: string; name?: string; name_ar?: string; cover_photo_url?: string | null };
  service?: { id?: string; name?: string; name_ar?: string; duration?: number };
}

function buildAnchor(b: Booking): Date {
  const d = parseISO(b.booking_date);
  const [h, m] = b.start_time.split(':');
  d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
  return d;
}

export function AppointmentsScreen({ navigation }: ClientAppointmentsScreenProps<'Appointments'>) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const alert = useAlert();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('upcoming');

  // Fetch all (server-side status filter is coarse — we split client-side).
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['bookings', 'all'],
    queryFn: () => bookingsApi.getMyBookings(),
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const cancelMutation = useMutation({
    mutationFn: (id: string) => bookingsApi.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
    onError: () =>
      alert.show({ type: 'error', title: t('common.error'), message: t('errors.server') }),
  });

  const all: Booking[] = data?.data || [];

  const buckets = useMemo(() => {
    const upcoming: Booking[] = [];
    const past: Booking[] = [];
    const cancelled: Booking[] = [];
    for (const b of all) {
      if (b.status === 'cancelled' || b.status === 'no_show') {
        cancelled.push(b);
        continue;
      }
      const anchor = buildAnchor(b);
      if (b.status === 'completed' || isPast(anchor)) past.push(b);
      else upcoming.push(b);
    }
    upcoming.sort((a, b) => buildAnchor(a).getTime() - buildAnchor(b).getTime());
    past.sort((a, b) => buildAnchor(b).getTime() - buildAnchor(a).getTime());
    cancelled.sort((a, b) => buildAnchor(b).getTime() - buildAnchor(a).getTime());
    return { upcoming, past, cancelled };
  }, [all]);

  const items = buckets[tab];

  const handleCancel = (b: Booking) => {
    alert.show({
      type: 'confirm',
      title: t('booking.cancelBooking'),
      message: t('booking.cancelConfirm'),
      confirmText: t('common.yes'),
      cancelText: t('common.no'),
      onConfirm: () => cancelMutation.mutate(b.id),
    });
  };

  const handleReschedule = (b: Booking) => {
    navigation.navigate('RescheduleBooking', {
      bookingId: b.id,
      salonId: b.salon_id || b.salon?.id || '',
      serviceId: b.service_id || b.service?.id || '',
      salonName: b.salon?.name || '',
      serviceName: b.service?.name || '',
      currentDate: b.booking_date,
      duration: b.service?.duration || 30,
      price: b.total_price,
    });
  };

  const handleWriteReview = (b: Booking) => {
    navigation.navigate('WriteReview', {
      salonId: b.salon_id || b.salon?.id || '',
      bookingId: b.id,
      salonName: b.salon?.name || '',
    });
  };

  const handleOpen = (b: Booking) => {
    const salonId = b.salon_id || b.salon?.id;
    if (salonId) navigation.navigate('SalonDetail', { salonId });
  };

  const segmentOptions = useMemo(
    () => [
      { value: 'upcoming' as const, label: t('appointments.upcoming') },
      { value: 'past' as const, label: t('appointments.past') },
      { value: 'cancelled' as const, label: t('appointments.cancelled') },
    ],
    [t],
  );

  const renderItem = ({ item, index }: { item: Booking; index: number }) => {
    const card = (
      <AppointmentTimelineCard
        booking={item}
        language={language}
        variant={tab}
        onPress={() => handleOpen(item)}
        reviewCta={
          item.status === 'completed' && !item.has_review ? (
            <PressablePremium
              onPress={() => handleWriteReview(item)}
              haptic="selection"
              pressScale={0.97}
              style={styles.reviewCta}
              accessibilityRole="button"
            >
              <Ionicons name="star-outline" size={14} color={colors.accent} />
              <AppText style={styles.reviewCtaText}>{t('review.writeReview')}</AppText>
            </PressablePremium>
          ) : item.status === 'completed' && item.has_review ? (
            <View style={styles.reviewedRow}>
              <Ionicons name="checkmark-circle" size={14} color={colors.ok} />
              <AppText style={styles.reviewedText}>{t('review.reviewed')}</AppText>
            </View>
          ) : null
        }
      />
    );

    const animatedCard = (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(280)}>
        {card}
      </Animated.View>
    );

    if (tab !== 'upcoming') return animatedCard;

    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(280)}>
        <SwipeableRow
          trailingAction={{
            label: t('booking.cancelBooking'),
            icon: 'close-outline',
            color: colors.danger,
            destructive: true,
            onPress: () => handleCancel(item),
          }}
          leadingAction={{
            label: t('booking.modifyBooking'),
            icon: 'calendar-outline',
            color: colors.accent,
            onPress: () => handleReschedule(item),
          }}
        >
          {card}
        </SwipeableRow>
      </Animated.View>
    );
  };

  const emptyKey = tab === 'upcoming' ? 'noUpcoming' : tab === 'past' ? 'noPast' : 'noCancelled';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppText style={styles.title}>{t('appointments.title')}</AppText>
        <AppText style={styles.subtitle}>{t('appointments.subtitle')}</AppText>
      </View>

      <View style={styles.segmentWrap}>
        <Segment options={segmentOptions} value={tab} onChange={setTab} />
      </View>

      {isLoading ? (
        <AppointmentsSkeleton />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <SectionList
          sections={[{ title: tab, data: items }]}
          keyExtractor={(b) => b.id}
          renderItem={renderItem}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={() => null}
          contentContainerStyle={items.length === 0 ? styles.listEmpty : styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.accent]}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <EmptyBookingsIllustration size={140} color={colors.accent} />
              <AppText style={styles.emptyTitle}>{t(`appointments.${emptyKey}`)}</AppText>
              <AppText style={styles.emptyHint}>{t(`appointments.${emptyKey}Hint`)}</AppText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function AppointmentsSkeleton() {
  return (
    <View style={styles.list}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={skeletonStyles.card}>
          <Skeleton.Row gap={12} style={{ alignItems: 'center' }}>
            <Skeleton.Block width={56} height={56} radius={14} />
            <Skeleton.Group gap={8} style={{ flex: 1 }}>
              <Skeleton.Block width="70%" height={14} radius={4} />
              <Skeleton.Block width="50%" height={12} radius={4} />
              <Skeleton.Row gap={8}>
                <Skeleton.Block width={70} height={20} radius={999} />
                <Skeleton.Block width={50} height={20} radius={999} />
              </Skeleton.Row>
            </Skeleton.Group>
          </Skeleton.Row>
        </View>
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 6,
    paddingBottom: 14,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.slate,
    marginTop: 4,
  },
  segmentWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 18,
  },

  list: {
    paddingTop: 6,
    paddingBottom: 36,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.slate,
    textAlign: 'center',
    lineHeight: 18,
  },

  reviewCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.accentWash,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  reviewCtaText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 12,
    color: colors.accent,
  },

  reviewedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewedText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 12,
    color: colors.ok,
  },
});
