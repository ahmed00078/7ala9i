import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, Linking, Platform, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { AppText as Text } from '../../components/ui/AppText';
import { SalonCard } from '../../components/salon/SalonCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { salonsApi } from '../../api/salons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocation } from '../../hooks/useLocation';
import { SalonMapMarker } from '../../components/maps/SalonMapMarker';
import { colors } from '../../theme/colors';
import type { ClientHomeScreenProps } from '../../types/navigation';

type NearbySalon = {
  id: string;
  name: string;
  name_ar?: string;
  address?: string;
  city: string;
  avg_rating: number;
  total_reviews: number;
  cover_photo_url?: string;
  lat?: number | null;
  lng?: number | null;
  distance_km?: number | null;
};

export function MapSearchScreen({ navigation }: ClientHomeScreenProps<'MapSearch'>) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { latitude, longitude, loading: locationLoading, error: locationError } = useLocation();
  const mapRef = useRef<MapView | null>(null);
  const listRef = useRef<FlatList<NearbySalon> | null>(null);
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['salons', 'nearby', latitude, longitude],
    queryFn: () =>
      salonsApi.search({
        lat: latitude!,
        lng: longitude!,
        radius_km: 10,
        with_distance: true,
        per_page: 50,
      }),
    enabled: latitude != null && longitude != null,
  });

  const salons: NearbySalon[] = useMemo(
    () => (data?.data?.salons || data?.data || []).filter((s: NearbySalon) => s.lat != null && s.lng != null),
    [data]
  );

  const mapRegion: Region = useMemo(
    () => ({
      latitude: latitude ?? 18.0735,
      longitude: longitude ?? -15.9582,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06,
    }),
    [latitude, longitude]
  );

  const handleMarkerPress = (salon: NearbySalon) => {
    const nextLat = salon.lat ?? mapRegion.latitude;
    const nextLng = salon.lng ?? mapRegion.longitude;
    setSelectedSalonId(salon.id);

    mapRef.current?.animateToRegion(
      {
        latitude: nextLat,
        longitude: nextLng,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      },
      400
    );

    const index = salons.findIndex((item) => item.id === salon.id);
    if (index >= 0) {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }
  };

  if (locationLoading) {
    return <LoadingScreen />;
  }

  if (locationError || latitude == null || longitude == null) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('map.title')}</Text>
        </View>
        <EmptyState
          icon="location-outline"
          title={t('map.locationPermission')}
          buttonTitle={t('map.enableLocation')}
          onPress={() => Linking.openSettings()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('map.title')}</Text>
        <Text style={styles.subtitle}>{t('home.nearMeSubtitle')}</Text>
      </View>

      <View style={styles.content}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={mapRegion}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          showsUserLocation
        >
          {salons.map((salon) => (
            <Marker
              key={salon.id}
              coordinate={{ latitude: salon.lat!, longitude: salon.lng! }}
              onPress={() => handleMarkerPress(salon)}
              title={language === 'ar' && salon.name_ar ? salon.name_ar : salon.name}
              description={
                salon.distance_km != null
                  ? t('map.distance', { km: salon.distance_km.toFixed(1) })
                  : undefined
              }
            >
              <SalonMapMarker />
            </Marker>
          ))}
        </MapView>

        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t('home.nearMe')}</Text>
          {isLoading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={salons}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              onScrollToIndexFailed={({ index }) => {
                listRef.current?.scrollToOffset({ offset: index * 92, animated: true });
              }}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.cardWrap,
                    selectedSalonId === item.id && styles.cardWrapActive,
                  ]}
                >
                  <SalonCard
                    salon={item}
                    language={language}
                    compact
                    onPress={() => navigation.navigate('SalonDetail', { salonId: item.id })}
                  />
                  {item.distance_km != null ? (
                    <View style={styles.distanceBadge}>
                      <Text style={styles.distanceText}>
                        {t('map.distance', { km: item.distance_km.toFixed(1) })}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <EmptyState icon="map-outline" title={t('map.noSalons')} />
                </View>
              }
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: { fontSize: 22, fontFamily: 'Outfit-Bold', color: colors.white, textAlign: 'auto' },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'Outfit-Regular',
    marginTop: 2,
    textAlign: 'auto',
  },
  content: { flex: 1 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 10,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 14,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
    paddingHorizontal: 16,
    marginBottom: 8,
    textAlign: 'auto',
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrap: {
    position: 'relative',
  },
  cardWrapActive: {
    backgroundColor: '#F0FDFA',
  },
  distanceBadge: {
    position: 'absolute',
    top: 8,
    right: 10,
    backgroundColor: colors.accentLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  distanceText: {
    fontSize: 11,
    fontFamily: 'Outfit-SemiBold',
    color: colors.accentDark,
  },
  emptyWrap: {
    minHeight: 180,
  },
});
