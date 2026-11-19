import Constants from 'expo-constants';
import { router } from 'expo-router';
import { SignOutIcon, TrashIcon, type IconProps } from 'phosphor-react-native';
import { useState, type ComponentType, type ReactNode } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinkButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { deleteAccount, signOut } from '@/features/auth/actions';
import { useMe } from '@/features/auth/useMe';
import { api, errorText } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useAppearance, type AppearanceMode } from '@/stores/appearance';
import { useSession } from '@/stores/session';
import { useTheme } from '@/theme';

/** D8 Ustawienia (PLAN.md 6.4): name, password, Wygląd, language, sign out, delete account. */
export function SettingsScreen() {
  const { colors, spacing } = useTheme();
  const me = useMe();
  const isGuest = me.data?.isGuest ?? false;

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.backgroundAlt }]}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: spacing.screen,
            gap: spacing.xl,
            paddingBottom: spacing.xxl * 2,
          }}
        >
          <LinkButton title="Wstecz" color="textSecondary" onPress={() => router.back()} />
          <Text variant="title" accessibilityRole="header">
            Ustawienia
          </Text>

          {/* key: the field starts again from the saved name when it changes */}
          <NameCard
            key={me.data?.profile.displayName ?? ''}
            current={me.data?.profile.displayName ?? null}
          />
          {isGuest ? <GuestCard /> : <PasswordCard />}
          <AppearanceCard />

          <Card title="Język">
            <View style={styles.row}>
              <Text style={{ flex: 1 }}>Polski</Text>
              <Text variant="caption">jedyny dostępny</Text>
            </View>
            <Text variant="caption">
              Aplikacja jest po polsku. Nazwy składników zostają w INCI — tak jak na opakowaniu.
            </Text>
          </Card>

          <Card padded={false}>
            <ActionRow icon={SignOutIcon} label="Wyloguj" onPress={() => confirmSignOut(isGuest)} />
            <ActionRow icon={TrashIcon} label="Usuń konto i dane" onPress={confirmDelete} last />
          </Card>

          <Text variant="caption" align="center">
            DermaMind {Constants.expoConfig?.version ?? ''}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function NameCard({ current }: { current: string | null }) {
  const [name, setName] = useState(current ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const changed = name.trim() !== (current ?? '');

  const save = async () => {
    setBusy(true);
    setMessage(undefined);
    const res = await api
      .PATCH('/v1/me', { body: { displayName: name.trim() || null } })
      .catch(() => null);
    setBusy(false);
    if (!res?.data) return setMessage(errorText(res?.response.status));
    queryClient.setQueryData(['me'], res.data);
    setMessage('Zapisano.');
  };

  return (
    <Card title="Imię">
      <TextField
        label="Jak mamy się do Ciebie zwracać"
        value={name}
        onChangeText={(v) => {
          setName(v);
          setMessage(undefined);
        }}
        maxLength={50}
        autoCapitalize="words"
      />
      {message ? <Text variant="caption">{message}</Text> : null}
      <SecondaryButton title="Zapisz imię" onPress={save} disabled={!changed} loading={busy} />
    </Card>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean }>();

  const save = async () => {
    setBusy(true);
    setMessage(undefined);
    const res = await api
      .POST('/v1/auth/password/change', {
        body: { currentPassword: current, newPassword: next },
      })
      .catch(() => null);
    setBusy(false);
    if (!res?.data) {
      return setMessage({
        ok: false,
        text: errorText(res?.response.status, {
          401: 'Obecne hasło jest nieprawidłowe.',
          400: 'Nowe hasło musi mieć co najmniej 8 znaków.',
        }),
      });
    }
    // other phones are signed out; this one continues with the new tokens
    await useSession.getState().saveTokens(res.data);
    setCurrent('');
    setNext('');
    setMessage({ ok: true, text: 'Hasło zmienione. Na innych urządzeniach zaloguj się ponownie.' });
  };

  return (
    <Card title="Hasło">
      <TextField
        label="Obecne hasło"
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
      />
      <TextField
        label="Nowe hasło (min. 8 znaków)"
        value={next}
        onChangeText={setNext}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      {message ? (
        <Text variant="caption" color={message.ok ? 'good' : 'bad'}>
          {message.text}
        </Text>
      ) : null}
      <SecondaryButton
        title="Zmień hasło"
        onPress={save}
        disabled={!current || next.length < 8}
        loading={busy}
      />
    </Card>
  );
}

function GuestCard() {
  return (
    <Card title="Konto">
      <Text color="textSecondary">
        Korzystasz bez konta — dane są tylko na tym telefonie. Zapisz profil na koncie, żeby go nie
        stracić.
      </Text>
      <PrimaryButton
        title="Zapisz profil na koncie"
        onPress={() => router.push('/auth/register')}
      />
    </Card>
  );
}

const APPEARANCE: { mode: AppearanceMode; label: string }[] = [
  { mode: 'system', label: 'Systemowy' },
  { mode: 'light', label: 'Jasny' },
  { mode: 'dark', label: 'Ciemny' },
];

/** Wygląd: follow the phone, or always light / dark. Saved on the device. */
function AppearanceCard() {
  const { colors, spacing, radius, sizes } = useTheme();
  const mode = useAppearance((s) => s.mode);
  const setMode = useAppearance((s) => s.setMode);
  return (
    <Card title="Wygląd">
      <View
        accessibilityRole="radiogroup"
        style={[styles.segments, { backgroundColor: colors.surface, borderRadius: radius.chip }]}
      >
        {APPEARANCE.map((o) => {
          const selected = o.mode === mode;
          return (
            <Pressable
              key={o.mode}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setMode(o.mode)}
              style={[
                styles.segment,
                {
                  minHeight: sizes.minTouchTarget,
                  borderRadius: radius.chip,
                  margin: spacing.xs,
                  backgroundColor: selected ? colors.background : 'transparent',
                  borderWidth: selected ? 1 : 0,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text variant="bodyStrong" color={selected ? 'textPrimary' : 'textSecondary'}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

function Card({
  title,
  children,
  padded = true,
}: {
  title?: string;
  children: ReactNode;
  padded?: boolean;
}) {
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
      {title ? (
        <Text variant="label" color="textSecondary">
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

function ActionRow(props: {
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
      <Icon size={22} color={colors.bad} />
      <Text color="bad" style={{ flex: 1 }}>
        {props.label}
      </Text>
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
    'Usuniemy profil skóry, półki, rutynę i całą historię. Tego nie da się cofnąć.',
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
  segments: { flexDirection: 'row' },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
