import { StyleSheet, View } from 'react-native';
import { scoreColors, useTheme } from '@/theme';
import { Text } from './Text';

/** "92%" pill coloured by the score thresholds from @dermamind/scoring. */
export function MatchPill({ score, suffix = '' }: { score: number; suffix?: string }) {
  const { colors } = useTheme();
  const { fg, bg } = scoreColors(score);
  return (
    <View style={[styles.pill, { backgroundColor: colors[bg] }]}>
      <Text variant="caption" color={fg} style={styles.text}>
        {`${score}%${suffix}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start' },
  text: { fontFamily: 'Inter_600SemiBold' },
});
