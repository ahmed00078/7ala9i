import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { AppText } from '../../components/ui/AppText';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { ownerApi } from '../../api/owner';
import { useAlert } from '../../contexts/AlertContext';
import { useLocation } from '../../hooks/useLocation';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { PressablePremium, HoldToConfirm } from '../../components/premium';
import { SalonMapMarker } from '../../components/maps/SalonMapMarker';
import { useIsRTL } from '../../i18n/useIsRTL';
import type { OwnerProfileScreenProps } from '../../types/navigation';

const NKC_REGION: Region = {
  latitude: 18.0735,
  longitude: -15.9582,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

export function EditLocationScreen({ navigation }: OwnerProfileScreenProps<'EditLocation'>) {
  const { t } = useTranslation();
  const rtl = useIsRTL();
  const alert = useAlert();
  const queryClient = useQueryClient();

  const mapRef = useRef<MapView | null>(null);
  const { latitude: userLat, longitude: userLng, loading: locLoading } = useLocation();
  const reverseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: salonData, isLoading } = useQuery({
    queryKey: ['owner', 'salon'],
    queryFn: () => ownerApi.getSalon(),
  });
  const salon = salonData?.data;

  const initialCoord = {
    latitude: salon?.lat ?? NKC_REGION.latitude,
    longitude: salon?.lng ?? NKC_REGION.longitude,
  };
  const [coord, setCoord] = useState(initialCoord);
  const [dragging, setDragging] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);

  // Pin scale animation while dragging
  const pinScale = useSharedValue(1);
  const pinStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pinScale.value }],
  }));
  useEffect(() => {
    pinScale.value = withSpring(dragging ? 1.25 : 1, { damping: 16, stiffness: 220 });
  }, [dragging, pinScale]);

  // Debounced reverse geocode on coord change
  useEffect(() => {
    if (reverseTimer.current) clearTimeout(reverseTimer.current);
    setAddressLoading(true);
    reverseTimer.current = setTimeout(async () => {
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: coord.latitude,
          longitude: coord.longitude,
        });
        const first = results[0];
        if (first) {
          const line = [first.name, first.street, first.district, first.city]
            .filter(Boolean)
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .join(', ');
          setAddress(line || null);
        } else {
          setAddress(null);
        }
      } catch {
        setAddress(null);
      } finally {
        setAddressLoading(false);
      }
    }, 400);
    return () => {
      if (reverseTimer.current) clearTimeout(reverseTimer.current);
    };
  }, [coord]);

  const updateLocationMutation = useMutation({
    mutationFn: (coords: { lat: number; lng: number }) => ownerApi.updateSalon(coords),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'salon'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setTimeout(() => navigation.goBack(), 250);
    },
    onError: () => {
      alert.show({
        type: 'error',
        title: t('common.error'),
        message: t('owner.salonInfo.saveError'),
      });
    },
  });

  const handleUseMyLocation = () => {
    if (userLat == null || userLng == null) return;
    const next: Region = {
      latitude: userLat,
      longitude: userLng,
      latitudeDelta: NKC_REGION.latitudeDelta,
      longitudeDelta: NKC_REGION.longitudeDelta,
    };
    setCoord({ latitude: userLat, longitude: userLng });
    mapRef.current?.animateToRegion(next, 500);
    Haptics.selectionAsync().catch(() => undefined);
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: initialCoord.latitude,
          longitude: initialCoord.longitude,
          latitudeDelta: NKC_REGION.latitudeDelta,
          longitudeDelta: NKC_REGION.longitudeDelta,
        }}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        showsUserLocation
        showsCompass={false}
        showsMyLocationButton={false}
      >
        <Marker
          coordinate={coord}
          draggable
          onDragStart={() => {
            setDragging(true);
            Haptics.selectionAsync().catch(() => undefined);
          }}
          onDragEnd={(e) => {
            setDragging(false);
            setCoord(e.nativeEvent.coordinate);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
          }}
          anchor={{ x: 0.5, y: 1 }}
        >
          <Animated.View style={pinStyle}>
            <SalonMapMarker />
          </Animated.View>
        </Marker>
      </MapView>

      {/* ── Top bar (back + locate me) ─────────────────────────── */}
      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <View style={styles.topBarRow}>
          <PressablePremium
            haptic="selection"
            pressScale={0.92}
            onPress={() => navigation.goBack()}
            style={styles.iconBtn}
          >
            <Ionicons
              name={rtl ? 'chevron-forward' : 'chevron-back'}
              size={20}
              color={colors.ink}
            />
          </PressablePremium>

          <View style={styles.hintCard}>
            <Ionicons name="information-circle" size={14} color={colors.accent} />
            <AppText style={styles.hintText} numberOfLines={1}>
              {t('map.pinHint')}
            </AppText>
          </View>

          <PressablePremium
            haptic="selection"
            pressScale={0.92}
            onPress={handleUseMyLocation}
            disabled={locLoading || userLat == null}
            style={[styles.iconBtn, (locLoading || userLat == null) && { opacity: 0.5 }]}
          >
            {locLoading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name="locate" size={18} color={colors.accent} />
            )}
          </PressablePremium>
        </View>
      </SafeAreaView>

      {/* ── Bottom action card ─────────────────────────────────── */}
      <View style={styles.bottomWrap} pointerEvents="box-none">
        <SafeAreaView edges={['bottom']}>
          <View style={styles.bottomCard}>
            <AppText style={styles.eyebrow}>{t('owner.salonLocation.title')}</AppText>
            <View style={styles.addressRow}>
              <Ionicons name="location" size={16} color={colors.accent} />
              <View style={{ flex: 1, minWidth: 0 }}>
                {addressLoading ? (
                  <AppText style={styles.addressLoading}>
                    {t('map.addressDetecting')}
                  </AppText>
                ) : (
                  <AppText style={styles.addressLine} numberOfLines={2}>
                    {address ?? t('map.addressNotFound')}
                  </AppText>
                )}
                <AppText style={styles.coordLine}>
                  {coord.latitude.toFixed(5)}, {coord.longitude.toFixed(5)}
                </AppText>
              </View>
            </View>

            <View style={styles.confirmWrap}>
              <HoldToConfirm
                label={t('map.holdToConfirm')}
                loading={updateLocationMutation.isPending}
                onConfirm={() =>
                  updateLocationMutation.mutate({
                    lat: coord.latitude,
                    lng: coord.longitude,
                  })
                }
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: 8,
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  hintCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  hintText: {
    ...typography.bodySmall,
    color: colors.ink,
    flex: 1,
  },

  bottomWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomCard: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radius.hero,
    padding: 18,
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  eyebrow: {
    ...typography.capsLabel,
    color: colors.slateSoft,
    marginBottom: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  addressLoading: {
    ...typography.body,
    color: colors.slateSoft,
    fontStyle: 'italic',
  },
  addressLine: {
    ...typography.bodyMedium,
    color: colors.ink,
  },
  coordLine: {
    ...typography.caption,
    color: colors.slateSoft,
    marginTop: 2,
    fontFamily: 'Outfit-Regular',
  },
  confirmWrap: {
    marginTop: 16,
  },
});
