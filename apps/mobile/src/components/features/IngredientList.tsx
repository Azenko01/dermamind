import { DropIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import type { ProductDetail } from '@/features/catalog/api';
import { functionCopy } from '@/features/catalog/copy';
import { useTheme, type ColorToken } from '@/theme';

type Ingredient = ProductDetail['ingredients'][number];
type Rating = NonNullable<Ingredient['rating']> | 'none';

const RATING_COLOR: Record<Rating, ColorToken> = {
  good: 'good',
  caution: 'caution',
  bad: 'bad',
  neutral: 'border',
  none: 'border',
};
const ORDER: Rating[] = ['good', 'caution', 'bad', 'neutral'];

/** Proportion bar green / orange / red / grey (PLAN.md 6.3 point 7). */
export function IngredientBar({ ingredients }: { ingredients: Ingredient[] }) {
  const { colors } = useTheme();
  const counts = ORDER.map((r) => ({
    r,
    n: ingredients.filter((i) => (i.rating ?? 'neutral') === r).length,
  })).filter((c) => c.n > 0);
  return (
    <View
      style={styles.bar}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {counts.map((c) => (
        <View
          key={c.r}
          style={{
            flex: c.n,
            backgroundColor: colors[RATING_COLOR[c.r]],
            height: 10,
            borderRadius: 5,
          }}
        />
      ))}
    </View>
  );
}

function IngredientRow({ ingredient: i, last }: { ingredient: Ingredient; last: boolean }) {
  const { colors, spacing } = useTheme();
  const rating: Rating = i.rating ?? 'none';
  const color =
    rating === 'neutral' || rating === 'none' ? colors.textSecondary : colors[RATING_COLOR[rating]];
  const fn = i.functions
    .slice(0, 2)
    .map((f) => functionCopy[f] ?? f)
    .join(', ');
  const badges = [
    i.isFungalAcneTrigger ? 'trądzik grzybiczy' : null,
    i.comedogenic !== null && i.comedogenic >= 3 ? `komedogenność ${i.comedogenic}/5` : null,
    i.isEuAllergen ? 'alergen UE' : null,
    i.isFragrance ? 'zapach' : null,
  ].filter(Boolean);
  return (
    <View
      style={[
        styles.row,
        {
          gap: spacing.lg,
          paddingVertical: spacing.md,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <DropIcon
        size={24}
        color={color}
        weight={rating === 'none' || rating === 'neutral' ? 'regular' : 'fill'}
      />
      <View style={{ flex: 1 }}>
        <Text>{i.displayName}</Text>
        {fn ? <Text variant="caption">{fn}</Text> : null}
        {badges.length ? (
          <Text variant="caption" color="caution">
            {badges.join(' · ')}
          </Text>
        ) : null}
      </View>
      <Text variant="caption">{i.position}.</Text>
    </View>
  );
}

const SHOWN = 5;

/** Ingredient list with the proportion bar; first 5 + "Pokaż wszystkie". */
export function IngredientList({
  ingredients,
  complete,
}: {
  ingredients: Ingredient[];
  complete: boolean;
}) {
  const { spacing } = useTheme();
  const [all, setAll] = useState(false);
  const visible = all ? ingredients : ingredients.slice(0, SHOWN);
  return (
    <View style={{ gap: spacing.md }}>
      <IngredientBar ingredients={ingredients} />
      {!complete ? (
        <Text variant="caption">
          Znamy tylko kluczowe składniki tego produktu. Numer to ich miejsce w pełnym składzie.
        </Text>
      ) : null}
      <View>
        {visible.map((i, idx) => (
          <IngredientRow key={i.id} ingredient={i} last={idx === visible.length - 1} />
        ))}
      </View>
      {ingredients.length > SHOWN && !all ? (
        <Pressable accessibilityRole="button" onPress={() => setAll(true)} hitSlop={8}>
          <Text variant="bodyStrong" color="accent">
            Pokaż wszystkie {ingredients.length}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
