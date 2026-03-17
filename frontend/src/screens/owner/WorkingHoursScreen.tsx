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
import { getDayName } from '../../utils/formatters';
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
          open_time: (h.open_time || '09:00').slice(0, 5),
          close_time: (h.close_time || '21:00').slice(0, 5),
          is_closed: h.is_closed,
        }))
      );
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => ownerApi.updateWorkingHours({ hours }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'working-hours'] });
      alert.show({ type: 'success', title: t('owner.hours.saved'), duration: 2000 });
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
      {/* Header */}
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
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {hours
          .sort((a, b) => a.day_of_week - b.day_of_week)
          .map((day) => (
            <View
              key={day.day_of_week}
              style={[styles.dayRow, day.is_closed && styles.dayRowClosed]}
            >
              {/* Dot + Day name */}
              <View style={[styles.dot, day.is_closed ? styles.dotClosed : styles.dotOpen]} />
              <Text style={[styles.dayName, day.is_closed && styles.dayNameClosed]}>
                {getDayName(day.day_of_week)}
              </Text>

              {/* Times or closed label */}
              {day.is_closed ? (
                <View style={styles.closedBadge}>
                  <Text style={styles.closedText}>{t('common.closed')}</Text>
                </View>
              ) : (
                <View style={styles.timesInline}>
                  <TouchableOpacity
                    onPress={() => setPickerTarget({ dayIndex: day.day_of_week, field: 'open_time' })}
                    activeOpacity={0.7}
                    style={styles.timeBtn}
                  >
                    <Text style={styles.timeText}>{day.open_time}</Text>
                  </TouchableOpacity>
                  <Ionicons name="arrow-forward" size={12} color={colors.grayLight} />
                  <TouchableOpacity
                    onPress={() => setPickerTarget({ dayIndex: day.day_of_week, field: 'close_time' })}
                    activeOpacity={0.7}
                    style={styles.timeBtn}
                  >
                    <Text style={styles.timeText}>{day.close_time}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Switch */}
              <View style={styles.switchWrapper}>
                <Switch
                  value={!day.is_closed}
                  onValueChange={() => toggleDay(day.day_of_week)}
                  trackColor={{ true: colors.accent, false: colors.grayLight }}
                  thumbColor={colors.white}
                />
              </View>
            </View>
          ))}

        <Button
          title={t('common.save')}
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
          style={{ marginTop: 8 }}
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
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: 12,
  },
  title: {
    fontSize: 16, fontFamily: 'Outfit-SemiBold',
    color: colors.black, textAlign: 'center', marginBottom: 6,
  },
  list: { flexGrow: 0 },
  option: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 24,
    borderBottomWidth: 1, borderBottomColor: colors.border, height: 52,
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
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  headerIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20, fontFamily: 'Outfit-Bold', color: colors.white, textAlign: 'auto',
  },
  headerSubtitle: {
    fontSize: 13, fontFamily: 'Outfit-Regular',
    color: 'rgba(255,255,255,0.6)', textAlign: 'auto',
  },
  scroll: { padding: 16, paddingBottom: 32 },

  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 10,
  },
  dayRowClosed: { opacity: 0.55 },

  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  dotOpen: { backgroundColor: colors.accent },
  dotClosed: { backgroundColor: colors.grayLight },

  dayName: {
    fontSize: 14,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
    width: 90,
    textAlign: 'auto',
  },
  dayNameClosed: { color: colors.grayDark },

  closedBadge: {
    flex: 1,
    alignItems: 'center',
  },
  closedText: {
    fontSize: 12,
    fontFamily: 'Outfit-Medium',
    color: colors.gray,
  },

  timesInline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  timeBtn: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeText: {
    fontSize: 13,
    fontFamily: 'Outfit-SemiBold',
    color: colors.navy,
  },

  switchWrapper: { flexShrink: 0 },
});
