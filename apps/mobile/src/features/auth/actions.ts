import type { AuthTokens } from '@dermamind/api-client';
import { api, errorText } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { completeAnswers, useQuiz } from '@/stores/quiz';
import { useSession } from '@/stores/session';

export type Result = { ok: true } | { ok: false; message: string };

/**
 * After sign-up / sign-in: store tokens, send the local quiz answers (if the quiz was finished on this
 * device), then enter the app. The quiz is kept locally if sending fails, so nothing is lost.
 */
async function finish(tokens: AuthTokens): Promise<Result> {
  await useSession.getState().saveTokens(tokens);
  const answers = completeAnswers(useQuiz.getState().answers);
  if (answers) {
    const { error, response } = await api.PUT('/v1/me/quiz', { body: answers });
    if (error) return { ok: false, message: errorText(response.status) };
    useQuiz.getState().reset();
  }
  queryClient.clear();
  useSession.getState().enterApp();
  return { ok: true };
}

/** Upgrades the current guest in place when there is one (the API keeps the same account). */
export async function registerWithEmail(body: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<Result> {
  const { data, error, response } = await api.POST('/v1/auth/register', { body });
  if (error || !data) {
    return {
      ok: false,
      message: errorText(response?.status, {
        409: 'To konto już istnieje. Zaloguj się albo użyj innego adresu e-mail.',
        400: 'Sprawdź adres e-mail. Hasło musi mieć co najmniej 8 znaków.',
      }),
    };
  }
  return finish(data);
}

export async function loginWithEmail(body: { email: string; password: string }): Promise<Result> {
  const { data, error, response } = await api.POST('/v1/auth/login', { body });
  if (error || !data) {
    return {
      ok: false,
      message: errorText(response?.status, {
        401: 'Nieprawidłowy e-mail lub hasło.',
        400: 'Wpisz poprawny adres e-mail i hasło.',
      }),
    };
  }
  return finish(data);
}

export async function continueAsGuest(): Promise<Result> {
  const { data, error, response } = await api.POST('/v1/auth/guest');
  if (error || !data) return { ok: false, message: errorText(response?.status) };
  return finish(data);
}

export async function requestPasswordReset(email: string): Promise<Result> {
  const { error, response } = await api.POST('/v1/auth/password/reset', { body: { email } });
  if (error) return { ok: false, message: errorText(response?.status) };
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const session = useSession.getState().session;
  if (session) {
    // best effort: even offline the device forgets the tokens
    await api
      .POST('/v1/auth/logout', { body: { refreshToken: session.refreshToken } })
      .catch(() => undefined);
  }
  queryClient.clear();
  await useSession.getState().clear();
}

export async function deleteAccount(): Promise<Result> {
  const { error, response } = await api.DELETE('/v1/me');
  if (error) return { ok: false, message: errorText(response.status) };
  queryClient.clear();
  useQuiz.getState().reset();
  await useSession.getState().clear();
  return { ok: true };
}
