import { isValidEan, normalizeEan } from '@dermamind/scoring';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinkButton, PrimaryButton } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useTheme } from '@/theme';
import { openByEan } from './lookup';

/** Fallback when the camera can't read the code (or there is no camera permission). */
export function ManualEanScreen() {
  const { colors, spacing } = useTheme();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const ean = normalizeEan(code);
  const complete = /^(\d{8}|\d{13})$/.test(ean);
  const valid = complete && isValidEan(ean);

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    const message = await openByEan(ean);
    if (message) {
      setError(message);
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ padding: spacing.screen, gap: spacing.lg }}>
          <LinkButton title="Zamknij" color="textSecondary" onPress={() => router.back()} />
          <Text variant="title" accessibilityRole="header">
            Wpisz kod kreskowy
          </Text>
          <Text color="textSecondary">8 albo 13 cyfr spod kresek na opakowaniu.</Text>
          <TextField
            label="Kod EAN"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoFocus
            maxLength={16}
            onSubmitEditing={() => (valid ? void submit() : undefined)}
            error={complete && !valid ? 'Ostatnia cyfra się nie zgadza — sprawdź kod.' : undefined}
          />
          {error ? <Text color="bad">{error}</Text> : null}
          <PrimaryButton
            title="Szukaj"
            onPress={() => void submit()}
            disabled={!valid}
            loading={busy}
          />
          <View style={{ alignItems: 'center' }}>
            <LinkButton
              title="Skanuj aparatem"
              color="accent"
              onPress={() => router.replace('/scan')}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
