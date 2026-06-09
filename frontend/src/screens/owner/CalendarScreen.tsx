import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { useLanguage } from '../../contexts/LanguageContext';
import { useAlert } from '../../contexts/AlertContext';
import { ownerApi } from '../../api/owner';
import { ErrorState } from '../../components/ui/ErrorState';
import { AppText } from '../../components/ui/AppText';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { formatCurrency, formatTime } from '../../utils/formatters';

import {
  MonthCalendar,
  Segment,
  PressablePremium,
  Avatar,
  BottomSheetForm,
  type BottomSheetFormRef,
  Skeleton,
} from '../../components/premium';

const STATUS_FILTERS = ['all', 'confirmed', 'completed', 'cancelled'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];
type ViewMode = 'day' | 'week' | 'month';

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
  client?: { first_name: string; last_name: string };
  service?: { name: string; name_ar?: string };
}

const STATUS_DOT: Record<string, string> = {
  confirmed: colors.accent,
  completed: colors.ok,
  cancelled: colors.danger,
  no_show: colors.slateSoft,
};

export function CalendarScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const alert = useAlert();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filterSheetRef = useRef<BottomSheetFormRef>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['owner', 'appointments', selectedDate, viewMode],
    queryFn: () =>
      ownerApi.getAppointments({
        date: selectedDate,
        week: viewMode === 'week',
      }),
  });

  const all = (data?.data ?? []) as Appointment[];
  const filtered = useMemo(
    () => (statusFilter === 'all' ? all : all.filter((a) => a.status === statusFilter)),
    [all, statusFilter],
  );

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'completed' | 'no_show' | 'cancelled' }) =>
      ownerApi.updateBookingStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner'] });
    },
  });

  const handleAppointmentPress = useCallback(
    (apt: Appointment) => {
      if (apt.status !== 'confirmed') return;
      alert.show({
        type: 'confirm',
        title: t('owner.calendar.updateStatus'),
        message: `${apt.client?.first_name ?? ''} ${apt.client?.last_name ?? ''} — ${apt.service?.name ?? ''}`,
        confirmText: t('owner.calendar.markComplete'),
        cancelText: t('common.cancel'),
        onConfirm: () => statusMutation.mutate({ id: apt.id, status: 'completed' }),
      });
    },
    [alert, statusMutation, t],
  );

  const segmentOptions = useMemo(
    () =>
      [
        { value: 'day' as ViewMode, label: t('owner.calendar.day') },
        { value: 'week' as ViewMode, label: t('owner.calendar.week') },
        { value: 'month' as ViewMode, label: t('owner.calendar.month') },
      ],
    [t],
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        {/* ── Slim header ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <AppText style={[typography.header, styles.title]}>
            {t('owner.calendar.title')}
          </AppText>
          <PressablePremium
            haptic="selection"
            pressScale={0.92}
            onPress={() => filterSheetRef.current?.present()}
            style={styles.filterBtn}
            accessibilityRole="button"
            accessibilityLabel={t('owner.calendar.filterTitle')}
          >
            <Ionicons name="options-outline" size={20} color={colors.ink} />
            {statusFilter !== 'all' && <View style={styles.filterDot} />}
          </PressablePremium>
        </View>

        <View style={styles.segmentWrap}>
          <Segment<ViewMode>
            options={segmentOptions}
            value={viewMode}
            onChange={setViewMode}
          />
        </View>
      </SafeAreaView>

      {/* ── Full-bleed calendar ─────────────────────────────────── */}
      <View style={styles.calendarWrap}>
        <MonthCalendar
          selectedDate={selectedDate}
          visibleMonth={visibleMonth}
          onVisibleMonthChange={setVisibleMonth}
          onSelectDate={setSelectedDate}
        />
      </View>

      {/* ── Persistent day-detail sheet ─────────────────────────── */}
      <BottomSheet
        index={0}
        snapPoints={['40%', '90%']}
        enablePanDownToClose={false}
        handleIndicatorStyle={styles.sheetHandle}
        backgroundStyle={styles.sheetBackground}
      >
        <View style={styles.sheetHeader}>
          <AppText style={[typography.header, styles.sheetTitle]}>
            {format(new Date(selectedDate), 'EEEE d MMM')}
          </AppText>
          <AppText style={[typography.caption, styles.sheetCount]}>
            {filtered.length}
          </AppText>
        </View>

        <BottomSheetScrollView contentContainerStyle={styles.sheetBody}>
          {isLoading || isFetching ? (
            <View style={{ paddingTop: 12, gap: 12 }}>
              <Skeleton.Row gap={12}>
                <Skeleton.Block width={52} height={36} radius={10} />
                <Skeleton.Block height={36} radius={10} style={{ flex: 1 }} />
              </Skeleton.Row>
              <Skeleton.Row gap={12}>
                <Skeleton.Block width={52} height={36} radius={10} />
                <Skeleton.Block height={36} radius={10} style={{ flex: 1 }} />
              </Skeleton.Row>
              <Skeleton.Row gap={12}>
                <Skeleton.Block width={52} height={36} radius={10} />
                <Skeleton.Block height={36} radius={10} style={{ flex: 1 }} />
              </Skeleton.Row>
            </View>
          ) : isError ? (
            <ErrorState onRetry={refetch} />
          ) : filtered.length === 0 ? (
            <View style={styles.empty}>
              <AppText style={[typography.bodyMedium, { color: colors.slate }]}>
                {t('owner.calendar.noAppointments')}
              </AppText>
            </View>
          ) : (
            filtered.map((apt, i) => (
              <AppointmentRow
                key={apt.id}
                appointment={apt}
                language={language}
                onPress={handleAppointmentPress}
                isLast={i === filtered.length - 1}
              />
            ))
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      {/* ── Filter modal sheet ─────────────────────────────────── */}
      <BottomSheetForm
        ref={filterSheetRef}
        title={t('owner.calendar.filterTitle')}
        snapPoints={['40%']}
      >
        <View style={styles.filterList}>
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f;
            const key = `filter${f.charAt(0).toUpperCase() + f.slice(1)}`;
            return (
              <PressablePremium
                key={f}
                haptic="selection"
                pressScale={0.985}
                onPress={() => {
                  setStatusFilter(f);
                  filterSheetRef.current?.dismiss();
                }}
                style={styles.filterRow}
              >
                <View
                  style={[
                    styles.radio,
                    isActive && styles.radioActive,
                  ]}
                >
                  {isActive && <View style={styles.radioDot} />}
                </View>
                <AppText
                  style={[
                    typography.bodyMedium,
                    { color: isActive ? colors.ink : colors.slate },
                  ]}
                >
                  {t(`owner.calendar.${key}`)}
                </AppText>
              </PressablePremium>
            );
          })}
        </View>
      </BottomSheetForm>
    </View>
  );
}

/* ── Appointment row ───────────────────────────────────────────────── */

function AppointmentRow({
  appointment,
  language,
  onPress,
  isLast,
}: {
  appointment: Appointment;
  language: string;
  onPress: (apt: Appointment) => void;
  isLast: boolean;
}) {
  const clientName = appointment.client
    ? `${appointment.client.first_name} ${appointment.client.last_name}`.trim()
    : '—';
  const serviceName =
    language === 'ar' && appointment.service?.name_ar
      ? appointment.service.name_ar
      : appointment.service?.name ?? '';
  const dotColor = STATUS_DOT[appointment.status] ?? colors.slateSoft;

  return (
    <PressablePremium
      haptic="selection"
      pressScale={0.985}
      onPress={() => onPress(appointment)}
      style={[styles.row, !isLast && styles.rowDivider]}
    >
      <View style={styles.timeCol}>
        <AppText style={[typography.bodyMedium, styles.timeStart]}>
          {formatTime(appointment.start_time)}
        </AppText>
        <AppText style={[typography.caption, styles.timeEnd]}>
          {formatTime(appointment.end_time)}
        </AppText>
      </View>
      <View style={[styles.statusBar, { backgroundColor: dotColor }]} />
      <Avatar name={clientName} size={32} />
      <View style={{ flex: 1 }}>
        <AppText style={[typography.bodyMedium, styles.client]} numberOfLines={1}>
          {clientName}
        </AppText>
        <AppText style={[typography.bodySmall, styles.service]} numberOfLines={1}>
          {serviceName}
        </AppText>
      </View>
      <AppText style={[typography.bodyMedium, styles.price]}>
        {formatCurrency(appointment.total_price)}
      </AppText>
    </PressablePremium>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 4,
    paddingBottom: 8,
  },
  title: {
    color: colors.ink,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.input,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  segmentWrap: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 8,
  },
  calendarWrap: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 8,
  },
  /* persistent sheet */
  sheetBackground: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
  },
  sheetHandle: {
    backgroundColor: colors.hairline,
    width: 36,
    height: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  sheetTitle: {
    color: colors.ink,
  },
  sheetCount: {
    color: colors.slateSoft,
    fontFamily: 'Outfit-SemiBold',
    fontVariant: ['tabular-nums'],
  },
  sheetBody: {
    paddingBottom: 140,
  },
  empty: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.screenPadding,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  timeCol: {
    width: 52,
  },
  timeStart: {
    color: colors.ink,
    fontFamily: 'Outfit-SemiBold',
    fontVariant: ['tabular-nums'],
  },
  timeEnd: {
    color: colors.slateSoft,
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  statusBar: {
    width: 3,
    height: 36,
    borderRadius: 2,
  },
  client: {
    color: colors.ink,
    fontFamily: 'Outfit-SemiBold',
  },
  service: {
    color: colors.slate,
    marginTop: 1,
  },
  price: {
    color: colors.accent,
    fontFamily: 'Outfit-SemiBold',
    fontVariant: ['tabular-nums'],
  },
  /* filter sheet */
  filterList: {
    gap: 2,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.ink,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.ink,
  },
});
