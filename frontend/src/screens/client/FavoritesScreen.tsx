import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View, RefreshControl } from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../contexts/LanguageContext';
import { favoritesApi } from '../../api/favorites';
import { SalonCard } from '../../components/salon/SalonCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { colors } from '../../theme/colors';
import type { ClientFavoritesScreenProps } from '../../types/navigation';

export function FavoritesScreen({ navigation }: ClientFavoritesScreenProps<'Favorites'>) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoritesApi.getAll(),
  });

  const favorites = data?.data || [];

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading) return <LoadingScreen />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Navy header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="heart" size={22} color={colors.accent} />
        </View>
        <View>
          <Text style={styles.headerTitle}>{t('favorites.title')}</Text>
          <Text style={styles.headerSubtitle}>
            {favorites.length} {t('favorites.count', { count: favorites.length })}
          </Text>
        </View>
      </View>

      <FlatList
        data={favorites}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} tintColor={colors.accent} />
        }
        renderItem={({ item }) => (
          <SalonCard
            salon={item.salon || item}
            language={language}
            onPress={() => navigation.navigate('SalonDetail', { salonId: item.salon_id || item.id })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
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
  header: {
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
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
    fontSize: 22,
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
  list: { padding: 16 },
});
