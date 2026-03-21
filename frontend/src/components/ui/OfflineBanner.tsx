import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from './AppText';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { colors } from '../../theme/colors';

export function OfflineBanner() {
  const { isConnected } = useNetworkStatus();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: isConnected === false ? 0 : -100,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isConnected, translateY]);

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top + 6, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <View style={styles.row}>
        <Ionicons name="cloud-offline-outline" size={16} color={colors.white} />
        <Text style={styles.text}>{t('errors.offline')}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: colors.error,
    paddingBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: colors.white,
    fontFamily: 'Outfit-Medium',
    fontSize: 13,
  },
});
