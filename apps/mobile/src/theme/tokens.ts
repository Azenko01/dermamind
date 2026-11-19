/**
 * Design tokens — PLAN.md 7.1 (colours) and 7.3 (shapes, spacing).
 * Values read from SkinSort screenshots, then adjusted so every text pair passes WCAG AA in both
 * themes (19.11.2026: light good/caution/bad/textSecondary darker, dark accent lighter — see
 * docs/DECISIONS.md). Checked by scripts/theme/contrast.test.ts.
 */
const light = {
  primary: '#2F2A7D',
  primaryDisabled: '#AEACCB',
  accent: '#4F46E5',
  accentSoft: '#E7E5FB',
  background: '#FFFFFF',
  backgroundAlt: '#F7F6F3',
  surface: '#F3F3F1',
  border: '#E7E6E3',
  textPrimary: '#1C1C1E',
  textSecondary: '#636368',
  good: '#157A40',
  goodSoft: '#D5F5E1',
  caution: '#9E5600',
  cautionSoft: '#FDE9C8',
  bad: '#BE2A2A',
  badSoft: '#FDDCDC',
  /** text and icons on `primary` (the main button) */
  onPrimary: '#FFFFFF',
  /** text on `primaryDisabled` */
  onPrimaryDisabled: '#FFFFFF',
  /** camera overlay: the same in both themes, it always sits on a live camera picture */
  camera: '#000000',
  scrim: 'rgba(0,0,0,0.55)',
  scrimStrong: 'rgba(0,0,0,0.65)',
  onScrim: '#FFFFFF',
  /** dimmed backdrop behind sheets and dialogs */
  backdrop: 'rgba(0,0,0,0.4)',
  /**
   * rounded card under product photos — Open Beauty Facts photos have white backgrounds, so in the
   * dark theme they sit on a soft light card instead of looking like a white hole
   */
  photoCard: '#FFFFFF',
  /** SkinScale (O14): very dry → very oily */
  scale1: '#A9D2F3',
  scale2: '#BFE6D4',
  scale3: '#CFEBA6',
  scale4: '#F2DE8E',
  scale5: '#F5C16C',
} as const;

export type ColorToken = keyof typeof light;
export type Palette = Record<ColorToken, string>;

const dark: Palette = {
  primary: '#A7A1F5',
  primaryDisabled: '#3A3760',
  accent: '#968DF4',
  accentSoft: '#2A2650',
  background: '#0E0E12',
  backgroundAlt: '#141418',
  surface: '#1C1C22',
  border: '#2C2C34',
  textPrimary: '#F5F5F7',
  textSecondary: '#A1A1AA',
  good: '#3DD68C',
  goodSoft: '#123A26',
  caution: '#F5A94A',
  cautionSoft: '#3D2A10',
  bad: '#F06B6B',
  badSoft: '#3D1515',
  onPrimary: '#0E0E12',
  onPrimaryDisabled: '#9A97C4',
  camera: '#000000',
  scrim: 'rgba(0,0,0,0.55)',
  scrimStrong: 'rgba(0,0,0,0.65)',
  onScrim: '#FFFFFF',
  backdrop: 'rgba(0,0,0,0.6)',
  photoCard: '#E9E9EC',
  scale1: '#3E6E92',
  scale2: '#3F7A63',
  scale3: '#6B8A3A',
  scale4: '#9A8634',
  scale5: '#A8742A',
};

export const palettes: Record<'light' | 'dark', Palette> = { light, dark };

/** 4 pt grid; screen margin is 20. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  screen: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  chip: 999,
  button: 999,
  card: 20,
  productCard: 24,
} as const;

export const sizes = {
  primaryButtonHeight: 56,
  minTouchTarget: 44,
} as const;
