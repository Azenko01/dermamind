import { BarcodeIcon, MagnifyingGlassIcon } from 'phosphor-react-native';
import { View } from 'react-native';
import { OptionCard } from '@/components/ui/OptionCard';
import { QuestionScreen } from '@/components/ui/QuestionScreen';
import { useQuiz } from '@/stores/quiz';
import { useTheme } from '@/theme';
import { stepNav } from '../steps';

/**
 * O21: optional. The scanner and search need an account, which comes on O22 — so the choice is
 * remembered and opens right after the profile is saved.
 */
export function ProductsStep() {
  const { progress, next, back } = stepNav('products');
  const { spacing } = useTheme();
  const setAfter = useQuiz((s) => s.setAfterOnboarding);
  const choose = (after: 'scan' | 'explore') => {
    setAfter(after);
    next();
  };
  return (
    <QuestionScreen
      progress={progress}
      onBack={back}
      title="Dodaj produkty, których używasz"
      subtitle="Ocenimy je i ułożymy z nich pierwszą rutynę."
      onNext={() => {
        setAfter(null);
        next();
      }}
      nextLabel="Nie mam jeszcze"
    >
      <View style={{ gap: spacing.md }}>
        <OptionCard
          mode="action"
          icon={BarcodeIcon}
          title="**Skanuj** kod kreskowy"
          description="Najszybciej, prosto z opakowania — po zapisaniu profilu"
          onPress={() => choose('scan')}
        />
        <OptionCard
          mode="action"
          icon={MagnifyingGlassIcon}
          title="**Szukaj** po nazwie lub marce"
          description="Otworzymy wyszukiwarkę po zapisaniu profilu"
          onPress={() => choose('explore')}
        />
      </View>
    </QuestionScreen>
  );
}
