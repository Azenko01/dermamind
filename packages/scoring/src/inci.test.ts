import { describe, expect, it } from 'vitest';
import { aliasKey, normalizeInciName, splitInci } from './inci';

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

  it('ignores empty items', () => {
    expect(splitInci('Aqua,, Glycerin, ')).toEqual(['AQUA', 'GLYCERIN']);
  });
});
