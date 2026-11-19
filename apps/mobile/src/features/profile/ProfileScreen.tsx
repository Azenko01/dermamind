import type { Me } from '@dermamind/api-client';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import {
  CaretRightIcon,
  ClockCounterClockwiseIcon,
  FlagIcon,
  GearIcon,
  InfoIcon,
  UserCircleIcon,
  type IconProps,
} from 'phosphor-react-native';
import type { ComponentType } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useMe } from '@/features/auth/useMe';
import { useTheme } from '@/theme';
import { startRetake } from './quizEditing';
import { NoProfile } from './SkinProfileScreen';
import { avoidLabels, concernLabels, quizDate, SkinResultCard, TagList } from './skinSummary';

/** T5 Profil (PLAN.md 6.2): account, skin profile (D6), menu. Settings live in D8. */
export function ProfileScreen() {
  const { colors, spacing } = useTheme();
  const me = useMe();

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.backgroundAlt }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.screen, gap: spacing.xl }}>
        <Text variant="title" accessibilityRole="header">
          Profil
        </Text>
        {me.isPending ? (
          <ActivityIndicator color={colors.primary} />
        ) : me.isError ? (
          <Card>
            <Text>Nie udało się wczytać profilu.</Text>
            <SecondaryButton title="Spróbuj ponownie" onPress={() => void me.refetch()} />
          </Card>
        ) : (
          <>
            <AccountCard me={me.data} />
            {me.data.profile.skinType && me.data.profile.quizAnswers ? (
              <SkinCard profile={me.data.profile} />
            ) : (
              <NoProfile />
            )}
          </>
        )}

        <Card padded={false}>
          <MenuRow
            icon={UserCircleIcon}
            label="Profil skóry i odpowiedzi"
            onPress={() => router.push('/skin-profile')}
          />
          <MenuRow
            icon={ClockCounterClockwiseIcon}
            label="Historia skanów"
            onPress={() => router.push('/scans')}
          />
          <MenuRow icon={FlagIcon} label="Zgłoś produkt" onPress={() => router.push('/submit')} />
          <MenuRow icon={InfoIcon} label="O aplikacji" onPress={() => router.push('/about')} />
          <MenuRow
            icon={GearIcon}
            label="Ustawienia"
            onPress={() => router.push('/settings')}
            last
          />
        </Card>

        <Text variant="caption" align="center">
          DermaMind {Constants.expoConfig?.version ?? ''}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function AccountCard({ me }: { me: Me }) {
  const { colors, spacing } = useTheme();
  const name = me.profile.displayName ?? (me.isGuest ? 'Konto gościa' : (me.email ?? ''));
  return (
    <Card>
      <View style={[styles.row, { gap: spacing.lg }]}>
        <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
          <Text variant="section" color="primary">
            {(name[0] ?? '?').toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="productName">{name}</Text>
          <Text variant="caption">{me.isGuest ? 'Dane tylko na tym telefonie' : me.email}</Text>
        </View>
      </View>
      {me.isGuest ? (
        <PrimaryButton
          title="Zapisz profil na koncie"
          onPress={() => router.push('/auth/register')}
        />
      ) : null}
    </Card>
  );
}

/** Skin profile in the style of the O14 result; the card opens D6 with every answer. */
function SkinCard({ profile }: { profile: Me['profile'] }) {
  const { colors, spacing, radius } = useTheme();
  const concerns = concernLabels(profile.concerns);
  const avoided = avoidLabels(profile);
  return (
    <View
      style={{
        backgroundColor: colors.accentSoft,
        borderRadius: radius.card,
        padding: spacing.lg,
        gap: spacing.lg,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Otwiera profil skóry z odpowiedziami"
        onPress={() => router.push('/skin-profile')}
        style={({ pressed }) => ({ gap: spacing.lg, opacity: pressed ? 0.85 : 1 })}
      >
        <SkinResultCard profile={profile} compact />
        {concerns.length ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="label" color="primary">
              Główne problemy
            </Text>
            <TagList items={concerns} tone="neutral" />
          </View>
        ) : null}
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" color="primary">
            Unikasz
          </Text>
          {avoided.length ? (
            <TagList items={avoided} tone="bad" />
          ) : (
            <Text variant="caption" color="primary">
              Niczego
            </Text>
          )}
        </View>
        <View style={[styles.row, { gap: spacing.sm }]}>
          <Text variant="caption" color="primary" style={{ flex: 1 }}>
            {profile.onboardedAt ? `Quiz z ${quizDate(profile.onboardedAt)}` : 'Profil skóry'}
          </Text>
          <Text variant="caption" color="primary">
            Szczegóły i odpowiedzi
          </Text>
          <CaretRightIcon size={16} color={colors.primary} />
        </View>
      </Pressable>
      <SecondaryButton
        title="Wypełnij quiz ponownie"
        onPress={() => startRetake(profile.quizAnswers)}
      />
    </View>
  );
}

function Card({ children, padded = true }: { children: React.ReactNode; padded?: boolean }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.background,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        padding: padded ? spacing.screen : 0,
        gap: spacing.lg,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
}

function MenuRow(props: {
  icon: ComponentType<IconProps>;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  const { colors, spacing, sizes } = useTheme();
  const Icon = props.icon;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.row,
        {
          minHeight: sizes.minTouchTarget + 12,
          paddingHorizontal: spacing.screen,
          gap: spacing.lg,
          borderBottomWidth: props.last ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Icon size={22} color={colors.accent} />
      <Text style={{ flex: 1 }}>{props.label}</Text>
      <CaretRightIcon size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
