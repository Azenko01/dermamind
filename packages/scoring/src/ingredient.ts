/**
 * What one ingredient means for one profile — the "Dla Ciebie" part of the ingredient card (D2).
 * Uses the same rules and weights as the Match Score, without position (it's not about a product).
 */
import { concernWeights, type ConReason, type MatchIngredient, type MatchProfile } from './match';

export interface IngredientForYou {
  /** in the user's avoid list, directly or through a group */
  avoided: boolean;
  avoidedGroup: string | null;
  /** concerns of this user it helps / may worsen, strongest first */
  helps: string[];
  hurts: string[];
  /** profile rules that would apply in a product (position decides how much) */
  cautions: Exclude<ConReason, 'harms_concern'>[];
}

export function ingredientForProfile(
  profile: MatchProfile,
  ing: Omit<MatchIngredient, 'position' | 'hasMetadata'>,
): IngredientForYou {
  const weights = concernWeights(profile);
  const relevant = ing.effects
    .filter((e) => weights.has(e.concern) && e.effect !== 0)
    .map((e) => ({ ...e, weight: e.effect * (weights.get(e.concern) ?? 0) }));
  const group = ing.groups.find((g) => profile.avoidedGroups.has(g)) ?? null;
  const oilyOrBreakouts =
    profile.skinType === 'oily' || profile.concerns.some((c) => c.code === 'breakouts');

  const cautions: IngredientForYou['cautions'] = [];
  if (profile.isSensitive && ing.isFragrance) cautions.push('fragrance_sensitive');
  if (profile.isSensitive && (ing.irritationRisk ?? 0) >= 2) cautions.push('irritant_sensitive');
  if (profile.barrierLevel === 3 && (ing.irritationRisk ?? 0) >= 2)
    cautions.push('irritant_barrier');
  if (oilyOrBreakouts && (ing.comedogenic ?? 0) >= 3) cautions.push('comedogenic');
  if (profile.skinType === 'dry' && ing.isAlcoholDrying) cautions.push('drying_alcohol');

  return {
    avoided: profile.avoidedIngredientIds.has(ing.id) || group !== null,
    avoidedGroup: group,
    helps: relevant
      .filter((e) => e.weight > 0)
      .sort((a, b) => b.weight - a.weight)
      .map((e) => e.concern),
    hurts: relevant
      .filter((e) => e.weight < 0)
      .sort((a, b) => a.weight - b.weight)
      .map((e) => e.concern),
    cautions,
  };
}
