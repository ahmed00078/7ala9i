import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  ZoomIn,
  Layout,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { AppText } from '../../components/ui/AppText';
import { reviewsApi } from '../../api/reviews';
import { useAlert } from '../../contexts/AlertContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import {
  HoldToConfirm,
  Avatar,
} from '../../components/premium';
import type { ClientHomeScreenProps } from '../../types/navigation';

const STARS = [1, 2, 3, 4, 5] as const;
const CHAR_THRESHOLD = 50;
const CHAR_LIMIT = 600;

export function WriteReviewScreen({ route, navigation }: ClientHomeScreenProps<'WriteReview'>) {
  const { bookingId, salonName } = route.params;
  const { t } = useTranslation();
  const alert = useAlert();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      reviewsApi.create({
        booking_id: bookingId,
        rating,
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setSuccess(true);
      setTimeout(() => navigation.goBack(), 1500);
    },
    onError: () =>
      alert.show({
        type: 'error',
        title: t('common.error'),
        message: t('errors.server'),
      }),
  });

  const handleStarPress = useCallback((value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setRating(value);
  }, []);

  const ratingLabel = rating > 0 ? t(`review.ratingLabels.${rating}`) : t('review.ratingHint');
  const charCount = comment.length;
  const showCounter = charCount > CHAR_THRESHOLD;

  if (success) {
    return (
      <View style={styles.successBackdrop}>
        <Animated.View entering={ZoomIn.duration(280)} style={styles.successCircle}>
          <Ionicons name="checkmark" size={36} color={colors.surface} />
        </Animated.View>
        <Animated.View entering={FadeIn.duration(220).delay(120)}>
          <AppText style={styles.successTitle}>{t('review.successTitle')}</AppText>
          <AppText style={styles.successHint}>{t('review.successHint')}</AppText>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Pressable
        onPress={() => navigation.goBack()}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <View style={styles.grabber} />

        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* Salon anchor row */}
            <View style={styles.anchorRow}>
              <Avatar name={salonName} size={36} />
              <View style={{ flex: 1 }}>
                <AppText style={styles.anchorLabel}>{t('review.reviewingLabel')}</AppText>
                <AppText style={styles.anchorName} numberOfLines={1}>{salonName}</AppText>
              </View>
            </View>

            {/* Stars + live label */}
            <View style={styles.starsBlock}>
              <View style={styles.starsRow}>
                {STARS.map((s) => (
                  <StarButton
                    key={s}
                    filled={s <= rating}
                    onPress={() => handleStarPress(s)}
                  />
                ))}
              </View>
              <Animated.View
                key={ratingLabel}
                entering={FadeIn.duration(160)}
                layout={Layout.springify()}
              >
                <AppText
                  style={[
                    styles.ratingLabel,
                    rating > 0 ? styles.ratingLabelActive : null,
                  ]}
                  numberOfLines={1}
                >
                  {ratingLabel}
                </AppText>
              </Animated.View>
            </View>

            {/* Comment */}
            <View style={styles.commentBlock}>
              <TextInput
                value={comment}
                onChangeText={(text) => setComment(text.slice(0, CHAR_LIMIT))}
                placeholder={t('review.commentPlaceholder')}
                placeholderTextColor={colors.slateSoft}
                multiline
                style={styles.commentInput}
                textAlignVertical="top"
              />
              {showCounter && (
                <AppText
                  style={[
                    styles.counter,
                    charCount > CHAR_LIMIT - 20 && styles.counterWarn,
                  ]}
                >
                  {charCount} / {CHAR_LIMIT}
                </AppText>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <AppText style={styles.holdHint}>{t('review.holdHint')}</AppText>
            <HoldToConfirm
              label={t('review.submit')}
              onConfirm={() => mutation.mutate()}
              disabled={rating === 0}
              loading={mutation.isPending}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function StarButton({ filled, onPress }: { filled: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.84, { mass: 0.4, damping: 14, stiffness: 220 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { mass: 0.4, damping: 14, stiffness: 220 });
  };

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} hitSlop={6}>
      <Animated.View style={animatedStyle}>
        <Ionicons
          name={filled ? 'star' : 'star-outline'}
          size={42}
          color={filled ? colors.star : colors.hairline}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(11,14,20,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    // `height` (not `maxHeight`) so the inner `KeyboardAvoidingView` has a
    // concrete parent size to flex inside — otherwise the sheet collapses to
    // the grabber's height and stars/comment never render.
    height: '88%',
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.hairline,
    marginBottom: 8,
  },
  kav: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.section,
    paddingBottom: 24,
  },

  anchorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    marginBottom: 18,
  },
  anchorLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.slate,
  },
  anchorName: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    color: colors.ink,
    marginTop: 2,
  },

  /* Stars */
  starsBlock: {
    alignItems: 'center',
    marginBottom: 28,
    gap: 14,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingLabel: {
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
    color: colors.slateSoft,
    textAlign: 'center',
    minHeight: 22,
  },
  ratingLabelActive: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.3,
  },

  /* Comment */
  commentBlock: {
    minHeight: 140,
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  commentInput: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
    minHeight: 120,
    padding: 0,
    textAlign: 'auto',
  },
  counter: {
    alignSelf: 'flex-end',
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.slateSoft,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  counterWarn: {
    color: colors.warn,
  },

  /* Footer */
  footer: {
    paddingHorizontal: spacing.section,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
  },
  holdHint: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.slateSoft,
    textAlign: 'center',
  },

  /* Success */
  successBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11,14,20,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.ok,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: colors.surface,
    textAlign: 'center',
  },
  successHint: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 6,
  },
});
