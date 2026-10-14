import { View } from 'react-native';
import { Chip, ChipGroup } from '@/components/ui/Chip';
import { OptionCard } from '@/components/ui/OptionCard';
import { QuestionScreen } from '@/components/ui/QuestionScreen';
import { useQuiz } from '@/stores/quiz';
import { useTheme } from '@/theme';
import {
  afterWashOptions,
  avoidGroupOptions,
  budgetOptions,
  concernOptions,
  mustHaveOptions,
  NONE,
  reactionOptions,
  seasonalOptions,
  spfOptions,
  struggleOptions,
  symptomOptions,
  triggerOptions,
  type Option,
} from '../content';
import { stepNav, type StepId } from '../steps';

// ─── generic templates ───

function SingleChoice<T extends string>(props: {
  step: StepId;
  title: string;
  subtitle?: string;
  options: Option<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
}) {
  const { progress, next, back } = stepNav(props.step);
  const { spacing } = useTheme();
  return (
    <QuestionScreen
      progress={progress}
      onBack={back}
      title={props.title}
      subtitle={props.subtitle}
      nextDisabled={!props.value}
      onNext={next}
    >
      <View style={{ gap: spacing.md }}>
        {props.options.map((o) => (
          <OptionCard
            key={o.id}
            mode="radio"
            title={o.label}
            description={o.description}
            icon={o.icon}
            selected={props.value === o.id}
            onPress={() => props.onChange(o.id)}
          />
        ))}
      </View>
    </QuestionScreen>
  );
}

/**
 * Multiple choice with an exclusive "none of these" option. `undefined` = not answered yet,
 * `[]` = the user picked "none" (or, when `optional`, simply chose nothing).
 */
function MultiChoice<T extends string>(props: {
  step: StepId;
  title: string;
  subtitle?: string;
  footnote?: string;
  highlight?: 'bad' | 'accent';
  options: Option<T | typeof NONE>[];
  value: T[] | undefined;
  onChange: (value: T[]) => void;
  /** Can continue without choosing anything (O15). */
  optional?: boolean;
}) {
  const { progress, next, back } = stepNav(props.step);
  const { spacing } = useTheme();
  const value = props.value;
  const toggle = (id: T | typeof NONE) => {
    if (id === NONE) return props.onChange([]);
    const current = value ?? [];
    props.onChange(current.includes(id) ? current.filter((v) => v !== id) : [...current, id]);
  };
  return (
    <QuestionScreen
      progress={progress}
      onBack={back}
      title={props.title}
      highlight={props.highlight}
      subtitle={props.subtitle}
      footnote={props.footnote}
      nextDisabled={!props.optional && value === undefined}
      onNext={() => {
        if (value === undefined) props.onChange([]);
        next();
      }}
    >
      <View style={{ gap: spacing.md }}>
        {props.options.map((o) => (
          <OptionCard
            key={o.id}
            mode="checkbox"
            title={o.label}
            description={o.description}
            icon={o.icon}
            selected={o.id === NONE ? value?.length === 0 : (value ?? []).includes(o.id)}
            onPress={() => toggle(o.id)}
          />
        ))}
      </View>
    </QuestionScreen>
  );
}

// ─── O6–O19 ───

export function StruggleStep() {
  const value = useQuiz((s) => s.answers.struggle);
  const set = useQuiz((s) => s.set);
  return (
    <SingleChoice
      step="struggle"
      title="Co najbardziej przeszkadza Ci w pielęgnacji?"
      subtitle="Dopasujemy do tego ekran „Dziś”."
      options={struggleOptions}
      value={value}
      onChange={(v) => set('struggle', v)}
    />
  );
}

/** O7: chips in the order of choice — the first one becomes the main concern. */
export function ConcernsStep() {
  const value = useQuiz((s) => s.answers.concerns) ?? [];
  const set = useQuiz((s) => s.set);
  const { progress, next, back } = stepNav('concerns');
  return (
    <QuestionScreen
      progress={progress}
      onBack={back}
      title="Nad czym chcesz popracować?"
      subtitle="Wybierz wszystko, co pasuje. Pierwszy wybór traktujemy jako najważniejszy."
      nextDisabled={value.length === 0}
      onNext={next}
    >
      <ChipGroup>
        {concernOptions.map((o) => (
          <Chip
            key={o.id}
            label={o.label}
            icon={o.icon}
            selected={value.includes(o.id)}
            onPress={() =>
              set(
                'concerns',
                value.includes(o.id) ? value.filter((c) => c !== o.id) : [...value, o.id],
              )
            }
          />
        ))}
      </ChipGroup>
    </QuestionScreen>
  );
}

export function AfterWashStep() {
  const value = useQuiz((s) => s.answers.afterWash);
  const set = useQuiz((s) => s.set);
  return (
    <SingleChoice
      step="after-wash"
      title="Jak czuje się skóra 30 minut po myciu?"
      subtitle="Zanim nałożysz krem."
      options={afterWashOptions}
      value={value}
      onChange={(v) => set('afterWash', v)}
    />
  );
}

export function SymptomsStep() {
  const value = useQuiz((s) => s.answers.symptoms);
  const set = useQuiz((s) => s.set);
  return (
    <MultiChoice
      step="symptoms"
      title="Co zauważasz w ostatnich 2 tygodniach?"
      subtitle="To mówi nam o stanie bariery ochronnej."
      options={symptomOptions}
      value={value}
      onChange={(v) => set('symptoms', v)}
    />
  );
}

export function ReactionsStep() {
  const value = useQuiz((s) => s.answers.reactionFrequency);
  const set = useQuiz((s) => s.set);
  return (
    <SingleChoice
      step="reactions"
      title="Jak często skóra reagowała w ostatnim miesiącu?"
      subtitle="Zaczerwienienie, pieczenie, swędzenie."
      options={reactionOptions}
      value={value}
      onChange={(v) => set('reactionFrequency', v)}
    />
  );
}

export function TriggersStep() {
  const value = useQuiz((s) => s.answers.triggers);
  const set = useQuiz((s) => s.set);
  return (
    <MultiChoice
      step="triggers"
      title="Co zwykle wywołuje reakcję?"
      options={triggerOptions}
      value={value}
      onChange={(v) => set('triggers', v)}
    />
  );
}

export function SeasonsStep() {
  const value = useQuiz((s) => s.answers.seasonal);
  const set = useQuiz((s) => s.set);
  return (
    <SingleChoice
      step="seasons"
      title="Czy skóra zmienia się latem i zimą?"
      options={seasonalOptions}
      value={value}
      onChange={(v) => set('seasonal', v)}
    />
  );
}

/** O15 (mockup 04). */
export function AvoidGroupsStep() {
  const value = useQuiz((s) => s.answers.avoidGroups);
  const set = useQuiz((s) => s.set);
  return (
    <MultiChoice
      step="avoid-groups"
      title="Jakich składników chcesz [unikać]?"
      subtitle="Pokażemy produkty bez nich."
      footnote="Znasz konkretny składnik, który Ci szkodzi? Dodasz go w następnym kroku."
      options={avoidGroupOptions}
      value={value}
      onChange={(v) => set('avoidGroups', v)}
      optional
    />
  );
}

export function MustHavesStep() {
  const value = useQuiz((s) => s.answers.mustHaves);
  const set = useQuiz((s) => s.set);
  return (
    <MultiChoice
      step="must-haves"
      title="Czy masz dodatkowe wymagania?"
      subtitle="Takie produkty pokażemy wyżej."
      highlight="accent"
      options={mustHaveOptions}
      value={value}
      onChange={(v) => set('mustHaves', v)}
    />
  );
}

export function SpfStep() {
  const value = useQuiz((s) => s.answers.usesSpf);
  const set = useQuiz((s) => s.set);
  return (
    <SingleChoice
      step="spf"
      title="Czy używasz kremu z filtrem SPF?"
      options={spfOptions}
      value={value}
      onChange={(v) => set('usesSpf', v)}
    />
  );
}

export function BudgetStep() {
  const value = useQuiz((s) => s.answers.budget);
  const set = useQuiz((s) => s.set);
  return (
    <SingleChoice
      step="budget"
      title="Ile zwykle wydajesz na jeden produkt?"
      subtitle="Dopasujemy do tego polecane produkty."
      options={budgetOptions}
      value={value}
      onChange={(v) => set('budget', v)}
    />
  );
}
