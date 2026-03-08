import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { reviewsApi } from '../../api/reviews';
import { StarRating } from '../../components/ui/StarRating';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import type { ClientHomeScreenProps } from '../../types/navigation';

export function WriteReviewScreen({ route, navigation }: ClientHomeScreenProps<'WriteReview'>) {
  const { bookingId, salonName } = route.params;
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const mutation = useMutation({
    mutationFn: () => reviewsApi.create({ booking_id: bookingId, rating, comment: comment || undefined }),
    onSuccess: () => {
      Alert.alert(t('review.success'));
      navigation.goBack();
    },
    onError: () => Alert.alert(t('common.error'), t('errors.server')),
  });

  const ratingDesc = rating > 0 ? t(`review.ratingDescriptions.${rating}`) : '';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('review.title')}</Text>
        <Text style={styles.subtitle}>{t('review.subtitle', { salonName })}</Text>

        <Text style={styles.label}>{t('review.ratingLabel')}</Text>
        <View style={styles.ratingContainer}>
          <StarRating rating={rating} size={36} interactive onRate={setRating} />
          {ratingDesc ? <Text style={styles.ratingDesc}>{ratingDesc}</Text> : null}
        </View>

        <Text style={styles.label}>{t('review.commentLabel')}</Text>
        <TextInput
          style={styles.textArea}
          value={comment}
          onChangeText={setComment}
          placeholder={t('review.commentPlaceholder')}
          placeholderTextColor={colors.gray}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Button
          title={t('review.submit')}
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={rating === 0}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: colors.black, marginBottom: 4, textAlign: 'auto' },
  subtitle: { fontSize: 14, color: colors.gray, marginBottom: 24, textAlign: 'auto' },
  label: { fontSize: 16, fontWeight: '600', color: colors.black, marginBottom: 12, textAlign: 'auto' },
  ratingContainer: { alignItems: 'center', marginBottom: 24 },
  ratingDesc: { fontSize: 14, color: colors.grayDark, marginTop: 8 },
  textArea: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    padding: 16, fontSize: 14, color: colors.black, minHeight: 100,
    marginBottom: 24, textAlign: 'auto',
  },
});
