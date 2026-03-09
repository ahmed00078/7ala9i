import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText as Text } from '../ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { formatCurrency, formatDuration } from '../../utils/formatters';

interface ServiceItem {
  id: string;
  name: string;
  name_ar?: string;
  price: number;
  duration: number;
}

interface ServiceCategoryProps {
  category: {
    id: string;
    name: string;
    name_ar?: string;
    services: ServiceItem[];
  };
  language?: string;
  onSelectService?: (service: ServiceItem) => void;
}

export function ServiceCategory({ category, language, onSelectService }: ServiceCategoryProps) {
  const [expanded, setExpanded] = useState(true);
  const catName = language === 'ar' && category.name_ar ? category.name_ar : category.name;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="layers-outline" size={16} color={colors.accent} />
          </View>
          <Text style={styles.categoryName}>{catName}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{category.services.length}</Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.grayDark}
        />
      </TouchableOpacity>

      {expanded && category.services.map((service, idx) => {
        const svcName = language === 'ar' && service.name_ar ? service.name_ar : service.name;
        const isLast = idx === category.services.length - 1;
        return (
          <TouchableOpacity
            key={service.id}
            style={[styles.serviceRow, isLast && styles.serviceRowLast]}
            onPress={() => onSelectService?.(service)}
            activeOpacity={0.7}
          >
            <View style={styles.dot} />
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{svcName}</Text>
              <View style={styles.durationRow}>
                <Ionicons name="time-outline" size={11} color={colors.gray} />
                <Text style={styles.serviceDuration}> {formatDuration(service.duration)}</Text>
              </View>
            </View>
            <Text style={styles.servicePrice}>{formatCurrency(service.price)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 15,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
    flex: 1,
    textAlign: 'auto',
  },
  badge: {
    backgroundColor: colors.navy,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.white },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  serviceRowLast: {},
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentLight,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  serviceInfo: { flex: 1 },
  serviceName: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: colors.black,
    textAlign: 'auto',
  },
  durationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  serviceDuration: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: colors.gray,
  },
  servicePrice: {
    fontSize: 15,
    fontFamily: 'Outfit-SemiBold',
    color: colors.accent,
  },
});
