import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsRTL } from '../../i18n/useIsRTL';
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { AppText } from '../ui/AppText';
import { PressablePremium } from './PressablePremium';

export interface MonthCalendarProps {
  /** YYYY-MM-DD currently selected. */
  selectedDate: string;
  /** YYYY-MM-DD → number of bookings that day. Drives the dot row beneath each cell. */
  bookingsByDate?: Record<string, number>;
  onSelectDate: (date: string) => void;
  /** Month displayed (any day inside it). Defaults to the selected date's month. */
  visibleMonth?: Date;
  onVisibleMonthChange?: (date: Date) => void;
  /** Day-of-week index that is closed (default Friday = 5). Friday cells get surfaceAlt. */
  closedWeekday?: number;
  style?: StyleProp<ViewStyle>;
}

const DOW_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Custom-built month calendar (§5.2). Not a wrapper around react-native-calendars
 * — that library's default look is what kills "premium". This is deliberately
 * minimal: selected = ink fill, today = dot, dots beneath = bookings, Friday =
 * surfaceAlt background.
 */
export function MonthCalendar({
  selectedDate,
  bookingsByDate,
  onSelectDate,
  visibleMonth,
  onVisibleMonthChange,
  closedWeekday = 5,
  style,
}: MonthCalendarProps) {
  const rtl = useIsRTL();
  const today = new Date();
  const selected = parseYmd(selectedDate);
  const month = visibleMonth ?? selected ?? today;

  const cells = useMemo(() => buildMonthCells(month), [month]);

  const handlePrev = () => onVisibleMonthChange?.(subMonths(month, 1));
  const handleNext = () => onVisibleMonthChange?.(addMonths(month, 1));

  return (
    <View style={[styles.container, style]}>
      {/* ── Month nav ─────────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <PressablePremium
          haptic="selection"
          pressScale={0.92}
          onPress={handlePrev}
          style={styles.navBtn}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <Ionicons
            name={rtl ? 'chevron-forward' : 'chevron-back'}
            size={18}
            color={colors.slate}
          />
        </PressablePremium>
        <AppText style={[typography.header, styles.monthLabel]}>
          {format(month, 'MMMM yyyy')}
        </AppText>
        <PressablePremium
          haptic="selection"
          pressScale={0.92}
          onPress={handleNext}
          style={styles.navBtn}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
          <Ionicons
            name={rtl ? 'chevron-back' : 'chevron-forward'}
            size={18}
            color={colors.slate}
          />
        </PressablePremium>
      </View>

      {/* ── Day-of-week strip ─────────────────────────────────────── */}
      <View style={styles.dowRow}>
        {DOW_LETTERS.map((letter, i) => (
          <View key={i} style={styles.dowCell}>
            <AppText style={[typography.caption, styles.dowLabel]}>{letter}</AppText>
          </View>
        ))}
      </View>

      {/* ── Day grid ──────────────────────────────────────────────── */}
      <View style={styles.grid}>
        {cells.map((cell, idx) => (
          <DayCell
            key={`${cell.date.toISOString()}-${idx}`}
            date={cell.date}
            isCurrentMonth={cell.inMonth}
            isToday={isSameDay(cell.date, today)}
            isSelected={selected ? isSameDay(cell.date, selected) : false}
            isClosedWeekday={cell.date.getDay() === closedWeekday}
            bookings={bookingsByDate?.[format(cell.date, 'yyyy-MM-dd')] ?? 0}
            onPress={() => onSelectDate(format(cell.date, 'yyyy-MM-dd'))}
          />
        ))}
      </View>
    </View>
  );
}

/* ── DayCell ───────────────────────────────────────────────────────── */

interface DayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isClosedWeekday: boolean;
  bookings: number;
  onPress: () => void;
}

function DayCell({
  date,
  isCurrentMonth,
  isToday,
  isSelected,
  isClosedWeekday,
  bookings,
  onPress,
}: DayCellProps) {
  const scale = useSharedValue(1);
  React.useEffect(() => {
    scale.value = withSpring(isSelected ? 1 : 0.985, {
      damping: 14,
      stiffness: 200,
      mass: 0.6,
    });
  }, [isSelected, scale]);

  const animatedFill = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Cap visible dots; show numeric overflow indicator beyond that
  const dotCount = Math.min(bookings, 3);
  const overflow = bookings > 3 ? bookings - 3 : 0;

  const numberColor = isSelected
    ? colors.white
    : !isCurrentMonth
    ? colors.slateSoft
    : isClosedWeekday
    ? colors.slate
    : colors.ink;

  return (
    <PressablePremium
      haptic="selection"
      pressScale={0.94}
      onPress={onPress}
      style={styles.dayCell}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
    >
      {isClosedWeekday && !isSelected && <View style={styles.closedBg} />}
      <View style={styles.dayInner}>
        <Animated.View
          style={[
            styles.dayFill,
            isSelected ? styles.dayFillSelected : null,
            animatedFill,
          ]}
        />
        <AppText
          style={[
            typography.bodyMedium,
            styles.dayNumber,
            { color: numberColor },
            isSelected && { fontFamily: 'Outfit-SemiBold' },
          ]}
        >
          {date.getDate()}
        </AppText>
      </View>
      {/* dot row */}
      <View style={styles.dotRow}>
        {isToday && !isSelected && <View style={[styles.todayDot]} />}
        {!isToday &&
          Array.from({ length: dotCount }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.bookingDot,
                { backgroundColor: isSelected ? colors.white : colors.accent },
              ]}
            />
          ))}
        {overflow > 0 && !isSelected && (
          <AppText style={styles.overflowLabel}>+{overflow}</AppText>
        )}
      </View>
    </PressablePremium>
  );
}

/* ── helpers ───────────────────────────────────────────────────────── */

function buildMonthCells(month: Date): Array<{ date: Date; inMonth: boolean }> {
  const firstOfMonth = startOfMonth(month);
  const lastOfMonth = endOfMonth(month);
  const gridStart = startOfWeek(firstOfMonth, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(lastOfMonth, { weekStartsOn: 0 });

  const cells: Array<{ date: Date; inMonth: boolean }> = [];
  for (let d = gridStart; d <= gridEnd; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    cells.push({ date: new Date(d), inMonth: isSameMonth(d, firstOfMonth) });
  }
  return cells;
}

function parseYmd(value: string | undefined): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/* ── styles ────────────────────────────────────────────────────────── */

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    color: colors.ink,
  },
  dowRow: {
    flexDirection: 'row',
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  dowCell: {
    flex: 1,
    alignItems: 'center',
  },
  dowLabel: {
    color: colors.slateSoft,
    fontFamily: 'Outfit-SemiBold',
    letterSpacing: 0.6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  closedBg: {
    position: 'absolute',
    top: 2,
    left: 4,
    right: 4,
    bottom: 14,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
  },
  dayInner: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CELL_SIZE / 2,
  },
  dayFillSelected: {
    backgroundColor: colors.ink,
  },
  dayNumber: {
    fontVariant: ['tabular-nums'],
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
    height: 6,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  bookingDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  overflowLabel: {
    color: colors.slateSoft,
    fontSize: 8,
    fontFamily: 'Outfit-SemiBold',
    marginLeft: 2,
  },
});
