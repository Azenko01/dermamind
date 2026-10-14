import { router, useLocalSearchParams } from 'expo-router';
import type { TimeOfDay } from '@dermamind/scoring';
import {
  ArrowSquareOutIcon,
  BookmarkSimpleIcon,
  CaretLeftIcon,
  ShareIcon,
} from 'phosphor-react-native';
import {
  ActivityIndicator,
  Alert,
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
import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { AiParagraph } from '@/features/ai/AiParagraph';
import { useProductSummary } from '@/features/ai/api';
import { useMe } from '@/features/auth/useMe';
import { slotFor, useRoutines, useSetSlot, useToggleShelf } from '@/features/routine/api';
import { shelfCopy, stepCopy, timeCopy } from '@/features/routine/copy';
import { useTheme } from '@/theme';
import { ProductError, useProduct, type ProductDetail } from './api';
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
        <View style={{ flexDirection: 'row' }}>
          <IconButton
            label="Udostępnij"
            onPress={() =>
              void Share.share({
                message: `${product.data.brand ?? ''} ${product.data.name}${
                  product.data.match
                    ? ` — ${product.data.match.score}% dopasowania w DermaMind`
                    : ''
                }`,
              })
            }
          >
            <ShareIcon size={24} color={colors.textPrimary} />
          </IconButton>
          <ShelfButton product={product.data} />
        </View>
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
            <View style={{ gap: spacing.lg }}>
              <MatchCard match={p.match} subtitle={profileLine(me.data?.profile, 'card')} />
              <WhySection productId={p.id} />
            </View>
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

          <ProductActions product={p} />

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

/** "Dodaj do rutyny" + shelf state (PLAN.md 6.3 point 1, 6.5 flow 3). */
function ProductActions({ product }: { product: ProductDetail }) {
  const { spacing } = useTheme();
  const setSlot = useSetSlot();
  const routines = useRoutines();
  const onShelves = product.myShelves.map((k) => shelfCopy[k].label);

  const addTo = (time: TimeOfDay) => {
    const step = slotFor(product.category, time);
    if (!step)
      return Alert.alert(
        'Nie pasuje do rutyny',
        `Ten produkt nie pasuje do żadnego kroku ${timeCopy[time].adverb}.`,
      );
    const current = routines.data?.[time].steps.find((s) => s.step === step)?.product;
    const go = () =>
      setSlot.mutate(
        { time, step, productId: product.id },
        {
          onSuccess: () =>
            Alert.alert('Dodano do rutyny', `${stepCopy[step].label} · ${timeCopy[time].adverb}`, [
              { text: 'OK' },
              { text: 'Zobacz rutynę', onPress: () => router.push('/routine') },
            ]),
          onError: (e) => Alert.alert('Nie udało się', e.message),
        },
      );
    if (current && current.id !== product.id) {
      Alert.alert(
        'Zastąpić produkt?',
        `${timeCopy[time].label}, krok ${stepCopy[step].label}: teraz „${current.name}”.`,
        [
          { text: 'Anuluj', style: 'cancel' },
          { text: 'Zastąp', onPress: go },
        ],
      );
    } else go();
  };

  const chooseTime = () => {
    const am = slotFor(product.category, 'am');
    const pm = slotFor(product.category, 'pm');
    if (am && !pm) return addTo('am');
    if (!am && !pm)
      return Alert.alert(
        'Nie pasuje do rutyny',
        'Ten rodzaj produktu nie ma swojego kroku w rutynie.',
      );
    Alert.alert('Do której rutyny?', undefined, [
      { text: 'Rano', onPress: () => addTo('am') },
      { text: 'Wieczorem', onPress: () => addTo('pm') },
      { text: 'Anuluj', style: 'cancel' },
    ]);
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <PrimaryButton
          title="Dodaj do rutyny"
          onPress={chooseTime}
          loading={setSlot.isPending}
          style={{ flex: 1 }}
        />
        <ShelfButton product={product} wide />
      </View>
      {onShelves.length ? (
        <Text variant="caption" align="center">
          Na półce: {onShelves.join(', ')}
        </Text>
      ) : null}
    </View>
  );
}

/** Mam / Lubię / Unikam toggles (bookmark in the header and next to "Dodaj do rutyny"). */
function ShelfButton({ product, wide }: { product: ProductDetail; wide?: boolean }) {
  const { colors } = useTheme();
  const toggle = useToggleShelf();
  const open = () =>
    Alert.alert('Dodaj na półkę', product.name, [
      ...(['own', 'like', 'avoid'] as const).map((kind) => {
        const on = product.myShelves.includes(kind);
        return {
          text: `${shelfCopy[kind].label}${on ? ' ✓' : ''}`,
          onPress: () =>
            toggle.mutate(
              { kind, productId: product.id, on: !on },
              { onError: (e) => Alert.alert('Nie udało się', e.message) },
            ),
        };
      }),
      { text: 'Anuluj', style: 'cancel' as const },
    ]);
  const saved = product.myShelves.length > 0;
  if (wide)
    return (
      <SecondaryButton
        title={saved ? 'Na półce' : 'Na półkę'}
        onPress={open}
        loading={toggle.isPending}
        style={{ flex: 1 }}
      />
    );
  return (
    <IconButton label={saved ? 'Na półce — zmień' : 'Dodaj na półkę'} onPress={open}>
      <BookmarkSimpleIcon
        size={24}
        color={saved ? colors.primary : colors.textPrimary}
        weight={saved ? 'fill' : 'regular'}
      />
    </IconButton>
  );
}

/** "Dlaczego taki wynik?" — AI explanation of the rule-based score, loaded after the card. */
function WhySection({ productId }: { productId: number }) {
  const { colors, spacing, radius } = useTheme();
  const summary = useProductSummary(productId, true);
  return (
    <View
      style={{
        backgroundColor: colors.backgroundAlt,
        borderRadius: radius.card,
        padding: spacing.xl,
        gap: spacing.md,
      }}
    >
      <Text variant="productName">Dlaczego taki wynik?</Text>
      <AiParagraph query={summary} />
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
