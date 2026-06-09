import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';

import { AppText } from '../../components/ui/AppText';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { adminApi } from '../../api/admin';
import { useAlert } from '../../contexts/AlertContext';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import {
  Avatar,
  PressablePremium,
  BottomSheetForm,
  type BottomSheetFormRef,
  SettingsGroup,
  SettingsRow,
} from '../../components/premium';
import { NoResultsIllustration } from '../../components/premium/illustrations';
import { useIsRTL } from '../../i18n/useIsRTL';
import type { AdminOwnersScreenProps } from '../../types/navigation';

type FilterValue = 'pending' | 'approved' | 'all';

interface OwnerSummary {
  id: string;
  phone: string;
  email: string | null;
  first_name: string;
  last_name: string;
  is_approved: boolean;
  created_at: string;
  salon_id: string | null;
  salon_name: string | null;
  total_bookings: number;
}

interface ApproveForm {
  salon_name: string;
  salon_name_ar: string;
  address: string;
  city: string;
  salon_phone: string;
}

export function AdminOwnersScreen({ navigation: _navigation }: AdminOwnersScreenProps<'Owners'>) {
  const { t } = useTranslation();
  const alert = useAlert();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<FilterValue>('pending');
  const [search, setSearch] = useState('');
  const [selectedOwner, setSelectedOwner] = useState<OwnerSummary | null>(null);
  const [approveForm, setApproveForm] = useState<ApproveForm>({
    salon_name: '',
    salon_name_ar: '',
    address: '',
    city: 'Nouakchott',
    salon_phone: '',
  });

  const detailSheetRef = useRef<BottomSheetFormRef>(null);

  const { data: owners = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'owners', filter],
    queryFn: async () => {
      const pending = filter === 'pending';
      const res = await adminApi.listOwners(pending);
      const list = res.data as OwnerSummary[];
      if (filter === 'approved') return list.filter((o) => o.is_approved);
      return list;
    },
  });

  const visible = useMemo(() => {
    if (!search.trim()) return owners;
    const q = search.trim().toLowerCase();
    return owners.filter((o) =>
      `${o.first_name} ${o.last_name} ${o.phone} ${o.email ?? ''} ${o.salon_name ?? ''}`
        .toLowerCase()
        .includes(q),
    );
  }, [owners, search]);

  const approveMut = useMutation({
    mutationFn: ({ id, form }: { id: string; form: ApproveForm }) =>
      adminApi.approveOwner(id, {
        salon_name: form.salon_name,
        salon_name_ar: form.salon_name_ar || undefined,
        address: form.address || undefined,
        city: form.city,
        salon_phone: form.salon_phone || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      detailSheetRef.current?.dismiss();
      setSelectedOwner(null);
    },
    onError: () =>
      alert.show({ type: 'error', title: t('common.error'), message: t('errors.server') }),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => adminApi.rejectOwner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      detailSheetRef.current?.dismiss();
      setSelectedOwner(null);
    },
  });

  const openOwner = (owner: OwnerSummary) => {
    setSelectedOwner(owner);
    setApproveForm({
      salon_name: owner.salon_name ?? `Salon ${owner.first_name}`,
      salon_name_ar: '',
      address: '',
      city: 'Nouakchott',
      salon_phone: owner.phone ?? '',
    });
    detailSheetRef.current?.present();
  };

  const handleApprove = () => {
    if (!selectedOwner || !approveForm.salon_name.trim()) {
      alert.show({ type: 'error', title: t('admin.fillRequired') });
      return;
    }
    approveMut.mutate({ id: selectedOwner.id, form: approveForm });
  };

  const handleReject = () => {
    if (!selectedOwner) return;
    alert.show({
      type: 'confirm',
      title: t('admin.dashboard.rejectConfirmTitle'),
      message: t('admin.dashboard.rejectConfirmBody', {
        name: `${selectedOwner.first_name} ${selectedOwner.last_name}`,
      }),
      confirmText: t('admin.dashboard.rejectConfirmCta'),
      cancelText: t('common.cancel'),
      onConfirm: () => rejectMut.mutate(selectedOwner.id),
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        {/* ── Header ───────────────────────────────────────────── */}
        <View style={styles.header}>
          <AppText style={styles.eyebrow}>{t('admin.dashboard.marketplace')}</AppText>
          <AppText style={styles.title}>{t('admin.ownersTitle')}</AppText>
        </View>

        {/* ── Search ───────────────────────────────────────────── */}
        <View style={styles.searchWrap}>
          <Ionicons
            name="search-outline"
            size={16}
            color={colors.slateSoft}
            style={styles.searchIcon}
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('admin.dashboard.searchOwners')}
            placeholderTextColor={colors.slateSoft}
            style={styles.searchInput}
          />
          {!!search && (
            <PressablePremium
              haptic="selection"
              pressScale={0.92}
              onPress={() => setSearch('')}
              style={styles.searchClear}
            >
              <Ionicons name="close-circle" size={16} color={colors.slateSoft} />
            </PressablePremium>
          )}
        </View>

        {/* ── Filter chips ─────────────────────────────────────── */}
        <View style={styles.chipsRow}>
          {(
            [
              { key: 'pending', label: t('admin.dashboard.filterPending') },
              { key: 'approved', label: t('admin.dashboard.filterApproved') },
              { key: 'all', label: t('admin.dashboard.filterAll') },
            ] as { key: FilterValue; label: string }[]
          ).map((c) => {
            const active = filter === c.key;
            return (
              <PressablePremium
                key={c.key}
                haptic="selection"
                pressScale={0.96}
                onPress={() => setFilter(c.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <AppText style={[styles.chipLabel, active && styles.chipLabelActive]}>
                  {c.label}
                </AppText>
              </PressablePremium>
            );
          })}
        </View>
      </SafeAreaView>

      <FlatList
        data={visible}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => <OwnerRow owner={item} onPress={() => openOwner(item)} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            {isLoading ? null : (
              <>
                <NoResultsIllustration />
                <AppText style={styles.emptyTitle}>{t('admin.noOwners')}</AppText>
              </>
            )}
          </View>
        }
      />

      {/* ── Owner detail / approve sheet ─────────────────────── */}
      <BottomSheetForm
        ref={detailSheetRef}
        title={selectedOwner ? `${selectedOwner.first_name} ${selectedOwner.last_name}` : ''}
        snapPoints={['90%']}
        onDismiss={() => setSelectedOwner(null)}
        footer={
          selectedOwner && !selectedOwner.is_approved ? (
            <View style={{ gap: 10 }}>
              <Button
                title={t('admin.dashboard.approveAction')}
                onPress={handleApprove}
                loading={approveMut.isPending}
              />
              <Button
                title={t('admin.dashboard.rejectAction')}
                variant="outline"
                onPress={handleReject}
                loading={rejectMut.isPending}
              />
            </View>
          ) : undefined
        }
      >
        {selectedOwner && (
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Identity */}
            <View style={styles.sheetIdentity}>
              <Avatar
                name={`${selectedOwner.first_name} ${selectedOwner.last_name}`}
                size={56}
              />
              <View style={{ flex: 1 }}>
                <AppText style={styles.sheetName}>
                  {selectedOwner.first_name} {selectedOwner.last_name}
                </AppText>
                <AppText style={styles.sheetMeta}>
                  {t('admin.dashboard.ownerCreated', {
                    date: format(parseISO(selectedOwner.created_at), 'd MMM yyyy'),
                  })}
                </AppText>
              </View>
              <View
                style={[
                  styles.statusPill,
                  selectedOwner.is_approved ? styles.statusActive : styles.statusPending,
                ]}
              >
                <AppText
                  style={[
                    styles.statusPillLabel,
                    selectedOwner.is_approved && { color: colors.ok },
                  ]}
                >
                  {selectedOwner.is_approved
                    ? t('admin.dashboard.ownerActive')
                    : t('admin.pending')}
                </AppText>
              </View>
            </View>

            {/* Contact */}
            <View style={{ marginHorizontal: -spacing.lg }}>
              <SettingsGroup label={t('admin.dashboard.ownerDetail')}>
                <SettingsRow
                  icon="call-outline"
                  label={t('admin.dashboard.ownerPhone')}
                  value={selectedOwner.phone}
                />
                {!!selectedOwner.email && (
                  <SettingsRow
                    icon="mail-outline"
                    label={t('admin.dashboard.ownerEmail')}
                    value={selectedOwner.email}
                  />
                )}
                <SettingsRow
                  icon="cut-outline"
                  label={t('admin.dashboard.ownerSalon')}
                  value={selectedOwner.salon_name ?? t('admin.dashboard.ownerNoSalon')}
                />
                {selectedOwner.is_approved && (
                  <SettingsRow
                    icon="calendar-outline"
                    label={t('admin.dashboard.ownerBookings')}
                    value={String(selectedOwner.total_bookings)}
                  />
                )}
              </SettingsGroup>
            </View>

            {/* Approve form */}
            {!selectedOwner.is_approved && (
              <View style={styles.formWrap}>
                <AppText style={styles.formLabel}>
                  {t('admin.dashboard.salonInfoHeading')}
                </AppText>
                <Input
                  label={`${t('admin.salonName')} *`}
                  value={approveForm.salon_name}
                  onChangeText={(v) => setApproveForm((f) => ({ ...f, salon_name: v }))}
                  placeholder={t('admin.salonNamePlaceholder')}
                />
                <Input
                  label={t('admin.salonNameAr')}
                  value={approveForm.salon_name_ar}
                  onChangeText={(v) => setApproveForm((f) => ({ ...f, salon_name_ar: v }))}
                  placeholder={t('admin.salonNameArPlaceholder')}
                />
                <Input
                  label={t('admin.address')}
                  value={approveForm.address}
                  onChangeText={(v) => setApproveForm((f) => ({ ...f, address: v }))}
                  placeholder={t('admin.addressPlaceholder')}
                />
                <Input
                  label={t('admin.city')}
                  value={approveForm.city}
                  onChangeText={(v) => setApproveForm((f) => ({ ...f, city: v }))}
                />
                <Input
                  label={t('admin.salonPhone')}
                  value={approveForm.salon_phone}
                  onChangeText={(v) => setApproveForm((f) => ({ ...f, salon_phone: v }))}
                  keyboardType="phone-pad"
                  placeholder="XXXXXXXX"
                />
                <View style={{ height: 16 }} />
              </View>
            )}
          </ScrollView>
        )}
      </BottomSheetForm>
    </View>
  );
}

/* ── Owner row ──────────────────────────────────────────────────── */

function OwnerRow({ owner, onPress }: { owner: OwnerSummary; onPress: () => void }) {
  const { t } = useTranslation();
  const rtl = useIsRTL();
  const fullName = `${owner.first_name} ${owner.last_name}`.trim();
  const subtitle = owner.salon_name ?? owner.phone;

  return (
    <PressablePremium haptic="selection" pressScale={0.99} onPress={onPress}>
      <View style={styles.row}>
        <Avatar name={fullName} size={40} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText style={styles.rowName} numberOfLines={1}>
            {fullName}
          </AppText>
          <AppText style={styles.rowSub} numberOfLines={1}>
            {subtitle}
          </AppText>
        </View>
        <View
          style={[
            styles.statusPill,
            owner.is_approved ? styles.statusActive : styles.statusPending,
          ]}
        >
          <AppText
            style={[
              styles.statusPillLabel,
              owner.is_approved && { color: colors.ok },
            ]}
          >
            {owner.is_approved
              ? t('admin.dashboard.ownerActive')
              : t('admin.pending')}
          </AppText>
        </View>
        <Ionicons
          name={rtl ? 'chevron-back' : 'chevron-forward'}
          size={16}
          color={colors.slateSoft}
        />
      </View>
    </PressablePremium>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },

  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 8,
    paddingBottom: 8,
  },
  eyebrow: {
    ...typography.capsLabel,
    color: colors.slateSoft,
  },
  title: {
    ...typography.title,
    color: colors.ink,
    marginTop: 4,
  },

  searchWrap: {
    marginHorizontal: spacing.screenPadding,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: { marginEnd: 8 },
  searchInput: {
    flex: 1,
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.ink,
    padding: 0,
  },
  searchClear: { padding: 4 },

  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: 6,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipLabel: {
    fontFamily: 'Outfit-Medium',
    fontSize: 12,
    color: colors.slate,
  },
  chipLabelActive: { color: colors.surface, fontFamily: 'Outfit-SemiBold' },

  list: { padding: spacing.lg, paddingBottom: 40 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  rowName: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    color: colors.ink,
  },
  rowSub: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.slate,
    marginTop: 2,
  },

  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusActive: { backgroundColor: colors.accentSoft },
  statusPending: { backgroundColor: '#F2E6D7' },
  statusPillLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.warn,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: {
    ...typography.bodyMedium,
    color: colors.slate,
  },

  /* Sheet */
  sheetIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 8,
  },
  sheetName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: colors.ink,
  },
  sheetMeta: {
    ...typography.bodySmall,
    color: colors.slate,
    marginTop: 2,
  },
  formWrap: { marginTop: 18 },
  formLabel: {
    ...typography.capsLabel,
    color: colors.slate,
    marginBottom: 10,
  },
});
