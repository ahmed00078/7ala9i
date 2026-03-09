import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Switch, TouchableOpacity, Modal, FlatList } from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ownerApi } from '../../api/owner';
import { useAlert } from '../../contexts/AlertContext';
import { Button } from '../../components/ui/Button';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { getDayName, formatTime } from '../../utils/formatters';
import { colors } from '../../theme/colors';

interface DayHours {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

interface TimePickerModalProps {
  visible: boolean;
  currentTime: string;
  onSelect: (time: string) => void;
  onClose: () => void;
  title: string;
}

function TimePickerModal({ visible, currentTime, onSelect, onClose, title }: TimePickerModalProps) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.handle} />
          <Text style={modalStyles.title}>{title}</Text>
          <FlatList
            data={TIME_OPTIONS}
            keyExtractor={(item) => item}
            style={modalStyles.list}
            initialScrollIndex={Math.max(0, TIME_OPTIONS.indexOf(currentTime))}
            getItemLayout={(_, index) => ({ length: 52, offset: 52 * index, index })}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[modalStyles.option, item === currentTime && modalStyles.optionSelected]}
                onPress={() => { onSelect(item); onClose(); }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={item === currentTime ? colors.accent : colors.gray}
                  style={{ marginEnd: 12 }}
                />
                <Text style={[modalStyles.optionText, item === currentTime && modalStyles.optionTextSelected]}>
                  {item}
                </Text>
                {item === currentTime && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.accent} style={{ marginStart: 'auto' }} />
                )}
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose}>
            <Text style={modalStyles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function WorkingHoursScreen() {
  const { t } = useTranslation();
  const alert = useAlert();
  const queryClient = useQueryClient();
  const [hours, setHours] = useState<DayHours[]>([]);
  const [pickerTarget, setPickerTarget] = useState<{ dayIndex: number; field: 'open_time' | 'close_time' } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['owner', 'working-hours'],
    queryFn: () => ownerApi.getWorkingHours(),
  });

  useEffect(() => {
    if (data?.data) {
      setHours(
        data.data.map((h: any) => ({
          day_of_week: h.day_of_week,
          open_time: h.open_time || '09:00',
          close_time: h.close_time || '21:00',
          is_closed: h.is_closed,
        }))
      );
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => ownerApi.updateWorkingHours({ hours }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'working-hours'] });
      alert.show({
        type: 'success',
        title: t('owner.hours.saved'),
        duration: 2000,
      });
    },
  });

  if (isLoading) return <LoadingScreen />;

  const toggleDay = (dayIndex: number) => {
    setHours((prev) =>
      prev.map((h) => h.day_of_week === dayIndex ? { ...h, is_closed: !h.is_closed } : h)
    );
  };

  const setTime = (dayIndex: number, field: 'open_time' | 'close_time', time: string) => {
    setHours((prev) =>
      prev.map((h) => h.day_of_week === dayIndex ? { ...h, [field]: time } : h)
    );
  };

  const activeDay = pickerTarget ? hours.find((h) => h.day_of_week === pickerTarget.dayIndex) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Navy header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Ionicons name="time" size={22} color={colors.accent} />
          </View>
          <View>
            <Text style={styles.headerTitle}>{t('owner.hours.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('owner.hours.subtitle')}</Text>
          </View>
        </View>
        {/* Friday note */}
        <View style={styles.noticeRow}>
          <Ionicons name="information-circle-outline" size={14} color={colors.warning} />
          <Text style={styles.notice}>{t('owner.hours.fridayNote')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {hours
          .sort((a, b) => a.day_of_week - b.day_of_week)
          .map((day) => (
            <View
              key={day.day_of_week}
              style={[styles.dayCard, day.is_closed && styles.dayCardClosed]}
            >
              <View style={styles.dayHeader}>
                <View style={[styles.dayDot, day.is_closed ? styles.dayDotClosed : styles.dayDotOpen]} />
                <Text style={styles.dayName}>{getDayName(day.day_of_week)}</Text>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, !day.is_closed && styles.switchLabelOpen]}>
                    {day.is_closed ? t('common.closed') : t('common.open')}
                  </Text>
                  <Switch
                    value={!day.is_closed}
                    onValueChange={() => toggleDay(day.day_of_week)}
                    trackColor={{ true: colors.success, false: colors.grayLight }}
                    thumbColor={colors.white}
                  />
                </View>
              </View>

              {!day.is_closed && (
                <View style={styles.timesRow}>
                  <TouchableOpacity
                    style={styles.timePill}
                    onPress={() => setPickerTarget({ dayIndex: day.day_of_week, field: 'open_time' })}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="sunny-outline" size={14} color={colors.accent} style={{ marginBottom: 2 }} />
                    <Text style={styles.timeLabel}>{t('owner.hours.openTime')}</Text>
                    <Text style={styles.timeValue}>{formatTime(day.open_time)}</Text>
                  </TouchableOpacity>

                  <View style={styles.timeSep}>
                    <Ionicons name="arrow-forward" size={18} color={colors.grayLight} />
                  </View>

                  <TouchableOpacity
                    style={styles.timePill}
                    onPress={() => setPickerTarget({ dayIndex: day.day_of_week, field: 'close_time' })}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="moon-outline" size={14} color={colors.navy} style={{ marginBottom: 2 }} />
                    <Text style={styles.timeLabel}>{t('owner.hours.closeTime')}</Text>
                    <Text style={styles.timeValue}>{formatTime(day.close_time)}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

        <Button
          title={t('common.save')}
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
          style={{ marginTop: 16 }}
        />
      </ScrollView>

      {pickerTarget && activeDay && (
        <TimePickerModal
          visible
          currentTime={activeDay[pickerTarget.field]}
          title={pickerTarget.field === 'open_time' ? t('owner.hours.openTime') : t('owner.hours.closeTime')}
          onSelect={(time) => setTime(pickerTarget.dayIndex, pickerTarget.field, time)}
          onClose={() => setPickerTarget(null)}
        />
      )}
    </SafeAreaView>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  container: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: '55%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
    textAlign: 'center',
    marginBottom: 6,
  },
  list: { flexGrow: 0 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    height: 52,
  },
  optionSelected: { backgroundColor: colors.accentLight },
  optionText: { fontSize: 16, fontFamily: 'Outfit-Regular', color: colors.black },
  optionTextSelected: { fontFamily: 'Outfit-SemiBold', color: colors.accent },
  cancelBtn: { padding: 18, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border },
  cancelText: { fontSize: 15, fontFamily: 'Outfit-Medium', color: colors.gray },
});

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
    marginBottom: 12,
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
  noticeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notice: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: colors.warning,
    flex: 1,
    textAlign: 'auto',
  },
  scroll: { padding: 16 },
  dayCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  dayCardClosed: { opacity: 0.6 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayDot: { width: 8, height: 8, borderRadius: 4, marginEnd: 10 },
  dayDotOpen: { backgroundColor: colors.success },
  dayDotClosed: { backgroundColor: colors.grayLight },
  dayName: {
    fontSize: 15,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
    flex: 1,
    textAlign: 'auto',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchLabel: { fontSize: 12, fontFamily: 'Outfit-Medium', color: colors.gray },
  switchLabelOpen: { color: colors.success },
  timesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  timePill: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeLabel: {
    fontSize: 11,
    fontFamily: 'Outfit-Regular',
    color: colors.gray,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 18,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
  },
  timeSep: { alignItems: 'center' },
});
