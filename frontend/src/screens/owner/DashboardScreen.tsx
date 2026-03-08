import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
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

  const { data, isLoading, error } = useQuery({
    queryKey: ['owner', 'dashboard'],
    queryFn: () => ownerApi.getDashboard(),
  });

  if (isLoading) return <LoadingScreen />;

  const dashboard = data?.data;
  if (!dashboard) return null;

  const todayTotal = dashboard.today?.total_bookings ?? 0;
  const todayRevenue = dashboard.today?.revenue_expected ?? 0;
  const weekTotal = dashboard.week?.total ?? 0;
  const weekRevenue = dashboard.week?.revenue ?? 0;
  const upcomingCount = dashboard.upcoming_count ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{t('owner.dashboard.title')}</Text>
        <Text style={styles.salonName}>{dashboard.salon_name}</Text>

        {/* Upcoming highlight */}
        <View style={styles.upcomingBanner}>
          <Text style={styles.upcomingCount}>{upcomingCount}</Text>
          <Text style={styles.upcomingLabel}>{t('owner.dashboard.upcomingBookings')}</Text>
        </View>

        {/* Today stats */}
        <Text style={styles.sectionTitle}>{t('owner.dashboard.todayTitle')}</Text>
        <View style={styles.statsRow}>
          <StatCard
            title={t('owner.dashboard.todayBookings')}
            value={todayTotal}
            accent={todayTotal > 0}
          />
          <View style={styles.statGap} />
          <StatCard
            title={t('owner.dashboard.todayRevenue')}
            value={formatCurrency(todayRevenue)}
          />
        </View>

        {/* Week stats */}
        <Text style={styles.sectionTitle}>{t('owner.dashboard.weekTitle')}</Text>
        <View style={styles.statsRow}>
          <StatCard
            title={t('owner.dashboard.weekBookings')}
            value={weekTotal}
          />
          <View style={styles.statGap} />
          <StatCard
            title={t('owner.dashboard.weekRevenue')}
            value={formatCurrency(weekRevenue)}
          />
        </View>

        {/* Upcoming appointments */}
        <Text style={styles.sectionTitle}>{t('owner.dashboard.upcomingToday')}</Text>
        <DaySchedule
          appointments={dashboard.upcoming_appointments || []}
          language={language}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16 },
  title: { fontSize: 22, fontFamily: 'Outfit-Bold', color: colors.black, textAlign: 'auto' },
  salonName: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.grayDark, marginBottom: 20, textAlign: 'auto' },
  upcomingBanner: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upcomingCount: { fontSize: 48, fontFamily: 'Outfit-Bold', color: colors.white },
  upcomingLabel: { fontSize: 14, fontFamily: 'Outfit-Medium', color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  sectionTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.grayDark, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, textAlign: 'auto' },
  statsRow: { flexDirection: 'row', marginBottom: 24 },
  statGap: { width: 12 },
});
