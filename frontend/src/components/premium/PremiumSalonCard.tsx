import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText } from '../ui/AppText';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/spacing';
import { getImageUrl } from '../../api/client';
import { PressablePremium } from './PressablePremium';

export interface PremiumSalonCardSalon {
  id: string;
  name: string;
  name_ar?: string;
  address?: string;
  city: string;
  avg_rating: number;
  total_reviews: number;
  cover_photo_url?: string;
  distance_km?: number | null;
  is_open_now?: boolean | null;
  closes_at?: string | null;
  min_service_price?: number | null;
}

type Variant = 'hero' | 'compact' | 'portrait';

interface PremiumSalonCardProps {
  salon: PremiumSalonCardSalon;
  language?: string;
  variant?: Variant;
  /** Show the "Open · closes at HH:MM" pill. */
  openLabel?: string | null;
  isOpen?: boolean;
  onPress: () => void;
  style?: ViewStyle;
  /** Optional service price chips, shown on the hero variant. */
  servicePrices?: Array<{ id: string; label: string }>;
  /** Width override (defaults: hero = 280, portrait = grid cell, compact = 100%). */
  width?: number;
  height?: number;
}

/**
 * §5.7 — editorial salon card. Replaces the boxed-photo + paragraph layout with
 * three premium variants:
 *
 *  - **hero**: snap-scroll carousel card (Home "Recommended"). Photo fills the
 *    card, gradient mask at the bottom, salon name + rating chip, optional
 *    price chips.
 *  - **portrait**: 2-col grid (Favorites). Photo top, name + meta below.
 *  - **compact**: row (Search results, Map sheet). 64pt photo + meta.
 */
export function PremiumSalonCard({
  salon,
  language,
  variant = 'compact',
  openLabel,
  isOpen,
  onPress,
  style,
  servicePrices,
  width,
  height,
}: PremiumSalonCardProps) {
  const displayName = language === 'ar' && salon.name_ar ? salon.name_ar : salon.name;
  const imageUri = getImageUrl(salon.cover_photo_url);
  const { t } = useTranslation();

  // Derive open status from the salon payload when the caller didn't supply
  // explicit overrides — every caller used to manually wire these, now the
  // shared list endpoint provides is_open_now + closes_at directly.
  const resolvedIsOpen = isOpen ?? salon.is_open_now ?? undefined;
  const resolvedOpenLabel =
    openLabel !== undefined
      ? openLabel
      : resolvedIsOpen && salon.closes_at
        ? t('salon.closesAt', { time: String(salon.closes_at).slice(0, 5) })
        : undefined;

  if (variant === 'hero') {
    return (
      <PressablePremium
        onPress={onPress}
        pressScale={0.97}
        haptic="selection"
        style={[heroStyles.card, { width: width ?? 280, height: height ?? 320 }, style]}
        accessibilityRole="button"
        accessibilityLabel={displayName}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={heroStyles.image} contentFit="cover" transition={180} />
        ) : (
          <View style={[heroStyles.image, heroStyles.placeholder]}>
            <Ionicons name="cut-outline" size={48} color={colors.slateSoft} />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(11,14,20,0.72)']}
          start={{ x: 0.5, y: 0.45 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Rating chip top-end */}
        <View style={heroStyles.ratingChip}>
          <Ionicons name="star" size={11} color={colors.star} />
          <AppText style={heroStyles.ratingText}>{(salon.avg_rating ?? 0).toFixed(1)}</AppText>
        </View>

        {resolvedIsOpen != null && (
          <View style={[heroStyles.statusChip, resolvedIsOpen ? heroStyles.statusOpen : heroStyles.statusClosed]}>
            <View style={[heroStyles.statusDot, resolvedIsOpen ? heroStyles.statusDotOpen : heroStyles.statusDotClosed]} />
            <AppText style={[heroStyles.statusText, !resolvedIsOpen && heroStyles.statusTextClosed]} numberOfLines={1}>
              {resolvedIsOpen ? (resolvedOpenLabel ?? t('salon.openNow')) : (resolvedOpenLabel ?? t('salon.closedNow'))}
            </AppText>
          </View>
        )}

        <View style={heroStyles.bottomBlock}>
          <AppText style={heroStyles.name} numberOfLines={1}>{displayName}</AppText>
          <View style={heroStyles.metaRow}>
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.7)" />
            <AppText style={heroStyles.metaText} numberOfLines={1}>
              {salon.address || salon.city}
              {salon.distance_km != null && ` · ${salon.distance_km.toFixed(1)} km`}
            </AppText>
          </View>
          {servicePrices && servicePrices.length > 0 && (
            <View style={heroStyles.priceRow}>
              {servicePrices.slice(0, 3).map((s) => (
                <View key={s.id} style={heroStyles.priceChip}>
                  <AppText style={heroStyles.priceText} numberOfLines={1}>{s.label}</AppText>
                </View>
              ))}
            </View>
          )}
        </View>
      </PressablePremium>
    );
  }

  if (variant === 'portrait') {
    return (
      <PressablePremium
        onPress={onPress}
        pressScale={0.97}
        haptic="selection"
        style={[portraitStyles.card, { width: width ?? '48%' }, style]}
        accessibilityRole="button"
        accessibilityLabel={displayName}
      >
        <View style={portraitStyles.imageWrap}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={portraitStyles.image} contentFit="cover" transition={180} />
          ) : (
            <View style={[portraitStyles.image, portraitStyles.placeholder]}>
              <Ionicons name="cut-outline" size={32} color={colors.slateSoft} />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(11,14,20,0.6)']}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <AppText style={portraitStyles.name} numberOfLines={1}>{displayName}</AppText>
        </View>
        <View style={portraitStyles.meta}>
          <Ionicons name="star" size={12} color={colors.star} />
          <AppText style={portraitStyles.ratingText}>{(salon.avg_rating ?? 0).toFixed(1)}</AppText>
          <AppText style={portraitStyles.dot}>·</AppText>
          <AppText style={portraitStyles.city} numberOfLines={1}>{salon.city}</AppText>
        </View>
      </PressablePremium>
    );
  }

  // compact
  return (
    <PressablePremium
      onPress={onPress}
      pressScale={0.98}
      haptic="selection"
      style={[compactStyles.card, style]}
      accessibilityRole="button"
      accessibilityLabel={displayName}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={compactStyles.thumb} contentFit="cover" transition={140} />
      ) : (
        <View style={[compactStyles.thumb, compactStyles.thumbPlaceholder]}>
          <Ionicons name="cut-outline" size={22} color={colors.slateSoft} />
        </View>
      )}
      <View style={compactStyles.info}>
        <View style={compactStyles.topLine}>
          <AppText style={compactStyles.name} numberOfLines={1}>{displayName}</AppText>
          {salon.min_service_price != null && (
            <AppText style={compactStyles.startingFrom} numberOfLines={1}>
              {t('salon.startingFromShort', { price: salon.min_service_price })}
            </AppText>
          )}
        </View>
        <View style={compactStyles.subRow}>
          <Ionicons name="star" size={11} color={colors.star} />
          <AppText style={compactStyles.rating}>{(salon.avg_rating ?? 0).toFixed(1)}</AppText>
          <AppText style={compactStyles.sep}>·</AppText>
          <AppText style={compactStyles.city} numberOfLines={1}>
            {salon.distance_km != null
              ? `${salon.distance_km.toFixed(1)} km`
              : (salon.address || salon.city)}
          </AppText>
          {resolvedIsOpen != null && (
            <>
              <AppText style={compactStyles.sep}>·</AppText>
              <View style={[compactStyles.openDot, resolvedIsOpen ? compactStyles.openDotOpen : compactStyles.openDotClosed]} />
              <AppText
                style={[compactStyles.openLabel, resolvedIsOpen ? compactStyles.openLabelOpen : compactStyles.openLabelClosed]}
                numberOfLines={1}
              >
                {resolvedIsOpen ? t('salon.openNow') : t('salon.closedNow')}
              </AppText>
            </>
          )}
        </View>
      </View>
    </PressablePremium>
  );
}

const heroStyles = StyleSheet.create({
  card: {
    borderRadius: radius.hero,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  image: { ...StyleSheet.absoluteFillObject },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  ratingChip: {
    position: 'absolute',
    top: 12,
    end: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(11,14,20,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  ratingText: { fontFamily: 'Outfit-SemiBold', fontSize: 11, color: colors.surface },
  statusChip: {
    position: 'absolute',
    top: 12,
    start: 12,
    // Keep clear of the absolute rating chip at end:12. Without this
    // the "Open · closes at 21:00" text overlaps the star pill.
    maxWidth: '58%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusOpen: { backgroundColor: 'rgba(46,125,91,0.92)' },
  statusClosed: { backgroundColor: 'rgba(11,14,20,0.7)' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotOpen: { backgroundColor: colors.surface },
  statusDotClosed: { backgroundColor: colors.slateSoft },
  statusText: { fontFamily: 'Outfit-Medium', fontSize: 11, color: colors.surface, letterSpacing: 0.3 },
  statusTextClosed: { color: colors.surface },
  bottomBlock: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    gap: 4,
  },
  name: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    lineHeight: 24,
    color: colors.surface,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  priceChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  priceText: { fontFamily: 'Outfit-SemiBold', fontSize: 11, color: colors.surface, letterSpacing: 0.2 },
});

const portraitStyles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    marginBottom: 14,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 0.78,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'flex-end',
  },
  image: { ...StyleSheet.absoluteFillObject },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  name: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    color: colors.surface,
    padding: 12,
    letterSpacing: -0.2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ratingText: { fontFamily: 'Outfit-SemiBold', fontSize: 12, color: colors.ink },
  dot: { fontFamily: 'Outfit-Regular', color: colors.slateSoft, marginHorizontal: 2 },
  city: { fontFamily: 'Outfit-Regular', fontSize: 12, color: colors.slate, flex: 1 },
});

const compactStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
  },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 4 },
  topLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  name: {
    flex: 1,
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    color: colors.ink,
  },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rating: { fontFamily: 'Outfit-SemiBold', fontSize: 12, color: colors.ink },
  sep: { fontFamily: 'Outfit-Regular', fontSize: 12, color: colors.slateSoft, marginHorizontal: 2 },
  city: { fontFamily: 'Outfit-Regular', fontSize: 12, color: colors.slate, maxWidth: 120 },
  openDot: { width: 6, height: 6, borderRadius: 3 },
  openDotOpen: { backgroundColor: colors.ok },
  openDotClosed: { backgroundColor: colors.danger },
  openLabel: { fontFamily: 'Outfit-Medium', fontSize: 11 },
  openLabelOpen: { color: colors.ok },
  openLabelClosed: { color: colors.danger },
  startingFrom: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 12,
    color: colors.accent,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.1,
  },
});
