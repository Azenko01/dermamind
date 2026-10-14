import { aliasKey, normalizeInciName, splitInci } from '@dermamind/scoring';
import { CATEGORY_MAP, DICTIONARY, PROBLEM_TO_CONCERN, type DictionaryEntry } from './dictionary';
import type { SashaDb } from './sasha';

export interface CatalogIngredient {
  inci: string;
  display: string;
  entry?: DictionaryEntry;
  /** alias keys pointing at this ingredient */
  aliases: Set<string>;
}

export interface CatalogProduct {
  sourceUrl: string;
  brand: string;
  name: string;
  /** name as in Sa.Sha's DB, for the report */
  sashaName: string;
  category: string;
  pricePln: number | null;
  inciRaw: string | null;
  inciComplete: boolean;
  /** canonical INCI names with their position in the full list */
  ingredients: { inci: string; position: number }[];
}

export interface Catalog {
  ingredients: Map<string, CatalogIngredient>;
  products: CatalogProduct[];
  effects: { inci: string; concern: string; effect: number; evidence: string }[];
  /** names from full INCI lists that the dictionary doesn't know (created without metadata) */
  unknown: Map<string, string[]>;
  aliasConflicts: string[];
  warnings: string[];
}

const titleCase = (s: string) =>
  s
    .toLowerCase()
    .replace(/(^|[\s/(-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());

/** Pure part of the import: everything is decided here, the DB writer only applies it. */
export function buildCatalog(sasha: SashaDb, fullInci: { url: string; inci: string[] }[]): Catalog {
  const ingredients = new Map<string, CatalogIngredient>();
  const byAlias = new Map<string, string>();
  const aliasConflicts: string[] = [];
  const warnings: string[] = [];

  const addAlias = (key: string, inci: string) => {
    if (!key) return;
    const existing = byAlias.get(key);
    if (existing && existing !== inci) {
      aliasConflicts.push(`"${key}" → ${existing} i ${inci} (zostaje ${existing})`);
      return;
    }
    byAlias.set(key, inci);
    ingredients.get(inci)?.aliases.add(key);
  };

  for (const entry of DICTIONARY) {
    const inci = normalizeInciName(entry.inci);
    ingredients.set(inci, { inci, display: entry.display, entry, aliases: new Set() });
  }
  for (const entry of DICTIONARY) {
    const inci = normalizeInciName(entry.inci);
    for (const name of [entry.inci, entry.display, ...(entry.aliases ?? [])])
      addAlias(aliasKey(name), inci);
  }

  /** Dictionary lookup, also for "AQUA (WATER)"-style names; unknown names become new ingredients. */
  const unknown = new Map<string, string[]>();
  const resolveName = (raw: string, product: string): string => {
    const inci = normalizeInciName(raw);
    const hit =
      byAlias.get(aliasKey(inci)) ?? byAlias.get(aliasKey(inci.replace(/\s*[([].*$/, '')));
    if (hit && !unknown.has(hit)) return hit;
    const key = hit ?? inci;
    if (!ingredients.has(key)) {
      ingredients.set(key, { inci: key, display: titleCase(key), aliases: new Set() });
      addAlias(aliasKey(key), key);
    }
    unknown.set(key, [...(unknown.get(key) ?? []), product]);
    return key;
  };

  const fullByUrl = new Map(fullInci.map((f) => [f.url, f.inci]));
  const products: CatalogProduct[] = sasha.products.map((p) => {
    const category = CATEGORY_MAP[p.category];
    if (!category) warnings.push(`Nieznana kategoria "${p.category}" (${p.name}) → other`);
    const name = p.name.startsWith(`${p.brand} `) ? p.name.slice(p.brand.length + 1) : p.name;

    const full = (fullByUrl.get(p.url) ?? []).flatMap((item) => splitInci(item));
    let list: { inci: string; position: number }[];
    if (full.length) {
      const seen = new Set<string>();
      list = [];
      full.forEach((raw) => {
        const inci = resolveName(raw, name);
        if (seen.has(inci)) return; // the same ingredient twice (e.g. alias + INCI) keeps its first position
        seen.add(inci);
        list.push({ inci, position: list.length + 1 });
      });
    } else {
      list = p.ingredients.map((i) => {
        const inci = byAlias.get(aliasKey(i.name));
        if (!inci) throw new Error(`Sa.Sha ingredient "${i.name}" is missing from the dictionary`);
        return { inci, position: i.position };
      });
    }

    return {
      sourceUrl: p.url,
      brand: p.brand,
      name,
      sashaName: p.name,
      category: category ?? 'other',
      pricePln: p.price,
      inciRaw: full.length ? full.join(', ') : null,
      inciComplete: full.length > 0,
      ingredients: list,
    };
  });

  const effects = sasha.effects.map((e) => {
    const inci = byAlias.get(aliasKey(e.ingredient));
    const concern = PROBLEM_TO_CONCERN[e.problem];
    if (!inci || !concern) throw new Error(`Cannot map effect ${e.ingredient} / ${e.problem}`);
    return {
      inci,
      concern,
      effect: e.effect === 'good' ? 1 : -1,
      evidence: `Baza Sa.Shy (final_db.sql): ${e.effect} dla ${e.problem}`,
    };
  });

  return { ingredients, products, effects, unknown, aliasConflicts, warnings };
}
