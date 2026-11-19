import {
  inciLookupKeys,
  resolveInci,
  splitInci,
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
  ingredients: { ingredientId: number; position: number }[];
  /** names we don't know, exactly as split from the list — never matched to a "closest" one */
  unknown: string[];
}

export function linkInci(inciRaw: string | null, dict: Dict): LinkedInci {
  if (!inciRaw) return { ingredients: [], unknown: [] };
  const rows = resolveInci(splitInci(inciRaw).slice(0, MAX_INCI_NAMES), dict);
  return {
    ingredients: rows.flatMap((r) =>
      r.ingredient ? [{ ingredientId: r.ingredient.id, position: r.position }] : [],
    ),
    unknown: rows.filter((r) => !r.ingredient).map((r) => r.input),
  };
}

/** The whole dictionary (a few hundred rows) — for the bulk import. */
export async function loadInciDictionary(db: Db): Promise<Dict> {
  const [ingredients, aliases] = await Promise.all([
    db.ingredient.findMany({ select: { id: true, inciName: true } }),
    db.ingredientAlias.findMany({ select: { alias: true, ingredientId: true } }),
  ]);
  return {
    byInci: new Map(ingredients.map((i) => [i.inciName, { id: i.id }])),
    byAlias: new Map(aliases.map((a) => [a.alias, { id: a.ingredientId }])),
  };
}

/** Only the rows a single list needs — for one product in a request. */
export async function inciDictionaryFor(db: Db, inciRaw: string | null): Promise<Dict> {
  const names = inciRaw ? splitInci(inciRaw).slice(0, MAX_INCI_NAMES) : [];
  if (names.length === 0) return { byInci: new Map(), byAlias: new Map() };
  const [ingredients, aliases] = await Promise.all([
    db.ingredient.findMany({
      where: { inciName: { in: names } },
      select: { id: true, inciName: true },
    }),
    db.ingredientAlias.findMany({
      where: { alias: { in: [...new Set(names.flatMap(inciLookupKeys))] } },
      select: { alias: true, ingredientId: true },
    }),
  ]);
  return {
    byInci: new Map(ingredients.map((i) => [i.inciName, { id: i.id }])),
    byAlias: new Map(aliases.map((a) => [a.alias, { id: a.ingredientId }])),
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
