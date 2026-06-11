import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAlert } from '../../contexts/AlertContext';
import { ownerApi } from '../../api/owner';
import { usersApi } from '../../api/users';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AppText } from '../../components/ui/AppText';
import {
  ProfileIdentity,
  SettingsGroup,
  SettingsRow,
  LanguagePillRow,
  PressablePremium,
  BottomSheetForm,
  useToast,
  type BottomSheetFormRef,
} from '../../components/premium';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { OwnerProfileStackParamList } from '../../types/navigation';

const APP_VERSION = '1.0.0';

interface SalonPhoto {
  id: string;
  photo_url: string;
  sort_order: number;
}

export function OwnerProfileScreen() {
  const { t } = useTranslation();
  const { user, logout, updateUser } = useAuth();
  const { language, changeLanguage } = useLanguage();
  const alert = useAlert();
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigation = useNavigation<NativeStackNavigationProp<OwnerProfileStackParamList>>();

  const editProfileSheetRef = useRef<BottomSheetFormRef>(null);
  const editSalonSheetRef = useRef<BottomSheetFormRef>(null);
  const passwordSheetRef = useRef<BottomSheetFormRef>(null);
  const deleteSheetRef = useRef<BottomSheetFormRef>(null);
  const photoSheetRef = useRef<BottomSheetFormRef>(null);

  const [uploading, setUploading] = useState(false);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
  });
  const [salonForm, setSalonForm] = useState({
    name: '', name_ar: '', description: '', description_ar: '',
    address: '', city: '', phone: '',
  });
  const [passwordForm, setPasswordForm] = useState({ current: '', newPw: '', confirm: '' });
  const [deletePassword, setDeletePassword] = useState('');

  const { data: salonData } = useQuery({
    queryKey: ['owner', 'salon'],
    queryFn: () => ownerApi.getSalon(),
  });

  const salon = salonData?.data;
  const photos: SalonPhoto[] = salon?.photos ?? [];

  const fullName = useMemo(
    () => `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || t('common.guest'),
    [user, t],
  );

  const updateProfileMutation = useMutation({
    mutationFn: () =>
      usersApi.updateProfile({
        first_name: profileForm.first_name.trim() || undefined,
        last_name: profileForm.last_name.trim() || undefined,
        email: profileForm.email.trim() || undefined,
      }),
    onSuccess: ({ data }) => {
      updateUser(data);
      editProfileSheetRef.current?.dismiss();
      toast.show({ message: t('profile.profileUpdated'), variant: 'saved' });
    },
    onError: () => {
      toast.show({ message: t('errors.server'), variant: 'error' });
    },
  });

  const updateSalonMutation = useMutation({
    mutationFn: () => ownerApi.updateSalon(salonForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'salon'] });
      queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
      editSalonSheetRef.current?.dismiss();
      toast.show({ message: t('owner.salonInfo.saved'), variant: 'saved' });
    },
    onError: () => {
      toast.show({ message: t('owner.salonInfo.saveError'), variant: 'error' });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: () => usersApi.changePassword(passwordForm.current, passwordForm.newPw),
    onSuccess: () => {
      passwordSheetRef.current?.dismiss();
      setPasswordForm({ current: '', newPw: '', confirm: '' });
      toast.show({ message: t('profile.changePasswordSuccess'), variant: 'success' });
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      toast.show({
        message: detail === 'Current password is incorrect'
          ? t('profile.changePasswordWrongCurrent')
          : t('profile.changePasswordError'),
        variant: 'error',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.deleteAccount(deletePassword),
    onSuccess: () => {
      deleteSheetRef.current?.dismiss();
      logout();
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      toast.show({
        message: detail === 'Incorrect password'
          ? t('profile.deleteAccountWrongPassword')
          : t('profile.deleteAccountError'),
        variant: 'error',
      });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (id: string) => ownerApi.deletePhoto(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'salon'] });
      toast.show({ message: t('owner.photos.deleted', 'Photo deleted'), variant: 'saved' });
    },
  });

  const openEditProfile = () => {
    setProfileForm({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
    });
    editProfileSheetRef.current?.present();
  };

  const openEditSalon = () => {
    setSalonForm({
      name: salon?.name ?? '',
      name_ar: salon?.name_ar ?? '',
      description: salon?.description ?? '',
      description_ar: salon?.description_ar ?? '',
      address: salon?.address ?? '',
      city: salon?.city ?? '',
      phone: salon?.phone ?? '',
    });
    editSalonSheetRef.current?.present();
  };

  const handleAddPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.show({ message: t('owner.photos.permissionDenied'), variant: 'error' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const formData = new FormData();
    formData.append('file', {
      uri: asset.uri,
      name: asset.fileName || 'photo.jpg',
      type: asset.mimeType || 'image/jpeg',
    } as any);
    setUploading(true);
    try {
      await ownerApi.uploadPhoto(formData);
      queryClient.invalidateQueries({ queryKey: ['owner', 'salon'] });
      toast.show({ message: t('common.added', 'Added'), variant: 'saved' });
    } catch {
      toast.show({ message: t('owner.photos.uploadError'), variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoLongPress = (photoId: string) => {
    setActivePhotoId(photoId);
    photoSheetRef.current?.present();
  };

  const handlePhotoDelete = () => {
    if (!activePhotoId) return;
    deletePhotoMutation.mutate(activePhotoId);
    photoSheetRef.current?.dismiss();
  };

  const handleChangePassword = () => {
    if (passwordForm.newPw.length < 6) {
      toast.show({ message: t('validation.passwordMin'), variant: 'error' });
      return;
    }
    if (passwordForm.newPw !== passwordForm.confirm) {
      toast.show({ message: t('validation.passwordMismatch'), variant: 'error' });
      return;
    }
    changePasswordMutation.mutate();
  };

  const handleLogout = () => {
    alert.show({
      type: 'confirm',
      title: t('auth.logout'),
      message: t('auth.logoutConfirm'),
      confirmText: t('auth.logout'),
      cancelText: t('common.cancel'),
      onConfirm: () => logout(),
    });
  };

  const onAskDelete = () => {
    // Two-step gate so this destructive action can't happen on a single accidental tap.
    alert.show({
      type: 'confirm',
      title: t('profile.deleteAccountTitle'),
      message: t('profile.deleteAccountMessage'),
      confirmText: t('common.continue'),
      cancelText: t('common.cancel'),
      onConfirm: () => {
        setDeletePassword('');
        deleteSheetRef.current?.present();
      },
    });
  };

  const salonLocationValue =
    salon?.lat != null && salon?.lng != null
      ? t('owner.salonLocation.set')
      : t('owner.salonLocation.notSet');

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ProfileIdentity
            name={fullName}
            sub={salon?.name || user?.phone || undefined}
            role={t('profile.owner')}
            onEdit={openEditProfile}
          />

          {/* ── Salon photos ──────────────────────────────────────── */}
          <View style={styles.photosBlock}>
            <View style={styles.photosLabelRow}>
              <AppText style={styles.sectionLabel}>{t('owner.photos.title')}</AppText>
            </View>
            <View style={styles.photoGrid}>
              {photos.map((p) => (
                <PressablePremium
                  key={p.id}
                  haptic="selection"
                  pressScale={0.96}
                  onLongPress={() => handlePhotoLongPress(p.id)}
                  style={styles.photoCell}
                >
                  <Image
                    source={{ uri: p.photo_url }}
                    style={styles.photoImage}
                    contentFit="cover"
                    transition={200}
                  />
                </PressablePremium>
              ))}
              <PressablePremium
                haptic="selection"
                pressScale={0.95}
                onPress={handleAddPhoto}
                disabled={uploading}
                style={[styles.photoCell, styles.photoAddCell]}
                accessibilityRole="button"
                accessibilityLabel={t('owner.photos.add')}
              >
                {uploading ? (
                  <ActivityIndicator color={colors.slate} />
                ) : (
                  <Ionicons name="add" size={28} color={colors.slate} />
                )}
              </PressablePremium>
            </View>
          </View>

          {/* ── Personal info ─────────────────────────────────────── */}
          <SettingsGroup
            label={t('profile.personalInfo')}
            action={
              <Pressable onPress={openEditProfile} hitSlop={8}>
                <AppText style={styles.editLink}>{t('common.edit')}</AppText>
              </Pressable>
            }
          >
            <SettingsRow icon="person-outline" label={t('profile.firstName')} value={user?.first_name || t('profile.notSet')} onPress={openEditProfile} />
            <SettingsRow icon="person-outline" label={t('profile.lastName')} value={user?.last_name || t('profile.notSet')} onPress={openEditProfile} />
            <SettingsRow icon="mail-outline" label={t('profile.email')} value={user?.email || t('profile.notSet')} onPress={openEditProfile} />
            <SettingsRow icon="call-outline" label={t('profile.phone')} value={user?.phone || '-'} />
          </SettingsGroup>

          {/* ── Salon info ────────────────────────────────────────── */}
          <SettingsGroup
            label={t('owner.salonInfo.title')}
            action={
              <Pressable onPress={openEditSalon} hitSlop={8}>
                <AppText style={styles.editLink}>{t('common.edit')}</AppText>
              </Pressable>
            }
          >
            <SettingsRow icon="storefront-outline" label={t('owner.salonInfo.name')} value={salon?.name || t('profile.notSet')} onPress={openEditSalon} />
            <SettingsRow icon="location-outline" label={t('owner.salonInfo.address')} value={salon?.address || t('profile.notSet')} onPress={openEditSalon} />
            <SettingsRow icon="business-outline" label={t('owner.salonInfo.city')} value={salon?.city || t('profile.notSet')} onPress={openEditSalon} />
            <SettingsRow icon="call-outline" label={t('owner.salonInfo.phone')} value={salon?.phone || t('profile.notSet')} onPress={openEditSalon} />
            <SettingsRow icon="map-outline" label={t('owner.salonLocation.title')} value={salonLocationValue} onPress={() => navigation.navigate('EditLocation')} />
          </SettingsGroup>

          {/* ── Language ──────────────────────────────────────────── */}
          <View style={styles.langWrap}>
            <AppText style={styles.langLabel}>{t('profile.language')}</AppText>
            <View style={styles.langCard}>
              <LanguagePillRow language={language} onChange={changeLanguage} />
            </View>
          </View>

          {/* ── Security ──────────────────────────────────────────── */}
          <SettingsGroup label={t('profile.security')}>
            <SettingsRow
              icon="lock-closed-outline"
              label={t('profile.changePasswordTitle')}
              onPress={() => passwordSheetRef.current?.present()}
            />
            <SettingsRow
              icon="trash-outline"
              label={t('profile.deleteAccountTitle')}
              onPress={onAskDelete}
              danger
            />
          </SettingsGroup>

          {/* ── About ─────────────────────────────────────────────── */}
          <SettingsGroup label={t('profile.about')}>
            <SettingsRow icon="information-circle-outline" label={t('profile.version')} value={APP_VERSION} />
          </SettingsGroup>

          {/* ── Sign out ──────────────────────────────────────────── */}
          <View style={styles.signOutWrap}>
            <SettingsGroup>
              <SettingsRow icon="log-out-outline" label={t('auth.logout')} onPress={handleLogout} danger chevron={false} />
            </SettingsGroup>
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* ── Edit personal info sheet ──────────────────────────────── */}
      <BottomSheetForm
        ref={editProfileSheetRef}
        title={t('profile.editProfile')}
        snapPoints={['80%']}
        footer={
          <Button
            title={t('common.save')}
            onPress={() => updateProfileMutation.mutate()}
            loading={updateProfileMutation.isPending}
          />
        }
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <Input
            label={t('profile.firstName')}
            value={profileForm.first_name}
            onChangeText={(v) => setProfileForm((f) => ({ ...f, first_name: v }))}
          />
          <Input
            label={t('profile.lastName')}
            value={profileForm.last_name}
            onChangeText={(v) => setProfileForm((f) => ({ ...f, last_name: v }))}
          />
          <Input
            label={t('profile.email')}
            value={profileForm.email}
            onChangeText={(v) => setProfileForm((f) => ({ ...f, email: v }))}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </ScrollView>
      </BottomSheetForm>

      {/* ── Edit salon sheet ──────────────────────────────────────── */}
      <BottomSheetForm
        ref={editSalonSheetRef}
        title={t('owner.salonInfo.editTitle')}
        snapPoints={['92%']}
        footer={
          <Button
            title={t('common.save')}
            onPress={() => updateSalonMutation.mutate()}
            loading={updateSalonMutation.isPending}
          />
        }
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <Input
            label={t('owner.salonInfo.name')}
            value={salonForm.name}
            onChangeText={(v) => setSalonForm((f) => ({ ...f, name: v }))}
          />
          <Input
            label={t('owner.salonInfo.nameAr')}
            value={salonForm.name_ar}
            onChangeText={(v) => setSalonForm((f) => ({ ...f, name_ar: v }))}
            style={{ textAlign: 'right' }}
          />
          <Input
            label={t('owner.salonInfo.address')}
            value={salonForm.address}
            onChangeText={(v) => setSalonForm((f) => ({ ...f, address: v }))}
          />
          <Input
            label={t('owner.salonInfo.city')}
            value={salonForm.city}
            onChangeText={(v) => setSalonForm((f) => ({ ...f, city: v }))}
          />
          <Input
            label={t('owner.salonInfo.phone')}
            value={salonForm.phone}
            onChangeText={(v) => setSalonForm((f) => ({ ...f, phone: v }))}
            keyboardType="phone-pad"
          />
          <Input
            label={t('owner.salonInfo.description')}
            value={salonForm.description}
            onChangeText={(v) => setSalonForm((f) => ({ ...f, description: v }))}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={{ minHeight: 90, paddingTop: 12 }}
          />
        </ScrollView>
      </BottomSheetForm>

      {/* ── Change password sheet ─────────────────────────────────── */}
      <BottomSheetForm
        ref={passwordSheetRef}
        title={t('profile.changePasswordTitle')}
        snapPoints={['80%']}
        footer={
          <Button
            title={t('common.save')}
            onPress={handleChangePassword}
            loading={changePasswordMutation.isPending}
          />
        }
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <Input
            label={t('profile.currentPassword')}
            value={passwordForm.current}
            onChangeText={(v) => setPasswordForm((f) => ({ ...f, current: v }))}
            secureTextEntry
          />
          <Input
            label={t('auth.newPassword')}
            value={passwordForm.newPw}
            onChangeText={(v) => setPasswordForm((f) => ({ ...f, newPw: v }))}
            secureTextEntry
          />
          <Input
            label={t('auth.confirmNewPassword')}
            value={passwordForm.confirm}
            onChangeText={(v) => setPasswordForm((f) => ({ ...f, confirm: v }))}
            secureTextEntry
          />
        </ScrollView>
      </BottomSheetForm>

      {/* ── Delete account sheet ──────────────────────────────────── */}
      <BottomSheetForm
        ref={deleteSheetRef}
        title={t('profile.deleteAccountTitle')}
        snapPoints={['75%']}
        footer={
          <Button
            title={t('profile.deleteAccountButton')}
            onPress={() => deleteMutation.mutate()}
            loading={deleteMutation.isPending}
            style={{ backgroundColor: colors.danger }}
          />
        }
      >
        <View style={styles.warningWrap}>
          <View style={styles.warningCircle}>
            <Ionicons name="warning-outline" size={28} color={colors.danger} />
          </View>
          <AppText style={styles.warningText}>{t('profile.deleteAccountMessage')}</AppText>
          <AppText style={styles.warningStrong}>{t('profile.deleteAccountOwnerWarning')}</AppText>
        </View>
        <Input
          label={t('profile.deleteAccountPassword')}
          value={deletePassword}
          onChangeText={setDeletePassword}
          secureTextEntry
        />
      </BottomSheetForm>

      {/* ── Photo actions sheet ───────────────────────────────────── */}
      <BottomSheetForm
        ref={photoSheetRef}
        title={t('owner.photos.title')}
        snapPoints={['30%']}
        onDismiss={() => setActivePhotoId(null)}
      >
        <PressablePremium
          haptic="medium"
          pressScale={0.98}
          onPress={handlePhotoDelete}
          style={styles.sheetAction}
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
          <AppText style={styles.sheetActionText}>{t('common.delete')}</AppText>
        </PressablePremium>
      </BottomSheetForm>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  scroll: { paddingBottom: 48 },

  editLink: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  // Photos
  photosBlock: { marginTop: 22 },
  photosLabelRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: 8,
  },
  sectionLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 11,
    color: colors.slate,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: spacing.lg,
  },
  photoCell: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  photoImage: { width: '100%', height: '100%' },
  photoAddCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },

  // Language
  langWrap: { marginTop: 22 },
  langLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 11,
    color: colors.slate,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: spacing.lg,
  },
  langCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },

  signOutWrap: { marginTop: 18 },

  warningWrap: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  warningCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F6E0DE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  warningText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.slate,
    textAlign: 'center',
    lineHeight: 20,
  },
  warningStrong: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
    marginTop: 8,
  },

  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  sheetActionText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 15,
    color: colors.danger,
  },
});
