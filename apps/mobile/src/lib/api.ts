import type { AuthTokens, paths } from '@dermamind/api-client';
import createClient from 'openapi-fetch';
import { useSession } from '@/stores/session';
import { apiUrl } from './config';

/** Requests that must never trigger a refresh-and-retry. */
const NO_REFRESH = ['/v1/auth/login', '/v1/auth/register', '/v1/auth/refresh', '/v1/auth/guest'];

let refreshing: Promise<string | null> | null = null;

/**
 * One refresh at a time: refresh tokens are single-use on the server, so two parallel refreshes
 * with the same token would look like token theft and sign the user out everywhere.
 */
function refreshAccessToken(): Promise<string | null> {
  refreshing ??= (async () => {
    const { session, saveTokens, clear } = useSession.getState();
    if (!session) return null;
    try {
      const res = await fetch(`${apiUrl}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
      if (!res.ok) {
        await clear();
        return null;
      }
      const tokens = (await res.json()) as AuthTokens;
      await saveTokens(tokens);
      return tokens.accessToken;
    } catch {
      return null; // offline: keep the session, the request just fails
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** Adds the access token; on 401 refreshes once and retries the original request. */
async function authFetch(input: Request): Promise<Response> {
  const retry = input.clone();
  const token = useSession.getState().session?.accessToken;
  if (token && !input.headers.has('Authorization'))
    input.headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(input);
  const path = new URL(input.url).pathname;
  if (res.status !== 401 || !token || NO_REFRESH.includes(path)) return res;

  const fresh = await refreshAccessToken();
  if (!fresh) return res;
  retry.headers.set('Authorization', `Bearer ${fresh}`);
  return fetch(retry);
}

export const api = createClient<paths>({ baseUrl: apiUrl, fetch: authFetch });

/** Polish message for a failed request — server messages are English and meant for developers. */
export function errorText(
  status: number | undefined,
  byStatus: Partial<Record<number, string>> = {},
) {
  if (status === undefined)
    return 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.';
  if (byStatus[status]) return byStatus[status];
  if (status === 429) return 'Za dużo prób. Odczekaj chwilę i spróbuj ponownie.';
  return 'Coś poszło nie tak. Spróbuj ponownie.';
}
