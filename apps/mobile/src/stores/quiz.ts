import type { FaceZone, QuizAnswers, ShineLevel } from '@dermamind/scoring';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type QuizDraft = Partial<Omit<QuizAnswers, 'shine'>> & {
  shine?: Partial<Record<FaceZone, ShineLevel>>;
};

interface QuizState {
  answers: QuizDraft;
  set: <K extends keyof QuizDraft>(key: K, value: QuizDraft[K]) => void;
  setShine: (zone: FaceZone, level: ShineLevel) => void;
  reset: () => void;
}

/**
 * Answers before an account exists (PLAN.md 6.1, O22): kept on the device (AsyncStorage — not
 * secret) so closing the app mid-quiz doesn't lose them; sent with PUT /v1/me/quiz after sign-up.
 */
export const useQuiz = create<QuizState>()(
  persist(
    (set) => ({
      answers: {},
      set: (key, value) => set((s) => ({ answers: { ...s.answers, [key]: value } })),
      setShine: (zone, level) =>
        set((s) => ({ answers: { ...s.answers, shine: { ...s.answers.shine, [zone]: level } } })),
      reset: () => set({ answers: {} }),
    }),
    { name: 'dermamind.quiz', storage: createJSONStorage(() => AsyncStorage), version: 1 },
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
