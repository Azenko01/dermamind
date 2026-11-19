import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AppearanceMode = 'system' | 'light' | 'dark';

interface AppearanceState {
  /** Profil → Wygląd; 'system' follows the phone setting */
  mode: AppearanceMode;
  setMode: (mode: AppearanceMode) => void;
}

/** Theme choice, kept on the device (AsyncStorage — not secret). */
export const useAppearance = create<AppearanceState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
    }),
    { name: 'dermamind.appearance', storage: createJSONStorage(() => AsyncStorage), version: 1 },
  ),
);
