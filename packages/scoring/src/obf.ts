/**
 * Open Beauty Facts records (data dump and API, licence ODbL) → our product fields. Shared by the
 * import script (scripts/import-obf.ts) and the scanner fallback in the API, so both read a record
 * the same way. Pure: no I/O.
 */
import { isValidEan, normalizeEan } from './ean';

/** The fields we read; everything is optional because the data is crowd-sourced. */
export interface ObfRecord {
  code?: unknown;
  product_name?: unknown;
  product_name_pl?: unknown;
  product_name_en?: unknown;
  brands?: unknown;
  image_front_url?: unknown;
  ingredients_text?: unknown;
  ingredients_text_pl?: unknown;
  ingredients_text_en?: unknown;
  countries_tags?: unknown;
  categories_tags?: unknown;
  last_modified_t?: unknown;
}

/** Fields to ask the OBF API for — keep in sync with ObfRecord. */
export const OBF_FIELDS = [
  'code',
  'product_name',
  'product_name_pl',
  'product_name_en',
  'brands',
  'image_front_url',
  'ingredients_text',
  'ingredients_text_pl',
  'ingredients_text_en',
  'countries_tags',
  'categories_tags',
  'last_modified_t',
] as const;

export type ObfCategory =
  | 'cleanser'
  | 'toner'
  | 'serum'
  | 'moisturizer'
  | 'eye_cream'
  | 'sunscreen'
  | 'mask'
  | 'exfoliant'
  | 'oil'
  | 'other';

export interface ObfProduct {
  ean: string;
  /** product_name_pl → _en → product_name; '' when OBF has none */
  name: string;
  /** first brand from the comma-separated list, or null */
  brand: string | null;
  imageUrl: string | null;
  /** ingredients_text_pl → _en → ingredients_text, or null */
  inciRaw: string | null;
  countries: string[];
  isEu: boolean;
  isPolishMarket: boolean;
  category: ObfCategory;
  lastModified: Date | null;
  /** product page, needed for the ODbL attribution link */
  sourceUrl: string;
}

/** The 27 EU member states as OBF writes them in countries_tags. */
export const EU_COUNTRY_TAGS: ReadonlySet<string> = new Set(
  [
    'austria',
    'belgium',
    'bulgaria',
    'croatia',
    'cyprus',
    'czech-republic',
    'denmark',
    'estonia',
    'finland',
    'france',
    'germany',
    'greece',
    'hungary',
    'ireland',
    'italy',
    'latvia',
    'lithuania',
    'luxembourg',
    'malta',
    'netherlands',
    'poland',
    'portugal',
    'romania',
    'slovakia',
    'slovenia',
    'spain',
    'sweden',
  ].map((c) => `en:${c}`),
);

const text = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.replace(/\s+/g, ' ').trim();
  return t.length > 0 ? t : null;
};

const tags = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string') : [];

/** Only http(s) image links from OBF's own image server end up in the app. */
function imageUrl(v: unknown): string | null {
  const url = text(v);
  return url && /^https:\/\/images\.openbeautyfacts\.org\//.test(url) ? url : null;
}

/**
 * Category from OBF categories_tags — only when the tags clearly say it is face care; everything
 * else (shampoo, toothpaste, shower gel, unclear) is 'other'. The rules are an import heuristic,
 * the Match Score comes from the ingredients only.
 */
export function obfCategory(categoriesTags: readonly string[]): ObfCategory {
  const t = categoriesTags
    .filter((c) => c.startsWith('en:'))
    .map((c) => c.slice(3).toLowerCase().replace(/\s+/g, '-'));
  const face = t.some((c) => /face|facial/.test(c));
  const notFace = t.some((c) =>
    /(^|-)(hair|body|shower|shampoos?|toothpastes?|deodorants?|household|bath|hands?|foot|feet|lips?|baby|intimate)(-|$)/.test(
      c,
    ),
  );
  if (notFace && !face) return 'other';
  const has = (re: RegExp) => t.some((c) => re.test(c) && !/hair|body|lip|household/.test(c));
  if (has(/sunscreen|sun-protection/)) return 'sunscreen';
  if (has(/eye-(cream|contour)/)) return 'eye_cream';
  if (has(/serum/)) return 'serum';
  if (has(/toner/)) return 'toner';
  if (has(/^(face|facial)-masks?$/)) return 'mask';
  if (has(/^(face|facial)-(scrubs?|exfoli)/)) return 'exfoliant';
  if (has(/cleans|micellar/)) return 'cleanser';
  if (has(/^(face|facial)-oils?$/)) return 'oil';
  if (has(/(face|facial|day|night|day-and-night)-creams?$|moisturi[sz]/)) return 'moisturizer';
  return 'other';
}

/** null when the record has no valid EAN-13 / EAN-8 — such a record can never be scanned. */
export function normalizeObfProduct(raw: ObfRecord): ObfProduct | null {
  const code = typeof raw.code === 'string' || typeof raw.code === 'number' ? String(raw.code) : '';
  const ean = normalizeEan(code.trim());
  if (!isValidEan(ean)) return null;

  const countries = tags(raw.countries_tags);
  const brand = text(raw.brands)?.split(',')[0]?.trim() || null;
  const modified = typeof raw.last_modified_t === 'number' ? raw.last_modified_t : null;
  return {
    ean,
    name: text(raw.product_name_pl) ?? text(raw.product_name_en) ?? text(raw.product_name) ?? '',
    brand,
    imageUrl: imageUrl(raw.image_front_url),
    inciRaw:
      text(raw.ingredients_text_pl) ??
      text(raw.ingredients_text_en) ??
      text(raw.ingredients_text) ??
      null,
    countries,
    isEu: countries.some((c) => EU_COUNTRY_TAGS.has(c)),
    isPolishMarket: countries.includes('en:poland'),
    category: obfCategory(tags(raw.categories_tags)),
    lastModified: modified !== null && modified > 0 ? new Date(modified * 1000) : null,
    sourceUrl: `https://world.openbeautyfacts.org/product/${ean}`,
  };
}

export type ObfSkipReason = 'invalid_ean' | 'no_ingredients' | 'not_eu' | 'no_name';

/** Why the bulk import leaves a record out (the scanner fallback is less strict), or null. */
export function obfImportSkipReason(p: ObfProduct | null): ObfSkipReason | null {
  if (!p) return 'invalid_ean';
  if (!p.inciRaw) return 'no_ingredients';
  if (!p.isEu) return 'not_eu';
  if (!p.name) return 'no_name';
  return null;
}
