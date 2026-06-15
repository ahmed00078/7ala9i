import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ownerApi } from '../../api/owner';
import { useAlert } from '../../contexts/AlertContext';
import { useIsRTL } from '../../i18n/useIsRTL';
import {
  PressablePremium,
  BottomSheetForm,
  useToast,
  type BottomSheetFormRef,
} from '../../components/premium';
import { AppText } from '../../components/ui/AppText';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import type { OwnerProfileScreenProps } from '../../types/navigation';

const MAX_PHOTOS = 10;

type SalonPhoto = { id: string; photo_url: string; sort_order: number };

type SalonData = {
  id: string;
  cover_photo_url: string | null;
  photos: SalonPhoto[];
} | undefined;

export function ManagePhotosScreen({ navigation }: OwnerProfileScreenProps<'ManagePhotos'>) {
  const { t } = useTranslation();
  const rtl = useIsRTL();
  const alert = useAlert();
  const toast = useToast();
  const queryClient = useQueryClient();

  const actionSheetRef = useRef<BottomSheetFormRef>(null);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: salonData } = useQuery({
    queryKey: ['owner', 'salon'],
    queryFn: () => ownerApi.getSalon(),
  });

  const salon = salonData?.data as SalonData;
  const photos: SalonPhoto[] = useMemo(
    () => [...(salon?.photos ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [salon?.photos],
  );
  const coverUrl = salon?.cover_photo_url ?? null;
  const salonId = salon?.id;
  const atLimit = photos.length >= MAX_PHOTOS;

  const activePhoto = photos.find((p) => p.id === activePhotoId) ?? null;
  const activeIndex = activePhoto ? photos.findIndex((p) => p.id === activePhoto.id) : -1;
  const activeIsCover = !!activePhoto && activePhoto.photo_url === coverUrl;
  const canMoveUp = activeIndex > 0;
  const canMoveDown = activeIndex >= 0 && activeIndex < photos.length - 1;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['owner', 'salon'] });
    queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
    if (salonId) queryClient.invalidateQueries({ queryKey: ['salon', salonId] });
    queryClient.invalidateQueries({ queryKey: ['salons', 'recommended'] });
    queryClient.invalidateQueries({ queryKey: ['salons', 'popular'] });
    queryClient.invalidateQueries({ queryKey: ['salons', 'nearby'] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ownerApi.deletePhoto(id),
    onSuccess: () => {
      toast.show({ message: t('owner.photos.deleted'), variant: 'saved' });
      invalidateAll();
    },
    onError: () => {
      toast.show({ message: t('errors.server'), variant: 'error' });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => ownerApi.reorderPhotos(ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ['owner', 'salon'] });
      const prev = queryClient.getQueryData<any>(['owner', 'salon']);
      if (prev?.data?.photos) {
        const byId = new Map(prev.data.photos.map((p: SalonPhoto) => [p.id, p]));
        const nextPhotos = ids
          .map((id, i) => {
            const photo = byId.get(id);
            return photo ? { ...photo, sort_order: i } : null;
          })
          .filter(Boolean);
        queryClient.setQueryData(['owner', 'salon'], {
          ...prev,
          data: { ...prev.data, photos: nextPhotos },
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['owner', 'salon'], ctx.prev);
      toast.show({ message: t('errors.server'), variant: 'error' });
    },
    onSettled: () => invalidateAll(),
  });

  const setCoverMutation = useMutation({
    mutationFn: (id: string) => ownerApi.setCoverPhoto(id),
    onSuccess: () => {
      toast.show({ message: t('owner.photos.coverSet'), variant: 'saved' });
      invalidateAll();
    },
    onError: () => {
      toast.show({ message: t('errors.server'), variant: 'error' });
    },
  });

  const handleAddPhoto = async () => {
    if (atLimit) {
      toast.show({
        message: t('owner.photos.limitReached', { max: MAX_PHOTOS }),
        variant: 'error',
      });
      return;
    }
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
      invalidateAll();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.show({
        message:
          detail === 'Photo limit reached'
            ? t('owner.photos.limitReached', { max: MAX_PHOTOS })
            : t('owner.photos.uploadError'),
        variant: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const openActions = (photoId: string) => {
    setActivePhotoId(photoId);
    actionSheetRef.current?.present();
  };

  const handleSetCover = () => {
    if (!activePhoto) return;
    const id = activePhoto.id;
    actionSheetRef.current?.dismiss();
    setCoverMutation.mutate(id);
  };

  const moveBy = (delta: -1 | 1) => {
    if (!activePhoto) return;
    const from = activeIndex;
    const to = from + delta;
    if (to < 0 || to >= photos.length) return;
    const next = [...photos];
    [next[from], next[to]] = [next[to], next[from]];
    actionSheetRef.current?.dismiss();
    reorderMutation.mutate(next.map((p) => p.id));
  };

  const handleDelete = () => {
    if (!activePhoto) return;
    const id = activePhoto.id;
    actionSheetRef.current?.dismiss();
    alert.show({
      type: 'confirm',
      title: t('owner.photos.deleteConfirm'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      onConfirm: () => deleteMutation.mutate(id),
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.header}>
          <PressablePremium
            haptic="selection"
            pressScale={0.92}
            onPress={() => navigation.goBack()}
            style={styles.iconBtn}
            accessibilityLabel={t('common.back')}
          >
            <Ionicons
              name={rtl ? 'chevron-forward' : 'chevron-back'}
              size={20}
              color={colors.ink}
            />
          </PressablePremium>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <AppText style={styles.title}>{t('owner.photos.manage')}</AppText>
          </View>
          <View style={styles.countPill}>
            <AppText style={styles.countText}>
              {t('owner.photos.count', { count: photos.length, max: MAX_PHOTOS })}
            </AppText>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {photos.length > 1 && (
            <AppText style={styles.hint}>{t('owner.photos.dragHint')}</AppText>
          )}

          <View style={styles.list}>
            {photos.map((p, index) => {
              const isCover = p.photo_url === coverUrl;
              return (
                <PressablePremium
                  key={p.id}
                  haptic="selection"
                  pressScale={0.98}
                  onPress={() => openActions(p.id)}
                  style={styles.row}
                  accessibilityRole="button"
                >
                  <View style={styles.thumbWrap}>
                    <Image
                      source={{ uri: p.photo_url }}
                      style={styles.thumb}
                      contentFit="cover"
                      transition={200}
                    />
                  </View>
                  <View style={styles.rowMid}>
                    <AppText style={styles.position}>{String(index + 1).padStart(2, '0')}</AppText>
                    {isCover && (
                      <View style={styles.coverBadge}>
                        <Ionicons name="star" size={11} color={colors.accentInk} />
                        <AppText style={styles.coverBadgeText}>
                          {t('owner.photos.cover')}
                        </AppText>
                      </View>
                    )}
                  </View>
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={18}
                    color={colors.slateSoft}
                  />
                </PressablePremium>
              );
            })}

            <PressablePremium
              haptic="medium"
              pressScale={0.97}
              onPress={handleAddPhoto}
              disabled={uploading || atLimit}
              style={[styles.addRow, (uploading || atLimit) && { opacity: 0.55 }]}
              accessibilityRole="button"
              accessibilityLabel={t('owner.photos.add')}
            >
              {uploading ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Ionicons name="add" size={22} color={colors.accent} />
              )}
              <AppText style={styles.addText}>
                {atLimit
                  ? t('owner.photos.limitReached', { max: MAX_PHOTOS })
                  : t('owner.photos.add')}
              </AppText>
            </PressablePremium>
          </View>

          {photos.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="images-outline" size={40} color={colors.slateSoft} />
              <AppText style={styles.emptyTitle}>{t('owner.photos.noPhotos')}</AppText>
              <AppText style={styles.emptyHint}>{t('owner.photos.noPhotosHint')}</AppText>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <BottomSheetForm
        ref={actionSheetRef}
        title={t('owner.photos.title')}
        snapPoints={['45%']}
        onDismiss={() => setActivePhotoId(null)}
      >
        <View style={{ paddingTop: 4 }}>
          {!activeIsCover && (
            <PressablePremium
              haptic="selection"
              pressScale={0.98}
              onPress={handleSetCover}
              style={styles.sheetRow}
            >
              <Ionicons name="star-outline" size={20} color={colors.ink} />
              <AppText style={styles.sheetRowText}>{t('owner.photos.setCover')}</AppText>
            </PressablePremium>
          )}
          {canMoveUp && (
            <PressablePremium
              haptic="selection"
              pressScale={0.98}
              onPress={() => moveBy(-1)}
              style={styles.sheetRow}
            >
              <Ionicons name="arrow-up" size={20} color={colors.ink} />
              <AppText style={styles.sheetRowText}>{t('common.moveUp')}</AppText>
            </PressablePremium>
          )}
          {canMoveDown && (
            <PressablePremium
              haptic="selection"
              pressScale={0.98}
              onPress={() => moveBy(1)}
              style={styles.sheetRow}
            >
              <Ionicons name="arrow-down" size={20} color={colors.ink} />
              <AppText style={styles.sheetRowText}>{t('common.moveDown')}</AppText>
            </PressablePremium>
          )}
          <PressablePremium
            haptic="medium"
            pressScale={0.98}
            onPress={handleDelete}
            style={styles.sheetRow}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
            <AppText style={[styles.sheetRowText, { color: colors.danger }]}>
              {t('common.delete')}
            </AppText>
          </PressablePremium>
        </View>
      </BottomSheetForm>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  title: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 16,
    color: colors.ink,
  },
  countPill: {
    paddingHorizontal: 10,
    height: 28,
    minWidth: 60,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 12,
    color: colors.accentInk,
    letterSpacing: 0.3,
  },

  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 80,
  },
  hint: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.slateSoft,
    marginBottom: 12,
  },

  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  thumbWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  thumb: { width: '100%', height: '100%' },
  rowMid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  position: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
    color: colors.slate,
    letterSpacing: 0.5,
  },
  coverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
  },
  coverBadgeText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 10,
    color: colors.accentInk,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: colors.surface,
  },
  addText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    color: colors.accent,
  },

  empty: {
    marginTop: 40,
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    color: colors.ink,
  },
  emptyHint: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.slate,
    textAlign: 'center',
  },

  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  sheetRowText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 15,
    color: colors.ink,
  },
});
