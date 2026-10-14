/**
 * Routines (PLAN.md 4, 5.2): which product categories fit which step, ingredient conflicts within one
 * time of day, and the routine score = average product score − 10 per conflict − 10 without SPF
 * in the morning. Shared by the API (score, generator check) and the app.
 */
import { clampScore } from './labels';

export const TIMES_OF_DAY = ['am', 'pm'] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];

export const ROUTINE_STEPS = ['cleanse', 'tone', 'treat', 'moisturize', 'protect'] as const;
export type RoutineStep = (typeof ROUTINE_STEPS)[number];

/** Steps of each routine in application order; SPF only in the morning (PLAN.md 5.2). */
export const STEPS_BY_TIME: Record<TimeOfDay, readonly RoutineStep[]> = {
  am: ['cleanse', 'tone', 'treat', 'moisturize', 'protect'],
  pm: ['cleanse', 'tone', 'treat', 'moisturize'],
};

/** Product categories that can fill a step (products.category). */
export const STEP_CATEGORIES: Record<RoutineStep, readonly string[]> = {
  cleanse: ['cleanser'],
  tone: ['toner', 'essence'],
  treat: ['serum', 'essence', 'spot_treatment', 'exfoliant', 'eye_cream', 'mask'],
  moisturize: ['moisturizer', 'oil'],
  protect: ['sunscreen'],
};

/** The first step a product of this category goes to — for "Dodaj do rutyny". */
export function stepForCategory(category: string, time: TimeOfDay): RoutineStep | null {
  return STEPS_BY_TIME[time].find((s) => STEP_CATEGORIES[s].includes(category)) ?? null;
}

export const ROUTINE_WEIGHTS = {
  conflict: 10,
  missingSpf: 10,
  /**
   * Only ingredients this high in the list count for conflicts — a conservative proxy for an active
   * concentration (an acid at position 30 is usually a pH adjuster).
   */
  activeUpToPosition: 15,
} as const;

export interface ConflictRule {
  aId: number;
  bId: number;
  /** 1 = take care, 2 = don't combine */
  severity: number;
  noteKey: string;
}

export interface RoutineProduct {
  productId: number;
  category: string;
  /** the user's Match Score of this product */
  score: number;
  ingredients: readonly { id: number; name: string; position: number }[];
}

export interface RoutineSlot {
  time: TimeOfDay;
  step: RoutineStep;
  product: RoutineProduct | null;
}

export interface RoutineConflict {
  time: TimeOfDay;
  severity: number;
  noteKey: string;
  a: { productId: number; ingredient: string };
  b: { productId: number; ingredient: string };
}

export interface RoutineScore {
  /** null for an empty routine */
  score: number | null;
  averageProductScore: number | null;
  conflicts: RoutineConflict[];
  /** a morning routine with products but no sunscreen */
  missingSpf: boolean;
  productCount: number;
}

/**
 * Conflicts between different products of the same time of day. Inside one product the formula is
 * the brand's job, so we don't flag it. Each product pair × rule counts once.
 */
export function findConflicts(
  slots: readonly RoutineSlot[],
  rules: readonly ConflictRule[],
): RoutineConflict[] {
  const byPair = new Map<string, ConflictRule>();
  for (const r of rules) {
    byPair.set(`${r.aId}:${r.bId}`, r);
    byPair.set(`${r.bId}:${r.aId}`, r);
  }
  const found: RoutineConflict[] = [];
  const seen = new Set<string>();
  for (const time of TIMES_OF_DAY) {
    const products = slots.filter((s) => s.time === time && s.product).map((s) => s.product!);
    for (let i = 0; i < products.length; i++) {
      for (let j = i + 1; j < products.length; j++) {
        const [p, q] = [products[i]!, products[j]!];
        if (p.productId === q.productId) continue;
        for (const x of active(p)) {
          for (const y of active(q)) {
            const rule = byPair.get(`${x.id}:${y.id}`);
            if (!rule) continue;
            const key = `${time}:${[p.productId, q.productId].sort().join('-')}:${rule.noteKey}:${[x.id, y.id].sort().join('-')}`;
            if (seen.has(key)) continue;
            seen.add(key);
            found.push({
              time,
              severity: rule.severity,
              noteKey: rule.noteKey,
              a: { productId: p.productId, ingredient: x.name },
              b: { productId: q.productId, ingredient: y.name },
            });
          }
        }
      }
    }
  }
  return found;
}

const active = (p: RoutineProduct) =>
  p.ingredients.filter((i) => i.position <= ROUTINE_WEIGHTS.activeUpToPosition);

export function computeRoutineScore(
  slots: readonly RoutineSlot[],
  rules: readonly ConflictRule[],
): RoutineScore {
  const filled = slots.filter((s) => s.product);
  const conflicts = findConflicts(slots, rules);
  const morning = filled.filter((s) => s.time === 'am');
  const missingSpf =
    morning.length > 0 && !morning.some((s) => s.product!.category === 'sunscreen');
  if (filled.length === 0) {
    return {
      score: null,
      averageProductScore: null,
      conflicts,
      missingSpf: false,
      productCount: 0,
    };
  }
  const average = filled.reduce((sum, s) => sum + s.product!.score, 0) / filled.length;
  const score = clampScore(
    average -
      ROUTINE_WEIGHTS.conflict * conflicts.length -
      (missingSpf ? ROUTINE_WEIGHTS.missingSpf : 0),
  );
  return {
    score,
    averageProductScore: Math.round(average),
    conflicts,
    missingSpf,
    productCount: filled.length,
  };
}

/**
 * Rule-based routine (PLAN.md 5.2 fallback): per step the best candidate that doesn't create a
 * conflict with what is already chosen for that time of day; if every candidate conflicts, the best
 * one stays and the conflict is shown.
 */
export function pickRoutine(
  candidates: readonly {
    time: TimeOfDay;
    step: RoutineStep;
    products: readonly RoutineProduct[];
  }[],
  rules: readonly ConflictRule[],
): RoutineSlot[] {
  const chosen: RoutineSlot[] = [];
  for (const c of candidates) {
    // a product fills at most one step per time of day (an essence fits "tone" and "treat")
    const used = new Set(
      chosen.filter((s) => s.time === c.time && s.product).map((s) => s.product!.productId),
    );
    const sorted = [...c.products]
      .filter((p) => !used.has(p.productId))
      .sort((a, b) => b.score - a.score);
    const before = findConflicts(chosen, rules).length;
    const pick =
      sorted.find(
        (p) =>
          findConflicts([...chosen, { time: c.time, step: c.step, product: p }], rules).length ===
          before,
      ) ??
      sorted[0] ??
      null;
    chosen.push({ time: c.time, step: c.step, product: pick });
  }
  return chosen;
}
