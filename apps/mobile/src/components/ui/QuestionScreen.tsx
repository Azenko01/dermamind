import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, type ColorToken } from '@/theme';
import { BottomBar } from './BottomBar';
import { PrimaryButton } from './Button';
import { ProgressHeader } from './ProgressHeader';
import { Text } from './Text';

interface Props {
  progress?: number;
  onBack?: () => void;
  /** Question; a fragment wrapped in [brackets] is highlighted (e.g. "unikać" in red). */
  title?: string;
  highlight?: ColorToken;
  subtitle?: string;
  children?: ReactNode;
  /** Shown under the options (e.g. "Dodasz go w następnym kroku."). */
  footnote?: string;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  onNext?: () => void;
  /** Extra actions under the main button. */
  secondary?: ReactNode;
  background?: ColorToken;
}

/**
 * Template for O2–O21 (PLAN.md 6.1): back + progress on top, big regular question, grey subtitle,
 * content, and "Dalej" stuck to the bottom — greyed out until something is chosen.
 */
export function QuestionScreen({
  progress,
  onBack,
  title,
  highlight = 'bad',
  subtitle,
  children,
  footnote,
  nextLabel = 'Dalej',
  nextDisabled,
  nextLoading,
  onNext,
  secondary,
  background = 'background',
}: Props) {
  const { colors, spacing } = useTheme();
  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors[background] }]}>
      {progress !== undefined ? (
        <ProgressHeader
          progress={progress}
          onBack={onBack}
          trackColor={background === 'accentSoft' ? colors.background : undefined}
        />
      ) : null}
      <ScrollView
        contentContainerStyle={{ padding: spacing.screen, paddingTop: spacing.xl, gap: spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        {title ? (
          <View style={{ gap: spacing.md }}>
            <Text variant="title" accessibilityRole="header">
              {title.split(/(\[[^\]]+\])/g).map((part, i) =>
                part.startsWith('[') ? (
                  <Text key={i} variant="title" color={highlight}>
                    {part.slice(1, -1)}
                  </Text>
                ) : (
                  part
                ),
              )}
            </Text>
            {subtitle ? (
              <Text variant="caption" style={{ fontSize: 17 }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : null}
        {children}
        {footnote ? <Text>{footnote}</Text> : null}
      </ScrollView>
      {onNext ? (
        <BottomBar>
          <PrimaryButton
            title={nextLabel}
            onPress={onNext}
            disabled={nextDisabled}
            loading={nextLoading}
          />
          {secondary}
        </BottomBar>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
