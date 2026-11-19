import { router } from 'expo-router';
import { CaretRightIcon, SparkleIcon } from 'phosphor-react-native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinkButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useMe } from '@/features/auth/useMe';
import { useTheme } from '@/theme';
import { editAnswer, startRetake } from './quizEditing';
import {
  answerRows,
  avoidIngredientLabels,
  avoidLabels,
  concernLabels,
  quizDate,
  SkinResultCard,
  TagList,
} from './skinSummary';

/** D6 "Profil skóry" (PLAN.md 6.4): the O14 result, every answer editable on its own, retake. */
export function SkinProfileScreen() {
  const { colors, spacing, radius, sizes } = useTheme();
  const me = useMe();
  const profile = me.data?.profile;
  const answers = profile?.quizAnswers ?? null;

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.accentSoft }]}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.screen,
          gap: spacing.xl,
          paddingBottom: spacing.xxl * 2,
        }}
      >
        <LinkButton title="Wstecz" color="primary" onPress={() => router.back()} />
        <Text variant="title" accessibilityRole="header">
          Profil skóry
        </Text>

        {me.isPending ? (
          <ActivityIndicator color={colors.primary} />
        ) : me.isError ? (
          <SecondaryButton title="Spróbuj ponownie" onPress={() => void me.refetch()} />
        ) : !profile?.skinType || !answers ? (
          <NoProfile />
        ) : (
          <>
            <SkinResultCard profile={profile} />

            <Section title="Główne problemy">
              <TagList items={concernLabels(profile.concerns)} tone="neutral" />
            </Section>
            <Section title="Unikasz">
              {avoidLabels(profile).length ? (
                <TagList items={avoidLabels(profile)} tone="bad" />
              ) : (
                <Text variant="caption">Niczego — możesz to zmienić niżej.</Text>
              )}
            </Section>

            <View style={{ gap: spacing.md }}>
              <Text variant="section">Twoje odpowiedzi</Text>
              <Text variant="caption">
                Zmień jedną odpowiedź — resztę zostawimy, a wyniki przeliczymy od razu.
              </Text>
              <View
                style={{
                  backgroundColor: colors.background,
                  borderRadius: radius.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  overflow: 'hidden',
                }}
              >
                {answerRows(answers, avoidIngredientLabels(profile)).map((r, i, all) => (
                  <Pressable
                    key={r.step}
                    accessibilityRole="button"
                    accessibilityLabel={`${r.question}: ${r.answer}. Zmień`}
                    onPress={() => editAnswer(answers, r.step)}
                    style={({ pressed }) => [
                      styles.row,
                      {
                        minHeight: sizes.minTouchTarget + 12,
                        paddingHorizontal: spacing.lg,
                        paddingVertical: spacing.md,
                        gap: spacing.md,
                        borderBottomWidth: i === all.length - 1 ? 0 : StyleSheet.hairlineWidth,
                        borderBottomColor: colors.border,
                        opacity: pressed ? 0.6 : 1,
                      },
                    ]}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="caption">{r.question}</Text>
                      <Text>{r.answer}</Text>
                    </View>
                    <CaretRightIcon size={18} color={colors.textSecondary} />
                  </Pressable>
                ))}
              </View>
            </View>

            {profile.onboardedAt ? (
              <Text variant="caption" align="center">
                Quiz wypełniony {quizDate(profile.onboardedAt)}. To obraz chwili, nie diagnoza.
              </Text>
            ) : null}
            <PrimaryButton title="Wypełnij quiz ponownie" onPress={() => startRetake(answers)} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.md }}>
      <Text variant="label" color="textSecondary">
        {title}
      </Text>
      {children}
    </View>
  );
}

/** No skin profile yet (account made from the sign-in screen, or quiz never finished). */
export function NoProfile() {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.background,
        borderRadius: radius.card,
        padding: spacing.xl,
        gap: spacing.lg,
        alignItems: 'center',
      }}
    >
      <SparkleIcon size={40} color={colors.accent} weight="fill" />
      <Text variant="section" align="center">
        Nie masz jeszcze profilu skóry
      </Text>
      <Text align="center" color="textSecondary">
        14 krótkich pytań o Twoją skórę. Potem każdy produkt dostanie Match Score, a rutyna ułoży
        się pod Ciebie.
      </Text>
      <PrimaryButton title="Zrób quiz (2 min)" onPress={() => startRetake(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
