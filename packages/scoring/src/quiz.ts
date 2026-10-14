/**
 * Onboarding quiz (PLAN.md 6.1): answer types shared by the app and the API, and the rules that turn
 * answers into skin type, oil level, barrier and sensitivity. Thresholds are deliberately simple so
 * they can be shown as a rule table in the thesis — calibration happens with real users (PLAN.md 4.5).
 */

// ─── answer vocabularies (codes, not UI copy) ───

/** O6 */
export const STRUGGLES = ['irritation', 'no_results', 'too_many_products', 'want_routine'] as const;
/** O7 — matches `skin_concerns.code` */
export const CONCERNS = [
  'breakouts',
  'oiliness',
  'pores',
  'texture',
  'dark_spots',
  'radiance',
  'redness',
  'rosacea_prone',
  'eczema_prone',
  'hydration',
  'wrinkles',
] as const;
/** O8 — afternoon shine per face zone */
export const SHINE_LEVELS = ['very', 'slightly', 'none', 'dry'] as const;
export const FACE_ZONES = ['tZone', 'cheeks', 'jaw'] as const;
/** O9 — 30 minutes after washing */
export const AFTER_WASH = ['tight', 'comfortable', 'shiny'] as const;
/** O10 — last 2 weeks; empty array = "nic z tych" */
export const BARRIER_SYMPTOMS = [
  'flaking',
  'roughness',
  'tightness',
  'dullness',
  'cracking',
] as const;
/** O11 — last month */
export const REACTION_FREQUENCIES = ['never', 'rarely', 'sometimes', 'often'] as const;
/** O12 — empty array = "nic" */
export const TRIGGERS = [
  'cosmetics',
  'temperature',
  'wind',
  'hard_water',
  'sun',
  'stress',
] as const;
/** O13 */
export const SEASONAL_CHANGES = [
  'oilier_in_summer',
  'drier_in_winter',
  'both',
  'no_change',
] as const;
/** O15 — matches `ingredient_groups.code` */
export const AVOID_GROUPS = [
  'fragrance',
  'drying_alcohol',
  'fungal_acne',
  'parabens',
  'sulfates',
  'silicones',
  'eu_allergens',
] as const;
/** O17 — empty array = "brak wymagań" */
export const MUST_HAVES = ['vegan', 'cruelty_free', 'reef_safe'] as const;
/** O18 */
export const SPF_USAGE = ['daily', 'sometimes', 'rarely'] as const;
/** O19 — PLN per product */
export const BUDGETS = ['lt30', '30_70', '70_150', 'gt150'] as const;

export type Struggle = (typeof STRUGGLES)[number];
export type ConcernCode = (typeof CONCERNS)[number];
export type ShineLevel = (typeof SHINE_LEVELS)[number];
export type FaceZone = (typeof FACE_ZONES)[number];
export type AfterWash = (typeof AFTER_WASH)[number];
export type BarrierSymptom = (typeof BARRIER_SYMPTOMS)[number];
export type ReactionFrequency = (typeof REACTION_FREQUENCIES)[number];
export type Trigger = (typeof TRIGGERS)[number];
export type SeasonalChange = (typeof SEASONAL_CHANGES)[number];
export type AvoidGroup = (typeof AVOID_GROUPS)[number];
export type MustHave = (typeof MUST_HAVES)[number];
export type SpfUsage = (typeof SPF_USAGE)[number];
export type Budget = (typeof BUDGETS)[number];

export interface QuizAnswers {
  struggle: Struggle;
  /** In the order the user picked them — the first one is the main concern. */
  concerns: ConcernCode[];
  shine: Record<FaceZone, ShineLevel>;
  afterWash: AfterWash;
  symptoms: BarrierSymptom[];
  reactionFrequency: ReactionFrequency;
  triggers: Trigger[];
  seasonal: SeasonalChange;
  avoidGroups: AvoidGroup[];
  /** INCI names typed or picked in O16, e.g. 'LIMONENE'. */
  avoidIngredients: string[];
  mustHaves: MustHave[];
  usesSpf: SpfUsage;
  budget: Budget;
}

// ─── rules ───

export type SkinType = 'dry' | 'oily' | 'combination' | 'normal';
/** 1 good · 2 weakened · 3 compromised */
export type BarrierLevel = 1 | 2 | 3;

export interface SkinProfile {
  skinType: SkinType;
  /** -3 (very dry) … +3 (very oily) */
  oilLevel: number;
  barrierLevel: BarrierLevel;
  /** 0 … 4 */
  sensitivityLevel: number;
  /** Used by the Match Score penalties for sensitive skin. */
  isSensitive: boolean;
}

export const SHINE_POINTS: Record<ShineLevel, number> = { very: 2, slightly: 1, none: 0, dry: -1 };
export const AFTER_WASH_POINTS: Record<AfterWash, number> = { tight: -1, comfortable: 0, shiny: 1 };
export const SEASONAL_POINTS: Record<SeasonalChange, number> = {
  oilier_in_summer: 1,
  drier_in_winter: -1,
  both: 0,
  no_change: 0,
};
export const REACTION_POINTS: Record<ReactionFrequency, number> = {
  never: 0,
  rarely: 1,
  sometimes: 2,
  often: 3,
};

/** From this sensitivity level on, the profile counts as sensitive skin. */
export const SENSITIVE_FROM = 2;

/** O8 + O9 + O13 → oil level, clamped to -3…+3. */
export function oilLevel(a: Pick<QuizAnswers, 'shine' | 'afterWash' | 'seasonal'>): number {
  const zones = FACE_ZONES.reduce((sum, zone) => sum + SHINE_POINTS[a.shine[zone]], 0);
  const raw = zones + AFTER_WASH_POINTS[a.afterWash] + SEASONAL_POINTS[a.seasonal];
  return Math.max(-3, Math.min(3, raw));
}

/**
 * Combination: T-zone shines (≥ +1) while cheeks don't (≤ 0) — checked first, because a shiny T-zone
 * would otherwise push the sum towards "oily". Otherwise: dry ≤ -2, normal -1…+1, oily ≥ +2.
 */
export function skinType(a: Pick<QuizAnswers, 'shine' | 'afterWash' | 'seasonal'>): SkinType {
  if (SHINE_POINTS[a.shine.tZone] >= 1 && SHINE_POINTS[a.shine.cheeks] <= 0) return 'combination';
  const level = oilLevel(a);
  if (level <= -2) return 'dry';
  if (level >= 2) return 'oily';
  return 'normal';
}

/** O10: 0–1 symptoms → good, 2 → weakened, 3+ → compromised. */
export function barrierLevel(symptoms: readonly BarrierSymptom[]): BarrierLevel {
  const n = new Set(symptoms).size;
  if (n >= 3) return 3;
  if (n === 2) return 2;
  return 1;
}

/** O11 (0–3) + 1 if cosmetics trigger reactions (O12). */
export function sensitivityLevel(a: Pick<QuizAnswers, 'reactionFrequency' | 'triggers'>): number {
  return REACTION_POINTS[a.reactionFrequency] + (a.triggers.includes('cosmetics') ? 1 : 0);
}

export function computeSkinProfile(a: QuizAnswers): SkinProfile {
  const sensitivity = sensitivityLevel(a);
  return {
    skinType: skinType(a),
    oilLevel: oilLevel(a),
    barrierLevel: barrierLevel(a.symptoms),
    sensitivityLevel: sensitivity,
    isSensitive: sensitivity >= SENSITIVE_FROM,
  };
}
