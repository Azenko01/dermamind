import { Redirect, useLocalSearchParams } from 'expo-router';
import { stepScreens } from '@/features/onboarding/screens';
import { isStep } from '@/features/onboarding/steps';

export default function OnboardingStep() {
  const { step } = useLocalSearchParams<{ step: string }>();
  if (!isStep(step) || step === 'welcome') return <Redirect href="/onboarding" />;
  const Screen = stepScreens[step];
  return <Screen />;
}
