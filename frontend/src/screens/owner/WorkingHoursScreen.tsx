import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, addDays, parseISO } from 'date-fns';

import { ownerApi } from '../../api/owner';
import { AppText } from '../../components/ui/AppText';
import {
  PressablePremium,
  BottomSheetForm,
  useToast,
  Skeleton,
  Segment,
  FloatingInput,
  SwipeableRow,
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
  // Last server-confirmed snapshot — used to roll back when a PUT fails so the
  // local UI never silently diverges from the database.
  const lastConfirmedRef = useRef<DayHours[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['owner', 'working-hours'],
    queryFn: () => ownerApi.getWorkingHours(),
  });

  useEffect(() => {
    if (data?.data) {
      const snapshot: DayHours[] = data.data.map((h: any) => ({
        day_of_week: h.day_of_week,
        open_time: (h.open_time || '09:00').slice(0, 5),
        close_time: (h.close_time || '21:00').slice(0, 5),
        is_closed: h.is_closed,
      }));
      setHours(snapshot);
      lastConfirmedRef.current = snapshot;
      firstSyncRef.current = true;
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: DayHours[]) => ownerApi.updateWorkingHours({ hours: payload }),
    onSuccess: (_, payload) => {
      lastConfirmedRef.current = payload;
      queryClient.invalidateQueries({ queryKey: ['owner', 'working-hours'] });
      toast.show({ message: t('owner.hours.savedToast'), variant: 'saved' });
    },
    onError: () => {
      // Roll back to the last server-confirmed snapshot so the UI doesn't lie.
      const snapshot = lastConfirmedRef.current;
      if (snapshot.length) {
        firstSyncRef.current = true; // skip the immediate auto-save after rollback
        setHours(snapshot);
      }
      toast.show({ message: t('owner.hours.saveError'), variant: 'error' });
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

        <ClosuresSection />
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

/* ── Ad-hoc closures + breaks ───────────────────────────────────────── */

type ClosureType = 'whole-day' | 'partial-day';

interface ClosureRow {
  id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
}

function ClosuresSection() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const sheetRef = useRef<BottomSheetFormRef>(null);
  const timeSheetRef = useRef<BottomSheetFormRef>(null);

  const [type, setType] = useState<ClosureType>('whole-day');
  const [pickedDate, setPickedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('13:00');
  const [reason, setReason] = useState('');
  const [timeTarget, setTimeTarget] = useState<'start' | 'end' | null>(null);

  const dates = useMemo(() => {
    const out: { iso: string; dayLabel: string; num: string; monthLabel: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const d = addDays(today, i);
      out.push({
        iso: format(d, 'yyyy-MM-dd'),
        dayLabel: format(d, 'EEE'),
        num: format(d, 'd'),
        monthLabel: format(d, 'MMM'),
      });
    }
    return out;
  }, []);

  const { data } = useQuery({
    queryKey: ['owner', 'closures'],
    queryFn: () => ownerApi.listClosures(),
  });
  const closures = (data?.data ?? []) as ClosureRow[];

  const createMut = useMutation({
    mutationFn: (payload: { start_at: string; end_at: string; reason?: string | null }) =>
      ownerApi.createClosure(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'closures'] });
      toast.show({ message: t('owner.closures.saved'), variant: 'saved' });
      sheetRef.current?.dismiss();
      setReason('');
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail ?? t('errors.server');
      toast.show({ message: String(detail), variant: 'error' });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => ownerApi.deleteClosure(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'closures'] });
      toast.show({ message: t('owner.closures.deleted'), variant: 'saved' });
    },
  });

  const reset = () => {
    setType('whole-day');
    setPickedDate(format(new Date(), 'yyyy-MM-dd'));
    setStartTime('12:00');
    setEndTime('13:00');
    setReason('');
  };

  const open = () => {
    reset();
    sheetRef.current?.present();
  };

  const submit = () => {
    const startStr = type === 'whole-day' ? '00:00' : startTime;
    const endStr = type === 'whole-day' ? '23:59' : endTime;
    if (type === 'partial-day' && endStr <= startStr) {
      toast.show({ message: t('owner.closures.errors.range'), variant: 'error' });
      return;
    }
    const startIso = `${pickedDate}T${startStr}:00Z`;
    const endIso = `${pickedDate}T${endStr}:00Z`;
    createMut.mutate({
      start_at: startIso,
      end_at: endIso,
      reason: reason.trim() || null,
    });
  };

  const formatClosure = (c: ClosureRow): string => {
    const start = parseISO(c.start_at);
    const end = parseISO(c.end_at);
    const dateStr = format(start, 'd MMM yyyy');
    const isWholeDay =
      start.getUTCHours() === 0 && end.getUTCHours() === 23 && end.getUTCMinutes() >= 59;
    if (isWholeDay) return dateStr;
    return `${dateStr} · ${format(start, 'HH:mm')}—${format(end, 'HH:mm')}`;
  };

  return (
    <View style={closureStyles.section}>
      <View style={closureStyles.headerRow}>
        <AppText style={[typography.header, closureStyles.title]}>
          {t('owner.closures.title')}
        </AppText>
      </View>
      <AppText style={[typography.caption, closureStyles.subtitle]}>
        {t('owner.closures.subtitle')}
      </AppText>

      <View style={closureStyles.list}>
        {closures.length === 0 ? (
          <View style={closureStyles.emptyRow}>
            <AppText style={[typography.bodySmall, { color: colors.slateSoft }]}>
              {t('owner.closures.empty')}
            </AppText>
          </View>
        ) : (
          closures.map((c, i) => (
            <SwipeableRow
              key={c.id}
              trailingAction={{
                label: t('common.delete'),
                icon: 'trash-outline',
                destructive: true,
                onPress: () => deleteMut.mutate(c.id),
              }}
            >
              <View
                style={[
                  closureStyles.closureRow,
                  i < closures.length - 1 && closureStyles.divider,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <AppText style={[typography.bodyMedium, closureStyles.closureDate]}>
                    {formatClosure(c)}
                  </AppText>
                  {c.reason ? (
                    <AppText style={[typography.caption, closureStyles.closureReason]} numberOfLines={1}>
                      {c.reason}
                    </AppText>
                  ) : null}
                </View>
                <Ionicons name="chevron-back" size={16} color={colors.slateSoft} />
              </View>
            </SwipeableRow>
          ))
        )}
        <PressablePremium
          haptic="selection"
          pressScale={0.985}
          onPress={open}
          style={closureStyles.addRow}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
          <AppText style={[typography.button, { color: colors.accent }]}>
            {t('owner.closures.add')}
          </AppText>
        </PressablePremium>
      </View>

      <BottomSheetForm
        ref={sheetRef}
        title={t('owner.closures.addTitle')}
        snapPoints={['85%']}
        footer={
          <PressablePremium
            haptic="impact"
            pressScale={0.97}
            onPress={submit}
            style={closureStyles.submitBtn}
          >
            <AppText style={[typography.button, { color: colors.surface }]}>
              {createMut.isPending ? t('common.saving') : t('owner.closures.save')}
            </AppText>
          </PressablePremium>
        }
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Segment<ClosureType>
            options={[
              { value: 'whole-day', label: t('owner.closures.wholeDay') },
              { value: 'partial-day', label: t('owner.closures.partialDay') },
            ]}
            value={type}
            onChange={setType}
          />

          <AppText style={closureStyles.sectionLabel}>{t('owner.closures.date')}</AppText>
          <FlatList
            horizontal
            data={dates}
            keyExtractor={(d) => d.iso}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            renderItem={({ item }) => {
              const active = item.iso === pickedDate;
              return (
                <PressablePremium
                  haptic="selection"
                  pressScale={0.94}
                  onPress={() => setPickedDate(item.iso)}
                  style={[closureStyles.datePill, active && closureStyles.datePillActive]}
                >
                  <AppText style={[closureStyles.dateLabel, active && closureStyles.dateLabelActive]}>
                    {item.dayLabel}
                  </AppText>
                  <AppText style={[closureStyles.dateNum, active && closureStyles.dateNumActive]}>
                    {item.num}
                  </AppText>
                  <AppText style={[closureStyles.dateMonth, active && closureStyles.dateMonthActive]}>
                    {item.monthLabel}
                  </AppText>
                </PressablePremium>
              );
            }}
          />

          {type === 'partial-day' ? (
            <>
              <AppText style={closureStyles.sectionLabel}>{t('owner.closures.timeRange')}</AppText>
              <View style={closureStyles.timeRow}>
                <PressablePremium
                  haptic="selection"
                  pressScale={0.97}
                  onPress={() => {
                    setTimeTarget('start');
                    timeSheetRef.current?.present();
                  }}
                  style={closureStyles.timeBtn}
                >
                  <AppText style={closureStyles.timeCaption}>{t('owner.closures.start')}</AppText>
                  <AppText style={closureStyles.timeValue}>{startTime}</AppText>
                </PressablePremium>
                <PressablePremium
                  haptic="selection"
                  pressScale={0.97}
                  onPress={() => {
                    setTimeTarget('end');
                    timeSheetRef.current?.present();
                  }}
                  style={closureStyles.timeBtn}
                >
                  <AppText style={closureStyles.timeCaption}>{t('owner.closures.end')}</AppText>
                  <AppText style={closureStyles.timeValue}>{endTime}</AppText>
                </PressablePremium>
              </View>
            </>
          ) : null}

          <View style={{ marginTop: spacing.lg }}>
            <FloatingInput
              label={t('owner.closures.reason')}
              value={reason}
              onChangeText={setReason}
              maxLength={140}
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </BottomSheetForm>

      <BottomSheetForm
        ref={timeSheetRef}
        title={
          timeTarget === 'start'
            ? t('owner.closures.start')
            : t('owner.closures.end')
        }
        snapPoints={['60%']}
        onDismiss={() => setTimeTarget(null)}
      >
        <FlatList
          data={TIME_OPTIONS}
          keyExtractor={(item) => item}
          style={styles.timeList}
          initialScrollIndex={Math.max(
            0,
            TIME_OPTIONS.indexOf(timeTarget === 'start' ? startTime : endTime),
          )}
          getItemLayout={(_, index) => ({ length: 48, offset: 48 * index, index })}
          renderItem={({ item }) => {
            const current = timeTarget === 'start' ? startTime : endTime;
            const isActive = item === current;
            return (
              <PressablePremium
                haptic="selection"
                pressScale={0.985}
                onPress={() => {
                  if (timeTarget === 'start') setStartTime(item);
                  else if (timeTarget === 'end') setEndTime(item);
                  timeSheetRef.current?.dismiss();
                }}
                style={[styles.timeOption, isActive && styles.timeOptionActive]}
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
                {isActive && <Ionicons name="checkmark" size={18} color={colors.ink} />}
              </PressablePremium>
            );
          }}
        />
      </BottomSheetForm>
    </View>
  );
}

const closureStyles = StyleSheet.create({
  section: {
    marginTop: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    color: colors.ink,
    fontSize: 18,
  },
  subtitle: {
    color: colors.slate,
    marginBottom: 12,
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
  emptyRow: {
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  closureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  closureDate: {
    color: colors.ink,
    fontFamily: 'Outfit-SemiBold',
  },
  closureReason: {
    color: colors.slate,
    marginTop: 2,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  sectionLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.slate,
    marginTop: spacing.lg,
    marginBottom: 10,
  },
  datePill: {
    width: 56,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    alignItems: 'center',
    gap: 2,
  },
  datePillActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  dateLabel: {
    fontFamily: 'Outfit-Medium',
    fontSize: 10,
    color: colors.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dateLabelActive: { color: 'rgba(255,255,255,0.7)' },
  dateNum: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: colors.ink,
    lineHeight: 22,
  },
  dateNumActive: { color: colors.surface },
  dateMonth: {
    fontFamily: 'Outfit-Regular',
    fontSize: 9,
    color: colors.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dateMonthActive: { color: 'rgba(255,255,255,0.65)' },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: radius.input,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  timeCaption: {
    fontFamily: 'Outfit-Medium',
    fontSize: 11,
    color: colors.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  timeValue: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 22,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  submitBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
