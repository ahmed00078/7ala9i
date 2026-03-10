import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { AppText as Text } from '../../components/ui/AppText';
import { adminApi } from '../../api/admin';
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import type { AdminDashboardScreenProps } from '../../types/navigation';

export function AdminDashboardScreen({ navigation }: AdminDashboardScreenProps<'Dashboard'>) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const { data: stats, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const res = await adminApi.getStats();
      return res.data;
    },
  });

  const statCards = [
    {
      key: 'clients',
      label: t('admin.stats.clients'),
      value: stats?.total_clients ?? 0,
      icon: 'people',
      color: colors.info,
      bg: colors.infoLight,
    },
    {
      key: 'owners',
      label: t('admin.stats.owners'),
      value: stats?.total_owners ?? 0,
      icon: 'storefront',
      color: colors.accent,
      bg: colors.accentLight,
    },
    {
      key: 'pending',
      label: t('admin.stats.pendingOwners'),
      value: stats?.pending_owners ?? 0,
      icon: 'time',
      color: colors.warning,
      bg: colors.warningLight,
    },
    {
      key: 'salons',
      label: t('admin.stats.salons'),
      value: stats?.total_salons ?? 0,
      icon: 'cut',
      color: colors.purple,
      bg: colors.purpleLight,
    },
    {
      key: 'bookings',
      label: t('admin.stats.bookings'),
      value: stats?.total_bookings ?? 0,
      icon: 'calendar',
      color: colors.success,
      bg: colors.successLight,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{t('admin.greeting')}</Text>
          <Text style={styles.adminName}>{user?.first_name} {user?.last_name}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color={colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats grid */}
        <Text style={styles.sectionTitle}>{t('admin.overview')}</Text>
        <View style={styles.grid}>
          {statCards.map((card) => (
            <View key={card.key} style={[styles.statCard, { borderLeftColor: card.color }]}>
              <View style={[styles.iconBox, { backgroundColor: card.bg }]}>
                <Ionicons name={card.icon as any} size={22} color={card.color} />
              </View>
              <Text style={styles.statValue}>
                {isLoading ? '—' : card.value.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>{t('admin.quickActions')}</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => (navigation as any).navigate('OwnersTab')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.warningLight }]}>
              <Ionicons name="time" size={24} color={colors.warning} />
            </View>
            <Text style={styles.actionLabel}>{t('admin.reviewApplications')}</Text>
            {(stats?.pending_owners ?? 0) > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{stats?.pending_owners}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => (navigation as any).navigate('CreateOwnerTab')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.accentLight }]}>
              <Ionicons name="person-add" size={24} color={colors.accent} />
            </View>
            <Text style={styles.actionLabel}>{t('admin.createOwner')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.navy,
  },
  greeting: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: 'rgba(255,255,255,0.6)',
  },
  adminName: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: colors.white,
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: colors.errorLight,
  },
  scroll: { padding: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
    marginBottom: 14,
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 26,
    fontFamily: 'Outfit-Bold',
    color: colors.navy,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: colors.grayDark,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    position: 'relative',
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 13,
    fontFamily: 'Outfit-Medium',
    color: colors.navy,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Outfit-Bold',
    color: colors.white,
  },
});
