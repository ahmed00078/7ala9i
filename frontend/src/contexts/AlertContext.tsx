import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { View, Modal, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { AppText as Text } from '../components/ui/AppText';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius } from '../theme/spacing';
import { PressablePremium } from '../components/premium/PressablePremium';

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
  const scale = useSharedValue(0.92);
  const opacity = useSharedValue(0);
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAlert = useCallback(() => setAlert(null), []);

  const dismiss = useCallback(() => {
    if (autoDismissRef.current) {
      clearTimeout(autoDismissRef.current);
      autoDismissRef.current = null;
    }
    scale.value = withTiming(0.92, { duration: 180 });
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) runOnJS(clearAlert)();
    });
  }, [scale, opacity, clearAlert]);

  const show = useCallback(
    (config: AlertConfig) => {
      if (autoDismissRef.current) {
        clearTimeout(autoDismissRef.current);
        autoDismissRef.current = null;
      }
      setAlert(config);
      scale.value = withSpring(1, { mass: 0.7, damping: 16, stiffness: 220 });
      opacity.value = withTiming(1, { duration: 220 });

      if (config.type === 'success' && config.duration) {
        autoDismissRef.current = setTimeout(() => dismiss(), config.duration);
      }
    },
    [scale, opacity, dismiss],
  );

  useEffect(() => {
    return () => {
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const contextValue: AlertContextType = { show, dismiss };

  return (
    <AlertContext.Provider value={contextValue}>
      {children}
      <AlertModal alert={alert} animatedStyle={animatedStyle} onDismiss={dismiss} />
    </AlertContext.Provider>
  );
}

interface AlertModalProps {
  alert: AlertConfig | null;
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
  onDismiss: () => void;
}

function AlertModal({ alert, animatedStyle, onDismiss }: AlertModalProps) {
  const handleConfirm = () => {
    alert?.onConfirm?.();
    onDismiss();
  };

  const handleCancel = () => {
    alert?.onCancel?.();
    onDismiss();
  };

  const icon = getIcon(alert?.type);
  const isConfirmType = alert?.type === 'confirm';

  return (
    <Modal transparent visible={alert !== null} statusBarTranslucent animationType="fade">
      <View style={styles.scrim}>
        <BlurView intensity={40} style={StyleSheet.absoluteFill} />
        <View style={styles.overlay} pointerEvents="box-none">
          <Animated.View style={[styles.card, animatedStyle]}>
            {/* Header row — title left, icon right */}
            <View style={styles.headerRow}>
              <Text style={styles.title} numberOfLines={2}>
                {alert?.title}
              </Text>
              <View style={[styles.iconCircle, { backgroundColor: icon.color }]}>
                <Ionicons name={icon.name} size={22} color={colors.white} />
              </View>
            </View>

            {/* Message */}
            {alert?.message ? <Text style={styles.message}>{alert.message}</Text> : null}

            {/* CTAs */}
            <View style={styles.ctaRow}>
              {isConfirmType && (
                <PressablePremium
                  testID="alert-cancel"
                  haptic="selection"
                  style={[styles.cancelBtn, { borderColor: icon.color }]}
                  onPress={handleCancel}
                >
                  <Text style={[styles.cancelText, { color: icon.color }]}>
                    {alert?.cancelText || 'Cancel'}
                  </Text>
                </PressablePremium>
              )}

              <PressablePremium
                testID="alert-confirm"
                haptic={isConfirmType ? 'medium' : 'light'}
                style={[styles.confirmBtn, { backgroundColor: icon.color }]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmText}>{alert?.confirmText || 'OK'}</Text>
              </PressablePremium>
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function getIcon(type: AlertType | undefined): { name: IconName; color: string } {
  switch (type) {
    case 'success':
      return { name: 'checkmark-circle', color: colors.ok };
    case 'error':
      return { name: 'close-circle', color: colors.danger };
    case 'warning':
      return { name: 'alert-circle', color: colors.warn };
    case 'info':
      return { name: 'information-circle', color: colors.accent };
    case 'confirm':
      return { name: 'help-circle', color: colors.warn };
    default:
      return { name: 'checkmark-circle', color: colors.ok };
  }
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(11, 14, 20, 0.35)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    minWidth: 300,
    maxWidth: 340,
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.hero,
    paddingHorizontal: 20,
    paddingVertical: 22,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    ...typography.header,
    color: colors.ink,
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  message: {
    ...typography.body,
    color: colors.slate,
    marginTop: 10,
    marginBottom: 20,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderRadius: radius.input,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    ...typography.button,
  },
  confirmBtn: {
    flex: 1,
    borderRadius: radius.input,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    ...typography.button,
    color: colors.white,
  },
});
