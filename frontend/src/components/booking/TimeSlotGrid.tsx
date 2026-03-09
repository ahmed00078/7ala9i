import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText as Text } from '../ui/AppText';
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
    gap: 10,
  },
  slot: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    minWidth: 84,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  slotSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  slotText: {
    fontSize: 13,
    fontFamily: 'Outfit-Medium',
    color: colors.grayDark,
  },
  slotTextSelected: {
    color: colors.white,
    fontFamily: 'Outfit-SemiBold',
  },
});
