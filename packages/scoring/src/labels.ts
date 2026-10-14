/**
 * Match Score labels (PLAN.md 4.2). The algorithm itself comes in Sprint 2;
 * thresholds live here so the API and the app colour scores the same way.
 */
export type MatchLabel = 'great' | 'good' | 'caution' | 'poor';

/** A product containing an avoided ingredient never scores above this (PLAN.md 4.1). */
export const EXCLUDED_SCORE_CAP = 40;

export function clampScore(score: number): number {
  return Math.round(Math.min(100, Math.max(0, score)));
}

export function matchLabel(score: number): MatchLabel {
  const s = clampScore(score);
  if (s >= 75) return 'great';
  if (s >= 50) return 'good';
  if (s >= 30) return 'caution';
  return 'poor';
}

/** Applies the hard cap for products with an avoided ingredient. */
export function applyExclusionCap(score: number, excluded: boolean): number {
  const s = clampScore(score);
  return excluded ? Math.min(s, EXCLUDED_SCORE_CAP) : s;
}
