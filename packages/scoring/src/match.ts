/**
 * Match Score (PLAN.md 4): a rule-based 0–100 number with the reasons behind it. Same product + same
 * profile = same result. All weights are in WEIGHTS so they can be tuned in one place (PLAN.md 4.5).
 */
import { applyExclusionCap, clampScore, matchLabel, type MatchLabel } from './labels';
import type { SkinType } from './quiz';

export const WEIGHTS = {
  base: 50,
  benefit: 10,
  harm: 12,
  /** concern priority 1 / 2 / 3+ */
  priority: [1, 0.6, 0.4] as const,
  /** position in the INCI list: 1–5 / 6–10 / 11+ */
  position: [1, 0.6, 0.3] as const,
  fragranceSensitive: 8,
  irritantSensitive: 6,
  irritantBarrier: 6,
  comedogenic: 10,
  dryingAlcohol: 10,
  /** share of ingredients without any data above which the score is "low confidence" */
  unknownShare: 0.3,
} as const;

export interface MatchProfile {
  skinType: SkinType | null;
  isSensitive: boolean;
  /** 1 good · 2 weakened · 3 compromised */
  barrierLevel: number | null;
  /** O7 concerns with priority (1 = main) */
  concerns: { code: string; priority: number }[];
  avoidedIngredientIds: ReadonlySet<number>;
  avoidedGroups: ReadonlySet<string>;
}

export interface MatchIngredient {
  id: number;
  name: string;
  /** 1 = highest concentration */
  position: number;
  comedogenic: number | null;
  irritationRisk: number | null;
  isFragrance: boolean;
  isAlcoholDrying: boolean;
  /** avoid-group codes this ingredient belongs to */
  groups: readonly string[];
  effects: readonly { concern: string; effect: number }[];
  /** any metadata at all (functions, flags, ratings) */
  hasMetadata: boolean;
}

export interface MatchProduct {
  /** false = only key ingredients are known */
  inciComplete: boolean;
  ingredients: readonly MatchIngredient[];
  /** the user put this product on the "Unikam" shelf — treated like an avoided ingredient */
  avoidedByUser?: boolean;
}

export type ConReason =
  | 'harms_concern'
  | 'fragrance_sensitive'
  | 'irritant_sensitive'
  | 'irritant_barrier'
  | 'comedogenic'
  | 'drying_alcohol';

export type IngredientRating = 'good' | 'caution' | 'bad' | 'neutral';

export interface MatchResult {
  score: number;
  /** excluded = contains something the user avoids; score capped at 40 */
  status: 'ok' | 'excluded';
  label: MatchLabel;
  lowConfidence: boolean;
  /** why confidence is low — for the "Ocena na podstawie niepełnych danych" note */
  confidence: { inciComplete: boolean; unknownShare: number };
  pros: { ingredientId: number; ingredient: string; concern: string; impact: number }[];
  cons: {
    ingredientId: number;
    ingredient: string;
    reason: ConReason;
    concern?: string;
    impact: number;
  }[];
  excludedBy: { ingredientId: number; ingredient: string; group?: string }[];
  /** true when the product itself is on the user's "Unikam" shelf */
  avoidedByUser: boolean;
  /** per-ingredient verdict for the coloured drops in the ingredient list */
  ingredients: { ingredientId: number; rating: IngredientRating; impact: number }[];
}

export function positionWeight(position: number): number {
  if (position <= 5) return WEIGHTS.position[0];
  if (position <= 10) return WEIGHTS.position[1];
  return WEIGHTS.position[2];
}

export function priorityWeight(priority: number): number {
  return WEIGHTS.priority[Math.min(Math.max(priority, 1), 3) - 1] ?? WEIGHTS.priority[2];
}

/**
 * Concern set C with weights: the user's O7 concerns plus what follows from the skin profile
 * (dry → dryness, oily → oiliness, combination → oiliness at priority 2; sensitive skin →
 * sensitivity and a weakened barrier → barrier, both at priority 2, compromised barrier at 1).
 * When a concern comes from several places the highest weight wins.
 */
export function concernWeights(p: MatchProfile): Map<string, number> {
  const weights = new Map<string, number>();
  const add = (code: string, w: number) => weights.set(code, Math.max(weights.get(code) ?? 0, w));
  for (const c of p.concerns) add(c.code, priorityWeight(c.priority));
  if (p.skinType === 'dry') add('dryness', priorityWeight(1));
  if (p.skinType === 'oily') add('oiliness', priorityWeight(1));
  if (p.skinType === 'combination') add('oiliness', priorityWeight(2));
  if (p.isSensitive) add('sensitivity', priorityWeight(2));
  if ((p.barrierLevel ?? 1) >= 2) add('barrier', priorityWeight(p.barrierLevel === 3 ? 1 : 2));
  return weights;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function computeMatchScore(profile: MatchProfile, product: MatchProduct): MatchResult {
  const weights = concernWeights(profile);
  const oilyOrBreakouts =
    profile.skinType === 'oily' || profile.concerns.some((c) => c.code === 'breakouts');

  let benefit = 0;
  let harm = 0;
  let penalty = 0;
  const pros: MatchResult['pros'] = [];
  const cons: MatchResult['cons'] = [];
  const excludedBy: MatchResult['excludedBy'] = [];
  const perIngredient = new Map<number, { impact: number; severe: boolean }>();
  const note = (id: number, impact: number, severe = false) => {
    const cur = perIngredient.get(id) ?? { impact: 0, severe: false };
    perIngredient.set(id, { impact: cur.impact + impact, severe: cur.severe || severe });
  };

  for (const ing of product.ingredients) {
    const w = positionWeight(ing.position);

    // 1. hard rule: avoided ingredient or group
    const group = ing.groups.find((g) => profile.avoidedGroups.has(g));
    if (profile.avoidedIngredientIds.has(ing.id) || group) {
      excludedBy.push({ ingredientId: ing.id, ingredient: ing.name, ...(group ? { group } : {}) });
      note(ing.id, 0, true);
    }

    // 4. benefits and harms for the user's concerns
    for (const e of ing.effects) {
      const cw = weights.get(e.concern);
      if (!cw || e.effect === 0) continue;
      const contribution = e.effect * w * cw;
      if (contribution > 0) {
        benefit += contribution;
        const impact = round1(WEIGHTS.benefit * contribution);
        pros.push({ ingredientId: ing.id, ingredient: ing.name, concern: e.concern, impact });
        note(ing.id, impact);
      } else {
        harm += -contribution;
        const impact = round1(-WEIGHTS.harm * -contribution);
        cons.push({
          ingredientId: ing.id,
          ingredient: ing.name,
          reason: 'harms_concern',
          concern: e.concern,
          impact,
        });
        note(ing.id, impact, true);
      }
    }

    // 5. profile penalties
    const addPenalty = (reason: ConReason, points: number) => {
      penalty += points;
      const impact = round1(-points);
      cons.push({ ingredientId: ing.id, ingredient: ing.name, reason, impact });
      note(ing.id, impact);
    };
    if (profile.isSensitive && ing.isFragrance)
      addPenalty('fragrance_sensitive', WEIGHTS.fragranceSensitive * w);
    if (profile.isSensitive && (ing.irritationRisk ?? 0) >= 2) {
      addPenalty('irritant_sensitive', WEIGHTS.irritantSensitive * w);
    }
    if (profile.barrierLevel === 3 && (ing.irritationRisk ?? 0) >= 2) {
      addPenalty('irritant_barrier', WEIGHTS.irritantBarrier * w);
    }
    if (oilyOrBreakouts && (ing.comedogenic ?? 0) >= 3 && ing.position <= 10) {
      addPenalty('comedogenic', WEIGHTS.comedogenic * w);
    }
    if (profile.skinType === 'dry' && ing.isAlcoholDrying && ing.position <= 5) {
      addPenalty('drying_alcohol', WEIGHTS.dryingAlcohol);
    }
  }

  // 6. score, then the cap for excluded products
  const raw = WEIGHTS.base + WEIGHTS.benefit * benefit - WEIGHTS.harm * harm - penalty;
  const excluded = excludedBy.length > 0 || product.avoidedByUser === true;
  const score = applyExclusionCap(clampScore(raw), excluded);

  // 7. confidence
  const unknown = product.ingredients.filter(
    (i) => !i.hasMetadata && i.effects.length === 0,
  ).length;
  const unknownShare = product.ingredients.length ? unknown / product.ingredients.length : 1;

  return {
    score,
    status: excluded ? 'excluded' : 'ok',
    avoidedByUser: product.avoidedByUser === true,
    label: matchLabel(score),
    lowConfidence: !product.inciComplete || unknownShare > WEIGHTS.unknownShare,
    confidence: { inciComplete: product.inciComplete, unknownShare: round1(unknownShare) },
    pros: pros.sort((a, b) => b.impact - a.impact),
    cons: cons.sort((a, b) => a.impact - b.impact),
    excludedBy,
    ingredients: product.ingredients.map((i) => {
      const v = perIngredient.get(i.id) ?? { impact: 0, severe: false };
      const rating: IngredientRating =
        v.impact > 0 && !v.severe
          ? 'good'
          : v.severe
            ? 'bad'
            : v.impact < 0
              ? 'caution'
              : 'neutral';
      return { ingredientId: i.id, rating, impact: round1(v.impact) };
    }),
  };
}
