import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useLanguage } from '../../contexts/LanguageContext';
import { useAlert } from '../../contexts/AlertContext';
import { ownerApi } from '../../api/owner';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ServiceForm } from '../../components/owner/ServiceForm';
import { AppText } from '../../components/ui/AppText';
import { Skeleton } from '../../components/premium';
import {
  Surface,
  PressablePremium,
  SwipeableRow,
  Segment,
  BottomSheetForm,
  useToast,
  type BottomSheetFormRef,
} from '../../components/premium';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { formatCurrency } from '../../utils/formatters';

interface ServiceItem {
  id: string;
  name: string;
  name_ar?: string;
  price: number;
  duration: number;
  is_active?: boolean;
}

interface ServiceCategoryModel {
  id: string;
  name: string;
  name_ar?: string;
  services?: ServiceItem[];
}

type AddTab = 'service' | 'category';

export function ManageServicesScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const alert = useAlert();
  const toast = useToast();
  const queryClient = useQueryClient();

  const addSheetRef = useRef<BottomSheetFormRef>(null);
  const editSheetRef = useRef<BottomSheetFormRef>(null);
  const editCategorySheetRef = useRef<BottomSheetFormRef>(null);

  const [addTab, setAddTab] = useState<AddTab>('service');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<ServiceCategoryModel | null>(null);

  const [categoryName, setCategoryName] = useState('');
  const [categoryNameAr, setCategoryNameAr] = useState('');
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryNameAr, setEditCategoryNameAr] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['owner', 'salon'],
    queryFn: () => ownerApi.getSalon(),
  });

  const salon = data?.data;
  const categories: ServiceCategoryModel[] = salon?.service_categories ?? [];

  const createCategory = useMutation({
    mutationFn: (payload: { name: string; name_ar?: string }) =>
      ownerApi.createCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'salon'] });
      toast.show({ message: t('owner.services.categoryAdded'), variant: 'saved' });
      setCategoryName('');
      setCategoryNameAr('');
      addSheetRef.current?.dismiss();
    },
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name: string; name_ar?: string } }) =>
      ownerApi.updateCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'salon'] });
      toast.show({ message: t('owner.services.categoryUpdated'), variant: 'saved' });
      editCategorySheetRef.current?.dismiss();
      setEditingCategory(null);
    },
  });

  const createService = useMutation({
    mutationFn: (payload: any) => ownerApi.createService(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'salon'] });
      toast.show({ message: t('owner.services.serviceAdded'), variant: 'saved' });
      addSheetRef.current?.dismiss();
    },
  });

  const updateService = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      ownerApi.updateService(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'salon'] });
      toast.show({ message: t('owner.services.serviceUpdated'), variant: 'saved' });
      editSheetRef.current?.dismiss();
      setEditingService(null);
    },
  });

  const deleteService = useMutation({
    mutationFn: (id: string) => ownerApi.deleteService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'salon'] });
      toast.show({ message: t('owner.services.serviceDeleted'), variant: 'saved' });
    },
  });

  const toggleServiceActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      ownerApi.updateService(id, { is_active: isActive }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'salon'] });
      toast.show({
        message: vars.isActive
          ? t('owner.services.serviceActivated')
          : t('owner.services.servicePaused'),
        variant: 'saved',
      });
    },
  });

  const openAddSheet = (tab: AddTab) => {
    setAddTab(tab);
    if (tab === 'service' && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
    addSheetRef.current?.present();
  };

  const openEditSheet = (service: ServiceItem) => {
    setEditingService(service);
    editSheetRef.current?.present();
  };

  const openEditCategory = (category: ServiceCategoryModel) => {
    setEditingCategory(category);
    setEditCategoryName(category.name ?? '');
    setEditCategoryNameAr(category.name_ar ?? '');
    editCategorySheetRef.current?.present();
  };

  const confirmDelete = (service: ServiceItem) => {
    alert.show({
      type: 'confirm',
      title: t('owner.services.deleteService'),
      message: service.name,
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      onConfirm: () => deleteService.mutate(service.id),
    });
  };

  const addOptions = useMemo(
    () => [
      { value: 'service' as const, label: t('owner.services.addServiceTab') },
      { value: 'category' as const, label: t('owner.services.addCategoryTab') },
    ],
    [t],
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <AppText style={[typography.header, styles.title]}>
              {t('owner.services.title')}
            </AppText>
            <AppText style={[typography.bodySmall, styles.subtitle]}>
              {categories.length} {t('owner.services.categories')}
            </AppText>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading ? (
          <View style={{ gap: 14 }}>
            <Skeleton.Block height={120} radius={radius.card} />
            <Skeleton.Block height={120} radius={radius.card} />
          </View>
        ) : categories.length === 0 ? (
          <View style={styles.empty}>
            <AppText style={[typography.header, styles.emptyTitle]}>
              {t('owner.services.noCategories')}
            </AppText>
            <AppText style={[typography.bodySmall, styles.emptyHint]}>
              {t('owner.services.noCategoriesHint')}
            </AppText>
          </View>
        ) : (
          categories.map((cat) => (
            <CategorySection
              key={cat.id}
              category={cat}
              language={language}
              onTapService={openEditSheet}
              onDeleteService={confirmDelete}
              onToggleService={(s) =>
                toggleServiceActive.mutate({ id: s.id, isActive: !(s.is_active ?? true) })
              }
              onEditCategory={openEditCategory}
            />
          ))
        )}
      </ScrollView>

      {/* Floating "+" button — opens Add sheet */}
      <View style={styles.fabWrap} pointerEvents="box-none">
        <PressablePremium
          haptic="medium"
          pressScale={0.9}
          onPress={() => openAddSheet('service')}
          style={styles.fab}
          accessibilityRole="button"
          accessibilityLabel={t('owner.services.addService')}
        >
          <Ionicons name="add" size={28} color={colors.white} />
        </PressablePremium>
      </View>

      {/* Add sheet */}
      <BottomSheetForm
        ref={addSheetRef}
        title={t('owner.services.addSegment')}
        snapPoints={['85%']}
      >
        <View style={{ marginBottom: 16 }}>
          <Segment<AddTab> options={addOptions} value={addTab} onChange={setAddTab} />
        </View>
        {addTab === 'service' ? (
          <ScrollView keyboardShouldPersistTaps="handled">
            {categories.length > 0 && (
              <>
                <AppText style={[typography.capsLabel, styles.formCaption]}>
                  {t('owner.services.selectCategory')}
                </AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  {categories.map((cat) => {
                    const isActive = selectedCategoryId === cat.id;
                    const catName = language === 'ar' && cat.name_ar ? cat.name_ar : cat.name;
                    return (
                      <PressablePremium
                        key={cat.id}
                        haptic="selection"
                        pressScale={0.94}
                        onPress={() => setSelectedCategoryId(cat.id)}
                        style={[styles.catChip, isActive && styles.catChipActive]}
                      >
                        <AppText
                          style={[
                            typography.bodySmall,
                            { color: isActive ? colors.white : colors.slate, fontFamily: 'Outfit-SemiBold' },
                          ]}
                        >
                          {catName}
                        </AppText>
                      </PressablePremium>
                    );
                  })}
                </ScrollView>
              </>
            )}
            <ServiceForm
              onSubmit={(formData) => {
                if (!selectedCategoryId) return;
                createService.mutate({
                  category_id: selectedCategoryId,
                  name: formData.name,
                  name_ar: formData.nameAr || undefined,
                  price: formData.price,
                  duration: formData.duration,
                  is_active: formData.isActive,
                });
              }}
              loading={createService.isPending}
            />
          </ScrollView>
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled">
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
              onPress={() =>
                createCategory.mutate({
                  name: categoryName,
                  name_ar: categoryNameAr || undefined,
                })
              }
              loading={createCategory.isPending}
              disabled={!categoryName}
            />
          </ScrollView>
        )}
      </BottomSheetForm>

      {/* Edit sheet */}
      <BottomSheetForm
        ref={editSheetRef}
        title={t('owner.services.editService')}
        snapPoints={['80%']}
        onDismiss={() => setEditingService(null)}
      >
        {editingService && (
          <ScrollView keyboardShouldPersistTaps="handled">
            <ServiceForm
              initialValues={{
                name: editingService.name,
                nameAr: editingService.name_ar,
                price: editingService.price,
                duration: editingService.duration,
                isActive: editingService.is_active ?? true,
              }}
              onSubmit={(formData) => {
                updateService.mutate({
                  id: editingService.id,
                  payload: {
                    name: formData.name,
                    name_ar: formData.nameAr || undefined,
                    price: formData.price,
                    duration: formData.duration,
                    is_active: formData.isActive,
                  },
                });
              }}
              loading={updateService.isPending}
            />
          </ScrollView>
        )}
      </BottomSheetForm>

      {/* Edit category sheet */}
      <BottomSheetForm
        ref={editCategorySheetRef}
        title={t('owner.services.editCategory')}
        snapPoints={['55%']}
        onDismiss={() => setEditingCategory(null)}
        footer={
          <Button
            title={t('common.save')}
            onPress={() => {
              if (!editingCategory) return;
              updateCategory.mutate({
                id: editingCategory.id,
                payload: {
                  name: editCategoryName.trim(),
                  name_ar: editCategoryNameAr.trim() || undefined,
                },
              });
            }}
            loading={updateCategory.isPending}
            disabled={!editCategoryName.trim()}
          />
        }
      >
        {editingCategory && (
          <ScrollView keyboardShouldPersistTaps="handled">
            <Input
              label={t('owner.services.categoryName')}
              value={editCategoryName}
              onChangeText={setEditCategoryName}
            />
            <Input
              label={t('owner.services.serviceNameAr')}
              value={editCategoryNameAr}
              onChangeText={setEditCategoryNameAr}
              style={{ textAlign: 'right' }}
            />
          </ScrollView>
        )}
      </BottomSheetForm>
    </View>
  );
}

/* ── Category section ──────────────────────────────────────────────── */

function CategorySection({
  category,
  language,
  onTapService,
  onDeleteService,
  onToggleService,
  onEditCategory,
}: {
  category: ServiceCategoryModel;
  language: string;
  onTapService: (s: ServiceItem) => void;
  onDeleteService: (s: ServiceItem) => void;
  onToggleService: (s: ServiceItem) => void;
  onEditCategory: (c: ServiceCategoryModel) => void;
}) {
  const { t } = useTranslation();
  const categoryName =
    language === 'ar' && category.name_ar ? category.name_ar : category.name;
  const services = category.services ?? [];

  return (
    <View style={categoryStyles.wrap}>
      <PressablePremium
        haptic="selection"
        pressScale={0.99}
        onPress={() => onEditCategory(category)}
        style={categoryStyles.header}
        accessibilityRole="button"
        accessibilityLabel={t('owner.services.editCategory')}
      >
        <AppText style={[typography.capsLabel, categoryStyles.title]}>
          {categoryName}
        </AppText>
        <View style={categoryStyles.badge}>
          <AppText style={categoryStyles.badgeText}>{services.length}</AppText>
        </View>
        <View style={{ flex: 1 }} />
        <Ionicons name="pencil" size={13} color={colors.slateSoft} />
      </PressablePremium>
      <Surface variant="sunken" padding={0} style={categoryStyles.surface}>
        {services.length === 0 ? (
          <View style={categoryStyles.emptyRow}>
            <AppText style={[typography.bodySmall, { color: colors.slateSoft }]}>
              {t('owner.services.noServicesInCategory')}
            </AppText>
          </View>
        ) : (
          services.map((service, i) => {
            const serviceName =
              language === 'ar' && service.name_ar ? service.name_ar : service.name;
            const isPaused = service.is_active === false;
            return (
              <SwipeableRow
                key={service.id}
                leadingAction={{
                  label: isPaused
                    ? t('owner.services.active')
                    : t('owner.services.paused'),
                  icon: isPaused ? 'play-outline' : 'pause-outline',
                  color: isPaused ? colors.ok : colors.warn,
                  onPress: () => onToggleService(service),
                }}
                trailingAction={{
                  label: t('owner.services.deleteAction'),
                  icon: 'trash-outline',
                  destructive: true,
                  color: colors.danger,
                  onPress: () => onDeleteService(service),
                }}
              >
                <PressablePremium
                  haptic="selection"
                  pressScale={0.99}
                  onPress={() => onTapService(service)}
                  style={[
                    categoryStyles.serviceRow,
                    i < services.length - 1 && categoryStyles.serviceRowDivider,
                    isPaused && categoryStyles.serviceRowPaused,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={categoryStyles.nameLine}>
                      <AppText
                        style={[
                          typography.bodyMedium,
                          categoryStyles.serviceName,
                          isPaused && categoryStyles.serviceNamePaused,
                        ]}
                        numberOfLines={1}
                      >
                        {serviceName}
                      </AppText>
                      {isPaused && (
                        <View style={categoryStyles.pausedChip}>
                          <Ionicons name="pause" size={10} color={colors.warn} />
                          <AppText style={categoryStyles.pausedChipText}>
                            {t('owner.services.paused')}
                          </AppText>
                        </View>
                      )}
                    </View>
                    <AppText style={[typography.caption, categoryStyles.serviceDuration]}>
                      {service.duration} min
                    </AppText>
                  </View>
                  <AppText
                    style={[
                      typography.bodyMedium,
                      categoryStyles.servicePrice,
                      isPaused && categoryStyles.servicePricePaused,
                    ]}
                  >
                    {formatCurrency(service.price)}
                  </AppText>
                </PressablePremium>
              </SwipeableRow>
            );
          })
        )}
      </Surface>
    </View>
  );
}

/* ── Styles ────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 4,
    paddingBottom: 12,
  },
  title: { color: colors.ink },
  subtitle: { color: colors.slate, marginTop: 2 },
  scroll: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 140,
    gap: 20,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 6,
  },
  emptyTitle: { color: colors.ink },
  emptyHint: { color: colors.slate, textAlign: 'center' },
  formCaption: { color: colors.slate, marginBottom: 8 },
  chipScroll: { flexDirection: 'row', marginBottom: 16 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    marginEnd: 8,
  },
  catChipActive: {
    backgroundColor: colors.ink,
  },
  fabWrap: {
    position: 'absolute',
    bottom: 92,
    right: spacing.screenPadding,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 8,
  },
});

const categoryStyles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 8,
  },
  title: {
    color: colors.slate,
  },
  badge: {
    minWidth: 22,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Outfit-SemiBold',
    color: colors.slate,
    fontVariant: ['tabular-nums'],
  },
  surface: {
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  emptyRow: {
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surfaceAlt,
  },
  serviceRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  serviceName: { color: colors.ink, fontFamily: 'Outfit-SemiBold' },
  serviceNamePaused: { color: colors.slateSoft },
  serviceDuration: { color: colors.slate, marginTop: 1 },
  servicePrice: {
    color: colors.accent,
    fontFamily: 'Outfit-SemiBold',
    fontVariant: ['tabular-nums'],
  },
  servicePricePaused: { color: colors.slateSoft },
  serviceRowPaused: {
    backgroundColor: colors.surface,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pausedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#F2E6D7',
  },
  pausedChipText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 10,
    color: colors.warn,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
