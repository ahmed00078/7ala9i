import React, { useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  FlatList,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AppText } from '../../components/ui/AppText';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocation } from '../../hooks/useLocation';
import { salonsApi } from '../../api/salons';
import { bookingsApi } from '../../api/bookings';
import { ErrorState } from '../../components/ui/ErrorState';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  PressablePremium,
  PremiumNotificationBell,
  PremiumSalonCard,
  PremiumSalonCardSalon,
  Avatar,
  Skeleton,
} from '../../components/premium';
import { formatCurrency } from '../../utils/formatters';
import type { ClientHomeScreenProps } from '../../types/navigation';

const HERO_W = 280;

export function HomeScreen({ navigation }: ClientHomeScreenProps<'Home'>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { latitude, longitude } = useLocation();

  const { data: recommendedRaw, isLoading: recommendedLoading, isError, refetch } = useQuery({
    queryKey: ['salons', 'recommended', latitude, longitude],
    queryFn: () =>
      salonsApi.search({
        per_page: 6,
        ...(latitude != null && longitude != null
          ? { lat: latitude, lng: longitude, with_distance: true }
          : {}),
      }),
  });

  const { data: popularRaw } = useQuery({
    queryKey: ['salons', 'popular'],
    queryFn: () => salonsApi.search({ per_page: 6, sort: 'popular' }),
  });

  // History feeds the "Recently booked" avatar row.
  const { data: bookingsData } = useQuery({
    queryKey: ['bookings', 'history'],
    queryFn: () => bookingsApi.getMyBookings(),
  });

  // Soonest confirmed booking from today onward — the actual "next appointment".
  const { data: upcomingData } = useQuery({
    queryKey: ['bookings', 'upcoming'],
    queryFn: () => bookingsApi.getMyBookings({ status: 'upcoming' }),
  });

  const recommended: PremiumSalonCardSalon[] = useMemo(
    () => recommendedRaw?.data?.salons || recommendedRaw?.data || [],
    [recommendedRaw],
  );
  const popular: PremiumSalonCardSalon[] = useMemo(
    () => popularRaw?.data?.salons || popularRaw?.data || [],
    [popularRaw],
  );

  // Recently booked — unique salons from recent bookings.
  const recentSalons = useMemo(() => {
    const bookings = bookingsData?.data || [];
    const seen = new Set<string>();
    const items: Array<{ salonId: string; salonName: string; coverUrl?: string }> = [];
    for (const b of bookings) {
      const id = b.salon_id ?? b.salon?.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      items.push({
        salonId: id,
        salonName: b.salon?.name ?? b.salon_name ?? '',
        coverUrl: b.salon?.cover_photo_url ?? null,
      });
      if (items.length >= 8) break;
    }
    return items;
  }, [bookingsData]);

  // Backend `status=upcoming` already filters to confirmed + booking_date >= today
  // and sorts ASC by date+time, so the first row is the soonest one.
  const upcoming = (upcomingData?.data || [])[0];

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return t('home.greetingMorning');
    if (h < 18) return t('home.greetingAfternoon');
    return t('home.greetingEvening');
  }, [t]);

  if (recommendedLoading) return <HomeSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
            progressViewOffset={100}
          />
        }
      >
        <SafeAreaView edges={['top']}>
          {/* Greeting */}
          <View style={styles.greetRow}>
            <View style={{ flex: 1 }}>
              <AppText style={styles.greetSmall}>{greeting}</AppText>
              <AppText style={styles.greetName} numberOfLines={1}>
                {user?.first_name || t('home.guest')}
              </AppText>
              <AppText style={styles.tagline}>{t('home.tagline')}</AppText>
            </View>
            <PremiumNotificationBell
              iconColor={colors.ink}
              surfaceColor={colors.surfaceAlt}
            />
          </View>

          {/* Location chip */}
          <Pressable
            onPress={() => navigation.navigate('MapSearch')}
            hitSlop={4}
            style={styles.locationChip}
          >
            <Ionicons name="location-outline" size={14} color={colors.accent} />
            <AppText style={styles.locationText} numberOfLines={1}>
              {t('home.location', { city: t('home.cityNouakchott') })}
            </AppText>
            <Ionicons name="chevron-down" size={14} color={colors.slateSoft} />
          </Pressable>
        </SafeAreaView>

        {/* Spacer for blurred sticky search header */}
        <View style={{ height: 12 }} />

        {/* Recommended */}
        <Section
          title={t('home.recommended')}
          actionLabel={t('common.seeAll')}
          onAction={() => navigation.navigate('Search', {})}
        >
          {recommended.length > 0 ? (
            <FlatList
              data={recommended}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={HERO_W + 12}
              decelerationRate="fast"
              contentContainerStyle={styles.carouselContent}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              renderItem={({ item, index }) => (
                <Animated.View entering={FadeIn.delay(60 * index).duration(280)}>
                  <PremiumSalonCard
                    salon={item}
                    language={language}
                    variant="hero"
                    width={HERO_W}
                    height={320}
                    onPress={() => navigation.navigate('SalonDetail', { salonId: item.id })}
                  />
                </Animated.View>
              )}
            />
          ) : (
            <EmptyHint label={t('home.noSalonsHint')} />
          )}
        </Section>

        {/* Upcoming */}
        {upcoming && (
          <Section title={t('home.upcomingTitle')}>
            <UpcomingCard
              booking={upcoming}
              onPress={() => navigation.navigate('SalonDetail', { salonId: upcoming.salon_id ?? upcoming.salon?.id })}
              language={language}
            />
          </Section>
        )}

        {/* Recently booked */}
        {recentSalons.length > 0 && (
          <Section title={t('home.recentlyBooked')} subtitle={t('home.tapToRebook')}>
            <FlatList
              data={recentSalons}
              keyExtractor={(item) => item.salonId}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.avatarRowContent}
              ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
              renderItem={({ item }) => (
                <PressablePremium
                  haptic="selection"
                  pressScale={0.94}
                  onPress={() => navigation.navigate('SalonDetail', { salonId: item.salonId })}
                  style={styles.avatarItem}
                  accessibilityRole="button"
                  accessibilityLabel={item.salonName}
                >
                  <Avatar
                    name={item.salonName}
                    uri={item.coverUrl ?? undefined}
                    size={56}
                  />
                  <AppText style={styles.avatarLabel} numberOfLines={1}>{item.salonName}</AppText>
                </PressablePremium>
              )}
            />
          </Section>
        )}

        {/* Popular */}
        <Section
          title={t('home.popularThisWeek')}
          actionLabel={t('common.seeAll')}
          onAction={() => navigation.navigate('Search', {})}
        >
          <View style={styles.popularList}>
            {popular.slice(0, 4).map((s, i) => (
              <Animated.View key={s.id} entering={FadeIn.delay(60 * i).duration(280)}>
                <PremiumSalonCard
                  salon={s}
                  language={language}
                  variant="compact"
                  onPress={() => navigation.navigate('SalonDetail', { salonId: s.id })}
                />
              </Animated.View>
            ))}
          </View>
        </Section>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Blurred sticky search bar */}
      <View pointerEvents="box-none" style={styles.searchOverlay}>
        <SafeAreaView edges={['top']} pointerEvents="box-none">
          <View style={styles.searchInner}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 50 : 80}
              tint="light"
              style={[StyleSheet.absoluteFillObject, styles.searchBlur]}
            />
            <PressablePremium
              onPress={() => navigation.navigate('Search', {})}
              pressScale={0.98}
              haptic="selection"
              style={styles.searchPill}
            >
              <Ionicons name="search-outline" size={16} color={colors.slate} />
              <AppText style={styles.searchPlaceholder} numberOfLines={1}>
                {t('home.heroSearchPlaceholder')}
              </AppText>
              <View style={styles.searchSep} />
              <Pressable
                onPress={() => navigation.navigate('MapSearch')}
                hitSlop={6}
                style={styles.searchMapBtn}
              >
                <Ionicons name="map-outline" size={16} color={colors.accent} />
              </Pressable>
            </PressablePremium>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

function Section({
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={{ flex: 1 }}>
          <AppText style={styles.sectionTitle} numberOfLines={1}>{title}</AppText>
          {subtitle ? <AppText style={styles.sectionSub} numberOfLines={1}>{subtitle}</AppText> : null}
        </View>
        {actionLabel && onAction && (
          <Pressable onPress={onAction} hitSlop={6}>
            <AppText style={styles.sectionAction}>{actionLabel}</AppText>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

/**
 * Parses a `YYYY-MM-DD` date string as **local midnight** to avoid the
 * timezone shift that happens with `new Date("2026-06-20")` (which JS
 * parses as UTC midnight and can render the wrong weekday on devices
 * west of UTC).
 */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Force Latin digits + AR month names — the Arabic-Indic numerals that
// `'ar'` produces by default read foreign in Mauritania.
const DATE_LOCALES: Record<string, string> = {
  fr: 'fr-FR',
  ar: 'ar-u-nu-latn',
  en: 'en-US',
};

function UpcomingCard({ booking, onPress, language }: { booking: any; onPress: () => void; language: string }) {
  const displayName = language === 'ar' && booking.salon?.name_ar
    ? booking.salon.name_ar
    : booking.salon?.name || booking.salon_name || '';
  const date = booking.booking_date ? parseLocalDate(booking.booking_date) : null;
  const dateLabel = date
    ? date.toLocaleDateString(DATE_LOCALES[language] ?? DATE_LOCALES.en, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : '';

  return (
    <PressablePremium
      onPress={onPress}
      pressScale={0.98}
      haptic="selection"
      style={styles.upcomingCard}
      accessibilityRole="button"
      accessibilityLabel={`${displayName} ${dateLabel}`}
    >
      <View style={styles.upcomingIcon}>
        <Ionicons name="calendar-outline" size={20} color={colors.surface} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={styles.upcomingTitle} numberOfLines={1}>{displayName}</AppText>
        <AppText style={styles.upcomingMeta} numberOfLines={1}>
          {dateLabel}
          {booking.start_time && ` · ${String(booking.start_time).slice(0, 5)}`}
          {booking.service?.name && ` · ${booking.service.name}`}
        </AppText>
      </View>
      {booking.total_price != null ? (
        <View style={styles.upcomingPill}>
          <AppText style={styles.upcomingPillText} numberOfLines={1}>
            {formatCurrency(booking.total_price)}
          </AppText>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.55)" />
      )}
    </PressablePremium>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <View style={styles.emptyHint}>
      <AppText style={styles.emptyHintText}>{label}</AppText>
    </View>
  );
}

function HomeSkeleton() {
  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']}>
        <View style={styles.greetRow}>
          <Skeleton.Group gap={6} style={{ flex: 1 }}>
            <Skeleton.Block width={90} height={12} radius={4} />
            <Skeleton.Block width={170} height={26} radius={6} />
          </Skeleton.Group>
          <Skeleton.Block width={36} height={36} radius={18} />
        </View>
        <View style={{ paddingHorizontal: spacing.section, marginTop: 6 }}>
          <Skeleton.Block width={150} height={26} radius={999} />
        </View>
      </SafeAreaView>

      <View style={{ height: 12 }} />

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Skeleton.Block width={150} height={20} radius={6} />
        </View>
        <Skeleton.Row gap={12} style={{ paddingHorizontal: spacing.section }}>
          <Skeleton.Block width={HERO_W} height={320} radius={20} />
          <Skeleton.Block width={HERO_W} height={320} radius={20} />
        </Skeleton.Row>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Skeleton.Block width={180} height={20} radius={6} />
        </View>
        <Skeleton.Group gap={12} style={{ paddingHorizontal: spacing.section }}>
          <Skeleton.Block width="100%" height={88} radius={16} />
          <Skeleton.Block width="100%" height={88} radius={16} />
          <Skeleton.Block width="100%" height={88} radius={16} />
        </Skeleton.Group>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  greetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.section,
    paddingTop: 60,
    paddingBottom: 6,
    gap: 12,
  },
  greetSmall: {
    ...typography.bodySmall,
    color: colors.slateSoft,
  },
  greetName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 24,
    lineHeight: 30,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  tagline: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.slate,
    marginTop: 2,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginHorizontal: spacing.section,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
  },
  locationText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 12,
    color: colors.ink,
  },

  /* Sticky search */
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  searchInner: {
    paddingHorizontal: spacing.section,
    paddingTop: 6,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  searchBlur: {
    // top blur strip — only shows the small area behind the pill row
    height: '100%',
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  searchPlaceholder: {
    flex: 1,
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.slate,
  },
  searchSep: {
    width: StyleSheet.hairlineWidth,
    height: 18,
    backgroundColor: colors.hairline,
  },
  searchMapBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },

  /* Sections */
  section: {
    marginTop: 24,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.section,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    lineHeight: 24,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.slate,
    marginTop: 2,
  },
  sectionAction: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
    color: colors.accent,
  },

  /* Carousel */
  carouselContent: {
    paddingHorizontal: spacing.section,
  },

  /* Avatars */
  avatarRowContent: {
    paddingHorizontal: spacing.section,
  },
  avatarItem: {
    width: 72,
    alignItems: 'center',
    gap: 6,
  },
  avatarLabel: {
    fontFamily: 'Outfit-Medium',
    fontSize: 12,
    color: colors.slate,
    textAlign: 'center',
    maxWidth: 72,
  },

  /* Upcoming */
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: spacing.section,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.ink,
    borderRadius: 18,
  },
  upcomingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    color: colors.surface,
  },
  upcomingMeta: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  upcomingPill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  upcomingPillText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 12,
    color: colors.surface,
  },

  /* Popular list */
  popularList: {
    marginHorizontal: 0,
  },

  /* Empty hint */
  emptyHint: {
    marginHorizontal: spacing.section,
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyHintText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.slateSoft,
  },
});
