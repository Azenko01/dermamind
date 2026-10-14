import Constants from 'expo-constants';

/**
 * Public runtime config — only the API address, the app holds no secrets (PLAN.md 2.2).
 * In development without EXPO_PUBLIC_API_URL we reuse the host Metro runs on, so Expo Go on a phone
 * in the same Wi-Fi reaches the API on the laptop without extra setup.
 */
function devApiUrl(): string {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:3000` : 'http://localhost:3000';
}

export const apiUrl = process.env.EXPO_PUBLIC_API_URL || devApiUrl();
