import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../ui/AppText';
import { PressablePremium } from './PressablePremium';
import { colors } from '../../theme/colors';
import { useIsRTL } from '../../i18n/useIsRTL';

export interface SettingsRowProps {
  /** Ionicon name shown in the start circle. */
  icon: keyof typeof Ionicons.glyphMap;
  /** Visible row label. */
  label: string;
  /** Optional right-aligned value (e.g. user email, language name). */
  value?: string;
  /** Tap handler. If omitted the row renders as plain info, no chevron. */
  onPress?: () => void;
  /** Force chevron off (e.g. for a read-only row that's still wrapped in onPress for analytics). */
  chevron?: boolean;
  /** Red tone for destructive rows (Sign out, Delete). */
  danger?: boolean;
}

/**
 * §5.16 / §5.20 — single row used in every grouped settings list (client,
 * admin, owner profile). Icon disc on the start, label + optional value
 * stacked, chevron on the end. Editorial tokens only.
 */
export function SettingsRow({
  icon,
  label,
  value,
  onPress,
  chevron = true,
  danger,
}: SettingsRowProps) {
  const rtl = useIsRTL();
  const iconColor = danger ? colors.danger : colors.accent;
  const iconBg = danger ? '#F6E0DE' : colors.accentSoft;
  const showChevron = !!onPress && chevron;

  const body = (
    <View style={styles.row}>
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.content}>
        <AppText
          style={[styles.label, danger && styles.labelDanger]}
          numberOfLines={1}
        >
          {label}
        </AppText>
        {value != null && value !== '' && (
          <AppText style={styles.value} numberOfLines={1}>
            {value}
          </AppText>
        )}
      </View>
      {showChevron && (
        <Ionicons
          name={rtl ? 'chevron-back' : 'chevron-forward'}
          size={16}
          color={danger ? colors.danger : colors.slateSoft}
        />
      )}
    </View>
  );

  if (!onPress) return body;
  return (
    <PressablePremium onPress={onPress} pressScale={0.99} haptic="selection">
      {body}
    </PressablePremium>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, minWidth: 0 },
  label: {
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  labelDanger: { color: colors.danger, fontFamily: 'Outfit-SemiBold' },
  value: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.slate,
    marginTop: 2,
  },
});
