import { describe, expect, it } from 'vitest';
import { validateReview, type ReviewEntry } from './alias-review';
import { parseAnnexCsv, parseInventory } from './cosing';
import { parseCsv } from './csv';

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, commas and line breaks inside fields', () => {
    expect(parseCsv('﻿a,"b, c","d ""e""\nf"\r\n1,2,3\n')).toEqual([
      ['a', 'b, c', 'd "e"\nf'],
      ['1', '2', '3'],
    ]);
    expect(parseCsv('x;y\n1;2', ';')).toEqual([
      ['x', 'y'],
      ['1', '2'],
    ]);
  });
});

const ANNEX_III = `"File creation date: 19/11/2026"
"ANNEX III","Last update: 13/11/2026"
"Substance identification",Restrictions
"Reference Number","Chemical name / INN","Name of Common Ingredients Glossary","CAS Number","EC Number","Product Type, body parts","Maximum concentration in ready for use preparation",Other,"Wording of conditions of use and warnings",Regulation,"Other Directives/Regulations","SCCS opinions","Chemical/IUPAC Name","Identified INGREDIENTS or substances e.g.",CMR,"Update Date"
2a,"Thioglycolic acid and its salts","THIOGLYCOLIC ACID",68-11-1,200-677-4,"(a) Hair products

(b) Depilatories","8%",,,"(EU) 2015/1190",,,,"AMMONIUM THIOGLYCOLATE,CALCIUM THIOGLYCOLATE",,27/07/2020
1a,"Salts of benzoic acid","AMMONIUM BENZOATE / BUTYL BENZOATE","1863-63-4 /2090-05-3","217-468-9 / 218-235-4",,,,,,,,,,,
`;

describe('parseAnnexCsv', () => {
  it('reads glossary names, identified ingredients and CAS / EC numbers', () => {
    const rows = parseAnnexCsv('III', parseCsv(ANNEX_III));
    expect(rows).toEqual([
      {
        annex: 'III',
        ref: '2a',
        names: ['THIOGLYCOLIC ACID', 'AMMONIUM THIOGLYCOLATE', 'CALCIUM THIOGLYCOLATE'],
        cas: ['68-11-1'],
        ec: ['200-677-4'],
      },
      {
        annex: 'III',
        ref: '1a',
        names: ['AMMONIUM BENZOATE', 'BUTYL BENZOATE'],
        cas: ['1863-63-4', '2090-05-3'],
        ec: ['217-468-9', '218-235-4'],
      },
    ]);
  });

  it('fails loudly when the export format changes', () => {
    expect(() => parseAnnexCsv('II', [['something else']])).toThrow(/header row/);
  });
});

describe('parseInventory (full CosIng export, when we get it)', () => {
  it('reads the standard columns after a title block', () => {
    const rows = parseCsv(`CosIng export
COSING Ref No,INCI name,INN name,Ph. Eur. Name,CAS No,EC No,Chem/IUPAC Name / Description,Restriction,Function,Update Date
34040,GLYCERIN,glycerol,glycerolum,56-81-5,200-289-5,Glycerol,,"DENATURANT, HUMECTANT, SKIN PROTECTING",21/11/2016
38780,THIOGLYCOLIC ACID,,,68-11-1,200-677-4,,III/2a,DEPILATORY,
`);
    expect(parseInventory(rows)).toEqual([
      {
        inci: 'GLYCERIN',
        synonyms: ['glycerol', 'glycerolum'],
        cosingRef: '34040',
        cas: ['56-81-5'],
        ec: ['200-289-5'],
        cosingFunctions: ['denaturant', 'humectant', 'skin-protecting'],
        restrictions: [],
        parents: [],
      },
      expect.objectContaining({ inci: 'THIOGLYCOLIC ACID', restrictions: ['III/2a'] }),
    ]);
  });
});

describe('validateReview', () => {
  const entries: ReviewEntry[] = [
    { token: 'GLICERINA', count: 24, action: 'alias', target: 'GLYCERIN' },
    { token: 'ISOHEXADECANE', count: 127, action: 'new', target: 'ISOHEXADECANE' },
    { token: 'ISOHEXADECAN', count: 2, action: 'alias', target: 'ISOHEXADECANE' },
    { token: 'KT13 0XP', count: 3, action: 'not_ingredient' },
  ];

  it('accepts aliases to dictionary names and to names added in the same file', () => {
    expect(validateReview(entries, new Set(['GLYCERIN']))).toEqual([]);
  });

  it('rejects an alias to a name nobody added, duplicates and missing targets', () => {
    expect(
      validateReview(
        [
          ...entries,
          { token: 'X', count: 1, action: 'alias', target: 'NOPE' },
          { token: 'GLICERINA', count: 1, action: 'skip' },
          { token: 'Y', count: 1, action: 'new' },
        ],
        new Set(['GLYCERIN']),
      ),
    ).toEqual([
      'X: target NOPE is neither in the dictionary nor added as new',
      'duplicate token: GLICERINA',
      'Y: new needs a target',
    ]);
  });
});
