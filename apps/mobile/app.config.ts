import type { ExpoConfig } from 'expo/config';

// Bundle ID / package are fixed in Sprint 0 and can't change after store release (PLAN.md 2.2).
const config: ExpoConfig = {
  name: 'DermaMind',
  slug: 'dermamind',
  scheme: 'dermamind',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.dermamind.app',
    supportsTablet: false,
  },
  android: {
    package: 'com.dermamind.app',
  },
  plugins: ['expo-router', 'expo-font', 'expo-splash-screen'],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
