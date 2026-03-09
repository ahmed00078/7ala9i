import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Modal, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { AppText as Text } from '../components/ui/AppText';
import { colors } from '../theme/colors';

export type AlertType = 'success' | 'error' | 'info' | 'warning' | 'confirm';

export interface AlertConfig {
  type: AlertType;
  title: string;
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  duration?: number; // for auto-dismiss (success only)
}

interface AlertContextType {
  show: (config: AlertConfig) => void;
  dismiss: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alert, setAlert] = useState<AlertConfig | null>(null);
  const scaleAnim = useState(new Animated.Value(0))[0];
  const opacityAnim = useState(new Animated.Value(0))[0];

  const show = useCallback((config: AlertConfig) => {
    setAlert(config);

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 9,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss for success alerts
    if (config.type === 'success' && config.duration) {
      setTimeout(() => dismiss(), config.duration);
    }
  }, [scaleAnim, opacityAnim]);

  const dismiss = useCallback(() => {
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
    ]).start(() => setAlert(null));
  }, [scaleAnim, opacityAnim]);

  const contextValue: AlertContextType = { show, dismiss };

  return (
    <AlertContext.Provider value={contextValue}>
      {children}
      <AlertModal alert={alert} scaleAnim={scaleAnim} opacityAnim={opacityAnim} onDismiss={dismiss} />
    </AlertContext.Provider>
  );
}

interface AlertModalProps {
  alert: AlertConfig | null;
  scaleAnim: Animated.Value;
  opacityAnim: Animated.Value;
  onDismiss: () => void;
}

function AlertModal({ alert, scaleAnim, opacityAnim, onDismiss }: AlertModalProps) {
  const handleConfirm = () => {
    alert?.onConfirm?.();
    onDismiss();
  };

  const handleCancel = () => {
    alert?.onCancel?.();
    onDismiss();
  };

  const getIcon = () => {
    switch (alert?.type) {
      case 'success':
        return { name: 'checkmark-circle', color: colors.success };
      case 'error':
        return { name: 'close-circle', color: colors.error };
      case 'warning':
        return { name: 'alert-circle', color: colors.warning };
      case 'info':
        return { name: 'information-circle', color: colors.info };
      case 'confirm':
        return { name: 'help-circle', color: colors.warning };
      default:
        return { name: 'checkmark-circle', color: colors.success };
    }
  };

  const icon = getIcon();
  const isConfirmType = alert?.type === 'confirm';

  return (
    <Modal transparent visible={alert !== null} statusBarTranslucent animationType="fade">
      <BlurView intensity={70} style={styles.blurContainer}>
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
            <View style={styles.content}>
              {/* Icon + Title Row */}
              <View style={styles.headerRow}>
                <View style={[styles.iconWrapper, { backgroundColor: icon.color }]}>
                  <Ionicons name={icon.name as any} size={32} color={colors.white} />
                </View>
                <Text style={styles.title}>{alert?.title}</Text>
              </View>

              {/* Message */}
              {alert?.message && <Text style={styles.message}>{alert.message}</Text>}

              {/* Buttons */}
              <View style={[styles.buttonsContainer, { flexDirection: isConfirmType ? 'row' : 'column' }]}>
                {isConfirmType && (
                  <TouchableOpacity
                    style={[styles.cancelButton, { borderColor: icon.color }]}
                    activeOpacity={0.65}
                    onPress={handleCancel}
                  >
                    <Text style={[styles.cancelButtonText, { color: icon.color }]}>
                      {alert?.cancelText || 'Cancel'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: icon.color, flex: isConfirmType ? 1 : undefined }]}
                  activeOpacity={0.8}
                  onPress={handleConfirm}
                >
                  <Text style={styles.confirmButtonText}>{alert?.confirmText || 'OK'}</Text>
                </TouchableOpacity>
              </View>

              {/* Progress Bar */}
              {alert?.type === 'success' && alert?.duration && (
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[
                      styles.progressBar,
                      {
                        backgroundColor: icon.color,
                        width: scaleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['100%', '0%'],
                        }),
                      },
                    ]}
                  />
                </View>
              )}
            </View>
          </Animated.View>
        </View>
      </BlurView>
    </Modal>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    minWidth: 280,
    maxWidth: 340,
    backgroundColor: colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  content: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Outfit-Bold',
    flex: 1,
  },
  message: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 19,
    fontFamily: 'Outfit-Regular',
    alignSelf: 'stretch',
  },
  buttonsContainer: {
    width: '100%',
    gap: 8,
    alignItems: 'flex-end',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    minWidth: 90,
  },
  cancelButtonText: {
    fontWeight: '600',
    fontSize: 12,
    fontFamily: 'Outfit-SemiBold',
  },
  confirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  confirmButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 12,
    fontFamily: 'Outfit-SemiBold',
  },
  progressTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 1.5,
    overflow: 'hidden',
    marginTop: 20,
  },
  progressBar: {
    height: '100%',
    borderRadius: 1.5,
  },
});
