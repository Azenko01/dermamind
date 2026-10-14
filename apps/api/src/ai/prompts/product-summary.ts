import { z } from 'zod';
import { dataBlock } from './common';

/**
 * ai-product-summary — "Dlaczego taki wynik" (PLAN.md 5, 6.3). Input is the rule-based result and a
 * profile without personal data; cache per product × profile hash × lang.
 */
export const PRODUCT_TOOL = {
  name: 'save_match_explanation',
  description: 'Saves the "why this score" paragraph shown under the Match Score of a product.',
  strict: true,
  input_schema: {
    type: 'object' as const,
    properties: {
      summary: {
        type: 'string',
        description:
          '2–4 sentences explaining the given score from the given reasons: what helps, what lowers it, and any excluded ingredient. Do not repeat the number.',
      },
    },
    required: ['summary'],
    additionalProperties: false,
  },
};

export const productOutput = z.object({ summary: z.string().trim().min(20).max(900) });
export type ProductOutput = z.infer<typeof productOutput>;

export interface ProductPromptInput {
  product: { brand: string | null; name: string; category: string };
  /** what the app's rules computed — the model explains it, never changes it */
  result: {
    score: number;
    label: string;
    status: 'ok' | 'excluded';
    lowConfidence: boolean;
    onlyKeyIngredientsKnown: boolean;
    helps: { ingredient: string; concern: string }[];
    lowers: { ingredient: string; reason: string; concern?: string }[];
    excluded: { ingredient: string; group?: string }[];
  };
  /** skin profile only: no name, e-mail or id */
  skin: {
    type: string | null;
    sensitive: boolean;
    barrier: 'good' | 'weakened' | 'compromised' | null;
    concerns: string[];
    avoidGroups: string[];
  };
}

export function productUserMessage(input: ProductPromptInput): string {
  return [
    'Explain to the user why this product got this Match Score for their skin. The reasons below come from the app’s rules — use only them.',
    'status "excluded" means it contains something the user avoids, so the score was capped at 40 ("Nie pasuje"). lowConfidence means some ingredient data is missing — say so briefly. onlyKeyIngredientsKnown means we don’t know the full ingredient list.',
    dataBlock(input),
    `Call ${PRODUCT_TOOL.name}.`,
  ].join('\n\n');
}
