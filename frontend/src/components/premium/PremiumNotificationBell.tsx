import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../../api/notifications';
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { PressablePremium } from './PressablePremium';
import { AppText } from '../ui/AppText';

interface Props {
  /** Color of the bell glyph. */
  iconColor?: string;
  /** Background of the touch target. */
  surfaceColor?: string;
  /** Where to navigate on tap (defaults to "Notifications" route in current stack). */
  routeName?: string;
}

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
  const label = unread > 99 ? '99+' : String(unread);
  const isWide = label.length > 1;

  return (
    <PressablePremium
      haptic="selection"
      pressScale={0.92}
      onPress={() => navigation.navigate(routeName)}
      style={[styles.btn, { backgroundColor: surfaceColor }]}
      accessibilityRole="button"
      accessibilityLabel={hasUnread ? `Notifications, ${label} unread` : 'Notifications'}
    >
      <Ionicons
        name={hasUnread ? 'notifications' : 'notifications-outline'}
        size={20}
        color={iconColor}
      />
      {hasUnread && (
        <View style={[styles.badge, isWide && styles.badgeWide]}>
          <AppText style={styles.badgeText} numberOfLines={1}>
            {label}
          </AppText>
        </View>
      )}
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
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWide: {
    paddingHorizontal: 5,
  },
  badgeText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 9,
    lineHeight: 11,
    color: colors.white,
    letterSpacing: 0.2,
  },
});
