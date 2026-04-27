import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLocation } from '../../hooks/useLocation';
import { Button } from '../ui/Button';
import { AppText as Text } from '../ui/AppText';
import { colors } from '../../theme/colors';
import { SalonMapMarker } from './SalonMapMarker';

const DEFAULT_REGION = {
  latitude: 18.0735,
  longitude: -15.9582,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

interface MapPickerProps {
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  onConfirm: (coords: { lat: number; lng: number }) => void;
  confirmLoading?: boolean;
}

export function MapPicker({
  initialLatitude,
  initialLongitude,
  onConfirm,
  confirmLoading = false,
}: MapPickerProps) {
  const { t } = useTranslation();
  const mapRef = useRef<MapView | null>(null);
  const { latitude, longitude, loading: locationLoading } = useLocation();

  const [region] = useState<Region>({
    latitude: initialLatitude ?? DEFAULT_REGION.latitude,
    longitude: initialLongitude ?? DEFAULT_REGION.longitude,
    latitudeDelta: DEFAULT_REGION.latitudeDelta,
    longitudeDelta: DEFAULT_REGION.longitudeDelta,
  });

  const [markerCoord, setMarkerCoord] = useState({
    latitude: initialLatitude ?? DEFAULT_REGION.latitude,
    longitude: initialLongitude ?? DEFAULT_REGION.longitude,
  });

  const handleUseMyLocation = () => {
    if (latitude == null || longitude == null) return;

    const nextRegion: Region = {
      latitude,
      longitude,
      latitudeDelta: DEFAULT_REGION.latitudeDelta,
      longitudeDelta: DEFAULT_REGION.longitudeDelta,
    };
    setMarkerCoord({ latitude, longitude });
    mapRef.current?.animateToRegion(nextRegion, 500);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        showsUserLocation
      >
        <Marker
          coordinate={markerCoord}
          draggable
          onDragEnd={(event) => setMarkerCoord(event.nativeEvent.coordinate)}
        >
          <SalonMapMarker />
        </Marker>
      </MapView>

      <View style={styles.topBanner}>
        <Text style={styles.topBannerText}>{t('map.tapToSelect')}</Text>
      </View>

      <TouchableOpacity
        style={styles.locationButton}
        onPress={handleUseMyLocation}
        activeOpacity={0.85}
        disabled={locationLoading}
      >
        {locationLoading ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <>
            <Ionicons name="locate" size={16} color={colors.accent} />
            <Text style={styles.locationButtonText}>{t('map.useMyLocation')}</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.confirmButtonWrap}>
        <Button
          title={t('map.confirmLocation')}
          onPress={() =>
            onConfirm({ lat: markerCoord.latitude, lng: markerCoord.longitude })
          }
          loading={confirmLoading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBanner: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  topBannerText: {
    fontSize: 13,
    fontFamily: 'Outfit-Medium',
    color: colors.black,
    textAlign: 'auto',
  },
  locationButton: {
    position: 'absolute',
    top: 72,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  locationButtonText: {
    fontSize: 12,
    fontFamily: 'Outfit-SemiBold',
    color: colors.accent,
  },
  confirmButtonWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
  },
});
