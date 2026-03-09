import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText as Text } from '../ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconBg?: string;
  iconColor?: string;
  accent?: boolean;
}

export function StatCard({ title, value, subtitle, icon, iconBg, iconColor, accent }: StatCardProps) {
  const bg   = iconBg    || colors.accentLight;
  const icol = iconColor || colors.accent;

  return (
    <View style={[styles.card, accent && styles.cardAccent]}>
      {icon && (
        <View style={[styles.iconBox, { backgroundColor: accent ? 'rgba(255,255,255,0.2)' : bg }]}>
          <Ionicons name={icon} size={20} color={accent ? colors.white : icol} />
        </View>
      )}
      <Text style={[styles.title, accent && styles.titleAccent]}>{title}</Text>
      <Text style={[styles.value, accent && styles.valueAccent]}>{value}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, accent && styles.subtitleAccent]}>{subtitle}</Text>
      )}
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
    shadowRadius: 10,
    elevation: 4,
  },
  cardAccent: {
    backgroundColor: colors.accent,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 11,
    fontFamily: 'Outfit-Medium',
    color: colors.grayDark,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
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
