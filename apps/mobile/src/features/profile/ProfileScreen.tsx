import type { Me } from '@dermamind/api-client';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import {
  CaretRightIcon,
  ClockCounterClockwiseIcon,
  FlagIcon,
  GearIcon,
  SignOutIcon,
  TrashIcon,
  type IconProps,
} from 'phosphor-react-native';
import type { ComponentType } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { DotMeter } from '@/components/ui/DotMeter';
import { Text } from '@/components/ui/Text';
import { deleteAccount, signOut } from '@/features/auth/actions';
import { useMe } from '@/features/auth/useMe';
import { barrierCopy, sensitivityCopy, skinTypeCopy } from '@/features/onboarding/content';
import { useTheme, type ColorToken } from '@/theme';

/** T5 skeleton (PLAN.md 6.2): account card, skin profile, menu, sign out / delete account. */
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
            <SkinCard profile={me.data.profile} />
          </>
        )}

        <Card padded={false}>
          <MenuRow
            icon={ClockCounterClockwiseIcon}
            label="Historia skanów"
            onPress={() => router.push('/scans')}
          />
          <MenuRow icon={FlagIcon} label="Zgłoś produkt" onPress={() => router.push('/submit')} />
          <MenuRow icon={GearIcon} label="Ustawienia" soon last />
        </Card>

        <Card padded={false}>
          <MenuRow
            icon={SignOutIcon}
            label="Wyloguj"
            tone="bad"
            onPress={() => confirmSignOut(me.data?.isGuest ?? false)}
          />
          <MenuRow
            icon={TrashIcon}
            label="Usuń konto i dane"
            tone="bad"
            onPress={confirmDelete}
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

function SkinCard({ profile }: { profile: Me['profile'] }) {
  const { spacing } = useTheme();
  if (!profile.skinType) {
    return (
      <Card>
        <Text variant="productName">Profil skóry</Text>
        <Text variant="caption">Nie masz jeszcze profilu skóry. Quiz pojawi się tu wkrótce.</Text>
      </Card>
    );
  }
  const barrier = (profile.barrierLevel ?? 1) as 1 | 2 | 3;
  const sensitivity = profile.sensitivityLevel ?? 0;
  return (
    <Card>
      <Text variant="label" color="textSecondary">
        Profil skóry
      </Text>
      <Text variant="section">Skóra {skinTypeCopy[profile.skinType].name}</Text>
      <View style={{ gap: spacing.md }}>
        <Meter
          label="Bariera ochronna"
          value={barrierCopy[barrier]}
          level={barrier}
          max={3}
          tint="caution"
          soft="cautionSoft"
        />
        <Meter
          label="Wrażliwość"
          value={sensitivityCopy[sensitivity] ?? ''}
          level={sensitivity}
          max={4}
          tint="bad"
          soft="badSoft"
        />
      </View>
      <SecondaryButton title="Edytuj odpowiedzi — wkrótce" onPress={() => undefined} disabled />
    </Card>
  );
}

function Meter(props: {
  label: string;
  value: string;
  level: number;
  max: number;
  tint: ColorToken;
  soft: ColorToken;
}) {
  return (
    <View style={styles.row}>
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
  onPress?: () => void;
  soon?: boolean;
  tone?: 'bad';
  last?: boolean;
}) {
  const { colors, spacing, sizes } = useTheme();
  const Icon = props.icon;
  const tint = props.tone === 'bad' ? colors.bad : colors.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: props.soon }}
      disabled={props.soon}
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
      <Icon size={22} color={tint} />
      <Text color={props.tone === 'bad' ? 'bad' : 'textPrimary'} style={{ flex: 1 }}>
        {props.label}
      </Text>
      {props.soon ? (
        <Text variant="caption">wkrótce</Text>
      ) : (
        <CaretRightIcon size={18} color={colors.textSecondary} />
      )}
    </Pressable>
  );
}

function confirmSignOut(isGuest: boolean) {
  const message = isGuest
    ? 'Konta gościa nie da się potem odzyskać. Zapisz profil na koncie, jeśli chcesz zachować dane.'
    : undefined;
  Alert.alert('Wylogować się?', message, [
    { text: 'Anuluj', style: 'cancel' },
    { text: 'Wyloguj', style: 'destructive', onPress: () => void signOut() },
  ]);
}

function confirmDelete() {
  Alert.alert(
    'Usunąć konto?',
    'Usuniemy profil skóry, półki i całą historię. Tego nie da się cofnąć.',
    [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń na zawsze',
        style: 'destructive',
        onPress: () =>
          void deleteAccount().then((r) => {
            if (!r.ok) Alert.alert('Nie udało się', r.message);
          }),
      },
    ],
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
