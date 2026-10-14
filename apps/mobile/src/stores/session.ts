import type { AuthTokens } from '@dermamind/api-client';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

/** Tokens live in the Keychain / Keystore, never in AsyncStorage (PLAN.md 2). */
const KEY = 'dermamind.session';

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: AuthTokens['user'];
}

interface SessionState {
  /** loading until the secure store was read on start-up */
  status: 'loading' | 'signedOut' | 'signedIn';
  session: StoredSession | null;
  hydrate: () => Promise<void>;
  /** Saves tokens without entering the app yet (O22 still has to send the quiz). */
  saveTokens: (tokens: AuthTokens) => Promise<void>;
  enterApp: () => void;
  clear: () => Promise<void>;
}

export const useSession = create<SessionState>((set, get) => ({
  status: 'loading',
  session: null,

  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      const session = raw ? (JSON.parse(raw) as StoredSession) : null;
      set({ session, status: session ? 'signedIn' : 'signedOut' });
    } catch {
      set({ session: null, status: 'signedOut' });
    }
  },

  saveTokens: async ({ accessToken, refreshToken, user }) => {
    const session = { accessToken, refreshToken, user };
    await SecureStore.setItemAsync(KEY, JSON.stringify(session));
    set({ session });
  },

  enterApp: () => {
    if (get().session) set({ status: 'signedIn' });
  },

  clear: async () => {
    await SecureStore.deleteItemAsync(KEY);
    set({ session: null, status: 'signedOut' });
  },
}));
