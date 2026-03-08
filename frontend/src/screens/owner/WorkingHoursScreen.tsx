import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert, TouchableOpacity, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ownerApi } from '../../api/owner';
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

// Generate time options every 30 minutes
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
          <Text style={modalStyles.title}>{title}</Text>
          <FlatList
            data={TIME_OPTIONS}
            keyExtractor={(item) => item}
            style={modalStyles.list}
            initialScrollIndex={Math.max(0, TIME_OPTIONS.indexOf(currentTime))}
            getItemLayout={(_, index) => ({ length: 48, offset: 48 * index, index })}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[modalStyles.option, item === currentTime && modalStyles.optionSelected]}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={[modalStyles.optionText, item === currentTime && modalStyles.optionTextSelected]}>
                  {item}
                </Text>
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
      Alert.alert(t('owner.hours.saved'));
    },
  });

  if (isLoading) return <LoadingScreen />;

  const toggleDay = (dayIndex: number) => {
    setHours((prev) =>
      prev.map((h) =>
        h.day_of_week === dayIndex ? { ...h, is_closed: !h.is_closed } : h
      )
    );
  };

  const setTime = (dayIndex: number, field: 'open_time' | 'close_time', time: string) => {
    setHours((prev) =>
      prev.map((h) =>
        h.day_of_week === dayIndex ? { ...h, [field]: time } : h
      )
    );
  };

  const activeDay = pickerTarget ? hours.find((h) => h.day_of_week === pickerTarget.dayIndex) : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{t('owner.hours.title')}</Text>
        <Text style={styles.subtitle}>{t('owner.hours.subtitle')}</Text>
        <Text style={styles.note}>{t('owner.hours.fridayNote')}</Text>

        {hours
          .sort((a, b) => a.day_of_week - b.day_of_week)
          .map((day) => (
            <View key={day.day_of_week} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayName}>{getDayName(day.day_of_week)}</Text>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>
                    {day.is_closed ? t('common.closed') : t('common.open')}
                  </Text>
                  <Switch
                    value={!day.is_closed}
                    onValueChange={() => toggleDay(day.day_of_week)}
                    trackColor={{ true: colors.success, false: colors.grayLight }}
                  />
                </View>
              </View>

              {!day.is_closed && (
                <View style={styles.timesRow}>
                  <TouchableOpacity
                    style={styles.timePill}
                    onPress={() => setPickerTarget({ dayIndex: day.day_of_week, field: 'open_time' })}
                  >
                    <Text style={styles.timeLabel}>{t('owner.hours.openTime')}</Text>
                    <Text style={styles.timeValue}>{formatTime(day.open_time)}</Text>
                  </TouchableOpacity>
                  <Text style={styles.timeSep}>→</Text>
                  <TouchableOpacity
                    style={styles.timePill}
                    onPress={() => setPickerTarget({ dayIndex: day.day_of_week, field: 'close_time' })}
                  >
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
          style={{ marginTop: 24 }}
        />
      </ScrollView>

      {pickerTarget && activeDay && (
        <TimePickerModal
          visible={true}
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, maxHeight: '60%' },
  title: { fontSize: 16, fontWeight: '600', color: colors.black, textAlign: 'center', marginBottom: 8 },
  list: { flexGrow: 0 },
  option: { paddingVertical: 14, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionSelected: { backgroundColor: colors.accentLight },
  optionText: { fontSize: 16, color: colors.black, textAlign: 'center' },
  optionTextSelected: { fontWeight: '700', color: colors.black },
  cancelBtn: { padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border },
  cancelText: { fontSize: 16, color: colors.gray },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: colors.black, textAlign: 'auto' },
  subtitle: { fontSize: 14, color: colors.gray, marginBottom: 8, textAlign: 'auto' },
  note: { fontSize: 12, color: colors.warning, marginBottom: 16, textAlign: 'auto' },
  dayCard: {
    backgroundColor: colors.white, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: colors.border, marginBottom: 8,
  },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayName: { fontSize: 14, fontWeight: '600', color: colors.black, textAlign: 'auto' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchLabel: { fontSize: 12, color: colors.gray },
  timesRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  timePill: {
    flex: 1, backgroundColor: colors.background, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border, padding: 10, alignItems: 'center',
  },
  timeLabel: { fontSize: 11, color: colors.gray, marginBottom: 2 },
  timeValue: { fontSize: 16, fontWeight: '600', color: colors.black },
  timeSep: { fontSize: 18, color: colors.gray },
});
