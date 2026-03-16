import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { colors } from '../../theme/colors';
import type { AuthScreenProps } from '../../types/navigation';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export function OTPVerificationScreen({ route, navigation }: AuthScreenProps<'OTPVerification'>) {
  const { phone, isOwner } = route.params;
  const { t } = useTranslation();
  const { verifyOtp, resendOtp } = useAuth();
  const alert = useAlert();

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const handleDigitChange = useCallback((text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleKeyPress = useCallback((key: string, index: number) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [digits]);

  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length < CODE_LENGTH) {
      alert.show({ type: 'error', title: t('common.error'), message: t('auth.otpInvalid') });
      return;
    }
    setLoading(true);
    try {
      const result = await verifyOtp(phone, code);
      if (result.isPending) {
        setPendingMessage(result.message ?? t('auth.ownerPendingDefault'));
      }
      // Client: AuthContext sets user → RootNavigator auto-navigates
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      alert.show({
        type: 'error',
        title: t('common.error'),
        message: detail === 'invalid_otp' ? t('auth.otpInvalid') : t('auth.otpError'),
      });
      // Clear digits on wrong code
      setDigits(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendOtp(phone);
      setCountdown(RESEND_COOLDOWN);
      setDigits(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      alert.show({ type: 'success', title: t('auth.otpSent'), message: '' });
    } catch {
      alert.show({ type: 'error', title: t('common.error'), message: t('auth.otpResendError') });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.logoBox}>
          <Ionicons name="shield-checkmark" size={28} color={colors.accent} />
        </View>
        <Text style={styles.heroTitle}>{t('auth.otpTitle')}</Text>
        <Text style={styles.heroSubtitle}>{t('auth.otpSubtitle', { phone })}</Text>
      </View>

      {/* Card */}
      <View style={styles.card}>
        {/* 6-digit inputs */}
        <View style={styles.codeRow}>
          {Array(CODE_LENGTH).fill(0).map((_, i) => (
            <TextInput
              key={i}
              ref={(ref) => { inputRefs.current[i] = ref; }}
              style={[styles.codeInput, digits[i] ? styles.codeInputFilled : null]}
              value={digits[i]}
              onChangeText={(text) => handleDigitChange(text, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              autoFocus={i === 0}
            />
          ))}
        </View>

        {/* Countdown / Resend */}
        <View style={styles.resendRow}>
          {countdown > 0 ? (
            <Text style={styles.countdownText}>
              {t('auth.otpResendIn', { seconds: countdown })}
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendLink}>{t('auth.otpResend')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <Button
          title={t('auth.otpVerify')}
          onPress={handleVerify}
          loading={loading}
        />

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.backText}>{t('auth.backToLogin')}</Text>
        </TouchableOpacity>
      </View>

      {/* Owner pending modal */}
      <Modal visible={!!pendingMessage} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBox}>
              <Ionicons name="checkmark-circle" size={48} color={colors.accent} />
            </View>
            <Text style={styles.modalTitle}>{t('auth.ownerPendingTitle')}</Text>
            <Text style={styles.modalMessage}>{pendingMessage}</Text>
            <Button
              title={t('auth.ownerPendingButton')}
              onPress={() => {
                setPendingMessage(null);
                navigation.navigate('Login');
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1, backgroundColor: colors.navy },
  container: { flex: 1, backgroundColor: colors.navy },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 32,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: 'Outfit-Bold',
    color: colors.white,
    marginBottom: 6,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flex: 1,
    padding: 28,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 8,
  },
  codeInput: {
    width: 46,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    color: colors.navy,
  },
  codeInputFilled: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  resendRow: {
    alignItems: 'center',
    marginBottom: 24,
  },
  countdownText: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: colors.gray,
  },
  resendLink: {
    fontSize: 14,
    fontFamily: 'Outfit-SemiBold',
    color: colors.accent,
  },
  backBtn: {
    alignItems: 'center',
    marginTop: 16,
  },
  backText: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.gray,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    alignItems: 'center',
  },
  modalIconBox: { marginBottom: 16 },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    color: colors.navy,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.grayDark,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
});
