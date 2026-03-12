import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLanguage } from '../../contexts/LanguageContext';
import { ownerApi } from '../../api/owner';
import { salonsApi } from '../../api/salons';
import { PhotoCarousel } from '../../components/salon/PhotoCarousel';
import { ServiceCategory } from '../../components/salon/ServiceCategory';
import { StarRating } from '../../components/ui/StarRating';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { getDayName, formatTime } from '../../utils/formatters';
import { colors } from '../../theme/colors';
import { OwnerPreviewStackParamList } from '../../types/navigation';

export function SalonPreviewScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigation = useNavigation<NativeStackNavigationProp<OwnerPreviewStackParamList>>();

  const { data, isLoading } = useQuery({
    queryKey: ['owner', 'salon'],
    queryFn: () => ownerApi.getSalon(),
  });

  const salon = data?.data;

  const { data: reviewsData } = useQuery({
    queryKey: ['owner', 'salon', 'reviews', salon?.id],
    queryFn: () => salonsApi.getReviews(salon!.id, { per_page: 3 }),
    enabled: !!salon?.id,
  });

  if (isLoading) return <LoadingScreen />;
  if (!salon) return null;

  const reviews: any[] = reviewsData?.data?.items || reviewsData?.data || [];
  const displayName = language === 'ar' && salon.name_ar ? salon.name_ar : salon.name;

  return (
    <SafeAreaView style={styles.container}>
      {/* Preview notice banner */}
      <View style={styles.previewBanner}>
        <Ionicons name="eye-outline" size={14} color={colors.white} />
        <Text style={styles.previewBannerText}>{t('owner.preview.subtitle')}</Text>
      </View>

      <ScrollView>
        <PhotoCarousel photos={salon.photos || []} />

        {/* Salon info card */}
        <View style={styles.infoCard}>
          <Text style={styles.name}>{displayName}</Text>
          <View style={styles.ratingRow}>
            <StarRating rating={salon.avg_rating || 0} size={16} />
            <Text style={styles.ratingText}>
              {(salon.avg_rating || 0).toFixed(1)}
            </Text>
            <Text style={styles.reviewCount}>
              ({t('salon.reviewCount', { count: salon.total_reviews || 0 })})
            </Text>
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.gray} />
            <Text style={styles.address}>{salon.address || salon.city}</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Services */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>{t('salon.services')}</Text>
          </View>
          {(salon.service_categories || []).map((cat: any) => (
            <ServiceCategory key={cat.id} category={cat} language={language} />
          ))}

          {/* Hours */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>{t('salon.hours')}</Text>
          </View>
          <View style={styles.hoursCard}>
            {(salon.working_hours || []).map((wh: any) => (
              <View key={wh.id} style={styles.hoursRow}>
                <Text style={styles.dayName}>{getDayName(wh.day_of_week)}</Text>
                <Text style={[styles.hoursText, wh.is_closed && styles.hoursTextClosed]}>
                  {wh.is_closed
                    ? t('common.closed')
                    : `${formatTime(wh.open_time)} – ${formatTime(wh.close_time)}`}
                </Text>
              </View>
            ))}
          </View>

          {/* Reviews */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>{t('owner.preview.reviews')}</Text>
          </View>
          {reviews.length === 0 ? (
            <View style={styles.noReviews}>
              <Ionicons name="star-outline" size={24} color={colors.grayLight} />
              <Text style={styles.noReviewsText}>{t('owner.preview.noReviews')}</Text>
            </View>
          ) : (
            <>
              {reviews.map((r: any) => {
                const initials = `${(r.client?.first_name || '?')[0]}${(r.client?.last_name || '')[0] || ''}`.toUpperCase();
                return (
                  <View key={r.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{initials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewerName}>
                          {r.client?.first_name} {r.client?.last_name}
                        </Text>
                        <StarRating rating={r.rating} size={12} />
                      </View>
                    </View>
                    {!!r.comment && (
                      <Text style={styles.reviewComment} numberOfLines={3}>{r.comment}</Text>
                    )}
                  </View>
                );
              })}
              {(salon.total_reviews || 0) > 3 && (
                <TouchableOpacity
                  style={styles.seeAllBtn}
                  onPress={() => navigation.navigate('SalonReviews', { salonId: salon.id, salonName: displayName })}
                >
                  <Text style={styles.seeAllText}>{t('owner.preview.seeAllReviews')}</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.accent} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  previewBanner: {
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  previewBannerText: {
    color: colors.white,
    fontSize: 12,
    fontFamily: 'Outfit-SemiBold',
    letterSpacing: 0.3,
  },
  infoCard: {
    backgroundColor: colors.white,
    padding: 20,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  name: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    color: colors.black,
    marginBottom: 8,
    textAlign: 'auto',
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  ratingText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.black },
  reviewCount: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.gray },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  address: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.gray, textAlign: 'auto' },
  content: { padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 8 },
  sectionDot: { width: 4, height: 18, borderRadius: 2, backgroundColor: colors.accent },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
    textAlign: 'auto',
  },
  hoursCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayName: { fontSize: 14, fontFamily: 'Outfit-Medium', color: colors.black, textAlign: 'auto' },
  hoursText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.grayDark },
  hoursTextClosed: { color: colors.error },
  noReviews: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  noReviewsText: {
    color: colors.gray,
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
  },
  reviewCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontFamily: 'Outfit-Bold',
    color: colors.accent,
  },
  reviewerName: {
    fontSize: 13,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
    marginBottom: 2,
    textAlign: 'auto',
  },
  reviewComment: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: colors.grayDark,
    lineHeight: 19,
    textAlign: 'auto',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  seeAllText: {
    fontSize: 13,
    fontFamily: 'Outfit-SemiBold',
    color: colors.accent,
  },
});
