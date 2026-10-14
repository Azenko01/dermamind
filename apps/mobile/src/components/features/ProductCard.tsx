import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { MatchPill } from '@/components/ui/MatchPill';
import { Text } from '@/components/ui/Text';
import type { ProductItem } from '@/features/catalog/api';
import { categoryCopy, priceLevel } from '@/features/catalog/copy';
import { useTheme } from '@/theme';

const open = (id: number) => router.push({ pathname: '/product/[id]', params: { id: String(id) } });

/** Placeholder until product photos are imported — the category pictogram on the grey surface. */
export function ProductImage({
  item,
  size,
}: {
  item: Pick<ProductItem, 'category'>;
  size: number;
}) {
  const { colors } = useTheme();
  const Icon = categoryCopy[item.category].icon;
  return <Icon size={size} color={colors.textSecondary} weight="light" />;
}

/** Carousel card (mockup 06): photo on surface, match pill top-left, brand + name below. */
export function ProductCard({ item, width = 220 }: { item: ProductItem; width?: number }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.brand ?? ''} ${item.name}${item.match ? `, ${item.match.score}% dopasowania` : ''}`}
      onPress={() => open(item.id)}
      style={({ pressed }) => [
        styles.card,
        {
          width,
          borderColor: colors.border,
          borderRadius: radius.productCard,
          padding: spacing.md,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.image, { backgroundColor: colors.surface, borderRadius: radius.card }]}>
        <ProductImage item={item} size={72} />
        {item.match ? (
          <View style={styles.pill}>
            <MatchPill
              score={item.match.score}
              excluded={item.match.status === 'excluded'}
              suffix=" dopasowania"
            />
          </View>
        ) : null}
      </View>
      <View style={{ marginTop: spacing.md, paddingHorizontal: spacing.xs }}>
        <Text variant="caption">{item.brand}</Text>
        <Text variant="productName" numberOfLines={2}>
          {item.name}
        </Text>
      </View>
    </Pressable>
  );
}

/** List row (mockup 06 "Oczyszczanie"): thumbnail, "Marka · zł zł", name, pill on the right. */
export function ProductRow({ item }: { item: ProductItem }) {
  const { colors, spacing } = useTheme();
  const level = priceLevel(item.pricePln);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.brand ?? ''} ${item.name}${item.match ? `, ${item.match.score}% dopasowania` : ''}`}
      onPress={() => open(item.id)}
      style={({ pressed }) => [styles.row, { gap: spacing.lg, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.thumb, { backgroundColor: colors.surface }]}>
        <ProductImage item={item} size={30} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="caption" numberOfLines={1}>
          {item.brand}
          {level ? ` · ${'zł '.repeat(level).trim()}` : ''}
        </Text>
        <Text variant="productName" numberOfLines={2} style={{ fontSize: 17 }}>
          {item.name}
        </Text>
      </View>
      {item.match ? (
        <MatchPill score={item.match.score} excluded={item.match.status === 'excluded'} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  image: { height: 190, alignItems: 'center', justifyContent: 'center' },
  pill: { position: 'absolute', top: 12, left: 12, right: 12 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 72 },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
