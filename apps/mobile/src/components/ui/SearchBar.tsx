import { MagnifyingGlassIcon, ScanIcon, XIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { typography, useTheme } from '@/theme';

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  onScan?: () => void;
  placeholder?: string;
}

/** Search field with the scanner button (PLAN.md 6.2: the scanner lives here, not in a tab). */
export function SearchBar({
  value,
  onChangeText,
  onScan,
  placeholder = 'Szukaj kosmetyków',
}: Props) {
  const { colors, spacing, sizes } = useTheme();
  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: colors.surface, paddingHorizontal: spacing.screen, gap: spacing.md },
      ]}
    >
      <MagnifyingGlassIcon size={24} color={colors.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel={placeholder}
        style={[typography.body, styles.input, { color: colors.textPrimary }]}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Wyczyść"
          hitSlop={12}
          onPress={() => onChangeText('')}
        >
          <XIcon size={20} color={colors.textSecondary} />
        </Pressable>
      ) : onScan ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skanuj kod kreskowy"
          onPress={onScan}
          style={{ minWidth: sizes.minTouchTarget, alignItems: 'flex-end' }}
        >
          <ScanIcon size={26} color={colors.textPrimary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', height: 64, borderRadius: 32 },
  input: { flex: 1, height: '100%' },
});
