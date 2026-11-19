/**
 * Refreshes data/alias-review.json with the current top unknown names (decisions already made
 * are kept; new names come in as "skip" with suggestions) and writes data/unknown-tokens.md.
 *
 *   pnpm catalog:unknown-tokens [--top 500]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../apps/api/src/generated/prisma/client';
import { renderUnknownTokens, type ReviewEntry } from './catalog/alias-review';
import { loadDatabaseUrl } from './catalog/download';
import { suggest } from './catalog/unknown-tokens';

const root = resolve(__dirname, '..');
const reviewFile = resolve(root, 'data/alias-review.json');

async function main(): Promise<void> {
  const top = Number(process.argv[process.argv.indexOf('--top') + 1]) || 500;
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: loadDatabaseUrl(root) }),
  });
  try {
    const rows = await prisma.$queryRaw<{ t: string; c: bigint }[]>`
      SELECT t, count(*) AS c FROM products p, unnest(p.inci_unknown) t
      WHERE p.source = 'obf' GROUP BY t ORDER BY c DESC, t LIMIT ${top}`;
    const unknown = new Map(rows.map((r) => [r.t, Number(r.c)]));
    const existing: ReviewEntry[] = existsSync(reviewFile)
      ? (JSON.parse(readFileSync(reviewFile, 'utf8')) as ReviewEntry[])
      : [];
    const byToken = new Map(existing.map((e) => [e.token, e]));
    const names = (await prisma.ingredient.findMany({ select: { inciName: true } })).map(
      (i) => i.inciName,
    );
    for (const [token, count] of unknown) {
      if (byToken.has(token)) continue;
      byToken.set(token, { token, count, action: 'skip', suggestions: suggest(token, names) });
    }
    const entries = [...byToken.values()].sort(
      (a, b) => b.count - a.count || a.token.localeCompare(b.token),
    );
    writeFileSync(reviewFile, `${JSON.stringify(entries, null, 1)}\n`);
    writeFileSync(resolve(root, 'data/unknown-tokens.md'), renderUnknownTokens(entries, unknown));
    console.log(
      `${entries.length} entries in data/alias-review.json, report: data/unknown-tokens.md`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
