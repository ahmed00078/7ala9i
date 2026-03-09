import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { ownerApi } from '../../api/owner';
import { StatCard } from '../../components/owner/StatCard';
import { DaySchedule } from '../../components/owner/DaySchedule';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { formatCurrency } from '../../utils/formatters';
import { colors } from '../../theme/colors';

export function DashboardScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ['owner', 'dashboard'],
    queryFn: () => ownerApi.getDashboard(),
  });

  if (isLoading) return <LoadingScreen />;

  const dashboard = data?.data;
  if (!dashboard) return null;

  const todayTotal   = dashboard.today?.total_bookings ?? 0;
  const todayRevenue = dashboard.today?.revenue_expected ?? 0;
  const weekTotal    = dashboard.week?.total ?? 0;
  const weekRevenue  = dashboard.week?.revenue ?? 0;
  const upcomingCount = dashboard.upcoming_count ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Dark navy header */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>{t('owner.dashboard.title')}</Text>
            <Text style={styles.heroSalon}>{dashboard.salon_name}</Text>
          </View>
          <View style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={colors.white} />
          </View>
        </View>

        {/* Upcoming banner pill */}
        <View style={styles.upcomingBanner}>
          <View style={styles.upcomingIconBox}>
            <Ionicons name="calendar" size={22} color={colors.accent} />
          </View>
          <View style={styles.upcomingInfo}>
            <Text style={styles.upcomingLabel}>{t('owner.dashboard.upcomingBookings')}</Text>
            <Text style={styles.upcomingCount}>{upcomingCount}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Today stats */}
        <Text style={styles.sectionTitle}>{t('owner.dashboard.todayTitle')}</Text>
        <View style={styles.statsRow}>
          <StatCard
            title={t('owner.dashboard.todayBookings')}
            value={todayTotal}
            icon="calendar-outline"
            iconBg={colors.infoLight}
            iconColor={colors.info}
            accent={todayTotal > 0}
          />
          <View style={styles.statGap} />
          <StatCard
            title={t('owner.dashboard.todayRevenue')}
            value={formatCurrency(todayRevenue)}
            icon="cash-outline"
            iconBg={colors.successLight}
            iconColor={colors.successDark}
          />
        </View>

        {/* Week stats */}
        <Text style={styles.sectionTitle}>{t('owner.dashboard.weekTitle')}</Text>
        <View style={styles.statsRow}>
          <StatCard
            title={t('owner.dashboard.weekBookings')}
            value={weekTotal}
            icon="stats-chart-outline"
            iconBg={colors.purpleLight}
            iconColor={colors.purple}
          />
          <View style={styles.statGap} />
          <StatCard
            title={t('owner.dashboard.weekRevenue')}
            value={formatCurrency(weekRevenue)}
            icon="trending-up-outline"
            iconBg={colors.accentLight}
            iconColor={colors.accent}
          />
        </View>

        {/* Upcoming appointments */}
        <Text style={styles.sectionTitle}>{t('owner.dashboard.upcomingToday')}</Text>
        <View style={styles.scheduleCard}>
          <DaySchedule
            appointments={dashboard.upcoming_appointments || []}
            language={language}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: {
    backgroundColor: colors.navy,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  heroLabel: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    color: colors.white,
    textAlign: 'auto',
  },
  heroSalon: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
    textAlign: 'auto',
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingBanner: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  upcomingIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingInfo: { flex: 1 },
  upcomingLabel: {
    fontSize: 12,
    fontFamily: 'Outfit-Medium',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  upcomingCount: {
    fontSize: 32,
    fontFamily: 'Outfit-Bold',
    color: colors.white,
    marginTop: 2,
  },
  scroll: { padding: 16 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Outfit-SemiBold',
    color: colors.grayDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 4,
    textAlign: 'auto',
  },
  statsRow: { flexDirection: 'row', marginBottom: 20 },
  statGap: { width: 12 },
  scheduleCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 24,
  },
});
