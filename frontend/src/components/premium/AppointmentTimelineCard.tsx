import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { parseISO, differenceInMinutes, differenceInHours, differenceInDays, isToday, isTomorrow, isPast, format } from 'date-fns';
import { ar, fr, enUS, type Locale } from 'date-fns/locale';
import { AppText } from '../ui/AppText';
import { Avatar } from './Avatar';
import { PressablePremium } from './PressablePremium';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { formatCurrency, formatTime, formatDuration } from '../../utils/formatters';

interface BookingShape {
  id: string;
  booking_date: string;
  start_time: string;
  status: string;
  total_price: number;
  has_review?: boolean;
  salon?: { id?: string; name?: string; name_ar?: string; cover_photo_url?: string | null };
  service?: { name?: string; name_ar?: string; duration?: number };
}

interface AppointmentTimelineCardProps {
  booking: BookingShape;
  language: string;
  variant: 'upcoming' | 'past' | 'cancelled';
  onPress?: () => void;
  reviewCta?: React.ReactNode;
}

const localeMap: Record<string, Locale> = { ar, fr, en: enUS };

function getLocale(lang: string): Locale {
  return localeMap[lang] || enUS;
}

function relativeAnchor(
  dateStr: string,
  timeStr: string,
  lang: string,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  const [h, m] = timeStr.split(':');
  const target = parseISO(dateStr);
  target.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
  const now = new Date();

  if (isPast(target)) {
    const dDays = differenceInDays(now, target);
    if (dDays < 1) return formatTime(timeStr);
    if (dDays < 7) return t('appointments.daysAgo', { count: dDays });
    return format(target, 'd MMM', { locale: getLocale(lang) });
  }

  const dMin = differenceInMinutes(target, now);
  if (dMin < 60) return t('appointments.inMinutes', { count: Math.max(1, dMin) });
  const dH = differenceInHours(target, now);
  if (isToday(target)) return t('appointments.todayAt', { time: formatTime(timeStr) });
  if (isTomorrow(target)) return t('appointments.tomorrowAt', { time: formatTime(timeStr) });
  if (dH < 24 * 7) {
    const dayName = format(target, 'EEEE', { locale: getLocale(lang) });
    return t('appointments.dayAt', { day: dayName, time: formatTime(timeStr) });
  }
  return format(target, 'd MMM · HH:mm', { locale: getLocale(lang) });
}

const STATUS_TONE: Record<string, { fg: string; bg: string }> = {
  confirmed: { fg: colors.accentInk, bg: colors.accentSoft },
  completed: { fg: colors.ok, bg: '#DEEAE2' },
  cancelled: { fg: colors.danger, bg: '#F6E0DE' },
  no_show: { fg: colors.warn, bg: '#F2E6D7' },
};

/**
 * §5.13 — vertical-timeline card for the Appointments screen.
 *
 * Anatomy: a leading gutter with a tone-colored dot + connector line, then a
 * surface card with an accent edge stripe (variant-tinted), salon avatar +
 * service + duration meta + status pill + price block. No chevron — the whole
 * card is tappable. Cancelled / no-show rows dim to surfaceAlt.
 */
export function AppointmentTimelineCard({
  booking,
  language,
  variant,
  onPress,
  reviewCta,
}: AppointmentTimelineCardProps) {
  const { t } = useTranslation();
  const salonName =
    language === 'ar' && booking.salon?.name_ar ? booking.salon.name_ar : booking.salon?.name || '';
  const serviceName =
    language === 'ar' && booking.service?.name_ar ? booking.service.name_ar : booking.service?.name || '';

  const anchor = relativeAnchor(booking.booking_date, booking.start_time, language, t);
  const dim = variant === 'cancelled' || booking.status === 'cancelled' || booking.status === 'no_show';

  const tone = STATUS_TONE[booking.status] || STATUS_TONE.confirmed;
  const stripeColor =
    variant === 'cancelled' ? colors.hairline : variant === 'past' ? colors.slateSoft : colors.accent;
  const statusLabel = t(`booking.status.${booking.status}`);

  return (
    <View style={styles.row}>
      {/* Timeline gutter */}
      <View style={styles.gutter}>
        <View
          style={[
            styles.dot,
            variant === 'upcoming' && styles.dotUpcoming,
            variant === 'past' && styles.dotPast,
            variant === 'cancelled' && styles.dotCancelled,
          ]}
        />
        <View style={styles.line} />
      </View>

      <View style={styles.cardWrap}>
        <AppText style={[styles.anchor, dim && styles.muted]} numberOfLines={1}>
          {anchor}
        </AppText>

        <View style={[styles.card, dim && styles.cardDim]}>
          {/* Edge stripe */}
          <View style={[styles.stripe, { backgroundColor: stripeColor }]} />

          {/* Card body opens the salon — the review CTA below is its own action
              and must NOT be nested inside this Pressable, or the parent press
              swallows the tap and the review modal never shows. */}
          <PressablePremium
            onPress={onPress ?? (() => undefined)}
            pressScale={0.985}
            haptic="selection"
            style={styles.inner}
          >
            <View style={styles.headerRow}>
              <Avatar name={salonName} uri={booking.salon?.cover_photo_url ?? undefined} size={40} />
              <View style={styles.titleBlock}>
                <View style={styles.titleLine}>
                  <AppText style={[styles.salon, dim && styles.mutedStrong]} numberOfLines={1}>
                    {salonName}
                  </AppText>
                </View>
                <View style={styles.metaLine}>
                  <AppText style={[styles.service, dim && styles.muted]} numberOfLines={1}>
                    {serviceName}
                  </AppText>
                  {booking.service?.duration ? (
                    <>
                      <View style={styles.bullet} />
                      <AppText style={[styles.service, dim && styles.muted]}>
                        {formatDuration(booking.service.duration)}
                      </AppText>
                    </>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.footerRow}>
              <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                <View style={[styles.statusDot, { backgroundColor: tone.fg }]} />
                <AppText style={[styles.statusText, { color: tone.fg }]}>{statusLabel}</AppText>
              </View>
              <AppText style={[styles.price, dim && styles.muted]}>
                {formatCurrency(booking.total_price)}
              </AppText>
            </View>
          </PressablePremium>

          {reviewCta && <View style={styles.ctaWrap}>{reviewCta}</View>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
  },
  gutter: {
    width: 22,
    alignItems: 'center',
    paddingTop: 30,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.hairline,
    borderWidth: 2,
    borderColor: colors.canvas,
    zIndex: 1,
  },
  dotUpcoming: { backgroundColor: colors.accent },
  dotPast: { backgroundColor: colors.slateSoft },
  dotCancelled: { backgroundColor: colors.hairline },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.hairline,
    marginTop: -2,
  },

  cardWrap: {
    flex: 1,
    paddingBottom: 18,
  },
  anchor: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 12,
    color: colors.ink,
    marginBottom: 8,
    letterSpacing: 0.3,
    textTransform: 'capitalize',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  cardDim: {
    backgroundColor: colors.surfaceAlt,
    opacity: 0.85,
  },
  stripe: {
    position: 'absolute',
    top: 12,
    bottom: 12,
    start: 0,
    width: 3,
    borderRadius: 2,
  },
  inner: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    paddingStart: 18,
    gap: 12,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleBlock: { flex: 1, minWidth: 0 },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  salon: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.2,
    flex: 1,
    minWidth: 0,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  service: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.slate,
  },
  bullet: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.slateSoft,
  },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  price: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.2,
    fontVariant: ['tabular-nums'],
  },

  muted: { color: colors.slateSoft },
  mutedStrong: { color: colors.slate },

  ctaWrap: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
});
