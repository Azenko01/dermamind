import type { RoutineStep } from '@dermamind/scoring';
import { CheckIcon, PlusIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { MatchPill } from '@/components/ui/MatchPill';
import { Text } from '@/components/ui/Text';
import type { ProductItem } from '@/features/catalog/api';
import { categoryCopy } from '@/features/catalog/copy';
import { stepCopy } from '@/features/routine/copy';
import { useTheme } from '@/theme';
import { ProductImage } from './ProductCard';

interface Props {
  position: number;
  step: RoutineStep;
  product: ProductItem | null;
  onPress: () => void;
  onLongPress?: () => void;
  /** T1: a checkbox to tick the step off instead of the score pill */
  done?: boolean;
  onToggleDone?: () => void;
}

/** Numbered routine slot (mockup 08): a product card, or a dashed "Dodaj produkt" placeholder. */
export function RoutineSlotRow({
  position,
  step,
  product,
  onPress,
  onLongPress,
  done,
  onToggleDone,
}: Props) {
  const { colors, spacing, radius } = useTheme();
  const copy = stepCopy[step];

  if (!product) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Krok ${position}: ${copy.label}. Dodaj produkt`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          {
            borderRadius: radius.card,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: colors.primaryDisabled,
            padding: spacing.lg,
            gap: spacing.lg,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Number n={position} />
        <View style={[styles.thumb, { backgroundColor: colors.accentSoft }]}>
          <PlusIcon size={26} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="caption">
            {copy.label} · {copy.hint}
          </Text>
          <Text variant="bodyStrong" color="primary">
            Dodaj produkt
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Krok ${position}: ${copy.label}, ${product.brand ?? ''} ${product.name}`}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.background,
          borderRadius: radius.card,
          padding: spacing.lg,
          gap: spacing.lg,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Number n={position} />
      <View style={[styles.thumb, { backgroundColor: colors.surface }]}>
        <ProductImage item={product} size={28} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="caption" numberOfLines={1}>
          {categoryCopy[product.category].singular}
          {product.brand ? ` · ${product.brand}` : ''}
        </Text>
        <Text
          variant="productName"
          numberOfLines={2}
          style={[
            { fontSize: 17 },
            done ? { textDecorationLine: 'line-through', color: colors.textSecondary } : null,
          ]}
        >
          {product.name}
        </Text>
      </View>
      {onToggleDone ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={`Zrobione: ${copy.label}`}
          hitSlop={10}
          onPress={onToggleDone}
          style={[
            styles.check,
            {
              borderColor: done ? colors.primary : colors.textSecondary,
              backgroundColor: done ? colors.primary : 'transparent',
            },
          ]}
        >
          {done ? <CheckIcon size={20} weight="bold" color={colors.background} /> : null}
        </Pressable>
      ) : product.match ? (
        <MatchPill score={product.match.score} excluded={product.match.status === 'excluded'} />
      ) : null}
    </Pressable>
  );
}

function Number({ n }: { n: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.number, { backgroundColor: colors.surface }]}>
      <Text variant="bodyStrong">{n}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  number: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 30,
    height: 30,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
