import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { AppText } from '../ui/AppText';
import { colors } from '../../theme/colors';

interface ProfileIdentityProps {
  /** Display name shown under the avatar. */
  name: string;
  /** Secondary line (phone, email, etc.). */
  sub?: string | null;
  /** Optional role chip ("Admin", "Owner", "Client"). */
  role?: string;
  /** Tap the avatar to open edit. Shows an ink edit-dot overlay when provided. */
  onEdit?: () => void;
  /** Avatar diameter — defaults to 88. */
  avatarSize?: number;
  /** Optional avatar image URI (resolved, ready-to-display). Monogram fallback when missing. */
  avatarUri?: string | null;
  style?: ViewStyle;
}

/**
 * §5.16 / §5.20 — top identity block shared by every profile screen.
 * Centered avatar (with optional ink edit-dot), name, secondary line, optional
 * role chip. No dark hero — sits flush on the canvas.
 */
export function ProfileIdentity({
  name,
  sub,
  role,
  onEdit,
  avatarSize = 88,
  avatarUri,
  style,
}: ProfileIdentityProps) {
  const avatar = (
    <View style={styles.avatarWrap}>
      <Avatar name={name} uri={avatarUri} size={avatarSize} />
      {onEdit && (
        <View style={styles.editDot}>
          <Ionicons name="pencil" size={12} color={colors.surface} />
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.root, style]}>
      {onEdit ? (
        <Pressable onPress={onEdit} accessibilityRole="button">
          {avatar}
        </Pressable>
      ) : (
        avatar
      )}
      <AppText style={styles.name} numberOfLines={1}>{name}</AppText>
      {sub ? <AppText style={styles.sub}>{sub}</AppText> : null}
      {role ? (
        <View style={styles.roleChip}>
          <AppText style={styles.roleText}>{role}</AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  avatarWrap: { position: 'relative' },
  editDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.canvas,
  },
  name: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    color: colors.ink,
    marginTop: 12,
    letterSpacing: -0.3,
  },
  sub: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.slate,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  roleChip: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
  },
  roleText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 11,
    color: colors.slate,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
