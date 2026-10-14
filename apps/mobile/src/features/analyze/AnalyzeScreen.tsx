import type { components } from '@dermamind/api-client';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlagGrid } from '@/components/features/FlagGrid';
import { IngredientList } from '@/components/features/IngredientList';
import { MatchCard } from '@/components/features/MatchCard';
import { LinkButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useMe } from '@/features/auth/useMe';
import { profileLine } from '@/features/catalog/copy';
import { api, errorText } from '@/lib/api';
import { useTheme } from '@/theme';

type Result = components['schemas']['AnalyzeResultDto'];

/** D3: paste an ingredient list → the same layout as the product card from point 3 (PLAN.md 6.4). */
export function AnalyzeScreen() {
  const { ean } = useLocalSearchParams<{ ean?: string }>();
  const { colors, spacing } = useTheme();
  const me = useMe();
  const [text, setText] = useState('');

  const analyze = useMutation({
    mutationFn: async (inci: string): Promise<Result> => {
      const res = await api.POST('/v1/analyze/inci', { body: { inci } });
      if (!res.data) {
        throw new Error(
          errorText(res.response.status, {
            400: 'Nie znaleźliśmy tu składników. Wklej listę po przecinku.',
          }),
        );
      }
      return res.data;
    },
  });
  const result = analyze.data;
  const known = result?.ingredients.flatMap((i) => (i.ingredient ? [i.ingredient] : [])) ?? [];

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: spacing.screen,
            gap: spacing.xl,
            paddingBottom: spacing.xxl * 2,
          }}
        >
          <LinkButton title="Zamknij" color="textSecondary" onPress={() => router.back()} />
          <View style={{ gap: spacing.sm }}>
            <Text variant="title" accessibilityRole="header">
              Analizuj skład
            </Text>
            <Text color="textSecondary">
              Wklej skład INCI z opakowania albo ze strony sklepu. Ocenimy go tak samo jak produkty
              z bazy.
            </Text>
          </View>
          <TextField
            label="Skład (INCI)"
            placeholder="Aqua, Glycerin, Niacinamide…"
            value={text}
            onChangeText={setText}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={10_000}
            style={{ height: 160, paddingTop: spacing.md, textAlignVertical: 'top' }}
          />
          <PrimaryButton
            title="Analizuj"
            onPress={() => analyze.mutate(text)}
            disabled={text.trim().length < 2}
            loading={analyze.isPending}
          />
          {analyze.isError ? <Text color="bad">{analyze.error.message}</Text> : null}

          {result ? (
            <View style={{ gap: spacing.xxl }}>
              {result.match ? (
                <MatchCard match={result.match} subtitle={profileLine(me.data?.profile, 'card')} />
              ) : (
                <View
                  style={[styles.note, { backgroundColor: colors.accentSoft, padding: spacing.xl }]}
                >
                  <Text color="primary">
                    Wypełnij quiz, a policzymy dopasowanie do Twojej skóry.
                  </Text>
                </View>
              )}

              {result.unknown.length ? (
                <View
                  style={[
                    styles.note,
                    { backgroundColor: colors.surface, padding: spacing.xl, gap: spacing.sm },
                  ]}
                >
                  <Text variant="bodyStrong">
                    Nie rozpoznaliśmy {result.unknown.length} z {result.ingredients.length}
                  </Text>
                  <Text variant="caption">{result.unknown.join(', ')}</Text>
                  <Text variant="caption">
                    Sprawdź pisownię albo zgłoś produkt — uzupełnimy słownik składników.
                  </Text>
                </View>
              ) : null}

              <View style={{ gap: spacing.lg }}>
                <Text variant="section">Co jest w środku</Text>
                <FlagGrid flags={result.flags} />
              </View>

              {known.length ? (
                <View style={{ gap: spacing.lg }}>
                  <Text variant="section">Lista składników</Text>
                  <IngredientList ingredients={known} complete />
                </View>
              ) : null}

              <SecondaryButton
                title="Zgłoś ten produkt"
                onPress={() =>
                  router.push({
                    pathname: '/submit',
                    params: { inci: text.trim(), ...(ean ? { ean } : {}) },
                  })
                }
              />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  note: { borderRadius: 20 },
});
