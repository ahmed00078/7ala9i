import React, { useState } from 'react';
import { StyleSheet, ScrollView, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useLanguage } from '../../contexts/LanguageContext';
import { ownerApi } from '../../api/owner';
import { CalendarPicker } from '../../components/booking/CalendarPicker';
import { DaySchedule } from '../../components/owner/DaySchedule';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { colors } from '../../theme/colors';

export function CalendarScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  const { data, isLoading } = useQuery({
    queryKey: ['owner', 'appointments', selectedDate, viewMode],
    queryFn: () => ownerApi.getAppointments({ date: selectedDate, week: viewMode === 'week' }),
  });

  const appointments = data?.data || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{t('owner.calendar.title')}</Text>

        {/* Day / Week toggle */}
        <View style={styles.modeToggle}>
          {(['day', 'week'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.modeBtn, viewMode === mode && styles.modeBtnActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[styles.modeBtnText, viewMode === mode && styles.modeBtnTextActive]}>
                {t(`owner.calendar.${mode}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <CalendarPicker
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          language={language}
        />

        <Text style={styles.sectionTitle}>
          {appointments.length} {t('tabs.appointments')}
        </Text>

        {isLoading ? (
          <LoadingScreen />
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
  scroll: { padding: 16 },
  title: { fontSize: 22, fontFamily: 'Outfit-Bold', color: colors.black, marginBottom: 16, textAlign: 'auto' },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeBtnActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  modeBtnText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: colors.gray },
  modeBtnTextActive: { color: colors.black },
  sectionTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.grayDark, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 20, marginBottom: 12, textAlign: 'auto' },
});
