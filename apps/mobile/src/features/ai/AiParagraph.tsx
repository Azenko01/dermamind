import type { UseQueryResult } from '@tanstack/react-query';
import { SparkleIcon } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';
import type { AiText } from './api';

/**
 * An AI text with its states: skeleton while loading, the text with the "Opis wygenerowany przez
 * AI" label, or the server's fixed fallback text (no label — it isn't AI). A failed request shows
 * nothing: the screen is complete without it.
 */
export function AiParagraph({ query }: { query: UseQueryResult<AiText> }) {
  const { colors, spacing } = useTheme();
  if (query.isPending) return <SkeletonLines lines={3} />;
  if (query.isError) return null;
  const ai = query.data;
  const generated = ai.source !== 'fallback';
  return (
    <View style={{ gap: spacing.sm }}>
      <Text color={generated ? 'textPrimary' : 'textSecondary'}>{ai.text}</Text>
      {ai.caution ? (
        <View style={[styles.row, { gap: spacing.sm }]}>
          <View style={[styles.dot, { backgroundColor: colors.caution }]} />
          <Text style={{ flex: 1 }}>{ai.caution}</Text>
        </View>
      ) : null}
      {generated ? (
        <View
          style={[styles.row, { gap: spacing.xs }]}
          accessible
          accessibilityLabel="Opis wygenerowany przez AI"
        >
          <SparkleIcon size={14} color={colors.accent} />
          <Text variant="caption" style={{ fontSize: 12, lineHeight: 16 }}>
            Opis wygenerowany przez AI · nie jest poradą medyczną
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
