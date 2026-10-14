import { describe, expect, it } from 'vitest';
import {
  barrierLevel,
  computeSkinProfile,
  oilLevel,
  sensitivityLevel,
  skinType,
  type QuizAnswers,
  type ShineLevel,
} from './quiz';

const base: QuizAnswers = {
  struggle: 'want_routine',
  concerns: ['hydration'],
  shine: { tZone: 'none', cheeks: 'none', jaw: 'none' },
  afterWash: 'comfortable',
  symptoms: [],
  reactionFrequency: 'never',
  triggers: [],
  seasonal: 'no_change',
  avoidGroups: [],
  avoidIngredients: [],
  mustHaves: [],
  usesSpf: 'daily',
  budget: '30_70',
};

const shine = (tZone: ShineLevel, cheeks: ShineLevel, jaw: ShineLevel) => ({
  ...base,
  shine: { tZone, cheeks, jaw },
});

describe('oilLevel', () => {
  it('sums zone points with after-wash and seasonal corrections', () => {
    // +1 +1 +0, shiny after wash +1, oilier in summer +1 = 4 → clamped to 3
    expect(
      oilLevel({
        ...shine('slightly', 'slightly', 'none'),
        afterWash: 'shiny',
        seasonal: 'oilier_in_summer',
      }),
    ).toBe(3);
    // 0 + 0 + 0 - 1 (tight) - 1 (winter) = -2
    expect(oilLevel({ ...base, afterWash: 'tight', seasonal: 'drier_in_winter' })).toBe(-2);
  });

  it('is clamped to -3…+3', () => {
    expect(oilLevel({ ...shine('very', 'very', 'very'), afterWash: 'shiny' })).toBe(3);
    expect(
      oilLevel({ ...shine('dry', 'dry', 'dry'), afterWash: 'tight', seasonal: 'drier_in_winter' }),
    ).toBe(-3);
  });
});

describe('skinType', () => {
  it.each([
    ['dry', { ...shine('dry', 'dry', 'none') }],
    ['dry', { ...base, afterWash: 'tight', seasonal: 'drier_in_winter' }],
    ['normal', base],
    ['normal', { ...shine('none', 'slightly', 'none') }],
    ['oily', { ...shine('very', 'slightly', 'none') }],
    ['oily', { ...shine('slightly', 'slightly', 'slightly') }],
    ['combination', { ...shine('very', 'none', 'slightly') }],
    ['combination', { ...shine('slightly', 'dry', 'none') }],
  ] as const)('%s', (expected, answers) => {
    expect(skinType(answers)).toBe(expected);
  });

  it('combination wins even when the total would say oily', () => {
    const a = { ...shine('very', 'none', 'very'), afterWash: 'shiny' as const };
    expect(oilLevel(a)).toBe(3);
    expect(skinType(a)).toBe('combination');
  });
});

describe('barrierLevel', () => {
  it.each([
    [[], 1],
    [['dullness'], 1],
    [['flaking', 'tightness'], 2],
    [['flaking', 'tightness', 'cracking'], 3],
    [['flaking', 'roughness', 'tightness', 'dullness', 'cracking'], 3],
  ] as const)('%j → %i', (symptoms, level) => {
    expect(barrierLevel(symptoms)).toBe(level);
  });

  it('ignores duplicated symptoms', () => {
    expect(barrierLevel(['flaking', 'flaking'])).toBe(1);
  });
});

describe('sensitivityLevel', () => {
  it('maps frequency to 0–3 and adds 1 for cosmetics', () => {
    expect(sensitivityLevel({ reactionFrequency: 'never', triggers: [] })).toBe(0);
    expect(sensitivityLevel({ reactionFrequency: 'sometimes', triggers: ['wind'] })).toBe(2);
    expect(sensitivityLevel({ reactionFrequency: 'often', triggers: ['cosmetics', 'sun'] })).toBe(
      4,
    );
    expect(sensitivityLevel({ reactionFrequency: 'never', triggers: ['cosmetics'] })).toBe(1);
  });
});

describe('computeSkinProfile', () => {
  it('puts it all together (mockup 03: combination, weakened barrier, sensitive)', () => {
    const profile = computeSkinProfile({
      ...shine('very', 'slightly', 'slightly'),
      shine: { tZone: 'very', cheeks: 'none', jaw: 'slightly' },
      symptoms: ['tightness', 'flaking'],
      reactionFrequency: 'sometimes',
      triggers: ['cosmetics'],
    });
    expect(profile).toEqual({
      skinType: 'combination',
      oilLevel: 3,
      barrierLevel: 2,
      sensitivityLevel: 3,
      isSensitive: true,
    });
  });

  it('marks low sensitivity as not sensitive', () => {
    expect(computeSkinProfile({ ...base, reactionFrequency: 'rarely' }).isSensitive).toBe(false);
  });
});
