/**
 * Re-links the ingredient lists of all Open Beauty Facts and user products with the current
 * dictionary and parser, then records how many names we recognise.
 *
 *   pnpm catalog:relink --step "OBF taxonomy"
 *   pnpm catalog:relink --dry-run --step "measure only"
 *
 * Writes data/recognition-history.json and the "przed i po" section of data/ingredient-recognition.md.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  linkInci,
  loadInciDictionary,
  writeIngredients,
} from '../apps/api/src/catalog/product-writer';
import { PrismaClient } from '../apps/api/src/generated/prisma/client';
import { recordStep, renderRecognition, type RecognitionStep } from './catalog/recognition';

const root = resolve(__dirname, '..');
const BATCH = 300;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const envFile = resolve(root, 'apps/api/.env');
  if (!process.env.DATABASE_URL && existsSync(envFile)) process.loadEnvFile(envFile);
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  const dryRun = process.argv.includes('--dry-run');
  const label = arg('--step') ?? new Date().toISOString().slice(0, 16);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const dict = await loadInciDictionary(prisma);
    const products = await prisma.product.findMany({
      where: { source: { in: ['obf', 'user'] }, inciRaw: { not: null } },
      select: { id: true, source: true, inciRaw: true },
      orderBy: { id: 'asc' },
    });
    const s: RecognitionStep = {
      step: label,
      at: new Date().toISOString(),
      products: 0,
      tokens: 0,
      known: 0,
      fuzzy: 0,
      fullyKnown: 0,
      fullyKnownExact: 0,
      dictionary: {
        ingredients: await prisma.ingredient.count(),
        aliases: await prisma.ingredientAlias.count(),
      },
    };

    for (let i = 0; i < products.length; i += BATCH) {
      const chunk = products.slice(i, i + BATCH);
      const linked = chunk.map((p) => ({ p, l: linkInci(p.inciRaw, dict) }));
      for (const { p, l } of linked) {
        if (p.source !== 'obf') continue;
        const fuzzy = l.ingredients.filter((x) => x.match === 'fuzzy').length;
        s.products++;
        s.tokens += l.ingredients.length + l.unknown.length;
        s.known += l.ingredients.length;
        s.fuzzy += fuzzy;
        if (l.unknown.length === 0 && l.ingredients.length > 0) {
          s.fullyKnown++;
          if (fuzzy === 0) s.fullyKnownExact++;
        }
      }
      if (dryRun) continue;
      await prisma.$transaction(
        async (tx) => {
          for (const { p, l } of linked) {
            await writeIngredients(tx, p.id, l);
            await tx.product.update({
              where: { id: p.id },
              data: {
                inciUnknown: l.unknown,
                inciComplete: l.ingredients.length > 0 && l.unknown.length === 0,
              },
            });
          }
        },
        { timeout: 120_000 },
      );
    }

    const history = recordStep(resolve(root, 'data/recognition-history.json'), s);
    writeFileSync(resolve(root, 'data/ingredient-recognition.md'), renderRecognition(history));
    console.log(
      `${dryRun ? '[dry run] ' : ''}${s.step}: ${s.known}/${s.tokens} names ` +
        `(${((s.known / s.tokens) * 100).toFixed(1)}%), fuzzy ${s.fuzzy}, ` +
        `fully known ${s.fullyKnown}/${s.products}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
