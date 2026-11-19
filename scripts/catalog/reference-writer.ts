/**
 * Writes reference ingredient data (OBF taxonomy, CosIng inventory, CosIng annexes) into
 * `ingredients` / `ingredient_aliases`. Rules:
 * - a curated row (our dictionary) keeps its name, functions and flags; only the reference
 *   columns (CosIng ref, CAS, EC, CosIng functions, annexes) are filled in;
 * - an alias that already points somewhere is never moved (curated and earlier aliases win);
 * - an alias two different entries claim is ambiguous and left out (reported, never guessed).
 */
import { aliasKey } from '@dermamind/scoring';
import type { PrismaClient } from '../../apps/api/src/generated/prisma/client';
import type { AnnexRow } from './cosing';
import { annexFlags, appFunctions, titleCaseInci, type TaxonomyEntry } from './obf-taxonomy';

type Source = 'obf_taxonomy' | 'cosing';

export interface ReferenceCounts {
  entries: number;
  created: number;
  enrichedCurated: number;
  updated: number;
  unchanged: number;
  aliasesAdded: number;
  aliasesTaken: number;
  aliasesAmbiguous: number;
  ambiguousExamples: string[];
}

const BATCH = 1000;
/** alias keys shorter than this are too generic ("oil", "eau") to point at one ingredient */
const MIN_ALIAS = 4;

const same = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

export async function writeReference(
  prisma: PrismaClient,
  entries: TaxonomyEntry[],
  source: Source,
  /** only add missing ingredients (annex stubs carry no data to update existing rows with) */
  { createOnly = false }: { createOnly?: boolean } = {},
): Promise<ReferenceCounts> {
  const counts: ReferenceCounts = {
    entries: entries.length,
    created: 0,
    enrichedCurated: 0,
    updated: 0,
    unchanged: 0,
    aliasesAdded: 0,
    aliasesTaken: 0,
    aliasesAmbiguous: 0,
    ambiguousExamples: [],
  };

  const existing = await prisma.ingredient.findMany({
    select: {
      id: true,
      inciName: true,
      source: true,
      cosingRef: true,
      casNumbers: true,
      ecNumbers: true,
      cosingFunctions: true,
      annexRefs: true,
      functions: true,
    },
  });
  const byInci = new Map(existing.map((i) => [i.inciName, i]));
  const aliases = new Map(
    (await prisma.ingredientAlias.findMany({ select: { alias: true, ingredientId: true } })).map(
      (a) => [a.alias, a.ingredientId],
    ),
  );
  const byId = new Map(existing.map((i) => [i.id, i]));

  // merge entries with the same canonical name (the taxonomy has a few duplicates)
  const merged = new Map<string, TaxonomyEntry>();
  for (const e of entries) {
    const m = merged.get(e.inci);
    if (!m) merged.set(e.inci, { ...e });
    else
      merged.set(e.inci, {
        ...m,
        synonyms: [...new Set([...m.synonyms, ...e.synonyms])],
        cas: [...new Set([...m.cas, ...e.cas])],
        ec: [...new Set([...m.ec, ...e.ec])],
        cosingFunctions: [...new Set([...m.cosingFunctions, ...e.cosingFunctions])],
        restrictions: [...new Set([...m.restrictions, ...e.restrictions])],
        cosingRef: m.cosingRef ?? e.cosingRef,
      });
  }

  // 1. ingredients: existing by INCI name or by an alias of the canonical name, else new
  const target = new Map<string, number | null>(); // inci → ingredient id (null = to create)
  const toCreate: TaxonomyEntry[] = [];
  for (const e of merged.values()) {
    const hit = byInci.get(e.inci) ?? byId.get(aliases.get(aliasKey(e.inci)) ?? -1);
    target.set(e.inci, hit?.id ?? null);
    if (!hit) toCreate.push(e);
  }

  const reference = (e: TaxonomyEntry) => {
    const annex = annexFlags(e.restrictions);
    return {
      cosingRef: e.cosingRef,
      casNumbers: e.cas,
      ecNumbers: e.ec,
      cosingFunctions: e.cosingFunctions,
      annexRefs: annex.annexRefs,
      isProhibited: annex.isProhibited,
      isRestricted: annex.isRestricted,
    };
  };

  for (let i = 0; i < toCreate.length; i += BATCH) {
    await prisma.ingredient.createMany({
      data: toCreate.slice(i, i + BATCH).map((e) => ({
        inciName: e.inci,
        displayName: titleCaseInci(e.inci),
        functions: appFunctions(e.cosingFunctions),
        source,
        ...reference(e),
      })),
      skipDuplicates: true,
    });
  }
  counts.created = toCreate.length;
  if (toCreate.length) {
    const created = await prisma.ingredient.findMany({
      where: { inciName: { in: toCreate.map((e) => e.inci) } },
      select: { id: true, inciName: true },
    });
    for (const c of created) target.set(c.inciName, c.id);
  }

  // existing rows: reference columns always; name/functions only for non-curated rows
  const updates: { id: number; data: object }[] = [];
  // several entries may reach one row through aliases ("AQUA", "WATER"): the entry with the
  // row's own name wins, otherwise the first one — so a re-run changes nothing
  const owner = new Map<number, string>();
  for (const e of merged.values()) {
    const id = target.get(e.inci);
    if (id === undefined || id === null) continue;
    if (!owner.has(id) || byId.get(id)?.inciName === e.inci) owner.set(id, e.inci);
  }
  for (const e of merged.values()) {
    const id = target.get(e.inci);
    const row = id !== undefined && id !== null ? byId.get(id) : undefined;
    if (!row || createOnly || owner.get(row.id) !== e.inci) continue;
    const ref = reference(e);
    const fns = appFunctions(e.cosingFunctions);
    // a curated dictionary entry has its own functions; a curated placeholder (a name from a
    // full INCI list the dictionary doesn't describe) may take the CosIng functions
    const protectedRow = row.source === 'curated' && row.functions.length > 0;
    const changed =
      row.cosingRef !== ref.cosingRef ||
      !same(row.casNumbers, ref.casNumbers) ||
      !same(row.ecNumbers, ref.ecNumbers) ||
      !same(row.cosingFunctions, ref.cosingFunctions) ||
      !same(row.annexRefs, ref.annexRefs) ||
      (!protectedRow && !same(row.functions, fns));
    if (!changed) {
      counts.unchanged++;
      continue;
    }
    if (row.source === 'curated') {
      counts.enrichedCurated++;
      updates.push({ id: row.id, data: protectedRow ? ref : { ...ref, functions: fns } });
    } else {
      counts.updated++;
      updates.push({ id: row.id, data: { ...ref, functions: fns, source } });
    }
  }
  for (let i = 0; i < updates.length; i += 200) {
    await prisma.$transaction(
      updates
        .slice(i, i + 200)
        .map((u) => prisma.ingredient.update({ where: { id: u.id }, data: u.data })),
    );
  }

  // 2. aliases: every spelling of every entry; ambiguous keys are left out
  const claims = new Map<string, Set<number>>();
  for (const e of merged.values()) {
    const id = target.get(e.inci);
    if (id === undefined || id === null) continue;
    for (const name of [e.inci, ...e.synonyms]) {
      const key = aliasKey(name);
      if (key.length < MIN_ALIAS || /^\d+$/.test(key)) continue;
      claims.set(key, (claims.get(key) ?? new Set()).add(id));
    }
  }
  const newAliases: { alias: string; ingredientId: number; source: Source }[] = [];
  for (const [key, ids] of claims) {
    const current = aliases.get(key);
    if (current !== undefined) {
      if (!ids.has(current)) counts.aliasesTaken++;
      continue;
    }
    if (ids.size > 1) {
      counts.aliasesAmbiguous++;
      if (counts.ambiguousExamples.length < 30) counts.ambiguousExamples.push(key);
      continue;
    }
    newAliases.push({ alias: key, ingredientId: [...ids][0]!, source });
  }
  for (let i = 0; i < newAliases.length; i += BATCH) {
    const r = await prisma.ingredientAlias.createMany({
      data: newAliases.slice(i, i + BATCH),
      skipDuplicates: true,
    });
    counts.aliasesAdded += r.count;
  }
  return counts;
}

/**
 * Annex flags for ingredients named in (or sharing a CAS number with) an annex entry. Glossary
 * names from annexes III–VI that we don't have yet are created as CosIng ingredients first.
 */
export async function writeAnnexes(
  prisma: PrismaClient,
  rows: AnnexRow[],
): Promise<{ flagged: number; created: number; byAnnex: Record<string, number> }> {
  const creatable = rows.filter((r) => r.annex !== 'II');
  const created = (
    await writeReference(
      prisma,
      creatable.flatMap((r) =>
        r.names.map((inci) => ({
          inci,
          synonyms: [],
          cosingRef: null,
          cas: r.names.length === 1 ? r.cas : [],
          ec: r.names.length === 1 ? r.ec : [],
          cosingFunctions: [],
          restrictions: [],
          parents: [],
        })),
      ),
      'cosing',
      { createOnly: true },
    )
  ).created;

  const ingredients = await prisma.ingredient.findMany({
    select: { id: true, inciName: true, casNumbers: true, annexRefs: true },
  });
  const aliasRows = await prisma.ingredientAlias.findMany({
    select: { alias: true, ingredientId: true },
  });
  const byInci = new Map(ingredients.map((i) => [i.inciName, i.id]));
  const byAlias = new Map(aliasRows.map((a) => [a.alias, a.ingredientId]));
  const byCas = new Map<string, number[]>();
  for (const i of ingredients)
    for (const c of i.casNumbers) byCas.set(c, [...(byCas.get(c) ?? []), i.id]);

  const refs = new Map<number, Set<string>>();
  const byAnnex: Record<string, number> = {};
  for (const r of rows) {
    const ids = new Set<number>();
    for (const n of r.names) {
      const id = byInci.get(n) ?? byAlias.get(aliasKey(n));
      if (id !== undefined) ids.add(id);
    }
    for (const c of r.cas) for (const id of byCas.get(c) ?? []) ids.add(id);
    for (const id of ids) refs.set(id, (refs.get(id) ?? new Set()).add(`${r.annex}/${r.ref}`));
    byAnnex[r.annex] = (byAnnex[r.annex] ?? 0) + ids.size;
  }

  const current = new Map(ingredients.map((i) => [i.id, i.annexRefs]));
  const updates = [...refs].flatMap(([id, set]) => {
    const merged = [...new Set([...(current.get(id) ?? []), ...set])].sort();
    if (same(merged, [...(current.get(id) ?? [])].sort())) return [];
    const flags = annexFlags(merged);
    return [prisma.ingredient.update({ where: { id }, data: flags })];
  });
  for (let i = 0; i < updates.length; i += 200)
    await prisma.$transaction(updates.slice(i, i + 200));
  return { flagged: refs.size, created, byAnnex };
}
