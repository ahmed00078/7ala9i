import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText as Text } from '../ui/AppText';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { StarRating } from '../ui/StarRating';
import { useTranslation } from 'react-i18next';

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
}

export function SalonCard({ salon, onPress, language }: SalonCardProps) {
  const { t } = useTranslation();
  const displayName = language === 'ar' && salon.name_ar ? salon.name_ar : salon.name;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.imageContainer}>
        {salon.cover_photo_url ? (
          <Image source={{ uri: salon.cover_photo_url }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Ionicons name="cut-outline" size={36} color={colors.grayLight} />
          </View>
        )}
        {/* Floating rating badge */}
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
