import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { AppText } from '../../components/ui/AppText';
import { adminApi } from '../../api/admin';
import { getImageUrl } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import {
  Surface,
  Stat,
  Avatar,
  Skeleton,
  SettingsGroup,
  SettingsRow,
} from '../../components/premium';
import type { AdminDashboardScreenProps } from '../../types/navigation';

interface AdminStats {
  total_clients: number;
  total_owners: number;
  pending_owners: number;
  total_salons: number;
  total_bookings: number;
}

export function AdminDashboardScreen({ navigation }: AdminDashboardScreenProps<'Dashboard'>) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const res = await adminApi.getStats();
      return res.data as AdminStats;
    },
  });
  const stats = data;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const greeting = greetingForHour(new Date(), t);
  const firstName = user?.first_name ?? '';
  const fullName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();
  const pending = stats?.pending_owners ?? 0;

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
          {/* ── Hero ──────────────────────────────────────────────── */}
          <Surface variant="hero" style={styles.hero} padding={24} radius={radius.hero}>
            <View style={styles.heroTop}>
              <View style={{ flex: 1 }}>
                <AppText style={[typography.bodySmall, styles.heroGreeting]}>
                  {greeting}{firstName ? `, ${firstName}` : ''}
                </AppText>
                <AppText style={[typography.bodySmall, styles.heroDate]}>
                  {format(new Date(), 'EEEE d MMMM')}
                </AppText>
              </View>
              <Avatar name={fullName} uri={getImageUrl(user?.avatar_url)} size={40} />
            </View>

            <View style={styles.heroFooter}>
              <AppText style={[typography.capsLabel, styles.heroFooterLabel]}>
                {t('admin.dashboard.marketplace')}
              </AppText>
              {isLoading ? (
                <Skeleton.Block width="40%" height={14} />
              ) : (
                <AppText style={[typography.bodyMedium, styles.heroFooterValue]}>
                  {stats?.total_salons ?? 0} {t('admin.stats.salons').toLowerCase()}{'  ·  '}
                  {stats?.total_clients ?? 0} {t('admin.stats.clients').toLowerCase()}
                </AppText>
              )}
            </View>
          </Surface>

          {/* ── Headline number ───────────────────────────────────── */}
          <Surface variant="raised" style={styles.headlineCard} padding={20}>
            {isLoading ? (
              <View style={{ gap: 8 }}>
                <Skeleton.Block width="40%" height={44} />
                <Skeleton.Block width="30%" height={12} />
              </View>
            ) : (
              <Stat.Headline
                value={stats?.total_bookings ?? 0}
                label={t('admin.dashboard.headlineLabel')}
              />
            )}
          </Surface>

          {/* ── 2 inline stats ────────────────────────────────────── */}
          <Surface variant="raised" style={styles.inlineCard} padding={0}>
            {isLoading ? (
              <View style={{ padding: 16, gap: 14 }}>
                <Skeleton.Block height={20} />
                <Skeleton.Block height={20} />
              </View>
            ) : (
              <View style={styles.inlinePadding}>
                <Stat.Inline
                  value={stats?.total_owners ?? 0}
                  label={t('admin.stats.owners')}
                />
                <Stat.Inline
                  value={stats?.total_clients ?? 0}
                  label={t('admin.stats.clients')}
                  divider={false}
                />
              </View>
            )}
          </Surface>

          {/* ── Operations ────────────────────────────────────────── */}
          <SettingsGroup label={t('admin.dashboard.operationsLabel')}>
            <SettingsRow
              icon="time-outline"
              label={t('admin.reviewApplications')}
              value={
                pending > 0
                  ? `${pending} ${t('admin.dashboard.pendingHint').toLowerCase()}`
                  : t('admin.dashboard.noPending')
              }
              onPress={() => (navigation as any).navigate('OwnersTab')}
            />
            <SettingsRow
              icon="person-add-outline"
              label={t('admin.createOwner')}
              value={t('admin.dashboard.createOwnerHint')}
              onPress={() => (navigation as any).navigate('CreateOwnerTab')}
            />
          </SettingsGroup>
        </SafeAreaView>
      </ScrollView>
    </View>
  );
}

function greetingForHour(date: Date, t: (k: string) => string): string {
  const h = date.getHours();
  if (h < 12) return t('admin.dashboard.goodMorning');
  if (h < 18) return t('admin.dashboard.goodAfternoon');
  return t('admin.dashboard.goodEvening');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  scroll: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 120,
  },

  hero: { marginTop: 8, marginBottom: spacing.section },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  heroGreeting: { color: 'rgba(255,255,255,0.65)' },
  heroDate: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    marginTop: 2,
  },
  heroFooter: { gap: 6 },
  heroFooterLabel: { color: 'rgba(255,255,255,0.55)' },
  heroFooterValue: { color: colors.white },

  headlineCard: {
    marginBottom: 14,
  },
  inlineCard: {
    marginBottom: spacing.section,
  },
  inlinePadding: {
    paddingHorizontal: 16,
  },
});
