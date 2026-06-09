import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../../api/notifications';
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { PressablePremium } from './PressablePremium';

interface Props {
  /** Color of the bell glyph. */
  iconColor?: string;
  /** Background of the touch target. */
  surfaceColor?: string;
  /** Where to navigate on tap (defaults to "Notifications" route in current stack). */
  routeName?: string;
}

/**
 * Premium-redesign notification bell (§5.1): unread state is a tiny **accent
 * dot** at top-right of the icon — never a red number badge. Above 9? Doesn't
 * matter; the dot doesn't change.
 */
export function PremiumNotificationBell({
  iconColor = colors.white,
  surfaceColor = 'rgba(255,255,255,0.10)',
  routeName = 'Notifications',
}: Props) {
  const navigation = useNavigation<any>();
  const { isAuthenticated } = useAuth();

  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 15000,
    enabled: isAuthenticated,
  });

  const unread: number = data?.data?.count ?? 0;
  const hasUnread = unread > 0;

  return (
    <PressablePremium
      haptic="selection"
      pressScale={0.92}
      onPress={() => navigation.navigate(routeName)}
      style={[styles.btn, { backgroundColor: surfaceColor }]}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
    >
      <Ionicons
        name={hasUnread ? 'notifications' : 'notifications-outline'}
        size={20}
        color={iconColor}
      />
      {hasUnread && <View style={styles.dot} />}
    </PressablePremium>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
});
