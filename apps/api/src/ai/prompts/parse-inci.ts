import { z } from 'zod';
import { dataBlock } from './common';

/**
 * ai-parse-inci (PLAN.md 5): fallback when the rule parser can't read a pasted list (odd formatting,
 * Polish names, OCR noise). Returns names only; matching and scoring stay rule-based.
 */
export const PARSE_TOOL = {
  name: 'save_inci_list',
  description:
    'Saves the ingredient names found in a pasted cosmetic ingredient list, in their original order.',
  strict: true,
  input_schema: {
    type: 'object' as const,
    properties: {
      ingredients: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Each ingredient as its standard INCI name (e.g. "Woda" → "Aqua", "Masło shea" → "Butyrospermum Parkii Butter"), in the order of the text. Only ingredients present in the text. Empty array if the text is not an ingredient list.',
      },
    },
    required: ['ingredients'],
    additionalProperties: false,
  },
};

export const parseOutput = z.object({
  ingredients: z.array(z.string().trim().min(1).max(150)).max(300),
});
export type ParseOutput = z.infer<typeof parseOutput>;

export function parseUserMessage(text: string): string {
  return [
    'Read the ingredient list a user pasted from a cosmetic package or a shop page. Drop marketing text, percentages, footnotes and "may contain" parts. Do not add ingredients that are not there.',
    dataBlock({ text }),
    `Call ${PARSE_TOOL.name}.`,
  ].join('\n\n');
}
