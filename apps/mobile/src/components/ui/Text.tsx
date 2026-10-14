import { Text as RNText, type TextProps } from 'react-native';
import { fonts, typography, useTheme, type ColorToken, type TypographyVariant } from '@/theme';

interface Props extends TextProps {
  variant?: TypographyVariant;
  color?: ColorToken;
  align?: 'left' | 'center' | 'right';
}

export function Text({ variant = 'body', color, align, style, ...rest }: Props) {
  const { colors } = useTheme();
  const fallback: ColorToken = variant === 'caption' ? 'textSecondary' : 'textPrimary';
  return (
    <RNText
      style={[typography[variant], { color: colors[color ?? fallback], textAlign: align }, style]}
      {...rest}
    />
  );
}

/**
 * Renders "**bold**" fragments in SemiBold — for answers like "**Podrażnienia** po kosmetykach"
 * (PLAN.md 7.2) — and "_italic_" fragments in italic.
 */
export function RichText({ children, ...props }: Omit<Props, 'children'> & { children: string }) {
  const parts = children.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).filter(Boolean);
  return (
    <Text {...props}>
      {parts.map((part, i) => {
        if (part.startsWith('**')) {
          return (
            <RNText key={i} style={{ fontFamily: fonts.semibold }}>
              {part.slice(2, -2)}
            </RNText>
          );
        }
        if (part.startsWith('_')) {
          return (
            <RNText key={i} style={{ fontFamily: fonts.italic }}>
              {part.slice(1, -1)}
            </RNText>
          );
        }
        return part;
      })}
    </Text>
  );
}
