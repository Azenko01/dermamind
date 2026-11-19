import { describe, expect, it } from 'vitest';
import { groupReasons } from './reasons';

describe('groupReasons', () => {
  it('puts every ingredient with the same reason on one line, strongest reason first', () => {
    const r = groupReasons({
      avoidedByUser: false,
      excludedBy: [],
      pros: [
        { ingredientId: 1, ingredient: 'Ceramide NP', concern: 'barrier', impact: 2 },
        { ingredientId: 2, ingredient: 'Niacinamide', concern: 'breakouts', impact: 6 },
        { ingredientId: 3, ingredient: 'Ceramide EOP', concern: 'barrier', impact: 2 },
        { ingredientId: 4, ingredient: 'Tocopherol', concern: 'barrier', impact: 1 },
        { ingredientId: 2, ingredient: 'Niacinamide', concern: 'barrier', impact: 1 },
      ],
      cons: [
        { ingredientId: 5, ingredient: 'Parfum', reason: 'fragrance_sensitive', impact: -3 },
        { ingredientId: 6, ingredient: 'Coconut Oil', reason: 'comedogenic', impact: -2 },
        { ingredientId: 7, ingredient: 'Isopropyl Myristate', reason: 'comedogenic', impact: -2 },
        {
          ingredientId: 8,
          ingredient: 'Lauric Acid',
          reason: 'harms_concern',
          concern: 'breakouts',
          impact: -1,
        },
      ],
    });
    expect(r.positive.map((g) => g.kind === 'helps' && [g.concern, g.ingredients])).toEqual([
      ['barrier', ['Ceramide NP', 'Ceramide EOP', 'Tocopherol', 'Niacinamide']],
      ['breakouts', ['Niacinamide']],
    ]);
    expect(
      r.negative.map((g) => g.kind === 'warns' && [g.reason, g.concern, g.ingredients]),
    ).toEqual([
      ['comedogenic', null, ['Coconut Oil', 'Isopropyl Myristate']],
      ['fragrance_sensitive', null, ['Parfum']],
      ['harms_concern', 'breakouts', ['Lauric Acid']],
    ]);
  });

  it('keeps what the user avoids at the top of the negative list, grouped by avoid group', () => {
    const r = groupReasons({
      avoidedByUser: true,
      pros: [],
      cons: [
        { ingredientId: 9, ingredient: 'Alcohol Denat.', reason: 'drying_alcohol', impact: -5 },
      ],
      excludedBy: [
        { ingredientId: 5, ingredient: 'Parfum', group: 'fragrance' },
        { ingredientId: 6, ingredient: 'Limonene', group: 'fragrance' },
        { ingredientId: 7, ingredient: 'Lanolin' },
      ],
    });
    expect(r.negative.map((g) => [g.kind, g.ingredients])).toEqual([
      ['avoided_shelf', []],
      ['excluded', ['Parfum', 'Limonene']],
      ['excluded', ['Lanolin']],
      ['warns', ['Alcohol Denat.']],
    ]);
    expect(r.positive).toEqual([]);
  });
});
