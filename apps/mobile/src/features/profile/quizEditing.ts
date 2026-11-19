import type { QuizAnswersBody as QuizAnswers } from '@dermamind/api-client';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { api, errorText } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { completeAnswers, useQuiz } from '@/stores/quiz';
import type { QuestionStepId } from '@/features/onboarding/steps';

/** "Wypełnij quiz ponownie" / "Zrób quiz": the questions again, prefilled with saved answers. */
export function startRetake(saved: QuizAnswers | null) {
  useQuiz.getState().startEditing('retake', saved);
  router.push({ pathname: '/quiz/[step]', params: { step: 'struggle' } });
}

/** Change one answer from "Profil skóry" without redoing the quiz. */
export function editAnswer(saved: QuizAnswers, step: QuestionStepId) {
  useQuiz.getState().startEditing('edit', saved);
  router.push({ pathname: '/quiz/[step]', params: { step } });
}

/** Leaves the retake (from its first question) or the single edit without saving. */
export function cancelQuizEditing() {
  useQuiz.getState().finishEditing();
  router.back();
}

let saving = false;

/**
 * PUT /v1/me/quiz with the answers being edited, then every query is refreshed — Match Scores,
 * Dziś and Rutyna all depend on the profile.
 */
export async function saveQuizAnswers(): Promise<void> {
  if (saving) return;
  const { mode, answers } = useQuiz.getState();
  const complete = completeAnswers(answers);
  if (!complete) {
    Alert.alert('Brakuje odpowiedzi', 'Odpowiedz na wszystkie pytania, żeby zapisać profil.');
    return;
  }
  saving = true;
  try {
    const res = await api.PUT('/v1/me/quiz', { body: complete }).catch(() => null);
    if (!res?.data) {
      Alert.alert('Nie udało się zapisać', errorText(res?.response.status));
      return;
    }
    queryClient.setQueryData(['me'], res.data);
    void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
    useQuiz.getState().finishEditing();
    if (mode === 'retake') {
      router.dismissAll();
      router.push('/skin-profile');
    } else {
      router.back();
    }
  } finally {
    saving = false;
  }
}
