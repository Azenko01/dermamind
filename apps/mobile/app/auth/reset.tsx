import { useState } from 'react';
import { View } from 'react-native';
import { PrimaryButton } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { requestPasswordReset } from '@/features/auth/actions';
import { AuthForm } from '@/features/auth/AuthForm';
import { useTheme } from '@/theme';

/** Password reset request. The API side is a stub until an e-mail provider is chosen. */
export default function ResetPasswordScreen() {
  const { spacing } = useTheme();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const result = await requestPasswordReset(email.trim());
    setBusy(false);
    if (result.ok) setSent(true);
    else setError(result.message);
  };

  return (
    <AuthForm title="Nie pamiętasz hasła?" subtitle="Wyślemy link do ustawienia nowego hasła.">
      <View style={{ gap: spacing.lg }}>
        {sent ? (
          <Text>Jeśli konto z tym adresem istnieje, wkrótce dostaniesz wiadomość.</Text>
        ) : (
          <>
            <TextField
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            {error ? <Text color="bad">{error}</Text> : null}
            <PrimaryButton
              title="Wyślij link"
              onPress={submit}
              disabled={!email.trim()}
              loading={busy}
            />
          </>
        )}
      </View>
    </AuthForm>
  );
}
