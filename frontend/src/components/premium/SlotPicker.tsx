import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../ui/AppText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { TimeChip } from './TimeChip';

interface SlotPickerProps {
  slots: string[];
  selectedSlot: string | null;
  onSelectSlot: (slot: string) => void;
  labels: { morning: string; afternoon: string; evening: string };
}

/**
 * §5.8 — vertically scrolling time slots grouped by morning / afternoon /
 * evening. The 30-min strings the backend returns ("HH:MM" or "HH:MM:SS")
 * are bucketed by hour before render.
 *
 * Groups with no available slots are hidden entirely — empty headers look
 * like dead UI.
 */
export function SlotPicker({ slots, selectedSlot, onSelectSlot, labels }: SlotPickerProps) {
  const grouped = useMemo(() => {
    const morning: string[] = [];
    const afternoon: string[] = [];
    const evening: string[] = [];
    for (const s of slots) {
      const h = parseInt(s.slice(0, 2), 10);
      if (h < 12) morning.push(s);
      else if (h < 17) afternoon.push(s);
      else evening.push(s);
    }
    return { morning, afternoon, evening };
  }, [slots]);

  return (
    <View style={styles.wrap}>
      {grouped.morning.length > 0 && (
        <SlotGroup
          label={labels.morning}
          slots={grouped.morning}
          selectedSlot={selectedSlot}
          onSelect={onSelectSlot}
        />
      )}
      {grouped.afternoon.length > 0 && (
        <SlotGroup
          label={labels.afternoon}
          slots={grouped.afternoon}
          selectedSlot={selectedSlot}
          onSelect={onSelectSlot}
        />
      )}
      {grouped.evening.length > 0 && (
        <SlotGroup
          label={labels.evening}
          slots={grouped.evening}
          selectedSlot={selectedSlot}
          onSelect={onSelectSlot}
        />
      )}
    </View>
  );
}

function SlotGroup({
  label,
  slots,
  selectedSlot,
  onSelect,
}: {
  label: string;
  slots: string[];
  selectedSlot: string | null;
  onSelect: (s: string) => void;
}) {
  return (
    <View style={styles.group}>
      <AppText style={styles.groupLabel}>{label}</AppText>
      <View style={styles.grid}>
        {slots.map((slot) => (
          <TimeChip
            key={slot}
            label={slot.slice(0, 5)}
            state={selectedSlot === slot ? 'selected' : 'available'}
            onPress={() => onSelect(slot)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  group: { gap: 12 },
  groupLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.slate,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
