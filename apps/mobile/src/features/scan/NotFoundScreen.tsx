import { router, useLocalSearchParams } from 'expo-router';
import { BarcodeIcon } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomBar } from '@/components/ui/BottomBar';
import { LinkButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

/** D4 "nie znaleziono" → paste the ingredient list (D3) or report the product. */
export function NotFoundScreen() {
  const { ean } = useLocalSearchParams<{ ean: string }>();
  const { colors, spacing } = useTheme();
  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={{ padding: spacing.screen }}>
        <LinkButton title="Zamknij" color="textSecondary" onPress={() => router.back()} />
      </View>
      <View style={[styles.body, { padding: spacing.screen, gap: spacing.lg }]}>
        <View style={[styles.icon, { backgroundColor: colors.surface }]}>
          <BarcodeIcon size={56} color={colors.textSecondary} />
        </View>
        <Text variant="title" align="center">
          Nie znamy jeszcze tego produktu
        </Text>
        <Text align="center" color="textSecondary">
          Wklej skład z opakowania, a ocenimy go od razu. Możesz też zgłosić produkt — dodamy go do
          bazy.
        </Text>
        {ean ? (
          <Text
            variant="caption"
            align="center"
            accessibilityLabel={`Kod ${ean.split('').join(' ')}`}
          >
            Kod: {ean}
          </Text>
        ) : null}
      </View>
      <BottomBar>
        <PrimaryButton
          title="Wklej skład"
          onPress={() => router.replace({ pathname: '/analyze', params: ean ? { ean } : {} })}
        />
        <SecondaryButton
          title="Zgłoś produkt"
          onPress={() => router.replace({ pathname: '/submit', params: ean ? { ean } : {} })}
        />
        <View style={{ alignItems: 'center' }}>
          <LinkButton
            title="Skanuj ponownie"
            color="accent"
            onPress={() => router.replace('/scan')}
          />
        </View>
      </BottomBar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
