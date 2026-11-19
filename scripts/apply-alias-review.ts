/**
 * Applies data/alias-review.json: "new" names become ingredients (source = reviewed, no metadata),
 * "alias" names point at their target. An alias key that already points elsewhere is left alone
 * and reported. Run `pnpm catalog:relink` afterwards.
 *
 *   pnpm catalog:apply-alias-review
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { aliasKey, normalizeInciName } from '@dermamind/scoring';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../apps/api/src/generated/prisma/client';
import { validateReview, type ReviewEntry } from './catalog/alias-review';
import { loadDatabaseUrl } from './catalog/download';
import { titleCaseInci } from './catalog/obf-taxonomy';

const root = resolve(__dirname, '..');

async function main(): Promise<void> {
  const entries = JSON.parse(
    readFileSync(resolve(root, 'data/alias-review.json'), 'utf8'),
  ) as ReviewEntry[];
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: loadDatabaseUrl(root) }),
  });
  try {
    const known = new Set(
      (await prisma.ingredient.findMany({ select: { inciName: true } })).map((i) => i.inciName),
    );
    const errors = validateReview(entries, known);
    if (errors.length) throw new Error(`data/alias-review.json:\n- ${errors.join('\n- ')}`);

    const toCreate = [
      ...new Set(
        entries
          .filter((e) => e.action === 'new')
          .map((e) => normalizeInciName(e.target!))
          .filter((n) => !known.has(n)),
      ),
    ];
    await prisma.ingredient.createMany({
      data: toCreate.map((inciName) => ({
        inciName,
        displayName: titleCaseInci(inciName),
        source: 'reviewed' as const,
      })),
      skipDuplicates: true,
    });
    const ids = new Map(
      (await prisma.ingredient.findMany({ select: { id: true, inciName: true } })).map((i) => [
        i.inciName,
        i.id,
      ]),
    );
    const aliases = new Map(
      (await prisma.ingredientAlias.findMany({ select: { alias: true, ingredientId: true } })).map(
        (a) => [a.alias, a.ingredientId],
      ),
    );
    let added = 0;
    const taken: string[] = [];
    for (const e of entries) {
      if (e.action !== 'alias' && e.action !== 'new') continue;
      const id = ids.get(normalizeInciName(e.target!));
      if (id === undefined) continue;
      for (const key of new Set([aliasKey(e.token), aliasKey(e.target!)])) {
        const current = aliases.get(key);
        if (current === id) continue;
        if (current !== undefined) {
          taken.push(`${e.token} (${key})`);
          continue;
        }
        await prisma.ingredientAlias.create({
          data: { alias: key, ingredientId: id, source: 'reviewed' },
        });
        aliases.set(key, id);
        added++;
      }
    }
    console.log(
      `Review: ${toCreate.length} new ingredients, ${added} aliases` +
        (taken.length ? `; already pointing elsewhere (kept): ${taken.join(', ')}` : ''),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
