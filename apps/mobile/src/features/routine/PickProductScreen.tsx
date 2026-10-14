import { STEP_CATEGORIES, type RoutineStep, type TimeOfDay } from '@dermamind/scoring';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProductRow } from '@/components/features/ProductCard';
import { LinkButton } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useProducts, type ProductItem } from '@/features/catalog/api';
import { useTheme } from '@/theme';
import { useSetSlot, useShelves } from './api';
import { stepCopy, timeCopy } from './copy';

/**
 * Pick a product for one slot (PLAN.md 6.5 flow 3): first what's on "Mam", then the best matches
 * of the fitting categories. The catalogue is small, so one sorted request is filtered here.
 */
export function PickProductScreen() {
  const params = useLocalSearchParams<{ time: TimeOfDay; step: RoutineStep }>();
  const time: TimeOfDay = params.time === 'pm' ? 'pm' : 'am';
  const step = (Object.keys(STEP_CATEGORIES) as RoutineStep[]).includes(params.step)
    ? params.step
    : 'cleanse';
  const categories = STEP_CATEGORIES[step];
  const { colors, spacing } = useTheme();
  const shelves = useShelves();
  const products = useProducts({ pageSize: 50 });
  const setSlot = useSetSlot();

  const fits = (p: ProductItem) => categories.includes(p.category);
  const own = (shelves.data?.shelves.find((s) => s.kind === 'own')?.items ?? [])
    .map((i) => i.product)
    .filter(fits);
  const ownIds = new Set(own.map((p) => p.id));
  const best = (products.data?.items ?? []).filter((p) => fits(p) && !ownIds.has(p.id));

  const choose = (p: ProductItem) =>
    setSlot.mutate(
      { time, step, productId: p.id },
      { onSuccess: () => router.back(), onError: (e) => Alert.alert('Nie udało się', e.message) },
    );

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.screen,
          gap: spacing.lg,
          paddingBottom: spacing.xxl * 2,
        }}
      >
        <LinkButton title="Zamknij" color="textSecondary" onPress={() => router.back()} />
        <Text variant="title" accessibilityRole="header">
          {stepCopy[step].label} · {timeCopy[time].adverb}
        </Text>
        <Text color="textSecondary">{stepCopy[step].hint}. Wybierz produkt do tego kroku.</Text>
        {setSlot.isPending ? <ActivityIndicator color={colors.primary} /> : null}

        {own.length ? <Section title="Z Twojej półki „Mam”" items={own} onChoose={choose} /> : null}
        {products.isPending ? (
          <ActivityIndicator color={colors.primary} />
        ) : best.length ? (
          <Section title="Najlepiej dopasowane" items={best} onChoose={choose} />
        ) : (
          <Text color="textSecondary">Nie mamy jeszcze w bazie produktów do tego kroku.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  items,
  onChoose,
}: {
  title: string;
  items: ProductItem[];
  onChoose: (p: ProductItem) => void;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.md, marginTop: spacing.md }}>
      <Text variant="label" color="textSecondary">
        {title}
      </Text>
      {items.map((p) => (
        <PickRow key={p.id} item={p} onChoose={onChoose} />
      ))}
    </View>
  );
}

function PickRow({ item, onChoose }: { item: ProductItem; onChoose: (p: ProductItem) => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Wybierz ${item.name}`}
      onPress={() => onChoose(item)}
    >
      <View pointerEvents="none">
        <ProductRow item={item} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
