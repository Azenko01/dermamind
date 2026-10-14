import { scoreColors } from '@/theme';
import { StyleSheet, View } from 'react-native';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { Text } from '@/components/ui/Text';
import type { Routines } from '@/features/routine/api';
import { plural } from '@/features/routine/copy';
import { useTheme } from '@/theme';

/** "Ocena rutyny" (mockup 08): ring, conflicts line, OK / Uwaga pill. */
export function RoutineScoreCard({
  score,
  compact,
}: {
  score: Routines['score'];
  compact?: boolean;
}) {
  const { colors, spacing, radius } = useTheme();
  if (score.score === null) return null;
  const n = score.conflicts.length;
  const ok = n === 0 && !score.missingSpf;
  const subtitle = n
    ? `${n} ${plural(n, 'konflikt', 'konflikty', 'konfliktów')} składników`
    : score.missingSpf
      ? 'Brakuje filtra SPF rano'
      : 'Brak konfliktów składników';
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderRadius: radius.productCard,
          padding: spacing.lg,
          gap: spacing.lg,
        },
      ]}
    >
      <ScoreRing score={score.score} color={scoreColors(score.score).fg} size={compact ? 64 : 80} />
      <View style={{ flex: 1 }}>
        <Text variant="productName">Ocena rutyny</Text>
        <Text variant="caption">{subtitle}</Text>
      </View>
      <View style={[styles.pill, { backgroundColor: ok ? colors.goodSoft : colors.cautionSoft }]}>
        <Text variant="bodyStrong" color={ok ? 'good' : 'caution'}>
          {ok ? 'OK' : 'Uwaga'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  pill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
});
