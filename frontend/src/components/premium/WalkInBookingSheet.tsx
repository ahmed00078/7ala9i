import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

import { BottomSheetForm, type BottomSheetFormRef } from './BottomSheetForm';
import { PhoneInput } from './PhoneInput';
import { FloatingInput } from './FloatingInput';
import { DayStrip } from './DayStrip';
import { SlotPicker } from './SlotPicker';
import { PressablePremium } from './PressablePremium';
import { useToast } from './ToastProvider';
import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';
import { ownerApi } from '../../api/owner';
import { salonsApi } from '../../api/salons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { formatCurrency } from '../../utils/formatters';

export interface WalkInBookingSheetRef {
  present: (initialDate?: string) => void;
  dismiss: () => void;
}

interface Service {
  id: string;
  name: string;
  name_ar?: string | null;
  price: number;
  duration: number;
  is_active?: boolean;
}

interface ServiceCategory {
  id: string;
  name: string;
  name_ar?: string | null;
  services: Service[];
}

interface OwnerSalon {
  id: string;
  service_categories?: ServiceCategory[];
}

export const WalkInBookingSheet = forwardRef<WalkInBookingSheetRef>(function WalkInBookingSheet(_, ref) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetFormRef>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [bookingDate, setBookingDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ phone?: string; firstName?: string; service?: string; slot?: string }>({});

  const reset = (initial?: string) => {
    setPhone('');
    setFirstName('');
    setServiceId(null);
    setBookingDate(initial ?? format(new Date(), 'yyyy-MM-dd'));
    setSelectedSlot(null);
    setErrors({});
  };

  useImperativeHandle(ref, () => ({
    present: (initial?: string) => {
      reset(initial);
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const { data: salonResp } = useQuery({
    queryKey: ['owner', 'salon'],
    queryFn: () => ownerApi.getSalon(),
  });
  const salon = salonResp?.data as OwnerSalon | undefined;
  const salonId = salon?.id;

  const services = useMemo<Service[]>(() => {
    if (!salon?.service_categories) return [];
    return salon.service_categories
      .flatMap((c) => c.services ?? [])
      .filter((s) => s.is_active !== false);
  }, [salon]);

  const selectedService = services.find((s) => s.id === serviceId) ?? null;

  const { data: availResp, isFetching: loadingSlots } = useQuery({
    queryKey: ['owner', 'walkin-availability', salonId, serviceId, bookingDate],
    queryFn: () =>
      salonsApi.getAvailability(salonId!, { date: bookingDate, service_id: serviceId! }),
    enabled: Boolean(salonId && serviceId && bookingDate),
  });
  const availableSlots = (availResp?.data?.slots ?? []) as string[];

  const mutation = useMutation({
    mutationFn: () =>
      ownerApi.createBooking({
        phone,
        first_name: firstName.trim(),
        service_id: serviceId!,
        booking_date: bookingDate,
        start_time: selectedSlot!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner'] });
      toast.show({ message: t('owner.walkIn.success'), variant: 'saved' });
      sheetRef.current?.dismiss();
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      toast.show({ message: detail || t('errors.server'), variant: 'error' });
    },
  });

  const validate = () => {
    const next: typeof errors = {};
    if (!/^\d{8}$/.test(phone)) next.phone = t('owner.walkIn.errors.phone');
    if (!firstName.trim()) next.firstName = t('owner.walkIn.errors.name');
    if (!serviceId) next.service = t('owner.walkIn.errors.service');
    if (!selectedSlot) next.slot = t('owner.walkIn.errors.slot');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    mutation.mutate();
  };

  return (
    <BottomSheetForm
      ref={sheetRef}
      title={t('owner.walkIn.title')}
      snapPoints={['92%']}
    >
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <PhoneInput
          label={t('owner.walkIn.phone')}
          value={phone}
          onChangeText={setPhone}
          error={errors.phone}
        />
        <FloatingInput
          label={t('owner.walkIn.name')}
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          error={errors.firstName}
        />

        <View style={styles.section}>
          <AppText style={styles.sectionLabel}>{t('owner.walkIn.service')}</AppText>
          {services.length === 0 ? (
            <AppText style={styles.empty}>{t('owner.walkIn.noServices')}</AppText>
          ) : (
            <View style={styles.serviceList}>
              {services.map((s) => {
                const isSelected = s.id === serviceId;
                return (
                  <PressablePremium
                    key={s.id}
                    haptic="selection"
                    pressScale={0.98}
                    onPress={() => {
                      setServiceId(s.id);
                      setSelectedSlot(null);
                    }}
                    style={[styles.serviceRow, isSelected && styles.serviceRowActive]}
                  >
                    <View style={styles.radio}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={styles.serviceName} numberOfLines={1}>
                        {s.name}
                      </AppText>
                      <AppText style={styles.serviceMeta} numberOfLines={1}>
                        {s.duration} {t('owner.walkIn.minutes')} · {formatCurrency(s.price)}
                      </AppText>
                    </View>
                  </PressablePremium>
                );
              })}
            </View>
          )}
          {errors.service ? <AppText style={styles.errorText}>{errors.service}</AppText> : null}
        </View>

        <View style={styles.section}>
          <AppText style={styles.sectionLabel}>{t('owner.walkIn.date')}</AppText>
          <DayStrip
            selectedDate={bookingDate}
            onSelectDate={(d) => {
              setBookingDate(d);
              setSelectedSlot(null);
            }}
          />
        </View>

        <View style={styles.section}>
          <AppText style={styles.sectionLabel}>{t('owner.walkIn.slot')}</AppText>
          {!serviceId ? (
            <AppText style={styles.empty}>{t('owner.walkIn.pickServiceFirst')}</AppText>
          ) : loadingSlots ? (
            <ActivityIndicator color={colors.accent} style={{ marginVertical: 12 }} />
          ) : availableSlots.length === 0 ? (
            <AppText style={styles.empty}>{t('owner.walkIn.noSlots')}</AppText>
          ) : (
            <SlotPicker
              slots={availableSlots}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
              labels={{
                morning: t('booking.morning'),
                afternoon: t('booking.afternoon'),
                evening: t('booking.evening'),
              }}
            />
          )}
          {errors.slot ? <AppText style={styles.errorText}>{errors.slot}</AppText> : null}
        </View>

        {selectedService && selectedSlot ? (
          <View style={styles.summary}>
            <AppText style={styles.summaryLabel}>{t('owner.walkIn.summary')}</AppText>
            <AppText style={styles.summaryValue}>
              {selectedService.name} · {selectedSlot} · {formatCurrency(selectedService.price)}
            </AppText>
          </View>
        ) : null}

        <View style={styles.submitWrap}>
          <Button
            title={t('owner.walkIn.submit')}
            onPress={handleSubmit}
            loading={mutation.isPending}
            disabled={mutation.isPending}
          />
        </View>
      </BottomSheetScrollView>
    </BottomSheetForm>
  );
});

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  submitWrap: {
    marginTop: spacing.xl,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.slate,
    marginBottom: 10,
  },
  serviceList: {
    gap: 4,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  serviceRowActive: {
    borderColor: colors.ink,
    backgroundColor: colors.surfaceAlt,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.ink,
  },
  serviceName: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    color: colors.ink,
  },
  serviceMeta: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.slate,
    marginTop: 2,
  },
  empty: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.slateSoft,
    paddingVertical: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 6,
  },
  summary: {
    marginTop: spacing.lg,
    padding: 14,
    borderRadius: radius.input,
    backgroundColor: colors.surfaceAlt,
  },
  summaryLabel: {
    fontFamily: 'Outfit-Medium',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.slate,
  },
  summaryValue: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    color: colors.ink,
    marginTop: 4,
  },
});
