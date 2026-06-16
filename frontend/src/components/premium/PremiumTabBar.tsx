import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors } from '../../theme/colors';
import { AppText } from '../ui/AppText';
import { PressablePremium } from './PressablePremium';

/**
 * §4.10 — replaces the stock bottom-tabs bar with a translucent blurred bar.
 * Active state is an ink-colored icon + a small accent dot below — NOT a
 * pill / fill / background tint.
 *
 * Wire via:
 *   <Tab.Navigator tabBar={(props) => <PremiumTabBar {...props} />} />
 */
export function PremiumTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Honor `tabBarStyle: { display: 'none' }` set per-screen via setOptions
  // (e.g., owner EditLocation hides the bar while editing the pin).
  const focusedRoute = state.routes[state.index];
  const focusedStyle = descriptors[focusedRoute.key]?.options.tabBarStyle as
    | { display?: 'none' | 'flex' }
    | undefined;
  if (focusedStyle?.display === 'none') return null;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 40 : 70}
        tint="light"
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.hairline} pointerEvents="none" />
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const label = (typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title ?? route.name) as string;

          const renderIcon = options.tabBarIcon;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              // BottomTabBarProps' navigation typing doesn't statically know
              // the route param maps — runtime is correct, type checker isn't.
              (navigation as any).navigate(route.name, route.params);
            }
          };

          return (
            <PressablePremium
              key={route.key}
              haptic="selection"
              pressScale={0.92}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              style={styles.tab}
            >
              <View style={styles.iconWrap}>
                {renderIcon?.({
                  focused: isFocused,
                  color: isFocused ? colors.ink : colors.slateSoft,
                  size: 22,
                })}
              </View>
              <AppText
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.label,
                  { color: isFocused ? colors.ink : colors.slateSoft },
                ]}
              >
                {label}
              </AppText>
              <View
                style={[
                  styles.dot,
                  isFocused ? styles.dotActive : styles.dotIdle,
                ]}
              />
            </PressablePremium>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.65)',
    overflow: 'hidden',
  },
  hairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
  },
  row: {
    flexDirection: 'row',
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
    gap: 2,
  },
  iconWrap: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Outfit-Medium',
    fontSize: 10,
    marginTop: 2,
    maxWidth: '100%',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
  dotIdle: {
    backgroundColor: colors.transparent,
  },
});
