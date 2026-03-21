import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText as Text } from './AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onRetry?: () => void;
  retryText?: string;
}

export function ErrorState({
  title,
  subtitle,
  icon = 'cloud-offline-outline',
  onRetry,
  retryText,
}: ErrorStateProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={36} color={colors.error} />
      </View>
      <Text style={styles.title}>{title || t('errors.loadFailed')}</Text>
      <Text style={styles.subtitle}>{subtitle || t('errors.loadFailedHint')}</Text>
      {onRetry && (
        <Button
          title={retryText || t('errors.retryButton')}
          onPress={onRetry}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 240,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 17,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  button: { width: 200 },
});
