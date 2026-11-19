/**
 * Links the team's own product photos to products.
 *
 *   pnpm catalog:attach-images            (files in data/images/)
 *   pnpm catalog:attach-images --dir path
 *
 * File name = EAN (5901234123457.jpg) or product id (id-42.jpg). JPEG, PNG or WebP, max 5 MB.
 * Sets products.own_image (wins over imported photos; imports never touch it) and clears it for
 * products whose file was removed. Photos are taken by the team — never downloaded from shops.
 */
import { openSync, readdirSync, readSync, closeSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../apps/api/src/generated/prisma/client';
import { loadDatabaseUrl } from './catalog/download';
import { extensionMatches, imageTarget, imageType } from './catalog/images';

const root = resolve(__dirname, '..');
const MAX_BYTES = 5 * 1024 * 1024;
const WARN_BYTES = 1.5 * 1024 * 1024;

function head(path: string): Uint8Array {
  const fd = openSync(path, 'r');
  const buf = Buffer.alloc(16);
  readSync(fd, buf, 0, 16, 0);
  closeSync(fd);
  return buf;
}

async function main(): Promise<void> {
  const i = process.argv.indexOf('--dir');
  const dir = resolve(i >= 0 ? process.argv[i + 1]! : resolve(root, 'data/images'));
  const files = readdirSync(dir).filter((f) => !f.startsWith('.') && f !== 'README.md');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: loadDatabaseUrl(root) }),
  });
  const problems: string[] = [];
  const warnings: string[] = [];
  try {
    const wanted = new Map<number, string>(); // product id → file
    for (const file of files.sort()) {
      const target = imageTarget(file);
      if (!target) {
        problems.push(
          `${file}: nazwa to nie EAN ani id produktu (np. 5901234123457.jpg, id-42.jpg)`,
        );
        continue;
      }
      const path = resolve(dir, file);
      const size = statSync(path).size;
      const type = imageType(head(path));
      if (!type || !extensionMatches(file, type)) {
        problems.push(`${file}: to nie jest plik ${file.split('.').pop()} (JPEG / PNG / WebP)`);
        continue;
      }
      if (size > MAX_BYTES) {
        problems.push(`${file}: ${(size / 1e6).toFixed(1)} MB — zmniejsz do < 5 MB`);
        continue;
      }
      if (size > WARN_BYTES)
        warnings.push(`${file}: ${(size / 1e6).toFixed(1)} MB — warto zmniejszyć`);

      const product =
        target.kind === 'ean'
          ? await prisma.product.findUnique({
              where: { barcode: target.ean },
              select: { id: true },
            })
          : await prisma.product.findUnique({ where: { id: target.id }, select: { id: true } });
      if (!product) {
        problems.push(
          `${file}: brak produktu z ${target.kind === 'ean' ? `EAN ${target.ean}` : `id ${target.id}`}`,
        );
        continue;
      }
      const other = wanted.get(product.id);
      if (other) {
        problems.push(
          `${file}: produkt ${product.id} ma już zdjęcie ${other} — zostawiamy pierwsze`,
        );
        continue;
      }
      wanted.set(product.id, file);
    }

    let set = 0;
    for (const [id, ownImage] of wanted) {
      const r = await prisma.product.updateMany({
        // NULL-safe "is different" (NOT (own_image = x) is NULL for products without a photo)
        where: { id, OR: [{ ownImage: null }, { ownImage: { not: ownImage } }] },
        data: { ownImage },
      });
      set += r.count;
    }
    const cleared = await prisma.product.updateMany({
      where: { ownImage: { not: null }, id: { notIn: [...wanted.keys()] } },
      data: { ownImage: null },
    });
    console.log(
      `${files.length} files: ${wanted.size} linked (${set} changed), ${cleared.count} photos removed, ` +
        `${problems.length} skipped`,
    );
    for (const w of warnings) console.log(`  uwaga: ${w}`);
    for (const p of problems) console.log(`  pominięte: ${p}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
