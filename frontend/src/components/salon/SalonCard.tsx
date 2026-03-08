import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
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
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {salon.cover_photo_url ? (
        <Image source={{ uri: salon.cover_photo_url }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.image, styles.placeholder]} />
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
        <Text style={styles.address} numberOfLines={1}>{salon.address || salon.city}</Text>
        <View style={styles.ratingRow}>
          <StarRating rating={salon.avg_rating} size={14} />
          <Text style={styles.ratingText}>
            {salon.avg_rating.toFixed(1)} ({t('salon.reviewCount', { count: salon.total_reviews })})
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: 160,
  },
  placeholder: {
    backgroundColor: colors.background,
  },
  info: {
    padding: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.black,
    marginBottom: 4,
    textAlign: 'auto',
  },
  address: {
    fontSize: 13,
    color: colors.gray,
    marginBottom: 8,
    textAlign: 'auto',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: colors.grayDark,
    marginStart: 6,
  },
});
