import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { serviceSchema, ServiceForm as ServiceFormType } from '../../utils/validators';

interface ServiceFormProps {
  initialValues?: Partial<ServiceFormType>;
  onSubmit: (data: ServiceFormType) => void;
  loading?: boolean;
}

export function ServiceForm({ initialValues, onSubmit, loading }: ServiceFormProps) {
  const { t } = useTranslation();
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
      <Button
        title={initialValues?.name ? t('common.update') : t('common.add')}
        onPress={handleSubmit(onSubmit)}
        loading={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    padding: 16,
  },
});
