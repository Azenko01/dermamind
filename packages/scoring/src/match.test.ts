import { describe, expect, it } from 'vitest';
import {
  computeMatchScore,
  concernWeights,
  positionWeight,
  priorityWeight,
  type MatchIngredient,
  type MatchProfile,
} from './match';

const profile = (p: Partial<MatchProfile> = {}): MatchProfile => ({
  skinType: 'normal',
  isSensitive: false,
  barrierLevel: 1,
  concerns: [],
  avoidedIngredientIds: new Set(),
  avoidedGroups: new Set(),
  ...p,
});

let nextId = 1;
const ing = (p: Partial<MatchIngredient> = {}): MatchIngredient => ({
  id: nextId++,
  name: 'Ingredient',
  position: 1,
  comedogenic: null,
  irritationRisk: null,
  isFragrance: false,
  isAlcoholDrying: false,
  groups: [],
  effects: [],
  hasMetadata: true,
  ...p,
});

const product = (ingredients: MatchIngredient[], inciComplete = true) => ({
  inciComplete,
  ingredients,
});

describe('weights', () => {
  it('position: 1–5 → 1.0, 6–10 → 0.6, 11+ → 0.3', () => {
    expect([1, 5, 6, 10, 11, 30].map(positionWeight)).toEqual([1, 1, 0.6, 0.6, 0.3, 0.3]);
  });

  it('priority: 1 → 1.0, 2 → 0.6, 3+ → 0.4', () => {
    expect([1, 2, 3, 7].map(priorityWeight)).toEqual([1, 0.6, 0.4, 0.4]);
  });

  it('adds concerns that follow from the skin profile, keeping the highest weight', () => {
    expect(Object.fromEntries(concernWeights(profile({ skinType: 'dry' })))).toEqual({
      dryness: 1,
    });
    expect(Object.fromEntries(concernWeights(profile({ skinType: 'combination' })))).toEqual({
      oiliness: 0.6,
    });
    expect(
      Object.fromEntries(
        concernWeights(
          profile({
            skinType: 'oily',
            isSensitive: true,
            barrierLevel: 3,
            concerns: [
              { code: 'breakouts', priority: 1 },
              { code: 'oiliness', priority: 3 },
            ],
          }),
        ),
      ),
    ).toEqual({ breakouts: 1, oiliness: 1, sensitivity: 0.6, barrier: 1 });
  });
});

describe('computeMatchScore', () => {
  it('starts at 50 for a product with nothing relevant', () => {
    const r = computeMatchScore(profile(), product([ing()]));
    expect(r).toMatchObject({ score: 50, status: 'ok', label: 'good', pros: [], cons: [] });
  });

  it('benefit: effect × position weight × concern weight × 10', () => {
    const niacinamide = ing({
      name: 'Niacinamide',
      position: 3,
      effects: [{ concern: 'breakouts', effect: 2 }],
    });
    const r = computeMatchScore(
      profile({ concerns: [{ code: 'breakouts', priority: 1 }] }),
      product([niacinamide]),
    );
    expect(r.score).toBe(70); // 50 + 10 × (2 × 1 × 1)
    expect(r.pros).toEqual([
      { ingredientId: niacinamide.id, ingredient: 'Niacinamide', concern: 'breakouts', impact: 20 },
    ]);
    expect(r.ingredients[0]?.rating).toBe('good');
  });

  it('lower position and lower priority count less', () => {
    const r = computeMatchScore(
      profile({
        concerns: [
          { code: 'x', priority: 1 },
          { code: 'hydration', priority: 2 },
        ],
      }),
      product([ing({ position: 12, effects: [{ concern: 'hydration', effect: 1 }] })]),
    );
    expect(r.score).toBe(52); // 50 + 10 × (1 × 0.3 × 0.6) = 51.8
  });

  it('harm weighs 12 per point and marks the ingredient red', () => {
    const shea = ing({
      name: 'Shea Butter',
      position: 2,
      effects: [{ concern: 'breakouts', effect: -1 }],
    });
    const r = computeMatchScore(
      profile({ concerns: [{ code: 'breakouts', priority: 1 }] }),
      product([shea]),
    );
    expect(r.score).toBe(38);
    expect(r.cons[0]).toMatchObject({ reason: 'harms_concern', concern: 'breakouts', impact: -12 });
    expect(r.ingredients[0]?.rating).toBe('bad');
    expect(r.label).toBe('caution');
  });

  it('ignores effects on concerns the user does not have', () => {
    const r = computeMatchScore(
      profile(),
      product([ing({ effects: [{ concern: 'breakouts', effect: -2 }] })]),
    );
    expect(r.score).toBe(50);
  });

  describe('profile penalties', () => {
    it('sensitive skin: −8 × position weight per fragrance, −6 × weight for irritants', () => {
      const parfum = ing({ name: 'Parfum', position: 8, isFragrance: true, irritationRisk: 2 });
      const r = computeMatchScore(profile({ isSensitive: true }), product([parfum]));
      // 50 − 8 × 0.6 − 6 × 0.6 = 41.6
      expect(r.score).toBe(42);
      expect(r.cons.map((c) => c.reason).sort()).toEqual([
        'fragrance_sensitive',
        'irritant_sensitive',
      ]);
      expect(r.ingredients[0]?.rating).toBe('caution');
    });

    it('compromised barrier: −6 × weight for irritants', () => {
      const acid = ing({ position: 4, irritationRisk: 2 });
      expect(computeMatchScore(profile({ barrierLevel: 3 }), product([acid])).score).toBe(44);
      expect(computeMatchScore(profile({ barrierLevel: 2 }), product([acid])).score).toBe(50);
    });

    it('oily skin or breakouts: −10 × weight for comedogenic ≥ 3 in the top 10', () => {
      const ipm = ing({ position: 6, comedogenic: 5 });
      expect(computeMatchScore(profile({ skinType: 'oily' }), product([ipm])).score).toBe(44);
      expect(
        computeMatchScore(
          profile({ concerns: [{ code: 'breakouts', priority: 2 }] }),
          product([ipm]),
        ).score,
      ).toBe(44);
      expect(
        computeMatchScore(profile({ skinType: 'oily' }), product([{ ...ipm, position: 11 }])).score,
      ).toBe(50);
      expect(computeMatchScore(profile(), product([ipm])).score).toBe(50);
    });

    it('dry skin: −10 for a drying alcohol in the top 5', () => {
      const alcohol = ing({ position: 3, isAlcoholDrying: true });
      expect(computeMatchScore(profile({ skinType: 'dry' }), product([alcohol])).score).toBe(40);
      expect(
        computeMatchScore(profile({ skinType: 'dry' }), product([{ ...alcohol, position: 6 }]))
          .score,
      ).toBe(50);
    });
  });

  describe('exclusions', () => {
    const great = (p: Partial<MatchIngredient> = {}) =>
      ing({ position: 1, effects: [{ concern: 'hydration', effect: 2 }], ...p });
    const wants = profile({ concerns: [{ code: 'hydration', priority: 1 }] });

    it('caps a product with an avoided ingredient at 40', () => {
      const avoided = great({ name: 'Limonene' });
      const r = computeMatchScore(
        { ...wants, avoidedIngredientIds: new Set([avoided.id]) },
        product([avoided]),
      );
      expect(r).toMatchObject({ score: 40, status: 'excluded', label: 'caution' });
      expect(r.excludedBy).toEqual([{ ingredientId: avoided.id, ingredient: 'Limonene' }]);
      expect(r.ingredients[0]?.rating).toBe('bad');
    });

    it('also for an avoided group', () => {
      const parfum = great({ name: 'Parfum', groups: ['fragrance'] });
      const r = computeMatchScore(
        { ...wants, avoidedGroups: new Set(['fragrance']) },
        product([parfum]),
      );
      expect(r.status).toBe('excluded');
      expect(r.excludedBy[0]).toMatchObject({ ingredient: 'Parfum', group: 'fragrance' });
    });

    it('keeps an already low score as it is', () => {
      const bad = ing({ effects: [{ concern: 'hydration', effect: -2 }], groups: ['fragrance'] });
      const r = computeMatchScore(
        { ...wants, avoidedGroups: new Set(['fragrance']) },
        product([bad]),
      );
      expect(r.score).toBe(26);
    });
  });

  it('clamps to 0…100', () => {
    const lots = [1, 2, 3, 4].map((position) =>
      ing({ position, effects: [{ concern: 'hydration', effect: 2 }] }),
    );
    const wants = profile({ concerns: [{ code: 'hydration', priority: 1 }] });
    expect(computeMatchScore(wants, product(lots)).score).toBe(100);
    const harms = lots.map((i) => ({ ...i, effects: [{ concern: 'hydration', effect: -2 }] }));
    expect(computeMatchScore(wants, product(harms)).score).toBe(0);
  });

  describe('confidence', () => {
    it('is low when the INCI list is incomplete', () => {
      const r = computeMatchScore(profile(), product([ing()], false));
      expect(r.lowConfidence).toBe(true);
      expect(r.confidence.inciComplete).toBe(false);
    });

    it('is low when more than 30% of ingredients have no data', () => {
      const known = [ing(), ing()];
      const unknown = [ing({ hasMetadata: false })];
      expect(computeMatchScore(profile(), product([...known, ...unknown])).lowConfidence).toBe(
        true,
      ); // 33%
      expect(
        computeMatchScore(profile(), product([...known, ing(), ...unknown])).lowConfidence,
      ).toBe(false); // 25%
    });

    it('treats an empty list as no data', () => {
      expect(computeMatchScore(profile(), product([])).lowConfidence).toBe(true);
    });
  });

  it('is deterministic', () => {
    const p = profile({ isSensitive: true, concerns: [{ code: 'redness', priority: 1 }] });
    const items = product([
      ing({ id: 900, position: 2, effects: [{ concern: 'redness', effect: 1 }] }),
      ing({ id: 901, position: 9, isFragrance: true }),
    ]);
    expect(computeMatchScore(p, items)).toEqual(computeMatchScore(p, items));
  });
});
