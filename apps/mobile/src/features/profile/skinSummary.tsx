import type { Me } from '@dermamind/api-client';
import { DropIcon, PlantIcon, type IconProps } from 'phosphor-react-native';
import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import { DotMeter } from '@/components/ui/DotMeter';
import { SkinScale } from '@/components/ui/SkinScale';
import { Text } from '@/components/ui/Text';
import {
  afterWashOptions,
  avoidGroupOptions,
  barrierCopy,
  budgetOptions,
  concernOptions,
  mustHaveOptions,
  reactionOptions,
  seasonalOptions,
  sensitivityCopy,
  skinTypeCopy,
  spfOptions,
  struggleOptions,
  symptomOptions,
  triggerOptions,
  zones,
  type Option,
} from '@/features/onboarding/content';
import type { QuestionStepId } from '@/features/onboarding/steps';
import { useTheme, type ColorToken } from '@/theme';

type Profile = Me['profile'];
type Answers = NonNullable<Profile['quizAnswers']>;

/** "**Podrażnienia** po kosmetykach" → "Podrażnienia po kosmetykach" */
const plain = (s: string) => s.replace(/\*\*/g, '');

function labelOf<T extends string>(options: Option<T>[], id: T | null | undefined): string {
  const o = options.find((x) => x.id === id);
  return o ? plain(o.label) : '—';
}

function labelsOf<T extends string>(options: Option<T>[], ids: readonly T[], none: string): string {
  return ids.length ? ids.map((id) => labelOf(options, id)).join(', ') : none;
}

export function concernLabels(codes: readonly string[]): string[] {
  return codes.map((c) => labelOf(concernOptions as Option<string>[], c));
}

export function avoidLabels(profile: Profile): string[] {
  return [
    ...profile.avoidGroups.map((g) => labelOf(avoidGroupOptions as Option<string>[], g)),
    ...profile.avoidIngredients,
  ];
}

export function quizDate(iso: string | null): string | null {
  return iso
    ? new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
}

/** Position on the dry → oily scale, the same way as O14. */
export function scalePosition(profile: Profile): number {
  const oil = profile.oilLevel ?? 0;
  return profile.skinType === 'combination'
    ? Math.min(0.7, Math.max(0.55, (oil + 3) / 6))
    : (oil + 3) / 6;
}

/** One row per question that can be changed on its own (PLAN.md 6.1, O6–O19 without O14). */
export function answerRows(
  a: Answers,
): { step: QuestionStepId; question: string; answer: string }[] {
  return [
    {
      step: 'struggle',
      question: 'Największy problem',
      answer: labelOf(struggleOptions, a.struggle),
    },
    {
      step: 'concerns',
      question: 'Cele skóry',
      answer: concernLabels(a.concerns).join(', ') || '—',
    },
    {
      step: 'shine',
      question: 'Błyszczenie po południu',
      answer: zones
        .map((z) => `${z.label}: ${z.options.find((o) => o.id === a.shine[z.id])?.label ?? '—'}`)
        .join('; '),
    },
    {
      step: 'after-wash',
      question: '30 minut po myciu',
      answer: labelOf(afterWashOptions, a.afterWash),
    },
    {
      step: 'symptoms',
      question: 'Ostatnie 2 tygodnie',
      answer: labelsOf(symptomOptions as Option<string>[], a.symptoms, 'Nic z tych rzeczy'),
    },
    {
      step: 'reactions',
      question: 'Jak często skóra reaguje',
      answer: labelOf(reactionOptions, a.reactionFrequency),
    },
    {
      step: 'triggers',
      question: 'Co wywołuje reakcję',
      answer: labelsOf(triggerOptions as Option<string>[], a.triggers, 'Nic nie zauważam'),
    },
    { step: 'seasons', question: 'Latem i zimą', answer: labelOf(seasonalOptions, a.seasonal) },
    {
      step: 'avoid-groups',
      question: 'Unikane grupy składników',
      answer: labelsOf(avoidGroupOptions as Option<string>[], a.avoidGroups, 'Brak'),
    },
    {
      step: 'avoid-ingredients',
      question: 'Unikane składniki',
      answer: a.avoidIngredients.length ? a.avoidIngredients.join(', ') : 'Brak',
    },
    {
      step: 'must-haves',
      question: 'Wymagania',
      answer: labelsOf(mustHaveOptions as Option<string>[], a.mustHaves, 'Brak wymagań'),
    },
    { step: 'spf', question: 'Filtr SPF', answer: labelOf(spfOptions, a.usesSpf) },
    { step: 'budget', question: 'Budżet na produkt', answer: labelOf(budgetOptions, a.budget) },
  ];
}

/**
 * Skin type, sebum scale, barrier and sensitivity — the O14 result as a card (mockup 03):
 * a light card on the accentSoft background.
 */
export function SkinResultCard({ profile, compact }: { profile: Profile; compact?: boolean }) {
  const { colors, spacing, radius } = useTheme();
  if (!profile.skinType) return null;
  const copy = skinTypeCopy[profile.skinType];
  const barrier = (profile.barrierLevel ?? 1) as 1 | 2 | 3;
  const sensitivity = profile.sensitivityLevel ?? 0;
  return (
    <View
      style={{
        backgroundColor: colors.background,
        borderRadius: radius.card,
        padding: compact ? spacing.lg : spacing.xl,
        gap: compact ? spacing.lg : spacing.xl,
      }}
    >
      <View style={{ gap: spacing.xs }}>
        <Text variant="label" color="textSecondary">
          Typ skóry
        </Text>
        <Text variant="section">Skóra {copy.name}</Text>
      </View>
      <SkinScale position={scalePosition(profile)} label={`Ty: ${copy.name}`} />
      {compact ? null : (
        <View
          style={{
            backgroundColor: colors.accentSoft,
            borderRadius: radius.card,
            padding: spacing.lg,
            gap: spacing.xs,
          }}
        >
          <Text variant="bodyStrong" color="primary">
            {copy.headline}
          </Text>
          <Text color="primary">{copy.advice}</Text>
        </View>
      )}
      <MeterRow
        icon={DropIcon}
        tint="caution"
        soft="cautionSoft"
        label="Bariera ochronna"
        value={barrierCopy[barrier]}
        level={barrier}
        max={3}
      />
      <MeterRow
        icon={PlantIcon}
        tint="bad"
        soft="badSoft"
        label="Wrażliwość"
        value={sensitivityCopy[sensitivity] ?? sensitivityCopy[0]}
        level={sensitivity}
        max={4}
      />
    </View>
  );
}

function MeterRow(props: {
  icon: ComponentType<IconProps>;
  tint: ColorToken;
  soft: ColorToken;
  label: string;
  value: string;
  level: number;
  max: number;
}) {
  const { colors, spacing } = useTheme();
  const Icon = props.icon;
  return (
    <View style={[styles.row, { gap: spacing.md }]}>
      <View style={[styles.icon, { backgroundColor: colors[props.soft] }]}>
        <Icon size={22} color={colors[props.tint]} weight="fill" />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="caption">{props.label}</Text>
        <Text variant="bodyStrong">{props.value}</Text>
      </View>
      <DotMeter
        value={props.level}
        max={props.max}
        color={props.tint}
        softColor={props.soft}
        label={props.label}
      />
    </View>
  );
}

/** Small read-only chips: concerns (accent) and avoided ingredients (red, like O16). */
export function TagList({ items, tone }: { items: string[]; tone: 'accent' | 'bad' }) {
  const { colors, spacing } = useTheme();
  if (!items.length) return null;
  return (
    <View style={[styles.tags, { gap: spacing.sm }]}>
      {items.map((t) => (
        <View
          key={t}
          style={[
            styles.tag,
            {
              backgroundColor: tone === 'bad' ? colors.badSoft : colors.accentSoft,
              paddingHorizontal: spacing.md,
            },
          ]}
        >
          <Text variant="caption" color={tone === 'bad' ? 'bad' : 'primary'}>
            {t}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap' },
  tag: { borderRadius: 999, paddingVertical: 6 },
});
