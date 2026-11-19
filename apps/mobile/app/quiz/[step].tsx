import { Redirect, useLocalSearchParams } from 'expo-router';
import { stepScreens } from '@/features/onboarding/screens';
import { isQuestionStep } from '@/features/onboarding/steps';
import { useQuiz } from '@/stores/quiz';

/** Quiz questions for a signed-in user: retake from Profil or one answer edited (PLAN.md 6.1). */
export default function QuizStep() {
  const { step } = useLocalSearchParams<{ step: string }>();
  const mode = useQuiz((s) => s.mode);
  if (mode === 'onboarding' || !isQuestionStep(step)) return <Redirect href="/skin-profile" />;
  const Screen = stepScreens[step];
  return <Screen />;
}
