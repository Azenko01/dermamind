import { matchLabel, type MatchLabel } from '@dermamind/scoring';
import type { ColorToken } from './tokens';

/** Score colours: 75+ green, 50–74 purple (accent), 30–49 orange, <30 red (PLAN.md 4.2). */
const labelColors: Record<MatchLabel, { fg: ColorToken; bg: ColorToken }> = {
  great: { fg: 'good', bg: 'goodSoft' },
  good: { fg: 'accent', bg: 'accentSoft' },
  caution: { fg: 'caution', bg: 'cautionSoft' },
  poor: { fg: 'bad', bg: 'badSoft' },
};

export function scoreColors(score: number): { fg: ColorToken; bg: ColorToken } {
  return labelColors[matchLabel(score)];
}
