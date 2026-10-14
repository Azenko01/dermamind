import { useState } from 'react';
import { View } from 'react-native';
import { SecondaryButton } from '@/components/ui/Button';
import { Chip, ChipGroup } from '@/components/ui/Chip';
import { QuestionScreen } from '@/components/ui/QuestionScreen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useQuiz } from '@/stores/quiz';
import { useTheme } from '@/theme';
import { commonAvoidedIngredients } from '../content';
import { stepNav } from '../steps';

const normalise = (s: string) => s.trim().replace(/\s+/g, ' ').toUpperCase();

/**
 * O16: specific ingredients. Until the catalogue search lands (Sprint 2) the field filters the
 * common list and lets you add any INCI name; the API matches names against the catalogue.
 */
export function AvoidIngredientsStep() {
  const selected = useQuiz((s) => s.answers.avoidIngredients) ?? [];
  const set = useQuiz((s) => s.set);
  const [query, setQuery] = useState('');
  const { progress, next, back } = stepNav('avoid-ingredients');
  const { spacing } = useTheme();

  const add = (inci: string) => {
    const name = normalise(inci);
    if (name && !selected.includes(name)) set('avoidIngredients', [...selected, name]);
    setQuery('');
  };
  const remove = (inci: string) =>
    set(
      'avoidIngredients',
      selected.filter((s) => s !== inci),
    );

  const q = normalise(query);
  const suggestions = commonAvoidedIngredients.filter(
    (i) =>
      !selected.includes(i.inci) && (!q || i.inci.includes(q) || normalise(i.name).includes(q)),
  );
  const label = (inci: string) =>
    commonAvoidedIngredients.find((i) => i.inci === inci)?.name ?? inci;

  return (
    <QuestionScreen
      progress={progress}
      onBack={back}
      title="Konkretne składniki do [unikania]"
      subtitle="Np. taki, po którym skóra zareagowała. Możesz pominąć ten krok."
      nextLabel={selected.length ? 'Dalej' : 'Pomiń'}
      onNext={() => {
        if (!useQuiz.getState().answers.avoidIngredients) set('avoidIngredients', []);
        next();
      }}
    >
      <View style={{ gap: spacing.md }}>
        <TextField
          label="Nazwa składnika (INCI)"
          placeholder="np. Limonene"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={() => add(query)}
          maxLength={100}
        />
        {q && !suggestions.some((s) => s.inci === q) ? (
          <SecondaryButton title={`Dodaj „${query.trim()}”`} onPress={() => add(query)} />
        ) : null}
      </View>

      {selected.length ? (
        <View style={{ gap: spacing.md }}>
          <Text variant="label" color="textSecondary">
            Unikasz
          </Text>
          <ChipGroup>
            {selected.map((inci) => (
              <Chip key={inci} label={label(inci)} tone="avoid" onPress={() => remove(inci)} />
            ))}
          </ChipGroup>
        </View>
      ) : null}

      {suggestions.length ? (
        <View style={{ gap: spacing.md }}>
          <Text variant="label" color="textSecondary">
            Często unikane
          </Text>
          <ChipGroup>
            {suggestions.map((i) => (
              <Chip key={i.inci} label={i.name} tone="add" onPress={() => add(i.inci)} />
            ))}
          </ChipGroup>
        </View>
      ) : null}
    </QuestionScreen>
  );
}
