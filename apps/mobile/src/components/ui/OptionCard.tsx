import { CaretRightIcon, CheckIcon, type IconProps } from 'phosphor-react-native';
import type { ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { RichText, Text } from './Text';

interface Props {
  /** Supports **bold** fragments. */
  title: string;
  description?: string;
  icon?: ComponentType<IconProps>;
  selected?: boolean;
  /** radio = single choice, checkbox = multiple, action = navigates somewhere */
  mode: 'radio' | 'checkbox' | 'action';
  onPress: () => void;
}

/** Answer card: radius 20, 1 px border; selected → 2 px primary border + filled control (PLAN.md 7.3). */
export function OptionCard({
  title,
  description,
  icon: Icon,
  selected = false,
  mode,
  onPress,
}: Props) {
  const { colors, spacing, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole={mode === 'action' ? 'button' : mode}
      accessibilityState={mode === 'action' ? undefined : { checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderRadius: radius.card,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? colors.primary : colors.border,
          // keep the content still when the border gets thicker
          paddingHorizontal: selected ? spacing.screen - 1 : spacing.screen,
          paddingVertical: selected ? spacing.lg + 3 : spacing.lg + 4,
          backgroundColor: colors.background,
          opacity: pressed ? 0.8 : 1,
          gap: spacing.lg,
        },
      ]}
    >
      {Icon ? <Icon size={24} color={colors.accent} /> : null}
      <View style={styles.text}>
        <RichText>{title}</RichText>
        {description ? (
          <Text variant="caption" style={{ marginTop: 2 }}>
            {description}
          </Text>
        ) : null}
      </View>
      {mode === 'radio' ? <Radio selected={selected} /> : null}
      {mode === 'checkbox' ? <Checkbox selected={selected} /> : null}
      {mode === 'action' ? <CaretRightIcon size={20} color={colors.textSecondary} /> : null}
    </Pressable>
  );
}

export function Radio({ selected }: { selected: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.textSecondary }]}>
      {selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}
    </View>
  );
}

export function Checkbox({ selected }: { selected: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.checkbox,
        {
          borderColor: selected ? colors.primary : colors.textSecondary,
          backgroundColor: selected ? colors.primary : 'transparent',
        },
      ]}
    >
      {selected ? <CheckIcon size={18} weight="bold" color={colors.background} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', minHeight: 64 },
  text: { flex: 1 },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 16, height: 16, borderRadius: 8 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
