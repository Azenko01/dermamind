import { PRODUCT_FLAGS } from '@dermamind/scoring';
import { CheckIcon, QuestionIcon, XIcon } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import type { ProductDetail } from '@/features/catalog/api';
import { flagCopy } from '@/features/catalog/copy';
import { useTheme } from '@/theme';

/** "Co jest w środku" — two columns of ✓ / × / ? (PLAN.md 6.3 point 6). */
export function FlagGrid({ flags }: { flags: ProductDetail['flags'] }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.grid, { rowGap: spacing.lg }]}>
      {PRODUCT_FLAGS.map((flag) => {
        const value = flags[flag];
        const state = value === true ? 'yes' : value === false ? 'no' : 'unknown';
        const bg = state === 'yes' ? colors.good : state === 'no' ? colors.bad : colors.surface;
        const label = flagCopy[flag];
        return (
          <View
            key={flag}
            style={[styles.item, { gap: spacing.md }]}
            accessible
            accessibilityLabel={`${label}: ${state === 'yes' ? 'tak' : state === 'no' ? 'nie' : 'brak danych'}`}
          >
            <View style={[styles.icon, { backgroundColor: bg }]}>
              {state === 'yes' ? (
                <CheckIcon size={18} weight="bold" color={colors.background} />
              ) : null}
              {state === 'no' ? <XIcon size={18} weight="bold" color={colors.background} /> : null}
              {state === 'unknown' ? (
                <QuestionIcon size={18} weight="bold" color={colors.textSecondary} />
              ) : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text color={state === 'unknown' ? 'textSecondary' : 'textPrimary'}>{label}</Text>
              {state === 'unknown' ? <Text variant="caption">brak danych</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  item: { width: '50%', flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  icon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
