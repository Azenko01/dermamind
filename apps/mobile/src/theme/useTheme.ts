import { useColorScheme } from 'react-native';
import { useAppearance } from '@/stores/appearance';
import { palettes, radius, sizes, spacing, type Palette } from './tokens';

export interface Theme {
  scheme: 'light' | 'dark';
  colors: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  sizes: typeof sizes;
}

/** Light or dark: the choice from Profil → Wygląd, or the phone setting for "Systemowy". */
export function useColorSchemeChoice(): 'light' | 'dark' {
  const mode = useAppearance((s) => s.mode);
  const system = useColorScheme();
  if (mode !== 'system') return mode;
  return system === 'dark' ? 'dark' : 'light';
}

export function useTheme(): Theme {
  const scheme = useColorSchemeChoice();
  return { scheme, colors: palettes[scheme], spacing, radius, sizes };
}
