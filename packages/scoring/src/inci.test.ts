import { describe, expect, it } from 'vitest';
import { aliasKey, inciLookupKeys, normalizeInciName, splitInci } from './inci';

describe('normalizeInciName', () => {
  it('upper-cases, trims and collapses spaces', () => {
    expect(normalizeInciName('  Sodium   Hyaluronate ')).toBe('SODIUM HYALURONATE');
  });

  it('drops footnote marks and trailing separators', () => {
    expect(normalizeInciName('Limonene*')).toBe('LIMONENE');
    expect(normalizeInciName('Glycerin,')).toBe('GLYCERIN');
  });

  it('keeps the dot of abbreviations like "Alcohol Denat."', () => {
    expect(normalizeInciName('Alcohol Denat.')).toBe('ALCOHOL DENAT.');
  });
});

describe('aliasKey', () => {
  it('ignores case, spaces and punctuation', () => {
    expect(aliasKey('Alcohol Denat.')).toBe('alcoholdenat');
    expect(aliasKey('ALCOHOL  DENAT')).toBe('alcoholdenat');
    expect(aliasKey('Caprylic/Capric Triglyceride')).toBe('capryliccaprictriglyceride');
  });

  it('keeps Polish letters', () => {
    expect(aliasKey('Masło shea')).toBe('masłoshea');
    expect(aliasKey('Olej kokosowy')).toBe('olejkokosowy');
  });
});

describe('splitInci', () => {
  it('splits a printed list in order', () => {
    expect(splitInci('Aqua, Glycerin, Niacinamide, Parfum.')).toEqual([
      'AQUA',
      'GLYCERIN',
      'NIACINAMIDE',
      'PARFUM',
    ]);
  });

  it('does not split inside parentheses', () => {
    expect(splitInci('Aqua (Water), Parfum (Fragrance, Aroma), CI 77891')).toEqual([
      'AQUA (WATER)',
      'PARFUM (FRAGRANCE, AROMA)',
      'CI 77891',
    ]);
  });

  it('drops prefixes, "(and)" and "may contain" tails', () => {
    expect(
      splitInci(
        'Skład: Aqua, Cetearyl Alcohol (and) Ceteareth-20, Glycerin [+/- CI 77891, CI 77491]',
      ),
    ).toEqual(['AQUA', 'CETEARYL ALCOHOL', 'CETEARETH-20', 'GLYCERIN']);
  });

  it('keeps commas between digits inside a name', () => {
    expect(splitInci('Aqua, 1, 2-Hexanediol')).toEqual(['AQUA', '1,2-HEXANEDIOL']);
    expect(splitInci('Aqua, 1,2-Hexanediol, Glycerin,1,3-Propanediol')).toEqual([
      'AQUA',
      '1,2-HEXANEDIOL',
      'GLYCERIN',
      '1,3-PROPANEDIOL',
    ]);
  });

  it('ignores empty items', () => {
    expect(splitInci('Aqua,, Glycerin, ')).toEqual(['AQUA', 'GLYCERIN']);
  });
});

describe('splitInci — pasted from packages and shops', () => {
  it('handles a real-looking list with (and), *, brackets, numbers and a footnote', () => {
    expect(
      splitInci(
        'INGREDIENTS: Aqua (Water), Cetearyl Alcohol (and) Cetearyl Glucoside, 1,2-Hexanediol, ' +
          'Butyrospermum Parkii (Shea) Butter*, Parfum (Fragrance), Limonene**. *organic **natural',
      ),
    ).toEqual([
      'AQUA (WATER)',
      'CETEARYL ALCOHOL',
      'CETEARYL GLUCOSIDE',
      '1,2-HEXANEDIOL',
      'BUTYROSPERMUM PARKII (SHEA) BUTTER',
      'PARFUM (FRAGRANCE)',
      'LIMONENE',
    ]);
  });

  it('accepts "Skład (INCI):", line breaks and a Polish "może zawierać" tail', () => {
    expect(splitInci('Skład (INCI): Aqua,\nGlycerin,\nCI 77891. Może zawierać: CI 77491')).toEqual([
      'AQUA',
      'GLYCERIN',
      'CI 77891',
    ]);
  });

  it('splits a list with one name per line', () => {
    expect(splitInci('Aqua\nGlycerin\n\nNiacinamide')).toEqual(['AQUA', 'GLYCERIN', 'NIACINAMIDE']);
  });

  it('keeps Polish names as typed (they are matched through aliases)', () => {
    expect(splitInci('Woda, Gliceryna, Olej kokosowy, Masło shea')).toEqual([
      'WODA',
      'GLICERYNA',
      'OLEJ KOKOSOWY',
      'MASŁO SHEA',
    ]);
  });

  it('keeps square-bracket groups together', () => {
    expect(splitInci('Aqua, Parfum [Fragrance, Aroma], Glycerin')).toEqual([
      'AQUA',
      'PARFUM [FRAGRANCE, AROMA]',
      'GLYCERIN',
    ]);
  });
});

describe('inciLookupKeys', () => {
  it('looks up by the full name, without parentheses and by what is inside', () => {
    expect(inciLookupKeys('Water (Aqua)')).toEqual(['wateraqua', 'water', 'aqua']);
    expect(inciLookupKeys('BUTYROSPERMUM PARKII (SHEA) BUTTER')).toEqual([
      'butyrospermumparkiisheabutter',
      'butyrospermumparkiibutter',
      'shea',
    ]);
    expect(inciLookupKeys('Glycerin')).toEqual(['glycerin']);
  });
});
