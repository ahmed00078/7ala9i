import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Share,
  Linking,
  Dimensions,
  RefreshControl,
  ScrollView,
  Pressable,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppText } from '../../components/ui/AppText';
import { ErrorState } from '../../components/ui/ErrorState';
import { useLanguage } from '../../contexts/LanguageContext';
import { salonsApi } from '../../api/salons';
import { favoritesApi } from '../../api/favorites';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { formatCurrency, formatDuration } from '../../utils/formatters';
import { useSalonOpenStatus } from '../../hooks/useSalonOpenStatus';
import { warmMapStyle } from '../../theme/mapStyle';
import { getImageUrl } from '../../api/client';
import {
  PressablePremium,
  InkPin,
  Avatar,
  Skeleton,
} from '../../components/premium';
import { NoReviewsIllustration } from '../../components/premium/illustrations';
import { useIsRTL } from '../../i18n/useIsRTL';
import type { ClientHomeScreenProps } from '../../types/navigation';

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_H = 360;
const STICKY_THRESHOLD = HERO_H - 100;

export function SalonDetailScreen({ route, navigation }: ClientHomeScreenProps<'SalonDetail'>) {
  const { salonId, preview = false } = route.params;
  const { t } = useTranslation();
  const { language } = useLanguage();
  const rtl = useIsRTL();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, refetch } = useQuery({
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
    enabled: !preview,
  });

  const favorites: any[] = favData?.data || [];
  const isFavorited = favorites.some(
    (f) => f.salon_id === salonId || f.salon?.id === salonId || f.id === salonId,
  );

  const toggleFavorite = useMutation({
    mutationFn: () => (isFavorited ? favoritesApi.remove(salonId) : favoritesApi.add(salonId)),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      const previous = queryClient.getQueryData(['favorites']);
      queryClient.setQueryData(['favorites'], (old: any) => {
        if (!old?.data) return old;
        if (isFavorited) {
          return {
            ...old,
            data: old.data.filter(
              (f: any) => f.salon_id !== salonId && f.salon?.id !== salonId && f.id !== salonId,
            ),
          };
        }
        return { ...old, data: [...old.data, { salon_id: salonId, id: salonId }] };
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['favorites'], ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const scrollViewRef = React.useRef<any>(null);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const heroParallax = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-HERO_H, 0, HERO_H], [-HERO_H, 0, HERO_H * 0.5], Extrapolation.CLAMP) },
      { scale: interpolate(scrollY.value, [-HERO_H, 0], [1.4, 1], Extrapolation.CLAMP) },
    ],
  }));

  const stickyHeaderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [STICKY_THRESHOLD - 40, STICKY_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [STICKY_THRESHOLD - 40, STICKY_THRESHOLD],
          [-8, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const floatingChromeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, STICKY_THRESHOLD - 60, STICKY_THRESHOLD],
      [1, 1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const salon: any = data?.data;
  const reviews: any[] = reviewsData?.data || [];
  const openStatus = useSalonOpenStatus(salon?.working_hours);

  if (isLoading) return <SalonDetailSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;
  if (!salon) return null;

  const displayName = language === 'ar' && salon.name_ar ? salon.name_ar : salon.name;
  const description =
    language === 'ar' && salon.description_ar ? salon.description_ar : salon.description;
  const hasCoords = salon.lat != null && salon.lng != null;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${t('salon.shareMessage', { name: displayName })}\nhalagi://salon/${salonId}`,
      });
    } catch {}
  };

  const handleDirections = () => {
    if (!hasCoords) return;
    const url =
      Platform.OS === 'ios'
        ? `maps:0,0?q=${encodeURIComponent(displayName)}@${salon.lat},${salon.lng}`
        : `geo:0,0?q=${salon.lat},${salon.lng}(${encodeURIComponent(displayName)})`;
    Linking.openURL(url);
  };

  const photos = (salon.photos || []) as Array<{ id: string; photo_url: string }>;

  return (
    <View style={styles.container}>
      {/* Sticky translucent header on scroll */}
      <Animated.View style={[styles.stickyHeader, { paddingTop: insets.top + 6 }, stickyHeaderStyle]}>
        <View style={styles.stickyRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={6} style={styles.stickyIcon}>
            <Ionicons
              name={rtl ? 'chevron-forward' : 'chevron-back'}
              size={22}
              color={colors.ink}
            />
          </Pressable>
          <AppText style={styles.stickyTitle} numberOfLines={1}>{displayName}</AppText>
          {preview ? (
            <View style={[styles.stickyIcon, styles.previewBadge]}>
              <Ionicons name="eye-outline" size={16} color={colors.accent} />
            </View>
          ) : (
            <Pressable onPress={() => toggleFavorite.mutate()} hitSlop={6} style={styles.stickyIcon}>
              <Ionicons
                name={isFavorited ? 'heart' : 'heart-outline'}
                size={22}
                color={isFavorited ? colors.danger : colors.ink}
              />
            </Pressable>
          )}
        </View>
      </Animated.View>

      {/* Floating chrome over the hero */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.topChromeWrap,
          { paddingTop: insets.top + 6 },
          floatingChromeStyle,
        ]}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={6} style={styles.chromeBtn}>
          <Ionicons
            name={rtl ? 'chevron-forward' : 'chevron-back'}
            size={20}
            color={colors.surface}
          />
        </Pressable>
        {preview ? (
          <View style={styles.chromePreviewPill}>
            <Ionicons name="eye" size={12} color={colors.surface} />
            <AppText style={styles.chromePreviewLabel}>
              {t('owner.preview.subtitle')}
            </AppText>
          </View>
        ) : (
          <View style={styles.chromeRight}>
            <Pressable onPress={handleShare} hitSlop={6} style={styles.chromeBtn}>
              <Ionicons name="share-outline" size={18} color={colors.surface} />
            </Pressable>
            <Pressable onPress={() => toggleFavorite.mutate()} hitSlop={6} style={styles.chromeBtn}>
              <Ionicons
                name={isFavorited ? 'heart' : 'heart-outline'}
                size={20}
                color={isFavorited ? colors.danger : colors.surface}
              />
            </Pressable>
          </View>
        )}
      </Animated.View>

      <Animated.ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
            progressViewOffset={120}
          />
        }
      >
        {/* Hero parallax photo */}
        <Animated.View style={[styles.hero, heroParallax]}>
          <ParallaxCarousel photos={photos} />
          <LinearGradient
            colors={['transparent', 'rgba(11,14,20,0.85)']}
            start={{ x: 0.5, y: 0.55 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.heroBottom} pointerEvents="none">
            <AppText style={styles.heroName} numberOfLines={2}>{displayName}</AppText>
            <View style={styles.heroMetaRow}>
              <Ionicons name="star" size={14} color={colors.star} />
              <AppText style={styles.heroMetaText}>
                {(salon.avg_rating ?? 0).toFixed(1)}
              </AppText>
              <AppText style={styles.heroMetaSep}>·</AppText>
              <AppText style={styles.heroMetaText}>
                {t('salon.reviewCount', { count: salon.total_reviews ?? 0 })}
              </AppText>
              {openStatus.todayLabel && (
                <>
                  <AppText style={styles.heroMetaSep}>·</AppText>
                  <View
                    style={[
                      styles.openDot,
                      openStatus.isOpen ? styles.openDotOpen : styles.openDotClosed,
                    ]}
                  />
                  <AppText style={styles.heroMetaText} numberOfLines={1}>
                    {openStatus.isOpen
                      ? t('salon.openUntil', { time: openStatus.todayLabel })
                      : t('salon.opensAt', { time: openStatus.todayLabel })}
                  </AppText>
                </>
              )}
            </View>
            <View style={styles.heroAddressRow}>
              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.85)" />
              <AppText style={styles.heroAddress} numberOfLines={1}>
                {salon.address || salon.city}
              </AppText>
            </View>
          </View>
        </Animated.View>

        {/* Body */}
        <View style={styles.body}>
          {/* Services */}
          <View style={styles.sectionHead}>
            <AppText style={styles.sectionTitle}>{t('salon.services')}</AppText>
          </View>

          {(salon.service_categories || []).length === 0 ? (
            <View style={styles.emptyBox}>
              <AppText style={styles.emptyText}>{t('salon.noServices')}</AppText>
            </View>
          ) : (
            (salon.service_categories || []).map((cat: any) => (
              <View key={cat.id} style={styles.categoryBlock}>
                <AppText style={styles.categoryLabel} numberOfLines={1}>
                  {language === 'ar' && cat.name_ar ? cat.name_ar : cat.name}
                </AppText>
                {cat.services.map((svc: any, idx: number) => {
                  const svcName = language === 'ar' && svc.name_ar ? svc.name_ar : svc.name;
                  const isLast = idx === cat.services.length - 1;
                  return (
                    <View
                      key={svc.id}
                      style={[styles.serviceRow, isLast && styles.serviceRowLast]}
                    >
                      <View style={{ flex: 1 }}>
                        <AppText style={styles.serviceName} numberOfLines={1}>{svcName}</AppText>
                        <View style={styles.serviceMetaRow}>
                          <Ionicons name="time-outline" size={11} color={colors.slateSoft} />
                          <AppText style={styles.serviceMeta}>{formatDuration(svc.duration)}</AppText>
                          <AppText style={styles.serviceMetaSep}>·</AppText>
                          <AppText style={styles.servicePrice}>{formatCurrency(svc.price)}</AppText>
                        </View>
                      </View>
                      {preview ? (
                        <AppText style={styles.servicePricePreview}>
                          {formatCurrency(svc.price)}
                        </AppText>
                      ) : (
                        <PressablePremium
                          onPress={() =>
                            navigation.navigate('BookingFlow', {
                              salonId,
                              serviceId: svc.id,
                              serviceName: svcName,
                              duration: svc.duration,
                              price: svc.price,
                            })
                          }
                          pressScale={0.95}
                          haptic="selection"
                          style={styles.bookBtn}
                        >
                          <AppText style={styles.bookBtnText}>{t('salon.book')}</AppText>
                        </PressablePremium>
                      )}
                    </View>
                  );
                })}
              </View>
            ))
          )}

          {/* Description */}
          {description ? (
            <View style={styles.descBlock}>
              <AppText style={styles.sectionTitle}>{t('salon.about')}</AppText>
              <AppText style={styles.descText}>{description}</AppText>
            </View>
          ) : null}

          {/* Location preview */}
          {hasCoords && (
            <View style={styles.mapBlock}>
              <AppText style={styles.sectionTitle}>{t('salon.location')}</AppText>
              <View style={styles.mapCard}>
                <MapView
                  style={styles.mapCardMap}
                  provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                  customMapStyle={warmMapStyle as any}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  initialRegion={{
                    latitude: salon.lat,
                    longitude: salon.lng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  <Marker coordinate={{ latitude: salon.lat, longitude: salon.lng }} anchor={{ x: 0.5, y: 1 }}>
                    <InkPin initial={displayName[0]} selected />
                  </Marker>
                </MapView>
              </View>
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={14} color={colors.accent} />
                <AppText style={styles.addressText} numberOfLines={2}>
                  {salon.address || salon.city}
                </AppText>
              </View>
              <PressablePremium
                onPress={handleDirections}
                pressScale={0.97}
                haptic="selection"
                style={styles.directionsBtn}
              >
                <Ionicons name="navigate-outline" size={14} color={colors.ink} />
                <AppText style={styles.directionsText}>{t('map.openInMaps')}</AppText>
              </PressablePremium>
            </View>
          )}

          {/* Working hours */}
          {salon.working_hours?.length > 0 && (
            <View style={styles.hoursBlock}>
              <AppText style={styles.sectionTitle}>{t('salon.hours')}</AppText>
              {salon.working_hours.map((wh: any, idx: number) => {
                const isLast = idx === salon.working_hours.length - 1;
                return (
                  <View
                    key={wh.id}
                    style={[styles.hoursRow, !isLast && styles.hoursRowDivider]}
                  >
                    <AppText style={styles.hoursDay}>{getDayName(wh.day_of_week, language)}</AppText>
                    <AppText
                      style={[
                        styles.hoursTime,
                        wh.is_closed && styles.hoursClosed,
                      ]}
                    >
                      {wh.is_closed
                        ? t('common.closed')
                        : `${String(wh.open_time).slice(0, 5)} – ${String(wh.close_time).slice(0, 5)}`}
                    </AppText>
                  </View>
                );
              })}
            </View>
          )}

          {/* Reviews preview */}
          <View style={styles.reviewsBlock}>
            <View style={styles.reviewsHead}>
              <AppText style={styles.sectionTitle}>{t('salon.reviews')}</AppText>
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={12} color={colors.star} />
                <AppText style={styles.ratingPillText}>
                  {(salon.avg_rating ?? 0).toFixed(1)}
                </AppText>
              </View>
            </View>
            {reviews.length > 0 && (
              <View style={styles.verifiedRow}>
                <Ionicons name="shield-checkmark-outline" size={11} color={colors.ok} />
                <AppText style={styles.verifiedLabel}>{t('salon.verifiedReviews')}</AppText>
              </View>
            )}
            {reviews.length === 0 ? (
              <View style={styles.emptyBox}>
                <NoReviewsIllustration size={90} color={colors.accent} />
                <AppText style={styles.emptyText}>{t('salon.noReviews')}</AppText>
              </View>
            ) : (
              <FlatList
                horizontal
                data={reviews.slice(0, 6)}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.reviewsRow}
                ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                renderItem={({ item }) => (
                  <View style={styles.reviewCard}>
                    <View style={styles.reviewHead}>
                      <Avatar
                        name={`${item.client?.first_name ?? ''} ${item.client?.last_name ?? ''}`.trim() || '?'}
                        uri={getImageUrl(item.client?.avatar_url)}
                        size={28}
                      />
                      <View style={{ flex: 1 }}>
                        <AppText style={styles.reviewerName} numberOfLines={1}>
                          {item.client?.first_name} {item.client?.last_name}
                        </AppText>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Ionicons
                              key={i}
                              name={i < (item.rating ?? 0) ? 'star' : 'star-outline'}
                              size={10}
                              color={i < (item.rating ?? 0) ? colors.star : colors.hairline}
                            />
                          ))}
                        </View>
                      </View>
                    </View>
                    {item.comment ? (
                      <AppText style={styles.reviewComment} numberOfLines={4}>
                        {item.comment}
                      </AppText>
                    ) : null}
                    {item.owner_reply ? (
                      <View style={styles.ownerReply}>
                        <AppText style={styles.ownerReplyCaption}>
                          {t('salon.ownerReplied')}
                        </AppText>
                        <AppText style={styles.ownerReplyBody} numberOfLines={3}>
                          {item.owner_reply}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                )}
              />
            )}
          </View>

          {/* Phone */}
          {salon.phone ? (
            <Pressable
              onPress={() => Linking.openURL(`tel:${salon.phone}`)}
              style={styles.phoneCard}
            >
              <View style={styles.phoneIcon}>
                <Ionicons name="call" size={16} color={colors.surface} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={styles.phoneLabel}>{t('salon.phone')}</AppText>
                <AppText style={styles.phoneValue} numberOfLines={1}>{salon.phone}</AppText>
              </View>
              <Ionicons
                name={rtl ? 'chevron-back' : 'chevron-forward'}
                size={18}
                color={colors.slateSoft}
              />
            </Pressable>
          ) : null}

          <View style={{ height: 32 }} />
        </View>
      </Animated.ScrollView>

      {/* Sticky book CTA */}
      {!preview && (
        <View style={[styles.stickyBookBar, { paddingBottom: insets.bottom + 8 }]}>
          <PressablePremium
            onPress={() => scrollViewRef.current?.scrollTo({ y: HERO_H, animated: true })}
            pressScale={0.97}
            haptic="selection"
            style={styles.stickyBookBtn}
          >
            <AppText style={styles.stickyBookText}>{t('salon.bookAppointment')}</AppText>
          </PressablePremium>
        </View>
      )}
    </View>
  );
}

function ParallaxCarousel({ photos }: { photos: Array<{ id: string; photo_url: string }> }) {
  const [index, setIndex] = useState(0);

  if (!photos.length) {
    return (
      <View style={[styles.heroImage, styles.heroPlaceholder]}>
        <Ionicons name="cut-outline" size={64} color="rgba(255,255,255,0.6)" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          setIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
        }}
        style={StyleSheet.absoluteFillObject}
      >
        {photos.map((p) => (
          <View key={p.id} style={styles.heroImage}>
            <Image
              source={{ uri: getImageUrl(p.photo_url) }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              transition={180}
            />
          </View>
        ))}
      </ScrollView>
      {photos.length > 1 && (
        <View style={styles.dotsRow} pointerEvents="none">
          {photos.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </>
  );
}

function SalonDetailSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Skeleton.Block width="100%" height={HERO_H} radius={0} />
      <View style={{ padding: spacing.section, marginTop: -32 }}>
        <View style={{ backgroundColor: colors.canvas, borderRadius: 24, padding: 18 }}>
          <Skeleton.Block width="65%" height={22} radius={6} />
          <Skeleton.Block width="40%" height={14} radius={4} style={{ marginTop: 10 }} />
          <Skeleton.Row gap={10} style={{ marginTop: 18 }}>
            <Skeleton.Block width={84} height={28} radius={999} />
            <Skeleton.Block width={84} height={28} radius={999} />
          </Skeleton.Row>
        </View>
        <Skeleton.Group gap={12} style={{ marginTop: 22 }}>
          <Skeleton.Block width={140} height={18} radius={6} />
          <Skeleton.Block width="100%" height={70} radius={14} />
          <Skeleton.Block width="100%" height={70} radius={14} />
          <Skeleton.Block width="100%" height={70} radius={14} />
        </Skeleton.Group>
      </View>
    </View>
  );
}

function getDayName(dayIdx: number, lang: string): string {
  const en = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const fr = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const ar = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];
  const arr = lang === 'fr' ? fr : lang === 'ar' ? ar : en;
  return arr[dayIdx] ?? '';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },

  /* Sticky header */
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(247,246,242,0.96)',
    paddingBottom: 10,
    zIndex: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  stickyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: 12,
  },
  stickyIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyTitle: {
    flex: 1,
    fontFamily: 'Outfit-SemiBold',
    fontSize: 16,
    color: colors.ink,
    textAlign: 'center',
  },

  /* Top chrome (over hero) */
  topChromeWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    zIndex: 10,
  },
  chromeRight: {
    flexDirection: 'row',
    gap: 8,
  },
  chromeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(11,14,20,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chromePreviewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(11,14,20,0.45)',
  },
  chromePreviewLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 11,
    color: colors.surface,
    letterSpacing: 0.3,
  },
  previewBadge: {
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
  },
  servicePricePreview: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
    color: colors.ink,
    marginStart: 12,
  },

  /* Hero */
  scrollContent: { paddingBottom: 120 },
  hero: {
    width: SCREEN_W,
    height: HERO_H,
    overflow: 'hidden',
  },
  heroImage: {
    width: SCREEN_W,
    height: HERO_H,
  },
  heroPlaceholder: {
    backgroundColor: colors.inkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.surface,
  },
  heroBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 28,
    paddingHorizontal: spacing.section,
  },
  heroName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 28,
    lineHeight: 34,
    color: colors.surface,
    letterSpacing: -0.6,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  heroMetaText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  heroMetaSep: { fontFamily: 'Outfit-Regular', color: 'rgba(255,255,255,0.45)', marginHorizontal: 2 },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginEnd: 2,
  },
  openDotOpen: { backgroundColor: '#A4E2BD' },
  openDotClosed: { backgroundColor: 'rgba(255,255,255,0.45)' },
  heroAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  heroAddress: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },

  /* Body */
  body: {
    backgroundColor: colors.canvas,
    paddingTop: 24,
    paddingHorizontal: spacing.section,
    gap: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },

  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.3,
    marginBottom: 12,
  },

  /* Services */
  categoryBlock: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingTop: 12,
    marginBottom: 14,
  },
  categoryLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.slate,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  serviceRowLast: {},
  serviceName: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    color: colors.ink,
  },
  serviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  serviceMeta: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.slate,
  },
  serviceMetaSep: { fontFamily: 'Outfit-Regular', color: colors.slateSoft, marginHorizontal: 2 },
  servicePrice: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
    color: colors.ink,
  },
  bookBtn: {
    backgroundColor: colors.ink,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  bookBtnText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 12,
    color: colors.surface,
    letterSpacing: 0.3,
  },

  /* Description */
  descBlock: {
    paddingBottom: 4,
  },
  descText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: colors.slate,
  },

  /* Map preview */
  mapBlock: {
    paddingBottom: 4,
  },
  mapCard: {
    height: 160,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  mapCardMap: { ...StyleSheet.absoluteFillObject },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 12,
  },
  addressText: {
    flex: 1,
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.slate,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  directionsText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
    color: colors.ink,
  },

  /* Hours */
  hoursBlock: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  hoursRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  hoursDay: {
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
    color: colors.ink,
  },
  hoursTime: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.slate,
    fontVariant: ['tabular-nums'],
  },
  hoursClosed: { color: colors.danger },

  /* Reviews */
  reviewsBlock: {},
  reviewsHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 12,
  },
  ratingPillText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 12,
    color: colors.ink,
  },
  reviewsRow: {
    paddingRight: 8,
  },
  reviewCard: {
    width: 240,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  reviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewerName: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
    color: colors.ink,
  },
  reviewComment: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    lineHeight: 18,
    color: colors.slate,
  },
  ownerReply: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    backgroundColor: colors.surfaceAlt,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  ownerReplyCaption: {
    fontFamily: 'Outfit-Medium',
    fontSize: 10,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  ownerReplyBody: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.ink,
    lineHeight: 16,
  },

  /* Phone */
  phoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
  },
  phoneIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.slate,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  phoneValue: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    color: colors.ink,
    marginTop: 2,
  },

  /* Verified reviews */
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 12,
  },
  verifiedLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.slate,
  },

  /* Sticky book CTA */
  stickyBookBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(242,246,246,0.97)',
    paddingHorizontal: spacing.section,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  stickyBookBtn: {
    backgroundColor: colors.ink,
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyBookText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    color: colors.surface,
    letterSpacing: -0.2,
  },

  /* Empty */
  emptyBox: {
    paddingVertical: 28,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.slateSoft,
  },
});
