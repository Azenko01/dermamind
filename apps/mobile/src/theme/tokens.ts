/**
 * Design tokens — PLAN.md 7.1 (colours) and 7.3 (shapes, spacing).
 * Values read from SkinSort screenshots; WCAG AA contrast still to be confirmed.
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
  textSecondary: '#6E6E73',
  good: '#1F9D55',
  goodSoft: '#D5F5E1',
  caution: '#E07B12',
  cautionSoft: '#FDE9C8',
  bad: '#D93636',
  badSoft: '#FDDCDC',
} as const;

export type ColorToken = keyof typeof light;
export type Palette = Record<ColorToken, string>;

const dark: Palette = {
  primary: '#A7A1F5',
  primaryDisabled: '#3A3760',
  accent: '#8C82F2',
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
