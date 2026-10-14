/**
 * "Co jest w środku" (PLAN.md 3.6, 6.3): yes/no flags computed from the ingredient list.
 * With an incomplete list we can only say "no" for sure (a bad ingredient is known to be there);
 * a "yes" would be a guess, so it becomes null = "brak danych".
 */
export const PRODUCT_FLAGS = [
  'alcohol_free',
  'fragrance_free',
  'silicone_free',
  'pore_clogger_free',
  'eu_allergen_free',
  'oil_free',
  'sulfate_free',
  'paraben_free',
  'fungal_acne_safe',
  'vegan',
  'reef_safe',
  'cruelty_free',
] as const;

export type ProductFlag = (typeof PRODUCT_FLAGS)[number];
export type ProductFlags = Record<ProductFlag, boolean | null>;

export interface FlagIngredient {
  comedogenic: number | null;
  isFragrance: boolean;
  isAlcoholDrying: boolean;
  isSilicone: boolean;
  isEuAllergen: boolean;
  isOil: boolean;
  isSulfate: boolean;
  isParaben: boolean;
  isFungalAcneTrigger: boolean;
  isAnimalDerived: boolean;
  isReefHarmful: boolean;
}

/** Ingredient property that breaks each flag. cruelty_free is a brand property (not INCI). */
const BREAKS: Record<Exclude<ProductFlag, 'cruelty_free'>, (i: FlagIngredient) => boolean> = {
  alcohol_free: (i) => i.isAlcoholDrying,
  fragrance_free: (i) => i.isFragrance,
  silicone_free: (i) => i.isSilicone,
  pore_clogger_free: (i) => (i.comedogenic ?? 0) >= 3,
  eu_allergen_free: (i) => i.isEuAllergen,
  oil_free: (i) => i.isOil,
  sulfate_free: (i) => i.isSulfate,
  paraben_free: (i) => i.isParaben,
  fungal_acne_safe: (i) => i.isFungalAcneTrigger,
  vegan: (i) => i.isAnimalDerived,
  reef_safe: (i) => i.isReefHarmful,
};

export function productFlags(
  ingredients: readonly FlagIngredient[],
  inciComplete: boolean,
  brandCrueltyFree: boolean | null,
): ProductFlags {
  const flags = { cruelty_free: brandCrueltyFree } as ProductFlags;
  for (const [flag, breaks] of Object.entries(BREAKS) as [
    keyof typeof BREAKS,
    (i: FlagIngredient) => boolean,
  ][]) {
    const broken = ingredients.some(breaks);
    flags[flag] = broken ? false : inciComplete ? true : null;
  }
  return flags;
}
