import { aliasKey, editDistance, inciLookupKeys } from '@dermamind/scoring';

export interface UnknownToken {
  token: string;
  /** occurrences across OBF products */
  count: number;
  products: number;
}

/**
 * Review suggestion for an unknown name: dictionary names up to two edits away (looser than the
 * automatic matcher — this is for a human to look at, never applied by itself).
 */
export function suggest(token: string, names: readonly string[], limit = 3): string[] {
  const keys = inciLookupKeys(token);
  const scored: { name: string; d: number }[] = [];
  for (const name of names) {
    const k = aliasKey(name);
    let best = 3;
    for (const key of keys) {
      if (Math.abs(key.length - k.length) > 2) continue;
      best = Math.min(best, editDistance(key, k, 2));
    }
    if (best <= 2) scored.push({ name, d: best });
  }
  return scored
    .sort((a, b) => a.d - b.d || a.name.length - b.name.length)
    .slice(0, limit)
    .map((s) => s.name);
}
