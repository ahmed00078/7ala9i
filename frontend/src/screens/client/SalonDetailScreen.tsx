import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../contexts/LanguageContext';
import { salonsApi } from '../../api/salons';
import { favoritesApi } from '../../api/favorites';
import { PhotoCarousel } from '../../components/salon/PhotoCarousel';
import { ServiceCategory } from '../../components/salon/ServiceCategory';
import { StarRating } from '../../components/ui/StarRating';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { colors } from '../../theme/colors';
import { formatTime, getDayName } from '../../utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import type { ClientHomeScreenProps } from '../../types/navigation';

export function SalonDetailScreen({ route, navigation }: ClientHomeScreenProps<'SalonDetail'>) {
  const { salonId } = route.params;
  const { t } = useTranslation();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'book' | 'reviews' | 'about'>('book');

  const { data, isLoading } = useQuery({
    queryKey: ['salon', salonId],
    queryFn: () => salonsApi.getDetail(salonId),
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['salon', salonId, 'reviews'],
    queryFn: () => salonsApi.getReviews(salonId),
    enabled: activeTab === 'reviews',
  });

  const { data: favData } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoritesApi.getAll(),
  });

  const favorites: any[] = favData?.data || [];
  const isFavorited = favorites.some(
    (f) => f.salon_id === salonId || f.salon?.id === salonId || f.id === salonId
  );

  const toggleFavorite = useMutation({
    mutationFn: () => (isFavorited ? favoritesApi.remove(salonId) : favoritesApi.add(salonId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });

  if (isLoading) return <LoadingScreen />;

  const salon = data?.data;
  if (!salon) return null;

  const displayName = language === 'ar' && salon.name_ar ? salon.name_ar : salon.name;
  const reviews = reviewsData?.data || [];

  const tabs = [
    { key: 'book', label: t('salon.book') },
    { key: 'reviews', label: t('salon.reviews') },
    { key: 'about', label: t('salon.about') },
  ] as const;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <PhotoCarousel photos={salon.photos || []} />

        <View style={styles.header}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{displayName}</Text>
            <TouchableOpacity onPress={() => toggleFavorite.mutate()} style={styles.heartBtn}>
              <Ionicons
                name={isFavorited ? 'heart' : 'heart-outline'}
                size={26}
                color={isFavorited ? colors.error : colors.gray}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.ratingRow}>
            <StarRating rating={salon.avg_rating} size={16} />
            <Text style={styles.ratingText}>
              {salon.avg_rating.toFixed(1)} ({t('salon.reviewCount', { count: salon.total_reviews })})
            </Text>
          </View>
          <Text style={styles.address}>{salon.address || salon.city}</Text>
        </View>

        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'book' && (
          <View style={styles.content}>
            {(salon.service_categories || []).map((cat: any) => (
              <ServiceCategory
                key={cat.id}
                category={cat}
                language={language}
                onSelectService={(service) =>
                  navigation.navigate('BookingFlow', {
                    salonId,
                    serviceId: service.id,
                    serviceName: language === 'ar' && service.name_ar ? service.name_ar : service.name,
                    duration: service.duration,
                    price: service.price,
                  })
                }
              />
            ))}
          </View>
        )}

        {activeTab === 'reviews' && (
          <View style={styles.content}>
            {reviews.length === 0 ? (
              <Text style={styles.emptyText}>{t('salon.noReviews')}</Text>
            ) : (
              reviews.map((review: any) => (
                <View key={review.id} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>
                      {review.client?.first_name} {review.client?.last_name}
                    </Text>
                    <StarRating rating={review.rating} size={14} />
                  </View>
                  {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'about' && (
          <View style={styles.content}>
            {salon.description && (
              <Text style={styles.description}>
                {language === 'ar' && salon.description_ar ? salon.description_ar : salon.description}
              </Text>
            )}
            <Text style={styles.sectionLabel}>{t('salon.hours')}</Text>
            {(salon.working_hours || []).map((wh: any) => (
              <View key={wh.id} style={styles.hoursRow}>
                <Text style={styles.dayName}>{getDayName(wh.day_of_week)}</Text>
                <Text style={styles.hoursText}>
                  {wh.is_closed ? t('common.closed') : `${formatTime(wh.open_time)} - ${formatTime(wh.close_time)}`}
                </Text>
              </View>
            ))}
            {salon.phone && (
              <>
                <Text style={styles.sectionLabel}>{t('salon.phone')}</Text>
                <Text style={styles.phone}>{salon.phone}</Text>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: { padding: 16 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 22, fontWeight: '700', color: colors.black, flex: 1, textAlign: 'auto' },
  heart: { fontSize: 24, color: colors.error, marginStart: 12 },
  heartBtn: { padding: 4, marginStart: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  ratingText: { fontSize: 13, color: colors.grayDark, marginStart: 8 },
  address: { fontSize: 14, color: colors.gray, marginTop: 4, textAlign: 'auto' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.black },
  tabText: { fontSize: 14, color: colors.gray, fontWeight: '500' },
  tabTextActive: { color: colors.black },
  content: { padding: 16 },
  emptyText: { textAlign: 'center', color: colors.gray, padding: 24 },
  reviewItem: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 12 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewerName: { fontSize: 14, fontWeight: '600', color: colors.black, textAlign: 'auto' },
  reviewComment: { fontSize: 14, color: colors.grayDark, marginTop: 4, textAlign: 'auto' },
  description: { fontSize: 14, color: colors.grayDark, lineHeight: 22, marginBottom: 16, textAlign: 'auto' },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: colors.black, marginTop: 16, marginBottom: 8, textAlign: 'auto' },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  dayName: { fontSize: 14, color: colors.black, textAlign: 'auto' },
  hoursText: { fontSize: 14, color: colors.grayDark },
  phone: { fontSize: 14, color: colors.accent },
});
