import { router } from 'expo-router';
import { CaretRightIcon, PlantIcon } from 'phosphor-react-native';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MoodPicker } from '@/components/features/MoodPicker';
import { RoutineSlotRow } from '@/components/features/RoutineSlotRow';
import { WeekStrip } from '@/components/features/WeekStrip';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { Text } from '@/components/ui/Text';
import { useMe } from '@/features/auth/useMe';
import { currentTime, useRoutines, useSetDone, useSetMood, useToday } from '@/features/routine/api';
import { timeCopy } from '@/features/routine/copy';
import { scoreColors, useTheme } from '@/theme';

function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Dzień dobry';
  if (h < 18) return 'Cześć';
  return 'Dobry wieczór';
}

/** T1 "Dziś" (mockup 05): week, skin check-in, routine score, today's routine to tick off. */
export function TodayScreen() {
  const { colors, spacing, radius } = useTheme();
  const me = useMe();
  const today = useToday();
  const routines = useRoutines();
  const setMood = useSetMood();
  const setDone = useSetDone();
  const name = me.data?.profile.displayName ?? null;
  const time = currentTime();

  const routine = routines.data?.[time];
  const filledSteps = routine?.steps.filter((s) => s.product) ?? [];
  const done = today.data?.done[time] ?? [];
  const doneCount = done.filter((p) => filledSteps.some((s) => s.position === p)).length;
  const score = routines.data?.score.score ?? null;

  const toggle = (position: number) => {
    const next = done.includes(position) ? done.filter((p) => p !== position) : [...done, position];
    setDone.mutate(
      { time, doneSteps: next },
      { onError: (e) => Alert.alert('Nie udało się', e.message) },
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.backgroundAlt }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl * 2 }}>
        <View
          style={[
            styles.top,
            { backgroundColor: colors.background, padding: spacing.screen, gap: spacing.lg },
          ]}
        >
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Profil"
              onPress={() => router.push('/profile')}
              style={[styles.avatar, { backgroundColor: colors.accentSoft }]}
            >
              <Text variant="section" color="primary">
                {(name ?? 'D').charAt(0).toUpperCase()}
              </Text>
            </Pressable>
            <Text variant="productName" style={{ flex: 1, textAlign: 'center', marginRight: 56 }}>
              Dziś
            </Text>
          </View>
          {today.data ? <WeekStrip week={today.data.week} today={today.data.day} /> : null}
        </View>

        <View style={{ padding: spacing.screen, gap: spacing.xl }}>
          <Text variant="title" style={{ fontFamily: 'Inter_600SemiBold' }}>
            {greeting()}
            {name ? `, ${name}` : ''}
          </Text>

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.accentSoft,
                borderColor: today.data?.mood ? colors.accentSoft : colors.accent,
                borderRadius: radius.productCard,
                padding: spacing.lg,
                gap: spacing.md,
              },
            ]}
          >
            <Text variant="bodyStrong">Jak dziś Twoja skóra?</Text>
            <MoodPicker
              value={today.data?.mood ?? null}
              onChange={(m) =>
                setMood.mutate(m, { onError: (e) => Alert.alert('Nie udało się', e.message) })
              }
            />
          </View>

          {score !== null ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Wynik rutyny ${score}. Szczegóły`}
              onPress={() => router.push('/routine')}
              style={[
                styles.row,
                {
                  backgroundColor: colors.background,
                  borderRadius: radius.productCard,
                  padding: spacing.lg,
                  gap: spacing.lg,
                },
              ]}
            >
              <ScoreRing score={score} color={scoreColors(score).fg} size={72} />
              <View style={{ flex: 1 }}>
                <Text variant="productName">Wynik rutyny</Text>
                <View style={[styles.row, { gap: 2 }]}>
                  <Text color="accent" variant="bodyStrong">
                    Szczegóły
                  </Text>
                  <CaretRightIcon size={16} color={colors.accent} />
                </View>
              </View>
            </Pressable>
          ) : null}

          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text variant="section">Dzisiejsza rutyna</Text>
            {filledSteps.length ? (
              <Text variant="caption">
                {timeCopy[time].label} · {doneCount} z {filledSteps.length}
              </Text>
            ) : null}
          </View>

          {routines.isPending || today.isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : routines.isError || today.isError ? (
            <SecondaryButton
              title="Spróbuj ponownie"
              onPress={() => {
                void routines.refetch();
                void today.refetch();
              }}
            />
          ) : filledSteps.length === 0 ? (
            <View
              style={[
                styles.empty,
                {
                  backgroundColor: colors.background,
                  borderRadius: radius.productCard,
                  padding: spacing.xl,
                  gap: spacing.md,
                },
              ]}
            >
              <PlantIcon size={48} color={colors.good} weight="duotone" />
              <Text align="center" color="textSecondary">
                {time === 'am' ? 'Poranna' : 'Wieczorna'} rutyna jest jeszcze pusta.
              </Text>
              <PrimaryButton title="Dodaj produkty" onPress={() => router.push('/routine')} />
            </View>
          ) : (
            <View
              style={[
                styles.list,
                { backgroundColor: colors.background, borderRadius: radius.productCard },
              ]}
            >
              {filledSteps.map((s, i) => (
                <View
                  key={s.step}
                  style={
                    i
                      ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }
                      : null
                  }
                >
                  <RoutineSlotRow
                    position={s.position}
                    step={s.step}
                    product={s.product}
                    done={done.includes(s.position)}
                    onToggleDone={() => toggle(s.position)}
                    onPress={() =>
                      router.push({
                        pathname: '/product/[id]',
                        params: { id: String(s.product!.id) },
                      })
                    }
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  header: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { borderWidth: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  empty: { alignItems: 'center' },
  list: { overflow: 'hidden' },
});
