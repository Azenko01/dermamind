import {
  SmileyBlankIcon,
  SmileyIcon,
  SmileyMehIcon,
  SmileySadIcon,
  SmileyWinkIcon,
  type IconProps,
} from 'phosphor-react-native';
import type { ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

const MOODS: { value: number; label: string; icon: ComponentType<IconProps> }[] = [
  { value: 1, label: 'źle', icon: SmileySadIcon },
  { value: 2, label: 'tak sobie', icon: SmileyMehIcon },
  { value: 3, label: 'ok', icon: SmileyBlankIcon },
  { value: 4, label: 'dobrze', icon: SmileyIcon },
  { value: 5, label: 'super', icon: SmileyWinkIcon },
];

/** "Jak dziś Twoja skóra?" — five faces (mockup 05). */
export function MoodPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.row, { gap: spacing.xs }]} accessibilityRole="radiogroup">
      {MOODS.map((m) => {
        const selected = value === m.value;
        const Icon = m.icon;
        return (
          <Pressable
            key={m.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={m.label}
            onPress={() => onChange(m.value)}
            style={styles.item}
          >
            <View
              style={[
                styles.face,
                { backgroundColor: selected ? colors.primary : colors.background },
              ]}
            >
              <Icon
                size={30}
                color={selected ? colors.background : colors.textPrimary}
                weight={selected ? 'fill' : 'regular'}
              />
            </View>
            <Text
              variant="caption"
              align="center"
              numberOfLines={2}
              style={{ fontSize: 13, lineHeight: 16 }}
            >
              {m.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  item: { alignItems: 'center', flex: 1, gap: 4 },
  face: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
