import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';
import { useTheme } from '@/theme';

/** Sticky bottom area above a thin line, for the main action (PLAN.md 7.3). */
export function BottomBar({ children }: { children: ReactNode }) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        {
          borderTopColor: colors.border,
          backgroundColor: colors.background,
          paddingHorizontal: spacing.screen,
          paddingTop: spacing.lg,
          paddingBottom: Math.max(insets.bottom, spacing.lg),
          gap: spacing.md,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth },
});
