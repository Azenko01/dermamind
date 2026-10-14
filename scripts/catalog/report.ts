import { MAX_SHIFT, type Catalog } from './build';
import type { ImportCounts } from './write';

const today = () => new Date().toISOString().slice(0, 10);

export function renderReport(c: Catalog, n: ImportCounts): string {
  const incomplete = c.products.filter((p) => !p.inciComplete);
  const lines = [
    '# Raport importu katalogu',
    '',
    `Wygenerowano: ${today()} przez \`pnpm import:catalog\`. Plik jest nadpisywany przy każdym imporcie.`,
    '',
    '## Liczby',
    '',
    '| Co | Ile |',
    '| --- | --- |',
    `| Marki | ${n.brands} |`,
    `| Produkty | ${n.products} |`,
    `| — z pełnym składem INCI | ${n.products - incomplete.length} |`,
    `| — tylko kluczowe składniki (niekompletne) | ${incomplete.length} |`,
    `| — z kodem EAN (\`data/barcodes.json\`) | ${c.products.filter((p) => p.barcode).length} |`,
    `| Składniki w bazie | ${n.ingredients} |`,
    `| Usunięte nieużywane składniki z poprzednich importów | ${n.removedIngredients} |`,
    `| Aliasy (warianty nazw, PL/EN) | ${n.aliases} |`,
    `| Powiązania produkt–składnik | ${n.productIngredients} |`,
    `| Wpływy składników na problemy skóry | ${n.effects} |`,
    `| Przypisania do grup unikania | ${n.groupMembers} |`,
    '',
    '## Nieznane składniki',
    '',
    'Nazwy z pełnych składów, których nie ma w słowniku (`scripts/catalog/dictionary.ts`). Są w bazie, ale bez',
    'funkcji, flag i wpływów — liczą się do „niepełnych danych” w Match Score.',
    '',
  ];
  if (c.unknown.size === 0) lines.push('Brak.', '');
  else {
    lines.push('| Składnik | Produkty |', '| --- | --- |');
    for (const [inci, products] of [...c.unknown].sort((a, b) => b[1].length - a[1].length)) {
      lines.push(
        `| ${inci} | ${products.length}: ${products.slice(0, 3).join(', ')}${products.length > 3 ? '…' : ''} |`,
      );
    }
    lines.push('');
  }
  const complete = c.products.filter((p) => p.inciComplete);
  if (complete.length) {
    const host = (url: string | null) => {
      if (!url) return 'brak źródła';
      try {
        return new URL(url).hostname.replace(/^www\./, '');
      } catch {
        return url;
      }
    };
    const bySource = new Map<string, number>();
    for (const p of complete)
      bySource.set(host(p.inciSource), (bySource.get(host(p.inciSource)) ?? 0) + 1);
    const count = (v: string) => complete.filter((p) => p.verification === v).length;
    const label = { exact: 'zgodny', shifted: 'przesunięty', mismatch: '**rozbieżny**' } as const;
    lines.push(
      '## Źródła pełnych składów i weryfikacja',
      '',
      `Źródła: ${[...bySource].map(([h, n]) => `${h} (${n})`).join(', ')}.`,
      '',
      'Import porównuje każdy pełny skład z kluczowymi składnikami z bazy Sa.Shy (ich pozycje pochodzą',
      'z Hebe):',
      '',
      `- **zgodny** — wszystkie na tych samych pozycjach: ${count('exact')}`,
      `- **przesunięty** — ta sama kolejność, przesunięcie o najwyżej ${MAX_SHIFT} (lista w innym sklepie ma`,
      `  składnik więcej lub mniej): ${count('shifted')}`,
      `- **rozbieżny** — składnika brak, inna kolejność albo duże przesunięcie; prawdopodobnie inna wersja`,
      `  receptury, sprawdzić z opakowaniem: ${count('mismatch')}`,
      '',
      '| Produkt | Źródło | Wynik | Różnice (składnik: Sa.Sha → pełny skład) | Notatka z inci_full.json |',
      '| --- | --- | --- | --- | --- |',
      ...complete
        .filter((p) => p.verification !== 'exact')
        .sort(
          (a, b) =>
            (a.verification === 'mismatch' ? -1 : 0) - (b.verification === 'mismatch' ? -1 : 0),
        )
        .map(
          (p) =>
            `| ${p.brand} ${p.name} | ${p.inciSource ? `[${host(p.inciSource)}](${p.inciSource})` : '—'} | ${
              label[p.verification ?? 'exact']
            } | ${p.mismatches.map((m) => `${m.inci}: ${m.sasha} → ${m.full ?? 'brak'}`).join('; ')} | ${p.inciNote ?? ''} |`,
        ),
      '',
    );
  }
  lines.push('## Produkty z niekompletnym składem', '');
  if (incomplete.length === 0) lines.push('Brak.', '');
  else {
    lines.push(
      'Znamy tylko kluczowe składniki z bazy Sa.Shy (z prawdziwą pozycją w składzie). Flagi „Co jest w środku”',
      'pokazujemy dla nich jako „brak danych”, a wynik jako niepewny. Uzupełnienie: `data/inci_missing.md`.',
      '',
      '| Produkt | Znane składniki |',
      '| --- | --- |',
      ...incomplete.map((p) => `| ${p.brand} ${p.name} | ${p.ingredients.length} |`),
      '',
    );
  }
  if (c.aliasConflicts.length || c.warnings.length) {
    lines.push(
      '## Ostrzeżenia',
      '',
      ...[...c.aliasConflicts, ...c.warnings].map((w) => `- ${w}`),
      '',
    );
  }
  return lines.join('\n');
}

export function renderMissing(c: Catalog): string {
  const missing = c.products.filter((p) => !p.inciComplete);
  const lines = [
    '# Brakujące pełne składy INCI',
    '',
    `Stan: ${today()}. Brakuje: **${missing.length} z ${c.products.length}**.`,
    '',
    'Strony nie zostały pobrane automatycznie: `robots.txt` sklepu hebe.pl blokuje agenta `ClaudeBot`',
    '(i inne boty AI) na całej domenie, więc Claude ich nie pobiera. To samo dotyczy Open Beauty Facts.',
    'Składów nie zgadujemy.',
    '',
    '## Jak uzupełnić',
    '',
    '1. Otwórz stronę produktu, zakładka **Skład**.',
    '2. Skopiuj cały skład do `data/inci_full.json`, pole `inci` danego produktu: lista nazw w kolejności',
    '   z opakowania (`["Aqua", "Glycerin"]`) albo jeden napis z przecinkami (`["Aqua, Glycerin"]`).',
    '3. Uruchom ponownie `pnpm import:catalog` — ten plik i `data/import-report.md` się zaktualizują.',
    '',
  ];
  if (missing.length) {
    lines.push(
      '| # | Marka | Produkt (nazwa z bazy Sa.Shy) | Strona |',
      '| --- | --- | --- | --- |',
      ...missing.map(
        (p, i) => `| ${i + 1} | ${p.brand} | ${p.sashaName} | [strona](${p.sourceUrl}) |`,
      ),
      '',
    );
  }
  return lines.join('\n');
}
