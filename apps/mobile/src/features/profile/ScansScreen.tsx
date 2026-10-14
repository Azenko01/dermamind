import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BarcodeIcon, CaretLeftIcon } from 'phosphor-react-native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProductRow } from '@/components/features/ProductCard';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { api } from '@/lib/api';
import { useTheme } from '@/theme';

const dateFmt = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

/** Profil → Historia skanów. Unknown codes lead back to D4. */
export function ScansScreen() {
  const { colors, spacing, sizes } = useTheme();
  const scans = useQuery({
    queryKey: ['scans'],
    queryFn: async () => {
      const res = await api.GET('/v1/me/scans', { params: { query: { pageSize: 100 } } });
      if (!res.data) throw new Error(`GET /v1/me/scans failed: ${res.response.status}`);
      return res.data;
    },
  });

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingHorizontal: spacing.md }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Wstecz"
          onPress={() => router.back()}
          style={{
            width: sizes.minTouchTarget,
            height: sizes.minTouchTarget,
            justifyContent: 'center',
          }}
        >
          <CaretLeftIcon size={26} color={colors.textPrimary} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: spacing.screen, paddingTop: 0, gap: spacing.lg }}
      >
        <Text variant="title" accessibilityRole="header">
          Historia skanów
        </Text>
        {scans.isPending ? (
          <ActivityIndicator color={colors.primary} />
        ) : scans.isError ? (
          <View style={{ gap: spacing.md }}>
            <Text>Nie udało się wczytać historii.</Text>
            <SecondaryButton title="Spróbuj ponownie" onPress={() => void scans.refetch()} />
          </View>
        ) : scans.data.items.length === 0 ? (
          <View style={{ gap: spacing.lg, marginTop: spacing.xl }}>
            <Text color="textSecondary">
              Nie masz jeszcze skanów. Zeskanuj kod z opakowania, a produkt pojawi się tutaj.
            </Text>
            <PrimaryButton title="Skanuj produkt" onPress={() => router.push('/scan')} />
          </View>
        ) : (
          scans.data.items.map((s) => (
            <View key={s.id} style={{ gap: spacing.xs }}>
              <Text variant="caption">{dateFmt.format(new Date(s.scannedAt))}</Text>
              {s.product ? (
                <ProductRow item={s.product} />
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    s.barcode &&
                    router.push({ pathname: '/scan/[ean]', params: { ean: s.barcode } })
                  }
                  style={[styles.unknown, { gap: spacing.lg }]}
                >
                  <View style={[styles.thumb, { backgroundColor: colors.surface }]}>
                    <BarcodeIcon size={28} color={colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="productName" style={{ fontSize: 17 }}>
                      Nieznany produkt
                    </Text>
                    <Text variant="caption">Kod {s.barcode} · wklej skład albo zgłoś</Text>
                  </View>
                </Pressable>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row' },
  unknown: { flexDirection: 'row', alignItems: 'center', minHeight: 72 },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
