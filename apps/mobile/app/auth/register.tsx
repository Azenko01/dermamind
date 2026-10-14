import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { PrimaryButton } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { registerWithEmail } from '@/features/auth/actions';
import { AuthForm, leaveAuth } from '@/features/auth/AuthForm';
import { useSession } from '@/stores/session';
import { useTheme } from '@/theme';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** E-mail sign-up from O22, or "Zapisz profil" for a guest (the API upgrades the guest in place). */
export default function RegisterScreen() {
  const { spacing } = useTheme();
  const isGuest = useSession((s) => s.session?.user.isGuest ?? false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const emailOk = EMAIL.test(email.trim());
  const passwordOk = password.length >= 8;

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    const result = await registerWithEmail({
      email: email.trim(),
      password,
      displayName: name.trim() || undefined,
    });
    setBusy(false);
    if (!result.ok) return setError(result.message);
    if (isGuest) router.back();
    else leaveAuth(router);
  };

  return (
    <AuthForm
      title={isGuest ? 'Zapisz swój profil' : 'Załóż konto'}
      subtitle="Twoje odpowiedzi z quizu zapiszemy na koncie."
    >
      <View style={{ gap: spacing.lg }}>
        <TextField
          label="Imię (opcjonalnie)"
          value={name}
          onChangeText={setName}
          autoComplete="given-name"
          textContentType="givenName"
          maxLength={50}
        />
        <TextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          error={email && !emailOk ? 'Wpisz poprawny adres e-mail' : undefined}
        />
        <TextField
          label="Hasło (min. 8 znaków)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          maxLength={128}
        />
        {error ? <Text color="bad">{error}</Text> : null}
        <PrimaryButton
          title="Załóż konto"
          onPress={submit}
          disabled={!emailOk || !passwordOk}
          loading={busy}
        />
      </View>
    </AuthForm>
  );
}
