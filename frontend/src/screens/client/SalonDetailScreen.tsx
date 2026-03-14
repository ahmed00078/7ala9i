import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      const previous = queryClient.getQueryData(['favorites']);
      queryClient.setQueryData(['favorites'], (old: any) => {
        if (!old?.data) return old;
        if (isFavorited) {
          return { ...old, data: old.data.filter((f: any) => f.salon_id !== salonId && f.salon?.id !== salonId && f.id !== salonId) };
        }
        return { ...old, data: [...old.data, { salon_id: salonId, id: salonId }] };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['favorites'], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });

  if (isLoading) return <LoadingScreen />;

  const salon = data?.data;
  if (!salon) return null;

  const displayName = language === 'ar' && salon.name_ar ? salon.name_ar : salon.name;
  const reviews = reviewsData?.data || [];

  const tabs = [
    { key: 'book',    label: t('salon.book')    },
    { key: 'reviews', label: t('salon.reviews') },
    { key: 'about',   label: t('salon.about')   },
  ] as const;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <PhotoCarousel photos={salon.photos || []} />

        {/* Salon info header */}
        <View style={styles.infoHeader}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{displayName}</Text>
            <TouchableOpacity onPress={() => toggleFavorite.mutate()} style={styles.heartBtn}>
              <Ionicons
                name={isFavorited ? 'heart' : 'heart-outline'}
                size={24}
                color={isFavorited ? colors.error : colors.gray}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.ratingRow}>
            <StarRating rating={salon.avg_rating} size={15} />
            <Text style={styles.ratingText}>
              {salon.avg_rating.toFixed(1)} ({t('salon.reviewCount', { count: salon.total_reviews })})
            </Text>
          </View>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.accent} />
            <Text style={styles.address}>{salon.address || salon.city}</Text>
          </View>
        </View>

        {/* Pill tab bar */}
        <View style={styles.tabBarWrapper}>
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
        </View>

        {/* Content */}
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
              <View style={styles.emptyBox}>
                <Ionicons name="star-outline" size={32} color={colors.grayLight} />
                <Text style={styles.emptyText}>{t('salon.noReviews')}</Text>
              </View>
            ) : (
              reviews.map((review: any) => (
                <View key={review.id} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerAvatar}>
                      <Text style={styles.reviewerInitial}>
                        {review.client?.first_name?.[0] || '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reviewerName}>
                        {review.client?.first_name} {review.client?.last_name}
                      </Text>
                      <StarRating rating={review.rating} size={12} />
                    </View>
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
                <Text style={[styles.hoursText, wh.is_closed && styles.closedText]}>
                  {wh.is_closed ? t('common.closed') : `${formatTime(wh.open_time)} – ${formatTime(wh.close_time)}`}
                </Text>
              </View>
            ))}
            {salon.phone && (
              <>
                <Text style={styles.sectionLabel}>{t('salon.phone')}</Text>
                <View style={styles.phoneRow}>
                  <Ionicons name="call-outline" size={16} color={colors.accent} />
                  <Text style={styles.phone}>{salon.phone}</Text>
                </View>
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

  infoHeader: {
    padding: 16,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    color: colors.black,
    flex: 1,
    textAlign: 'auto',
  },
  heartBtn: {
    padding: 4,
    marginStart: 8,
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.grayDark },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  address: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.grayDark, textAlign: 'auto' },

  /* Pill tab bar */
  tabBarWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: colors.gray,
  },
  tabTextActive: {
    color: colors.black,
    fontFamily: 'Outfit-SemiBold',
  },

  content: { padding: 16 },
  emptyBox: { alignItems: 'center', padding: 32, gap: 8 },
  emptyText: { textAlign: 'center', color: colors.gray, fontFamily: 'Outfit-Regular', fontSize: 14 },

  reviewItem: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerInitial: { fontSize: 16, fontFamily: 'Outfit-Bold', color: colors.accent },
  reviewerName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.black, marginBottom: 2, textAlign: 'auto' },
  reviewComment: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.grayDark, textAlign: 'auto' },

  description: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.grayDark, lineHeight: 22, marginBottom: 16, textAlign: 'auto' },
  sectionLabel: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.black, marginTop: 16, marginBottom: 10, textAlign: 'auto' },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayName: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.black, textAlign: 'auto' },
  hoursText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.grayDark },
  closedText: { color: colors.error },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phone: { fontSize: 14, fontFamily: 'Outfit-Medium', color: colors.accent },
});
