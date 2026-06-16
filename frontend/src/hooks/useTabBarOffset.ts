import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

/**
 * Height of the bottom tab bar, including safe-area inset.
 * Only call from screens rendered inside a bottom-tab navigator.
 */
export function useTabBarOffset(): number {
  return useBottomTabBarHeight();
}
