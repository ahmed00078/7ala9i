import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isSameDay } from 'date-fns';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { useLanguage } from '../../contexts/LanguageContext';
import { ownerApi } from '../../api/owner';
import { getImageUrl } from '../../api/client';
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
  AppointmentDetailSheet,
  type AppointmentDetailSheetRef,
  type AppointmentDetailAppointment,
  WalkInBookingSheet,
  type WalkInBookingSheetRef,
  useToast,
} from '../../components/premium';

const STATUS_FILTERS = ['all', 'confirmed', 'completed', 'no_show', 'cancelled'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];
type ViewMode = 'day' | 'week' | 'month';

type Appointment = AppointmentDetailAppointment & {
  booking_date?: string | null;
};

const STATUS_DOT: Record<string, string> = {
  confirmed: colors.accent,
  completed: colors.ok,
  cancelled: colors.danger,
  no_show: colors.slateSoft,
};

export function CalendarScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  const filterSheetRef = useRef<BottomSheetFormRef>(null);
  const detailSheetRef = useRef<AppointmentDetailSheetRef>(null);
  const walkInSheetRef = useRef<WalkInBookingSheetRef>(null);

  // In month view, anchor the query on the first day of the visible month so
  // the response stays stable as the user pages through the calendar grid.
  const queryDate = useMemo(() => {
    if (viewMode === 'month') return format(visibleMonth, 'yyyy-MM-01');
    return selectedDate;
  }, [viewMode, selectedDate, visibleMonth]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['owner', 'appointments', queryDate, viewMode],
    queryFn: () =>
      ownerApi.getAppointments({
        date: queryDate,
        week: viewMode === 'week',
        month: viewMode === 'month',
      }),
  });

  const all = (data?.data ?? []) as Appointment[];

  // Power the per-day dots on MonthCalendar. Cancelled bookings are excluded
  // so the owner only sees days that still hold real reservations.
  const bookingsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const apt of all) {
      if (!apt.booking_date) continue;
      if (apt.status === 'cancelled') continue;
      map[apt.booking_date] = (map[apt.booking_date] ?? 0) + 1;
    }
    return map;
  }, [all]);

  const filtered = useMemo(() => {
    const byStatus =
      statusFilter === 'all' ? all : all.filter((a) => a.status === statusFilter);
    if (viewMode !== 'month') return byStatus;
    // Month view: don't filter by selectedDate — show every day in the month.
    return byStatus;
  }, [all, statusFilter, viewMode]);

  // For day-view: items match the selected calendar date.
  // For week/month: items match what the backend returned, already scoped.
  const visibleList = useMemo(() => {
    if (viewMode === 'day') {
      return filtered.filter((apt) => {
        if (!apt.booking_date) return true;
        return isSameDay(parseISO(apt.booking_date), parseISO(selectedDate));
      });
    }
    return filtered;
  }, [filtered, viewMode, selectedDate]);

  const searchedList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return visibleList;
    return visibleList.filter((apt) => {
      const c = apt.client;
      const name = `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim().toLowerCase();
      const phone = (c?.phone ?? '').toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [visibleList, searchQuery]);

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      paymentMethod,
    }: {
      id: string;
      status: 'completed' | 'no_show' | 'cancelled';
      paymentMethod?: 'cash' | 'mobile';
    }) => ownerApi.updateBookingStatus(id, status, paymentMethod),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner'] });
      const salonId = queryClient.getQueryData<{ id: string }>(['owner', 'salon'])?.id;
      if (salonId) {
        queryClient.invalidateQueries({ queryKey: ['salon', salonId] });
      }
      queryClient.invalidateQueries({ queryKey: ['salons', 'recommended'] });
      queryClient.invalidateQueries({ queryKey: ['salons', 'popular'] });
      queryClient.invalidateQueries({ queryKey: ['salons', 'nearby'] });
      detailSheetRef.current?.dismiss();
      toast.show({ message: t('owner.appointmentDetail.statusUpdated'), variant: 'saved' });
    },
    onError: () => {
      toast.show({ message: t('errors.server'), variant: 'error' });
    },
  });

  const handleAppointmentPress = useCallback((apt: Appointment) => {
    detailSheetRef.current?.present(apt);
  }, []);

  const segmentOptions = useMemo(
    () =>
      [
        { value: 'day' as ViewMode, label: t('owner.calendar.day') },
        { value: 'week' as ViewMode, label: t('owner.calendar.week') },
        { value: 'month' as ViewMode, label: t('owner.calendar.month') },
      ],
    [t],
  );

  const monthHeaderCount = viewMode === 'month' ? searchedList.length : null;

  const openSearch = () => {
    setSearchOpen(true);
    // small delay so the input is mounted before focusing
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };
  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        {/* ── Slim header ──────────────────────────────────────────── */}
        <View style={styles.header}>
          {searchOpen ? (
            <View style={styles.searchPill}>
              <Ionicons name="search-outline" size={16} color={colors.slate} />
              <TextInput
                ref={searchInputRef}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('owner.calendar.searchPlaceholder')}
                placeholderTextColor={colors.slateSoft}
                returnKeyType="search"
                style={styles.searchInput}
              />
              <PressablePremium
                haptic="selection"
                pressScale={0.92}
                onPress={closeSearch}
                style={styles.searchClose}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
              >
                <Ionicons name="close" size={16} color={colors.slate} />
              </PressablePremium>
            </View>
          ) : (
            <AppText style={[typography.header, styles.title]}>
              {t('owner.calendar.title')}
            </AppText>
          )}
          {!searchOpen && (
            <View style={styles.headerActions}>
              <PressablePremium
                haptic="selection"
                pressScale={0.92}
                onPress={openSearch}
                style={styles.filterBtn}
                accessibilityRole="button"
                accessibilityLabel={t('owner.calendar.searchPlaceholder')}
              >
                <Ionicons name="search-outline" size={20} color={colors.ink} />
              </PressablePremium>
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
          )}
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
          bookingsByDate={bookingsByDate}
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
          <View style={{ flex: 1 }}>
            <AppText style={[typography.header, styles.sheetTitle]} numberOfLines={1}>
              {viewMode === 'month'
                ? format(visibleMonth, 'MMMM yyyy')
                : format(new Date(selectedDate), 'EEEE d MMM')}
            </AppText>
            {monthHeaderCount !== null && (
              <AppText style={[typography.caption, styles.sheetSub]}>
                {t('owner.calendar.monthCount', { count: monthHeaderCount })}
              </AppText>
            )}
          </View>
          <AppText style={[typography.caption, styles.sheetCount]}>
            {searchedList.length}
          </AppText>
        </View>

        <BottomSheetScrollView contentContainerStyle={styles.sheetBody}>
          {isLoading || isFetching ? (
            <View style={{ paddingTop: 12, gap: 12 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton.Row key={i} gap={12}>
                  <Skeleton.Block width={52} height={36} radius={10} />
                  <Skeleton.Block height={36} radius={10} style={{ flex: 1 }} />
                </Skeleton.Row>
              ))}
            </View>
          ) : isError ? (
            <ErrorState onRetry={refetch} />
          ) : searchedList.length === 0 ? (
            <View style={styles.empty}>
              <AppText style={[typography.bodyMedium, { color: colors.slate }]}>
                {searchQuery.trim()
                  ? t('owner.calendar.searchNoResults')
                  : t(
                      viewMode === 'week'
                        ? 'owner.calendar.noAppointmentsWeek'
                        : viewMode === 'month'
                        ? 'owner.calendar.noAppointmentsMonth'
                        : 'owner.calendar.noAppointments',
                    )}
              </AppText>
            </View>
          ) : (
            searchedList.map((apt, i) => (
              <AppointmentRow
                key={apt.id}
                appointment={apt}
                language={language}
                onPress={handleAppointmentPress}
                isLast={i === searchedList.length - 1}
                showDate={viewMode !== 'day'}
              />
            ))
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      {/* ── Filter modal sheet ─────────────────────────────────── */}
      <BottomSheetForm
        ref={filterSheetRef}
        title={t('owner.calendar.filterTitle')}
        snapPoints={['45%']}
      >
        <View style={styles.filterList}>
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f;
            const key = `filter${f === 'no_show' ? 'NoShow' : f.charAt(0).toUpperCase() + f.slice(1)}`;
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
                {f !== 'all' && (
                  <View style={[styles.filterDotInRow, { backgroundColor: STATUS_DOT[f] }]} />
                )}
              </PressablePremium>
            );
          })}
        </View>
      </BottomSheetForm>

      {/* ── Appointment detail sheet ────────────────────────────── */}
      <AppointmentDetailSheet
        ref={detailSheetRef}
        language={language}
        loading={statusMutation.isPending}
        onChangeStatus={(id, status, paymentMethod) =>
          statusMutation.mutate({ id, status, paymentMethod })
        }
      />

      {/* ── Walk-in booking sheet ───────────────────────────────── */}
      <WalkInBookingSheet ref={walkInSheetRef} />

      {/* ── + FAB ─────────────────────────────────────────────── */}
      <PressablePremium
        haptic="impact"
        pressScale={0.92}
        onPress={() => walkInSheetRef.current?.present(selectedDate)}
        style={styles.fab}
        accessibilityRole="button"
        accessibilityLabel={t('owner.calendar.addAppointment')}
      >
        <Ionicons name="add" size={28} color={colors.surface} />
      </PressablePremium>
    </View>
  );
}

/* ── Appointment row ───────────────────────────────────────────────── */

function AppointmentRow({
  appointment,
  language,
  onPress,
  isLast,
  showDate,
}: {
  appointment: Appointment;
  language: string;
  onPress: (apt: Appointment) => void;
  isLast: boolean;
  showDate?: boolean;
}) {
  const clientName = appointment.client
    ? `${appointment.client.first_name ?? ''} ${appointment.client.last_name ?? ''}`.trim() || '—'
    : '—';
  const serviceName =
    language === 'ar' && appointment.service?.name_ar
      ? appointment.service.name_ar
      : appointment.service?.name ?? '';
  const dotColor = STATUS_DOT[appointment.status] ?? colors.slateSoft;
  // Completed rows get a finished feel: brighter accent bar + ✓ + receded text.
  // Cancelled / no-show rows are struck through and dimmed.
  const isCompleted = appointment.status === 'completed';
  const isVoided = appointment.status === 'cancelled' || appointment.status === 'no_show';
  const struck = isVoided ? styles.struck : null;

  return (
    <PressablePremium
      haptic="selection"
      pressScale={0.985}
      onPress={() => onPress(appointment)}
      style={[styles.row, !isLast && styles.rowDivider]}
      accessibilityRole="button"
      accessibilityState={{ selected: isCompleted, disabled: isVoided }}
    >
      <View style={styles.timeCol}>
        {showDate && appointment.booking_date ? (
          <AppText style={[typography.caption, styles.dateLabel]}>
            {format(parseISO(appointment.booking_date), 'd MMM')}
          </AppText>
        ) : null}
        <View style={styles.timeStartRow}>
          <AppText
            style={[
              typography.bodyMedium,
              styles.timeStart,
              isVoided && styles.timeStartVoided,
              struck,
            ]}
          >
            {formatTime(appointment.start_time)}
          </AppText>
          {isCompleted ? (
            <Ionicons name="checkmark-circle" size={13} color={colors.ok} />
          ) : null}
        </View>
        <AppText style={[typography.caption, styles.timeEnd, struck]}>
          {formatTime(appointment.end_time)}
        </AppText>
      </View>
      <View
        style={[
          styles.statusBar,
          { backgroundColor: dotColor },
          isCompleted && styles.statusBarCompleted,
        ]}
      />
      <View style={isVoided ? styles.dim : null}>
        <Avatar name={clientName} uri={getImageUrl(appointment.client?.avatar_url)} size={32} />
      </View>
      <View style={[{ flex: 1 }, isVoided && styles.dim]}>
        <AppText
          style={[
            typography.bodyMedium,
            styles.client,
            isCompleted && styles.clientCompleted,
            struck,
          ]}
          numberOfLines={1}
        >
          {clientName}
        </AppText>
        <AppText
          style={[typography.bodySmall, styles.service, struck]}
          numberOfLines={1}
        >
          {serviceName}
        </AppText>
      </View>
      <AppText
        style={[
          typography.bodyMedium,
          styles.price,
          isCompleted && styles.priceCompleted,
          isVoided && styles.priceVoided,
        ]}
      >
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.input,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.ink,
    paddingVertical: 0,
  },
  searchClose: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  sheetTitle: {
    color: colors.ink,
  },
  sheetSub: {
    color: colors.slateSoft,
    marginTop: 2,
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
    width: 68,
  },
  dateLabel: {
    color: colors.accent,
    fontFamily: 'Outfit-SemiBold',
    textTransform: 'uppercase',
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timeStartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeStart: {
    color: colors.ink,
    fontFamily: 'Outfit-SemiBold',
    fontVariant: ['tabular-nums'],
  },
  timeStartVoided: {
    color: colors.slateSoft,
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
  statusBarCompleted: {
    width: 4,
  },
  struck: {
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
  },
  dim: {
    opacity: 0.45,
  },
  client: {
    color: colors.ink,
    fontFamily: 'Outfit-SemiBold',
  },
  clientCompleted: {
    color: colors.slate,
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
  priceCompleted: {
    color: colors.ok,
  },
  priceVoided: {
    color: colors.slateSoft,
    textDecorationLine: 'line-through',
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
  filterDotInRow: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 'auto',
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
  fab: {
    position: 'absolute',
    right: spacing.screenPadding,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
});
