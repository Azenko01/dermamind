import { forwardRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { typography, useTheme } from '@/theme';
import { Text } from './Text';

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, style, ...rest },
  ref,
) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="caption">{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textSecondary}
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
});

const styles = StyleSheet.create({
  input: { height: 56, borderWidth: 1 },
});
