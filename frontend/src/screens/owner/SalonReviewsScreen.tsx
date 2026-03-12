import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { salonsApi } from '../../api/salons';
import { StarRating } from '../../components/ui/StarRating';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { colors } from '../../theme/colors';
import { OwnerPreviewScreenProps } from '../../types/navigation';

type Props = OwnerPreviewScreenProps<'SalonReviews'>;

export function SalonReviewsScreen({ route }: Props) {
  const { salonId, salonName } = route.params;
  const { t } = useTranslation();
  const navigation = useNavigation();

  const { data, isLoading } = useQuery({
    queryKey: ['salon', 'reviews', salonId],
    queryFn: () => salonsApi.getReviews(salonId, { per_page: 50 }),
  });

  const reviews: any[] = data?.data?.items || data?.data || [];

  const renderReview = ({ item: r }: { item: any }) => {
    const initials = `${(r.client?.first_name || '?')[0]}${(r.client?.last_name || '')[0] || ''}`.toUpperCase();
    return (
      <View style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reviewerName}>
              {r.client?.first_name} {r.client?.last_name}
            </Text>
            <StarRating rating={r.rating} size={13} />
          </View>
          {!!r.created_at && (
            <Text style={styles.reviewDate}>
              {new Date(r.created_at).toLocaleDateString()}
            </Text>
          )}
        </View>
        {!!r.comment && (
          <Text style={styles.reviewComment}>{r.comment}</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('owner.preview.reviews')}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{salonName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <LoadingScreen />
      ) : reviews.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="star-outline" size={40} color={colors.grayLight} />
          <Text style={styles.emptyText}>{t('owner.preview.noReviews')}</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(r) => r.id}
          renderItem={renderReview}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Outfit-Bold',
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: 'rgba(255,255,255,0.6)',
  },
  list: { padding: 16, paddingBottom: 32 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Outfit-Regular',
    color: colors.gray,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: colors.accent,
  },
  reviewerName: {
    fontSize: 14,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
    marginBottom: 2,
    textAlign: 'auto',
  },
  reviewDate: {
    fontSize: 11,
    fontFamily: 'Outfit-Regular',
    color: colors.gray,
    alignSelf: 'flex-start',
  },
  reviewComment: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: colors.grayDark,
    lineHeight: 19,
    textAlign: 'auto',
  },
});
