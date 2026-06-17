import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../components/ui/AppText';
import {
  Surface,
  SettingsGroup,
  SettingsRow,
  PressablePremium,
  CompletionMeter,
} from '../../components/premium';
import { useSalonCompletion } from '../../hooks/useSalonCompletion';
import type { CompletionItem, CompletionTarget } from '../../utils/salonCompletion';
import { useIsRTL } from '../../i18n/useIsRTL';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export function ProfileCompletionScreen() {
  const { t } = useTranslation();
  const rtl = useIsRTL();
  // Cross-tab navigation (Services/Hours/Profile stacks) — matches DashboardScreen's pattern.
  const navigation = useNavigation<any>();
  const { items, done, total, isLiveReady, allComplete, loading } = useSalonCompletion();

  const goTo = (target: CompletionTarget) => {
    switch (target) {
      case 'workingHours':
        navigation.navigate('HoursTab', { screen: 'WorkingHours' });
        break;
      case 'services':
        navigation.navigate('ServicesTab', { screen: 'ManageServices' });
        break;
      case 'photos':
        navigation.navigate('ProfileTab', { screen: 'ManagePhotos' });
        break;
      case 'location':
        navigation.navigate('ProfileTab', { screen: 'EditLocation' });
        break;
      case 'address':
      case 'description':
        navigation.navigate('ProfileTab', {
          screen: 'OwnerProfile',
          params: { openEdit: 'salon' },
        });
        break;
    }
  };

  const renderRow = (item: CompletionItem) => (
    <SettingsRow
      key={item.key}
      icon={item.complete ? 'checkmark-circle' : (item.icon as any)}
      label={t(item.labelKey)}
      value={item.complete ? t('owner.completion.done') : t(item.hintKey)}
      onPress={() => goTo(item.target)}
    />
  );

  const required = items.filter((i) => i.required);
  const recommended = items.filter((i) => !i.required);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <PressablePremium
            haptic="selection"
            pressScale={0.92}
            onPress={() => navigation.goBack()}
            style={styles.iconBtn}
            accessibilityLabel={t('common.back')}
          >
            <Ionicons
              name={rtl ? 'chevron-forward' : 'chevron-back'}
              size={20}
              color={colors.ink}
            />
          </PressablePremium>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <AppText style={styles.title}>{t('owner.completion.title')}</AppText>
          </View>
          <View style={styles.iconBtn} />
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Progress summary ─────────────────────────────────────── */}
            <Surface variant="raised" style={styles.summary} padding={20}>
              {allComplete ? (
                <View style={styles.doneHeader}>
                  <View style={styles.doneBadge}>
                    <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.summaryTitle}>{t('owner.completion.allDoneTitle')}</AppText>
                    <AppText style={styles.summarySub}>{t('owner.completion.allDone')}</AppText>
                  </View>
                </View>
              ) : (
                <AppText style={styles.summarySub}>
                  {isLiveReady
                    ? t('owner.completion.subtitleReady')
                    : t('owner.completion.subtitle')}
                </AppText>
              )}
              <CompletionMeter
                done={done}
                total={total}
                label={t('owner.completion.progress', { done, total })}
                style={styles.meter}
              />
            </Surface>

            {/* ── Required ─────────────────────────────────────────────── */}
            <SettingsGroup label={t('owner.completion.sectionRequired')}>
              {required.map(renderRow)}
            </SettingsGroup>

            {/* ── Recommended ──────────────────────────────────────────── */}
            <SettingsGroup label={t('owner.completion.sectionRecommended')}>
              {recommended.map(renderRow)}
            </SettingsGroup>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  title: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 16,
    color: colors.ink,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: spacing['3xl'] },
  summary: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  meter: { marginTop: spacing.base },
  doneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  doneBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  summaryTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 16,
    color: colors.ink,
    marginBottom: 2,
  },
  summarySub: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: colors.slate,
  },
});
