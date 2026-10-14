import { InfoIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { RichText, Text } from '@/components/ui/Text';
import { ScoreRing } from '@/components/ui/ScoreRing';
import type { ProductDetail } from '@/features/catalog/api';
import { concernCopy, conReasonCopy, groupCopy, matchHeadline } from '@/features/catalog/copy';
import { useTheme, type ColorToken } from '@/theme';

type Match = NonNullable<ProductDetail['match']>;
interface Point {
  key: string;
  dot: ColorToken;
  title: string;
  /** supports **bold** */
  body: string;
}

const list = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} i ${items.at(-1)}`;

/** Reasons in the order that matters: what you avoid, what helps, what to watch out for. */
export function matchPoints(m: Match): Point[] {
  const points: Point[] = [];
  for (const e of m.excludedBy) {
    points.push({
      key: `x${e.ingredientId}`,
      dot: 'bad',
      title: 'Zawiera coś, czego unikasz',
      body: `**${e.ingredient}**${e.group ? ` — ${groupCopy[e.group] ?? e.group}` : ''}`,
    });
  }
  const pros = new Map<string, string[]>();
  for (const p of m.pros)
    pros.set(p.ingredient, [
      ...(pros.get(p.ingredient) ?? []),
      concernCopy[p.concern] ?? p.concern,
    ]);
  for (const [ingredient, concerns] of pros) {
    points.push({
      key: `p${ingredient}`,
      dot: 'good',
      title: `Pomaga na ${list(concerns)}`,
      body: `Zawiera **${ingredient}**.`,
    });
  }
  for (const c of m.cons) {
    const reason =
      c.reason === 'harms_concern'
        ? `${conReasonCopy.harms_concern} ${concernCopy[c.concern ?? ''] ?? c.concern}`
        : conReasonCopy[c.reason];
    points.push({
      key: `c${c.ingredientId}${c.reason}${c.concern ?? ''}`,
      dot: c.reason === 'harms_concern' ? 'bad' : 'caution',
      title: 'Uwaga',
      body: `**${c.ingredient}** ${reason}.`,
    });
  }
  return points;
}

const SHOWN = 4;

/** D1 point 3 (mockup 07): coloured header with the label and the score, reasons below. */
export function MatchCard({ match, subtitle }: { match: Match; subtitle?: string }) {
  const { colors, spacing, radius } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const head = matchHeadline(match);
  const points = matchPoints(match);
  const visible = expanded ? points : points.slice(0, SHOWN);

  return (
    <View style={[styles.card, { borderColor: colors.border, borderRadius: radius.productCard }]}>
      <View
        style={[
          styles.head,
          { backgroundColor: colors[head.bg], padding: spacing.xl, gap: spacing.lg },
        ]}
      >
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text variant="section" color={head.fg}>
            {head.title}
          </Text>
          {subtitle ? <Text color={head.fg}>{subtitle}</Text> : null}
        </View>
        <ScoreRing score={match.score} color={head.fg} />
      </View>
      <View style={{ padding: spacing.xl, gap: spacing.xl }}>
        {visible.length === 0 ? (
          <Text variant="caption">
            Żaden ze znanych składników nie ma wyraźnego wpływu na Twoje potrzeby.
          </Text>
        ) : (
          visible.map((p) => (
            <View key={p.key} style={[styles.point, { gap: spacing.lg }]}>
              <View style={[styles.dot, { backgroundColor: colors[p.dot] }]} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong">{p.title}</Text>
                <RichText color="textSecondary">{p.body}</RichText>
              </View>
            </View>
          ))
        )}
        {points.length > SHOWN && !expanded ? (
          <Pressable accessibilityRole="button" onPress={() => setExpanded(true)} hitSlop={8}>
            <Text variant="bodyStrong" color="accent">
              Pokaż jeszcze {points.length - SHOWN}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {match.lowConfidence ? (
        <View
          style={[
            styles.note,
            { borderTopColor: colors.border, padding: spacing.lg, gap: spacing.sm },
          ]}
        >
          <InfoIcon size={20} color={colors.textSecondary} />
          <Text variant="caption" style={{ flex: 1 }}>
            Ocena na podstawie niepełnych danych
            {match.confidence.inciComplete
              ? ''
              : ' — znamy tylko kluczowe składniki, nie cały skład'}
            .
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center' },
  point: { flexDirection: 'row', alignItems: 'flex-start' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 6 },
  note: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth },
});
