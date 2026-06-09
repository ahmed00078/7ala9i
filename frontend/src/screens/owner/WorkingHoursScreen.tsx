import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ownerApi } from '../../api/owner';
import { AppText } from '../../components/ui/AppText';
import {
  PressablePremium,
  BottomSheetForm,
  useToast,
  Skeleton,
  type BottomSheetFormRef,
} from '../../components/premium';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { getDayName } from '../../utils/formatters';

interface DayHours {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

type TimeField = 'open_time' | 'close_time';

const TIME_OPTIONS: string[] = (() => {
  const opts: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
})();

const AUTOSAVE_DEBOUNCE_MS = 600;

export function WorkingHoursScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [hours, setHours] = useState<DayHours[]>([]);
  const [pickerTarget, setPickerTarget] = useState<{
    dayIndex: number;
    field: TimeField;
  } | null>(null);
  const pickerSheetRef = useRef<BottomSheetFormRef>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstSyncRef = useRef(true);

  const { data, isLoading } = useQuery({
    queryKey: ['owner', 'working-hours'],
    queryFn: () => ownerApi.getWorkingHours(),
  });

  useEffect(() => {
    if (data?.data) {
      setHours(
        data.data.map((h: any) => ({
          day_of_week: h.day_of_week,
          open_time: (h.open_time || '09:00').slice(0, 5),
          close_time: (h.close_time || '21:00').slice(0, 5),
          is_closed: h.is_closed,
        })),
      );
      firstSyncRef.current = true;
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: DayHours[]) => ownerApi.updateWorkingHours({ hours: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'working-hours'] });
      toast.show({ message: t('owner.hours.savedToast'), variant: 'saved' });
    },
  });

  // Auto-save on hours change (debounced). Skips the very first sync from the
  // server so we don't immediately PUT what we just GET.
  useEffect(() => {
    if (hours.length === 0) return;
    if (firstSyncRef.current) {
      firstSyncRef.current = false;
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      saveMutation.mutate(hours);
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours]);

  const toggleDay = useCallback((dayIndex: number) => {
    setHours((prev) =>
      prev.map((h) => (h.day_of_week === dayIndex ? { ...h, is_closed: !h.is_closed } : h)),
    );
  }, []);

  const setTime = useCallback((dayIndex: number, field: TimeField, time: string) => {
    setHours((prev) =>
      prev.map((h) => (h.day_of_week === dayIndex ? { ...h, [field]: time } : h)),
    );
  }, []);

  const applyToAllOpen = useCallback(
    (field: TimeField, time: string) => {
      setHours((prev) =>
        prev.map((h) => (h.is_closed ? h : { ...h, [field]: time })),
      );
    },
    [],
  );

  const openPicker = (dayIndex: number, field: TimeField) => {
    setPickerTarget({ dayIndex, field });
    pickerSheetRef.current?.present();
  };

  const activeDay = pickerTarget
    ? hours.find((h) => h.day_of_week === pickerTarget.dayIndex)
    : null;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <AppText style={[typography.header, styles.title]}>
            {t('owner.hours.title')}
          </AppText>
          <AppText style={[typography.bodySmall, styles.subtitle]}>
            {t('owner.hours.subtitle')}
          </AppText>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading ? (
          <View style={{ gap: 12 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton.Block key={i} height={58} radius={radius.card} />
            ))}
          </View>
        ) : (
          <View style={styles.list}>
            {[...hours]
              .sort((a, b) => a.day_of_week - b.day_of_week)
              .map((day, i, arr) => (
                <DayRow
                  key={day.day_of_week}
                  day={day}
                  isLast={i === arr.length - 1}
                  onToggle={() => toggleDay(day.day_of_week)}
                  onPressOpen={() => openPicker(day.day_of_week, 'open_time')}
                  onPressClose={() => openPicker(day.day_of_week, 'close_time')}
                  closedLabel={t('owner.hours.closedLabel')}
                />
              ))}
          </View>
        )}
        <AppText style={[typography.caption, styles.fridayNote]}>
          {t('owner.hours.fridayNote')}
        </AppText>
      </ScrollView>

      {/* Time picker sheet */}
      <BottomSheetForm
        ref={pickerSheetRef}
        title={
          pickerTarget?.field === 'open_time'
            ? t('owner.hours.openTime')
            : t('owner.hours.closeTime')
        }
        snapPoints={['65%']}
        onDismiss={() => setPickerTarget(null)}
      >
        {pickerTarget && activeDay && (
          <View style={{ flex: 1 }}>
            <FlatList
              data={TIME_OPTIONS}
              keyExtractor={(item) => item}
              style={styles.timeList}
              initialScrollIndex={Math.max(
                0,
                TIME_OPTIONS.indexOf(activeDay[pickerTarget.field]),
              )}
              getItemLayout={(_, index) => ({ length: 48, offset: 48 * index, index })}
              renderItem={({ item }) => {
                const isActive = item === activeDay[pickerTarget.field];
                return (
                  <PressablePremium
                    haptic="selection"
                    pressScale={0.985}
                    onPress={() => {
                      setTime(pickerTarget.dayIndex, pickerTarget.field, item);
                      pickerSheetRef.current?.dismiss();
                    }}
                    style={[
                      styles.timeOption,
                      isActive && styles.timeOptionActive,
                    ]}
                  >
                    <AppText
                      style={[
                        typography.bodyMedium,
                        {
                          color: isActive ? colors.ink : colors.slate,
                          fontFamily: isActive ? 'Outfit-SemiBold' : 'Outfit-Regular',
                          fontVariant: ['tabular-nums'],
                        },
                      ]}
                    >
                      {item}
                    </AppText>
                    {isActive && (
                      <Ionicons name="checkmark" size={18} color={colors.ink} />
                    )}
                  </PressablePremium>
                );
              }}
            />
            <PressablePremium
              haptic="selection"
              pressScale={0.985}
              onPress={() => {
                applyToAllOpen(pickerTarget.field, activeDay[pickerTarget.field]);
                pickerSheetRef.current?.dismiss();
              }}
              style={styles.applyAllBtn}
            >
              <Ionicons name="copy-outline" size={16} color={colors.accent} />
              <AppText style={[typography.button, styles.applyAllText]}>
                {t('owner.hours.applyToAllOpen')}
              </AppText>
            </PressablePremium>
          </View>
        )}
      </BottomSheetForm>
    </View>
  );
}

/* ── DayRow ────────────────────────────────────────────────────────── */

function DayRow({
  day,
  isLast,
  onToggle,
  onPressOpen,
  onPressClose,
  closedLabel,
}: {
  day: DayHours;
  isLast: boolean;
  onToggle: () => void;
  onPressOpen: () => void;
  onPressClose: () => void;
  closedLabel: string;
}) {
  return (
    <View
      style={[
        rowStyles.wrap,
        day.is_closed && rowStyles.wrapClosed,
        !isLast && rowStyles.divider,
      ]}
    >
      <AppText style={[typography.bodyMedium, rowStyles.dayName]}>
        {getDayName(day.day_of_week)}
      </AppText>

      {day.is_closed ? (
        <View style={rowStyles.center}>
          <AppText style={[typography.bodySmall, rowStyles.closedText]}>
            {closedLabel}
          </AppText>
        </View>
      ) : (
        <View style={rowStyles.timeRow}>
          <PressablePremium
            haptic="selection"
            pressScale={0.94}
            onPress={onPressOpen}
            style={rowStyles.timeBtn}
          >
            <AppText style={[typography.bodyMedium, rowStyles.timeText]}>
              {day.open_time}
            </AppText>
          </PressablePremium>
          <AppText style={rowStyles.dash}>—</AppText>
          <PressablePremium
            haptic="selection"
            pressScale={0.94}
            onPress={onPressClose}
            style={rowStyles.timeBtn}
          >
            <AppText style={[typography.bodyMedium, rowStyles.timeText]}>
              {day.close_time}
            </AppText>
          </PressablePremium>
        </View>
      )}

      <Switch
        value={!day.is_closed}
        onValueChange={onToggle}
        trackColor={{ true: colors.accent, false: colors.hairline }}
        thumbColor={colors.white}
        ios_backgroundColor={colors.hairline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 4,
    paddingBottom: 16,
  },
  title: { color: colors.ink },
  subtitle: { color: colors.slate, marginTop: 2 },
  scroll: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 120,
  },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  fridayNote: {
    color: colors.slateSoft,
    marginTop: 14,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
  timeList: {
    flexGrow: 0,
    maxHeight: '70%',
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  timeOptionActive: {
    backgroundColor: colors.accentWash,
  },
  applyAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
    borderRadius: radius.input,
    backgroundColor: colors.accentSoft,
  },
  applyAllText: { color: colors.accent },
});

const rowStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
  },
  wrapClosed: {
    backgroundColor: colors.surfaceAlt,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  dayName: {
    color: colors.ink,
    fontFamily: 'Outfit-SemiBold',
    width: 96,
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  closedText: {
    color: colors.slateSoft,
  },
  timeRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timeBtn: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  timeText: {
    color: colors.ink,
    fontFamily: 'Outfit-SemiBold',
    fontVariant: ['tabular-nums'],
  },
  dash: {
    color: colors.slateSoft,
    fontSize: 13,
  },
});
