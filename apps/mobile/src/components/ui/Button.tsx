import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '@/theme';
import { Text } from './Text';

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
  accessibilityHint?: string;
}

/** Full-width, 56 high, fully rounded (PLAN.md 7.3). */
export function PrimaryButton({ title, onPress, disabled, loading, icon, style }: ButtonProps) {
  const { colors, sizes } = useTheme();
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height: sizes.primaryButtonHeight,
          backgroundColor: disabled ? colors.primaryDisabled : colors.primary,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.background} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text variant="bodyStrong" color="background" style={styles.title}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** White with a border ("Nie mam jeszcze", "Pomiń"). */
export function SecondaryButton({ title, onPress, disabled, loading, icon, style }: ButtonProps) {
  const { colors, sizes } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height: sizes.primaryButtonHeight,
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.textPrimary} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text variant="bodyStrong">{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function LinkButton({
  title,
  onPress,
  color = 'primary',
}: {
  title: string;
  onPress: () => void;
  color?: 'primary' | 'accent' | 'bad' | 'textSecondary';
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={12}>
      <Text variant="bodyStrong" color={color}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 999, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 18 },
});
