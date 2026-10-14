import { router } from 'expo-router';
import { AppleLogoIcon, EnvelopeIcon, GoogleLogoIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinkButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { ProgressHeader } from '@/components/ui/ProgressHeader';
import { Text } from '@/components/ui/Text';
import { continueAsGuest } from '@/features/auth/actions';
import { useTheme } from '@/theme';
import { stepNav } from '../steps';

// TODO: real Sign in with Apple / Google once the developer accounts exist (API answers 501 now).
const notYet = (provider: string) =>
  Alert.alert(
    `${provider} — już niedługo`,
    'Na razie zapisz profil przez e-mail albo kontynuuj bez konta.',
  );

/** O22: the account comes last; until now answers lived only on the device. */
export function SaveStep() {
  const { colors, spacing } = useTheme();
  const { progress, back } = stepNav('save');
  const [busy, setBusy] = useState(false);

  const guest = async () => {
    setBusy(true);
    const result = await continueAsGuest();
    setBusy(false);
    if (result.ok) router.replace('/');
    else Alert.alert('Nie udało się', result.message);
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <ProgressHeader progress={progress} onBack={back} />
      <View style={[styles.body, { padding: spacing.screen, gap: spacing.md }]}>
        <Text variant="title">Zapisz swój profil</Text>
        <Text variant="caption" style={{ fontSize: 17, lineHeight: 24 }}>
          Dzięki temu wyniki i rutyna będą na Ciebie czekać, także na innym telefonie.
        </Text>
      </View>
      <View style={{ padding: spacing.screen, gap: spacing.md }}>
        {Platform.OS === 'ios' ? (
          <PrimaryButton
            title="Kontynuuj z Apple"
            icon={<AppleLogoIcon size={22} weight="fill" color={colors.background} />}
            onPress={() => notYet('Logowanie przez Apple')}
          />
        ) : null}
        <SecondaryButton
          title="Kontynuuj z Google"
          icon={<GoogleLogoIcon size={22} weight="bold" color={colors.textPrimary} />}
          onPress={() => notYet('Logowanie przez Google')}
        />
        <SecondaryButton
          title="Więcej opcji: e-mail"
          icon={<EnvelopeIcon size={22} color={colors.textPrimary} />}
          onPress={() => router.push('/auth/register')}
        />
        <View style={[styles.center, { paddingVertical: spacing.sm }]}>
          <LinkButton
            title={busy ? 'Chwileczkę…' : 'Kontynuuj bez konta'}
            color="textSecondary"
            onPress={busy ? () => undefined : guest}
          />
        </View>
        <Text variant="caption" align="center">
          Kontynuując, akceptujesz Regulamin i Politykę prywatności. Aplikacja ma charakter
          informacyjny i nie zastępuje porady dermatologa.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
  center: { alignItems: 'center' },
});
