import { describe, expect, it } from 'vitest';
import { buildCatalog, verify } from './build';
import type { SashaDb } from './sasha';

const sasha: SashaDb = {
  products: [
    {
      name: 'Bielenda Hydro Cream',
      brand: 'Bielenda',
      category: 'cream',
      price: 27.99,
      url: 'https://example.com/a',
      ingredients: [
        { name: 'Aqua', position: 1 },
        { name: 'Shea Butter', position: 7 },
        { name: 'Aloe Vera', position: 12 },
      ],
    },
    {
      name: 'Ziaja Pianka',
      brand: 'Ziaja',
      category: 'micellar_water',
      price: null,
      url: 'https://example.com/b',
      ingredients: [{ name: 'Glycerin', position: 2 }],
    },
  ],
  ingredients: ['Aqua', 'Shea Butter', 'Aloe Vera', 'Glycerin'],
  problems: ['acne', 'dry_skin'],
  effects: [
    { ingredient: 'Shea Butter', problem: 'acne', effect: 'bad' },
    { ingredient: 'Glycerin', problem: 'dry_skin', effect: 'good' },
  ],
};

describe('buildCatalog', () => {
  it('falls back to Sa.Sha’s key ingredients and marks INCI as incomplete', () => {
    const c = buildCatalog(sasha, []);
    const cream = c.products[0]!;
    expect(cream).toMatchObject({
      brand: 'Bielenda',
      name: 'Hydro Cream',
      category: 'moisturizer',
      inciComplete: false,
      inciRaw: null,
    });
    expect(cream.ingredients).toEqual([
      { inci: 'AQUA', position: 1 },
      { inci: 'BUTYROSPERMUM PARKII BUTTER', position: 7 },
      { inci: 'ALOE BARBADENSIS LEAF JUICE', position: 12 },
    ]);
    expect(c.products[1]!.category).toBe('cleanser');
  });

  it('uses the full INCI list when present, resolving aliases and parenthesised names', () => {
    const c = buildCatalog(sasha, [
      {
        url: 'https://example.com/a',
        inci: [
          'Aqua (Water), Butyrospermum Parkii (Shea) Butter, Parfum, Limonene*, Mystery Extract, Water',
        ],
      },
    ]);
    const cream = c.products[0]!;
    expect(cream.inciComplete).toBe(true);
    expect(cream.ingredients).toEqual([
      { inci: 'AQUA', position: 1 },
      { inci: 'BUTYROSPERMUM PARKII BUTTER', position: 2 },
      { inci: 'PARFUM', position: 3 },
      { inci: 'LIMONENE', position: 4 },
      { inci: 'MYSTERY EXTRACT', position: 5 },
      // "Water" again = AQUA, keeps its first position
    ]);
    expect([...c.unknown.keys()]).toEqual(['MYSTERY EXTRACT']);
    expect(c.ingredients.get('MYSTERY EXTRACT')?.display).toBe('Mystery Extract');
  });

  it('records every product an unknown ingredient appears in', () => {
    const c = buildCatalog(sasha, [
      { url: 'https://example.com/a', inci: ['Aqua, Mystery Extract'] },
      { url: 'https://example.com/b', inci: ['Mystery Extract'] },
    ]);
    expect(c.unknown.get('MYSTERY EXTRACT')).toEqual(['Hydro Cream', 'Pianka']);
  });

  it('maps Sa.Sha effects onto our concerns (good = +1, bad = −1)', () => {
    const c = buildCatalog(sasha, []);
    expect(c.effects.map(({ inci, concern, effect }) => [inci, concern, effect])).toEqual([
      ['BUTYROSPERMUM PARKII BUTTER', 'breakouts', -1],
      ['GLYCERIN', 'dryness', 1],
    ]);
  });

  it('knows Polish and English names for ingredients users avoid', () => {
    const c = buildCatalog(sasha, []);
    expect(c.ingredients.get('COCOS NUCIFERA OIL')?.aliases).toContain('olejkokosowy');
    expect(c.ingredients.get('BUTYROSPERMUM PARKII BUTTER')?.aliases).toContain('masłoshea');
    expect(c.ingredients.get('PARFUM')?.aliases).toContain('fragrance');
    expect(c.aliasConflicts).toEqual([]);
  });
});

describe('verify (full INCI vs Sa.Sha positions)', () => {
  it('exact, shifted by ≤ 2 in the same order, or mismatch', () => {
    expect(
      verify([
        { sasha: 1, full: 1 },
        { sasha: 7, full: 7 },
      ]),
    ).toBe('exact');
    expect(
      verify([
        { sasha: 3, full: 2 },
        { sasha: 5, full: 4 },
      ]),
    ).toBe('shifted');
    expect(verify([{ sasha: 3, full: 6 }])).toBe('mismatch');
    expect(verify([{ sasha: 3, full: null }])).toBe('mismatch');
    expect(
      verify([
        { sasha: 3, full: 5 },
        { sasha: 4, full: 3 },
      ]),
    ).toBe('mismatch');
  });

  it('is reported per product', () => {
    const c = buildCatalog(sasha, [
      {
        url: 'https://example.com/a',
        inci: ['Aqua, Glycerin, Shea Butter'],
        inciSource: 'https://x.pl/a',
      },
    ]);
    expect(c.products[0]).toMatchObject({ verification: 'mismatch', inciSource: 'https://x.pl/a' });
    expect(c.products[0]!.mismatches).toEqual([
      { inci: 'BUTYROSPERMUM PARKII BUTTER', sasha: 7, full: 3 },
      { inci: 'ALOE BARBADENSIS LEAF JUICE', sasha: 12, full: null },
    ]);
    expect(c.products[1]!.verification).toBeNull();
  });
});
