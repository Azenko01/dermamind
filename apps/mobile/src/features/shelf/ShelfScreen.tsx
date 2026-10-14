import { router } from 'expo-router';
import { StarIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProductRow } from '@/components/features/ProductCard';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useShelves, useToggleShelf, type ShelfKind } from '@/features/routine/api';
import { shelfCopy } from '@/features/routine/copy';
import { useTheme } from '@/theme';

/** T4 "Półka" (PLAN.md 6.2): Mam, Lubię, Unikam. */
export function ShelfScreen() {
  const { colors, spacing } = useTheme();
  const shelves = useShelves();
  const toggle = useToggleShelf();
  const [kind, setKind] = useState<ShelfKind>('own');
  const items = shelves.data?.shelves.find((s) => s.kind === kind)?.items ?? [];

  const remove = (productId: number, name: string) =>
    Alert.alert(name, undefined, [
      {
        text: `Usuń z „${shelfCopy[kind].label}”`,
        style: 'destructive',
        onPress: () =>
          toggle.mutate(
            { kind, productId, on: false },
            { onError: (e) => Alert.alert('Nie udało się', e.message) },
          ),
      },
      { text: 'Anuluj', style: 'cancel' },
    ]);

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.screen,
          gap: spacing.xl,
          paddingBottom: spacing.xxl * 2,
        }}
      >
        <Text
          variant="title"
          accessibilityRole="header"
          style={{ fontFamily: 'Inter_600SemiBold' }}
        >
          Półka
        </Text>
        <View
          style={[styles.tabs, { backgroundColor: colors.surface }]}
          accessibilityRole="tablist"
        >
          {(['own', 'like', 'avoid'] as const).map((k) => {
            const count = shelves.data?.shelves.find((s) => s.kind === k)?.items.length ?? 0;
            const selected = k === kind;
            return (
              <Pressable
                key={k}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setKind(k)}
                style={[
                  styles.tab,
                  { backgroundColor: selected ? colors.background : 'transparent' },
                ]}
              >
                <Text variant="bodyStrong" color={selected ? 'textPrimary' : 'textSecondary'}>
                  {shelfCopy[k].label}
                  {count ? ` ${count}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {shelves.isPending ? (
          <ActivityIndicator color={colors.primary} />
        ) : shelves.isError ? (
          <View style={{ gap: spacing.md }}>
            <Text>Nie udało się wczytać półki.</Text>
            <SecondaryButton title="Spróbuj ponownie" onPress={() => void shelves.refetch()} />
          </View>
        ) : items.length === 0 ? (
          <View style={[styles.empty, { gap: spacing.lg, marginTop: spacing.xxl }]}>
            <View style={styles.stars}>
              <StarIcon size={28} color={colors.accent} weight="fill" />
              <StarIcon size={44} color={colors.primary} weight="fill" />
              <StarIcon size={28} color={colors.accent} weight="fill" />
            </View>
            <Text variant="productName" align="center">
              Pusto na półce „{shelfCopy[kind].label}”
            </Text>
            <Text align="center" color="textSecondary">
              {shelfCopy[kind].empty} Produkt dodasz z jego karty.
            </Text>
            <PrimaryButton title="Odkrywaj produkty" onPress={() => router.push('/explore')} />
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            {items.map((i) => (
              <Pressable
                key={i.product.id}
                onLongPress={() => remove(i.product.id, i.product.name)}
                delayLongPress={350}
              >
                <ProductRow item={i.product} />
              </Pressable>
            ))}
            <Text variant="caption" align="center">
              Przytrzymaj produkt, żeby go usunąć z półki.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabs: { flexDirection: 'row', borderRadius: 999, padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 999 },
  empty: { alignItems: 'center' },
  stars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
});
