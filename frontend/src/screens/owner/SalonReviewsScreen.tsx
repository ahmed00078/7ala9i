import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { format, parseISO, subDays, isAfter } from 'date-fns';

import { AppText } from '../../components/ui/AppText';
import { salonsApi } from '../../api/salons';
import { ownerApi } from '../../api/owner';
import { getImageUrl } from '../../api/client';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import {
  Avatar,
  PressablePremium,
  BottomSheetForm,
  FloatingInput,
  useToast,
  type BottomSheetFormRef,
} from '../../components/premium';
import { NoReviewsIllustration } from '../../components/premium/illustrations';
import { useIsRTL } from '../../i18n/useIsRTL';
import { OwnerPreviewScreenProps } from '../../types/navigation';

type Props = OwnerPreviewScreenProps<'SalonReviews'>;
type Filter = 'all' | '5' | '4' | '3-' | 'text';

interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  owner_reply?: string | null;
  owner_reply_at?: string | null;
  created_at?: string | null;
  client?: { first_name?: string | null; last_name?: string | null; avatar_url?: string | null };
}

export function SalonReviewsScreen({ route }: Props) {
  const { salonId, salonName } = route.params;
  const { t } = useTranslation();
  const rtl = useIsRTL();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const replySheetRef = useRef<BottomSheetFormRef>(null);
  const [activeReview, setActiveReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['salon', 'reviews', salonId],
    queryFn: () => salonsApi.getReviews(salonId, { per_page: 100 }),
  });

  const reviews: Review[] = data?.data?.items || data?.data || [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['salon', 'reviews', salonId] });
    queryClient.invalidateQueries({ queryKey: ['salon', salonId] });
  };

  const saveMut = useMutation({
    mutationFn: ({ id, text, isUpdate }: { id: string; text: string; isUpdate: boolean }) =>
      isUpdate ? ownerApi.updateReviewReply(id, text) : ownerApi.replyToReview(id, text),
    onSuccess: () => {
      invalidate();
      toast.show({ message: t('owner.reviewsScreen.replySaved'), variant: 'saved' });
      replySheetRef.current?.dismiss();
    },
    onError: () => toast.show({ message: t('errors.server'), variant: 'error' }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => ownerApi.deleteReviewReply(id),
    onSuccess: () => {
      invalidate();
      toast.show({ message: t('owner.reviewsScreen.replyDeleted'), variant: 'saved' });
      replySheetRef.current?.dismiss();
    },
  });

  const openReply = (review: Review) => {
    setActiveReview(review);
    setReplyText(review.owner_reply ?? '');
    replySheetRef.current?.present();
  };

  const stats = useMemo(() => computeStats(reviews), [reviews]);

  const filtered = useMemo(() => {
    switch (filter) {
      case '5':
        return reviews.filter((r) => r.rating === 5);
      case '4':
        return reviews.filter((r) => r.rating === 4);
      case '3-':
        return reviews.filter((r) => r.rating <= 3);
      case 'text':
        return reviews.filter((r) => !!(r.comment ?? '').trim());
      default:
        return reviews;
    }
  }, [reviews, filter]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <PressablePremium
            haptic="selection"
            pressScale={0.92}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                // Cross-tab entry (notification deep-link) may land with no
                // history — fall back to the SalonPreview root of this stack.
                (navigation as any).navigate('SalonPreview');
              }
            }}
            style={styles.backBtn}
          >
            <Ionicons
              name={rtl ? 'chevron-forward' : 'chevron-back'}
              size={20}
              color={colors.ink}
            />
          </PressablePremium>
          <View style={styles.headerCenter}>
            <AppText style={styles.eyebrow}>{salonName}</AppText>
            <AppText style={styles.headerTitle}>
              {t('owner.reviewsScreen.title')}
            </AppText>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {isLoading ? (
        <LoadingScreen />
      ) : reviews.length === 0 ? (
        <EmptyReviews />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => <ReviewRow review={item} onReply={() => openReply(item)} />}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              <SummaryCard stats={stats} />
              <FilterChips value={filter} onChange={setFilter} stats={stats} />
              {filtered.length === 0 && (
                <View style={styles.noMatch}>
                  <AppText style={styles.noMatchText}>
                    {t('owner.reviewsScreen.filterNoResults')}
                  </AppText>
                </View>
              )}
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <BottomSheetForm
        ref={replySheetRef}
        title={
          activeReview?.owner_reply
            ? t('owner.reviewsScreen.editReplyTitle')
            : t('owner.reviewsScreen.replyTitle')
        }
        snapPoints={['60%']}
        onDismiss={() => setActiveReview(null)}
        footer={
          <View style={{ gap: 8 }}>
            <PressablePremium
              haptic="impact"
              pressScale={0.97}
              onPress={() => {
                if (!activeReview) return;
                const trimmed = replyText.trim();
                if (!trimmed) return;
                saveMut.mutate({
                  id: activeReview.id,
                  text: trimmed,
                  isUpdate: Boolean(activeReview.owner_reply),
                });
              }}
              style={{
                height: 52,
                borderRadius: 26,
                backgroundColor: colors.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText style={[typography.button, { color: colors.surface }]}>
                {saveMut.isPending ? t('common.saving') : t('owner.reviewsScreen.replySubmit')}
              </AppText>
            </PressablePremium>
            {activeReview?.owner_reply ? (
              <PressablePremium
                haptic="warning"
                pressScale={0.97}
                onPress={() => activeReview && deleteMut.mutate(activeReview.id)}
                style={{
                  height: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText style={[typography.button, { color: colors.danger }]}>
                  {t('owner.reviewsScreen.deleteReply')}
                </AppText>
              </PressablePremium>
            ) : null}
          </View>
        }
      >
        <FloatingInput
          label={t('owner.reviewsScreen.replyPlaceholder')}
          value={replyText}
          onChangeText={setReplyText}
          multiline
          maxLength={500}
          numberOfLines={6}
          style={{ minHeight: 100, textAlignVertical: 'top' }}
        />
        <AppText style={{ ...typography.caption, color: colors.slateSoft, marginTop: 4 }}>
          {replyText.length}/500
        </AppText>
      </BottomSheetForm>
    </View>
  );
}

/* ── Summary card ───────────────────────────────────────────────── */

function SummaryCard({ stats }: { stats: ReturnType<typeof computeStats> }) {
  const { t } = useTranslation();
  const { avg, total, recent, histogram } = stats;
  const max = Math.max(...histogram, 1);
  const formatted = avg > 0 ? avg.toFixed(1) : '—';

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryLeft}>
        <AppText style={styles.summaryAvg}>{formatted}</AppText>
        <View style={styles.summaryStars}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Ionicons
              key={s}
              name={s <= Math.round(avg) ? 'star' : 'star-outline'}
              size={14}
              color={colors.star}
            />
          ))}
        </View>
        <AppText style={styles.summaryTotal}>
          {total} {t('salon.reviews').toLowerCase()}
        </AppText>
        {recent > 0 && (
          <AppText style={styles.summaryRecent}>
            {t('owner.reviewsScreen.summaryRecent', { count: recent })}
          </AppText>
        )}
      </View>

      <View style={styles.summaryDivider} />

      <View style={styles.summaryRight}>
        {[5, 4, 3, 2, 1].map((star) => {
          const count = histogram[star - 1];
          const pct = (count / max) * 100;
          return (
            <View key={star} style={styles.histRow}>
              <AppText style={styles.histLabel}>{star}</AppText>
              <View style={styles.histTrack}>
                <View style={[styles.histFill, { width: `${pct}%` }]} />
              </View>
              <AppText style={styles.histCount}>{count}</AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ── Filter chips ───────────────────────────────────────────────── */

function FilterChips({
  value,
  onChange,
  stats,
}: {
  value: Filter;
  onChange: (f: Filter) => void;
  stats: ReturnType<typeof computeStats>;
}) {
  const { t } = useTranslation();
  const chips: { key: Filter; label: string; count?: number }[] = [
    { key: 'all', label: t('owner.reviewsScreen.filterAll'), count: stats.total },
    { key: '5', label: '5★', count: stats.histogram[4] },
    { key: '4', label: '4★', count: stats.histogram[3] },
    { key: '3-', label: '3★-', count: stats.histogram[0] + stats.histogram[1] + stats.histogram[2] },
    { key: 'text', label: t('owner.reviewsScreen.filterWithText'), count: stats.withText },
  ];

  return (
    <View style={styles.chipsRow}>
      <FlatList
        horizontal
        data={chips}
        keyExtractor={(c) => c.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContent}
        renderItem={({ item }) => {
          const active = item.key === value;
          return (
            <PressablePremium
              haptic="selection"
              pressScale={0.96}
              onPress={() => onChange(item.key)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <AppText style={[styles.chipLabel, active && styles.chipLabelActive]}>
                {item.label}
                {item.count != null && item.count > 0 ? `  ${item.count}` : ''}
              </AppText>
            </PressablePremium>
          );
        }}
      />
    </View>
  );
}

/* ── Review row ─────────────────────────────────────────────────── */

function ReviewRow({ review, onReply }: { review: Review; onReply: () => void }) {
  const { t } = useTranslation();
  const fullName = [review.client?.first_name, review.client?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  const dateLabel = review.created_at
    ? format(parseISO(review.created_at), 'd MMM yyyy')
    : '';
  const replyDateLabel = review.owner_reply_at
    ? format(parseISO(review.owner_reply_at), 'd MMM yyyy')
    : '';

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Avatar name={fullName || '?'} uri={getImageUrl(review.client?.avatar_url)} size={36} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText style={styles.reviewerName} numberOfLines={1}>
            {fullName || '—'}
          </AppText>
          <View style={styles.reviewMeta}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons
                key={s}
                name={s <= review.rating ? 'star' : 'star-outline'}
                size={11}
                color={colors.star}
              />
            ))}
            {!!dateLabel && (
              <AppText style={styles.reviewDate}>  ·  {dateLabel}</AppText>
            )}
          </View>
        </View>
        <PressablePremium
          haptic="selection"
          pressScale={0.9}
          onPress={onReply}
          style={styles.replyBtn}
          accessibilityLabel={t('owner.reviewsScreen.replyAria')}
        >
          <Ionicons
            name={review.owner_reply ? 'create' : 'create-outline'}
            size={16}
            color={review.owner_reply ? colors.accent : colors.slate}
          />
        </PressablePremium>
      </View>
      {!!review.comment?.trim() && (
        <AppText style={styles.reviewComment}>{review.comment}</AppText>
      )}
      {review.owner_reply ? (
        <View style={styles.replyQuote}>
          <AppText style={styles.replyCaption}>
            {t('owner.reviewsScreen.ownerRepliedOn', { date: replyDateLabel })}
          </AppText>
          <AppText style={styles.replyBody}>{review.owner_reply}</AppText>
        </View>
      ) : null}
    </View>
  );
}

/* ── Empty state ────────────────────────────────────────────────── */

function EmptyReviews() {
  const { t } = useTranslation();
  return (
    <View style={styles.empty}>
      <NoReviewsIllustration />
      <AppText style={styles.emptyTitle}>
        {t('owner.reviewsScreen.noReviewsTitle')}
      </AppText>
      <AppText style={styles.emptyHint}>
        {t('owner.reviewsScreen.noReviewsHint')}
      </AppText>
    </View>
  );
}

/* ── helpers ────────────────────────────────────────────────────── */

function computeStats(reviews: Review[]) {
  const histogram = [0, 0, 0, 0, 0]; // index 0 = 1★ … index 4 = 5★
  let total = 0;
  let sum = 0;
  let recent = 0;
  let withText = 0;
  const cutoff = subDays(new Date(), 30);

  for (const r of reviews) {
    if (r.rating >= 1 && r.rating <= 5) {
      histogram[r.rating - 1] += 1;
      sum += r.rating;
      total += 1;
    }
    if (r.created_at && isAfter(parseISO(r.created_at), cutoff)) {
      recent += 1;
    }
    if ((r.comment ?? '').trim()) withText += 1;
  }

  return {
    total,
    avg: total > 0 ? sum / total : 0,
    histogram,
    recent,
    withText,
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: 6,
    paddingBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  eyebrow: {
    ...typography.caption,
    color: colors.slateSoft,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  headerTitle: {
    ...typography.header,
    color: colors.ink,
  },

  list: { padding: spacing.lg, paddingBottom: 40 },

  /* Summary card */
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.hero,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    marginBottom: 18,
  },
  summaryLeft: { width: 110, alignItems: 'flex-start', justifyContent: 'center' },
  summaryAvg: {
    fontFamily: 'Outfit-Black',
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1.2,
    color: colors.ink,
  },
  summaryStars: { flexDirection: 'row', gap: 2, marginTop: 4 },
  summaryTotal: {
    ...typography.bodySmall,
    color: colors.slate,
    marginTop: 8,
  },
  summaryRecent: {
    ...typography.caption,
    color: colors.accent,
    marginTop: 2,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
    marginHorizontal: 14,
  },
  summaryRight: { flex: 1, justifyContent: 'center', gap: 6 },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  histLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 11,
    color: colors.slate,
    width: 10,
  },
  histTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  histFill: { height: '100%', backgroundColor: colors.star, borderRadius: 3 },
  histCount: {
    fontFamily: 'Outfit-Medium',
    fontSize: 11,
    color: colors.slateSoft,
    width: 22,
    textAlign: 'right',
  },

  /* Filter chips */
  chipsRow: { marginHorizontal: -spacing.lg, marginBottom: 14 },
  chipsContent: { paddingHorizontal: spacing.lg, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  chipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipLabel: {
    fontFamily: 'Outfit-Medium',
    fontSize: 12,
    color: colors.slate,
    letterSpacing: 0.2,
  },
  chipLabelActive: { color: colors.surface, fontFamily: 'Outfit-SemiBold' },

  /* Review card */
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewerName: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    color: colors.ink,
  },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  reviewDate: {
    ...typography.caption,
    color: colors.slateSoft,
  },
  reviewComment: {
    ...typography.body,
    color: colors.slate,
    marginTop: 10,
    lineHeight: 20,
  },
  replyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyQuote: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    backgroundColor: colors.surfaceAlt,
    borderTopRightRadius: radius.input,
    borderBottomRightRadius: radius.input,
  },
  replyCaption: {
    fontFamily: 'Outfit-Medium',
    fontSize: 11,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  replyBody: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.ink,
    lineHeight: 19,
  },

  /* No-match filter banner */
  noMatch: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  noMatchText: {
    ...typography.bodySmall,
    color: colors.slateSoft,
  },

  /* Empty state */
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    ...typography.header,
    color: colors.ink,
    marginTop: 12,
  },
  emptyHint: {
    ...typography.body,
    color: colors.slate,
    textAlign: 'center',
  },
});
