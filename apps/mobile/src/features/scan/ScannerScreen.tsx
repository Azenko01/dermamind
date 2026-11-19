import { isValidEan, normalizeEan } from '@dermamind/scoring';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { ClipboardTextIcon, FlashlightIcon, KeyboardIcon, XIcon } from 'phosphor-react-native';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';
import { openByEan } from './lookup';

const FRAME_W = 0.8;
const FRAME_H = 0.36;

/** D4 scanner (PLAN.md 6.5 flow 2): EAN-13 / EAN-8, torch, frame, haptic on a hit. */
export function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  // the camera fires many events per second — handle one code at a time
  const handling = useRef(false);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors, spacing } = useTheme();

  const onScanned = async ({ data }: BarcodeScanningResult) => {
    const ean = normalizeEan(data);
    if (handling.current || !isValidEan(ean)) return;
    handling.current = true;
    setBusy(true);
    setError(undefined);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const error = await openByEan(ean);
    if (!error) return;
    setError(error);
    setBusy(false);
    // let the user move the phone away before trying the same code again
    setTimeout(() => (handling.current = false), 1500);
  };

  if (!permission) return <View style={[styles.root, { backgroundColor: colors.camera }]} />;

  if (!permission.granted) {
    return (
      <View
        style={[
          styles.root,
          styles.center,
          { backgroundColor: colors.background, padding: spacing.screen, gap: spacing.lg },
        ]}
      >
        <Text variant="title" align="center">
          Potrzebujemy aparatu
        </Text>
        <Text align="center" color="textSecondary">
          Aparat służy tylko do odczytania kodu kreskowego z opakowania. Niczego nie nagrywamy.
        </Text>
        {permission.canAskAgain ? (
          <PrimaryButton title="Zezwól na aparat" onPress={() => void requestPermission()} />
        ) : (
          <PrimaryButton title="Otwórz ustawienia" onPress={() => void Linking.openSettings()} />
        )}
        <SecondaryButton title="Wpisz kod ręcznie" onPress={() => router.replace('/scan/manual')} />
        <SecondaryButton
          title="Wklej skład zamiast skanować"
          onPress={() => router.replace('/analyze')}
        />
        <SecondaryButton title="Zamknij" onPress={() => router.back()} />
      </View>
    );
  }

  const dim = { flex: 1, backgroundColor: colors.scrim };
  const frameW = width * FRAME_W;
  const frameH = width * FRAME_H;
  return (
    <View style={[styles.root, { backgroundColor: colors.camera }]}>
      {/* light status bar over the camera in both themes */}
      <StatusBar style="light" />
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a'] }}
        onBarcodeScanned={busy ? undefined : (r) => void onScanned(r)}
      />

      {/* dimmed surroundings with a clear frame in the middle */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={dim} />
        <View style={{ flexDirection: 'row', height: frameH }}>
          <View style={dim} />
          <View style={{ width: frameW, height: frameH }}>
            {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
              <View
                key={c}
                style={[styles.corner, cornerStyle(c), { borderColor: colors.onScrim }]}
              />
            ))}
          </View>
          <View style={dim} />
        </View>
        <View
          style={[
            dim,
            { alignItems: 'center', paddingTop: spacing.xl, paddingHorizontal: spacing.screen },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.onScrim} />
          ) : (
            <Text align="center" color="onScrim">
              {error ?? 'Skieruj aparat na kod kreskowy na opakowaniu'}
            </Text>
          )}
        </View>
      </View>

      <View
        style={[styles.topBar, { top: insets.top + spacing.sm, paddingHorizontal: spacing.screen }]}
      >
        <RoundButton label="Zamknij" onPress={() => router.back()}>
          <XIcon size={24} color={colors.onScrim} weight="bold" />
        </RoundButton>
        <RoundButton
          label={torch ? 'Wyłącz latarkę' : 'Włącz latarkę'}
          onPress={() => setTorch((t) => !t)}
          active={torch}
        >
          <FlashlightIcon
            size={24}
            color={torch ? colors.camera : colors.onScrim}
            weight={torch ? 'fill' : 'regular'}
          />
        </RoundButton>
      </View>

      <View style={[styles.bottom, { bottom: insets.bottom + spacing.xl, gap: spacing.md }]}>
        <Pill
          label="Wpisz kod ręcznie"
          icon={<KeyboardIcon size={20} color={colors.onScrim} />}
          onPress={() => router.replace('/scan/manual')}
        />
        <Pill
          label="Brak kodu? Wklej skład"
          icon={<ClipboardTextIcon size={20} color={colors.onScrim} />}
          onPress={() => router.replace('/analyze')}
        />
      </View>
    </View>
  );
}

function Pill({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  const { colors, spacing } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        { gap: spacing.sm, backgroundColor: colors.scrimStrong, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {icon}
      <Text variant="bodyStrong" color="onScrim">
        {label}
      </Text>
    </Pressable>
  );
}

function RoundButton({
  label,
  onPress,
  active,
  children,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.round, { backgroundColor: active ? colors.onScrim : colors.scrimStrong }]}
    >
      {children}
    </Pressable>
  );
}

const CORNER = 28;
function cornerStyle(c: 'tl' | 'tr' | 'bl' | 'br') {
  return {
    top: c[0] === 't' ? 0 : undefined,
    bottom: c[0] === 'b' ? 0 : undefined,
    left: c[1] === 'l' ? 0 : undefined,
    right: c[1] === 'r' ? 0 : undefined,
    borderTopWidth: c[0] === 't' ? 4 : 0,
    borderBottomWidth: c[0] === 'b' ? 4 : 0,
    borderLeftWidth: c[1] === 'l' ? 4 : 0,
    borderRightWidth: c[1] === 'r' ? 4 : 0,
  };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderRadius: 4 },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
});
