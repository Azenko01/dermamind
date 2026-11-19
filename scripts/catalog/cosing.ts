/**
 * CosIng (European Commission) — pure parsers, no I/O.
 *
 * 1. Annex exports II–VI of Regulation (EC) 1223/2009, as downloaded by the "CSV" button on the
 *    CosIng site (api.tech.ec.europa.eu/cosing20/1.0/api/annexes/{N}/export-csv).
 * 2. The full ingredient inventory, if someone puts an export in data/raw/cosing/ (CSV or XLSX
 *    with the standard CosIng columns). Nothing here needs code changes when that file arrives.
 */
import { normalizeInciName } from '@dermamind/scoring';
import { annexFlags, type TaxonomyEntry } from './obf-taxonomy';

export const ANNEXES = ['II', 'III', 'IV', 'V', 'VI'] as const;
export type Annex = (typeof ANNEXES)[number];

export interface AnnexRow {
  annex: Annex;
  ref: string;
  /** INCI names (glossary + "identified ingredients"), normalised */
  names: string[];
  cas: string[];
  ec: string[];
}

const CAS = /^\d{2,7}-\d{2}-\d$/;
const EC = /^\d{3}-\d{3}-\d$/;

const cell = (row: string[], header: string[], pred: (h: string) => boolean): string => {
  const i = header.findIndex((h) => pred(h.toLowerCase()));
  return i >= 0 ? (row[i] ?? '').trim() : '';
};

const numbers = (s: string, re: RegExp) =>
  s
    .split(/[\s/,;]+/)
    .map((x) => x.trim())
    .filter((x) => re.test(x));

/** Glossary names are separated by " / ", identified ingredients by commas. */
const names = (glossary: string, identified: string) => [
  ...new Set(
    [...glossary.split(/\s+\/\s+|\n/), ...identified.split(/,|\n/)]
      .map((n) => normalizeInciName(n))
      .filter((n) => n.length >= 2 && n !== '-' && !/^\d+$/.test(n)),
  ),
];

/** Rows of one annex export (the file starts with a few title lines before the header). */
export function parseAnnexCsv(annex: Annex, rows: string[][]): AnnexRow[] {
  const h = rows.findIndex((r) => (r[0] ?? '').trim().toLowerCase() === 'reference number');
  if (h < 0) throw new Error(`Annex ${annex}: header row not found`);
  const header = rows[h]!;
  return rows.slice(h + 1).flatMap((r) => {
    const ref = (r[0] ?? '').trim();
    if (!ref) return [];
    return [
      {
        annex,
        ref,
        names: names(
          cell(r, header, (x) => x.includes('common ingredients glossary')),
          cell(r, header, (x) => x.startsWith('identified ingredients')),
        ),
        cas: numbers(
          cell(r, header, (x) => x === 'cas number'),
          CAS,
        ),
        ec: numbers(
          cell(r, header, (x) => x === 'ec number'),
          EC,
        ),
      },
    ];
  });
}

/**
 * The CosIng inventory export ("COSING Ref No", "INCI name", "INN name", "Ph. Eur. Name",
 * "CAS No", "EC No", "Restriction", "Function", …). Column names are matched loosely so a
 * slightly different export still works; rows without an INCI name are skipped.
 */
export function parseInventory(rows: string[][]): TaxonomyEntry[] {
  const h = rows.findIndex((r) => r.some((c) => /^inci\s*name$/i.test(c.trim())));
  if (h < 0) throw new Error('CosIng inventory: no "INCI name" column found');
  const header = rows[h]!;
  return rows.slice(h + 1).flatMap((r) => {
    const inci = normalizeInciName(cell(r, header, (x) => /^inci\s*name$/.test(x)));
    if (!inci) return [];
    const restriction = cell(r, header, (x) => x.startsWith('restriction'));
    return [
      {
        inci,
        synonyms: [
          cell(r, header, (x) => x.startsWith('inn')),
          cell(r, header, (x) => x.startsWith('ph. eur') || x.startsWith('ph eur')),
        ].filter((x) => x && x !== '-'),
        cosingRef: cell(r, header, (x) => x.includes('ref')) || null,
        cas: numbers(
          cell(r, header, (x) => x.startsWith('cas')),
          CAS,
        ),
        ec: numbers(
          cell(r, header, (x) => x.startsWith('ec') || x.startsWith('einecs')),
          EC,
        ),
        cosingFunctions: cell(r, header, (x) => x.startsWith('function'))
          .split(/,|\n/)
          .map((f) =>
            f
              .trim()
              .toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/^colorant$/, 'cosmetic-colorant'),
          )
          .filter(Boolean),
        restrictions: annexFlags([restriction]).annexRefs,
        parents: [],
      },
    ];
  });
}
