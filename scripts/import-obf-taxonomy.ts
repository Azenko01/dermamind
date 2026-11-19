/**
 * Ingredient dictionary from the Open Beauty Facts ingredients taxonomy (openfoodfacts-server,
 * taxonomies/beauty/ingredients-cosing-obf.txt, licence ODbL; built from the EU CosIng inventory).
 *
 *   pnpm catalog:import-obf-taxonomy            (downloads the file to data/raw/obf-taxonomy/ once)
 *   pnpm catalog:import-obf-taxonomy --refresh
 *
 * Our curated dictionary always wins (see catalog/reference-writer.ts). Afterwards run
 * `pnpm catalog:relink` so existing products use the new names. Report: data/obf-taxonomy-report.md
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../apps/api/src/generated/prisma/client';
import { download, loadDatabaseUrl } from './catalog/download';
import { parseTaxonomy } from './catalog/obf-taxonomy';
import { writeReference } from './catalog/reference-writer';

const URL =
  'https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/taxonomies/beauty/ingredients-cosing-obf.txt';
const root = resolve(__dirname, '..');
const file = resolve(root, 'data/raw/obf-taxonomy/ingredients-cosing-obf.txt');

async function main(): Promise<void> {
  const connectionString = loadDatabaseUrl(root);
  if (await download(URL, file, process.argv.includes('--refresh')))
    console.log(`Downloaded ${URL}`);
  const entries = parseTaxonomy(readFileSync(file, 'utf8'));

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const c = await writeReference(prisma, entries, 'obf_taxonomy');
    const lines = [
      '# Słownik składników z taksonomii Open Beauty Facts',
      '',
      `Wygenerowano: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · \`pnpm catalog:import-obf-taxonomy\``,
      '',
      'Źródło: Open Beauty Facts, `taxonomies/beauty/ingredients-cosing-obf.txt` (ODbL 1.0),',
      'zbudowane na podstawie bazy CosIng — European Commission.',
      '',
      '| | Liczba |',
      '| --- | ---: |',
      `| Wpisy w taksonomii | ${c.entries} |`,
      `| Nowe składniki | ${c.created} |`,
      `| Nasze (curated) uzupełnione o CAS / EC / CosIng | ${c.enrichedCurated} |`,
      `| Zaktualizowane | ${c.updated} |`,
      `| Bez zmian | ${c.unchanged} |`,
      `| Nowe aliasy | ${c.aliasesAdded} |`,
      `| Aliasy zajęte przez inny składnik (zostawione) | ${c.aliasesTaken} |`,
      `| Aliasy niejednoznaczne (pominięte) | ${c.aliasesAmbiguous} |`,
      '',
      c.ambiguousExamples.length
        ? `Przykłady niejednoznacznych: ${c.ambiguousExamples.map((x) => `\`${x}\``).join(', ')}`
        : '',
      '',
    ];
    writeFileSync(resolve(root, 'data/obf-taxonomy-report.md'), lines.join('\n'));
    console.log(
      `Taxonomy: ${c.entries} entries → ${c.created} new, ${c.enrichedCurated} curated enriched, ` +
        `${c.updated} updated; ${c.aliasesAdded} aliases (${c.aliasesAmbiguous} ambiguous skipped)`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
