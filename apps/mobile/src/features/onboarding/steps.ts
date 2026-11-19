import { router } from 'expo-router';
import { cancelQuizEditing, saveQuizAnswers } from '@/features/profile/quizEditing';
import { useQuiz } from '@/stores/quiz';

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

/**
 * Retake / edit from Profil: only the questions (O6–O19, with the O14 result in its place) — no
 * intro screens, no "add products", no account steps.
 */
export const QUESTION_STEPS = [
  'struggle',
  'concerns',
  'shine',
  'after-wash',
  'symptoms',
  'reactions',
  'triggers',
  'seasons',
  'result',
  'avoid-groups',
  'avoid-ingredients',
  'must-haves',
  'spf',
  'budget',
] as const satisfies readonly StepId[];

export type QuestionStepId = (typeof QUESTION_STEPS)[number];

export function isQuestionStep(value: unknown): value is QuestionStepId {
  return typeof value === 'string' && (QUESTION_STEPS as readonly string[]).includes(value);
}

/** Where a step lives: /onboarding before the account, /quiz afterwards. */
export function stepHref(step: StepId) {
  return useQuiz.getState().mode === 'onboarding'
    ? ({ pathname: '/onboarding/[step]', params: { step } } as const)
    : ({ pathname: '/quiz/[step]', params: { step } } as const);
}

export interface StepNav {
  progress: number;
  next: () => void;
  back: () => void;
  /** "Dalej", or "Zapisz" where the answer is saved */
  nextLabel?: string;
}

export function stepNav(id: StepId): StepNav {
  const { mode } = useQuiz.getState();
  if (mode === 'edit') {
    return {
      progress: 1,
      next: () => void saveQuizAnswers(),
      back: cancelQuizEditing,
      nextLabel: 'Zapisz',
    };
  }
  if (mode === 'retake') {
    const index = (QUESTION_STEPS as readonly string[]).indexOf(id);
    const nextId = QUESTION_STEPS[index + 1];
    return {
      progress: (index + 1) / QUESTION_STEPS.length,
      next: () =>
        nextId
          ? router.push({ pathname: '/quiz/[step]', params: { step: nextId } })
          : void saveQuizAnswers(),
      back: () => (index <= 0 ? cancelQuizEditing() : router.back()),
      nextLabel: nextId ? undefined : 'Zapisz profil',
    };
  }
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
