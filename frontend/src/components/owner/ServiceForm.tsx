import React, { useState } from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { AppText } from '../ui/AppText';
import { serviceSchema, ServiceForm as ServiceFormType } from '../../utils/validators';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/spacing';

export interface ServiceFormSubmitValues extends ServiceFormType {
  isActive: boolean;
}

interface ServiceFormProps {
  initialValues?: Partial<ServiceFormType> & { isActive?: boolean };
  onSubmit: (data: ServiceFormSubmitValues) => void;
  loading?: boolean;
}

export function ServiceForm({ initialValues, onSubmit, loading }: ServiceFormProps) {
  const { t } = useTranslation();
  const isEdit = !!initialValues?.name;
  const [isActive, setIsActive] = useState<boolean>(initialValues?.isActive ?? true);

  const { control, handleSubmit, formState: { errors } } = useForm<ServiceFormType>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: initialValues?.name || '',
      nameAr: initialValues?.nameAr || '',
      price: initialValues?.price || 0,
      duration: initialValues?.duration || 30,
    },
  });

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, value } }) => (
          <Input
            label={t('owner.services.serviceName')}
            value={value}
            onChangeText={onChange}
            error={errors.name ? t(errors.name.message!) : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="nameAr"
        render={({ field: { onChange, value } }) => (
          <Input
            label={t('owner.services.serviceNameAr')}
            value={value || ''}
            onChangeText={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="price"
        render={({ field: { onChange, value } }) => (
          <Input
            label={t('owner.services.servicePrice')}
            value={String(value)}
            onChangeText={(v) => onChange(parseInt(v) || 0)}
            keyboardType="numeric"
            error={errors.price ? t(errors.price.message!) : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="duration"
        render={({ field: { onChange, value } }) => (
          <Input
            label={t('owner.services.serviceDuration')}
            value={String(value)}
            onChangeText={(v) => onChange(parseInt(v) || 0)}
            keyboardType="numeric"
            error={errors.duration ? t(errors.duration.message!) : undefined}
          />
        )}
      />

      <View style={styles.activeRow}>
        <View style={{ flex: 1 }}>
          <AppText style={[typography.bodyMedium, styles.activeLabel]}>
            {t('owner.services.serviceActiveLabel')}
          </AppText>
          <AppText style={[typography.bodySmall, styles.activeHint]}>
            {isActive
              ? t('owner.services.active')
              : t('owner.services.pausedHint')}
          </AppText>
        </View>
        <Switch
          value={isActive}
          onValueChange={setIsActive}
          trackColor={{ true: colors.accent, false: colors.hairline }}
          thumbColor={colors.white}
          ios_backgroundColor={colors.hairline}
        />
      </View>

      <Button
        title={isEdit ? t('common.update') : t('common.add')}
        onPress={handleSubmit((data) => onSubmit({ ...data, isActive }))}
        loading={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    padding: 16,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.input,
    backgroundColor: colors.surfaceAlt,
  },
  activeLabel: {
    color: colors.ink,
    fontFamily: 'Outfit-SemiBold',
  },
  activeHint: {
    color: colors.slate,
    marginTop: 2,
  },
});
