import type { Ref } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
} from 'react-native';
import { typography, useTheme } from '@/theme';
import { Text } from './Text';

interface Props extends Omit<TextInputProps, 'ref'> {
  label: string;
  error?: string;
  /** React 19: ref is a plain prop; RN 0.88 types it as an instance type. */
  ref?: Ref<TextInputInstance>;
}

export function TextField({ label, error, style, ref, ...rest }: Props) {
  const { colors, spacing, radius, scheme } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="caption">{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textSecondary}
        keyboardAppearance={scheme}
        style={[
          typography.body,
          styles.input,
          {
            color: colors.textPrimary,
            backgroundColor: colors.surface,
            borderColor: error ? colors.bad : colors.surface,
            borderRadius: radius.card,
            paddingHorizontal: spacing.lg,
          },
          style,
        ]}
        accessibilityLabel={label}
        {...rest}
      />
      {error ? (
        <Text variant="caption" color="bad">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { height: 56, borderWidth: 1 },
});
