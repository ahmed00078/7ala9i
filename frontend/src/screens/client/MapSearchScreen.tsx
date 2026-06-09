import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Linking,
  Pressable,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeIn, FadeOut, FadeInDown } from 'react-native-reanimated';
import { AppText } from '../../components/ui/AppText';
import { salonsApi } from '../../api/salons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocation } from '../../hooks/useLocation';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { warmMapStyle } from '../../theme/mapStyle';
import {
  PremiumSalonCard,
  PremiumSalonCardSalon,
  PressablePremium,
  InkPin,
  NoResultsIllustration,
  Skeleton,
} from '../../components/premium';
import { useIsRTL } from '../../i18n/useIsRTL';
import type { ClientHomeScreenProps } from '../../types/navigation';

type NearbySalon = PremiumSalonCardSalon & { lat?: number | null; lng?: number | null };

const NOUAKCHOTT: Region = {
  latitude: 18.0735,
  longitude: -15.9582,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

export function MapSearchScreen({ navigation }: ClientHomeScreenProps<'MapSearch'>) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const rtl = useIsRTL();
  const { latitude, longitude, loading: locationLoading, error: locationError } = useLocation();
  const mapRef = useRef<MapView | null>(null);
  const sheetRef = useRef<BottomSheet | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [showSearchHere, setShowSearchHere] = useState(false);
  const lastSearchedRegion = useRef<Region | null>(null);

  const queryCenter = searchCenter ?? (latitude != null && longitude != null
    ? { lat: latitude, lng: longitude }
    : { lat: NOUAKCHOTT.latitude, lng: NOUAKCHOTT.longitude });

  const { data, isLoading: salonsLoading, refetch } = useQuery({
    queryKey: ['salons', 'nearby', queryCenter.lat, queryCenter.lng],
    queryFn: () =>
      salonsApi.search({
        lat: queryCenter.lat,
        lng: queryCenter.lng,
        radius_km: 10,
        with_distance: true,
        per_page: 50,
      }),
  });

  const salons: NearbySalon[] = useMemo(
    () =>
      ((data?.data?.salons || data?.data || []) as NearbySalon[]).filter(
        (s) => s.lat != null && s.lng != null,
      ),
    [data],
  );

  const initialRegion: Region = useMemo(
    () =>
      latitude != null && longitude != null
        ? {
            latitude,
            longitude,
            latitudeDelta: 0.06,
            longitudeDelta: 0.06,
          }
        : NOUAKCHOTT,
    [latitude, longitude],
  );

  const handleMarkerPress = (salon: NearbySalon) => {
    setSelectedId(salon.id);
    sheetRef.current?.snapToIndex(0);
    mapRef.current?.animateToRegion(
      {
        latitude: salon.lat!,
        longitude: salon.lng!,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      },
      350,
    );
  };

  const handleRegionChange = useCallback((region: Region) => {
    if (!lastSearchedRegion.current) {
      lastSearchedRegion.current = region;
      return;
    }
    const dLat = Math.abs(region.latitude - lastSearchedRegion.current.latitude);
    const dLng = Math.abs(region.longitude - lastSearchedRegion.current.longitude);
    if (dLat > 0.01 || dLng > 0.01) {
      setShowSearchHere(true);
    }
  }, []);

  const handleSearchHere = useCallback(async () => {
    const region = await mapRef.current?.getCamera();
    if (!region) return;
    const next = { lat: region.center.latitude, lng: region.center.longitude };
    setSearchCenter(next);
    lastSearchedRegion.current = {
      ...NOUAKCHOTT,
      latitude: next.lat,
      longitude: next.lng,
    };
    setShowSearchHere(false);
    refetch();
  }, [refetch]);

  const handleRecenter = useCallback(() => {
    if (latitude == null || longitude == null) return;
    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      },
      400,
    );
  }, [latitude, longitude]);

  const selected = useMemo(() => salons.find((s) => s.id === selectedId), [salons, selectedId]);

  if (locationLoading) return <MapLoadingSkeleton />;

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        customMapStyle={warmMapStyle as any}
        showsUserLocation={latitude != null && longitude != null}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        onRegionChangeComplete={handleRegionChange}
      >
        {salons.map((salon) => {
          const initial = (language === 'ar' && salon.name_ar ? salon.name_ar : salon.name)?.[0] || '?';
          return (
            <Marker
              key={salon.id}
              coordinate={{ latitude: salon.lat!, longitude: salon.lng! }}
              onPress={() => handleMarkerPress(salon)}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={selectedId === salon.id}
            >
              <InkPin initial={initial} selected={selectedId === salon.id} />
            </Marker>
          );
        })}
      </MapView>

      {/* Top overlays */}
      <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.topRow}>
          <PressablePremium
            onPress={() => navigation.goBack()}
            haptic="selection"
            pressScale={0.92}
            style={styles.iconButton}
          >
            <Ionicons
              name={rtl ? 'chevron-forward' : 'chevron-back'}
              size={22}
              color={colors.ink}
            />
          </PressablePremium>

          {showSearchHere && (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(160)}>
              <PressablePremium
                onPress={handleSearchHere}
                pressScale={0.97}
                haptic="medium"
                style={styles.searchHerePill}
              >
                <Ionicons name="refresh" size={14} color={colors.surface} />
                <AppText style={styles.searchHereText}>{t('map.searchArea')}</AppText>
              </PressablePremium>
            </Animated.View>
          )}

          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {/* Recenter button */}
      <View style={styles.recenterWrap} pointerEvents="box-none">
        <PressablePremium
          onPress={handleRecenter}
          pressScale={0.92}
          haptic="selection"
          style={styles.recenterButton}
          disabled={latitude == null || longitude == null}
        >
          <Ionicons name="navigate" size={18} color={colors.ink} />
        </PressablePremium>
      </View>

      {/* Bottom sheet */}
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={['18%', '52%', '92%']}
        handleIndicatorStyle={styles.sheetHandle}
        backgroundStyle={styles.sheetBg}
      >
        <View style={styles.sheetHeader}>
          {selected ? (
            <View style={styles.selectedBlock}>
              <View style={styles.selectedRow}>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.selectedName} numberOfLines={1}>
                    {language === 'ar' && selected.name_ar ? selected.name_ar : selected.name}
                  </AppText>
                  <View style={styles.metaRow}>
                    <Ionicons name="star" size={11} color={colors.star} />
                    <AppText style={styles.metaText}>
                      {(selected.avg_rating ?? 0).toFixed(1)}
                    </AppText>
                    {selected.distance_km != null && (
                      <>
                        <AppText style={styles.sep}>·</AppText>
                        <Ionicons name="location-outline" size={11} color={colors.slate} />
                        <AppText style={styles.metaText}>
                          {t('map.distance', { km: selected.distance_km.toFixed(1) })}
                        </AppText>
                      </>
                    )}
                  </View>
                </View>
                <PressablePremium
                  onPress={() => navigation.navigate('SalonDetail', { salonId: selected.id })}
                  pressScale={0.97}
                  haptic="selection"
                  style={styles.viewBtn}
                >
                  <AppText style={styles.viewBtnText}>{t('common.open')}</AppText>
                </PressablePremium>
              </View>
            </View>
          ) : (
            <View style={styles.headlineBlock}>
              <AppText style={styles.headline}>
                {t('map.salonsNearby', { count: salons.length })}
              </AppText>
              <AppText style={styles.headlineHint}>{t('home.nearMeSubtitle')}</AppText>
            </View>
          )}
        </View>

        {salonsLoading ? (
          <View style={styles.loadingWrap}>
            <Skeleton.Group gap={14}>
              <Skeleton.Block height={88} radius={16} />
              <Skeleton.Block height={88} radius={16} />
              <Skeleton.Block height={88} radius={16} />
            </Skeleton.Group>
          </View>
        ) : salons.length === 0 ? (
          <View style={styles.emptyWrap}>
            <NoResultsIllustration size={120} color={colors.accent} />
            <AppText style={styles.emptyTitle}>{t('map.noSalons')}</AppText>
            {locationError && (
              <PressablePremium
                onPress={() => Linking.openSettings()}
                pressScale={0.96}
                haptic="selection"
                style={styles.emptyCta}
              >
                <AppText style={styles.emptyCtaText}>{t('map.enableLocation')}</AppText>
              </PressablePremium>
            )}
          </View>
        ) : (
          <BottomSheetFlatList
            data={salons}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(280)}>
                <Pressable onPress={() => handleMarkerPress(item)}>
                  <PremiumSalonCard
                    salon={item}
                    language={language}
                    variant="compact"
                    onPress={() => navigation.navigate('SalonDetail', { salonId: item.id })}
                  />
                </Pressable>
              </Animated.View>
            )}
          />
        )}
      </BottomSheet>
    </View>
  );
}

function MapLoadingSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceAlt }}>
      <View style={{ position: 'absolute', top: 60, left: spacing.section, right: spacing.section }}>
        <Skeleton.Block width="100%" height={48} radius={24} />
      </View>
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.canvas,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: spacing.section,
          paddingTop: 24,
          gap: 14,
        }}
      >
        <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.hairline }} />
        <Skeleton.Block width={160} height={18} radius={6} />
        <Skeleton.Block width="100%" height={88} radius={16} />
        <Skeleton.Block width="100%" height={88} radius={16} />
        <Skeleton.Block width="100%" height={88} radius={16} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },

  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  searchHerePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.ink,
    borderRadius: 999,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  searchHereText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
    color: colors.surface,
  },

  recenterWrap: {
    position: 'absolute',
    bottom: '24%',
    right: spacing.lg,
  },
  recenterButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },

  sheetHandle: { backgroundColor: colors.hairline, width: 40 },
  sheetBg: { backgroundColor: colors.canvas },
  sheetHeader: {
    paddingHorizontal: spacing.section,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  headlineBlock: { gap: 2 },
  headline: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  headlineHint: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.slate,
  },
  selectedBlock: {
    paddingVertical: 4,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: colors.ink,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  metaText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 12,
    color: colors.slate,
  },
  sep: { fontFamily: 'Outfit-Regular', color: colors.slateSoft, marginHorizontal: 2 },
  viewBtn: {
    backgroundColor: colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  viewBtnText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
    color: colors.surface,
  },

  listContent: { paddingBottom: 32 },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: spacing.section,
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: colors.ink,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyCta: {
    marginTop: 14,
    backgroundColor: colors.ink,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  emptyCtaText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
    color: colors.surface,
  },
});
