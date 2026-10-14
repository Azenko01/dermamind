import { SlidersHorizontalIcon, SparkleIcon } from 'phosphor-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProductCard, ProductRow } from '@/components/features/ProductCard';
import { LinkButton, SecondaryButton } from '@/components/ui/Button';
import { CategoryCircle } from '@/components/ui/CategoryCircle';
import { SearchBar } from '@/components/ui/SearchBar';
import { Text } from '@/components/ui/Text';
import { useMe } from '@/features/auth/useMe';
import { useTheme } from '@/theme';
import { useDebounced, useProducts, type ProductItem, type ProductsQuery } from './api';
import { CATEGORY_ORDER, categoryCopy, profileLine, type Category } from './copy';

type Sort = NonNullable<ProductsQuery['sort']>;
const SORT_LABELS: Record<Sort, string> = {
  score: 'Najlepiej dopasowane',
  price_asc: 'Cena: od najniższej',
  price_desc: 'Cena: od najwyższej',
  name: 'Nazwa A–Z',
};

/** T2 (mockup 06). */
export function ExploreScreen() {
  const { colors, spacing } = useTheme();
  const me = useMe();
  const [text, setText] = useState('');
  const [category, setCategory] = useState<Category | undefined>();
  const [sort, setSort] = useState<Sort | undefined>();
  const q = useDebounced(text.trim());
  const browsing = !q && !category;

  // One request feeds the whole home view; with a search or category we show a flat list.
  const products = useProducts({ q: q || undefined, category, sort, pageSize: 50 });
  const items = products.data?.items ?? [];
  const hasScores = items.some((i) => i.match);

  const pickSort = () =>
    Alert.alert('Sortuj', undefined, [
      ...(Object.keys(SORT_LABELS) as Sort[])
        .filter((s) => s !== 'score' || hasScores)
        .map((s) => ({
          text: `${SORT_LABELS[s]}${sort === s ? ' ✓' : ''}`,
          onPress: () => setSort(s),
        })),
      { text: 'Anuluj', style: 'cancel' as const },
    ]);

  const header = (
    <View style={{ gap: spacing.xl }}>
      <SearchBar value={text} onChangeText={setText} onScan={() => router.push('/scan')} />
      <View style={[styles.shortcuts, { gap: spacing.xl }]}>
        <LinkButton
          title="Analizuj skład ›"
          color="primary"
          onPress={() => router.push('/analyze')}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm }}
      >
        <CategoryCircle label="Sortuj" icon={SlidersHorizontalIcon} outline onPress={pickSort} />
        <CategoryCircle
          label="Dla Ciebie"
          icon={SparkleIcon}
          highlight={!category}
          onPress={() => {
            setCategory(undefined);
            setSort(undefined);
          }}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        {CATEGORY_ORDER.map((c) => (
          <CategoryCircle
            key={c}
            label={categoryCopy[c].plural}
            icon={categoryCopy[c].icon}
            selected={category === c}
            onPress={() => setCategory(category === c ? undefined : c)}
          />
        ))}
      </ScrollView>
    </View>
  );

  let body: React.ReactNode;
  if (products.isPending)
    body = <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />;
  else if (products.isError)
    body = (
      <View style={{ gap: spacing.md }}>
        <Text>Nie udało się wczytać produktów.</Text>
        <SecondaryButton title="Spróbuj ponownie" onPress={() => void products.refetch()} />
      </View>
    );
  else if (items.length === 0)
    body = <Text color="textSecondary">Nic nie znaleźliśmy. Spróbuj innej nazwy albo marki.</Text>;
  else if (browsing)
    body = (
      <BrowseSections
        items={items}
        subtitle={profileLine(me.data?.profile, 'list')}
        onCategory={setCategory}
        scored={hasScores}
      />
    );
  else
    body = (
      <View style={{ gap: spacing.lg }}>
        <Text variant="section">
          {category ? categoryCopy[category].plural : 'Wyniki'}{' '}
          <Text variant="section" color="textSecondary">
            {products.data.total}
          </Text>
        </Text>
        {items.map((i) => (
          <ProductRow key={i.id} item={i} />
        ))}
      </View>
    );

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: spacing.screen,
          gap: spacing.xxl,
          paddingBottom: spacing.xxl * 2,
        }}
      >
        {header}
        {body}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Home view: best matches carousel + a few products per category. */
function BrowseSections({
  items,
  subtitle,
  onCategory,
  scored,
}: {
  items: ProductItem[];
  subtitle?: string;
  onCategory: (c: Category) => void;
  scored: boolean;
}) {
  const { spacing } = useTheme();
  const top = items.filter((i) => i.match?.status !== 'excluded').slice(0, 10);
  return (
    <View style={{ gap: spacing.xxl }}>
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <Text variant="section">{scored ? 'Dopasowane do Twojej skóry' : 'Produkty'}</Text>
          {scored && subtitle ? <Text variant="caption">{subtitle}</Text> : null}
        </View>
        <FlatList
          horizontal
          data={top}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <ProductCard item={item} />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.md }}
          style={{ marginHorizontal: -spacing.screen }}
          ListHeaderComponent={<View style={{ width: spacing.screen - spacing.md }} />}
          ListFooterComponent={<View style={{ width: spacing.screen - spacing.md }} />}
        />
      </View>
      {CATEGORY_ORDER.map((c) => {
        const inCategory = items.filter((i) => i.category === c);
        if (!inCategory.length) return null;
        return (
          <View key={c} style={{ gap: spacing.lg }}>
            <View style={styles.sectionHead}>
              <Text variant="section">{categoryCopy[c].plural}</Text>
              {inCategory.length > 3 ? (
                <LinkButton
                  title={`Wszystkie ${inCategory.length}`}
                  color="accent"
                  onPress={() => onCategory(c)}
                />
              ) : null}
            </View>
            {inCategory.slice(0, 3).map((i) => (
              <ProductRow key={i.id} item={i} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  divider: { width: 1, height: 56, alignSelf: 'center', marginHorizontal: 4, marginBottom: 24 },
  shortcuts: { flexDirection: 'row' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
