import {
  Inter_400Regular,
  Inter_400Regular_Italic,
  Inter_500Medium,
  Inter_600SemiBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { syncPendingQuiz } from '@/features/auth/actions';
import { queryClient } from '@/lib/queryClient';
import { useAppearance } from '@/stores/appearance';
import { useSession } from '@/stores/session';
import { useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { scheme, colors } = useTheme();
  const mode = useAppearance((s) => s.mode);
  const appearanceReady = useAppearanceHydrated();
  const status = useSession((s) => s.status);
  const hydrate = useSession((s) => s.hydrate);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_400Regular_Italic,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (status === 'signedIn') void syncPendingQuiz();
  }, [status]);

  // Profil → Wygląd also switches native UI (alerts, keyboard, Android system bars)
  useEffect(() => {
    Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
  }, [mode]);
  // root view colour shows behind modals and while screens animate
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  const ready = fontsLoaded && status !== 'loading' && appearanceReady;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;

  const signedIn = status === 'signedIn';
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          {/* Account first only at the end of the quiz (PLAN.md 6.5): signed-out users see onboarding. */}
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="product/[id]" />
            <Stack.Screen name="ingredient/[id]" />
            <Stack.Screen
              name="scan/index"
              options={{ presentation: 'fullScreenModal', animation: 'fade' }}
            />
            <Stack.Screen name="scan/[ean]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="scan/manual" options={{ presentation: 'modal' }} />
            <Stack.Screen name="analyze" options={{ presentation: 'modal' }} />
            <Stack.Screen name="submit" options={{ presentation: 'modal' }} />
            <Stack.Screen name="scans" />
            <Stack.Screen name="about" />
            <Stack.Screen name="skin-profile" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="quiz/[step]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="routine/pick" options={{ presentation: 'modal' }} />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
          {/* E-mail sign-in / sign-up: from O1, O22, and from Profile to save a guest account. */}
          <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

/** Waits for the saved theme choice so the app doesn't flash the wrong theme on start. */
function useAppearanceHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useAppearance.persist.onFinishHydration(onChange),
    () => useAppearance.persist.hasHydrated(),
  );
}
