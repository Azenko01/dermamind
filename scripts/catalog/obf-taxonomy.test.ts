import { describe, expect, it } from 'vitest';
import { annexFlags, appFunctions, parseTaxonomy, titleCaseInci } from './obf-taxonomy';

const SAMPLE = `# comment
synonyms:en: sodium, natrium

en: AQUA, water, aqua / water, H2O
xx: aqua
de: wasser
fr: eau, aqua / eau
cas:en: 7732-18-5
cosing:en: 31959
einecs:en: 231-791-2
inci:en: AQUA
inci_functions:en: en:solvent
inn-name:en: water

en: CINNAMOMUM CAMPHORA WOOD OIL, DECAMPHORISED
cosing:en: 50113
inci_functions:en: en:perfuming, en:skin-conditioning, en:3

en: THIOGLYCOLIC ACID
cosing:en: 38780
cas:en: 68-11-1, -
inci_restriction:en: III/2a
inci_functions:en: en:depilatory

en: Colorants

< en: Colorants
en: CI 77891
`;

describe('parseTaxonomy', () => {
  const entries = parseTaxonomy(SAMPLE);
  const by = (inci: string) => entries.find((e) => e.inci === inci)!;

  it('reads the canonical name, synonyms in other languages and CosIng data', () => {
    expect(by('AQUA')).toMatchObject({
      cosingRef: '31959',
      cas: ['7732-18-5'],
      ec: ['231-791-2'],
      cosingFunctions: ['solvent'],
    });
    expect(by('AQUA').synonyms).toEqual(
      expect.arrayContaining(['water', 'aqua / water', 'H2O', 'wasser', 'eau', 'aqua / eau']),
    );
    expect(by('AQUA').synonyms).not.toContain('aqua');
  });

  it('keeps a CosIng name with a comma whole and drops broken function codes', () => {
    expect(by('CINNAMOMUM CAMPHORA WOOD OIL, DECAMPHORISED')).toMatchObject({
      synonyms: [],
      cosingFunctions: ['perfuming', 'skin-conditioning'],
    });
  });

  it('keeps annex references and skips category nodes and global synonym lists', () => {
    expect(by('THIOGLYCOLIC ACID')).toMatchObject({ restrictions: ['III/2a'], cas: ['68-11-1'] });
    expect(by('CI 77891')).toMatchObject({ parents: ['Colorants'] });
    expect(entries.map((e) => e.inci)).not.toContain('COLORANTS');
    expect(entries.map((e) => e.inci)).not.toContain('SODIUM');
  });
});

describe('annexFlags', () => {
  it('reads annex numbers from the different notations', () => {
    expect(annexFlags(['III/202', 'Annex III/I/262 - Directive 2012/21/EU', 'II/358 R1'])).toEqual({
      annexRefs: ['III/202', 'III/I', 'II/358'],
      isProhibited: true,
      isRestricted: true,
    });
    expect(annexFlags(['V/34', 'VI/2'])).toMatchObject({
      isProhibited: false,
      isRestricted: false,
    });
  });
});

describe('appFunctions', () => {
  it('maps clear functions only — perfuming never becomes fragrance', () => {
    expect(
      appFunctions(['humectant', 'perfuming', 'skin-protecting', 'skin-conditioning']),
    ).toEqual(['humectant', 'skin_conditioning']);
  });
});

describe('titleCaseInci', () => {
  it('formats INCI names for display', () => {
    expect(titleCaseInci('PEG-40 HYDROGENATED CASTOR OIL')).toBe('PEG-40 Hydrogenated Castor Oil');
    expect(titleCaseInci('CI 77891')).toBe('CI 77891');
    expect(titleCaseInci('BUTYROSPERMUM PARKII (SHEA) BUTTER')).toBe(
      'Butyrospermum Parkii (Shea) Butter',
    );
  });
});
