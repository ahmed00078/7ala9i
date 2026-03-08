import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: boolean;
}

export function StatCard({ title, value, subtitle, accent }: StatCardProps) {
  return (
    <View style={[styles.card, accent && styles.cardAccent]}>
      <Text style={[styles.title, accent && styles.titleAccent]}>{title}</Text>
      <Text style={[styles.value, accent && styles.valueAccent]}>{value}</Text>
      {subtitle && <Text style={[styles.subtitle, accent && styles.subtitleAccent]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    flex: 1,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardAccent: {
    backgroundColor: colors.accent,
  },
  title: {
    fontSize: 11,
    fontFamily: 'Outfit-Medium',
    color: colors.grayDark,
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'auto',
  },
  titleAccent: {
    color: 'rgba(255,255,255,0.8)',
  },
  value: {
    fontSize: 28,
    fontFamily: 'Outfit-Bold',
    color: colors.black,
    textAlign: 'auto',
  },
  valueAccent: {
    color: colors.white,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: 'Outfit-Regular',
    color: colors.gray,
    marginTop: 4,
    textAlign: 'auto',
  },
  subtitleAccent: {
    color: 'rgba(255,255,255,0.75)',
  },
});
