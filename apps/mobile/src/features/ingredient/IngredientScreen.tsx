import type { components } from '@dermamind/api-client';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CaretLeftIcon } from 'phosphor-react-native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProductRow } from '@/components/features/ProductCard';
import { SecondaryButton } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { concernCopy, conReasonCopy, functionCopy, groupCopy } from '@/features/catalog/copy';
import { AiParagraph } from '@/features/ai/AiParagraph';
import { useIngredientExplain } from '@/features/ai/api';
import { api } from '@/lib/api';
import { useTheme, type ColorToken } from '@/theme';

type Ingredient = components['schemas']['IngredientDetailDto'];

const FLAG_COPY: Record<keyof Ingredient['flags'], string> = {
  isFragrance: 'Zapach',
  isEuAllergen: 'Alergen zapachowy UE',
  isFungalAcneTrigger: 'Może nasilać trądzik grzybiczy',
  isAlcoholDrying: 'Wysuszający alkohol',
  isParaben: 'Paraben',
  isSulfate: 'Siarczan',
  isSilicone: 'Silikon',
  isOil: 'Olej',
  isAnimalDerived: 'Pochodzenia zwierzęcego',
  isReefHarmful: 'Może szkodzić rafom',
};

function useIngredient(id: number) {
  return useQuery({
    queryKey: ['ingredient', id],
    enabled: Number.isInteger(id) && id > 0,
    queryFn: async () => {
      const res = await api.GET('/v1/ingredients/{id}', { params: { path: { id } } });
      if (!res.data) throw new Error(`GET /v1/ingredients/${id} failed: ${res.response.status}`);
      return res.data;
    },
  });
}

/** D2 ingredient card (PLAN.md 6.4): functions, flags, what it means for my skin. AI text later. */
export function IngredientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useIngredient(Number(id));
  const { colors, spacing, sizes } = useTheme();

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.background }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Wstecz"
        onPress={() => router.back()}
        style={{
          width: sizes.minTouchTarget,
          height: sizes.minTouchTarget,
          justifyContent: 'center',
          marginLeft: spacing.md,
        }}
      >
        <CaretLeftIcon size={26} color={colors.textPrimary} />
      </Pressable>
      {q.isPending ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : q.isError ? (
        <View style={{ padding: spacing.screen, gap: spacing.md }}>
          <Text>Nie udało się wczytać składnika.</Text>
          <SecondaryButton title="Spróbuj ponownie" onPress={() => void q.refetch()} />
        </View>
      ) : (
        <IngredientBody i={q.data} />
      )}
    </SafeAreaView>
  );
}

function IngredientBody({ i }: { i: Ingredient }) {
  const { colors, spacing } = useTheme();
  const flags = (Object.keys(FLAG_COPY) as (keyof Ingredient['flags'])[]).filter((f) => i.flags[f]);
  const facts = [
    ...flags.map((f) => FLAG_COPY[f]),
    i.comedogenic !== null ? `Komedogenność ${i.comedogenic}/5` : null,
    i.irritationRisk !== null && i.irritationRisk > 0
      ? `Ryzyko podrażnień ${i.irritationRisk}/3`
      : null,
  ].filter((x): x is string => Boolean(x));

  return (
    <ScrollView
      contentContainerStyle={{
        padding: spacing.screen,
        paddingTop: 0,
        gap: spacing.xxl,
        paddingBottom: spacing.xxl * 2,
      }}
    >
      <View style={{ gap: spacing.sm }}>
        <Text variant="title" accessibilityRole="header">
          {i.displayName}
        </Text>
        {i.inciName.toLowerCase() !== i.displayName.toLowerCase() ? (
          <Text variant="caption">INCI: {i.inciName}</Text>
        ) : null}
        {i.functions.length ? (
          <View style={[styles.chips, { gap: spacing.sm, marginTop: spacing.sm }]}>
            {i.functions.map((f) => (
              <View key={f} style={[styles.chip, { backgroundColor: colors.accentSoft }]}>
                <Text variant="caption" color="primary">
                  {functionCopy[f] ?? f}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <AboutSection id={i.id} />

      <ForYouCard i={i} />

      <View style={{ gap: spacing.md }}>
        <Text variant="section">Cechy</Text>
        {facts.length ? (
          facts.map((f) => (
            <View key={f} style={[styles.fact, { gap: spacing.md }]}>
              <View style={[styles.dot, { backgroundColor: colors.caution }]} />
              <Text>{f}</Text>
            </View>
          ))
        ) : (
          <Text color="textSecondary">Brak szczególnych cech w naszych danych.</Text>
        )}
      </View>

      {i.products.length ? (
        <View style={{ gap: spacing.lg }}>
          <Text variant="section">Produkty z tym składnikiem</Text>
          {i.products.map((p) => (
            <ProductRow key={p.id} item={p} />
          ))}
        </View>
      ) : null}

      <Text variant="caption">
        Funkcje i cechy pochodzą ze słownika DermaMind (funkcje wg bazy CosIng Komisji
        Europejskiej).
      </Text>
    </ScrollView>
  );
}

function AboutSection({ id }: { id: number }) {
  const { spacing } = useTheme();
  const explain = useIngredientExplain(id);
  return (
    <View style={{ gap: spacing.md }}>
      <Text variant="section">Co to jest</Text>
      <AiParagraph query={explain} />
    </View>
  );
}

function ForYouCard({ i }: { i: Ingredient }) {
  const { colors, spacing, radius } = useTheme();
  const f = i.forYou;
  const lines: { color: ColorToken; text: string }[] = [];
  if (f?.avoided) {
    lines.push({
      color: 'bad',
      text: f.avoidedGroup
        ? `Unikasz go — należy do grupy: ${groupCopy[f.avoidedGroup] ?? f.avoidedGroup}`
        : 'Jest na Twojej liście unikanych',
    });
  }
  if (f?.helps.length)
    lines.push({
      color: 'good',
      text: `Pomaga na: ${f.helps.map((c) => concernCopy[c] ?? c).join(', ')}`,
    });
  if (f?.hurts.length)
    lines.push({
      color: 'bad',
      text: `Może nasilać: ${f.hurts.map((c) => concernCopy[c] ?? c).join(', ')}`,
    });
  for (const c of f?.cautions ?? [])
    lines.push({ color: 'caution', text: capitalize(conReasonCopy[c] ?? c) });

  return (
    <View
      style={{
        backgroundColor: colors.backgroundAlt,
        borderRadius: radius.card,
        padding: spacing.xl,
        gap: spacing.md,
      }}
    >
      <Text variant="productName">Dla Twojej skóry</Text>
      {!f ? (
        <Text color="textSecondary">
          Wypełnij quiz, a pokażemy, jak ten składnik pasuje do Twojej skóry.
        </Text>
      ) : lines.length === 0 ? (
        <Text color="textSecondary">
          Nie ma wyraźnego wpływu na Twoje potrzeby według naszych danych.
        </Text>
      ) : (
        lines.map((l) => (
          <View key={l.text} style={[styles.fact, { gap: spacing.md }]}>
            <View style={[styles.dot, { backgroundColor: colors[l.color] }]} />
            <Text style={{ flex: 1 }}>{l.text}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const styles = StyleSheet.create({
  root: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  fact: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
