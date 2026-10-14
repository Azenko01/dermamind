import type { Lang } from './prompts/common';

export type FallbackReason = 'not_configured' | 'limit' | 'error' | 'refused';

/**
 * Fixed texts when there is no AI answer (PLAN.md 5.1). The app keeps working: the score and the
 * ingredient facts never depend on AI.
 */
const TEXTS: Record<
  'ingredient' | 'product',
  Record<'unavailable' | 'limit', Record<Lang, string>>
> = {
  ingredient: {
    unavailable: {
      pl: 'Opis tego składnika jest chwilowo niedostępny. Poniżej znajdziesz jego funkcje i cechy z naszej bazy.',
      en: 'The description of this ingredient is unavailable right now. Its functions and properties from our database are below.',
      uk: 'Опис цього інгредієнта зараз недоступний. Нижче — його функції та властивості з нашої бази.',
    },
    limit: {
      pl: 'Dzienny limit opisów AI został wykorzystany. Wróć jutro — funkcje i cechy składnika działają bez limitu.',
      en: 'The daily limit of AI descriptions has been used up. Come back tomorrow — ingredient functions and properties work without a limit.',
      uk: 'Денний ліміт AI-описів вичерпано. Поверніться завтра — функції та властивості інгредієнта доступні без обмежень.',
    },
  },
  product: {
    unavailable: {
      pl: 'Opis AI jest chwilowo niedostępny. Wynik powyżej liczą nasze reguły na podstawie składu — powody znajdziesz w punktach wyżej.',
      en: 'The AI description is unavailable right now. The score above is computed by our rules from the ingredients — the reasons are listed above.',
      uk: 'AI-опис зараз недоступний. Оцінку вище рахують наші правила за складом — причини наведено в пунктах вище.',
    },
    limit: {
      pl: 'Dzienny limit opisów AI został wykorzystany. Wróć jutro — wynik i jego powody działają bez limitu.',
      en: 'The daily limit of AI descriptions has been used up. Come back tomorrow — the score and its reasons work without a limit.',
      uk: 'Денний ліміт AI-описів вичерпано. Поверніться завтра — оцінка та її причини доступні без обмежень.',
    },
  },
};

export function fallbackText(
  kind: 'ingredient' | 'product',
  reason: FallbackReason,
  lang: Lang,
): string {
  return TEXTS[kind][reason === 'limit' ? 'limit' : 'unavailable'][lang];
}
