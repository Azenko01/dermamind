import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { LinkButton, PrimaryButton } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { loginWithEmail } from '@/features/auth/actions';
import { AuthForm, leaveAuth } from '@/features/auth/AuthForm';
import { useTheme } from '@/theme';

export default function LoginScreen() {
  const { spacing } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    const result = await loginWithEmail({ email: email.trim(), password });
    setBusy(false);
    if (!result.ok) return setError(result.message);
    leaveAuth(router);
  };

  return (
    <AuthForm title="Zaloguj się">
      <View style={{ gap: spacing.lg }}>
        <TextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <TextField
          label="Hasło"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={submit}
        />
        {error ? <Text color="bad">{error}</Text> : null}
        <PrimaryButton
          title="Zaloguj się"
          onPress={submit}
          disabled={!email.trim() || !password}
          loading={busy}
        />
        <View style={{ alignItems: 'center', gap: spacing.lg }}>
          <LinkButton title="Nie pamiętam hasła" onPress={() => router.push('/auth/reset')} />
          <LinkButton
            title="Nie mam konta — załóż je"
            color="textSecondary"
            onPress={() => router.replace('/auth/register')}
          />
        </View>
      </View>
    </AuthForm>
  );
}
