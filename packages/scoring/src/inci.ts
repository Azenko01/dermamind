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
  return (
    name
      .normalize('NFD')
      // "Limonène", "Glicérine" → limonene, glicerine; Polish ł has no decomposition
      .replace(/\p{M}+/gu, '')
      .replace(/[łŁ]/g, 'l')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '')
  );
}

/**
 * Keys to look a name up by, most specific first: the whole name, the name without parenthesised
 * parts, what's inside the parentheses. "Water (Aqua)" → water / aqua, "Butyrospermum Parkii (Shea)
 * Butter" → the INCI name itself. Also undoes typical OCR / typing slips that can't change the
 * meaning ("CL 77891" → CI 77891, "Pyridoxine HCI" → HCl, "C.I. 77891" → CI 77891).
 */
export function inciLookupKeys(name: string): string[] {
  const fixed = fixOcr(name);
  const variants = fixed === name ? [name] : [name, fixed];
  const keys = variants.flatMap((n) => [
    aliasKey(n),
    aliasKey(n.replace(/\s*[([][^)\]]*[)\]]/g, ' ')),
    ...[...n.matchAll(/[([]([^)\]]+)[)\]]/g)].map((m) => aliasKey(m[1] ?? '')),
  ]);
  return [...new Set(keys.filter((k) => k.length > 0))];
}

/**
 * Slips that don't change which substance it is: a colour index written "CL", "C.I." or without
 * the space, hydrochloride written "HCI".
 */
export function fixOcr(name: string): string {
  return name
    .replace(/\b(?:C\.?\s?I\.?|CL|Cl|C1)\s*-?\s*(\d{5})\b/g, 'CI $1')
    .replace(/\bHCI\b/g, 'HCL');
}

/**
 * "CI 77891 / Titanium Dioxide", "Aqua/Water/Eau", "Cocos Nucifera Oil / Coconut Oil": the same
 * substance written two ways. Only used when the whole name is unknown — real INCI names contain
 * slashes too ("Acrylates/C10-30 Alkyl Acrylate Crosspolymer").
 */
export function slashAlternatives(name: string): string[] {
  if (!name.includes('/')) return [];
  const parts = name
    .split(/\s*\/\s*/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2);
  return parts.length >= 2 ? parts : [];
}

/** "Ingredients:" in the languages we see on packs sold in the EU. */
const LIST_PREFIX =
  /^\s*(?:skład|sklad|ingredients?|ingrédients|ingredienti|ingredientes|ingrediënten|inhaltsstoffe|bestandteile|zutaten|composition|samenstelling|složení|zloženie|összetevők|inci)(?:\s*\((?:inci)\))?\s*[:.]?\s+/i;

/** "may contain" / "+/-" blocks list colourants that are not certainly in the product. */
const MAY_CONTAIN =
  /\s*[[(]?\s*(?:\+\s*\/\s*-|±|may contain|peut contenir|kann enthalten|może zawierać|puede contener|può contenere|kan bevatten|pode conter|může obsahovat)[\s\S]*$/i;

const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/**
 * Text-level clean-up before splitting: HTML entities (also the broken "&LT" without ";"),
 * typographic dashes and quotes, percentages ("Octinoxate 6.7%"), "Inactive:" / "Active
 * ingredients:" labels in the middle of the list.
 */
export function cleanInciText(raw: string): string {
  return raw
    .normalize('NFKC')
    .replace(/&#(\d+);?/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z]+);?/gi, (m, e: string) => HTML_ENTITIES[e.toLowerCase()] ?? m)
    .replace(/[<>]/g, ' ')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/\s*\(?\s*\d+(?:[.,]\d+)?\s*%\s*\)?/g, '')
    .replace(/\b(?:in)?active(?: ingredients?)?\s*:/gi, ',')
    .replace(/\s+\./g, '.');
}

/**
 * Splits an ingredient list as printed on the package into names, in order. Commas inside
 * parentheses ("Parfum (Fragrance, Aroma)") or between digits ("1,2-Hexanediol") don't split.
 * Dropped: "Skład:" / "Ingredients:" prefixes (several languages), "(and)", "may contain" / "+/-"
 * tails, percentages and footnotes like "*organic". A pasted list with one name per line (no
 * commas) is split by lines.
 */
export function splitInci(raw: string): string[] {
  let text = cleanInciText(raw)
    .replace(LIST_PREFIX, '')
    .replace(MAY_CONTAIN, '')
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
  // a list separated with " - " instead of commas: two or more " - " can't be one INCI name
  const expanded = names.flatMap((n) =>
    (n.match(/\s-\s/g)?.length ?? 0) >= 2 ? n.split(/\s-\s/) : [n],
  );

  // Some shops write "1, 2-Hexanediol" — glue a lone number back onto "2-…".
  const merged: string[] = [];
  for (const raw of expanded.map(normalizeInciName)) {
    const prev = merged.at(-1);
    if (prev !== undefined && /^\d+$/.test(prev) && /^\d+-/.test(raw))
      merged[merged.length - 1] = `${prev},${raw}`;
    else merged.push(raw);
  }
  return (
    merged
      .map((n, i) => (i === 0 ? n.replace(/^(?:INGREDIENTS?|INGRÉDIENTS|SKŁAD)\s+/, '') : n))
      // a label glued to a name: "GEL INGREDIENTS: AQUA", "INGREDIENTS/SASTOJCI: AQUA"
      .map((n) => n.replace(LABEL_BEFORE_COLON, '').trim())
      // single letters are pieces of a broken list ("N", "P"), never an ingredient
      .filter((n) => n.length > 1 && /[\p{L}\d]/u.test(n))
  );
}

const LABEL_BEFORE_COLON =
  /^[^:]*(?:INGRED|NGREDIENT|SASTOJ|SKŁAD|SKLAD|INHALTSSTOFF|COMPOSITION|ZUTATEN|СЪСТАВ)[^:]*:\s*/u;

export interface InciDictionary<T extends { id: number }> {
  /** canonical INCI name → ingredient */
  byInci: ReadonlyMap<string, T>;
  /** alias key (see aliasKey) → ingredient */
  byAlias: ReadonlyMap<string, T>;
  /** typo-tolerant lookup; without it only exact names and aliases match */
  fuzzy?: FuzzyIndex<T>;
  /** fuzzy matches decided beforehand, by input name (when the index holds only ids) */
  fuzzyByName?: ReadonlyMap<string, T>;
}

export interface ResolvedInci<T> {
  /** 1-based position in the list after duplicates of the same ingredient are dropped */
  position: number;
  /** exact = INCI name or alias; fuzzy = typo-tolerant (low confidence); null = unknown */
  match: 'exact' | 'fuzzy' | null;
  /** the name as split from the list (normalised by splitInci, otherwise untouched) */
  input: string;
  ingredient: T | null;
}

/**
 * Names → dictionary ingredients: canonical INCI name, alias keys (inciLookupKeys), then the
 * parts of "A / B" written-two-ways names, and only then — if the dictionary has a fuzzy index —
 * a typo-tolerant match, which is marked `fuzzy` so it is shown and scored as low confidence.
 * A name nothing matches stays `ingredient: null`. A second name for an ingredient already in the
 * list ("Aqua", "Water") is dropped so positions stay meaningful.
 */
export function resolveInci<T extends { id: number }>(
  names: readonly string[],
  dict: InciDictionary<T>,
): ResolvedInci<T>[] {
  // the fuzzy index also knows every canonical name as a key — a hit there is still exact
  const exact = (name: string): T | undefined =>
    dict.byInci.get(name) ??
    inciLookupKeys(name)
      .map((k) => dict.byAlias.get(k) ?? dict.fuzzy?.get(k))
      .find((x) => x !== undefined);

  const used = new Set<number>();
  const seen = new Set<string>();
  const rows: ResolvedInci<T>[] = [];
  for (const input of names) {
    if (!input || seen.has(input)) continue;
    seen.add(input);
    const parts = slashAlternatives(input);
    let hit: T | null = exact(input) ?? parts.map(exact).find((x) => x !== undefined) ?? null;
    let match: ResolvedInci<T>['match'] = hit ? 'exact' : null;
    if (!hit && (dict.fuzzy || dict.fuzzyByName)) {
      hit = dict.fuzzyByName?.get(input) ?? (dict.fuzzy ? fuzzyResolve(input, dict.fuzzy) : null);
      if (hit) match = 'fuzzy';
    }
    if (hit && used.has(hit.id)) continue;
    if (hit) used.add(hit.id);
    rows.push({ position: rows.length + 1, input, ingredient: hit, match });
  }
  return rows;
}

// ───────────────────────────── typo-tolerant matching ─────────────────────────────

/** Typo-tolerant match for a whole name, its lookup keys and its "A / B" parts. */
export function fuzzyResolve<T extends { id: number }>(
  input: string,
  index: FuzzyIndex<T>,
): T | null {
  return (
    [input, ...slashAlternatives(input)]
      .flatMap((n) => inciLookupKeys(n))
      .map((k) => fuzzyMatch(k, index))
      .find((x) => x !== null) ?? null
  );
}

/** Shortest key we try to correct: shorter names are too easy to confuse ("urea" / "urban"). */
export const FUZZY_MIN_LENGTH = 8;

export interface FuzzyIndex<T> {
  /** the entry with exactly this key, if any (a name we know, just not as an alias) */
  get(key: string): T | undefined;
  /** keys of similar length that share the first or the last two characters */
  candidates(key: string): Iterable<readonly [string, T]>;
}

export function buildFuzzyIndex<T>(entries: Iterable<readonly [string, T]>): FuzzyIndex<T> {
  const exact = new Map<string, T>();
  const buckets = new Map<string, (readonly [string, T])[]>();
  const add = (bucket: string, e: readonly [string, T]) => {
    const list = buckets.get(bucket);
    if (list) list.push(e);
    else buckets.set(bucket, [e]);
  };
  for (const e of entries) {
    const k = e[0];
    if (!exact.has(k)) exact.set(k, e[1]);
    // shorter keys are indexed as candidates too, so "XANTHANE" sees both xanthan and xanthine
    // (a tie → no correction); only queries need FUZZY_MIN_LENGTH
    if (k.length < FUZZY_MIN_LENGTH - 2) continue;
    add(`${k.length}<${k.slice(0, 2)}`, e);
    add(`${k.length}>${k.slice(-2)}`, e);
  }
  return {
    get: (key) => exact.get(key),
    *candidates(key: string) {
      for (let len = key.length - 1; len <= key.length + 1; len++) {
        yield* buckets.get(`${len}<${key.slice(0, 2)}`) ?? [];
        yield* buckets.get(`${len}>${key.slice(-2)}`) ?? [];
      }
    },
  };
}

/**
 * Optimal string alignment distance (Levenshtein + swapping two neighbours), giving up as soon as
 * it is certainly above `max`.
 */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        v = Math.min(v, prev2[j - 2]! + 1);
      cur.push(v);
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length]!;
}

const digits = (s: string) => s.replace(/\D+/g, ' ').trim();
/** letters a scan or a font mixes up: l / I / 1, O / 0 */
const OCR_SAME = (x: string, y: string) =>
  x === y || (/[il1]/.test(x) && /[il1]/.test(y)) || (/[o0]/.test(x) && /[o0]/.test(y));

/**
 * Whether a one-edit difference is a safe typo to correct (measured on the review of real lists):
 * - not in the first three characters (prefixes change the substance: PG-, DI-, SOY / COC…),
 *   except a scan mixing up l / I / 1 or O / 0 ("LODOPROPYNYL" → IODOPROPYNYL);
 * - not next to a digit (SD ALCOHOL 39-C ≠ 39-D, PEG-40 ≠ PEG-4);
 * - in names shorter than 10, no changed letter (XANTHANE ≠ XANTHINE).
 */
function safeTypo(a: string, b: string): boolean {
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  if (
    p < 3 &&
    !(
      a.length === b.length &&
      OCR_SAME(a[p] ?? '', b[p] ?? '') &&
      a.slice(p + 1) === b.slice(p + 1)
    )
  )
    return false;
  const around = [a[p - 1], a[p], a[p + 1], b[p - 1], b[p], b[p + 1]].join('');
  if (/\d/.test(around)) return false;
  // in short names a changed letter is too often another word (XANTHANE ≠ XANTHINE); a missing,
  // extra or swapped letter, or a scan mix-up, is still fine
  const substitution = a.length === b.length && a.slice(p + 1) === b.slice(p + 1);
  return !(substitution && a.length < 10 && !OCR_SAME(a[p] ?? '', b[p] ?? ''));
}

/**
 * The single dictionary entry one safe typo away, or null. Never across a different number
 * (PEG-40 ≠ PEG-4, CI 77491 ≠ CI 77492), never when two different ingredients are equally close.
 * Two edits are never corrected: in the review they produced wrong substances (MALVA → MALUS,
 * CITRUS PARADISI PEEL → SEED, SORBITAN PALMITATE → PALMATE).
 */
export function fuzzyMatch<T extends { id: number }>(key: string, index: FuzzyIndex<T>): T | null {
  if (key.length < FUZZY_MIN_LENGTH) return null;
  const numbers = digits(key);
  let found: T | null = null;
  let tie = false;
  const checked = new Set<string>();
  for (const [candidate, value] of index.candidates(key)) {
    if (checked.has(candidate)) continue;
    checked.add(candidate);
    if (candidate === key || digits(candidate) !== numbers) continue;
    if (editDistance(key, candidate, 1) !== 1 || !safeTypo(key, candidate)) continue;
    if (found && value.id !== found.id) tie = true;
    found ??= value;
  }
  return tie ? null : found;
}
