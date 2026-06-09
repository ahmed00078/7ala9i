import React from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ownerApi } from '../../api/owner';
import { SalonDetailScreen } from '../client/SalonDetailScreen';
import { colors } from '../../theme/colors';
import type { OwnerPreviewStackParamList } from '../../types/navigation';

/**
 * Owner's "Preview" tab. Renders the exact same `SalonDetailScreen` the client
 * sees, with `preview: true` so the favorite / share / book buttons are
 * suppressed in favour of a "this is what your clients see" badge.
 *
 * This is a deliberate consolidation — keeping the preview as a thin shim over
 * the client detail screen means any visual change to the client experience
 * also lands in the owner preview, with no second screen to keep in sync.
 */
export function SalonPreviewScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OwnerPreviewStackParamList>>();

  const { data, isLoading } = useQuery({
    queryKey: ['owner', 'salon'],
    queryFn: () => ownerApi.getSalon(),
  });

  const salon = data?.data;

  if (isLoading || !salon) return <View style={{ flex: 1, backgroundColor: colors.canvas }} />;

  // Construct a synthetic route + navigation pair compatible with the client
  // detail screen. The owner stack doesn't register `BookingFlow`, but the book
  // buttons are hidden in preview mode so that navigate call is never made.
  const route = {
    key: 'SalonPreview',
    name: 'SalonDetail' as const,
    params: { salonId: salon.id, preview: true },
  };

  return (
    <SalonDetailScreen
      route={route as any}
      navigation={navigation as any}
    />
  );
}
