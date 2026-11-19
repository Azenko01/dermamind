import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

// Sebum scale from dry to oily (mockup 03), colours from the theme (scale1…scale5).
const SEGMENTS = ['scale1', 'scale2', 'scale3', 'scale4', 'scale5'] as const;

interface Props {
  /** 0 (dry) … 1 (oily) */
  position: number;
  label: string;
}

/** Dry → balanced → oily scale with a "Ty: …" marker (O14). */
export function SkinScale({ position, label }: Props) {
  const { colors, spacing } = useTheme();
  const left = `${Math.round(Math.max(0, Math.min(1, position)) * 100)}%` as const;
  return (
    <View accessible accessibilityLabel={label} style={{ gap: spacing.sm }}>
      <View style={styles.bubbleRow}>
        <View style={[styles.bubbleAnchor, { left }]}>
          <View style={[styles.bubble, { backgroundColor: colors.primary }]}>
            <Text variant="bodyStrong" color="onPrimary">
              {label}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.track}>
        {SEGMENTS.map((c) => (
          <View key={c} style={[styles.segment, { backgroundColor: colors[c] }]} />
        ))}
        <View
          style={[
            styles.marker,
            { left, borderColor: colors.primary, backgroundColor: colors.background },
          ]}
        />
      </View>
      <View style={styles.labels}>
        <Text variant="caption">Sucha</Text>
        <Text variant="caption">Zrównoważona</Text>
        <Text variant="caption">Tłusta</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleRow: { height: 44 },
  bubbleAnchor: { position: 'absolute', width: 0, alignItems: 'center', top: 0 },
  bubble: {
    position: 'absolute',
    width: 190,
    left: -95,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  track: { flexDirection: 'row', gap: 4, height: 22, alignItems: 'center' },
  segment: { flex: 1, height: 22, borderRadius: 11 },
  marker: {
    position: 'absolute',
    width: 34,
    height: 34,
    marginLeft: -17,
    borderRadius: 17,
    borderWidth: 5,
  },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
});
