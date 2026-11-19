import { groupReasons, type ReasonGroup } from '@dermamind/scoring';
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
  /** one line, supports **bold**: "**Pomaga na osłabioną barierę:** Ceramide NP, Tocopherol" */
  text: string;
}

const list = (items: string[]) => items.join(', ');
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Grouped reasons (one line per reason, all its ingredients) with Polish copy. */
export function matchPoints(m: Match): { positive: Point[]; negative: Point[] } {
  const { positive, negative } = groupReasons(m);
  const point = (g: ReasonGroup, i: number): Point => {
    switch (g.kind) {
      case 'avoided_shelf':
        return {
          key: 'shelf',
          dot: 'bad',
          text: '**Jest na Twojej półce „Unikam”** — dlatego zawsze „Nie pasuje”.',
        };
      case 'excluded':
        return {
          key: `x${g.group ?? i}`,
          dot: 'bad',
          text: g.group
            ? `**Zawiera to, czego unikasz (${groupCopy[g.group] ?? g.group}):** ${list(g.ingredients)}`
            : `**Zawiera składnik, którego unikasz:** ${list(g.ingredients)}`,
        };
      case 'helps':
        return {
          key: `h${g.concern}`,
          dot: 'good',
          text: `**Pomaga na ${concernCopy[g.concern] ?? g.concern}:** ${list(g.ingredients)}`,
        };
      case 'warns': {
        const reason =
          g.reason === 'harms_concern'
            ? `${conReasonCopy.harms_concern} ${concernCopy[g.concern ?? ''] ?? g.concern ?? ''}`
            : (conReasonCopy[g.reason] ?? g.reason);
        return {
          key: `w${g.reason}${g.concern ?? ''}`,
          dot: g.reason === 'harms_concern' ? 'bad' : 'caution',
          text: `**${capital(reason)}:** ${list(g.ingredients)}`,
        };
      }
    }
  };
  return { positive: positive.map(point), negative: negative.map(point) };
}

/** At most this many lines per section before "Pokaż wszystkie". */
const SHOWN = 3;

/** D1 point 3 (mockup 07): coloured header with the label and the score, reasons below. */
export function MatchCard({ match, subtitle }: { match: Match; subtitle?: string }) {
  const { colors, spacing, radius } = useTheme();
  const head = matchHeadline(match);
  const { positive, negative } = matchPoints(match);
  // what the user avoids decides the verdict, so it goes first
  const sections = [
    { title: 'Na co uważać', points: negative },
    { title: 'Dlaczego pasuje', points: positive },
  ];
  if (!match.excludedBy.length && !match.avoidedByUser) sections.reverse();

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
        {positive.length + negative.length === 0 ? (
          <Text variant="caption">
            Żaden ze znanych składników nie ma wyraźnego wpływu na Twoje potrzeby.
          </Text>
        ) : (
          sections.map((s) =>
            s.points.length ? (
              <ReasonSection key={s.title} title={s.title} points={s.points} />
            ) : null,
          )
        )}
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
            {match.confidence.fuzzyMatches
              ? ` Składniki rozpoznane mimo literówek: ${match.confidence.fuzzyMatches}.`
              : ''}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function ReasonSection({ title, points }: { title: string; points: Point[] }) {
  const { colors, spacing } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? points : points.slice(0, SHOWN);
  return (
    <View style={{ gap: spacing.lg }}>
      <Text variant="label" color="textSecondary">
        {title}
      </Text>
      {visible.map((p) => (
        <View key={p.key} style={[styles.point, { gap: spacing.lg }]}>
          <View style={[styles.dot, { backgroundColor: colors[p.dot] }]} />
          <RichText style={{ flex: 1 }}>{p.text}</RichText>
        </View>
      ))}
      {points.length > SHOWN ? (
        <Pressable accessibilityRole="button" onPress={() => setExpanded((e) => !e)} hitSlop={8}>
          <Text variant="bodyStrong" color="accent">
            {expanded ? 'Pokaż mniej' : `Pokaż wszystkie (${points.length})`}
          </Text>
        </Pressable>
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
