import React, { useState } from 'react';
import { View, TextInput, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder={t('search.placeholder')}
          placeholderTextColor={colors.gray}
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
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
            <EmptyState title={t('search.noResults')} subtitle={t('search.noResultsHint')} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchContainer: { padding: 16, backgroundColor: colors.white },
  input: {
    backgroundColor: colors.background, borderRadius: 12, padding: 12,
    fontSize: 16, color: colors.black, textAlign: 'auto',
  },
  list: { padding: 16 },
});
