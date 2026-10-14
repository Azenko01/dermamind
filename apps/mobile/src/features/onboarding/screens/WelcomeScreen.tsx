import { router } from 'expo-router';
import { DropIcon, PackageIcon } from 'phosphor-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomBar } from '@/components/ui/BottomBar';
import { LinkButton, PrimaryButton } from '@/components/ui/Button';
import { MatchPill } from '@/components/ui/MatchPill';
import { RichText, Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';
import { stepNav } from '../steps';

const DEMO = [
  { brand: 'SKIN1004', name: 'Madagascar Centella Cream', score: 92 },
  { brand: 'Bielenda', name: 'Skin Clinic Kwas Hialuronowy', score: 86 },
  { brand: 'Ziaja', name: 'Pianka do mycia twarzy', score: 68 },
];

/** O1 (mockup 01). */
export function WelcomeScreen() {
  const { colors, spacing, radius } = useTheme();
  const { next } = stepNav('welcome');
  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.screen, gap: spacing.xxl }}>
        <View style={[styles.center, { gap: spacing.md, marginTop: spacing.xxl }]}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <DropIcon size={36} color={colors.background} />
          </View>
          <Text variant="bodyStrong" color="primary" style={{ fontFamily: 'Inter_500Medium' }}>
            DermaMind AI
          </Text>
        </View>
        <RichText variant="title" align="center" style={styles.headline}>
          {'Sprawdź, co działa na _Twoją_ skórę, zanim kupisz'}
        </RichText>
        <View
          style={{
            backgroundColor: colors.accentSoft,
            borderRadius: radius.productCard + 8,
            padding: spacing.xl,
            gap: spacing.md,
          }}
        >
          {DEMO.map((p) => (
            <View
              key={p.name}
              style={[
                styles.demoRow,
                {
                  backgroundColor: colors.background,
                  borderRadius: radius.productCard,
                  padding: spacing.lg,
                  gap: spacing.lg,
                },
              ]}
            >
              <View style={[styles.thumb, { backgroundColor: colors.surface }]}>
                <PackageIcon size={24} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="caption">{p.brand}</Text>
                <Text variant="productName" style={{ fontSize: 17 }}>
                  {p.name}
                </Text>
              </View>
              <MatchPill score={p.score} />
            </View>
          ))}
        </View>
        <Text variant="caption" align="center" style={{ fontSize: 17, lineHeight: 24 }}>
          Dopasowanie liczone ze składu INCI i Twojego profilu skóry. Bez sponsorowanych wyników.
        </Text>
      </ScrollView>
      <BottomBar>
        <PrimaryButton title="Zaczynamy" onPress={next} />
        <View style={[styles.login, { gap: spacing.xs }]}>
          <Text>Masz już konto?</Text>
          <LinkButton title="Zaloguj się" onPress={() => router.push('/auth/login')} />
        </View>
      </BottomBar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center' },
  logo: { width: 84, height: 84, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headline: { fontSize: 34, lineHeight: 42 },
  demoRow: { flexDirection: 'row', alignItems: 'center' },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  login: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
