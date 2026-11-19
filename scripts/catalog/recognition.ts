import { existsSync, readFileSync, writeFileSync } from 'node:fs';

/** One measurement of how many INCI names on Open Beauty Facts lists we recognise. */
export interface RecognitionStep {
  /** short label, e.g. "OBF taxonomy" */
  step: string;
  at: string;
  products: number;
  tokens: number;
  known: number;
  /** of `known`: matched only by the typo-tolerant matcher (low confidence) */
  fuzzy: number;
  /** every name on the list known (exact or fuzzy) */
  fullyKnown: number;
  /** every name known by an exact or alias match */
  fullyKnownExact: number;
  dictionary: { ingredients: number; aliases: number };
}

export const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : '—');

export function readHistory(path: string): RecognitionStep[] {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as RecognitionStep[]) : [];
}

/** Replaces a step with the same label (re-running a step doesn't add rows). */
export function recordStep(path: string, step: RecognitionStep): RecognitionStep[] {
  const history = readHistory(path).filter((s) => s.step !== step.step);
  history.push(step);
  writeFileSync(path, `${JSON.stringify(history, null, 2)}\n`);
  return history;
}

export function renderRecognition(history: RecognitionStep[]): string {
  const rows = history.map((s, i) => {
    const prev = history[i - 1];
    const delta = prev
      ? ` (${s.known / s.tokens - prev.known / prev.tokens >= 0 ? '+' : ''}${(
          (s.known / s.tokens - prev.known / prev.tokens) *
          100
        ).toFixed(1)} pp)`
      : '';
    return `| ${s.step} | ${pct(s.known, s.tokens)}${delta} | ${pct(s.fuzzy, s.tokens)} | ${s.fullyKnown} (${pct(
      s.fullyKnown,
      s.products,
    )}) | ${s.fullyKnownExact} | ${s.dictionary.ingredients} / ${s.dictionary.aliases} |`;
  });
  return [
    '## Rozpoznawanie składników — przed i po',
    '',
    'Produkty Open Beauty Facts w bazie; nazwa = jedna pozycja listy INCI po parserze.',
    '„Rozmyte” = dopasowane z tolerancją literówek (wysoki próg, oznaczone jako niska pewność).',
    '',
    '| Krok | Rozpoznane nazwy | w tym rozmyte | Produkty w pełni rozpoznane | …bez rozmytych | Słownik: składniki / aliasy |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
    ...rows,
    '',
  ].join('\n');
}
