import { ROUTINE_STEPS } from '@dermamind/scoring';
import { z } from 'zod';
import { dataBlock } from './common';

/**
 * ai-routine (PLAN.md 5, 5.2): the model picks one product per step from candidates the rules chose
 * (top 3, score ≥ 50, no exclusions) and explains the routine. The pick is checked by rules
 * afterwards; anything outside the candidates or with a conflict is rejected.
 */
const pick = {
  type: 'object' as const,
  properties: {
    step: { type: 'string', enum: [...ROUTINE_STEPS] },
    productId: { type: 'integer', description: 'id of one of the candidates for this step' },
  },
  required: ['step', 'productId'],
  additionalProperties: false,
};

export const ROUTINE_TOOL = {
  name: 'save_routine',
  description: 'Saves the chosen morning and evening routine with a short explanation.',
  strict: true,
  input_schema: {
    type: 'object' as const,
    properties: {
      am: {
        type: 'array',
        items: pick,
        description: 'Morning picks, one per step that has candidates',
      },
      pm: {
        type: 'array',
        items: pick,
        description: 'Evening picks, one per step that has candidates',
      },
      summary: {
        type: 'string',
        description:
          '3–5 sentences for the user: why these products fit their skin, the order of application, and what to keep apart if anything. No new products, no medical advice.',
      },
    },
    required: ['am', 'pm', 'summary'],
    additionalProperties: false,
  },
};

const pickOutput = z.object({
  step: z.enum(ROUTINE_STEPS),
  productId: z.number().int().positive(),
});
export const routineOutput = z.object({
  am: z.array(pickOutput).max(5),
  pm: z.array(pickOutput).max(5),
  summary: z.string().trim().min(40).max(1200),
});
export type RoutineOutput = z.infer<typeof routineOutput>;

export interface RoutinePromptInput {
  skin: {
    type: string | null;
    sensitive: boolean;
    barrier: 'good' | 'weakened' | 'compromised' | null;
    concerns: string[];
    avoidGroups: string[];
  };
  /** per time of day and step: candidates chosen by the rules, best first */
  candidates: {
    time: 'am' | 'pm';
    step: string;
    products: {
      productId: number;
      brand: string | null;
      name: string;
      category: string;
      score: number;
      helps: string[];
      cautions: string[];
      keyIngredients: string[];
    }[];
  }[];
  /** ingredient pairs that must not be in two products of the same time of day */
  conflictPairs: { a: string; b: string; reason: string }[];
}

export function routineUserMessage(input: RoutinePromptInput): string {
  return [
    'Build the user’s morning (am) and evening (pm) skincare routine. For every step that has candidates choose exactly one candidate of that step; never use a product that is not listed for that step and time. Avoid choosing two products of the same time of day that contain a conflicting pair. Prefer higher scores unless that creates a conflict.',
    'Steps go in this order: cleanse, tone, treat, moisturize, protect (sunscreen, morning only).',
    dataBlock(input),
    'Call save_routine.',
  ].join('\n\n');
}
