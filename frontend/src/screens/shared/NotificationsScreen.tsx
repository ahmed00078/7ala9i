import React, { useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  SectionList,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { differenceInCalendarDays, parseISO, format, isToday } from 'date-fns';
import { ar, fr, enUS, type Locale } from 'date-fns/locale';
import { AppText } from '../../components/ui/AppText';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { ErrorState } from '../../components/ui/ErrorState';
import { notificationsApi } from '../../api/notifications';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import {
  SwipeableRow,
  PressablePremium,
  EmptyBookingsIllustration,
} from '../../components/premium';
import { useIsRTL } from '../../i18n/useIsRTL';
import type { AppNotification } from '../../types/models';

const localeMap: Record<string, Locale> = { ar, fr, en: enUS };

function getLocale(lang: string): Locale {
  return localeMap[lang] || enUS;
}

function formatRelativeTime(iso: string, t: ReturnType<typeof useTranslation>['t']): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return t('notifications.justNow');
  if (diffMin < 60) return t('notifications.minutesAgo', { count: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t('notifications.hoursAgo', { count: diffH });
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return t('notifications.daysAgo', { count: diffD });
  return '';
}

function getNotifIcon(notifType: string): React.ComponentProps<typeof Ionicons>['name'] {
  switch (notifType) {
    case 'booking_confirmed': return 'checkmark-circle-outline';
    case 'booking_created': return 'calendar-outline';
    case 'booking_cancelled_by_client':
    case 'booking_cancelled_by_owner': return 'close-circle-outline';
    case 'booking_completed': return 'trophy-outline';
    case 'booking_no_show': return 'alert-circle-outline';
    case 'booking_rescheduled': return 'refresh-outline';
    case 'booking_reminder':
    case 'booking_reminder_24h': return 'alarm-outline';
    case 'owner_approved': return 'shield-checkmark-outline';
    case 'owner_rejected': return 'ban-outline';
    case 'new_review': return 'star-outline';
    default: return 'notifications-outline';
  }
}

function getNotifTone(notifType: string): string {
  switch (notifType) {
    case 'booking_confirmed':
    case 'booking_completed':
    case 'owner_approved': return colors.ok;
    case 'booking_cancelled_by_client':
    case 'booking_cancelled_by_owner':
    case 'booking_no_show':
    case 'owner_rejected': return colors.danger;
    case 'booking_reminder':
    case 'booking_reminder_24h': return colors.warn;
    case 'new_review': return colors.star;
    default: return colors.accent;
  }
}

type SectionKey = 'today' | 'week' | 'earlier';

function bucketize(notifs: AppNotification[]): Array<{ title: SectionKey; data: AppNotification[] }> {
  const today: AppNotification[] = [];
  const week: AppNotification[] = [];
  const earlier: AppNotification[] = [];
  const now = new Date();
  for (const n of notifs) {
    const d = parseISO(n.created_at);
    if (isToday(d)) today.push(n);
    else if (differenceInCalendarDays(now, d) < 7) week.push(n);
    else earlier.push(n);
  }
  const sections: Array<{ title: SectionKey; data: AppNotification[] }> = [];
  if (today.length) sections.push({ title: 'today', data: today });
  if (week.length) sections.push({ title: 'week', data: week });
  if (earlier.length) sections.push({ title: 'earlier', data: earlier });
  return sections;
}

interface NotifRowProps {
  item: AppNotification;
  t: ReturnType<typeof useTranslation>['t'];
  language: string;
  onPress: (item: AppNotification) => void;
}

function NotifRow({ item, t, language, onPress }: NotifRowProps) {
  const iconName = getNotifIcon(item.notif_type);
  const tone = getNotifTone(item.notif_type);

  const title = t(`notifications.types.${item.notif_type}`, { defaultValue: item.title });
  const body = (() => {
    const translated = t(`notifications.bodies.${item.notif_type}`, {
      defaultValue: item.body,
      ...(item.data || {}),
    });
    return translated.includes('{{') ? item.body : translated;
  })();

  const timeStr = formatRelativeTime(item.created_at, t) ||
    format(parseISO(item.created_at), 'd MMM', { locale: getLocale(language) });

  return (
    <PressablePremium
      onPress={() => onPress(item)}
      haptic="selection"
      pressScale={0.99}
      style={styles.rowWrap}
    >
      {!item.is_read && <View style={[styles.unreadStripe, { backgroundColor: tone }]} />}
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: tone + '1F' }]}>
          <Ionicons name={iconName} size={16} color={tone} />
        </View>
        <View style={styles.content}>
          <View style={styles.headerLine}>
            <AppText
              style={[styles.rowTitle, !item.is_read && styles.titleUnread]}
              numberOfLines={1}
            >
              {title}
            </AppText>
            {!item.is_read && <View style={styles.unreadDot} />}
            <AppText style={styles.time} numberOfLines={1}>{timeStr}</AppText>
          </View>
          <AppText
            style={[styles.body, !item.is_read && styles.bodyUnread]}
            numberOfLines={2}
          >
            {body}
          </AppText>
        </View>
      </View>
    </PressablePremium>
  );
}

export function NotificationsScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const rtl = useIsRTL();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll({ limit: 50 }),
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const notifications: AppNotification[] = data?.data || [];
  const sections = useMemo(() => bucketize(notifications), [notifications]);
  const hasUnread = notifications.some((n) => !n.is_read);

  const handleOpen = useCallback(
    (item: AppNotification) => {
      if (!item.is_read) markReadMutation.mutate(item.id);
      const data = (item.data || {}) as Record<string, any>;
      const salonId = data.salon_id as string | undefined;
      if (item.notif_type === 'new_review' && user?.role === 'owner' && salonId) {
        const parent = navigation.getParent?.();
        if (parent?.navigate) {
          parent.navigate('PreviewTab', {
            screen: 'SalonReviews',
            params: { salonId, salonName: data.salon_name || '' },
          });
        }
        return;
      }
      if (salonId && user?.role === 'client') {
        navigation.navigate('SalonDetail', { salonId });
        return;
      }
      if (
        (item.notif_type === 'booking_created' ||
          item.notif_type === 'booking_cancelled_by_client' ||
          item.notif_type === 'booking_rescheduled') &&
        user?.role === 'owner'
      ) {
        const parent = navigation.getParent?.();
        if (parent?.navigate) parent.navigate('CalendarTab');
      }
    },
    [markReadMutation, navigation, user?.role],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons
            name={rtl ? 'chevron-forward' : 'chevron-back'}
            size={22}
            color={colors.ink}
          />
        </Pressable>
        <AppText style={styles.title}>{t('notifications.title')}</AppText>
        {hasUnread ? (
          <Pressable onPress={() => markAllReadMutation.mutate()} hitSlop={8} style={styles.allReadBtn}>
            <AppText style={styles.allReadText}>{t('notifications.markAllRead')}</AppText>
          </Pressable>
        ) : (
          <View style={styles.allReadBtn} />
        )}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={sections.length === 0 ? styles.listEmpty : styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
        renderSectionHeader={({ section }) => (
          <AppText style={styles.sectionHeader}>
            {t(`notifications.section.${section.title as SectionKey}`)}
          </AppText>
        )}
        renderItem={({ item }) => {
          const row = (
            <NotifRow item={item} t={t} language={language} onPress={handleOpen} />
          );
          if (item.is_read) return row;
          return (
            <SwipeableRow
              trailingAction={{
                label: t('notifications.markRead'),
                icon: 'checkmark-outline',
                color: colors.accent,
                onPress: () => markReadMutation.mutate(item.id),
              }}
            >
              {row}
            </SwipeableRow>
          );
        }}
        ListEmptyComponent={
          isError ? (
            <ErrorState onRetry={refetch} />
          ) : !isLoading ? (
            <View style={styles.empty}>
              <EmptyBookingsIllustration size={140} color={colors.accent} />
              <AppText style={styles.emptyTitle}>{t('notifications.noNotifications')}</AppText>
              <AppText style={styles.emptyHint}>{t('notifications.noNotificationsHint')}</AppText>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: -8,
  },
  title: {
    flex: 1,
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  allReadBtn: {
    minWidth: 64,
    alignItems: 'flex-end',
  },
  allReadText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 12,
    color: colors.accent,
    letterSpacing: 0.2,
  },

  list: { paddingBottom: 24 },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },

  sectionHeader: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.slate,
    paddingHorizontal: spacing.lg,
    paddingTop: 18,
    paddingBottom: 8,
  },

  rowWrap: {
    position: 'relative',
    backgroundColor: colors.canvas,
  },
  unreadStripe: {
    position: 'absolute',
    top: 14,
    bottom: 14,
    start: 0,
    width: 3,
    borderRadius: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  content: { flex: 1, minWidth: 0 },
  headerLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  rowTitle: {
    flex: 1,
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  titleUnread: { fontFamily: 'Outfit-SemiBold' },
  body: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.slate,
    lineHeight: 18,
  },
  bodyUnread: {
    color: colors.slate,
  },
  time: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.slateSoft,
    fontVariant: ['tabular-nums'],
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },

  empty: {
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
});
