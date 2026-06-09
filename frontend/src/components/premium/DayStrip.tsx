import React, { useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { format, addDays } from 'date-fns';
import { AppText } from '../ui/AppText';
import { colors } from '../../theme/colors';
import { PressablePremium } from './PressablePremium';

interface DayStripProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  language?: string;
  /** How many days ahead the strip extends. Defaults to 21. */
  daysAhead?: number;
}

interface Day {
  iso: string;
  dayLabel: string;
  num: string;
  monthLabel: string;
  isToday: boolean;
  isFriday: boolean;
}

/**
 * §5.8 — horizontal day picker pills. Replaces the boxed-calendar widget for
 * the inline booking flow. Day-of-week label sits on top of the day number,
 * and the strip auto-scrolls to keep the selected pill centered.
 */
export function DayStrip({ selectedDate, onSelectDate, language = 'en', daysAhead = 21 }: DayStripProps) {
  const listRef = useRef<FlatList<Day>>(null);

  const days = useMemo<Day[]>(() => {
    const out: Day[] = [];
    const today = new Date();
    const weekLocale = language === 'fr' ? FR_WEEKDAYS : language === 'ar' ? AR_WEEKDAYS : EN_WEEKDAYS;
    const monthLocale = language === 'fr' ? FR_MONTHS : language === 'ar' ? AR_MONTHS : EN_MONTHS;
    for (let i = 0; i < daysAhead; i++) {
      const d = addDays(today, i);
      // JS getDay: 0 = Sun … 6 = Sat
      const dow = d.getDay();
      out.push({
        iso: format(d, 'yyyy-MM-dd'),
        dayLabel: weekLocale[dow],
        num: format(d, 'd'),
        monthLabel: monthLocale[d.getMonth()],
        isToday: i === 0,
        isFriday: dow === 5,
      });
    }
    return out;
  }, [language, daysAhead]);

  useEffect(() => {
    const idx = days.findIndex((d) => d.iso === selectedDate);
    if (idx > 1) {
      listRef.current?.scrollToIndex({ index: idx - 1, animated: true, viewPosition: 0 });
    }
  }, [selectedDate, days]);

  return (
    <FlatList
      ref={listRef}
      data={days}
      keyExtractor={(item) => item.iso}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
      onScrollToIndexFailed={({ index }) => {
        listRef.current?.scrollToOffset({ offset: index * 64, animated: true });
      }}
      renderItem={({ item }) => {
        const isSelected = item.iso === selectedDate;
        const isDisabled = item.isFriday;
        return (
          <PressablePremium
            haptic={isDisabled ? 'none' : 'selection'}
            pressScale={0.94}
            disabled={isDisabled}
            onPress={() => onSelectDate(item.iso)}
            style={[
              styles.pill,
              isSelected && styles.pillActive,
              isDisabled && styles.pillDisabled,
            ]}
          >
            <AppText
              style={[
                styles.dayLabel,
                isSelected && styles.dayLabelActive,
                isDisabled && styles.dayLabelDisabled,
              ]}
              numberOfLines={1}
            >
              {item.dayLabel}
            </AppText>
            <AppText
              style={[
                styles.num,
                isSelected && styles.numActive,
                isDisabled && styles.numDisabled,
              ]}
              numberOfLines={1}
            >
              {item.num}
            </AppText>
            <AppText
              style={[
                styles.month,
                isSelected && styles.monthActive,
                isDisabled && styles.monthDisabled,
              ]}
              numberOfLines={1}
            >
              {item.monthLabel}
            </AppText>
          </PressablePremium>
        );
      }}
    />
  );
}

const EN_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FR_WEEKDAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const AR_WEEKDAYS = ['الأحد', 'الإثن', 'الثلا', 'الأرب', 'الخمي', 'الجمع', 'السب'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FR_MONTHS = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
const AR_MONTHS = ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'];

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  pill: {
    width: 60,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  pillActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  pillDisabled: {
    backgroundColor: colors.surface,
    opacity: 0.45,
  },
  dayLabel: {
    fontFamily: 'Outfit-Medium',
    fontSize: 11,
    color: colors.slate,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  dayLabelActive: { color: 'rgba(255,255,255,0.7)' },
  dayLabelDisabled: { color: colors.slateSoft },
  num: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    color: colors.ink,
    lineHeight: 24,
    letterSpacing: -0.4,
  },
  numActive: { color: colors.surface },
  numDisabled: { color: colors.slate },
  month: {
    fontFamily: 'Outfit-Regular',
    fontSize: 10,
    color: colors.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  monthActive: { color: 'rgba(255,255,255,0.65)' },
  monthDisabled: { color: colors.slateSoft },
});
