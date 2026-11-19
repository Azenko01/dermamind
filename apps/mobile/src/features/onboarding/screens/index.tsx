/** Screen for every quiz step — used by /onboarding/[step] and by /quiz/[step] (retake, edit). */
import type { StepId } from '../steps';
import { IntroScreen } from './IntroScreens';
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
} from './QuestionSteps';
import { ShineStep } from './ShineStep';
import { ResultStep } from './ResultStep';
import { AvoidIngredientsStep } from './AvoidIngredientsStep';
import { ReadyStep } from './ReadyStep';
import { ProductsStep } from './ProductsStep';
import { SaveStep } from './SaveStep';

export const stepScreens: Record<Exclude<StepId, 'welcome'>, () => React.JSX.Element> = {
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
