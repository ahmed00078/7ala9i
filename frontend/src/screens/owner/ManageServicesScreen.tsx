import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Modal, TouchableOpacity } from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAlert } from '../../contexts/AlertContext';
import { ownerApi } from '../../api/owner';
import { ServiceCategory } from '../../components/salon/ServiceCategory';
import { ServiceForm } from '../../components/owner/ServiceForm';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { colors } from '../../theme/colors';

export function ManageServicesScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const alert = useAlert();
  const queryClient = useQueryClient();
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryNameAr, setCategoryNameAr] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['owner', 'salon'],
    queryFn: () => ownerApi.getSalon(),
  });

  const createCategory = useMutation({
    mutationFn: (data: { name: string; name_ar?: string }) => ownerApi.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'salon'] });
      setShowCategoryModal(false);
      setCategoryName('');
      setCategoryNameAr('');
    },
  });

  const createService = useMutation({
    mutationFn: (data: any) => ownerApi.createService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'salon'] });
      setShowServiceModal(false);
    },
  });

  const deleteService = useMutation({
    mutationFn: (id: string) => ownerApi.deleteService(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['owner', 'salon'] }),
  });

  if (isLoading) return <LoadingScreen />;

  const salon = data?.data;
  const categories = salon?.service_categories || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Navy header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Ionicons name="cut" size={22} color={colors.accent} />
          </View>
          <View>
            <Text style={styles.headerTitle}>{t('owner.services.title')}</Text>
            <Text style={styles.headerSubtitle}>
              {categories.length} {t('owner.services.categories')}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowCategoryModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="folder-open-outline" size={16} color={colors.white} />
            <Text style={styles.actionBtnText}>{t('owner.services.addCategory')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={() => {
              if (categories.length === 0) {
                alert.show({
                  type: 'info',
                  title: t('owner.services.noCategories'),
                  message: t('owner.services.noCategoriesHint'),
                });
              } else {
                setSelectedCategoryId(categories[0].id);
                setShowServiceModal(true);
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={16} color={colors.navy} />
            <Text style={[styles.actionBtnText, styles.actionBtnTextSecondary]}>
              {t('owner.services.addService')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {categories.length === 0 ? (
          <EmptyState
            icon="layers-outline"
            title={t('owner.services.noCategories')}
            subtitle={t('owner.services.noCategoriesHint')}
          />
        ) : (
          categories.map((cat: any) => (
            <ServiceCategory
              key={cat.id}
              category={cat}
              language={language}
              onSelectService={(service) => {
                alert.show({
                  type: 'confirm',
                  title: t('owner.services.deleteService'),
                  message: service.name,
                  confirmText: t('owner.services.deleteService'),
                  cancelText: t('common.cancel'),
                  onConfirm: () => deleteService.mutate(service.id),
                });
              }}
            />
          ))
        )}
      </ScrollView>

      {/* Add category bottom sheet modal */}
      <Modal visible={showCategoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('owner.services.addCategory')}</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={22} color={colors.gray} />
              </TouchableOpacity>
            </View>
            <Input
              label={t('owner.services.categoryName')}
              value={categoryName}
              onChangeText={setCategoryName}
            />
            <Input
              label={t('owner.services.serviceNameAr')}
              value={categoryNameAr}
              onChangeText={setCategoryNameAr}
            />
            <Button
              title={t('common.add')}
              onPress={() => createCategory.mutate({ name: categoryName, name_ar: categoryNameAr || undefined })}
              loading={createCategory.isPending}
              disabled={!categoryName}
            />
          </View>
        </View>
      </Modal>

      {/* Add service bottom sheet modal */}
      <Modal visible={showServiceModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('owner.services.addService')}</Text>
              <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                <Ionicons name="close" size={22} color={colors.gray} />
              </TouchableOpacity>
            </View>
            <ServiceForm
              onSubmit={(formData) => {
                createService.mutate({
                  category_id: selectedCategoryId,
                  name: formData.name,
                  name_ar: formData.nameAr || undefined,
                  price: formData.price,
                  duration: formData.duration,
                });
              }}
              loading={createService.isPending}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    color: colors.white,
    textAlign: 'auto',
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'auto',
  },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  actionBtnSecondary: { backgroundColor: colors.white },
  actionBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit-SemiBold',
    color: colors.white,
  },
  actionBtnTextSecondary: { color: colors.navy },
  scroll: { padding: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-SemiBold',
    color: colors.black,
    textAlign: 'auto',
  },
});
