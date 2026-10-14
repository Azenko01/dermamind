import type { RoutineStep, TimeOfDay } from '@dermamind/scoring';

export const stepCopy: Record<RoutineStep, { label: string; hint: string }> = {
  cleanse: { label: 'Oczyszczanie', hint: 'Żel, pianka lub emulsja' },
  tone: { label: 'Tonizowanie', hint: 'Tonik lub esencja' },
  treat: { label: 'Serum', hint: 'Serum lub kuracja' },
  moisturize: { label: 'Nawilżanie', hint: 'Krem lub olejek' },
  protect: { label: 'SPF', hint: 'Ochrona przed UV' },
};

export const timeCopy: Record<TimeOfDay, { label: string; adverb: string }> = {
  am: { label: 'Rano', adverb: 'rano' },
  pm: { label: 'Wieczór', adverb: 'wieczorem' },
};

/** Texts for ingredient_conflicts.note_key (scripts/catalog/conflicts.ts). */
export const conflictCopy: Record<string, string> = {
  retinoid_exfoliant:
    'Retinoid i kwasy złuszczające w jednej porze dnia mogą podrażniać i osłabiać barierę. Stosuj je w różne dni albo jedno rano, drugie wieczorem.',
  retinoid_benzoyl_peroxide:
    'Nadtlenek benzoilu może osłabiać działanie retinoidu i razem mocno wysuszają. Stosuj je o różnych porach dnia.',
  vitamin_c_exfoliant:
    'Witamina C i kwasy złuszczające razem mogą szczypać i podrażniać. Lepiej rozdzielić je na rano i wieczór.',
  double_exfoliation:
    'Dwa produkty z kwasami złuszczającymi naraz to ryzyko przesuszenia i podrażnień. Wybierz jeden w danej porze dnia.',
};

export const shelfCopy = {
  own: { label: 'Mam', empty: 'Dodawaj tu produkty, które masz w łazience.' },
  like: { label: 'Lubię', empty: 'Zapisuj produkty, które chcesz wypróbować albo kupić ponownie.' },
  avoid: { label: 'Unikam', empty: 'Produkty stąd zawsze oznaczamy jako „Nie pasuje”.' },
} as const;

/** Polish plural: 1 krok, 2–4 kroki, 5+ kroków. */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const d = n % 10;
  const t = n % 100;
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
}
