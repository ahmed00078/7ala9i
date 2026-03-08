import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../contexts/LanguageContext';
import { ownerApi } from '../../api/owner';
import { PhotoCarousel } from '../../components/salon/PhotoCarousel';
import { ServiceCategory } from '../../components/salon/ServiceCategory';
import { StarRating } from '../../components/ui/StarRating';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { getDayName, formatTime } from '../../utils/formatters';
import { colors } from '../../theme/colors';

export function SalonPreviewScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ['owner', 'salon'],
    queryFn: () => ownerApi.getSalon(),
  });

  if (isLoading) return <LoadingScreen />;

  const salon = data?.data;
  if (!salon) return null;

  const displayName = language === 'ar' && salon.name_ar ? salon.name_ar : salon.name;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.previewBanner}>{t('owner.preview.subtitle')}</Text>
        <PhotoCarousel photos={salon.photos || []} />

        <View style={styles.header}>
          <Text style={styles.name}>{displayName}</Text>
          <View style={styles.ratingRow}>
            <StarRating rating={salon.avg_rating || 0} size={16} />
            <Text style={styles.ratingText}>
              {(salon.avg_rating || 0).toFixed(1)} ({t('salon.reviewCount', { count: salon.total_reviews || 0 })})
            </Text>
          </View>
          <Text style={styles.address}>{salon.address || salon.city}</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>{t('salon.services')}</Text>
          {(salon.service_categories || []).map((cat: any) => (
            <ServiceCategory key={cat.id} category={cat} language={language} />
          ))}

          <Text style={styles.sectionTitle}>{t('salon.hours')}</Text>
          {(salon.working_hours || []).map((wh: any) => (
            <View key={wh.id} style={styles.hoursRow}>
              <Text style={styles.dayName}>{getDayName(wh.day_of_week)}</Text>
              <Text style={styles.hoursText}>
                {wh.is_closed ? t('common.closed') : `${formatTime(wh.open_time)} - ${formatTime(wh.close_time)}`}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  previewBanner: {
    backgroundColor: colors.accent, color: colors.white, textAlign: 'center',
    paddingVertical: 8, fontSize: 12, fontWeight: '600',
  },
  header: { padding: 16 },
  name: { fontSize: 22, fontWeight: '700', color: colors.black, textAlign: 'auto' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  ratingText: { fontSize: 13, color: colors.grayDark, marginStart: 8 },
  address: { fontSize: 14, color: colors.gray, marginTop: 4, textAlign: 'auto' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.black, marginBottom: 12, marginTop: 8, textAlign: 'auto' },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  dayName: { fontSize: 14, color: colors.black, textAlign: 'auto' },
  hoursText: { fontSize: 14, color: colors.grayDark },
});
