import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAlert } from '../../contexts/AlertContext';
import { ownerApi } from '../../api/owner';
import { colors } from '../../theme/colors';

const LANG_LABELS: Record<string, string> = { ar: 'العربية', fr: 'Français', en: 'English' };

export function OwnerProfileScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { language, changeLanguage } = useLanguage();
  const alert = useAlert();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', name_ar: '', description: '', description_ar: '',
    address: '', city: '', phone: '',
  });

  const updateSalonMutation = useMutation({
    mutationFn: (data: typeof form) => ownerApi.updateSalon(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'salon'] });
      queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
      setEditModalOpen(false);
      alert.show({ type: 'success', title: t('owner.salonInfo.saved') });
    },
    onError: () => {
      alert.show({ type: 'error', title: t('common.error'), message: t('owner.salonInfo.saveError') });
    },
  });

  const openEdit = () => {
    setForm({
      name: salon?.name || '',
      name_ar: salon?.name_ar || '',
      description: salon?.description || '',
      description_ar: salon?.description_ar || '',
      address: salon?.address || '',
      city: salon?.city || '',
      phone: salon?.phone || '',
    });
    setEditModalOpen(true);
  };

  const { data: dashboardData } = useQuery({
    queryKey: ['owner', 'dashboard'],
    queryFn: () => ownerApi.getDashboard(),
  });

  const { data: salonData, refetch: refetchSalon } = useQuery({
    queryKey: ['owner', 'salon'],
    queryFn: () => ownerApi.getSalon(),
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (id: string) => ownerApi.deletePhoto(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'salon'] });
    },
  });

  const dashboard = dashboardData?.data;
  const salon = salonData?.data;
  const photos: Array<{ id: string; photo_url: string; sort_order: number }> = salon?.photos || [];

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();

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

  const handleLanguage = () => {
    alert.show({
      type: 'info',
      title: t('profile.changeLanguage'),
      confirmText: 'OK',
    });
  };

  const handleAddPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert.show({
        type: 'error',
        title: t('owner.photos.permissionDenied'),
      });
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
    } catch {
      alert.show({
        type: 'error',
        title: t('common.error'),
        message: t('owner.photos.uploadError'),
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    alert.show({
      type: 'confirm',
      title: t('owner.photos.deleteConfirm'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      onConfirm: () => deletePhotoMutation.mutate(photoId),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || '?'}</Text>
          </View>
          <Text style={styles.fullName}>{user?.first_name} {user?.last_name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{t('profile.owner')}</Text>
          </View>
          {dashboard?.salon_name ? (
            <Text style={styles.salonName}>{dashboard.salon_name}</Text>
          ) : null}
        </View>

        {/* Salon Stats */}
        {dashboard && (
          <>
            <Text style={styles.sectionLabel}>{t('profile.salonStats')}</Text>
            <View style={styles.statsRow}>
              <StatBox icon="calendar-outline" value={String(dashboard.today?.total_bookings ?? 0)} label={t('owner.dashboard.todayBookings')} />
              <StatBox icon="trending-up-outline" value={String(dashboard.week?.total ?? 0)} label={t('owner.dashboard.weekBookings')} />
              <StatBox icon="cash-outline" value={`${dashboard.today?.revenue_expected ?? 0}`} label={t('owner.dashboard.todayRevenue')} />
            </View>
          </>
        )}

        {/* Salon Photos */}
        <View style={styles.photosSectionHeader}>
          <Text style={styles.sectionLabel}>{t('owner.photos.title')}</Text>
          <TouchableOpacity
            style={[styles.addPhotoBtn, uploading && styles.addPhotoBtnDisabled]}
            onPress={handleAddPhoto}
            disabled={uploading}
            activeOpacity={0.75}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={16} color={colors.white} />
                <Text style={styles.addPhotoBtnText}>{t('owner.photos.add')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {photos.length === 0 ? (
          <View style={styles.photosEmpty}>
            <Ionicons name="images-outline" size={32} color={colors.grayLight} />
            <Text style={styles.photosEmptyText}>{t('owner.photos.noPhotos')}</Text>
            <Text style={styles.photosEmptyHint}>{t('owner.photos.noPhotosHint')}</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photosScroll}
          >
            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoThumb}>
                <Image
                  source={{ uri: photo.photo_url }}
                  style={styles.photoImage}
                  contentFit="cover"
                />
                <TouchableOpacity
                  style={styles.photoDeleteBtn}
                  onPress={() => handleDeletePhoto(photo.id)}
                >
                  <Ionicons name="trash-outline" size={14} color={colors.white} />
                </TouchableOpacity>
              </View>
            ))}
            {/* Add more button */}
            <TouchableOpacity style={styles.photoAddMore} onPress={handleAddPhoto} disabled={uploading} activeOpacity={0.75}>
              {uploading ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <>
                  <Ionicons name="add" size={28} color={colors.accent} />
                  <Text style={styles.photoAddMoreText}>{t('owner.photos.add')}</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Salon Information */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabelInline}>{t('owner.salonInfo.title')}</Text>
          <TouchableOpacity style={styles.editBtn} onPress={openEdit} activeOpacity={0.75}>
            <Ionicons name="pencil-outline" size={14} color={colors.white} />
            <Text style={styles.editBtnText}>{t('owner.salonInfo.edit')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <SalonInfoRow label={t('owner.salonInfo.name')} value={salon?.name} />
          <Divider />
          <SalonInfoRow label={t('owner.salonInfo.nameAr')} value={salon?.name_ar} />
          <Divider />
          <SalonInfoRow label={t('owner.salonInfo.address')} value={salon?.address} />
          <Divider />
          <SalonInfoRow label={t('owner.salonInfo.city')} value={salon?.city} />
          <Divider />
          <SalonInfoRow label={t('owner.salonInfo.phone')} value={salon?.phone} />
          <Divider />
          <SalonInfoRow label={t('owner.salonInfo.description')} value={salon?.description} multiline />
        </View>

        {/* Personal Info */}
        <Text style={styles.sectionLabel}>{t('profile.personalInfo')}</Text>
        <View style={styles.card}>
          <InfoRow icon="mail-outline" label={t('profile.email')} value={user?.email || '-'} />
          <Divider />
          <InfoRow icon="call-outline" label={t('profile.phone')} value={user?.phone || t('profile.notSet')} />
        </View>

        {/* Settings */}
        <Text style={styles.sectionLabel}>{t('profile.settings')}</Text>
        <View style={styles.card}>
          <ActionRow icon="language-outline" label={t('profile.language')} value={LANG_LABELS[language] || language.toUpperCase()} onPress={handleLanguage} />
        </View>

        {/* Logout */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
            <View style={styles.iconCircleRed}>
              <Ionicons name="log-out-outline" size={18} color={colors.error} />
            </View>
            <Text style={styles.logoutText}>{t('auth.logout')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>{t('profile.version')} 1.0.0</Text>
      </ScrollView>

      {/* Edit Salon Modal */}
      <Modal visible={editModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditModalOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView style={modalStyles.container}>
            {/* Header */}
            <View style={modalStyles.header}>
              <TouchableOpacity onPress={() => setEditModalOpen(false)} style={modalStyles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.black} />
              </TouchableOpacity>
              <Text style={modalStyles.title}>{t('owner.salonInfo.editTitle')}</Text>
              <TouchableOpacity
                onPress={() => updateSalonMutation.mutate(form)}
                disabled={updateSalonMutation.isPending}
                style={modalStyles.saveBtn}
              >
                {updateSalonMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={modalStyles.saveBtnText}>{t('common.save')}</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={modalStyles.scroll} keyboardShouldPersistTaps="handled">
              <Text style={modalStyles.fieldLabel}>{t('owner.salonInfo.name')}</Text>
              <TextInput
                style={modalStyles.input}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                placeholder={t('owner.salonInfo.name')}
                placeholderTextColor={colors.gray}
              />

              <Text style={modalStyles.fieldLabel}>{t('owner.salonInfo.nameAr')}</Text>
              <TextInput
                style={[modalStyles.input, { textAlign: 'right' }]}
                value={form.name_ar}
                onChangeText={v => setForm(f => ({ ...f, name_ar: v }))}
                placeholder={t('owner.salonInfo.nameAr')}
                placeholderTextColor={colors.gray}
              />

              <Text style={modalStyles.fieldLabel}>{t('owner.salonInfo.address')}</Text>
              <TextInput
                style={modalStyles.input}
                value={form.address}
                onChangeText={v => setForm(f => ({ ...f, address: v }))}
                placeholder={t('owner.salonInfo.address')}
                placeholderTextColor={colors.gray}
              />

              <Text style={modalStyles.fieldLabel}>{t('owner.salonInfo.city')}</Text>
              <TextInput
                style={modalStyles.input}
                value={form.city}
                onChangeText={v => setForm(f => ({ ...f, city: v }))}
                placeholder={t('owner.salonInfo.city')}
                placeholderTextColor={colors.gray}
              />

              <Text style={modalStyles.fieldLabel}>{t('owner.salonInfo.phone')}</Text>
              <TextInput
                style={modalStyles.input}
                value={form.phone}
                onChangeText={v => setForm(f => ({ ...f, phone: v }))}
                placeholder="XXXXXXXX"
                placeholderTextColor={colors.gray}
                keyboardType="phone-pad"
              />

              <Text style={modalStyles.fieldLabel}>{t('owner.salonInfo.description')}</Text>
              <TextInput
                style={[modalStyles.input, modalStyles.textarea]}
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
                placeholder={t('owner.salonInfo.description')}
                placeholderTextColor={colors.gray}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Text style={modalStyles.fieldLabel}>{t('owner.salonInfo.descriptionAr')}</Text>
              <TextInput
                style={[modalStyles.input, modalStyles.textarea, { textAlign: 'right' }]}
                value={form.description_ar}
                onChangeText={v => setForm(f => ({ ...f, description_ar: v }))}
                placeholder={t('owner.salonInfo.descriptionAr')}
                placeholderTextColor={colors.gray}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function StatBox({ icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <View style={statStyles.box}>
      <Ionicons name={icon} size={22} color={colors.accent} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.iconCircle}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>
      <View style={rowStyles.content}>
        <Text style={rowStyles.label}>{label}</Text>
        <Text style={rowStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

function ActionRow({ icon, label, value, onPress }: { icon: any; label: string; value?: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={rowStyles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={rowStyles.iconCircle}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>
      <View style={rowStyles.content}>
        <Text style={rowStyles.label}>{label}</Text>
        {value ? <Text style={rowStyles.value}>{value}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.gray} />
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border, marginStart: 52 }} />;
}

function SalonInfoRow({ label, value, multiline }: { label: string; value?: string | null; multiline?: boolean }) {
  return (
    <View style={[rowStyles.row, multiline && { alignItems: 'flex-start', paddingVertical: 12 }]}>
      <View style={rowStyles.content}>
        <Text style={rowStyles.label}>{label}</Text>
        <Text style={[rowStyles.value, multiline && { marginTop: 2 }]} numberOfLines={multiline ? 4 : 1}>
          {value || '—'}
        </Text>
      </View>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: {
    flex: 1, backgroundColor: colors.white, borderRadius: 14,
    padding: 12, alignItems: 'center',
    shadowColor: colors.black, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, marginHorizontal: 4,
  },
  value: { fontSize: 18, fontFamily: 'Outfit-Bold', color: colors.black, marginTop: 4 },
  label: { fontSize: 10, fontFamily: 'Outfit-Regular', color: colors.gray, textAlign: 'center', marginTop: 2 },
});

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  iconCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentLight,
    alignItems: 'center', justifyContent: 'center', marginEnd: 12,
  },
  content: { flex: 1 },
  label: { fontSize: 13, color: colors.gray, fontFamily: 'Outfit-Regular', marginBottom: 1 },
  value: { fontSize: 14, color: colors.black, fontFamily: 'Outfit-Medium' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 32 },
  header: {
    backgroundColor: colors.navy, alignItems: 'center',
    paddingTop: 32, paddingBottom: 28,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    shadowColor: colors.black, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
  avatarText: { fontSize: 28, fontFamily: 'Outfit-Bold', color: colors.accent },
  fullName: { fontSize: 20, fontFamily: 'Outfit-Bold', color: colors.white, marginBottom: 6 },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 4,
  },
  roleText: { fontSize: 12, color: colors.white, fontFamily: 'Outfit-Medium' },
  salonName: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: 'Outfit-Regular', marginTop: 2 },
  sectionLabel: {
    fontSize: 12, color: colors.grayDark, fontFamily: 'Outfit-SemiBold',
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginTop: 24, marginBottom: 6, paddingHorizontal: 20,
    textAlign: 'auto',
  },
  statsRow: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 4 },
  card: {
    backgroundColor: colors.white, marginHorizontal: 16, borderRadius: 16, overflow: 'hidden',
    shadowColor: colors.black, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  // Photos section
  photosSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 24, marginBottom: 6, paddingHorizontal: 20,
  },
  addPhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.accent, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  addPhotoBtnDisabled: { opacity: 0.6 },
  addPhotoBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.white },
  photosEmpty: {
    backgroundColor: colors.white, marginHorizontal: 16, borderRadius: 16,
    padding: 28, alignItems: 'center',
    shadowColor: colors.black, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  photosEmptyText: {
    fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.black,
    marginTop: 12, textAlign: 'center',
  },
  photosEmptyHint: {
    fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.gray,
    marginTop: 4, textAlign: 'center',
  },
  photosScroll: { paddingHorizontal: 16, paddingBottom: 4, gap: 10 },
  photoThumb: { position: 'relative', borderRadius: 12, overflow: 'hidden' },
  photoImage: { width: 100, height: 100, borderRadius: 12 },
  photoDeleteBtn: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12,
    width: 26, height: 26, alignItems: 'center', justifyContent: 'center',
  },
  photoAddMore: {
    width: 100, height: 100, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.accent, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: colors.accentLight,
  },
  photoAddMoreText: { fontSize: 10, fontFamily: 'Outfit-SemiBold', color: colors.accent },
  logoutRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  iconCircleRed: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center', marginEnd: 12,
  },
  logoutText: { flex: 1, fontSize: 14, color: colors.error, fontFamily: 'Outfit-SemiBold' },
  version: { textAlign: 'center', color: colors.gray, fontSize: 12, marginTop: 24, fontFamily: 'Outfit-Regular' },
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 24, marginBottom: 6, paddingHorizontal: 20,
  },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.navy, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  editBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.white },
  sectionLabelInline: {
    fontSize: 12, color: colors.grayDark, fontFamily: 'Outfit-SemiBold',
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
});

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  closeBtn: { padding: 4 },
  title: { fontSize: 16, fontFamily: 'Outfit-SemiBold', color: colors.black },
  saveBtn: {
    backgroundColor: colors.accent, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8, minWidth: 70, alignItems: 'center',
  },
  saveBtnText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.white },
  scroll: { padding: 20, paddingBottom: 40 },
  fieldLabel: {
    fontSize: 12, color: colors.grayDark, fontFamily: 'Outfit-SemiBold',
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6, marginTop: 16,
  },
  input: {
    backgroundColor: colors.white, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: 'Outfit-Regular', color: colors.black,
  },
  textarea: { minHeight: 90, paddingTop: 12 },
});
