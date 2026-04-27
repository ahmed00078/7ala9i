import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ownerApi } from '../../api/owner';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { SuccessAlert } from '../../components/ui/SuccessAlert';
import { MapPicker } from '../../components/maps/MapPicker';
import { AppText as Text } from '../../components/ui/AppText';
import { useAlert } from '../../contexts/AlertContext';
import { colors } from '../../theme/colors';
import type { OwnerProfileScreenProps } from '../../types/navigation';

export function EditLocationScreen({ navigation }: OwnerProfileScreenProps<'EditLocation'>) {
  const { t } = useTranslation();
  const alert = useAlert();
  const queryClient = useQueryClient();
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: salonData, isLoading } = useQuery({
    queryKey: ['owner', 'salon'],
    queryFn: () => ownerApi.getSalon(),
  });

  const salon = salonData?.data;

  const updateLocationMutation = useMutation({
    mutationFn: (coords: { lat: number; lng: number }) => ownerApi.updateSalon(coords),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'salon'] });
      setShowSuccess(true);
      setTimeout(() => navigation.goBack(), 1200);
    },
    onError: () => {
      alert.show({ type: 'error', title: t('common.error'), message: t('owner.salonInfo.saveError') });
    },
  });

  if (isLoading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('owner.salonLocation.title')}</Text>
        <View style={styles.headerRightSpace} />
      </View>

      <MapPicker
        initialLatitude={salon?.lat}
        initialLongitude={salon?.lng}
        confirmLoading={updateLocationMutation.isPending}
        onConfirm={(coords) => updateLocationMutation.mutate(coords)}
      />

      <SuccessAlert
        visible={showSuccess}
        message={t('owner.salonInfo.saved')}
        onDismiss={() => setShowSuccess(false)}
        duration={1200}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: colors.white,
    textAlign: 'auto',
  },
  headerRightSpace: {
    width: 40,
    height: 40,
  },
});
