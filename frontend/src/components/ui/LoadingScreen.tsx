import React from 'react';
import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { AppText as Text } from './AppText';
import { colors } from '../../theme/colors';

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.logoBox}>
        <Image source={require('../../../assets/7la9i 1.png')} style={styles.logo} />
      </View>
      <Text style={styles.appName}>7ala9i</Text>
      <ActivityIndicator size="small" color={colors.accent} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: 16,
  },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  appName: {
    fontSize: 36,
    fontFamily: 'Outfit-Bold',
    color: colors.navy,
    letterSpacing: 0.5,
  },
  spinner: {
    marginTop: 8,
  },
});
