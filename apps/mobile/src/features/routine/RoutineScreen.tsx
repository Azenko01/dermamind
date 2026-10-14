import { TIMES_OF_DAY, type RoutineStep, type TimeOfDay } from '@dermamind/scoring';
import { router } from 'expo-router';
import {
  DotsThreeIcon,
  DropIcon,
  MoonIcon,
  PlusIcon,
  SparkleIcon,
  SunIcon,
} from 'phosphor-react-native';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RoutineScoreCard } from '@/components/features/RoutineScoreCard';
import { RoutineSlotRow } from '@/components/features/RoutineSlotRow';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useMe } from '@/features/auth/useMe';
import { useTheme } from '@/theme';
import { useGenerateRoutine, useRoutines, useSetSlot, type Routines } from './api';
import { conflictCopy, plural, timeCopy } from './copy';

/** T3 "Moja rutyna" (mockup 08, PLAN.md 6.2). Works fully without AI. */
export function RoutineScreen() {
  const { colors, spacing } = useTheme();
  const routines = useRoutines();
  const generate = useGenerateRoutine();
  const name = useMe().data?.profile.displayName;

  const runGenerate = () => {
    const filled =
      routines.data &&
      (routines.data.am.steps.some((s) => s.product) ||
        routines.data.pm.steps.some((s) => s.product));
    const go = () =>
      generate.mutate(undefined, {
        onError: (e) => Alert.alert('Nie udało się', e.message),
      });
    if (filled) {
      Alert.alert(
        'Ułożyć rutynę od nowa?',
        'Zastąpimy obecne produkty najlepiej dopasowanymi z bazy.',
        [
          { text: 'Anuluj', style: 'cancel' },
          { text: 'Ułóż', onPress: go },
        ],
      );
    } else go();
  };

  const menu = () =>
    Alert.alert('Rutyna', undefined, [
      { text: 'Ułóż rutynę automatycznie', onPress: runGenerate },
      { text: 'Anuluj', style: 'cancel' },
    ]);

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.backgroundAlt }]}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.screen,
          gap: spacing.xl,
          paddingBottom: spacing.xxl * 2,
        }}
      >
        <View style={styles.header}>
          <Text
            variant="title"
            accessibilityRole="header"
            style={{ flex: 1, fontFamily: 'Inter_600SemiBold' }}
          >
            Moja rutyna
          </Text>
          <RoundButton label="Więcej opcji" onPress={menu}>
            <DotsThreeIcon size={26} weight="bold" color={colors.textPrimary} />
          </RoundButton>
          <RoundButton label="Dodaj produkt" primary onPress={() => router.push('/explore')}>
            <PlusIcon size={24} weight="bold" color={colors.background} />
          </RoundButton>
        </View>

        {routines.isPending || generate.isPending ? (
          <View style={{ gap: spacing.md, alignItems: 'center', marginTop: spacing.xxl }}>
            <ActivityIndicator color={colors.primary} />
            {generate.isPending ? <Text color="textSecondary">Układamy rutynę…</Text> : null}
          </View>
        ) : routines.isError ? (
          <View style={{ gap: spacing.md }}>
            <Text>Nie udało się wczytać rutyny.</Text>
            <SecondaryButton title="Spróbuj ponownie" onPress={() => void routines.refetch()} />
          </View>
        ) : (
          <RoutineBody data={routines.data} name={name ?? null} onGenerate={runGenerate} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RoutineBody({
  data,
  name,
  onGenerate,
}: {
  data: Routines;
  name: string | null;
  onGenerate: () => void;
}) {
  const { colors, spacing } = useTheme();
  const setSlot = useSetSlot();
  const empty = data.score.productCount === 0;
  const summary = data.am.summary ?? data.pm.summary;
  const generatedBy = data.am.generatedBy ?? data.pm.generatedBy;

  const message = summary
    ? summary
    : empty
      ? 'Dodaj produkty, których używasz, albo pozwól nam ułożyć rutynę z najlepiej dopasowanych.'
      : data.score.conflicts.length
        ? 'Uwaga — niektóre składniki w Twojej rutynie lepiej rozdzielić. Szczegóły poniżej.'
        : data.score.missingSpf
          ? 'Twoja poranna rutyna jest prawie gotowa. Brakuje tylko filtra SPF.'
          : 'Twoja rutyna wygląda dobrze. Pamiętaj o filtrze także w pochmurne dni.';

  const removeSlot = (time: TimeOfDay, step: RoutineStep, productName: string) =>
    Alert.alert(productName, undefined, [
      {
        text: 'Usuń z rutyny',
        style: 'destructive',
        onPress: () =>
          setSlot.mutate(
            { time, step, productId: null },
            { onError: (e) => Alert.alert('Nie udało się', e.message) },
          ),
      },
      { text: 'Anuluj', style: 'cancel' },
    ]);

  return (
    <View style={{ gap: spacing.xl }}>
      <View
        style={[
          styles.assistant,
          { backgroundColor: colors.accentSoft, padding: spacing.xl, gap: spacing.lg },
        ]}
      >
        <View style={[styles.assistantIcon, { backgroundColor: colors.primary }]}>
          <DropIcon size={26} color={colors.background} />
        </View>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text variant="productName" color="primary">
            {name ? `Cześć, ${name}!` : 'Cześć!'}
          </Text>
          <Text color="primary">{message}</Text>
          {generatedBy === 'ai' ? (
            <View style={[styles.row, { gap: spacing.xs }]}>
              <SparkleIcon size={14} color={colors.accent} />
              <Text variant="caption" style={{ fontSize: 12, lineHeight: 16 }}>
                Opis wygenerowany przez AI · nie jest poradą medyczną
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {empty ? <PrimaryButton title="Ułóż rutynę za mnie" onPress={onGenerate} /> : null}

      <RoutineScoreCard score={data.score} />

      {data.score.conflicts.map((c, i) => (
        <View
          key={i}
          style={[
            styles.conflict,
            {
              borderColor: colors.cautionSoft,
              backgroundColor: colors.background,
              padding: spacing.lg,
              gap: spacing.xs,
            },
          ]}
        >
          <Text variant="bodyStrong" color={c.severity >= 2 ? 'bad' : 'caution'}>
            {c.a.ingredient} + {c.b.ingredient} · {timeCopy[c.time].adverb}
          </Text>
          <Text variant="caption">
            {c.a.productName} i {c.b.productName}
          </Text>
          <Text>{conflictCopy[c.noteKey] ?? 'Te składniki lepiej rozdzielić.'}</Text>
        </View>
      ))}

      {TIMES_OF_DAY.map((time) => {
        const routine = data[time];
        const filled = routine.steps.filter((s) => s.product).length;
        return (
          <View key={time} style={{ gap: spacing.md }}>
            <View style={[styles.row, { gap: spacing.sm }]}>
              {time === 'am' ? (
                <SunIcon size={26} color={colors.caution} />
              ) : (
                <MoonIcon size={26} color={colors.accent} />
              )}
              <Text variant="section" style={{ flex: 1 }}>
                {timeCopy[time].label}
              </Text>
              <Text variant="caption">
                {filled} {plural(filled, 'krok', 'kroki', 'kroków')}
              </Text>
            </View>
            {routine.steps.map((s) => (
              <RoutineSlotRow
                key={s.step}
                position={s.position}
                step={s.step}
                product={s.product}
                onPress={() =>
                  s.product
                    ? router.push({
                        pathname: '/product/[id]',
                        params: { id: String(s.product.id) },
                      })
                    : router.push({ pathname: '/routine/pick', params: { time, step: s.step } })
                }
                onLongPress={
                  s.product ? () => removeSlot(time, s.step, s.product!.name) : undefined
                }
              />
            ))}
          </View>
        );
      })}

      {!empty ? (
        <Text variant="caption" align="center">
          Przytrzymaj produkt, żeby usunąć go z rutyny.
        </Text>
      ) : null}
      <Text variant="caption" align="center">
        {data.disclaimer}
      </Text>
    </View>
  );
}

function RoundButton({
  label,
  onPress,
  primary,
  children,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.round,
        {
          backgroundColor: primary ? colors.primary : colors.background,
          borderColor: colors.border,
          borderWidth: primary ? 0 : 1,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  round: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistant: { flexDirection: 'row', borderRadius: 24 },
  assistantIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conflict: { borderRadius: 20, borderWidth: 1 },
});
