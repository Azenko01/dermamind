/**
 * Match Score reasons grouped for the product card (D1): one line per reason with all the
 * ingredients that cause it — "Pomaga na osłabioną barierę: Ceramide NP, Ceramide EOP, Tocopherol"
 * instead of three lines. Codes only; the app adds the Polish copy.
 */
import type { ConReason, MatchResult } from './match';

export type ReasonGroup =
  | { kind: 'avoided_shelf'; ingredients: [] }
  | { kind: 'excluded'; group: string | null; ingredients: string[] }
  | { kind: 'helps'; concern: string; ingredients: string[]; impact: number }
  | {
      kind: 'warns';
      reason: ConReason;
      concern: string | null;
      ingredients: string[];
      impact: number;
    };

type Reasons = Pick<MatchResult, 'pros' | 'cons' | 'excludedBy' | 'avoidedByUser'>;

function push(map: Map<string, string[]>, key: string, ingredient: string) {
  const list = map.get(key) ?? [];
  if (!list.includes(ingredient)) list.push(ingredient);
  map.set(key, list);
}

/**
 * positive: what helps, strongest first. negative: the "Unikam" shelf, avoided ingredients
 * (by group), then warnings, strongest first. Ingredients keep the order of the list (highest
 * concentration first).
 */
export function groupReasons(m: Reasons): { positive: ReasonGroup[]; negative: ReasonGroup[] } {
  const negative: ReasonGroup[] = [];
  if (m.avoidedByUser) negative.push({ kind: 'avoided_shelf', ingredients: [] });

  const excluded = new Map<string, string[]>();
  for (const e of m.excludedBy) push(excluded, e.group ?? '', e.ingredient);
  for (const [group, ingredients] of excluded)
    negative.push({ kind: 'excluded', group: group || null, ingredients });

  const helps = new Map<string, string[]>();
  const helpImpact = new Map<string, number>();
  for (const p of m.pros) {
    push(helps, p.concern, p.ingredient);
    helpImpact.set(p.concern, (helpImpact.get(p.concern) ?? 0) + p.impact);
  }
  const positive: ReasonGroup[] = [...helps]
    .map(([concern, ingredients]) => ({
      kind: 'helps' as const,
      concern,
      ingredients,
      impact: helpImpact.get(concern) ?? 0,
    }))
    .sort((a, b) => b.impact - a.impact);

  const warns = new Map<string, string[]>();
  const warnImpact = new Map<string, number>();
  for (const c of m.cons) {
    const key = `${c.reason}|${c.concern ?? ''}`;
    push(warns, key, c.ingredient);
    warnImpact.set(key, (warnImpact.get(key) ?? 0) + Math.abs(c.impact));
  }
  negative.push(
    ...[...warns]
      .map(([key, ingredients]) => {
        const [reason, concern] = key.split('|') as [ConReason, string];
        return {
          kind: 'warns' as const,
          reason,
          concern: concern || null,
          ingredients,
          impact: warnImpact.get(key) ?? 0,
        };
      })
      .sort((a, b) => b.impact - a.impact),
  );
  return { positive, negative };
}
