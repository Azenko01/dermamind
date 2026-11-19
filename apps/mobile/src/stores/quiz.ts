import type { FaceZone, QuizAnswers, ShineLevel } from '@dermamind/scoring';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type QuizDraft = Partial<Omit<QuizAnswers, 'shine'>> & {
  shine?: Partial<Record<FaceZone, ShineLevel>>;
};

/**
 * onboarding = O1–O22 before an account exists (answers are sent after sign-up);
 * retake = the whole quiz again from Profil, prefilled, saved at the end;
 * edit = one question from "Profil skóry", saved right away.
 */
export type QuizMode = 'onboarding' | 'retake' | 'edit';

/** What to open once the account exists — chosen on O21 before the scanner is reachable. */
export type AfterOnboarding = 'scan' | 'explore' | null;

interface QuizState {
  answers: QuizDraft;
  mode: QuizMode;
  afterOnboarding: AfterOnboarding;
  set: <K extends keyof QuizDraft>(key: K, value: QuizDraft[K]) => void;
  setShine: (zone: FaceZone, level: ShineLevel) => void;
  reset: () => void;
  /** Starts a retake / single-question edit with the saved answers (or none). */
  startEditing: (mode: 'retake' | 'edit', answers: QuizAnswers | null) => void;
  /** Back to onboarding mode with nothing on the device. */
  finishEditing: () => void;
  setAfterOnboarding: (next: AfterOnboarding) => void;
}

/**
 * Quiz answers on the device (PLAN.md 6.1, O22): kept in AsyncStorage (not secret) so closing the
 * app mid-quiz doesn't lose them; in onboarding mode sent with PUT /v1/me/quiz after sign-up.
 */
export const useQuiz = create<QuizState>()(
  persist(
    (set) => ({
      answers: {},
      mode: 'onboarding',
      afterOnboarding: null,
      set: (key, value) => set((s) => ({ answers: { ...s.answers, [key]: value } })),
      setShine: (zone, level) =>
        set((s) => ({ answers: { ...s.answers, shine: { ...s.answers.shine, [zone]: level } } })),
      reset: () => set({ answers: {}, mode: 'onboarding' }),
      startEditing: (mode, answers) => set({ mode, answers: answers ? { ...answers } : {} }),
      finishEditing: () => set({ answers: {}, mode: 'onboarding' }),
      setAfterOnboarding: (afterOnboarding) => set({ afterOnboarding }),
    }),
    {
      name: 'dermamind.quiz',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      // v1 had only `answers` — a quiz in progress survives the update
      migrate: (persisted) => ({
        ...(persisted as Pick<QuizState, 'answers'>),
        mode: 'onboarding' as const,
        afterOnboarding: null,
      }),
    },
  ),
);

/** Fills optional multi-choice answers with [] and checks the rest is there. */
export function completeAnswers(d: QuizDraft): QuizAnswers | null {
  const { shine } = d;
  if (
    !d.struggle ||
    !d.concerns?.length ||
    !shine?.tZone ||
    !shine.cheeks ||
    !shine.jaw ||
    !d.afterWash ||
    !d.symptoms ||
    !d.reactionFrequency ||
    !d.triggers ||
    !d.seasonal ||
    !d.usesSpf ||
    !d.budget
  ) {
    return null;
  }
  return {
    struggle: d.struggle,
    concerns: d.concerns,
    shine: { tZone: shine.tZone, cheeks: shine.cheeks, jaw: shine.jaw },
    afterWash: d.afterWash,
    symptoms: d.symptoms,
    reactionFrequency: d.reactionFrequency,
    triggers: d.triggers,
    seasonal: d.seasonal,
    avoidGroups: d.avoidGroups ?? [],
    avoidIngredients: d.avoidIngredients ?? [],
    mustHaves: d.mustHaves ?? [],
    usesSpf: d.usesSpf,
    budget: d.budget,
  };
}
