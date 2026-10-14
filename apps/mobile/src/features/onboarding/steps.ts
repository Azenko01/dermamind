import { router } from 'expo-router';

/** O1–O22 in order (PLAN.md 6.1). O1 is /onboarding, the rest are /onboarding/[step]. */
export const STEPS = [
  'welcome', // O1
  'intro-sense', // O2
  'intro-questions', // O3
  'intro-match', // O4
  'intro-values', // O5
  'struggle', // O6
  'concerns', // O7
  'shine', // O8
  'after-wash', // O9
  'symptoms', // O10
  'reactions', // O11
  'triggers', // O12
  'seasons', // O13
  'result', // O14
  'avoid-groups', // O15
  'avoid-ingredients', // O16
  'must-haves', // O17
  'spf', // O18
  'budget', // O19
  'ready', // O20
  'products', // O21
  'save', // O22
] as const;

export type StepId = (typeof STEPS)[number];

export function isStep(value: unknown): value is StepId {
  return typeof value === 'string' && (STEPS as readonly string[]).includes(value);
}

export function stepNav(id: StepId) {
  const index = STEPS.indexOf(id);
  const nextId = STEPS[index + 1];
  return {
    /** O2…O21 show a progress bar; O1 and O22 don't. */
    progress: index / (STEPS.length - 1),
    next: () => {
      if (nextId) router.push({ pathname: '/onboarding/[step]', params: { step: nextId } });
    },
    back: () => (router.canGoBack() ? router.back() : router.replace('/onboarding')),
  };
}
