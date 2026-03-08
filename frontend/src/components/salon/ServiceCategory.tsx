import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(!expanded)}>
        <Text style={styles.categoryName}>{catName}</Text>
        <Text style={styles.arrow}>{expanded ? '\u25B2' : '\u25BC'}</Text>
      </TouchableOpacity>
      {expanded && category.services.map((service) => {
        const svcName = language === 'ar' && service.name_ar ? service.name_ar : service.name;
        return (
          <TouchableOpacity
            key={service.id}
            style={styles.serviceRow}
            onPress={() => onSelectService?.(service)}
            activeOpacity={0.7}
          >
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{svcName}</Text>
              <Text style={styles.serviceDuration}>{formatDuration(service.duration)}</Text>
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
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.black,
    textAlign: 'auto',
  },
  arrow: {
    fontSize: 12,
    color: colors.gray,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  serviceInfo: {
    flex: 1,
    marginEnd: 16,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.black,
    textAlign: 'auto',
  },
  serviceDuration: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
    textAlign: 'auto',
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
  },
});
