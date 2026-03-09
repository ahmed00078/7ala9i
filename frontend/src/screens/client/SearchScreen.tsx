import React, { useState } from 'react';
import { View, TextInput, FlatList, StyleSheet } from 'react-native';
import { AppText as Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '../../hooks/useDebounce';
import { useLanguage } from '../../contexts/LanguageContext';
import { salonsApi } from '../../api/salons';
import { SalonCard } from '../../components/salon/SalonCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { colors } from '../../theme/colors';
import type { ClientHomeScreenProps } from '../../types/navigation';

export function SearchScreen({ navigation }: ClientHomeScreenProps<'Search'>) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['salons', 'search', debouncedQuery],
    queryFn: () => salonsApi.search({ q: debouncedQuery || undefined }),
  });

  const salons = data?.data?.salons || data?.data || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Navy header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('search.title')}</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.6)" />
          <TextInput
            style={styles.input}
            placeholder={t('search.placeholder')}
            placeholderTextColor="rgba(255,255,255,0.45)"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <Ionicons
              name="close-circle"
              size={18}
              color="rgba(255,255,255,0.6)"
              onPress={() => setQuery('')}
            />
          )}
        </View>
      </View>

      {isLoading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          data={salons}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <SalonCard
              salon={item}
              language={language}
              onPress={() => navigation.navigate('SalonDetail', { salonId: item.id })}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title={t('search.noResults')}
              subtitle={t('search.noResultsHint')}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    color: colors.white,
    marginBottom: 14,
    textAlign: 'auto',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Outfit-Regular',
    color: colors.white,
  },
  list: { padding: 16 },
});
