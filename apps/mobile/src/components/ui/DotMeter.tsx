import { StyleSheet, View } from 'react-native';
import { useTheme, type ColorToken } from '@/theme';

interface Props {
  value: number;
  max: number;
  color: ColorToken;
  softColor: ColorToken;
  label: string;
}

/** Barrier / sensitivity as filled dots (O14). */
export function DotMeter({ value, max, color, softColor, label }: Props) {
  const { colors } = useTheme();
  return (
    <View accessible accessibilityLabel={`${label}: ${value} z ${max}`} style={styles.row}>
      {Array.from({ length: max }, (_, i) => (
        <View
          key={i}
          style={[styles.dot, { backgroundColor: i < value ? colors[color] : colors[softColor] }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  dot: { width: 18, height: 18, borderRadius: 9 },
});
