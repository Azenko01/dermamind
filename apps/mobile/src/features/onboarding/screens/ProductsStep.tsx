import { BarcodeIcon, MagnifyingGlassIcon } from 'phosphor-react-native';
import { Alert, View } from 'react-native';
import { OptionCard } from '@/components/ui/OptionCard';
import { QuestionScreen } from '@/components/ui/QuestionScreen';
import { useTheme } from '@/theme';
import { stepNav } from '../steps';

const soon = () =>
  Alert.alert(
    'Już niedługo',
    'Skaner i wyszukiwarka produktów pojawią się w jednej z kolejnych wersji. Produkty dodasz później na zakładce Półka.',
  );

/** O21: optional — scanner (Sprint 3) and catalogue search (Sprint 2) aren't there yet. */
export function ProductsStep() {
  const { progress, next, back } = stepNav('products');
  const { spacing } = useTheme();
  return (
    <QuestionScreen
      progress={progress}
      onBack={back}
      title="Dodaj produkty, których używasz"
      subtitle="Ocenimy je i ułożymy z nich pierwszą rutynę."
      onNext={next}
      nextLabel="Nie mam jeszcze"
    >
      <View style={{ gap: spacing.md }}>
        <OptionCard
          mode="action"
          icon={BarcodeIcon}
          title="**Skanuj** kod kreskowy"
          description="Najszybciej, prosto z opakowania"
          onPress={soon}
        />
        <OptionCard
          mode="action"
          icon={MagnifyingGlassIcon}
          title="**Szukaj** po nazwie lub marce"
          onPress={soon}
        />
      </View>
    </QuestionScreen>
  );
}
