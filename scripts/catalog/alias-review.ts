/**
 * data/alias-review.json — the reviewed decisions for the most frequent unknown names on Open
 * Beauty Facts lists. People edit this file; `pnpm catalog:apply-alias-review` applies it.
 *
 * action:
 * - alias          the name is another spelling / language / typo of `target` (an INCI name)
 * - new            the name is a real INCI name missing from our dictionary; `target` = canonical
 * - auto           nothing to do — it resolves through another entry (parentheses, "A / B")
 * - not_ingredient not an ingredient name (list fragment, address, detergent class, packaging)
 * - skip           undecided — stays unknown until someone decides
 */
export type ReviewAction = 'alias' | 'new' | 'auto' | 'not_ingredient' | 'skip';

export interface ReviewEntry {
  token: string;
  /** occurrences across OBF products when the list was generated */
  count: number;
  action: ReviewAction;
  target?: string;
  note?: string;
  /** looser suggestions for a human (never applied automatically) */
  suggestions?: string[];
}

const ACTIONS = new Set<ReviewAction>(['alias', 'new', 'auto', 'not_ingredient', 'skip']);

export function validateReview(entries: ReviewEntry[], knownInci: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  const newTargets = new Set(entries.filter((e) => e.action === 'new').map((e) => e.target));
  const seen = new Set<string>();
  for (const e of entries) {
    if (seen.has(e.token)) errors.push(`duplicate token: ${e.token}`);
    seen.add(e.token);
    if (!ACTIONS.has(e.action)) errors.push(`${e.token}: unknown action ${String(e.action)}`);
    if ((e.action === 'alias' || e.action === 'new') && !e.target)
      errors.push(`${e.token}: ${e.action} needs a target`);
    if (e.action === 'alias' && e.target && !knownInci.has(e.target) && !newTargets.has(e.target))
      errors.push(`${e.token}: target ${e.target} is neither in the dictionary nor added as new`);
  }
  return errors;
}

const ACTION_LABEL: Record<ReviewAction, string> = {
  alias: 'alias →',
  new: 'nowa nazwa INCI',
  auto: 'rozpozna się samo',
  not_ingredient: 'nie składnik',
  skip: '**do decyzji**',
};

export function renderUnknownTokens(
  entries: ReviewEntry[],
  stillUnknown: ReadonlyMap<string, number>,
): string {
  const by = (a: ReviewAction) => entries.filter((e) => e.action === a);
  const esc = (s: string) => s.replace(/\|/g, '\\|');
  return [
    '# Najczęstsze nierozpoznane nazwy składników (Open Beauty Facts)',
    '',
    'Lista do ręcznej kontroli. Decyzje są w `data/alias-review.json` — popraw tam `action` /',
    '`target` i uruchom `pnpm catalog:apply-alias-review && pnpm catalog:relink`.',
    'Nowe nazwy INCI dostały źródło `reviewed`: bez funkcji i flag, dopóki ktoś ich nie opisze.',
    '',
    `Podsumowanie: alias ${by('alias').length}, nowe nazwy ${by('new').length}, rozpoznane przez inne wpisy ${
      by('auto').length
    }, nie składnik ${by('not_ingredient').length}, do decyzji ${by('skip').length}.`,
    '',
    '| # | Nazwa z etykiety | Wystąpienia | Decyzja | Cel | Nadal nierozpoznane | Uwagi / podpowiedzi |',
    '| ---: | --- | ---: | --- | --- | ---: | --- |',
    ...entries.map((e, i) => {
      const hint = [e.note, e.suggestions?.length ? `podpowiedzi: ${e.suggestions.join(', ')}` : '']
        .filter(Boolean)
        .join('; ');
      return `| ${i + 1} | ${esc(e.token)} | ${e.count} | ${ACTION_LABEL[e.action]} | ${esc(
        e.action === 'alias' || e.action === 'new' ? (e.target ?? '') : '',
      )} | ${stillUnknown.get(e.token) ?? 0} | ${esc(hint)} |`;
    }),
    '',
  ].join('\n');
}
