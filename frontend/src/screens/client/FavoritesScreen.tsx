import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { AppText } from '../../components/ui/AppText';
import { useLanguage } from '../../contexts/LanguageContext';
import { favoritesApi } from '../../api/favorites';
import { ErrorState } from '../../components/ui/ErrorState';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import {
  PremiumSalonCard,
  EmptyFavoritesIllustration,
  Skeleton,
} from '../../components/premium';
import type { ClientFavoritesScreenProps } from '../../types/navigation';

interface FavoriteRow {
  id: string;
  salon_id?: string;
  salon?: any;
}

export function FavoritesScreen({ navigation }: ClientFavoritesScreenProps<'Favorites'>) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoritesApi.getAll(),
  });

  const favorites: FavoriteRow[] = data?.data || [];

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading) return <FavoritesSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppText style={styles.title}>{t('favorites.title')}</AppText>
        <AppText style={styles.subtitle}>
          {favorites.length === 0
            ? t('favorites.subtitleEmpty')
            : t('favorites.subtitle', { count: favorites.length })}
        </AppText>
      </View>

      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={favorites.length > 0 ? styles.row : undefined}
        contentContainerStyle={favorites.length === 0 ? styles.listEmpty : styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
        renderItem={({ item }) => {
          const salon = item.salon || item;
          return (
            <PremiumSalonCard
              salon={salon}
              variant="portrait"
              language={language}
              onPress={() =>
                navigation.navigate('SalonDetail', { salonId: item.salon_id || salon.id })
              }
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <EmptyFavoritesIllustration size={140} color={colors.accent} />
            <AppText style={styles.emptyTitle}>{t('favorites.noFavorites')}</AppText>
            <AppText style={styles.emptyHint}>{t('favorites.noFavoritesHint')}</AppText>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function FavoritesSkeleton() {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppText style={styles.title}>{t('favorites.title')}</AppText>
        <Skeleton.Block width={180} height={14} radius={4} style={{ marginTop: 6 }} />
      </View>
      <View style={[styles.list, { gap: 14 }]}>
        {[0, 1].map((row) => (
          <View key={row} style={styles.row}>
            <Skeleton.Block width="48%" height={220} radius={18} />
            <Skeleton.Block width="48%" height={220} radius={18} />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 6,
    paddingBottom: 14,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.slate,
    marginTop: 4,
  },

  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: 6,
    paddingBottom: 36,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  row: {
    justifyContent: 'space-between',
    gap: 14,
  },

  empty: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.slate,
    textAlign: 'center',
    lineHeight: 18,
  },
});
