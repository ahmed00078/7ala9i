import React, { forwardRef, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/spacing';
import { AppText } from '../ui/AppText';
import { PressablePremium } from './PressablePremium';

export interface BottomSheetFormRef {
  present: () => void;
  dismiss: () => void;
}

interface BottomSheetFormProps {
  /** Modal title shown in the header. */
  title?: string;
  /** Snap points as height fractions or absolute, e.g. `['50%', '90%']`. */
  snapPoints?: ReadonlyArray<string | number>;
  /** Children render inside a `BottomSheetView` — for ScrollView use the scroll variant. */
  children?: React.ReactNode;
  /** Sticky footer area (e.g. for a primary action button). */
  footer?: React.ReactNode;
  onDismiss?: () => void;
  /** Allow swipe-to-dismiss. Default `true`. */
  enablePanDownToClose?: boolean;
}

/**
 * §4.7 — the shared bottom-sheet shell used for Add/Edit Service, Hours per
 * day, booking action menus, filter sheets, etc. Standard chrome (handle +
 * title + close + scrim) so individual screens only focus on the form body.
 *
 * Usage:
 *   const ref = useRef<BottomSheetFormRef>(null);
 *   <BottomSheetForm ref={ref} title="Add service">...</BottomSheetForm>
 *   ref.current?.present();
 */
export const BottomSheetForm = forwardRef<BottomSheetFormRef, BottomSheetFormProps>(
  function BottomSheetForm(
    { title, snapPoints = ['50%', '90%'], children, footer, onDismiss, enablePanDownToClose = true },
    ref,
  ) {
    const sheetRef = React.useRef<BottomSheetModal>(null);

    React.useImperativeHandle(ref, () => ({
      present: () => sheetRef.current?.present(),
      dismiss: () => sheetRef.current?.dismiss(),
    }), []);

    const points = useMemo(() => [...snapPoints], [snapPoints]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.45}
          pressBehavior="close"
        />
      ),
      [],
    );

    const handleAnimate = useCallback((_from: number, to: number) => {
      // §6.4 — light snap haptic when the sheet lands on a snap point.
      if (to >= 0) Haptics.selectionAsync().catch(() => undefined);
    }, []);

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={points}
        enablePanDownToClose={enablePanDownToClose}
        onDismiss={onDismiss}
        onAnimate={handleAnimate}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handleIndicator}
        backgroundStyle={styles.background}
      >
        <BottomSheetView style={styles.container}>
          {title && (
            <View style={styles.header}>
              <View style={{ width: 36 }} />
              <AppText style={[typography.header, styles.title]}>{title}</AppText>
              <PressablePremium
                haptic="selection"
                pressScale={0.92}
                onPress={() => sheetRef.current?.dismiss()}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={20} color={colors.slate} />
              </PressablePremium>
            </View>
          )}
          <View style={styles.body}>{children}</View>
          {footer && <View style={styles.footer}>{footer}</View>}
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
  },
  handleIndicator: {
    backgroundColor: colors.hairline,
    width: 36,
    height: 4,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  title: {
    color: colors.ink,
    textAlign: 'center',
    flex: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingTop: 16,
  },
  footer: {
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
});
