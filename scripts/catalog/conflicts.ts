/**
 * Ingredient conflicts (PLAN.md 3.2 ingredient_conflicts, F12): a small, well-known, conservative
 * set — pairs that dermatology and cosmetology sources commonly advise not to layer in one routine
 * (same time of day). Sources and reasoning: docs/DECISIONS.md D-50. Texts for note keys are in the
 * app (Polish UI copy).
 */
const RETINOIDS = ['RETINOL', 'RETINAL', 'RETINYL PALMITATE', 'HYDROXYPINACOLONE RETINOATE'];
const AHA = ['GLYCOLIC ACID', 'LACTIC ACID', 'MANDELIC ACID'];
const BHA = ['SALICYLIC ACID'];
const BENZOYL_PEROXIDE = ['BENZOYL PEROXIDE'];
const VITAMIN_C = ['ASCORBIC ACID'];

export interface ConflictGroupRule {
  a: string[];
  b: string[];
  /** 1 = take care, 2 = don't combine */
  severity: 1 | 2;
  noteKey: string;
}

export const CONFLICT_RULES: ConflictGroupRule[] = [
  { a: RETINOIDS, b: [...AHA, ...BHA], severity: 2, noteKey: 'retinoid_exfoliant' },
  { a: RETINOIDS, b: BENZOYL_PEROXIDE, severity: 2, noteKey: 'retinoid_benzoyl_peroxide' },
  { a: VITAMIN_C, b: [...AHA, ...BHA], severity: 1, noteKey: 'vitamin_c_exfoliant' },
  { a: AHA, b: [...AHA, ...BHA], severity: 1, noteKey: 'double_exfoliation' },
];

/** All concrete pairs (a ≠ b), each once. */
export function conflictPairs(): { a: string; b: string; severity: 1 | 2; noteKey: string }[] {
  const out = new Map<string, { a: string; b: string; severity: 1 | 2; noteKey: string }>();
  for (const r of CONFLICT_RULES) {
    for (const a of r.a) {
      for (const b of r.b) {
        if (a === b) continue;
        const key = [a, b].sort().join('|');
        const prev = out.get(key);
        if (!prev || r.severity > prev.severity)
          out.set(key, { a, b, severity: r.severity, noteKey: r.noteKey });
      }
    }
  }
  return [...out.values()];
}
