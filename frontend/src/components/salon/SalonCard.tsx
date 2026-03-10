import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText as Text } from '../ui/AppText';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { StarRating } from '../ui/StarRating';
import { useTranslation } from 'react-i18next';
import { getImageUrl } from '../../api/client';

interface SalonCardProps {
  salon: {
    id: string;
    name: string;
    name_ar?: string;
    address?: string;
    city: string;
    avg_rating: number;
    total_reviews: number;
    cover_photo_url?: string;
  };
  onPress: () => void;
  language?: string;
  compact?: boolean;
}

export function SalonCard({ salon, onPress, language, compact }: SalonCardProps) {
  const { t } = useTranslation();
  const displayName = language === 'ar' && salon.name_ar ? salon.name_ar : salon.name;
  const imageUri = getImageUrl(salon.cover_photo_url);

  /* ── Compact (row) layout for search results ── */
  if (compact) {
    return (
      <TouchableOpacity style={compactStyles.card} onPress={onPress} activeOpacity={0.75}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={compactStyles.thumb} contentFit="cover" />
        ) : (
          <View style={[compactStyles.thumb, compactStyles.thumbPlaceholder]}>
            <Ionicons name="cut-outline" size={22} color={colors.grayLight} />
          </View>
        )}
        <View style={compactStyles.info}>
          <Text style={compactStyles.name} numberOfLines={1}>{displayName}</Text>
          <View style={compactStyles.locationRow}>
            <Ionicons name="location-outline" size={12} color={colors.accent} />
            <Text style={compactStyles.city} numberOfLines={1}>{salon.address || salon.city}</Text>
          </View>
          <View style={compactStyles.ratingRow}>
            <StarRating rating={salon.avg_rating} size={12} />
            <Text style={compactStyles.ratingText}>{salon.avg_rating.toFixed(1)}</Text>
            <Text style={compactStyles.reviewCount}>
              ({t('salon.reviewCount', { count: salon.total_reviews })})
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.grayLight} />
      </TouchableOpacity>
    );
  }

  /* ── Full (card) layout for home/featured ── */
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Ionicons name="cut-outline" size={36} color={colors.grayLight} />
          </View>
        )}
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={11} color={colors.star} />
          <Text style={styles.ratingBadgeText}>{salon.avg_rating.toFixed(1)}</Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color={colors.accent} />
          <Text style={styles.address} numberOfLines={1}>{salon.address || salon.city}</Text>
        </View>
        <View style={styles.footerRow}>
          <StarRating rating={salon.avg_rating} size={13} />
          <Text style={styles.reviewCount}>
            {t('salon.reviewCount', { count: salon.total_reviews })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* ── Compact styles ── */
const compactStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  thumbPlaceholder: {
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.black },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  city: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.grayDark, flex: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  ratingText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.black },
  reviewCount: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.gray },
});

/* ── Full card styles ── */
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 164,
  },
  placeholder: {
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.navy,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  ratingBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontFamily: 'Outfit-SemiBold',
  },
  info: {
    padding: 14,
    gap: 5,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
    textAlign: 'auto',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  address: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: colors.grayDark,
    flex: 1,
    textAlign: 'auto',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  reviewCount: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: colors.gray,
  },
});

