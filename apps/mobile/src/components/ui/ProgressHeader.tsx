import { ArrowLeftIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  /** 0…1 */
  progress: number;
  onBack?: () => void;
  /** Track colour on tinted screens (O14). */
  trackColor?: string;
}

/** Back arrow + thin progress bar (PLAN.md 6.1). */
export function ProgressHeader({ progress, onBack, trackColor }: Props) {
  const { colors, spacing, sizes } = useTheme();
  const pct = `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%` as const;
  return (
    <View style={[styles.row, { paddingHorizontal: spacing.screen, gap: spacing.lg }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Wstecz"
        onPress={onBack}
        disabled={!onBack}
        style={{
          width: sizes.minTouchTarget,
          height: sizes.minTouchTarget,
          justifyContent: 'center',
        }}
      >
        {onBack ? <ArrowLeftIcon size={26} color={colors.textPrimary} /> : null}
      </Pressable>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
        style={[styles.track, { backgroundColor: trackColor ?? colors.border }]}
      >
        <View style={[styles.fill, { width: pct, backgroundColor: colors.primary }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: 56 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
