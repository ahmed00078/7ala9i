import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { AppText } from '../../components/ui/AppText';
import { useLanguage } from '../../contexts/LanguageContext';
import { ownerApi } from '../../api/owner';
import { ErrorState } from '../../components/ui/ErrorState';
import { formatCurrency } from '../../utils/formatters';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';

import {
  Surface,
  Stat,
  Skeleton,
  Segment,
  PressablePremium,
} from '../../components/premium';
import { EmptyBookingsIllustration } from '../../components/premium/illustrations';

type Period = 'today' | 'week' | 'month';

type EarningsPayload = {
  period: { label: string; from: string; to: string };
  previous_period: { from: string; to: string };
  revenue: number;
  revenue_previous: number;
  delta_percent: number | null;
  bookings_count: number;
  completed_count: number;
  completed_revenue: number;
  avg_ticket: number;
  completion_rate: number;
  by_payment_method: { cash: number; mobile: number; unset: number };
  top_services: {
    id: string;
    name: string;
    name_ar: string | null;
    count: number;
    revenue: number;
  }[];
  no_show_impact: { count: number; revenue_lost: number };
  cancellation_impact: { count: number; revenue_lost: number };
};

const PAYMENT_TINTS: Record<string, string> = {
  cash: colors.accent,
  mobile: '#1F5A85',
  unset: colors.slateSoft,
};

const PAYMENT_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  cash: 'cash-outline',
  mobile: 'phone-portrait-outline',
  unset: 'help-circle-outline',
};

export function EarningsScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigation = useNavigation<any>();
  const [period, setPeriod] = useState<Period>('week');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['owner', 'earnings', period],
    queryFn: () => ownerApi.getEarnings({ period }).then((r) => r.data as EarningsPayload),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const periodOptions = useMemo(
    () => [
      { value: 'today' as Period, label: t('owner.earnings.period.today') },
      { value: 'week' as Period, label: t('owner.earnings.period.week') },
      { value: 'month' as Period, label: t('owner.earnings.period.month') },
    ],
    [t],
  );

  if (isError) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header onBack={() => navigation.goBack()} title={t('owner.earnings.title')} />
        <ErrorState onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const hasData = (data?.bookings_count ?? 0) > 0;
  const totalPaid =
    (data?.by_payment_method?.cash ?? 0) +
    (data?.by_payment_method?.mobile ?? 0) +
    (data?.by_payment_method?.unset ?? 0);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <Header onBack={() => navigation.goBack()} title={t('owner.earnings.title')} />
      </SafeAreaView>

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
        {/* ── Period segment ─────────────────────────────────────────── */}
        <View style={styles.segmentWrap}>
          <Segment options={periodOptions} value={period} onChange={setPeriod} />
        </View>

        {/* ── Hero revenue ───────────────────────────────────────────── */}
        <Surface variant="raised" style={styles.hero} padding={22}>
          {isLoading ? (
            <Skeleton.Group>
              <Skeleton.Block width="50%" height={44} />
              <Skeleton.Block width="30%" height={14} />
            </Skeleton.Group>
          ) : data ? (
            <>
              <Stat.Headline
                value={data.revenue}
                label={t('owner.earnings.totalRevenue')}
                unit=" MRU"
              />
              <View style={styles.heroFoot}>
                <PeriodLabel from={data.period.from} to={data.period.to} language={language} />
                <DeltaPill deltaPercent={data.delta_percent} />
              </View>
            </>
          ) : null}
        </Surface>

        {/* ── Quick stats trio ───────────────────────────────────────── */}
        <Surface variant="raised" style={styles.statsCard} padding={0}>
          {isLoading ? (
            <View style={{ padding: 16, gap: 14 }}>
              <Skeleton.Block height={20} />
              <Skeleton.Block height={20} />
              <Skeleton.Block height={20} />
            </View>
          ) : data ? (
            <View style={styles.statsPadding}>
              <Stat.Inline
                value={data.bookings_count}
                label={t('owner.earnings.bookings')}
              />
              <Stat.Inline
                value={data.avg_ticket}
                unit=" MRU"
                label={t('owner.earnings.avgTicket')}
              />
              <Stat.Inline
                value={Math.round(data.completion_rate * 100)}
                unit="%"
                label={t('owner.earnings.completionRate')}
                divider={false}
              />
            </View>
          ) : null}
        </Surface>

        {/* ── Payment method breakdown ───────────────────────────────── */}
        {!isLoading && data && totalPaid > 0 && (
          <View style={styles.section}>
            <AppText style={[typography.capsLabel, styles.sectionLabel]}>
              {t('owner.earnings.byPaymentMethod')}
            </AppText>

            <Surface variant="raised" style={styles.paymentCard} padding={18}>
              <View style={styles.bar}>
                {(['cash', 'mobile', 'unset'] as const).map((key, idx) => {
                  const value = data.by_payment_method[key];
                  if (value <= 0) return null;
                  const flex = value / totalPaid;
                  return (
                    <View
                      key={key}
                      style={[
                        styles.barSegment,
                        {
                          flex,
                          backgroundColor: PAYMENT_TINTS[key],
                          marginLeft: idx === 0 ? 0 : 1,
                        },
                      ]}
                    />
                  );
                })}
              </View>

              <View style={styles.paymentRows}>
                {(['cash', 'mobile', 'unset'] as const).map((key, idx) => {
                  const value = data.by_payment_method[key];
                  const pct = totalPaid > 0 ? Math.round((value / totalPaid) * 100) : 0;
                  const isLast = key === 'unset' || idx === 2;
                  return (
                    <View
                      key={key}
                      style={[styles.paymentRow, !isLast && styles.paymentRowDivider]}
                    >
                      <View style={[styles.paymentDot, { backgroundColor: PAYMENT_TINTS[key] }]} />
                      <Ionicons
                        name={PAYMENT_ICONS[key]}
                        size={15}
                        color={PAYMENT_TINTS[key]}
                      />
                      <AppText style={[typography.bodyMedium, styles.paymentLabel]}>
                        {t(`owner.payment.${key}`)}
                      </AppText>
                      <AppText style={[typography.bodyMedium, styles.paymentValue]}>
                        {formatCurrency(value)}
                      </AppText>
                      <AppText style={[typography.caption, styles.paymentPct]}>
                        {pct}%
                      </AppText>
                    </View>
                  );
                })}
              </View>
            </Surface>
          </View>
        )}

        {/* ── Top services ───────────────────────────────────────────── */}
        {!isLoading && data && data.top_services.length > 0 && (
          <View style={styles.section}>
            <AppText style={[typography.capsLabel, styles.sectionLabel]}>
              {t('owner.earnings.topServices')}
            </AppText>

            <Surface variant="raised" style={styles.servicesCard} padding={0}>
              {data.top_services.map((s, idx) => {
                const label = language === 'ar' && s.name_ar ? s.name_ar : s.name;
                const isLast = idx === data.top_services.length - 1;
                return (
                  <View
                    key={s.id}
                    style={[styles.serviceRow, !isLast && styles.serviceRowDivider]}
                  >
                    <View style={styles.serviceRank}>
                      <AppText style={[typography.capsLabel, styles.serviceRankText]}>
                        {idx + 1}
                      </AppText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={[typography.bodyMedium, styles.serviceName]} numberOfLines={1}>
                        {label}
                      </AppText>
                      <AppText style={[typography.caption, styles.serviceCount]}>
                        {t('owner.earnings.bookingsCount', { count: s.count })}
                      </AppText>
                    </View>
                    <AppText style={[typography.bodyMedium, styles.serviceRevenue]}>
                      {formatCurrency(s.revenue)}
                    </AppText>
                  </View>
                );
              })}
            </Surface>
          </View>
        )}

        {/* ── Impact (no-show + cancel) ──────────────────────────────── */}
        {!isLoading && data && (data.no_show_impact.count > 0 || data.cancellation_impact.count > 0) && (
          <View style={styles.section}>
            <AppText style={[typography.capsLabel, styles.sectionLabel]}>
              {t('owner.earnings.impact')}
            </AppText>
            <View style={styles.impactCard}>
              {data.no_show_impact.count > 0 && (
                <ImpactRow
                  icon="alert-circle-outline"
                  tint={colors.warn}
                  label={t('owner.earnings.noShowImpact', { count: data.no_show_impact.count })}
                  amount={data.no_show_impact.revenue_lost}
                  divider={data.cancellation_impact.count > 0}
                />
              )}
              {data.cancellation_impact.count > 0 && (
                <ImpactRow
                  icon="close-circle-outline"
                  tint={colors.danger}
                  label={t('owner.earnings.cancellationImpact', {
                    count: data.cancellation_impact.count,
                  })}
                  amount={data.cancellation_impact.revenue_lost}
                  divider={false}
                />
              )}
            </View>
          </View>
        )}

        {/* ── Empty state ────────────────────────────────────────────── */}
        {!isLoading && data && !hasData && (
          <View style={styles.emptyBox}>
            <EmptyBookingsIllustration size={140} />
            <AppText style={[typography.title, styles.emptyTitle]}>
              {t('owner.earnings.emptyTitle')}
            </AppText>
            <AppText style={[typography.bodySmall, styles.emptySubtitle]}>
              {t('owner.earnings.emptySubtitle')}
            </AppText>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ── Sub-components ────────────────────────────────────────────────── */

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={styles.header}>
      <PressablePremium
        haptic="selection"
        pressScale={0.94}
        onPress={onBack}
        style={styles.headerBack}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={22} color={colors.ink} />
      </PressablePremium>
      <AppText style={[typography.header, styles.headerTitle]}>{title}</AppText>
      <View style={{ width: 40 }} />
    </View>
  );
}

function DeltaPill({ deltaPercent }: { deltaPercent: number | null }) {
  const { t } = useTranslation();
  if (deltaPercent == null) {
    return (
      <View style={[styles.deltaPill, styles.deltaPillNeutral]}>
        <AppText style={[typography.caption, styles.deltaPillTextNeutral]}>
          {t('owner.earnings.noComparison')}
        </AppText>
      </View>
    );
  }
  const isUp = deltaPercent >= 0;
  return (
    <View
      style={[
        styles.deltaPill,
        isUp ? styles.deltaPillUp : styles.deltaPillDown,
      ]}
    >
      <Ionicons
        name={isUp ? 'trending-up' : 'trending-down'}
        size={12}
        color={isUp ? colors.ok : colors.danger}
      />
      <AppText
        style={[
          typography.caption,
          isUp ? styles.deltaPillTextUp : styles.deltaPillTextDown,
        ]}
      >
        {`${isUp ? '+' : ''}${deltaPercent}%`}
      </AppText>
    </View>
  );
}

function PeriodLabel({ from, to, language }: { from: string; to: string; language: string }) {
  const { t } = useTranslation();
  const label = useMemo(() => {
    if (from === to) return formatLocalDate(from, language);
    return `${formatLocalDate(from, language)} → ${formatLocalDate(to, language)}`;
  }, [from, to, language]);
  return (
    <AppText style={[typography.caption, styles.periodLabel]}>
      {label}
    </AppText>
  );
}

function ImpactRow({
  icon,
  tint,
  label,
  amount,
  divider,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tint: string;
  label: string;
  amount: number;
  divider: boolean;
}) {
  return (
    <View style={[styles.impactRow, divider && styles.impactRowDivider]}>
      <View style={[styles.impactIcon, { backgroundColor: `${tint}1A` }]}>
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <AppText style={[typography.bodySmall, styles.impactLabel]} numberOfLines={2}>
        {label}
      </AppText>
      <AppText style={[typography.bodyMedium, styles.impactAmount, { color: tint }]}>
        -{formatCurrency(amount)}
      </AppText>
    </View>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────── */

const DATE_LOCALES: Record<string, string> = {
  fr: 'fr-FR',
  ar: 'ar-u-nu-latn',
  en: 'en-US',
};

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatLocalDate(dateStr: string, language: string): string {
  try {
    const date = parseLocalDate(dateStr);
    const locale = DATE_LOCALES[language] || 'en-US';
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date);
  } catch {
    return dateStr;
  }
}

/* ── Styles ────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 4,
    paddingBottom: 12,
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.ink,
  },
  scroll: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 80,
  },

  segmentWrap: {
    marginBottom: 18,
  },

  /* ── Hero ── */
  hero: {
    marginBottom: 14,
  },
  heroFoot: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  periodLabel: {
    color: colors.slate,
    flex: 1,
    fontVariant: ['tabular-nums'],
  },

  /* ── Delta pill ── */
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  deltaPillUp: {
    backgroundColor: `${colors.ok}1A`,
  },
  deltaPillDown: {
    backgroundColor: `${colors.danger}1A`,
  },
  deltaPillNeutral: {
    backgroundColor: colors.surfaceAlt,
  },
  deltaPillTextUp: {
    color: colors.ok,
    fontFamily: 'Outfit-SemiBold',
    fontVariant: ['tabular-nums'],
  },
  deltaPillTextDown: {
    color: colors.danger,
    fontFamily: 'Outfit-SemiBold',
    fontVariant: ['tabular-nums'],
  },
  deltaPillTextNeutral: {
    color: colors.slate,
    fontFamily: 'Outfit-SemiBold',
  },

  /* ── Stat trio ── */
  statsCard: {
    marginBottom: spacing.section,
  },
  statsPadding: {
    paddingHorizontal: 18,
    paddingVertical: 4,
  },

  /* ── Section chrome ── */
  section: {
    marginBottom: spacing.section,
  },
  sectionLabel: {
    color: colors.slate,
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  /* ── Payment breakdown ── */
  paymentCard: {},
  bar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    marginBottom: 14,
  },
  barSegment: {
    height: '100%',
  },
  paymentRows: {},
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  paymentRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  paymentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  paymentLabel: {
    color: colors.ink,
    flex: 1,
  },
  paymentValue: {
    color: colors.ink,
    fontFamily: 'Outfit-SemiBold',
    fontVariant: ['tabular-nums'],
  },
  paymentPct: {
    color: colors.slate,
    fontFamily: 'Outfit-SemiBold',
    fontVariant: ['tabular-nums'],
    width: 36,
    textAlign: 'right',
  },

  /* ── Top services ── */
  servicesCard: {
    overflow: 'hidden',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  serviceRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  serviceRank: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceRankText: {
    color: colors.slate,
    fontSize: 11,
  },
  serviceName: {
    color: colors.ink,
    fontFamily: 'Outfit-SemiBold',
  },
  serviceCount: {
    color: colors.slate,
    marginTop: 2,
  },
  serviceRevenue: {
    color: colors.accent,
    fontFamily: 'Outfit-SemiBold',
    fontVariant: ['tabular-nums'],
  },

  /* ── Impact ── */
  impactCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  impactRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  impactIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  impactLabel: {
    color: colors.slate,
    flex: 1,
  },
  impactAmount: {
    fontFamily: 'Outfit-SemiBold',
    fontVariant: ['tabular-nums'],
  },

  /* ── Empty ── */
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 18,
    marginTop: 8,
  },
  emptySubtitle: {
    color: colors.slate,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 20,
  },
});
