import { describe, expect, it } from 'vitest';
import { productFlags, type FlagIngredient } from './flags';

const clean: FlagIngredient = {
  comedogenic: null,
  isFragrance: false,
  isAlcoholDrying: false,
  isSilicone: false,
  isEuAllergen: false,
  isOil: false,
  isSulfate: false,
  isParaben: false,
  isFungalAcneTrigger: false,
  isAnimalDerived: false,
  isReefHarmful: false,
};

describe('productFlags', () => {
  it('a complete clean list is ✓ everywhere; cruelty-free comes from the brand', () => {
    const f = productFlags([clean], true, null);
    expect(f.fragrance_free).toBe(true);
    expect(f.vegan).toBe(true);
    expect(f.cruelty_free).toBeNull();
    expect(productFlags([clean], true, true).cruelty_free).toBe(true);
  });

  it('each property breaks its flag', () => {
    const f = productFlags(
      [
        { ...clean, isFragrance: true },
        { ...clean, comedogenic: 4 },
        { ...clean, isAnimalDerived: true },
      ],
      true,
      null,
    );
    expect(f.fragrance_free).toBe(false);
    expect(f.pore_clogger_free).toBe(false);
    expect(f.vegan).toBe(false);
    expect(f.silicone_free).toBe(true);
    expect(productFlags([{ ...clean, comedogenic: 2 }], true, null).pore_clogger_free).toBe(true);
  });

  it('with an incomplete list only "no" is certain, the rest is unknown', () => {
    const f = productFlags([{ ...clean, isFragrance: true }], false, null);
    expect(f.fragrance_free).toBe(false);
    expect(f.silicone_free).toBeNull();
  });
});
