import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';

import { usersApi } from '../api/users';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/premium';

/**
 * Avatar upload primitives shared by every profile screen (client / owner / admin).
 * Picks from the library, posts multipart, then refreshes the authed user so the
 * new avatar shows up everywhere `user.avatar_url` is consumed. Also invalidates
 * the read-side query keys where the avatar surfaces — see CLAUDE.md.
 */
export function useAvatarUpload() {
  const { t } = useTranslation();
  const toast = useToast();
  const { updateUser, user } = useAuth();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const invalidateAvatarSurfaces = useCallback(() => {
    // Every list / detail that shows a user avatar needs to re-fetch.
    queryClient.invalidateQueries({ queryKey: ['salon'] });
    queryClient.invalidateQueries({ queryKey: ['salons'] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['owner', 'calendar'] });
    queryClient.invalidateQueries({ queryKey: ['owner', 'reviews'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'owners'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
  }, [queryClient]);

  const pickAndUpload = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      toast.show({ message: t('profile.avatar.permissionDenied'), variant: 'error' });
      return false;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return false;

    const asset = result.assets[0];
    const formData = new FormData();
    formData.append('file', {
      uri: asset.uri,
      name: asset.fileName || 'avatar.jpg',
      type: asset.mimeType || 'image/jpeg',
    } as any);

    setIsUploading(true);
    try {
      const { data } = await usersApi.uploadAvatar(formData);
      updateUser(data);
      invalidateAvatarSurfaces();
      toast.show({ message: t('profile.profileUpdated'), variant: 'saved' });
      return true;
    } catch {
      toast.show({ message: t('profile.avatar.uploadError'), variant: 'error' });
      return false;
    } finally {
      setIsUploading(false);
    }
  }, [t, toast, updateUser, invalidateAvatarSurfaces]);

  const removeAvatar = useCallback(async () => {
    setIsRemoving(true);
    try {
      const { data } = await usersApi.deleteAvatar();
      updateUser(data);
      invalidateAvatarSurfaces();
      toast.show({ message: t('profile.avatar.removed'), variant: 'saved' });
      return true;
    } catch {
      toast.show({ message: t('profile.avatar.uploadError'), variant: 'error' });
      return false;
    } finally {
      setIsRemoving(false);
    }
  }, [t, toast, updateUser, invalidateAvatarSurfaces]);

  return {
    pickAndUpload,
    removeAvatar,
    isUploading,
    isRemoving,
    hasAvatar: !!user?.avatar_url,
  };
}
