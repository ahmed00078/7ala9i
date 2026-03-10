import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppText as Text } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { adminApi } from '../../api/admin';
import { colors } from '../../theme/colors';
import type { AdminOwnersScreenProps } from '../../types/navigation';

interface OwnerSummary {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
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

export function AdminOwnersScreen({ navigation }: AdminOwnersScreenProps<'Owners'>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [pendingOnly, setPendingOnly] = useState(true);
  const [selectedOwner, setSelectedOwner] = useState<OwnerSummary | null>(null);
  const [approveForm, setApproveForm] = useState<ApproveForm>({
    salon_name: '',
    salon_name_ar: '',
    address: '',
    city: 'Nouakchott',
    salon_phone: '',
  });

  const { data: owners = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'owners', pendingOnly],
    queryFn: async () => {
      const res = await adminApi.listOwners(pendingOnly);
      return res.data as OwnerSummary[];
    },
  });

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
      setSelectedOwner(null);
    },
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => adminApi.rejectOwner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  const handleApprove = () => {
    if (!selectedOwner || !approveForm.salon_name.trim()) return;
    approveMut.mutate({ id: selectedOwner.id, form: approveForm });
  };

  const handleReject = (owner: OwnerSummary) => {
    Alert.alert(
      t('admin.rejectTitle'),
      t('admin.rejectConfirm', { name: `${owner.first_name} ${owner.last_name}` }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.reject'),
          style: 'destructive',
          onPress: () => rejectMut.mutate(owner.id),
        },
      ]
    );
  };

  const renderOwner = ({ item }: { item: OwnerSummary }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>
            {item.first_name[0]}{item.last_name[0]}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.ownerName}>{item.first_name} {item.last_name}</Text>
          <Text style={styles.ownerEmail}>{item.email}</Text>
          {item.phone && <Text style={styles.ownerPhone}>{item.phone}</Text>}
        </View>
        <View style={[
          styles.statusBadge,
          item.is_approved ? styles.statusApproved : styles.statusPending
        ]}>
          <Text style={[
            styles.statusText,
            item.is_approved ? styles.statusTextApproved : styles.statusTextPending
          ]}>
            {item.is_approved ? t('admin.approved') : t('admin.pending')}
          </Text>
        </View>
      </View>

      {item.salon_name && (
        <View style={styles.salonRow}>
          <Ionicons name="cut" size={14} color={colors.accent} />
          <Text style={styles.salonName}>{item.salon_name}</Text>
          {item.total_bookings > 0 && (
            <Text style={styles.bookingsCount}>{item.total_bookings} {t('admin.bookings')}</Text>
          )}
        </View>
      )}

      <Text style={styles.dateText}>
        {t('admin.appliedOn')} {new Date(item.created_at).toLocaleDateString()}
      </Text>

      {!item.is_approved && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => handleReject(item)}
            disabled={rejectMut.isPending}
          >
            <Ionicons name="close" size={16} color={colors.error} />
            <Text style={styles.rejectBtnText}>{t('admin.reject')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.approveBtn}
            onPress={() => {
              setSelectedOwner(item);
              setApproveForm(f => ({
                ...f,
                salon_name: `Salon ${item.first_name}`,
                salon_phone: item.phone ?? '',
              }));
            }}
          >
            <Ionicons name="checkmark" size={16} color={colors.white} />
            <Text style={styles.approveBtnText}>{t('admin.approve')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('admin.ownersTitle')}</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterBtn, pendingOnly && styles.filterBtnActive]}
            onPress={() => setPendingOnly(true)}
          >
            <Text style={[styles.filterText, pendingOnly && styles.filterTextActive]}>
              {t('admin.pending')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, !pendingOnly && styles.filterBtnActive]}
            onPress={() => setPendingOnly(false)}
          >
            <Text style={[styles.filterText, !pendingOnly && styles.filterTextActive]}>
              {t('admin.all')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={owners}
        keyExtractor={(item) => item.id}
        renderItem={renderOwner}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={40} color={colors.gray} />
            <Text style={styles.emptyText}>
              {isLoading ? t('common.loading') : t('admin.noOwners')}
            </Text>
          </View>
        }
      />

      {/* Approve Modal */}
      <Modal visible={!!selectedOwner} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('admin.approveTitle')}</Text>
              <TouchableOpacity onPress={() => setSelectedOwner(null)}>
                <Ionicons name="close" size={22} color={colors.grayDark} />
              </TouchableOpacity>
            </View>

            {selectedOwner && (
              <Text style={styles.modalSubtitle}>
                {selectedOwner.first_name} {selectedOwner.last_name} — {selectedOwner.email}
              </Text>
            )}

            <Text style={styles.fieldLabel}>{t('admin.salonName')} *</Text>
            <TextInput
              style={styles.input}
              value={approveForm.salon_name}
              onChangeText={(v) => setApproveForm(f => ({ ...f, salon_name: v }))}
              placeholder={t('admin.salonNamePlaceholder')}
            />

            <Text style={styles.fieldLabel}>{t('admin.salonNameAr')}</Text>
            <TextInput
              style={styles.input}
              value={approveForm.salon_name_ar}
              onChangeText={(v) => setApproveForm(f => ({ ...f, salon_name_ar: v }))}
              placeholder={t('admin.salonNameArPlaceholder')}
            />

            <Text style={styles.fieldLabel}>{t('admin.address')}</Text>
            <TextInput
              style={styles.input}
              value={approveForm.address}
              onChangeText={(v) => setApproveForm(f => ({ ...f, address: v }))}
              placeholder={t('admin.addressPlaceholder')}
            />

            <Text style={styles.fieldLabel}>{t('admin.city')}</Text>
            <TextInput
              style={styles.input}
              value={approveForm.city}
              onChangeText={(v) => setApproveForm(f => ({ ...f, city: v }))}
              placeholder="Nouakchott"
            />

            <Text style={styles.fieldLabel}>{t('admin.salonPhone')}</Text>
            <TextInput
              style={styles.input}
              value={approveForm.salon_phone}
              onChangeText={(v) => setApproveForm(f => ({ ...f, salon_phone: v }))}
              keyboardType="phone-pad"
              placeholder="XXXXXXXX"
            />

            <Button
              title={t('admin.approveAndCreate')}
              onPress={handleApprove}
              loading={approveMut.isPending}
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
    paddingBottom: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    color: colors.white,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  filterBtnActive: {
    backgroundColor: colors.accent,
  },
  filterText: {
    fontSize: 13,
    fontFamily: 'Outfit-Medium',
    color: 'rgba(255,255,255,0.7)',
  },
  filterTextActive: {
    color: colors.white,
  },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  avatarBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: colors.white,
  },
  cardInfo: { flex: 1 },
  ownerName: {
    fontSize: 15,
    fontFamily: 'Outfit-SemiBold',
    color: colors.navy,
  },
  ownerEmail: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: colors.grayDark,
    marginTop: 1,
  },
  ownerPhone: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: colors.gray,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusPending: { backgroundColor: colors.warningLight },
  statusApproved: { backgroundColor: colors.successLight },
  statusText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  statusTextPending: { color: colors.warning },
  statusTextApproved: { color: colors.successDark },
  salonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    backgroundColor: colors.accentLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  salonName: {
    fontSize: 13,
    fontFamily: 'Outfit-Medium',
    color: colors.accent,
    flex: 1,
  },
  bookingsCount: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: colors.grayDark,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: colors.gray,
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.error,
  },
  rejectBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit-SemiBold',
    color: colors.error,
  },
  approveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.accent,
  },
  approveBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit-SemiBold',
    color: colors.white,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.gray,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: colors.navy,
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: colors.grayDark,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: 'Outfit-SemiBold',
    color: colors.grayDark,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.black,
    marginBottom: 16,
    backgroundColor: colors.background,
  },
});
