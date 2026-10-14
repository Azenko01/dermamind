/**
 * Catalogue import (PLAN.md 3.5). Idempotent — safe to run again after filling data/inci_full.json.
 *
 *   pnpm import:catalog            (uses DATABASE_URL from apps/api/.env)
 *
 * Sources: data/final_db.sql (Sa.Sha: products, brands, prices, key ingredients, effects) and
 * data/inci_full.json (full ingredient lists) and data/barcodes.json (EANs, filled by hand).
 * Writes data/import-report.md and
 * refreshes data/inci_missing.md.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../apps/api/src/generated/prisma/client';
import { buildCatalog, type BarcodeEntry, type FullInciEntry } from './catalog/build';
import { readSashaDb } from './catalog/sasha';
import { renderMissing, renderReport } from './catalog/report';
import { writeCatalog } from './catalog/write';

const root = resolve(__dirname, '..');
const data = (f: string) => resolve(root, 'data', f);

async function main(): Promise<void> {
  const envFile = resolve(root, 'apps/api/.env');
  if (!process.env.DATABASE_URL && existsSync(envFile)) process.loadEnvFile(envFile);
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

  const sasha = readSashaDb(data('final_db.sql'));
  const fullInci = existsSync(data('inci_full.json'))
    ? (JSON.parse(readFileSync(data('inci_full.json'), 'utf8')) as FullInciEntry[])
    : [];

  const barcodes = existsSync(data('barcodes.json'))
    ? (JSON.parse(readFileSync(data('barcodes.json'), 'utf8')) as BarcodeEntry[])
    : [];

  const catalog = buildCatalog(sasha, fullInci, barcodes);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const counts = await writeCatalog(prisma, catalog);
    writeFileSync(data('import-report.md'), renderReport(catalog, counts));
    writeFileSync(data('inci_missing.md'), renderMissing(catalog));
    console.log(
      `Imported ${counts.products} products, ${counts.ingredients} ingredients, ` +
        `${counts.effects} effects. ${catalog.products.filter((p) => !p.inciComplete).length} ` +
        `products with incomplete INCI. Report: data/import-report.md`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
