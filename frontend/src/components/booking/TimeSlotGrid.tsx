import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { formatTime } from '../../utils/formatters';

interface TimeSlotGridProps {
  slots: string[];
  selectedSlot: string | null;
  onSelectSlot: (slot: string) => void;
}

export function TimeSlotGrid({ slots, selectedSlot, onSelectSlot }: TimeSlotGridProps) {
  return (
    <View style={styles.grid}>
      {slots.map((slot) => {
        const isSelected = slot === selectedSlot;
        return (
          <TouchableOpacity
            key={slot}
            style={[styles.slot, isSelected && styles.slotSelected]}
            onPress={() => onSelectSlot(slot)}
            activeOpacity={0.7}
          >
            <Text style={[styles.slotText, isSelected && styles.slotTextSelected]}>
              {formatTime(slot)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slot: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    minWidth: 80,
    alignItems: 'center',
  },
  slotSelected: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  slotText: {
    fontSize: 14,
    color: colors.black,
    fontWeight: '500',
  },
  slotTextSelected: {
    color: colors.white,
  },
});
