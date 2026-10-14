import { QuestionScreen } from '@/components/ui/QuestionScreen';
import { ZoneAccordion } from '@/components/ui/ZoneAccordion';
import { useQuiz } from '@/stores/quiz';
import { zones } from '../content';
import { stepNav } from '../steps';

/** O8 (mockup 02): three face zones, four answers each. */
export function ShineStep() {
  const shine = useQuiz((s) => s.answers.shine) ?? {};
  const setShine = useQuiz((s) => s.setShine);
  const { progress, next, back } = stepNav('shine');
  const done = zones.every((z) => shine[z.id]);
  return (
    <QuestionScreen
      progress={progress}
      onBack={back}
      title="Jak bardzo błyszczy się Twoja skóra po południu?"
      subtitle="W dzień bez pudru i bibułek matujących."
      nextDisabled={!done}
      onNext={next}
    >
      <ZoneAccordion zones={zones} value={shine} onChange={setShine} />
    </QuestionScreen>
  );
}
