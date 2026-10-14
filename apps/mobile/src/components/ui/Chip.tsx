import { PlusIcon, XIcon, type IconProps } from 'phosphor-react-native';
import type { ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

interface ChipProps {
  label: string;
  icon?: ComponentType<IconProps>;
  selected?: boolean;
  /** avoid → red chip with ×, add → neutral chip with + (O16) */
  tone?: 'default' | 'avoid' | 'add';
  onPress: () => void;
}

/** Fully rounded chip with an accent icon (PLAN.md 7.3). */
export function Chip({
  label,
  icon: Icon,
  selected = false,
  tone = 'default',
  onPress,
}: ChipProps) {
  const { colors, spacing } = useTheme();
  const avoid = tone === 'avoid';
  const bg = avoid ? colors.badSoft : selected ? colors.accentSoft : colors.background;
  const border = avoid ? colors.badSoft : selected ? colors.primary : colors.border;
  return (
    <Pressable
      accessibilityRole={tone === 'default' ? 'checkbox' : 'button'}
      accessibilityState={tone === 'default' ? { checked: selected } : undefined}
      accessibilityLabel={avoid ? `Usuń ${label}` : tone === 'add' ? `Dodaj ${label}` : label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: selected && !avoid ? 2 : 1,
          paddingHorizontal: spacing.lg - (selected && !avoid ? 1 : 0),
          gap: spacing.sm,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {Icon ? <Icon size={20} color={colors.accent} /> : null}
      {tone === 'add' ? <PlusIcon size={16} color={colors.accent} weight="bold" /> : null}
      <Text variant="caption" color={avoid ? 'bad' : 'textPrimary'}>
        {label}
      </Text>
      {avoid ? <XIcon size={16} color={colors.bad} weight="bold" /> : null}
    </Pressable>
  );
}

export function ChipGroup({ children }: { children: React.ReactNode }) {
  const { spacing } = useTheme();
  return <View style={[styles.group, { gap: spacing.sm }]}>{children}</View>;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    minHeight: 44,
  },
  group: { flexDirection: 'row', flexWrap: 'wrap' },
});
