import React, { Children, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../ui/AppText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface SettingsGroupProps {
  /** Uppercase section label. Omit to render a label-less group. */
  label?: string;
  /** Optional trailing element (e.g. a small "Edit" link). */
  action?: ReactNode;
  children: ReactNode;
}

/**
 * §5.16 — visual grouping for `SettingsRow`s. Renders the uppercase section
 * label, then a hairline-bordered surface card with hairline dividers between
 * children.
 */
export function SettingsGroup({ label, action, children }: SettingsGroupProps) {
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View>
      {(label || action) && (
        <View style={styles.labelRow}>
          {label ? <AppText style={styles.label}>{label}</AppText> : <View />}
          {action}
        </View>
      )}
      <View style={styles.card}>
        {items.map((child, idx) => (
          <View key={idx}>
            {child}
            {idx < items.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 8,
    paddingHorizontal: spacing.lg,
  },
  label: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 11,
    color: colors.slate,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
    marginStart: 56,
  },
});
