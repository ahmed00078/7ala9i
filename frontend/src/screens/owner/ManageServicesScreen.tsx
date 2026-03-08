import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../contexts/LanguageContext';
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{t('owner.services.title')}</Text>

        <View style={styles.buttons}>
          <Button title={t('owner.services.addCategory')} variant="outline" onPress={() => setShowCategoryModal(true)} />
          <View style={{ height: 8 }} />
          <Button
            title={t('owner.services.addService')}
            variant="outline"
            onPress={() => {
              if (categories.length === 0) {
                Alert.alert(t('owner.services.noCategories'), t('owner.services.noCategoriesHint'));
              } else {
                setSelectedCategoryId(categories[0].id);
                setShowServiceModal(true);
              }
            }}
          />
        </View>

        {categories.length === 0 ? (
          <EmptyState
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
                Alert.alert(
                  service.name,
                  '',
                  [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('owner.services.deleteService'),
                      style: 'destructive',
                      onPress: () => deleteService.mutate(service.id),
                    },
                  ]
                );
              }}
            />
          ))
        )}
      </ScrollView>

      <Modal visible={showCategoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('owner.services.addCategory')}</Text>
            <Input label={t('owner.services.categoryName')} value={categoryName} onChangeText={setCategoryName} />
            <Input label={t('owner.services.serviceNameAr')} value={categoryNameAr} onChangeText={setCategoryNameAr} />
            <Button
              title={t('common.add')}
              onPress={() => createCategory.mutate({ name: categoryName, name_ar: categoryNameAr || undefined })}
              loading={createCategory.isPending}
              disabled={!categoryName}
            />
            <View style={{ height: 8 }} />
            <Button title={t('common.cancel')} variant="outline" onPress={() => setShowCategoryModal(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={showServiceModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('owner.services.addService')}</Text>
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
            <Button title={t('common.cancel')} variant="outline" onPress={() => setShowServiceModal(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: colors.black, marginBottom: 16, textAlign: 'auto' },
  buttons: { marginBottom: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: colors.white, borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: colors.black, marginBottom: 16, textAlign: 'auto' },
});
