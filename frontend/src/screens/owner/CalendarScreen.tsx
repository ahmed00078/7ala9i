import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useLanguage } from '../../contexts/LanguageContext';
import { ownerApi } from '../../api/owner';
import { CalendarPicker } from '../../components/booking/CalendarPicker';
import { DaySchedule } from '../../components/owner/DaySchedule';
import { colors } from '../../theme/colors';

const STATUS_FILTERS = ['all', 'confirmed', 'completed', 'cancelled'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

export function CalendarScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['owner', 'appointments', selectedDate, viewMode],
    queryFn: () => ownerApi.getAppointments({ date: selectedDate, week: viewMode === 'week' }),
  });

  const allAppointments = data?.data || [];
  const appointments = statusFilter === 'all'
    ? allAppointments
    : allAppointments.filter((a: { status: string }) => a.status === statusFilter);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Navy header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Ionicons name="calendar" size={22} color={colors.accent} />
          </View>
          <View>
            <Text style={styles.headerTitle}>{t('owner.calendar.title')}</Text>
            <Text style={styles.headerSubtitle}>{format(new Date(selectedDate), 'MMMM yyyy')}</Text>
          </View>
        </View>

        {/* Pill mode toggle inside header */}
        <View style={styles.pillToggle}>
          {(['day', 'week'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.pillBtn, viewMode === mode && styles.pillBtnActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[styles.pillText, viewMode === mode && styles.pillTextActive]}>
                {t(`owner.calendar.${mode}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <CalendarPicker
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          language={language}
        />

        {/* Status filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterPill, statusFilter === f && styles.filterPillActive]}
              onPress={() => setStatusFilter(f)}
            >
              <Text style={[styles.filterPillText, statusFilter === f && styles.filterPillTextActive]}>
                {t(`owner.calendar.filter${f.charAt(0).toUpperCase() + f.slice(1)}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>
            {t('tabs.appointments')}
          </Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{appointments.length}</Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 32 }} />
        ) : (
          <DaySchedule
            appointments={appointments}
            language={language}
            showDate={viewMode === 'week'}
            allowActions
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    color: colors.white,
    textAlign: 'auto',
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'auto',
  },
  pillToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 3,
    alignSelf: 'flex-start',
  },
  pillBtn: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 18,
  },
  pillBtnActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  pillText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: 'rgba(255,255,255,0.7)' },
  pillTextActive: { color: colors.navy, fontFamily: 'Outfit-SemiBold' },
  scroll: { padding: 16 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Outfit-SemiBold',
    color: colors.grayDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'auto',
  },
  countBadge: {
    backgroundColor: colors.navy,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.white },
  filterScroll: {
    marginTop: 24,
    marginHorizontal: -16,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  filterPillActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  filterPillText: {
    fontSize: 12,
    fontFamily: 'Outfit-Medium',
    color: colors.gray,
  },
  filterPillTextActive: {
    color: colors.accent,
    fontFamily: 'Outfit-SemiBold',
  },
});
