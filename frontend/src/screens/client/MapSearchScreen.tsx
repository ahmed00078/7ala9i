import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export function MapSearchScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('map.title')}</Text>
        <Text style={styles.subtitle}>{t('map.locationPermission')}</Text>
      </View>
      <View style={styles.body}>
        <Ionicons name="map-outline" size={64} color={colors.border} />
        <Text style={styles.comingSoon}>{t('map.locationPermission')}</Text>
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
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: { fontSize: 22, fontFamily: 'Outfit-Bold', color: colors.white, textAlign: 'auto' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontFamily: 'Outfit-Regular', marginTop: 2 },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  comingSoon: { fontSize: 14, color: colors.gray, textAlign: 'center', marginTop: 12, fontFamily: 'Outfit-Regular' },
});
