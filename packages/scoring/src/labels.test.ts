import { describe, expect, it } from 'vitest';
import { applyExclusionCap, clampScore, EXCLUDED_SCORE_CAP, matchLabel } from './labels';

describe('matchLabel', () => {
  it.each([
    [100, 'great'],
    [75, 'great'],
    [74, 'good'],
    [50, 'good'],
    [49, 'caution'],
    [30, 'caution'],
    [29, 'poor'],
    [0, 'poor'],
  ] as const)('%i → %s', (score, label) => {
    expect(matchLabel(score)).toBe(label);
  });

  it('clamps out-of-range scores before labelling', () => {
    expect(matchLabel(140)).toBe('great');
    expect(matchLabel(-5)).toBe('poor');
  });
});

describe('clampScore', () => {
  it('rounds and keeps the score within 0–100', () => {
    expect(clampScore(74.6)).toBe(75);
    expect(clampScore(-1)).toBe(0);
    expect(clampScore(101)).toBe(100);
  });
});

describe('applyExclusionCap', () => {
  it('caps excluded products at 40', () => {
    expect(applyExclusionCap(92, true)).toBe(EXCLUDED_SCORE_CAP);
    expect(matchLabel(applyExclusionCap(92, true))).toBe('caution');
  });

  it('leaves low excluded scores and non-excluded scores alone', () => {
    expect(applyExclusionCap(20, true)).toBe(20);
    expect(applyExclusionCap(92, false)).toBe(92);
  });
});
