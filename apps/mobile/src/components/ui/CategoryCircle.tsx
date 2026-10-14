import type { IconProps } from 'phosphor-react-native';
import type { ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

/** Round category button on Odkrywaj (mockup 06). */
export function CategoryCircle({
  label,
  icon: Icon,
  selected,
  highlight,
  outline,
  onPress,
}: {
  label: string;
  icon: ComponentType<IconProps>;
  selected?: boolean;
  /** "Dla Ciebie" uses the accent tint */
  highlight?: boolean;
  /** "Filtry" is white with a border */
  outline?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const bg = selected
    ? colors.primary
    : highlight
      ? colors.accentSoft
      : outline
        ? colors.background
        : colors.surface;
  const fg = selected ? colors.background : highlight ? colors.accent : colors.textPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.item, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View
        style={[
          styles.circle,
          { backgroundColor: bg, borderColor: colors.border, borderWidth: outline ? 1 : 0 },
        ]}
      >
        <Icon size={28} color={fg} weight={highlight || selected ? 'fill' : 'regular'} />
      </View>
      <Text variant="caption" color="textPrimary" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: { alignItems: 'center', gap: 8, width: 84 },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
