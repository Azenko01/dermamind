import {
  CheckCircleIcon,
  FlaskIcon,
  ListNumbersIcon,
  MagnifyingGlassIcon,
  PackageIcon,
  SparkleIcon,
  type IconProps,
} from 'phosphor-react-native';
import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import { MatchPill } from '@/components/ui/MatchPill';
import { QuestionScreen } from '@/components/ui/QuestionScreen';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';
import { stepNav, type StepId } from '../steps';

type IntroId = Extract<StepId, 'intro-sense' | 'intro-questions' | 'intro-match' | 'intro-values'>;

/** O2–O5: short story before the quiz. No made-up numbers, no fake reviews (PLAN.md 6.1). */
export function IntroScreen({ id }: { id: IntroId }) {
  const { progress, next, back } = stepNav(id);
  const content = {
    'intro-sense': {
      title: 'A gdyby pielęgnacja miała wreszcie [sens]?',
      subtitle: 'Bez zgadywania i kupowania kolejnych kremów „na próbę”.',
      body: <Illustration icon={SparkleIcon} />,
    },
    'intro-questions': {
      title: 'Wszystkie pytania [w jednym miejscu]',
      subtitle: 'DermaMind czyta skład za Ciebie.',
      body: (
        <View style={{ gap: 12 }}>
          <Bullet icon={FlaskIcon} text="Czego używać przy mojej skórze?" />
          <Bullet icon={MagnifyingGlassIcon} text="Co naprawdę jest w środku?" />
          <Bullet icon={ListNumbersIcon} text="W jakiej kolejności nakładać?" />
        </View>
      ),
    },
    'intro-match': {
      title: 'Każdy produkt dostaje [Match Score]',
      subtitle: 'Liczba od 0 do 100: jak dobrze skład pasuje do Twojej skóry.',
      body: <MatchGrid />,
    },
    'intro-values': {
      title: 'Pracujemy dla Twojej skóry, [nie dla marek]',
      subtitle: 'Ocena wynika ze składu i Twojego profilu — nikt nie płaci za miejsce w wynikach.',
      body: (
        <View style={{ gap: 12 }}>
          <Bullet icon={CheckCircleIcon} text="0 sponsorowanych wyników" />
          <Bullet icon={CheckCircleIcon} text="Skład zamiast marketingu z opakowania" />
          <Bullet icon={CheckCircleIcon} text="Ten sam produkt i profil = zawsze ten sam wynik" />
        </View>
      ),
    },
  }[id];

  return (
    <QuestionScreen
      progress={progress}
      onBack={back}
      title={content.title}
      highlight="accent"
      subtitle={content.subtitle}
      onNext={next}
    >
      {content.body}
    </QuestionScreen>
  );
}

function Illustration({ icon: Icon }: { icon: ComponentType<IconProps> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.illustration, { backgroundColor: colors.accentSoft }]}>
      <Icon size={96} color={colors.accent} weight="duotone" />
    </View>
  );
}

function Bullet({ icon: Icon, text }: { icon: ComponentType<IconProps>; text: string }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={[
        styles.bullet,
        {
          borderColor: colors.border,
          borderRadius: radius.card,
          padding: spacing.screen,
          gap: spacing.lg,
        },
      ]}
    >
      <Icon size={24} color={colors.accent} />
      <Text style={{ flex: 1 }}>{text}</Text>
    </View>
  );
}

const GRID = [
  { name: 'Krem nawilżający', score: 87 },
  { name: 'Serum z niacynamidem', score: 91 },
  { name: 'Żel do mycia', score: 64 },
  { name: 'Tonik z kwasami', score: 38 },
];

function MatchGrid() {
  const { colors, radius, spacing } = useTheme();
  return (
    <View style={styles.grid}>
      {GRID.map((p) => (
        <View
          key={p.name}
          style={[
            styles.gridCard,
            { borderColor: colors.border, borderRadius: radius.productCard, padding: spacing.md },
          ]}
        >
          <View style={[styles.gridImage, { backgroundColor: colors.surface, borderRadius: 16 }]}>
            <PackageIcon size={40} color={colors.textSecondary} />
            <View style={styles.gridPill}>
              <MatchPill score={p.score} />
            </View>
          </View>
          <Text variant="caption" color="textPrimary" style={{ marginTop: spacing.sm }}>
            {p.name}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  illustration: {
    alignSelf: 'center',
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  bullet: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: { width: '47%', borderWidth: 1 },
  gridImage: { height: 120, alignItems: 'center', justifyContent: 'center' },
  gridPill: { position: 'absolute', top: 8, left: 8 },
});
