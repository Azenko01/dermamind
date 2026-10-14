import { Redirect, useLocalSearchParams } from 'expo-router';
import { isStep, type StepId } from '@/features/onboarding/steps';
import { IntroScreen } from '@/features/onboarding/screens/IntroScreens';
import {
  AfterWashStep,
  BudgetStep,
  ConcernsStep,
  MustHavesStep,
  ReactionsStep,
  SeasonsStep,
  SpfStep,
  StruggleStep,
  SymptomsStep,
  TriggersStep,
  AvoidGroupsStep,
} from '@/features/onboarding/screens/QuestionSteps';
import { ShineStep } from '@/features/onboarding/screens/ShineStep';
import { ResultStep } from '@/features/onboarding/screens/ResultStep';
import { AvoidIngredientsStep } from '@/features/onboarding/screens/AvoidIngredientsStep';
import { ReadyStep } from '@/features/onboarding/screens/ReadyStep';
import { ProductsStep } from '@/features/onboarding/screens/ProductsStep';
import { SaveStep } from '@/features/onboarding/screens/SaveStep';

const screens: Record<Exclude<StepId, 'welcome'>, () => React.JSX.Element> = {
  'intro-sense': () => <IntroScreen id="intro-sense" />,
  'intro-questions': () => <IntroScreen id="intro-questions" />,
  'intro-match': () => <IntroScreen id="intro-match" />,
  'intro-values': () => <IntroScreen id="intro-values" />,
  struggle: StruggleStep,
  concerns: ConcernsStep,
  shine: ShineStep,
  'after-wash': AfterWashStep,
  symptoms: SymptomsStep,
  reactions: ReactionsStep,
  triggers: TriggersStep,
  seasons: SeasonsStep,
  result: ResultStep,
  'avoid-groups': AvoidGroupsStep,
  'avoid-ingredients': AvoidIngredientsStep,
  'must-haves': MustHavesStep,
  spf: SpfStep,
  budget: BudgetStep,
  ready: ReadyStep,
  products: ProductsStep,
  save: SaveStep,
};

export default function OnboardingStep() {
  const { step } = useLocalSearchParams<{ step: string }>();
  if (!isStep(step) || step === 'welcome') return <Redirect href="/onboarding" />;
  const Screen = screens[step];
  return <Screen />;
}
