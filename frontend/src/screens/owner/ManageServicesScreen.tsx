import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Modal, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
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

interface ServiceItem {
  id: string;
  name: string;
  name_ar?: string;
  price: number;
  duration: number;
}

export function ManageServicesScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const alert = useAlert();
  const queryClient = useQueryClient();

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

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

  const updateService = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => ownerApi.updateService(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'salon'] });
      setShowEditModal(false);
      setEditingService(null);
    },
  });

  const deleteService = useMutation({
    mutationFn: (id: string) => ownerApi.deleteService(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['owner', 'salon'] }),
  });

  const handleOpenAddService = () => {
    if (categories.length === 0) {
      alert.show({
        type: 'info',
        title: t('owner.services.noCategories'),
        message: t('owner.services.noCategoriesHint'),
      });
      return;
    }
    setSelectedCategoryId(categories[0].id);
    setShowServiceModal(true);
  };

  const handleEditService = (service: ServiceItem) => {
    setEditingService(service);
    setShowEditModal(true);
  };

  const handleDeleteService = (service: ServiceItem) => {
    alert.show({
      type: 'confirm',
      title: t('owner.services.deleteService'),
      message: service.name,
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      onConfirm: () => deleteService.mutate(service.id),
    });
  };

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
            onPress={handleOpenAddService}
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
              onEditService={handleEditService}
              onDeleteService={handleDeleteService}
            />
          ))
        )}
      </ScrollView>

      {/* Add category modal */}
      <Modal visible={showCategoryModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
        </KeyboardAvoidingView>
      </Modal>

      {/* Add service modal */}
      <Modal visible={showServiceModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('owner.services.addService')}</Text>
                <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                  <Ionicons name="close" size={22} color={colors.gray} />
                </TouchableOpacity>
              </View>

              {/* Category picker */}
              <Text style={styles.pickerLabel}>{t('owner.services.selectCategory')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryPicker}
              >
                {categories.map((cat: any) => {
                  const isActive = selectedCategoryId === cat.id;
                  const catName = language === 'ar' && cat.name_ar ? cat.name_ar : cat.name;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.catChip, isActive && styles.catChipActive]}
                      onPress={() => setSelectedCategoryId(cat.id)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.catChipText, isActive && styles.catChipTextActive]}>
                        {catName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

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
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit service modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('owner.services.editService')}</Text>
                <TouchableOpacity onPress={() => { setShowEditModal(false); setEditingService(null); }}>
                  <Ionicons name="close" size={22} color={colors.gray} />
                </TouchableOpacity>
              </View>
              {editingService && (
                <ServiceForm
                  initialValues={{
                    name: editingService.name,
                    nameAr: editingService.name_ar,
                    price: editingService.price,
                    duration: editingService.duration,
                  }}
                  onSubmit={(formData) => {
                    updateService.mutate({
                      id: editingService.id,
                      data: {
                        name: formData.name,
                        name_ar: formData.nameAr || undefined,
                        price: formData.price,
                        duration: formData.duration,
                      },
                    });
                  }}
                  loading={updateService.isPending}
                />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
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
  pickerLabel: {
    fontSize: 13,
    fontFamily: 'Outfit-SemiBold',
    color: colors.grayDark,
    marginBottom: 10,
  },
  categoryPicker: {
    marginBottom: 16,
  },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginEnd: 8,
  },
  catChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  catChipText: {
    fontSize: 13,
    fontFamily: 'Outfit-Medium',
    color: colors.grayDark,
  },
  catChipTextActive: {
    color: colors.accent,
    fontFamily: 'Outfit-SemiBold',
  },
});
