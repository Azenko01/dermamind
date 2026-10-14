import { isValidEan, normalizeEan } from '@dermamind/scoring';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircleIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinkButton, PrimaryButton } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { api, errorText } from '@/lib/api';
import { useTheme } from '@/theme';

/** "Zgłoś produkt" (D4): goes to the moderation queue, the team adds it to the catalogue. */
export function SubmitScreen() {
  const params = useLocalSearchParams<{ ean?: string; inci?: string }>();
  const { colors, spacing } = useTheme();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [ean, setEan] = useState(params.ean ?? '');
  const [inci, setInci] = useState(params.inci ?? '');

  const eanOk = !ean.trim() || isValidEan(ean);
  const submit = useMutation({
    mutationFn: async () => {
      const res = await api.POST('/v1/product-submissions', {
        body: {
          name: name.trim(),
          brand: brand.trim() || undefined,
          barcode: ean.trim() ? normalizeEan(ean) : undefined,
          inciRaw: inci.trim() || undefined,
        },
      });
      if (!res.data)
        throw new Error(errorText(res.response.status, { 400: 'Sprawdź nazwę i kod kreskowy.' }));
      return res.data;
    },
  });

  if (submit.isSuccess) {
    return (
      <SafeAreaView
        style={[
          styles.root,
          styles.center,
          { backgroundColor: colors.background, padding: spacing.screen, gap: spacing.lg },
        ]}
      >
        <CheckCircleIcon size={72} color={colors.good} weight="fill" />
        <Text variant="title" align="center">
          Dziękujemy!
        </Text>
        <Text align="center" color="textSecondary">
          Sprawdzimy zgłoszenie i dodamy produkt do bazy. Do tego czasu możesz ocenić go przez
          „Analizuj skład”.
        </Text>
        <PrimaryButton title="Wróć do Odkrywaj" onPress={() => router.dismissTo('/explore')} />
      </SafeAreaView>
    );
  }

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
            Zgłoś produkt
          </Text>
          <Text color="textSecondary">
            Pomóż nam uzupełnić bazę. Wystarczy nazwa — resztę dodamy sami.
          </Text>
          <TextField label="Nazwa produktu" value={name} onChangeText={setName} maxLength={200} />
          <TextField
            label="Marka (opcjonalnie)"
            value={brand}
            onChangeText={setBrand}
            maxLength={100}
          />
          <TextField
            label="Kod kreskowy (opcjonalnie)"
            value={ean}
            onChangeText={setEan}
            keyboardType="number-pad"
            maxLength={16}
            error={eanOk ? undefined : 'To nie wygląda na poprawny kod EAN'}
          />
          <TextField
            label="Skład INCI (opcjonalnie)"
            value={inci}
            onChangeText={setInci}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={10_000}
            style={{ height: 140, paddingTop: spacing.md, textAlignVertical: 'top' }}
          />
          {submit.isError ? <Text color="bad">{submit.error.message}</Text> : null}
          <View style={{ marginTop: spacing.sm }}>
            <PrimaryButton
              title="Wyślij zgłoszenie"
              onPress={() => submit.mutate()}
              disabled={name.trim().length < 2 || !eanOk}
              loading={submit.isPending}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
