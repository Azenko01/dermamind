import type { components } from '@dermamind/api-client';
import type { MatchLabel, ProductFlag } from '@dermamind/scoring';
import {
  DropIcon,
  EyedropperIcon,
  EyeIcon,
  FaceMaskIcon,
  JarIcon,
  PackageIcon,
  SparkleIcon,
  SprayBottleIcon,
  SunIcon,
  TargetIcon,
  TestTubeIcon,
  type IconProps,
} from 'phosphor-react-native';
import type { ComponentType } from 'react';
import type { ColorToken } from '@/theme';

// Polish UI copy for the catalogue. Codes come from the API unchanged.

export type Category = components['schemas']['ProductListItemDto']['category'];
export type MatchSummary = components['schemas']['MatchSummaryDto'];

export const categoryCopy: Record<
  Category,
  { plural: string; singular: string; icon: ComponentType<IconProps> }
> = {
  cleanser: { plural: 'Oczyszczanie', singular: 'Oczyszczanie', icon: TestTubeIcon },
  toner: { plural: 'Toniki', singular: 'Tonik', icon: SprayBottleIcon },
  essence: { plural: 'Esencje', singular: 'Esencja', icon: DropIcon },
  serum: { plural: 'Serum', singular: 'Serum', icon: EyedropperIcon },
  moisturizer: { plural: 'Kremy', singular: 'Krem', icon: JarIcon },
  eye_cream: { plural: 'Pod oczy', singular: 'Krem pod oczy', icon: EyeIcon },
  sunscreen: { plural: 'SPF', singular: 'Krem z filtrem', icon: SunIcon },
  mask: { plural: 'Maseczki', singular: 'Maseczka', icon: FaceMaskIcon },
  exfoliant: { plural: 'Peelingi', singular: 'Peeling', icon: SparkleIcon },
  spot_treatment: { plural: 'Punktowo', singular: 'Na wypryski', icon: TargetIcon },
  oil: { plural: 'Olejki', singular: 'Olejek', icon: DropIcon },
  other: { plural: 'Inne', singular: 'Inne', icon: PackageIcon },
};

/** Order of the category circles on Odkrywaj. */
export const CATEGORY_ORDER: Category[] = [
  'cleanser',
  'toner',
  'serum',
  'moisturizer',
  'sunscreen',
  'oil',
];

/** PLAN.md 4.2 — products with an avoided ingredient say "Nie pasuje" whatever the number. */
export function matchHeadline(m: MatchSummary): { title: string; fg: ColorToken; bg: ColorToken } {
  if (m.status === 'excluded') return { title: 'Nie pasuje', fg: 'bad', bg: 'badSoft' };
  const byLabel: Record<MatchLabel, { title: string; fg: ColorToken; bg: ColorToken }> = {
    great: { title: 'Świetnie pasuje', fg: 'good', bg: 'goodSoft' },
    good: { title: 'Pasuje', fg: 'accent', bg: 'accentSoft' },
    caution: { title: 'Z ostrożnością', fg: 'caution', bg: 'cautionSoft' },
    poor: { title: 'Nie polecamy', fg: 'bad', bg: 'badSoft' },
  };
  return byLabel[m.label];
}

/** "zł zł zł zł" price level, same thresholds as the budget question (O19). */
export function priceLevel(price: number | null): number {
  if (price === null) return 0;
  if (price < 30) return 1;
  if (price < 70) return 2;
  if (price < 150) return 3;
  return 4;
}

export const concernCopy: Record<string, string> = {
  breakouts: 'wypryski',
  oiliness: 'błyszczenie',
  pores: 'widoczne pory',
  texture: 'nierówną teksturę',
  dark_spots: 'przebarwienia',
  radiance: 'brak blasku',
  redness: 'zaczerwienienia',
  rosacea_prone: 'skłonność do trądziku różowatego',
  eczema_prone: 'skłonność do AZS',
  hydration: 'nawilżenie',
  wrinkles: 'zmarszczki',
  dryness: 'suchość skóry',
  sensitivity: 'wrażliwą skórę',
  barrier: 'osłabioną barierę',
};

export const conReasonCopy: Record<string, string> = {
  harms_concern: 'może nasilać',
  fragrance_sensitive: 'zapach — może podrażniać wrażliwą skórę',
  irritant_sensitive: 'może podrażniać wrażliwą skórę',
  irritant_barrier: 'może obciążać osłabioną barierę',
  comedogenic: 'może zapychać pory',
  drying_alcohol: 'wysuszający alkohol wysoko w składzie',
};

export const groupCopy: Record<string, string> = {
  fragrance: 'zapachy',
  drying_alcohol: 'wysuszające alkohole',
  fungal_acne: 'wyzwalacze trądziku grzybiczego',
  parabens: 'parabeny',
  sulfates: 'siarczany',
  silicones: 'silikony',
  eu_allergens: 'alergeny UE',
};

export const flagCopy: Record<ProductFlag, string> = {
  alcohol_free: 'Bez alkoholu',
  fragrance_free: 'Bez zapachów',
  silicone_free: 'Bez silikonów',
  pore_clogger_free: 'Nie zapycha porów',
  eu_allergen_free: 'Bez alergenów UE',
  oil_free: 'Bez olejów',
  sulfate_free: 'Bez siarczanów',
  paraben_free: 'Bez parabenów',
  fungal_acne_safe: 'Bezpieczny przy tr. grzybiczym',
  vegan: 'Wegański',
  reef_safe: 'Bezpieczny dla raf',
  cruelty_free: 'Bez testów na zwierz.',
};

export const functionCopy: Record<string, string> = {
  solvent: 'rozpuszczalnik',
  humectant: 'nawilża',
  emollient: 'zmiękcza',
  occlusive: 'chroni przed utratą wody',
  skin_conditioning: 'pielęgnuje',
  soothing: 'łagodzi',
  exfoliant: 'złuszcza',
  antioxidant: 'przeciwutleniacz',
  fragrance: 'zapach',
  preservative: 'konserwant',
  surfactant: 'myje',
  ph_adjuster: 'reguluje pH',
  uv_filter: 'filtr UV',
  emulsifier: 'emulgator',
  sebum_regulating: 'reguluje sebum',
};

/** "Dla skóry mieszanej" — genitive of the skin type names. */
export const skinTypeGenitive: Record<string, string> = {
  dry: 'suchej',
  normal: 'zrównoważonej',
  oily: 'tłustej',
  combination: 'mieszanej',
};

/** "Dla skóry mieszanej, bez zapachów" / "Do skóry mieszanej i wrażliwej". */
export function profileLine(
  profile: { skinType: string | null; isSensitive: boolean; avoidGroups: string[] } | undefined,
  style: 'list' | 'card',
): string | undefined {
  if (!profile?.skinType) return undefined;
  const skin = skinTypeGenitive[profile.skinType] ?? '';
  if (style === 'card') return `Do skóry ${skin}${profile.isSensitive ? ' i wrażliwej' : ''}`;
  const avoid = profile.avoidGroups[0];
  return `Dla skóry ${skin}${avoid ? `, bez: ${groupCopy[avoid] ?? avoid}` : ''}`;
}
