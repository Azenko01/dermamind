import { CaretDownIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { OptionCard } from './OptionCard';
import { Text } from './Text';

export interface Zone<Z extends string, A extends string> {
  id: Z;
  label: string;
  /** Answer labels per zone — grammar differs ("błyszczy" vs "błyszczą"). */
  options: { id: A; label: string }[];
}

interface Props<Z extends string, A extends string> {
  zones: Zone<Z, A>[];
  value: Partial<Record<Z, A>>;
  onChange: (zone: Z, answer: A) => void;
}

/**
 * O8: face zones answered one after another. Answered zones collapse to a summary row, the current
 * one shows its options, the rest wait with a dashed outline (mockup 02).
 */
export function ZoneAccordion<Z extends string, A extends string>({
  zones,
  value,
  onChange,
}: Props<Z, A>) {
  const { colors, spacing, radius } = useTheme();
  const firstOpen = zones.find((z) => !value[z.id])?.id;
  const [manualOpen, setManualOpen] = useState<Z | undefined>();
  const open = manualOpen ?? firstOpen;

  return (
    <View style={{ gap: spacing.md }}>
      {zones.map((zone) => {
        const answer = zone.options.find((o) => o.id === value[zone.id]);
        if (zone.id === open) {
          return (
            <View key={zone.id} style={{ gap: spacing.md }}>
              <View style={[styles.header, { gap: spacing.lg, paddingVertical: spacing.sm }]}>
                <ZoneIcon zone={zone.id} active />
                <Text variant="productName" style={{ fontSize: 20 }}>
                  {zone.label}
                </Text>
              </View>
              {zone.options.map((o) => (
                <OptionCard
                  key={o.id}
                  mode="radio"
                  title={o.label}
                  selected={value[zone.id] === o.id}
                  onPress={() => {
                    onChange(zone.id, o.id);
                    setManualOpen(undefined);
                  }}
                />
              ))}
            </View>
          );
        }
        if (answer) {
          return (
            <Pressable
              key={zone.id}
              accessibilityRole="button"
              accessibilityLabel={`${zone.label}: ${answer.label}. Zmień`}
              onPress={() => setManualOpen(zone.id)}
              style={[
                styles.summary,
                {
                  backgroundColor: colors.surface,
                  borderRadius: radius.card + 4,
                  padding: spacing.screen,
                  gap: spacing.lg,
                },
              ]}
            >
              <ZoneIcon zone={zone.id} />
              <View style={{ flex: 1 }}>
                <Text>{zone.label}</Text>
                <Text color="primary">{answer.label}</Text>
              </View>
              <CaretDownIcon size={20} color={colors.textSecondary} />
            </Pressable>
          );
        }
        return (
          <View
            key={zone.id}
            style={[
              styles.summary,
              {
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: colors.border,
                borderRadius: radius.card,
                padding: spacing.screen,
                gap: spacing.lg,
              },
            ]}
          >
            <ZoneIcon zone={zone.id} muted />
            <Text color="textSecondary">{zone.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Simple face pictograms: bar on top = forehead/nose, two dots = cheeks, bar at the bottom = jaw. */
function ZoneIcon({ zone, active, muted }: { zone: string; active?: boolean; muted?: boolean }) {
  const { colors } = useTheme();
  const ring = muted ? colors.border : colors.textPrimary;
  const mark = muted ? 'transparent' : active ? colors.accent : colors.accent;
  return (
    <View style={[styles.face, { borderColor: ring }]}>
      {zone === 'tZone' ? <View style={[styles.bar, { top: 12, backgroundColor: mark }]} /> : null}
      {zone === 'cheeks' ? (
        <View style={styles.dots}>
          <View style={[styles.dot, { backgroundColor: mark }]} />
          <View style={[styles.dot, { backgroundColor: mark }]} />
        </View>
      ) : null}
      {zone === 'jaw' ? <View style={[styles.bar, { bottom: 12, backgroundColor: mark }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  summary: { flexDirection: 'row', alignItems: 'center' },
  face: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: { position: 'absolute', width: 18, height: 4, borderRadius: 2 },
  dots: { flexDirection: 'row', gap: 10 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
