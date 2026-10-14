import { describe, expect, it } from 'vitest';
import { ingredientForProfile } from './ingredient';
import type { MatchProfile } from './match';

const profile = (p: Partial<MatchProfile> = {}): MatchProfile => ({
  skinType: 'normal',
  isSensitive: false,
  barrierLevel: 1,
  concerns: [],
  avoidedIngredientIds: new Set(),
  avoidedGroups: new Set(),
  ...p,
});

const ing = {
  id: 7,
  name: 'X',
  comedogenic: null,
  irritationRisk: null,
  isFragrance: false,
  isAlcoholDrying: false,
  groups: [] as string[],
  effects: [] as { concern: string; effect: number }[],
};

describe('ingredientForProfile', () => {
  it('lists the user’s concerns it helps and hurts, strongest first', () => {
    const r = ingredientForProfile(
      profile({
        concerns: [
          { code: 'redness', priority: 2 },
          { code: 'breakouts', priority: 1 },
        ],
      }),
      {
        ...ing,
        effects: [
          { concern: 'redness', effect: 1 },
          { concern: 'breakouts', effect: 2 },
          { concern: 'wrinkles', effect: 2 },
          { concern: 'hydration', effect: -1 },
        ],
      },
    );
    expect(r.helps).toEqual(['breakouts', 'redness']);
    expect(r.hurts).toEqual([]);
  });

  it('knows avoided ingredients and groups', () => {
    expect(
      ingredientForProfile(profile({ avoidedIngredientIds: new Set([7]) }), ing),
    ).toMatchObject({
      avoided: true,
      avoidedGroup: null,
    });
    expect(
      ingredientForProfile(profile({ avoidedGroups: new Set(['fragrance']) }), {
        ...ing,
        groups: ['fragrance'],
      }),
    ).toMatchObject({ avoided: true, avoidedGroup: 'fragrance' });
  });

  it('applies the same profile rules as the Match Score', () => {
    const r = ingredientForProfile(
      profile({ isSensitive: true, skinType: 'oily', barrierLevel: 3 }),
      {
        ...ing,
        isFragrance: true,
        irritationRisk: 2,
        comedogenic: 4,
      },
    );
    expect(r.cautions).toEqual([
      'fragrance_sensitive',
      'irritant_sensitive',
      'irritant_barrier',
      'comedogenic',
    ]);
    expect(
      ingredientForProfile(profile({ skinType: 'dry' }), { ...ing, isAlcoholDrying: true })
        .cautions,
    ).toEqual(['drying_alcohol']);
    expect(ingredientForProfile(profile(), { ...ing, isFragrance: true }).cautions).toEqual([]);
  });
});
