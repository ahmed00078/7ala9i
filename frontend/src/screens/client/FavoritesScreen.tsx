import React from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../contexts/LanguageContext';
import { favoritesApi } from '../../api/favorites';
import { SalonCard } from '../../components/salon/SalonCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { colors } from '../../theme/colors';
import type { ClientFavoritesScreenProps } from '../../types/navigation';

export function FavoritesScreen({ navigation }: ClientFavoritesScreenProps<'Favorites'>) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoritesApi.getAll(),
  });

  const favorites = data?.data || [];

  if (isLoading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{t('favorites.title')}</Text>
      <FlatList
        data={favorites}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <SalonCard
            salon={item.salon || item}
            language={language}
            onPress={() => navigation.navigate('SalonDetail', { salonId: item.salon_id || item.id })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title={t('favorites.noFavorites')}
            subtitle={t('favorites.noFavoritesHint')}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: '700', color: colors.black, padding: 16, textAlign: 'auto' },
  list: { padding: 16 },
});
