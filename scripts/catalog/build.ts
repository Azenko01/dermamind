import {
  aliasKey,
  inciLookupKeys,
  isValidEan,
  normalizeEan,
  normalizeInciName,
  splitInci,
} from '@dermamind/scoring';
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
  /** valid EAN from data/barcodes.json, or null */
  barcode: string | null;
  barcodeSource: string | null;
  /** canonical INCI names with their position in the full list */
  ingredients: { inci: string; position: number }[];
  /** where the full list came from (data/inci_full.json inciSource) and the filler's note */
  inciSource: string | null;
  inciNote: string | null;
  /** Sa.Sha's key ingredients whose position differs in the full list (or that are missing) */
  mismatches: { inci: string; sasha: number; full: number | null }[];
  /**
   * exact = every key ingredient at Sa.Sha's position; shifted = same order, each off by ≤ 2
   * (another shop's list has an ingredient more or less); mismatch = missing, reordered or far off
   */
  verification: 'exact' | 'shifted' | 'mismatch' | null;
}

export const MAX_SHIFT = 2;

export function verify(
  keys: { sasha: number; full: number | null }[],
): 'exact' | 'shifted' | 'mismatch' {
  if (keys.every((k) => k.full === k.sasha)) return 'exact';
  if (keys.some((k) => k.full === null || Math.abs(k.full - k.sasha) > MAX_SHIFT))
    return 'mismatch';
  const bySasha = [...keys].sort((a, b) => a.sasha - b.sasha);
  const ordered = bySasha.every((k, i) => i === 0 || (k.full ?? 0) > (bySasha[i - 1]!.full ?? 0));
  return ordered ? 'shifted' : 'mismatch';
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
export interface FullInciEntry {
  url: string;
  inci: string[];
  inciSource?: string | null;
  inciNote?: string | null;
}

export interface BarcodeEntry {
  url: string;
  name?: string;
  ean: string;
  source?: string;
}

export function buildCatalog(
  sasha: SashaDb,
  fullInci: FullInciEntry[],
  barcodes: BarcodeEntry[] = [],
): Catalog {
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
    const hit = inciLookupKeys(inci)
      .map((k) => byAlias.get(k))
      .find(Boolean);
    if (hit && !unknown.has(hit)) return hit;
    const key = hit ?? inci;
    if (!ingredients.has(key)) {
      ingredients.set(key, { inci: key, display: titleCase(key), aliases: new Set() });
      addAlias(aliasKey(key), key);
    }
    unknown.set(key, [...(unknown.get(key) ?? []), product]);
    return key;
  };

  const fullByUrl = new Map(fullInci.map((f) => [f.url, f]));

  // EANs: only valid check digits, each code on one product
  const barcodeByUrl = new Map<string, { ean: string; source: string | null }>();
  const seenEan = new Map<string, string>();
  for (const b of barcodes) {
    if (!b.ean?.trim()) continue;
    const ean = normalizeEan(b.ean);
    if (!isValidEan(ean)) {
      warnings.push(`Nieprawidłowy EAN „${b.ean}” (${b.name ?? b.url}) — pominięty`);
      continue;
    }
    const other = seenEan.get(ean);
    if (other) {
      warnings.push(
        `EAN ${ean} przypisany dwa razy (${other} i ${b.name ?? b.url}) — pominięty drugi`,
      );
      continue;
    }
    seenEan.set(ean, b.name ?? b.url);
    barcodeByUrl.set(b.url, { ean, source: b.source?.trim() || null });
  }
  const products: CatalogProduct[] = sasha.products.map((p) => {
    const category = CATEGORY_MAP[p.category];
    if (!category) warnings.push(`Nieznana kategoria "${p.category}" (${p.name}) → other`);
    const name = p.name.startsWith(`${p.brand} `) ? p.name.slice(p.brand.length + 1) : p.name;

    const entry = fullByUrl.get(p.url);
    const full = (entry?.inci ?? []).flatMap((item) => splitInci(item));
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

    // Cross-check: Sa.Sha recorded the real positions of key ingredients — a full list from another
    // shop should agree. Disagreements usually mean a different formula version.
    const keyPositions = p.ingredients.map((i) => ({
      inci: byAlias.get(aliasKey(i.name)) ?? normalizeInciName(i.name),
      sasha: i.position,
    }));
    const mismatches = full.length
      ? keyPositions.flatMap((k) => {
          const pos = list.find((l) => l.inci === k.inci)?.position ?? null;
          return pos === k.sasha ? [] : [{ inci: k.inci, sasha: k.sasha, full: pos }];
        })
      : [];

    return {
      sourceUrl: p.url,
      inciSource: full.length ? (entry?.inciSource ?? null) : null,
      inciNote: full.length ? (entry?.inciNote ?? null) : null,
      mismatches,
      verification: full.length
        ? verify(
            keyPositions.map((k) => ({
              sasha: k.sasha,
              full: list.find((l) => l.inci === k.inci)?.position ?? null,
            })),
          )
        : null,
      brand: p.brand,
      name,
      sashaName: p.name,
      category: category ?? 'other',
      pricePln: p.price,
      inciRaw: full.length ? full.join(', ') : null,
      inciComplete: full.length > 0,
      barcode: barcodeByUrl.get(p.url)?.ean ?? null,
      barcodeSource: barcodeByUrl.get(p.url)?.source ?? null,
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
