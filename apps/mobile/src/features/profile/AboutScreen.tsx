import Constants from 'expo-constants';
import { router } from 'expo-router';
import { ArrowSquareOutIcon } from 'phosphor-react-native';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinkButton } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

/** Profil → O aplikacji: version, where the data comes from and its licences (ODbL attribution). */
export function AboutScreen() {
  const { colors, spacing, radius } = useTheme();
  const section = {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.screen,
    gap: spacing.md,
  };
  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.backgroundAlt }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.screen, gap: spacing.xl }}>
        <LinkButton title="Wstecz" color="textSecondary" onPress={() => router.back()} />
        <Text variant="title" accessibilityRole="header">
          O aplikacji
        </Text>
        <View style={[styles.card, section]}>
          <Text variant="productName">DermaMind {Constants.expoConfig?.version ?? ''}</Text>
          <Text color="textSecondary">
            Ocenia, jak skład kosmetyku pasuje do Twojej skóry. Projekt dyplomowy, Collegium Da
            Vinci, Poznań. Wynik to wskazówka, nie porada lekarska.
          </Text>
        </View>

        <View style={[styles.card, section]}>
          <Text variant="label" color="textSecondary">
            Źródła danych
          </Text>
          <Text variant="bodyStrong">Dane: Open Beauty Facts (ODbL)</Text>
          <Text color="textSecondary">
            Kody kreskowe, nazwy, zdjęcia i składy części produktów pochodzą z Open Beauty Facts —
            otwartej bazy tworzonej przez społeczność. Baza jest udostępniona na licencji Open
            Database License (ODbL) 1.0.
          </Text>
          <ExternalLink label="openbeautyfacts.org" url="https://world.openbeautyfacts.org" />
          <ExternalLink
            label="Licencja ODbL 1.0"
            url="https://opendatacommons.org/licenses/odbl/1-0/"
          />
          <Text variant="bodyStrong">Składniki: CosIng — European Commission</Text>
          <Text color="textSecondary">
            Nazwy INCI, numery CAS / EC, funkcje składników i pozycje w załącznikach rozporządzenia
            (WE) nr 1223/2009 pochodzą z bazy CosIng Komisji Europejskiej — przez taksonomię
            składników Open Beauty Facts (ODbL) oraz oficjalne eksporty załączników II–VI. CosIng ma
            charakter informacyjny i nie jest wiążący prawnie.
          </Text>
          <ExternalLink
            label="CosIng — baza składników kosmetycznych"
            url="https://ec.europa.eu/growth/tools-databases/cosing/"
          />
          <Text color="textSecondary">
            Ocena składników dla skóry, wyjątki i część produktów: zespół DermaMind.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ExternalLink({ label, url }: { label: string; url: string }) {
  const { colors, spacing, sizes } = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => void Linking.openURL(url)}
      style={[styles.link, { gap: spacing.sm, minHeight: sizes.minTouchTarget }]}
    >
      <ArrowSquareOutIcon size={20} color={colors.accent} />
      <Text color="accent">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: { borderWidth: 1 },
  link: { flexDirection: 'row', alignItems: 'center' },
});
