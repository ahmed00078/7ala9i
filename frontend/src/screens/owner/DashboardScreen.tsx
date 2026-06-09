import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, differenceInMinutes, isToday } from 'date-fns';

import { AppText } from '../../components/ui/AppText';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { ownerApi } from '../../api/owner';
import { ErrorState } from '../../components/ui/ErrorState';
import { formatCurrency, formatTime } from '../../utils/formatters';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';

import {
  Surface,
  Stat,
  Avatar,
  Skeleton,
  PressablePremium,
  PremiumNotificationBell,
} from '../../components/premium';
import { EmptyBookingsIllustration } from '../../components/premium/illustrations';

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

export function DashboardScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['owner', 'dashboard'],
    queryFn: () => ownerApi.getDashboard(),
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isError) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ErrorState onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const dashboard = data?.data;
  const upcoming: Appointment[] = dashboard?.upcoming_appointments ?? [];
  const nextBooking = upcoming[0];
  const greeting = greetingForHour(new Date(), t);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
      >
        <SafeAreaView edges={['top']}>
          {/* ── Hero ──────────────────────────────────────────────────── */}
          <Surface variant="hero" style={styles.hero} padding={24} radius={radius.hero}>
            <View style={styles.heroTop}>
              <View style={{ flex: 1 }}>
                <AppText style={[typography.bodySmall, styles.heroGreeting]}>
                  {greeting}{user?.first_name ? `, ${user.first_name}` : ''}
                </AppText>
                <AppText style={[typography.bodySmall, styles.heroDate]}>
                  {format(new Date(), 'EEEE d MMMM')}
                </AppText>
              </View>
              <View style={styles.heroRight}>
                <PremiumNotificationBell />
                <Avatar name={user?.first_name ?? dashboard?.salon_name} size={40} />
              </View>
            </View>

            <View style={styles.nextStrip}>
              <AppText style={[typography.capsLabel, styles.nextStripLabel]}>
                {t('owner.dashboard.nextAppointment')}
              </AppText>
              {isLoading ? (
                <Skeleton.Block height={28} width="80%" />
              ) : nextBooking ? (
                <NextBookingRow appointment={nextBooking} language={language} />
              ) : (
                <AppText style={[typography.bodyMedium, styles.nextStripEmpty]}>
                  {t('owner.dashboard.noUpcomingToday')}
                </AppText>
              )}
            </View>
          </Surface>

          {/* ── Headline: today revenue ──────────────────────────────── */}
          <Surface variant="raised" style={styles.headlineCard} padding={20}>
            {isLoading ? (
              <Skeleton.Group>
                <Skeleton.Block width="40%" height={44} />
                <Skeleton.Block width="30%" height={12} />
              </Skeleton.Group>
            ) : (
              <Stat.Headline
                value={dashboard?.today?.revenue_expected ?? 0}
                label={t('owner.dashboard.todayRevenue')}
                unit=" MRU"
              />
            )}
          </Surface>

          {/* ── 3 inline stats with hairline dividers ────────────────── */}
          <Surface variant="raised" style={styles.inlineCard} padding={0}>
            {isLoading ? (
              <View style={{ padding: 16, gap: 14 }}>
                <Skeleton.Block height={20} />
                <Skeleton.Block height={20} />
                <Skeleton.Block height={20} />
              </View>
            ) : (
              <View style={styles.inlinePadding}>
                <Stat.Inline
                  value={dashboard?.today?.total_bookings ?? 0}
                  label={t('owner.dashboard.todayBookings')}
                />
                <Stat.Inline
                  value={dashboard?.week?.total ?? 0}
                  label={t('owner.dashboard.weekBookings')}
                />
                <Stat.Inline
                  value={dashboard?.week?.revenue ?? 0}
                  unit=" MRU"
                  label={t('owner.dashboard.weekRevenue')}
                  divider={false}
                />
              </View>
            )}
          </Surface>

          {/* ── Today's upcoming timeline ────────────────────────────── */}
          <AppText style={[typography.capsLabel, styles.sectionTitle]}>
            {t('owner.dashboard.upcomingToday')}
          </AppText>
          {isLoading ? (
            <View style={{ gap: 14 }}>
              <Skeleton.Row gap={12}>
                <Skeleton.Block width={52} height={36} />
                <Skeleton.Block width="70%" height={36} />
              </Skeleton.Row>
              <Skeleton.Row gap={12}>
                <Skeleton.Block width={52} height={36} />
                <Skeleton.Block width="60%" height={36} />
              </Skeleton.Row>
            </View>
          ) : upcoming.length === 0 ? (
            <View style={styles.emptyBox}>
              <EmptyBookingsIllustration size={120} />
              <AppText style={[typography.bodyMedium, styles.emptyTitle]}>
                {t('owner.dashboard.noBookingsToday')}
              </AppText>
            </View>
          ) : (
            <View style={styles.timeline}>
              {upcoming.map((apt, index) => (
                <TimelineRow
                  key={apt.id}
                  appointment={apt}
                  language={language}
                  isLast={index === upcoming.length - 1}
                />
              ))}
            </View>
          )}
        </SafeAreaView>
      </ScrollView>
    </View>
  );
}

/* ── Sub-components ────────────────────────────────────────────────── */

function NextBookingRow({ appointment, language }: { appointment: Appointment; language: string }) {
  const { t } = useTranslation();
  const clientName = appointment.client
    ? `${appointment.client.first_name} ${appointment.client.last_name}`.trim()
    : '—';
  const serviceName =
    language === 'ar' && appointment.service?.name_ar
      ? appointment.service.name_ar
      : appointment.service?.name ?? '';

  const minutesAway = useMemo(() => minutesUntil(appointment), [appointment]);

  return (
    <View style={styles.nextRow}>
      <Avatar name={clientName} size={36} />
      <View style={{ flex: 1 }}>
        <AppText style={[typography.bodyMedium, styles.nextRowName]} numberOfLines={1}>
          {clientName}
        </AppText>
        <AppText style={[typography.bodySmall, styles.nextRowService]} numberOfLines={1}>
          {serviceName}
        </AppText>
      </View>
      <View style={styles.nextRowTimeBlock}>
        <AppText style={[typography.bodyMedium, styles.nextRowTime]}>
          {formatTime(appointment.start_time)}
        </AppText>
        {minutesAway !== null && (
          <AppText style={[typography.caption, styles.nextRowAway]}>
            {minutesAway <= 0
              ? t('owner.dashboard.nextBookingNow')
              : t('owner.dashboard.nextBookingIn', { minutes: minutesAway })}
          </AppText>
        )}
      </View>
    </View>
  );
}

function TimelineRow({
  appointment,
  language,
  isLast,
}: {
  appointment: Appointment;
  language: string;
  isLast: boolean;
}) {
  const clientName = appointment.client
    ? `${appointment.client.first_name} ${appointment.client.last_name}`.trim()
    : '—';
  const serviceName =
    language === 'ar' && appointment.service?.name_ar
      ? appointment.service.name_ar
      : appointment.service?.name ?? '';

  return (
    <PressablePremium
      haptic="selection"
      pressScale={0.985}
      style={[styles.timelineRow, !isLast && styles.timelineDivider]}
      accessibilityRole="button"
    >
      <View style={styles.timelineTimeCol}>
        <AppText style={[typography.bodyMedium, styles.timelineTimeStart]}>
          {formatTime(appointment.start_time)}
        </AppText>
        <AppText style={[typography.caption, styles.timelineTimeEnd]}>
          {formatTime(appointment.end_time)}
        </AppText>
      </View>
      <Avatar name={clientName} size={32} />
      <View style={{ flex: 1 }}>
        <AppText style={[typography.bodyMedium, styles.timelineClient]} numberOfLines={1}>
          {clientName}
        </AppText>
        <AppText style={[typography.bodySmall, styles.timelineService]} numberOfLines={1}>
          {serviceName}
        </AppText>
      </View>
      <AppText style={[typography.bodyMedium, styles.timelinePrice]}>
        {formatCurrency(appointment.total_price)}
      </AppText>
    </PressablePremium>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────── */

function greetingForHour(date: Date, t: (key: string) => string): string {
  const h = date.getHours();
  if (h < 12) return t('owner.dashboard.goodMorning');
  if (h < 18) return t('owner.dashboard.goodAfternoon');
  return t('owner.dashboard.goodEvening');
}

function minutesUntil(apt: Appointment): number | null {
  try {
    const baseDate = apt.booking_date ? parseISO(apt.booking_date) : new Date();
    if (!isToday(baseDate)) return null;
    const [h, m] = apt.start_time.split(':').map(Number);
    const startsAt = new Date(baseDate);
    startsAt.setHours(h, m, 0, 0);
    return differenceInMinutes(startsAt, new Date());
  } catch {
    return null;
  }
}

/* ── Styles ────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scroll: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 120, // clear the floating tab bar
  },
  hero: {
    marginTop: 8,
    marginBottom: spacing.section,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  heroGreeting: {
    color: 'rgba(255,255,255,0.65)',
  },
  heroDate: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    marginTop: 2,
  },
  heroRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nextStrip: {
    gap: 10,
  },
  nextStripLabel: {
    color: 'rgba(255,255,255,0.55)',
  },
  nextStripEmpty: {
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nextRowName: {
    color: colors.white,
    fontFamily: 'Outfit-SemiBold',
  },
  nextRowService: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
  },
  nextRowTimeBlock: {
    alignItems: 'flex-end',
  },
  nextRowTime: {
    color: colors.white,
    fontFamily: 'Outfit-SemiBold',
    fontVariant: ['tabular-nums'],
  },
  nextRowAway: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
  },
  headlineCard: {
    marginBottom: 14,
  },
  inlineCard: {
    marginBottom: spacing.section,
  },
  inlinePadding: {
    paddingHorizontal: 18,
    paddingVertical: 4,
  },
  sectionTitle: {
    color: colors.slate,
    marginBottom: 12,
  },
  timeline: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  timelineDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  timelineTimeCol: {
    width: 52,
  },
  timelineTimeStart: {
    color: colors.ink,
    fontFamily: 'Outfit-SemiBold',
    fontVariant: ['tabular-nums'],
  },
  timelineTimeEnd: {
    color: colors.slateSoft,
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  timelineClient: {
    color: colors.ink,
    fontFamily: 'Outfit-SemiBold',
  },
  timelineService: {
    color: colors.slate,
    marginTop: 1,
  },
  timelinePrice: {
    color: colors.accent,
    fontFamily: 'Outfit-SemiBold',
    fontVariant: ['tabular-nums'],
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyTitle: {
    color: colors.slate,
  },
});
