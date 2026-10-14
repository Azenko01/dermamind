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
  plugins: [
    'expo-router',
    'expo-font',
    'expo-splash-screen',
    'expo-secure-store',
    [
      'expo-camera',
      {
        // Polish system dialog text (iOS Info.plist). Expo Go shows its own text; this one is for our builds.
        cameraPermission:
          'DermaMind używa aparatu tylko do skanowania kodów kreskowych kosmetyków, żeby pokazać ich skład i dopasowanie do Twojej skóry.',
        microphonePermission: false,
        recordAudioAndroid: false,
        barcodeScannerEnabled: true,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
