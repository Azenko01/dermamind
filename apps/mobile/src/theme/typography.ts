import type { TextStyle } from 'react-native';

/** Inter weights loaded in app/_layout.tsx (PLAN.md 7.2). */
export const fonts = {
  regular: 'Inter_400Regular',
  italic: 'Inter_400Regular_Italic',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;

/** PLAN.md 7.2 — questions use a light regular weight, not bold. */
export const typography = {
  title: { fontFamily: fonts.regular, fontSize: 30, lineHeight: 36, letterSpacing: -0.3 },
  section: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 30 },
  productName: { fontFamily: fonts.medium, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24 },
  caption: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20 },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
