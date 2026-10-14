import { router, useLocalSearchParams } from 'expo-router';
import { ArrowSquareOutIcon, CaretLeftIcon, ShareIcon } from 'phosphor-react-native';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlagGrid } from '@/components/features/FlagGrid';
import { IngredientList } from '@/components/features/IngredientList';
import { MatchCard } from '@/components/features/MatchCard';
import { ProductImage } from '@/components/features/ProductCard';
import { SecondaryButton } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useMe } from '@/features/auth/useMe';
import { useTheme } from '@/theme';
import { ProductError, useProduct } from './api';
import { categoryCopy, priceLevel, profileLine } from './copy';

/** D1 (mockup 07), without the AI text yet (Sprint 4). */
export function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = useProduct(Number(id));
  const me = useMe();
  const { colors, spacing, sizes } = useTheme();
  const insets = useSafeAreaInsets();

  const bar = (
    <View style={[styles.bar, { top: insets.top, paddingHorizontal: spacing.md }]}>
      <IconButton
        label="Wstecz"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/explore'))}
      >
        <CaretLeftIcon size={26} color={colors.textPrimary} />
      </IconButton>
      {product.data ? (
        <IconButton
          label="Udostępnij"
          onPress={() =>
            void Share.share({
              message: `${product.data.brand ?? ''} ${product.data.name}${
                product.data.match ? ` — ${product.data.match.score}% dopasowania w DermaMind` : ''
              }`,
            })
          }
        >
          <ShareIcon size={24} color={colors.textPrimary} />
        </IconButton>
      ) : null}
    </View>
  );

  if (product.isPending || product.isError) {
    const notFound = product.error instanceof ProductError && product.error.status === 404;
    return (
      <View
        style={[
          styles.root,
          styles.center,
          { backgroundColor: colors.background, padding: spacing.screen, gap: spacing.lg },
        ]}
      >
        {bar}
        {product.isPending ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Text align="center">
              {notFound ? 'Nie ma takiego produktu.' : 'Nie udało się wczytać produktu.'}
            </Text>
            {notFound ? null : (
              <SecondaryButton title="Spróbuj ponownie" onPress={() => void product.refetch()} />
            )}
          </>
        )}
      </View>
    );
  }

  const p = product.data;
  const level = priceLevel(p.pricePln);
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}>
        <View
          style={[
            styles.image,
            { backgroundColor: colors.surface, paddingTop: insets.top + sizes.minTouchTarget },
          ]}
        >
          <ProductImage item={p} size={120} />
        </View>

        <View style={{ padding: spacing.screen, gap: spacing.xxl }}>
          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <Text variant="caption" color="textPrimary">
              <Text
                variant="caption"
                color="textPrimary"
                style={{ fontFamily: 'Inter_600SemiBold' }}
              >
                {p.brand}
              </Text>
              {'  |  '}
              {categoryCopy[p.category].singular}
            </Text>
            <Text variant="title" align="center" style={{ fontFamily: 'Inter_600SemiBold' }}>
              {p.name}
            </Text>
            {level ? (
              <Text accessibilityLabel={`Poziom ceny ${level} z 4, ${p.pricePln} zł`}>
                <Text variant="bodyStrong">{'zł '.repeat(level)}</Text>
                <Text color="border">{'zł '.repeat(4 - level)}</Text>
              </Text>
            ) : null}
          </View>

          {p.match ? (
            <MatchCard match={p.match} subtitle={profileLine(me.data?.profile, 'card')} />
          ) : (
            <View
              style={[styles.noMatch, { backgroundColor: colors.accentSoft, padding: spacing.xl }]}
            >
              <Text variant="bodyStrong" color="primary">
                Bez profilu skóry nie policzymy dopasowania
              </Text>
              <Text color="primary">Wypełnij quiz, a każdy produkt dostanie Match Score.</Text>
            </View>
          )}

          <View style={{ gap: spacing.lg }}>
            <Text variant="section">Co jest w środku</Text>
            <FlagGrid flags={p.flags} />
          </View>

          <View style={{ gap: spacing.lg }}>
            <View style={styles.row}>
              <Text variant="section">Lista składników</Text>
              <Text variant="caption">
                {ingredientsLabel(p.ingredients.length, p.inciComplete)}
              </Text>
            </View>
            <IngredientList ingredients={p.ingredients} complete={p.inciComplete} />
          </View>

          {p.sourceUrl ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => void Linking.openURL(p.sourceUrl!)}
              style={[styles.row, { justifyContent: 'flex-start', gap: spacing.sm }]}
            >
              <ArrowSquareOutIcon size={20} color={colors.accent} />
              <Text color="accent">Zobacz w sklepie Hebe</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
      {bar}
    </View>
  );
}

function ingredientsLabel(n: number, complete: boolean): string {
  const word =
    n === 1
      ? 'składnik'
      : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)
        ? 'składniki'
        : 'składników';
  return `${complete ? '' : 'znane: '}${n} ${word}`;
}

function IconButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const { sizes } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={{
        width: sizes.minTouchTarget,
        height: sizes.minTouchTarget,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  image: { height: 300, alignItems: 'center', justifyContent: 'center' },
  noMatch: { borderRadius: 24, gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
