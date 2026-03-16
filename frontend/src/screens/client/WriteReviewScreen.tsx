import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '../../api/reviews';
import { useAlert } from '../../contexts/AlertContext';
import { Button } from '../../components/ui/Button';
import { SuccessAlert } from '../../components/ui/SuccessAlert';
import { colors } from '../../theme/colors';
import type { ClientHomeScreenProps } from '../../types/navigation';

export function WriteReviewScreen({ route, navigation }: ClientHomeScreenProps<'WriteReview'>) {
  const { bookingId, salonName } = route.params;
  const { t } = useTranslation();
  const alert = useAlert();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () => reviewsApi.create({ booking_id: bookingId, rating, comment: comment || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setShowSuccess(true);
      setTimeout(() => navigation.goBack(), 2500);
    },
    onError: () => alert.show({ type: 'error', title: t('common.error'), message: t('errors.server') }),
  });

  const ratingDesc = rating > 0 ? t(`review.ratingDescriptions.${rating}`) : '';

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Navy header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{t('review.title')}</Text>
          <Text style={styles.headerSubtitle}>{salonName}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Star picker card */}
        <View style={styles.card}>
          <Text style={styles.label}>{t('review.ratingLabel')}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={38}
                  color={star <= rating ? '#F59E0B' : colors.grayLight}
                />
              </TouchableOpacity>
            ))}
          </View>
          {ratingDesc ? (
            <Text style={styles.ratingDesc}>{ratingDesc}</Text>
          ) : null}
        </View>

        {/* Comment card */}
        <View style={styles.card}>
          <Text style={styles.label}>{t('review.commentLabel')}</Text>
          <TextInput
            style={styles.textArea}
            value={comment}
            onChangeText={setComment}
            placeholder={t('review.commentPlaceholder')}
            placeholderTextColor={colors.gray}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        <Button
          title={t('review.submit')}
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={rating === 0}
        />
      </ScrollView>

      <SuccessAlert
        visible={showSuccess}
        message={t('review.success')}
        onDismiss={() => setShowSuccess(false)}
        duration={2500}
      />
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    color: colors.white,
    textAlign: 'auto',
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'auto',
  },
  scroll: { padding: 16 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
    marginBottom: 14,
    textAlign: 'auto',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  ratingDesc: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: colors.grayDark,
    textAlign: 'center',
    marginTop: 6,
  },
  textArea: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.black,
    minHeight: 110,
    textAlign: 'auto',
  },
});
