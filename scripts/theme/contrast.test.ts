import { describe, expect, it } from 'vitest';
import { palettes, type ColorToken } from '../../apps/mobile/src/theme/tokens';
import { contrast, over } from './contrast';

/**
 * Text (or text-like content) pairs used in the app. 4.5 = WCAG AA normal text; 3 = large text
 * (≥ 24 px, e.g. the score in ScoreRing) and icons / graphics (WCAG 1.4.11).
 */
const TEXT_PAIRS: [fg: ColorToken, bg: ColorToken, min: number][] = [
  ['textPrimary', 'background', 4.5],
  ['textPrimary', 'backgroundAlt', 4.5],
  ['textPrimary', 'surface', 4.5],
  ['textPrimary', 'accentSoft', 4.5],
  ['textSecondary', 'background', 4.5],
  ['textSecondary', 'backgroundAlt', 4.5],
  ['textSecondary', 'surface', 4.5],
  ['textSecondary', 'accentSoft', 4.5],
  ['primary', 'background', 4.5],
  ['primary', 'backgroundAlt', 4.5],
  ['primary', 'accentSoft', 4.5],
  ['accent', 'background', 4.5],
  ['accent', 'backgroundAlt', 4.5],
  ['accent', 'surface', 4.5],
  // MatchPill / MatchCard: score colour on its soft background (75+, 50–74, 30–49, < 30)
  ['good', 'goodSoft', 4.5],
  ['accent', 'accentSoft', 4.5],
  ['caution', 'cautionSoft', 4.5],
  ['bad', 'badSoft', 4.5],
  ['good', 'background', 4.5],
  ['caution', 'background', 4.5],
  ['bad', 'background', 4.5],
  ['bad', 'backgroundAlt', 4.5],
  // main button and ✓ / × on coloured fills
  ['onPrimary', 'primary', 4.5],
  ['onPrimary', 'good', 3],
  ['onPrimary', 'bad', 3],
  ['onPrimary', 'accent', 3],
  // disabled controls are exempt from AA; keep them at least readable
  ['onPrimaryDisabled', 'primaryDisabled', 2],
  // card borders are decorative; selected cards use a 2 px primary border
  ['primary', 'surface', 3],
];

describe.each(['light', 'dark'] as const)('%s theme contrast', (scheme) => {
  const p = palettes[scheme];

  it.each(TEXT_PAIRS)('%s on %s ≥ %s', (fg, bg, min) => {
    expect(contrast(p[fg], p[bg])).toBeGreaterThanOrEqual(min);
  });

  it('scanner text stays readable on the dimmed camera picture, even over a white package', () => {
    for (const camera of ['#FFFFFF', '#000000', '#808080']) {
      expect(contrast(p.onScrim, over(p.scrimStrong, camera))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.onScrim, over(p.scrim, camera))).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('contrast()', () => {
  it('matches the WCAG reference values', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
    expect(over('rgba(0,0,0,0.5)', '#FFFFFF')).toBe('#808080');
  });
});
