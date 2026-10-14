import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

const DAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

/** Monday…Sunday with today highlighted; a dot marks days with a skin check-in (mockup 05). */
export function WeekStrip({
  week,
  today,
}: {
  week: { day: string; mood: number | null }[];
  today: string;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View style={styles.row}>
      {week.map((d, i) => {
        const isToday = d.day === today;
        return (
          <View
            key={d.day}
            accessible
            accessibilityLabel={`${DAYS[i]} ${Number(d.day.slice(8))}${isToday ? ', dziś' : ''}${d.mood ? ', zapisany nastrój skóry' : ''}`}
            style={[
              styles.day,
              {
                backgroundColor: isToday ? colors.accentSoft : 'transparent',
                paddingVertical: spacing.sm,
              },
            ]}
          >
            <Text variant="caption" color={isToday ? 'primary' : 'textSecondary'}>
              {DAYS[i]}
            </Text>
            <Text
              variant="section"
              color={isToday ? 'primary' : 'textPrimary'}
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {Number(d.day.slice(8))}
            </Text>
            <View
              style={[styles.dot, { backgroundColor: d.mood ? colors.accent : 'transparent' }]}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', width: 46, borderRadius: 16, gap: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
