import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  RefreshControl,
  Animated as RNAnimated,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { AppText } from '../../components/ui/AppText';
import { useDebounce } from '../../hooks/useDebounce';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocation } from '../../hooks/useLocation';
import { salonsApi } from '../../api/salons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import {
  PressablePremium,
  PremiumSalonCard,
  PremiumSalonCardSalon,
  NoResultsIllustration,
} from '../../components/premium';
import { useIsRTL } from '../../i18n/useIsRTL';
import type { ClientHomeScreenProps } from '../../types/navigation';

interface Filters {
  maxDistanceKm: number | null;
  minRating: number | null;
  openNow: boolean;
}

const DEFAULT_FILTERS: Filters = { maxDistanceKm: null, minRating: null, openNow: false };

// Module-level recent searches — kept simple for now. Session-scoped is fine.
const recentSearchesStore: string[] = [];
function pushRecent(q: string) {
  const trimmed = q.trim();
  if (!trimmed) return;
  const idx = recentSearchesStore.indexOf(trimmed);
  if (idx >= 0) recentSearchesStore.splice(idx, 1);
  recentSearchesStore.unshift(trimmed);
  if (recentSearchesStore.length > 6) recentSearchesStore.length = 6;
}

const POPULAR_CHIPS = ['Tevragh Zeina', 'Beard trim', 'Kids cut', 'Open now', 'Top rated'];

export function SearchScreen({ navigation }: ClientHomeScreenProps<'Search'>) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const rtl = useIsRTL();
  const { latitude, longitude } = useLocation();
  const inputRef = useRef<TextInput>(null);
  const filterSheetRef = useRef<BottomSheetModal>(null);

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [recents, setRecents] = useState<string[]>([...recentSearchesStore]);
  const debouncedQuery = useDebounce(query, 350);

  const scrollY = useRef(new RNAnimated.Value(0)).current;
  const headerShadow = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [0, 0.08],
    extrapolate: 'clamp',
  });

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ['salons', 'search', debouncedQuery, filters, latitude, longitude],
    queryFn: () =>
      salonsApi.search({
        q: debouncedQuery || undefined,
        ...(latitude != null && longitude != null
          ? { lat: latitude, lng: longitude, with_distance: true, radius_km: filters.maxDistanceKm ?? undefined }
          : {}),
        per_page: 30,
      }),
  });

  const salons: PremiumSalonCardSalon[] = useMemo(() => {
    let list = data?.data?.salons || data?.data || [];
    if (filters.minRating != null) list = list.filter((s: PremiumSalonCardSalon) => (s.avg_rating ?? 0) >= filters.minRating!);
    return list;
  }, [data, filters.minRating]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSubmit = useCallback(() => {
    pushRecent(query);
    setRecents([...recentSearchesStore]);
  }, [query]);

  const clearFilters = () => setFilters(DEFAULT_FILTERS);
  const filterCount =
    (filters.maxDistanceKm != null ? 1 : 0) +
    (filters.minRating != null ? 1 : 0) +
    (filters.openNow ? 1 : 0);

  const showSuggestions = query.length === 0 && salons.length > 0;

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.4}
      />
    ),
    [],
  );

  return (
    <View style={styles.root}>
      {/* Sticky blurred header */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <RNAnimated.View
          style={[
            styles.headerInner,
            { shadowOpacity: headerShadow as unknown as number },
          ]}
        >
          <BlurView
            intensity={Platform.OS === 'ios' ? 60 : 90}
            tint="light"
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={6}
              style={styles.headerBack}
            >
              <Ionicons
                name={rtl ? 'chevron-forward' : 'chevron-back'}
                size={22}
                color={colors.ink}
              />
            </Pressable>

            <View style={styles.searchPill}>
              <Ionicons name="search-outline" size={16} color={colors.slate} />
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSubmit}
                placeholder={t('search.placeholder')}
                placeholderTextColor={colors.slateSoft}
                returnKeyType="search"
                style={styles.searchInput}
                autoFocus
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={6}>
                  <Ionicons name="close-circle" size={16} color={colors.slateSoft} />
                </Pressable>
              )}
            </View>

            <PressablePremium
              onPress={() => filterSheetRef.current?.present()}
              pressScale={0.94}
              haptic="selection"
              style={styles.filterBtn}
            >
              <Ionicons name="options-outline" size={20} color={colors.ink} />
              {filterCount > 0 && <View style={styles.filterDot} />}
            </PressablePremium>
          </View>
        </RNAnimated.View>
      </SafeAreaView>

      <RNAnimated.FlatList
        data={salons}
        keyExtractor={(item: PremiumSalonCardSalon) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={RNAnimated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
            progressViewOffset={100}
          />
        }
        ListHeaderComponent={
          <View style={styles.suggestionsHeader}>
            {/* Recent searches */}
            {recents.length > 0 && (
              <View style={styles.chipBlock}>
                <AppText style={styles.chipLabel}>{t('search.recentSearches')}</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {recents.map((r) => (
                      <PressablePremium
                        key={r}
                        onPress={() => setQuery(r)}
                        haptic="selection"
                        pressScale={0.96}
                        style={styles.chip}
                      >
                        <Ionicons name="time-outline" size={12} color={colors.slate} />
                        <AppText style={styles.chipText}>{r}</AppText>
                      </PressablePremium>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Popular chips */}
            {showSuggestions && (
              <View style={styles.chipBlock}>
                <AppText style={styles.chipLabel}>{t('search.popularNearby')}</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {POPULAR_CHIPS.map((p) => (
                      <PressablePremium
                        key={p}
                        onPress={() => setQuery(p)}
                        haptic="selection"
                        pressScale={0.96}
                        style={[styles.chip, styles.chipAccent]}
                      >
                        <AppText style={[styles.chipText, styles.chipTextAccent]}>{p}</AppText>
                      </PressablePremium>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {query.length > 0 && (
              <View style={styles.resultsHeader}>
                <AppText style={styles.resultsCount}>
                  {t('search.resultCount', { count: salons.length })}
                </AppText>
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(280)}>
            <PremiumSalonCard
              salon={item}
              language={language}
              variant="compact"
              onPress={() => navigation.navigate('SalonDetail', { salonId: item.id })}
            />
          </Animated.View>
        )}
        ListEmptyComponent={
          isFetching ? null : (
            <View style={styles.emptyWrap}>
              <NoResultsIllustration size={140} color={colors.accent} />
              <AppText style={styles.emptyTitle}>{t('search.noResults')}</AppText>
              <AppText style={styles.emptyHint}>{t('search.noResultsHint')}</AppText>
              {(filterCount > 0 || query.length > 0) && (
                <PressablePremium
                  onPress={() => {
                    clearFilters();
                    setQuery('');
                  }}
                  pressScale={0.96}
                  haptic="selection"
                  style={styles.emptyCta}
                >
                  <AppText style={styles.emptyCtaText}>{t('search.adjustFilters')}</AppText>
                </PressablePremium>
              )}
            </View>
          )
        }
      />

      {isError && (
        <View style={styles.errorBanner}>
          <AppText style={styles.errorText}>{t('common.error')}</AppText>
        </View>
      )}

      {/* Filter bottom sheet */}
      <BottomSheetModal
        ref={filterSheetRef}
        snapPoints={['60%']}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: colors.hairline }}
        backgroundStyle={{ backgroundColor: colors.surface }}
      >
        <BottomSheetView style={styles.filterSheet}>
          <View style={styles.filterHead}>
            <AppText style={styles.filterTitle}>{t('search.filters')}</AppText>
            <Pressable onPress={clearFilters} hitSlop={6}>
              <AppText style={styles.filterReset}>{t('search.reset')}</AppText>
            </Pressable>
          </View>

          <FilterSection label={t('search.distance')}>
            <View style={styles.optionRow}>
              {[2, 5, 10, 25].map((km) => (
                <PressablePremium
                  key={km}
                  haptic="selection"
                  pressScale={0.96}
                  onPress={() =>
                    setFilters((f) => ({ ...f, maxDistanceKm: f.maxDistanceKm === km ? null : km }))
                  }
                  style={[
                    styles.optionChip,
                    filters.maxDistanceKm === km && styles.optionChipActive,
                  ]}
                >
                  <AppText
                    style={[
                      styles.optionChipText,
                      filters.maxDistanceKm === km && styles.optionChipTextActive,
                    ]}
                  >
                    {km} km
                  </AppText>
                </PressablePremium>
              ))}
            </View>
          </FilterSection>

          <FilterSection label={t('search.minRating')}>
            <View style={styles.optionRow}>
              {[3.5, 4, 4.5].map((r) => (
                <PressablePremium
                  key={r}
                  haptic="selection"
                  pressScale={0.96}
                  onPress={() => setFilters((f) => ({ ...f, minRating: f.minRating === r ? null : r }))}
                  style={[styles.optionChip, filters.minRating === r && styles.optionChipActive]}
                >
                  <Ionicons name="star" size={11} color={filters.minRating === r ? colors.surface : colors.star} />
                  <AppText
                    style={[
                      styles.optionChipText,
                      filters.minRating === r && styles.optionChipTextActive,
                    ]}
                  >
                    {r.toFixed(1)}+
                  </AppText>
                </PressablePremium>
              ))}
            </View>
          </FilterSection>

          <Pressable
            onPress={() => setFilters((f) => ({ ...f, openNow: !f.openNow }))}
            style={styles.toggleRow}
          >
            <View style={{ flex: 1 }}>
              <AppText style={styles.toggleLabel}>{t('search.openNow')}</AppText>
              <AppText style={styles.toggleHint}>{t('search.openNowHint')}</AppText>
            </View>
            <View style={[styles.toggle, filters.openNow && styles.toggleActive]}>
              <View style={[styles.toggleKnob, filters.openNow && styles.toggleKnobActive]} />
            </View>
          </Pressable>

          <PressablePremium
            onPress={() => filterSheetRef.current?.dismiss()}
            pressScale={0.97}
            haptic="medium"
            style={styles.applyBtn}
          >
            <AppText style={styles.applyBtnText}>
              {t('search.applyFilters', { count: salons.length })}
            </AppText>
          </PressablePremium>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.filterSection}>
      <AppText style={styles.filterSectionLabel}>{label}</AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },

  headerSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerInner: {
    overflow: 'hidden',
    paddingBottom: 10,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingTop: 6,
  },
  headerBack: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.ink,
    paddingVertical: 0,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },

  list: {
    paddingTop: 110,
    paddingBottom: 40,
  },
  suggestionsHeader: {
    paddingTop: 4,
  },
  chipBlock: {
    paddingTop: 16,
    paddingBottom: 4,
  },
  chipLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.slate,
    paddingHorizontal: spacing.section,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.section,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  chipAccent: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentSoft,
  },
  chipText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 12,
    color: colors.ink,
  },
  chipTextAccent: {
    color: colors.accentInk,
  },
  resultsHeader: {
    paddingHorizontal: spacing.section,
    paddingTop: 18,
    paddingBottom: 8,
  },
  resultsCount: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.slate,
  },

  emptyWrap: {
    alignItems: 'center',
    paddingTop: 36,
    paddingHorizontal: spacing.section,
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    lineHeight: 24,
    color: colors.ink,
    marginTop: 18,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.slate,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyCta: {
    marginTop: 18,
    backgroundColor: colors.ink,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
  },
  emptyCtaText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    color: colors.surface,
  },

  errorBanner: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: colors.danger,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  errorText: {
    color: colors.surface,
    fontFamily: 'Outfit-SemiBold',
  },

  /* Filter sheet */
  filterSheet: {
    flex: 1,
    paddingHorizontal: spacing.section,
    paddingTop: 8,
  },
  filterHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  filterReset: {
    fontFamily: 'Outfit-Medium',
    fontSize: 13,
    color: colors.accent,
  },
  filterSection: {
    marginVertical: 10,
  },
  filterSectionLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.slate,
    marginBottom: 10,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  optionChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  optionChipText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 13,
    color: colors.ink,
  },
  optionChipTextActive: {
    color: colors.surface,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    marginTop: 4,
  },
  toggleLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    color: colors.ink,
  },
  toggleHint: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.slate,
    marginTop: 2,
  },
  toggle: {
    width: 46,
    height: 28,
    borderRadius: 999,
    backgroundColor: colors.hairline,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: { backgroundColor: colors.accent },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  toggleKnobActive: { alignSelf: 'flex-end' },
  applyBtn: {
    marginTop: 20,
    backgroundColor: colors.ink,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  applyBtnText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    color: colors.surface,
    letterSpacing: 0.3,
  },
});
