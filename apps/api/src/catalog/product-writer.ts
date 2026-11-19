import {
  aliasKey,
  buildFuzzyIndex,
  inciLookupKeys,
  resolveInci,
  inciNameCandidates,
  splitInci,
  type FuzzyIndex,
  type InciDictionary,
  type ObfProduct,
} from '@dermamind/scoring';
import type { Prisma, PrismaClient } from '../generated/prisma/client';

/**
 * Writing Open Beauty Facts and user products. Used by the API (scanner fallback, "Dodaj produkt")
 * and by scripts/import-obf.ts, so a product looks the same however it got in.
 */

type Db = PrismaClient | Prisma.TransactionClient;
type Dict = InciDictionary<{ id: number }>;

/** Longest list we link; anything longer is not a real ingredient list. */
export const MAX_INCI_NAMES = 300;

export interface LinkedInci {
  /** dictionary ingredients with their position in the full list */
  ingredients: {
    ingredientId: number;
    position: number;
    /** fuzzy = typo-tolerant match, low confidence */
    match: 'exact' | 'fuzzy';
    /** the name as written, for fuzzy matches */
    matchedFrom: string | null;
  }[];
  /** names we don't know, exactly as split from the list — never matched to a "closest" one */
  unknown: string[];
}

export function linkInci(inciRaw: string | null, dict: Dict): LinkedInci {
  if (!inciRaw) return { ingredients: [], unknown: [] };
  const rows = resolveInci(splitInci(inciRaw).slice(0, MAX_INCI_NAMES), dict);
  return {
    ingredients: rows.flatMap((r) =>
      r.ingredient
        ? [
            {
              ingredientId: r.ingredient.id,
              position: r.position,
              match: r.match === 'fuzzy' ? ('fuzzy' as const) : ('exact' as const),
              matchedFrom: r.match === 'fuzzy' ? r.input : null,
            },
          ]
        : [],
    ),
    unknown: rows.filter((r) => !r.ingredient).map((r) => r.input),
  };
}

type DictRows = {
  ingredients: { id: number; inciName: string }[];
  aliases: { alias: string; ingredientId: number }[];
};

async function dictionaryRows(db: Db): Promise<DictRows> {
  const [ingredients, aliases] = await Promise.all([
    db.ingredient.findMany({ select: { id: true, inciName: true } }),
    db.ingredientAlias.findMany({ select: { alias: true, ingredientId: true } }),
  ]);
  return { ingredients, aliases };
}

function fuzzyFrom({ ingredients, aliases }: DictRows): FuzzyIndex<{ id: number }> {
  return buildFuzzyIndex<{ id: number }>([
    ...aliases.map((a) => [a.alias, { id: a.ingredientId }] as const),
    ...ingredients.map((i) => [aliasKey(i.inciName), { id: i.id }] as const),
  ]);
}

/** Every key the fuzzy matcher may correct a name to: alias keys and canonical names. */
export async function loadFuzzyIndex(db: Db): Promise<FuzzyIndex<{ id: number }>> {
  return fuzzyFrom(await dictionaryRows(db));
}

/** The whole dictionary (~23 000 ingredients) with the fuzzy index — for bulk jobs. */
export async function loadInciDictionary(db: Db): Promise<Dict> {
  const rows = await dictionaryRows(db);
  return {
    byInci: new Map(rows.ingredients.map((i) => [i.inciName, { id: i.id }])),
    byAlias: new Map(rows.aliases.map((a) => [a.alias, { id: a.ingredientId }])),
    fuzzy: fuzzyFrom(rows),
  };
}

/**
 * Only the rows a single list needs — for one product in a request. The fuzzy index is passed in
 * (the API keeps one in memory, see InciIndexService).
 */
export async function inciDictionaryFor(
  db: Db,
  inciRaw: string | null,
  fuzzy?: FuzzyIndex<{ id: number }>,
): Promise<Dict> {
  const names = inciRaw ? splitInci(inciRaw).slice(0, MAX_INCI_NAMES) : [];
  if (names.length === 0) return { byInci: new Map(), byAlias: new Map(), fuzzy };
  const all = inciNameCandidates(names);
  const [ingredients, aliases] = await Promise.all([
    db.ingredient.findMany({
      where: { inciName: { in: all } },
      select: { id: true, inciName: true },
    }),
    db.ingredientAlias.findMany({
      where: { alias: { in: [...new Set(all.flatMap(inciLookupKeys))] } },
      select: { alias: true, ingredientId: true },
    }),
  ]);
  return {
    byInci: new Map(ingredients.map((i) => [i.inciName, { id: i.id }])),
    byAlias: new Map(aliases.map((a) => [a.alias, { id: a.ingredientId }])),
    fuzzy,
  };
}

/** Brand by name, case-insensitive, so "ZIAJA" and "Ziaja" are one brand. */
export async function brandId(db: Db, name: string | null): Promise<number | null> {
  const clean = name?.trim();
  if (!clean) return null;
  const existing = await db.brand.findFirst({
    where: { name: { equals: clean, mode: 'insensitive' } },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await db.brand.upsert({
    where: { name: clean },
    create: { name: clean },
    update: {},
    select: { id: true },
  });
  return created.id;
}

/** Replaces the product's ingredient rows and stores what we couldn't match. */
export async function writeIngredients(db: Db, productId: number, linked: LinkedInci) {
  await db.productIngredient.deleteMany({ where: { productId } });
  if (linked.ingredients.length) {
    await db.productIngredient.createMany({
      data: linked.ingredients.map((i) => ({ productId, ...i })),
    });
  }
}

/** Product columns for an Open Beauty Facts record (source = obf). */
export function obfProductData(p: ObfProduct, brand: number | null, linked: LinkedInci) {
  return {
    name: p.name || p.ean,
    brandId: brand,
    category: p.category,
    barcode: p.ean,
    imageUrl: p.imageUrl,
    source: 'obf' as const,
    sourceUrl: p.sourceUrl,
    inciRaw: p.inciRaw,
    inciUnknown: linked.unknown,
    // complete = every name on the list is one we know; otherwise "free of X" can't be promised
    inciComplete: linked.ingredients.length > 0 && linked.unknown.length === 0,
    isPolishMarket: p.isPolishMarket,
    obfLastModified: p.lastModified,
    isPublished: true,
  };
}
