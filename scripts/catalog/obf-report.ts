import type { ObfSkipReason } from '@dermamind/scoring';

export type ObfSkip = ObfSkipReason | 'bad_json' | 'duplicate' | 'curated_exists' | 'user_exists';

export interface ObfStats {
  read: number;
  kept: number;
  polish: number;
  created: number;
  updated: number;
  unchanged: number;
  skipped: Record<ObfSkip, number>;
  categories: Record<string, number>;
  /** all source = obf rows after the import */
  db: { total: number; polish: number; complete: number; known: number; unknown: number };
  dumpDate: Date | null;
}

export function emptyObfStats(): ObfStats {
  return {
    read: 0,
    kept: 0,
    polish: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    skipped: {
      bad_json: 0,
      invalid_ean: 0,
      no_ingredients: 0,
      not_eu: 0,
      no_name: 0,
      duplicate: 0,
      curated_exists: 0,
      user_exists: 0,
    },
    categories: {},
    db: { total: 0, polish: 0, complete: 0, known: 0, unknown: 0 },
    dumpDate: null,
  };
}

const SKIP_LABELS: Record<ObfSkip, string> = {
  bad_json: 'uszkodzona linia JSON',
  invalid_ean: 'brak poprawnego EAN-8/EAN-13 (suma kontrolna)',
  no_ingredients: 'brak listy składników',
  not_eu: 'brak kraju UE w countries_tags',
  no_name: 'brak nazwy produktu',
  duplicate: 'ten sam EAN drugi raz w zrzucie',
  curated_exists: 'EAN jest już w naszym katalogu (curated wygrywa)',
  user_exists: 'EAN należy do produktu użytkownika',
};

const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : '—');

export function renderObfReport(s: ObfStats, now = new Date()): string {
  const skippedTotal = Object.values(s.skipped).reduce((a, b) => a + b, 0);
  const lines = [
    '# Import Open Beauty Facts',
    '',
    `Wygenerowano: ${now.toISOString().slice(0, 16).replace('T', ' ')} UTC · zrzut z ${
      s.dumpDate ? s.dumpDate.toISOString().slice(0, 10) : '—'
    } · skrypt \`pnpm catalog:import-obf\``,
    '',
    'Dane: Open Beauty Facts (https://world.openbeautyfacts.org), licencja ODbL 1.0.',
    '',
    '## Liczby',
    '',
    '| | Liczba |',
    '| --- | ---: |',
    `| Przeczytane rekordy | ${s.read} |`,
    `| Zachowane (EAN + skład + UE) | ${s.kept} |`,
    `| — w tym rynek polski (en:poland) | ${s.polish} |`,
    `| Nowe w bazie | ${s.created} |`,
    `| Zaktualizowane | ${s.updated} |`,
    `| Bez zmian (ten sam last_modified_t) | ${s.unchanged} |`,
    `| Pominięte razem | ${skippedTotal} |`,
    `| Produkty OBF w bazie po imporcie | ${s.db.total} (rynek PL: ${s.db.polish}) |`,
    '',
    '## Pominięte — powody',
    '',
    '| Powód | Liczba |',
    '| --- | ---: |',
    ...(Object.keys(SKIP_LABELS) as ObfSkip[]).map(
      (k) => `| ${SKIP_LABELS[k]} | ${s.skipped[k]} |`,
    ),
    '',
    '## Kategorie (heurystyka z categories_tags)',
    '',
    '| Kategoria | Liczba |',
    '| --- | ---: |',
    ...Object.entries(s.categories)
      .sort((a, b) => b[1] - a[1])
      .map(([c, n]) => `| ${c} | ${n} |`),
    '',
    '## Rozpoznawanie składników (wszystkie produkty OBF w bazie)',
    '',
    `- Nazw na listach: ${s.db.known + s.db.unknown}, rozpoznanych w naszym słowniku: ${
      s.db.known
    } (${pct(s.db.known, s.db.known + s.db.unknown)}).`,
    `- Produkty z w pełni rozpoznanym składem: ${s.db.complete} z ${s.db.total}.`,
    '- Nierozpoznane nazwy zapisujemy dosłownie w `products.inci_unknown` — bez zgadywania.',
    '  Wynik dopasowania liczy je jako nieznane, więc ma niższą pewność.',
    '',
  ];
  return lines.join('\n');
}
