import { computeSkinProfile } from '@dermamind/scoring';
import { Redirect } from 'expo-router';
import { DropIcon, PlantIcon, SparkleIcon, type IconProps } from 'phosphor-react-native';
import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import { DotMeter } from '@/components/ui/DotMeter';
import { QuestionScreen } from '@/components/ui/QuestionScreen';
import { SkinScale } from '@/components/ui/SkinScale';
import { Text } from '@/components/ui/Text';
import { useQuiz } from '@/stores/quiz';
import { useTheme, type ColorToken } from '@/theme';
import { barrierCopy, sensitivityCopy, skinTypeCopy } from '../content';
import { stepNav } from '../steps';

/**
 * O14 (mockup 03). Computed on the device with the same function the API uses, so the result
 * shown here is exactly what gets saved after sign-up.
 */
export function ResultStep() {
  const a = useQuiz((s) => s.answers);
  const { colors, spacing, radius } = useTheme();
  const { progress, next, back } = stepNav('result');

  const { shine } = a;
  if (
    !shine?.tZone ||
    !shine.cheeks ||
    !shine.jaw ||
    !a.afterWash ||
    !a.seasonal ||
    !a.symptoms ||
    !a.reactionFrequency ||
    !a.triggers
  ) {
    return <Redirect href={{ pathname: '/onboarding/[step]', params: { step: 'shine' } }} />;
  }
  const skin = computeSkinProfile({
    ...(a as Parameters<typeof computeSkinProfile>[0]),
    shine: { tZone: shine.tZone, cheeks: shine.cheeks, jaw: shine.jaw },
  });
  const copy = skinTypeCopy[skin.skinType];
  // Combination sits between balanced and oily on the scale, whatever the raw sum.
  const position =
    skin.skinType === 'combination'
      ? Math.min(0.7, Math.max(0.55, (skin.oilLevel + 3) / 6))
      : (skin.oilLevel + 3) / 6;

  return (
    <QuestionScreen progress={progress} onBack={back} onNext={next} background="accentSoft">
      <View
        style={[
          styles.titleCard,
          { backgroundColor: colors.background, borderRadius: radius.card + 12 },
        ]}
      >
        <Text variant="section" align="center" style={{ fontSize: 30, lineHeight: 36 }}>
          Twój typ skóry
        </Text>
      </View>
      <View
        style={[styles.badge, { borderColor: colors.primary, backgroundColor: colors.background }]}
      >
        <DropIcon size={44} color={colors.primary} weight="duotone" />
        <DropIcon size={30} color={colors.primary} weight="duotone" />
      </View>
      <View
        style={{
          backgroundColor: colors.background,
          borderRadius: radius.card + 12,
          padding: spacing.xl,
          gap: spacing.xl,
        }}
      >
        <Text variant="caption" style={{ fontSize: 17 }}>
          Poziom sebum
        </Text>
        <SkinScale position={position} label={`Ty: ${copy.name}`} />
        <View
          style={{
            backgroundColor: colors.accentSoft,
            borderRadius: radius.card,
            padding: spacing.screen,
            gap: spacing.sm,
          }}
        >
          <View style={[styles.row, { gap: spacing.sm }]}>
            <SparkleIcon size={20} color={colors.accent} />
            <Text variant="productName" color="primary" style={{ flex: 1 }}>
              {copy.headline}
            </Text>
          </View>
          <Text color="primary">{copy.advice}</Text>
        </View>
        <MeterRow
          icon={DropIcon}
          tint="caution"
          soft="cautionSoft"
          label="Bariera ochronna"
          value={barrierCopy[skin.barrierLevel]}
          level={skin.barrierLevel}
          max={3}
        />
        <MeterRow
          icon={PlantIcon}
          tint="bad"
          soft="badSoft"
          label="Wrażliwość"
          value={sensitivityCopy[skin.sensitivityLevel] ?? sensitivityCopy[0]}
          level={skin.sensitivityLevel}
          max={4}
        />
        <Text variant="caption" align="center">
          To obraz chwili, nie diagnoza. Skóra zmienia się z porą roku — profil zaktualizujesz w
          każdej chwili.
        </Text>
      </View>
    </QuestionScreen>
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
    <View style={[styles.row, { gap: spacing.lg }]}>
      <View style={[styles.meterIcon, { backgroundColor: colors[props.soft] }]}>
        <Icon size={26} color={colors[props.tint]} weight="fill" />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="caption">{props.label}</Text>
        <Text variant="productName" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 20 }}>
          {props.value}
        </Text>
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

const styles = StyleSheet.create({
  titleCard: { paddingVertical: 28 },
  badge: {
    alignSelf: 'center',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  meterIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
