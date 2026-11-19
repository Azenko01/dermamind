import { describe, expect, it } from 'vitest';
import {
  aliasKey,
  buildFuzzyIndex,
  cleanInciText,
  editDistance,
  fixOcr,
  fuzzyMatch,
  inciLookupKeys,
  normalizeInciName,
  resolveInci,
  slashAlternatives,
  splitInci,
} from './inci';

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

  it('drops diacritics, so labels with and without accents match', () => {
    expect(aliasKey('Masło shea')).toBe('masloshea');
    expect(aliasKey('Olej kokosowy')).toBe('olejkokosowy');
    expect(aliasKey('LIMONÈNE')).toBe(aliasKey('Limonene'));
    expect(aliasKey('Glicérine')).toBe('glicerine');
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

describe('resolveInci', () => {
  const aqua = { id: 1 };
  const glycerin = { id: 2 };
  const dict = {
    byInci: new Map([
      ['AQUA', aqua],
      ['GLYCERIN', glycerin],
    ]),
    byAlias: new Map([
      ['aqua', aqua],
      ['water', aqua],
      ['glycerin', glycerin],
    ]),
  };

  it('matches by INCI name, alias and parenthesised name, in order', () => {
    const rows = resolveInci(['WATER (AQUA)', 'GLYCERIN', 'MYSTERY EXTRACT'], dict);
    expect(rows).toEqual([
      { position: 1, input: 'WATER (AQUA)', ingredient: aqua, match: 'exact' },
      { position: 2, input: 'GLYCERIN', ingredient: glycerin, match: 'exact' },
      { position: 3, input: 'MYSTERY EXTRACT', ingredient: null, match: null },
    ]);
  });

  it('never guesses a near match and drops a second name for the same ingredient', () => {
    const rows = resolveInci(['AQUA', 'WATER', 'GLYCERINE', 'AQUA'], dict);
    expect(rows.map((r) => [r.input, r.ingredient?.id ?? null, r.position])).toEqual([
      ['AQUA', 1, 1],
      ['GLYCERINE', null, 2],
    ]);
  });
});

describe('normaliser — what real Open Beauty Facts lists look like', () => {
  it('decodes HTML entities, also without the semicolon', () => {
    expect(cleanInciText('Aqua &amp; Glycerin, Parfum &LT;Fragrance&GT;')).toBe(
      'Aqua & Glycerin, Parfum  Fragrance ',
    );
    expect(splitInci('Aqua, &quot;Glycerin&quot;, Parfum')).toEqual([
      'AQUA',
      '"GLYCERIN"',
      'PARFUM',
    ]);
  });

  it('removes percentages and "Active / Inactive:" labels', () => {
    expect(
      splitInci('Octinoxate 6.743250%, Titanium Dioxide 3.5910%. Inactive: Water, Dimethicone'),
    ).toEqual(['OCTINOXATE', 'TITANIUM DIOXIDE', 'WATER', 'DIMETHICONE']);
    expect(splitInci('Active ingredients: Zinc Oxide (20 %), Aqua')).toEqual([
      'ZINC OXIDE',
      'AQUA',
    ]);
  });

  it('drops list prefixes and "may contain" blocks in several languages', () => {
    expect(splitInci('Ingrédients : Aqua, Glycerin. Peut contenir : CI 77891')).toEqual([
      'AQUA',
      'GLYCERIN',
    ]);
    expect(splitInci('Inhaltsstoffe: Aqua, Glycerin [+/- CI 77491]')).toEqual(['AQUA', 'GLYCERIN']);
    expect(splitInci('INGREDIENTS AQUA, GLYCERIN')).toEqual(['AQUA', 'GLYCERIN']);
    expect(splitInci('Aqua, Glycerin ± CI 77891')).toEqual(['AQUA', 'GLYCERIN']);
  });

  it('normalises dashes, spaces and trailing dots', () => {
    expect(splitInci('Aqua, Ceteareth–20 , Alcohol Denat., Parfum.')).toEqual([
      'AQUA',
      'CETEARETH-20',
      'ALCOHOL DENAT.',
      'PARFUM',
    ]);
  });

  it('fixes colour-index and hydrochloride slips', () => {
    expect(fixOcr('CL 77891')).toBe('CI 77891');
    expect(fixOcr('C.I. 77891')).toBe('CI 77891');
    expect(fixOcr('CI77891')).toBe('CI 77891');
    expect(fixOcr('PYRIDOXINE HCI')).toBe('PYRIDOXINE HCL');
    expect(inciLookupKeys('CL 42090')).toContain('ci42090');
  });

  it('splits "written two ways" names only into whole parts', () => {
    expect(slashAlternatives('CI 77891 / TITANIUM DIOXIDE')).toEqual([
      'CI 77891',
      'TITANIUM DIOXIDE',
    ]);
    expect(slashAlternatives('AQUA/WATER/EAU')).toEqual(['AQUA', 'WATER', 'EAU']);
    expect(slashAlternatives('GLYCERIN')).toEqual([]);
  });
});

describe('resolveInci with the normaliser and the fuzzy index', () => {
  const titanium = { id: 1 };
  const aqua = { id: 2 };
  const niacinamide = { id: 3 };
  const peg40 = { id: 4 };
  const peg4 = { id: 5 };
  const acrylates = { id: 6 };
  const pyridoxine = { id: 7 };
  const limonene = { id: 8 };
  const aliases: [string, { id: number }][] = [
    ['ci77891', titanium],
    ['titaniumdioxide', titanium],
    ['aqua', aqua],
    ['water', aqua],
    ['niacinamide', niacinamide],
    ['peg40hydrogenatedcastoroil', peg40],
    ['peg4hydrogenatedcastoroil', peg4],
    ['acrylatesc1030alkylacrylatecrosspolymer', acrylates],
    ['pyridoxinehcl', pyridoxine],
    ['limonene', limonene],
  ];
  const dict = {
    byInci: new Map<string, { id: number }>([
      ['ACRYLATES/C10-30 ALKYL ACRYLATE CROSSPOLYMER', acrylates],
    ]),
    byAlias: new Map(aliases),
    fuzzy: buildFuzzyIndex(aliases),
  };
  const resolve = (names: string[]) =>
    resolveInci(names, dict).map((r) => [r.input, r.ingredient?.id ?? null, r.match]);

  it('matches "A / B" names, OCR slips and accents exactly', () => {
    expect(
      resolve(['CI 77891 / TITANIUM DIOXIDE', 'AQUA/WATER/EAU', 'PYRIDOXINE HCI', 'LIMONÈNE']),
    ).toEqual([
      ['CI 77891 / TITANIUM DIOXIDE', 1, 'exact'],
      ['AQUA/WATER/EAU', 2, 'exact'],
      ['PYRIDOXINE HCI', 7, 'exact'],
      ['LIMONÈNE', 8, 'exact'],
    ]);
  });

  it('keeps a real INCI name with a slash whole', () => {
    expect(resolve(['ACRYLATES/C10-30 ALKYL ACRYLATE CROSSPOLYMER'])).toEqual([
      ['ACRYLATES/C10-30 ALKYL ACRYLATE CROSSPOLYMER', 6, 'exact'],
    ]);
  });

  it('corrects one typo and marks it fuzzy — but not at the very start of the name', () => {
    expect(resolve(['NIACINAMDE', 'NAICINAMIDE'])).toEqual([
      ['NIACINAMDE', 3, 'fuzzy'],
      ['NAICINAMIDE', null, null],
    ]);
  });

  it('never corrects across a number, a short name or two equally close ingredients', () => {
    expect(resolve(['PEG-45 HYDROGENATED CASTOR OIL'])).toEqual([
      ['PEG-45 HYDROGENATED CASTOR OIL', null, null],
    ]);
    expect(resolve(['AQAU'])).toEqual([['AQAU', null, null]]);
    const twins: [string, { id: number }][] = [
      ['abcdefghij', { id: 1 }],
      ['abcdefghik', { id: 2 }],
    ];
    expect(fuzzyMatch('abcdefghix', buildFuzzyIndex(twins))).toBeNull();
  });

  it('corrects only safe one-letter typos', () => {
    expect(editDistance('niacinamide', 'naicinamdie', 2)).toBe(2);
    expect(resolve(['NIACINAMDIE'])).toEqual([['NIACINAMDIE', 3, 'fuzzy']]); // a swap = 1 edit
    // two edits, a changed prefix or an edit next to a digit are never corrected
    expect(resolve(['NIACINMDIE'])).toEqual([['NIACINMDIE', null, null]]);
    expect(resolve(['PG-NIACINAMIDE'])).toEqual([['PG-NIACINAMIDE', null, null]]);
    expect(resolve(['PEG-40 HYDROGENATED CASTOR OIX'])).toEqual([
      ['PEG-40 HYDROGENATED CASTOR OIX', 4, 'fuzzy'],
    ]);
    const sd = buildFuzzyIndex([
      ['alcoholdenatsdalcohol39d', { id: 9 }] as [string, { id: number }],
    ]);
    expect(fuzzyMatch('alcoholdenatsdalcohol39c', sd)).toBeNull();
  });

  it('does not change a letter in a short name', () => {
    const idx = buildFuzzyIndex([
      ['xanthine', { id: 1 }],
      ['glycerin', { id: 2 }],
    ] as [string, { id: number }][]);
    expect(fuzzyMatch('xanthane', idx)).toBeNull();
    expect(fuzzyMatch('glycerln', idx)).toEqual({ id: 2 }); // scan l / i
    expect(fuzzyMatch('glyceriin', idx)).toEqual({ id: 2 }); // extra letter
  });

  it('lets a scan mix up l / I at the start', () => {
    const idx = buildFuzzyIndex([
      ['iodopropynylbutylcarbamate', { id: 1 }] as [string, { id: number }],
    ]);
    expect(fuzzyMatch('lodopropynylbutylcarbamate', idx)).toEqual({ id: 1 });
    expect(fuzzyMatch('xodopropynylbutylcarbamate', idx)).toBeNull();
  });

  it('treats a canonical name found in the index as exact', () => {
    const idx = buildFuzzyIndex([
      ['tristetramethylhydroxypiperidinolcitrate', { id: 1 }] as [string, { id: number }],
    ]);
    expect(
      resolveInci(['TRIS (TETRAMETHYLHYDROXYPIPERIDINOL) CITRATE'], {
        byInci: new Map(),
        byAlias: new Map(),
        fuzzy: idx,
      })[0],
    ).toMatchObject({ match: 'exact', ingredient: { id: 1 } });
  });
});
