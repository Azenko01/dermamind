import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, type ColorToken } from '@/theme';

interface Props {
  title: string;
  subtitle?: string;
  background?: Extract<ColorToken, 'background' | 'backgroundAlt'>;
}

/** Temporary tab content until the real screens land (Sprints 1–5). */
export function PlaceholderScreen({ title, subtitle, background = 'background' }: Props) {
  const { colors, spacing } = useTheme();
  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.root, { backgroundColor: colors[background], padding: spacing.screen }]}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {subtitle ? (
        <View style={{ marginTop: spacing.sm }}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

// Typography from PLAN.md 7.2 (Inter is loaded in a later sprint; system font until then).
const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '400', letterSpacing: -0.3 },
  subtitle: { fontSize: 15, lineHeight: 20 },
});
