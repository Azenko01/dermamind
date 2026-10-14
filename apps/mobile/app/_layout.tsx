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
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { syncPendingQuiz } from '@/features/auth/actions';
import { queryClient } from '@/lib/queryClient';
import { useSession } from '@/stores/session';
import { useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { scheme, colors } = useTheme();
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

  const ready = fontsLoaded && status !== 'loading';
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
            <Stack.Screen name="analyze" options={{ presentation: 'modal' }} />
            <Stack.Screen name="submit" options={{ presentation: 'modal' }} />
            <Stack.Screen name="scans" />
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
