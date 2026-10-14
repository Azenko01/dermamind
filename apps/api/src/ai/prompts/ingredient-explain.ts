import { z } from 'zod';
import { dataBlock } from './common';

/** ai-ingredient-explain (PLAN.md 5): 2–3 sentences, shared by all users → cache per ingredient × lang. */
export const INGREDIENT_TOOL = {
  name: 'save_ingredient_explanation',
  description: 'Saves the explanation of one cosmetic ingredient shown on its card in the app.',
  strict: true,
  input_schema: {
    type: 'object' as const,
    properties: {
      summary: {
        type: 'string',
        description:
          '2–3 short sentences: what the ingredient does in cosmetics and for whom it is typically useful.',
      },
      caution: {
        type: 'string',
        description:
          'One sentence on what to watch out for, based only on the given flags; empty string if nothing applies.',
      },
    },
    required: ['summary', 'caution'],
    additionalProperties: false,
  },
};

export const ingredientOutput = z.object({
  summary: z.string().trim().min(20).max(700),
  caution: z.string().trim().max(300),
});
export type IngredientOutput = z.infer<typeof ingredientOutput>;

export interface IngredientPromptInput {
  inciName: string;
  displayName: string;
  functions: string[];
  flags: string[];
  comedogenic: number | null;
  irritationRisk: number | null;
  /** concern code → -2…+2 from our database */
  effects: { concern: string; effect: number }[];
}

export function ingredientUserMessage(input: IngredientPromptInput): string {
  return [
    'Explain this cosmetic ingredient for its card in the app. Use the facts below only.',
    'effect: +1/+2 = helps with that skin concern, -1/-2 = may worsen it. comedogenic is 0–5, irritationRisk 0–3, null = no data.',
    dataBlock(input),
    `Call ${INGREDIENT_TOOL.name}.`,
  ].join('\n\n');
}
