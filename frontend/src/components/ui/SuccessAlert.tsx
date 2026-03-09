import React, { useState, useEffect } from 'react';
import { View, Modal, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText as Text } from './AppText';
import { colors } from '../../theme/colors';

interface SuccessAlertProps {
  visible: boolean;
  message: string;
  onDismiss: () => void;
  duration?: number; // ms before auto-dismiss
}

export function SuccessAlert({ visible, message, onDismiss, duration = 3000 }: SuccessAlertProps) {
  const scaleAnim = useState(new Animated.Value(0))[0];
  const opacityAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (visible) {
      // Spring animation in
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss
      const timer = setTimeout(() => {
        dismissAlert();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const dismissAlert = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  };

  return (
    <Modal transparent visible={visible} statusBarTranslucent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Success checkmark circle */}
          <View style={styles.iconContainer}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={50} color={colors.white} />
            </View>
          </View>

          {/* Message */}
          <Text style={styles.title}>{message}</Text>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: scaleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['100%', '0%'],
                  }),
                },
              ]}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 260,
  },
  iconContainer: {
    marginBottom: 16,
  },
  checkCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.success || '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.text,
    marginBottom: 12,
  },
  progressContainer: {
    width: '100%',
    height: 3,
    backgroundColor: colors.grayLight,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginTop: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.success || '#10B981',
    borderRadius: 1.5,
  },
});
