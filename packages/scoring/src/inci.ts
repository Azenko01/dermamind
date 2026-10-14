/**
 * INCI parsing and normalisation (PLAN.md 3.1, 3.5). Shared by the import script, the API (matching
 * avoided ingredients) and later the app's "Analizuj skład" screen.
 */

/** Canonical form stored in `ingredients.inci_name`: upper case, single spaces, no footnote marks. */
export function normalizeInciName(name: string): string {
  const cleaned = name
    .normalize('NFC')
    .replace(/[*†‡¹²³]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // A trailing dot ends the list ("…, Parfum.") — except in abbreviations like "Alcohol Denat.".
  const keepDot = ABBREVIATION_END.test(cleaned);
  return cleaned.replace(/[.;,\s]+$/, keepDot ? '.' : '').toUpperCase();
}

const ABBREVIATION_END = /\b(denat|ext|extr|sp|spp|var|ssp)\.$/i;

/**
 * Key for `ingredient_aliases.alias` and for matching anything a user types: lower case, letters and
 * digits only. "Alcohol Denat.", "ALCOHOL  DENAT" and "alcohol-denat" all become "alcoholdenat".
 */
export function aliasKey(name: string): string {
  return name
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

/**
 * Keys to look a name up by: the whole name, the name without parenthesised parts and what's inside
 * the parentheses. "Water (Aqua)" → water / aqua, "Butyrospermum Parkii (Shea) Butter" → the INCI
 * name itself.
 */
export function inciLookupKeys(name: string): string[] {
  const keys = [
    aliasKey(name),
    aliasKey(name.replace(/\s*[([][^)\]]*[)\]]/g, ' ')),
    ...[...name.matchAll(/[([]([^)\]]+)[)\]]/g)].map((m) => aliasKey(m[1] ?? '')),
  ];
  return [...new Set(keys.filter((k) => k.length > 0))];
}

/**
 * Splits an ingredient list as printed on the package into names, in order. Commas inside
 * parentheses ("Parfum (Fragrance, Aroma)") or between digits ("1,2-Hexanediol") don't split.
 * Dropped: "Skład:" / "Ingredients:" prefixes, "(and)", "may contain" / "+/-" tails and footnotes
 * like "*organic". A pasted list with one name per line (no commas) is split by lines.
 */
export function splitInci(raw: string): string[] {
  let text = raw
    .replace(/^\s*(skład|sklad|ingredients|inci)(\s*\((inci)\))?\s*:\s*/i, '')
    .replace(/\s*[[(]?\s*(\+\/-|may contain|może zawierać)[\s\S]*$/i, '')
    .replace(/(\.|\n)\s*\*[^\n,]*$/u, '')
    .replace(/\s*\(and\)\s*/gi, ', ');
  if (!/[,;•]/.test(text) && text.includes('\n')) text = text.replace(/\n+/g, ', ');

  const names: string[] = [];
  let depth = 0;
  let current = '';
  const chars = [...text];
  for (const [i, ch] of chars.entries()) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    // "1,2-Hexanediol": a comma between digits is part of the name
    const inNumber = ch === ',' && /\d/.test(chars[i - 1] ?? '') && /\d/.test(chars[i + 1] ?? '');
    if ((ch === ',' || ch === ';' || ch === '•') && depth === 0 && !inNumber) {
      names.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  names.push(current);

  // Some shops write "1, 2-Hexanediol" — glue a lone number back onto "2-…".
  const merged: string[] = [];
  for (const raw of names.map(normalizeInciName)) {
    const prev = merged.at(-1);
    if (prev !== undefined && /^\d+$/.test(prev) && /^\d+-/.test(raw))
      merged[merged.length - 1] = `${prev},${raw}`;
    else merged.push(raw);
  }
  return merged.filter((n) => n.length > 0);
}
