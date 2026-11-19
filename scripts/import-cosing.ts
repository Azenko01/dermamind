/**
 * CosIng — European Commission.
 *
 *   pnpm catalog:import-cosing             (annex exports downloaded once to data/raw/cosing/annexes/)
 *   pnpm catalog:import-cosing --refresh
 *
 * 1. Full inventory, if present: every *.csv / *.xlsx directly in data/raw/cosing/ with the CosIng
 *    columns ("INCI name", "CAS No", "Function", …). The Commission doesn't publish it as a
 *    download right now; when we get the file, dropping it there is enough.
 * 2. Annexes II–VI of Regulation (EC) 1223/2009 — the official CSV exports of the CosIng site.
 *    They set the prohibited (II) / restricted (III) flags and annex references.
 * Our curated dictionary always wins. Report: data/cosing-report.md
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import ExcelJS from 'exceljs';
import { PrismaClient } from '../apps/api/src/generated/prisma/client';
import { ANNEXES, parseAnnexCsv, parseInventory, type AnnexRow } from './catalog/cosing';
import { parseCsv } from './catalog/csv';
import { download, loadDatabaseUrl } from './catalog/download';
import { writeAnnexes, writeReference } from './catalog/reference-writer';

const ANNEX_URL = (n: string) =>
  `https://api.tech.ec.europa.eu/cosing20/1.0/api/annexes/${n}/export-csv`;
const root = resolve(__dirname, '..');
const dir = resolve(root, 'data/raw/cosing');

async function readTable(path: string): Promise<string[][]> {
  if (extname(path).toLowerCase() === '.csv') {
    const text = readFileSync(path, 'utf8');
    // CosIng exports have used both "," and ";"
    const header = text.split('\n').find((l) => /inci\s*name/i.test(l)) ?? '';
    return parseCsv(text, header.split(';').length > header.split(',').length ? ';' : ',');
  }
  const book = new ExcelJS.Workbook();
  await book.xlsx.readFile(path);
  const sheet = book.worksheets[0];
  const rows: string[][] = [];
  sheet?.eachRow((row) => {
    const values = row.values as unknown[];
    rows.push(values.slice(1).map((v) => (v === null || v === undefined ? '' : String(v))));
  });
  return rows;
}

async function main(): Promise<void> {
  const connectionString = loadDatabaseUrl(root);
  const refresh = process.argv.includes('--refresh');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const lines: string[] = [
    '# CosIng — European Commission',
    '',
    `Wygenerowano: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · \`pnpm catalog:import-cosing\``,
    '',
  ];
  try {
    // 1. inventory files, if any
    let files: string[] = [];
    try {
      files = readdirSync(dir).filter((f) => /\.(csv|xlsx)$/i.test(f));
    } catch {
      files = [];
    }
    lines.push('## Inwentarz składników', '');
    if (!files.length) {
      lines.push(
        'Brak pliku w `data/raw/cosing/` — Komisja nie udostępnia teraz całego inwentarza do',
        'pobrania. Słownik pochodzi z taksonomii Open Beauty Facts (zbudowanej z CosIng).',
        '',
      );
    }
    for (const f of files) {
      const entries = parseInventory(await readTable(resolve(dir, f)));
      const c = await writeReference(prisma, entries, 'cosing');
      lines.push(
        `- \`${f}\`: ${entries.length} wpisów → ${c.created} nowych, ${c.updated} zaktualizowanych, ` +
          `${c.enrichedCurated} naszych uzupełnionych, ${c.aliasesAdded} aliasów.`,
      );
      console.log(`Inventory ${f}: ${entries.length} entries, ${c.created} new`);
    }

    // 2. annexes
    const rows: AnnexRow[] = [];
    for (const n of ANNEXES) {
      const path = resolve(dir, 'annexes', `annex_${n}.csv`);
      await download(ANNEX_URL(n), path, refresh);
      rows.push(...parseAnnexCsv(n, parseCsv(readFileSync(path, 'utf8'))));
    }
    const a = await writeAnnexes(prisma, rows);
    const [prohibited, restricted] = await Promise.all([
      prisma.ingredient.count({ where: { isProhibited: true } }),
      prisma.ingredient.count({ where: { isRestricted: true } }),
    ]);
    lines.push(
      '',
      '## Załączniki rozporządzenia (WE) 1223/2009 (eksport CSV z CosIng)',
      '',
      '| Załącznik | Pozycje | Powiązane składniki |',
      '| --- | ---: | ---: |',
      ...ANNEXES.map(
        (n) => `| ${n} | ${rows.filter((r) => r.annex === n).length} | ${a.byAnnex[n] ?? 0} |`,
      ),
      '',
      `Nowe składniki z nazw słownika wspólnych nazw (zał. III–VI): ${a.created}.`,
      `Składniki z flagą „zakazany” (zał. II): ${prohibited}; „z ograniczeniami” (zał. III): ${restricted}.`,
      'Dopasowanie po nazwie INCI, aliasie albo numerze CAS.',
      '',
    );
    writeFileSync(resolve(root, 'data/cosing-report.md'), lines.join('\n'));
    console.log(
      `Annexes: ${rows.length} entries, ${a.flagged} ingredients flagged, ${a.created} created; ` +
        `prohibited ${prohibited}, restricted ${restricted}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
