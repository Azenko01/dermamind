import type { components } from '@dermamind/api-client';
import { isValidEan, normalizeEan } from '@dermamind/scoring';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinkButton, PrimaryButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { categoryCopy } from '@/features/catalog/copy';
import { api, errorText } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useTheme } from '@/theme';

type Category = components['schemas']['CreateUserProductDto']['category'] & string;

/** Categories a user can pick for their product (essence and spot treatment are rare on packs). */
const CATEGORIES: Category[] = [
  'cleanser',
  'toner',
  'serum',
  'moisturizer',
  'eye_cream',
  'sunscreen',
  'mask',
  'exfoliant',
  'oil',
  'other',
];

/**
 * D4 after a scan (PLAN.md 6.5 flow 2): Open Beauty Facts knew the code but not the ingredients →
 * name, brand and photo are filled in, the user only adds the list; nobody knew it → only the
 * code is filled in. Saved as the user's own product (only they see it until we check it) and
 * opened right away with its Match Score.
 */
export function AddProductScreen() {
  const params = useLocalSearchParams<{
    ean?: string;
    name?: string;
    brand?: string;
    imageUrl?: string;
    category?: string;
  }>();
  const { colors, spacing, radius } = useTheme();
  const prefilled = Boolean(params.name);
  const [ean, setEan] = useState(params.ean ?? '');
  const [name, setName] = useState(params.name ?? '');
  const [brand, setBrand] = useState(params.brand ?? '');
  const [inci, setInci] = useState('');
  const [category, setCategory] = useState<Category | undefined>(
    CATEGORIES.includes(params.category as Category) && params.category !== 'other'
      ? (params.category as Category)
      : undefined,
  );

  const eanOk = !ean.trim() || isValidEan(ean);
  const save = useMutation({
    mutationFn: async () => {
      const res = await api.POST('/v1/products', {
        body: {
          ean: ean.trim() ? normalizeEan(ean) : undefined,
          name: name.trim(),
          brand: brand.trim() || undefined,
          inciRaw: inci.trim(),
          category,
        },
      });
      if (!res.data) {
        throw new Error(
          errorText(res.response.status, {
            400: 'Sprawdź nazwę, kod i skład — skład wklej po przecinku.',
          }),
        );
      }
      return res.data;
    },
    onSuccess: (product) => {
      queryClient.setQueryData(['product', product.id], product);
      void queryClient.invalidateQueries({ queryKey: ['scans'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      router.replace({ pathname: '/product/[id]', params: { id: String(product.id) } });
    },
  });

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
            gap: spacing.lg,
            paddingBottom: spacing.xxl * 2,
          }}
        >
          <LinkButton title="Zamknij" color="textSecondary" onPress={() => router.back()} />
          <Text variant="title" accessibilityRole="header">
            {prefilled ? 'Brakuje tylko składu' : 'Nie znamy jeszcze tego produktu'}
          </Text>
          <Text color="textSecondary">
            {prefilled
              ? 'Znaleźliśmy produkt, ale bez listy składników. Przepisz ją z opakowania albo wklej — od razu policzymy dopasowanie.'
              : 'Dodaj go — wystarczy nazwa i skład z opakowania. Od razu policzymy dopasowanie.'}
          </Text>

          {params.imageUrl ? (
            <View
              style={[
                styles.photo,
                { backgroundColor: colors.surface, borderRadius: radius.productCard },
              ]}
            >
              <View
                style={[
                  styles.photoCard,
                  { backgroundColor: colors.photoCard, borderRadius: radius.card },
                ]}
              >
                <Image
                  source={{ uri: params.imageUrl }}
                  style={styles.photoImage}
                  resizeMode="contain"
                  accessibilityLabel={`Zdjęcie: ${name}`}
                />
              </View>
            </View>
          ) : null}

          <TextField label="Nazwa produktu" value={name} onChangeText={setName} maxLength={200} />
          <TextField
            label="Marka (opcjonalnie)"
            value={brand}
            onChangeText={setBrand}
            maxLength={100}
          />
          <TextField
            label="Skład (INCI) z opakowania"
            value={inci}
            onChangeText={setInci}
            placeholder="Aqua, Glycerin, Niacinamide…"
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus={prefilled}
            maxLength={10_000}
            style={{ height: 160, paddingTop: spacing.md, textAlignVertical: 'top' }}
          />

          <View style={{ gap: spacing.sm }}>
            <Text variant="caption">Rodzaj produktu (opcjonalnie)</Text>
            <View style={[styles.chips, { gap: spacing.sm }]}>
              {CATEGORIES.map((c) => (
                <Chip
                  key={c}
                  label={categoryCopy[c].singular}
                  icon={categoryCopy[c].icon}
                  selected={category === c}
                  onPress={() => setCategory(category === c ? undefined : c)}
                />
              ))}
            </View>
          </View>

          <TextField
            label="Kod kreskowy"
            value={ean}
            onChangeText={setEan}
            keyboardType="number-pad"
            maxLength={16}
            error={eanOk ? undefined : 'To nie wygląda na poprawny kod EAN'}
          />

          <Text variant="caption">
            Produkt zobaczysz tylko Ty, dopóki nie sprawdzimy danych.
            {prefilled ? ' Nazwa, marka i zdjęcie: Open Beauty Facts (ODbL).' : ''}
          </Text>

          {save.isError ? <Text color="bad">{save.error.message}</Text> : null}
          <PrimaryButton
            title="Sprawdź dopasowanie"
            onPress={() => save.mutate()}
            disabled={name.trim().length < 2 || inci.trim().length < 3 || !eanOk}
            loading={save.isPending}
          />
          <View style={{ alignItems: 'center' }}>
            <LinkButton
              title="Nie mam składu — tylko zgłoś produkt"
              color="accent"
              onPress={() =>
                router.replace({
                  pathname: '/submit',
                  params: ean.trim() ? { ean: ean.trim() } : {},
                })
              }
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  photo: { height: 200, alignItems: 'center', justifyContent: 'center' },
  photoCard: { width: '60%', height: '85%', padding: 12 },
  photoImage: { width: '100%', height: '100%' },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
});
