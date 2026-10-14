import { describe, expect, it } from 'vitest';
import {
  computeRoutineScore,
  findConflicts,
  pickRoutine,
  stepForCategory,
  type ConflictRule,
  type RoutineProduct,
  type RoutineSlot,
} from './routine';

const RETINOL = 1;
const GLYCOLIC = 2;
const SALICYLIC = 3;
const AQUA = 9;

const rules: ConflictRule[] = [
  { aId: RETINOL, bId: GLYCOLIC, severity: 2, noteKey: 'retinoid_exfoliant' },
  { aId: RETINOL, bId: SALICYLIC, severity: 2, noteKey: 'retinoid_exfoliant' },
];

let nextId = 100;
const product = (
  score: number,
  category: string,
  ...ing: [number, string, number?][]
): RoutineProduct => ({
  productId: nextId++,
  category,
  score,
  ingredients: ing.map(([id, name, position = 3]) => ({ id, name, position })),
});
const slot = (
  time: 'am' | 'pm',
  step: RoutineSlot['step'],
  p: RoutineProduct | null,
): RoutineSlot => ({
  time,
  step,
  product: p,
});

describe('stepForCategory', () => {
  it('maps categories to the first fitting step; SPF only in the morning', () => {
    expect(stepForCategory('cleanser', 'am')).toBe('cleanse');
    expect(stepForCategory('serum', 'pm')).toBe('treat');
    expect(stepForCategory('essence', 'am')).toBe('tone');
    expect(stepForCategory('sunscreen', 'am')).toBe('protect');
    expect(stepForCategory('sunscreen', 'pm')).toBeNull();
    expect(stepForCategory('other', 'am')).toBeNull();
  });
});

describe('findConflicts', () => {
  it('finds rule pairs between different products of the same time of day, in either order', () => {
    const retinolSerum = product(80, 'serum', [AQUA, 'Aqua', 1], [RETINOL, 'Retinol', 5]);
    const acidToner = product(70, 'toner', [GLYCOLIC, 'Glycolic Acid', 2]);
    const c = findConflicts(
      [slot('pm', 'tone', acidToner), slot('pm', 'treat', retinolSerum)],
      rules,
    );
    expect(c).toEqual([
      {
        time: 'pm',
        severity: 2,
        noteKey: 'retinoid_exfoliant',
        a: { productId: acidToner.productId, ingredient: 'Glycolic Acid' },
        b: { productId: retinolSerum.productId, ingredient: 'Retinol' },
      },
    ]);
  });

  it('ignores morning vs evening, the same product, and ingredients low in the list', () => {
    const retinol = product(80, 'serum', [RETINOL, 'Retinol', 5]);
    const acid = product(70, 'toner', [GLYCOLIC, 'Glycolic Acid', 2]);
    expect(findConflicts([slot('am', 'tone', acid), slot('pm', 'treat', retinol)], rules)).toEqual(
      [],
    );
    const both = product(70, 'serum', [RETINOL, 'Retinol', 2], [GLYCOLIC, 'Glycolic Acid', 3]);
    expect(findConflicts([slot('pm', 'treat', both)], rules)).toEqual([]);
    const tailAcid = product(70, 'toner', [GLYCOLIC, 'Glycolic Acid', 16]);
    expect(
      findConflicts([slot('pm', 'tone', tailAcid), slot('pm', 'treat', retinol)], rules),
    ).toEqual([]);
  });
});

describe('computeRoutineScore', () => {
  it('average − 10 per conflict − 10 without SPF in the morning', () => {
    const cleanser = product(68, 'cleanser');
    const cream = product(92, 'moisturizer');
    const spf = product(80, 'sunscreen');
    const ok = computeRoutineScore(
      [
        slot('am', 'cleanse', cleanser),
        slot('am', 'moisturize', cream),
        slot('am', 'protect', spf),
      ],
      rules,
    );
    expect(ok).toMatchObject({
      score: 80,
      averageProductScore: 80,
      missingSpf: false,
      conflicts: [],
    });

    const noSpf = computeRoutineScore(
      [slot('am', 'cleanse', cleanser), slot('am', 'moisturize', cream)],
      rules,
    );
    expect(noSpf).toMatchObject({ score: 70, missingSpf: true });

    const retinol = product(80, 'serum', [RETINOL, 'Retinol', 3]);
    const acid = product(60, 'toner', [SALICYLIC, 'Salicylic Acid', 3]);
    const conflict = computeRoutineScore(
      [slot('pm', 'tone', acid), slot('pm', 'treat', retinol)],
      rules,
    );
    expect(conflict).toMatchObject({ score: 60, missingSpf: false });
    expect(conflict.conflicts).toHaveLength(1);
  });

  it('an evening-only routine needs no SPF; an empty routine has no score', () => {
    expect(
      computeRoutineScore([slot('pm', 'cleanse', product(50, 'cleanser'))], rules).missingSpf,
    ).toBe(false);
    expect(computeRoutineScore([slot('am', 'cleanse', null)], rules)).toMatchObject({
      score: null,
      productCount: 0,
    });
  });

  it('clamps at 0', () => {
    expect(computeRoutineScore([slot('am', 'cleanse', product(5, 'cleanser'))], rules).score).toBe(
      0,
    );
  });
});

describe('pickRoutine', () => {
  it('takes the best candidate per step, unless it conflicts with what is already chosen', () => {
    const acid = product(90, 'toner', [GLYCOLIC, 'Glycolic Acid', 2]);
    const bestSerum = product(95, 'serum', [RETINOL, 'Retinol', 4]);
    const secondSerum = product(85, 'serum', [AQUA, 'Aqua', 1]);
    const picked = pickRoutine(
      [
        { time: 'pm', step: 'tone', products: [acid] },
        { time: 'pm', step: 'treat', products: [bestSerum, secondSerum] },
        { time: 'pm', step: 'moisturize', products: [] },
      ],
      rules,
    );
    expect(picked.map((s) => s.product?.productId ?? null)).toEqual([
      acid.productId,
      secondSerum.productId,
      null,
    ]);
  });

  it('keeps the best one when every candidate conflicts', () => {
    const acid = product(90, 'toner', [GLYCOLIC, 'Glycolic Acid', 2]);
    const retinol = product(95, 'serum', [RETINOL, 'Retinol', 4]);
    const picked = pickRoutine(
      [
        { time: 'pm', step: 'tone', products: [acid] },
        { time: 'pm', step: 'treat', products: [retinol] },
      ],
      rules,
    );
    expect(picked[1]!.product?.productId).toBe(retinol.productId);
  });
});
