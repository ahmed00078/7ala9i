import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
