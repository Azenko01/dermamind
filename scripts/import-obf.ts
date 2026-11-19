/**
 * Barcodes + ingredient lists from the official Open Beauty Facts data export (licence ODbL).
 *
 *   pnpm catalog:import-obf              (DATABASE_URL from apps/api/.env)
 *   pnpm catalog:import-obf --refresh    (download a fresh dump first)
 *   pnpm catalog:import-obf --limit 2000 (only the first N lines, for a quick try)
 *
 * The dump (≈100 MB gzip) goes to data/raw/ (gitignored) and is read line by line — never loaded
 * whole. We keep records with a valid EAN-8/13, an ingredient list and an EU country; upsert by
 * EAN; never touch curated or user products. Writes data/obf-import-report.md.
 */
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  renameSync,
  statSync,
} from 'node:fs';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { createGunzip } from 'node:zlib';
import {
  normalizeObfProduct,
  obfImportSkipReason,
  type ObfProduct,
  type ObfRecord,
} from '@dermamind/scoring';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  linkInci,
  loadInciDictionary,
  obfProductData,
  writeIngredients,
} from '../apps/api/src/catalog/product-writer';
import { PrismaClient } from '../apps/api/src/generated/prisma/client';
import { emptyObfStats, renderObfReport, type ObfStats } from './catalog/obf-report';

/** Official export, documented at https://world.openbeautyfacts.org/data */
const DUMP_URL = 'https://static.openbeautyfacts.org/data/openbeautyfacts-products.jsonl.gz';
const USER_AGENT = 'DermaMind/1.0 (diploma project)';
const BATCH = 200;

const root = resolve(__dirname, '..');
const rawDir = resolve(root, 'data/raw');
const dumpPath = resolve(rawDir, 'openbeautyfacts-products.jsonl.gz');

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? (process.argv[i + 1] ?? '') : undefined;
}

async function download(): Promise<void> {
  mkdirSync(rawDir, { recursive: true });
  console.log(`Downloading ${DUMP_URL} …`);
  const res = await fetch(DUMP_URL, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok || !res.body) throw new Error(`Download failed: HTTP ${res.status}`);
  const part = `${dumpPath}.part`;
  await pipeline(Readable.fromWeb(res.body as WebReadableStream), createWriteStream(part));
  renameSync(part, dumpPath);
  console.log(`Saved ${(statSync(dumpPath).size / 1e6).toFixed(1)} MB to data/raw/`);
}

async function main(): Promise<void> {
  const envFile = resolve(root, 'apps/api/.env');
  if (!process.env.DATABASE_URL && existsSync(envFile)) process.loadEnvFile(envFile);
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

  if (process.argv.includes('--refresh') || !existsSync(dumpPath)) await download();
  const limit = Number(arg('--limit') ?? Infinity);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const stats: ObfStats = emptyObfStats();
  try {
    const dict = await loadInciDictionary(prisma);
    // barcode → what is there now; curated and user rows are never overwritten
    const existing = new Map(
      (
        await prisma.product.findMany({
          where: { barcode: { not: null } },
          select: { id: true, barcode: true, source: true, obfLastModified: true },
        })
      ).map((p) => [p.barcode!, p]),
    );
    const brands = new Map(
      (await prisma.brand.findMany({ select: { id: true, name: true } })).map((b) => [
        b.name.toLowerCase(),
        b.id,
      ]),
    );
    const seen = new Set<string>();
    let batch: ObfProduct[] = [];

    const flush = async () => {
      if (!batch.length) return;
      const items = batch;
      batch = [];
      await prisma.$transaction(
        async (tx) => {
          for (const p of items) {
            let brandId: number | null = null;
            if (p.brand) {
              const key = p.brand.toLowerCase();
              brandId = brands.get(key) ?? null;
              if (brandId === null) {
                brandId = (
                  await tx.brand.upsert({
                    where: { name: p.brand },
                    create: { name: p.brand },
                    update: {},
                  })
                ).id;
                brands.set(key, brandId);
              }
            }
            const linked = linkInci(p.inciRaw, dict);
            const data = obfProductData(p, brandId, linked);
            const row = existing.get(p.ean)
              ? await tx.product.update({ where: { barcode: p.ean }, data })
              : await tx.product.create({ data });
            await writeIngredients(tx, row.id, linked);
          }
        },
        { timeout: 120_000 },
      );
    };

    const lines = createInterface({
      input: createReadStream(dumpPath).pipe(createGunzip()),
      crlfDelay: Infinity,
    });
    for await (const line of lines) {
      if (stats.read >= limit) break;
      if (!line.trim()) continue;
      stats.read++;
      let record: ObfRecord;
      try {
        record = JSON.parse(line) as ObfRecord;
      } catch {
        stats.skipped.bad_json++;
        continue;
      }
      const p = normalizeObfProduct(record);
      const reason = obfImportSkipReason(p);
      if (reason || !p) {
        stats.skipped[reason ?? 'invalid_ean']++;
        continue;
      }
      if (seen.has(p.ean)) {
        stats.skipped.duplicate++;
        continue;
      }
      seen.add(p.ean);

      const current = existing.get(p.ean);
      if (current && current.source !== 'obf') {
        stats.skipped[current.source === 'curated' ? 'curated_exists' : 'user_exists']++;
        continue;
      }
      stats.kept++;
      if (p.isPolishMarket) stats.polish++;
      stats.categories[p.category] = (stats.categories[p.category] ?? 0) + 1;
      if (
        current?.obfLastModified &&
        p.lastModified &&
        current.obfLastModified.getTime() >= p.lastModified.getTime()
      ) {
        stats.unchanged++;
        continue;
      }
      if (current) stats.updated++;
      else stats.created++;
      batch.push(p);
      if (batch.length >= BATCH) {
        await flush();
        if (stats.read % 10_000 < BATCH) console.log(`… ${stats.read} read, ${stats.kept} kept`);
      }
    }
    await flush();

    const [db] = await prisma.$queryRaw<
      { total: bigint; polish: bigint; complete: bigint; known: bigint; unknown: bigint }[]
    >`
      SELECT count(*) AS total,
        count(*) FILTER (WHERE p.is_polish_market) AS polish,
        count(*) FILTER (WHERE p.inci_complete) AS complete,
        coalesce(sum((SELECT count(*) FROM product_ingredients pi WHERE pi.product_id = p.id)), 0) AS known,
        coalesce(sum(cardinality(p.inci_unknown)), 0) AS unknown
      FROM products p WHERE p.source = 'obf'`;
    stats.db = {
      total: Number(db!.total),
      polish: Number(db!.polish),
      complete: Number(db!.complete),
      known: Number(db!.known),
      unknown: Number(db!.unknown),
    };
    stats.dumpDate = statSync(dumpPath).mtime;
    writeFileSync(resolve(root, 'data/obf-import-report.md'), renderObfReport(stats));
    console.log(
      `Read ${stats.read}, kept ${stats.kept} (PL market ${stats.polish}): ` +
        `${stats.created} new, ${stats.updated} updated, ${stats.unchanged} unchanged. ` +
        `Report: data/obf-import-report.md`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
