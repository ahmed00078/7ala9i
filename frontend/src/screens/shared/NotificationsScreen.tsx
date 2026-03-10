import React, { useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { AppText as Text } from '../../components/ui/AppText';
import { notificationsApi } from '../../api/notifications';
import { colors } from '../../theme/colors';
import type { AppNotification } from '../../types/models';

// Relative time formatter
function formatRelativeTime(isoDate: string, t: ReturnType<typeof useTranslation>['t']): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t('notifications.justNow');
  if (diffMin < 60) return t('notifications.minutesAgo', { count: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t('notifications.hoursAgo', { count: diffH });
  const diffD = Math.floor(diffH / 24);
  return t('notifications.daysAgo', { count: diffD });
}

// Map notif_type → icon name
function getNotifIcon(notifType: string): React.ComponentProps<typeof Ionicons>['name'] {
  switch (notifType) {
    case 'booking_confirmed': return 'checkmark-circle-outline';
    case 'booking_created': return 'calendar-outline';
    case 'booking_cancelled_by_client':
    case 'booking_cancelled_by_owner': return 'close-circle-outline';
    case 'booking_completed': return 'trophy-outline';
    case 'booking_no_show': return 'alert-circle-outline';
    case 'booking_rescheduled': return 'refresh-circle-outline';
    case 'booking_reminder': return 'alarm-outline';
    case 'owner_approved': return 'shield-checkmark-outline';
    case 'owner_rejected': return 'ban-outline';
    default: return 'notifications-outline';
  }
}

function getNotifColor(notifType: string): string {
  switch (notifType) {
    case 'booking_confirmed':
    case 'booking_completed':
    case 'owner_approved': return colors.success;
    case 'booking_cancelled_by_client':
    case 'booking_cancelled_by_owner':
    case 'booking_no_show':
    case 'owner_rejected': return colors.error;
    case 'booking_reminder': return colors.warning;
    default: return colors.accent;
  }
}

interface NotifItemProps {
  item: AppNotification;
  onMarkRead: (id: string) => void;
  t: ReturnType<typeof useTranslation>['t'];
}

function NotifItem({ item, onMarkRead, t }: NotifItemProps) {
  const iconName = getNotifIcon(item.notif_type);
  const iconColor = getNotifColor(item.notif_type);

  return (
    <TouchableOpacity
      style={[styles.item, !item.is_read && styles.itemUnread]}
      onPress={() => !item.is_read && onMarkRead(item.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={iconName} size={22} color={iconColor} />
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, !item.is_read && styles.itemTitleBold]}>
          {t(`notifications.types.${item.notif_type}`, { defaultValue: item.title })}
        </Text>
        <Text style={styles.itemBody} numberOfLines={2}>
          {(() => {
            const translated = t(`notifications.bodies.${item.notif_type}`, { defaultValue: item.body, ...(item.data || {}) });
            return translated.includes('{{') ? item.body : translated;
          })()}
        </Text>
        <Text style={styles.itemTime}>{formatRelativeTime(item.created_at, t)}</Text>
      </View>
      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export function NotificationsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
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
  const hasUnread = notifications.some((n) => !n.is_read);

  const handleMarkRead = useCallback((id: string) => {
    markReadMutation.mutate(id);
  }, [markReadMutation]);

  const handleMarkAllRead = useCallback(() => {
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
        {hasUnread ? (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>{t('notifications.markAllRead')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.markAllBtn} />
        )}
      </View>

      {/* List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotifItem item={item} onMarkRead={handleMarkRead} t={t} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color={colors.grayLight} />
              <Text style={styles.emptyText}>{t('notifications.noNotifications')}</Text>
            </View>
          ) : null
        }
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Outfit-SemiBold',
    color: colors.white,
    textAlign: 'center',
  },
  markAllBtn: {
    width: 80,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  markAllText: {
    fontSize: 11,
    fontFamily: 'Outfit-Medium',
    color: colors.accentLight,
    textAlign: 'right',
  },

  listContent: { paddingVertical: 8 },
  emptyContainer: { flex: 1 },

  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemUnread: {
    backgroundColor: '#F0FDF9',
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemContent: { flex: 1 },
  itemTitle: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: colors.black,
    marginBottom: 3,
    textAlign: 'auto',
  },
  itemTitleBold: {
    fontFamily: 'Outfit-SemiBold',
  },
  itemBody: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: colors.grayDark,
    lineHeight: 18,
    textAlign: 'auto',
  },
  itemTime: {
    fontSize: 11,
    fontFamily: 'Outfit-Regular',
    color: colors.gray,
    marginTop: 5,
    textAlign: 'auto',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginTop: 4,
    flexShrink: 0,
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Outfit-Regular',
    color: colors.gray,
    textAlign: 'center',
  },
});
