import type {
  AfterWash,
  AvoidGroup,
  BarrierSymptom,
  Budget,
  ConcernCode,
  FaceZone,
  MustHave,
  ReactionFrequency,
  SeasonalChange,
  ShineLevel,
  SkinType,
  SpfUsage,
  Struggle,
  Trigger,
} from '@dermamind/scoring';
import {
  AtomIcon,
  BandaidsIcon,
  CubeIcon,
  DotIcon,
  DropHalfIcon,
  DropIcon,
  FireIcon,
  FishIcon,
  FlaskIcon,
  HandPalmIcon,
  HexagonIcon,
  LeafIcon,
  LightningIcon,
  ListChecksIcon,
  QuestionIcon,
  RabbitIcon,
  SparkleIcon,
  SprayBottleIcon,
  StackIcon,
  SwatchesIcon,
  TargetIcon,
  ThermometerIcon,
  UmbrellaIcon,
  WavesIcon,
  type IconProps,
} from 'phosphor-react-native';
import type { ComponentType } from 'react';

// UI copy for the quiz (Polish). Codes come from @dermamind/scoring and go to the API unchanged.

export interface Option<T extends string> {
  id: T;
  /** Supports **bold** fragments. */
  label: string;
  description?: string;
  icon?: ComponentType<IconProps>;
}

/** Marker for "none of these" in multi-choice questions — never sent to the API. */
export const NONE = 'none' as const;

export const struggleOptions: Option<Struggle>[] = [
  { id: 'irritation', label: '**Podrażnienia** po kosmetykach', icon: LightningIcon },
  { id: 'no_results', label: 'Kosmetyki **nie dają efektów**', icon: QuestionIcon },
  { id: 'too_many_products', label: '**Za dużo produktów**, nie wiem, co działa', icon: StackIcon },
  { id: 'want_routine', label: 'Chcę **ułożyć rutynę** od podstaw', icon: ListChecksIcon },
];

export const concernOptions: Option<ConcernCode>[] = [
  { id: 'breakouts', label: 'Wypryski', icon: TargetIcon },
  { id: 'oiliness', label: 'Błyszczenie', icon: DropIcon },
  { id: 'pores', label: 'Widoczne pory', icon: DotIcon },
  { id: 'texture', label: 'Nierówna tekstura', icon: CubeIcon },
  { id: 'dark_spots', label: 'Przebarwienia', icon: SwatchesIcon },
  { id: 'radiance', label: 'Brak blasku', icon: SparkleIcon },
  { id: 'redness', label: 'Zaczerwienienia', icon: ThermometerIcon },
  { id: 'rosacea_prone', label: 'Skłonność do trądziku różowatego', icon: FireIcon },
  { id: 'eczema_prone', label: 'Skłonność do AZS', icon: BandaidsIcon },
  { id: 'hydration', label: 'Nawilżenie', icon: DropHalfIcon },
  { id: 'wrinkles', label: 'Zmarszczki', icon: WavesIcon },
];

export const zones: {
  id: FaceZone;
  label: string;
  options: { id: ShineLevel; label: string }[];
}[] = [
  {
    id: 'tZone',
    label: 'Czoło i nos',
    options: [
      { id: 'very', label: 'Bardzo się błyszczy' },
      { id: 'slightly', label: 'Trochę się błyszczy' },
      { id: 'none', label: 'Nie błyszczy się' },
      { id: 'dry', label: 'Sucha albo ściągnięta' },
    ],
  },
  {
    id: 'cheeks',
    label: 'Policzki',
    options: [
      { id: 'very', label: 'Bardzo się błyszczą' },
      { id: 'slightly', label: 'Trochę się błyszczą' },
      { id: 'none', label: 'Nie błyszczą się' },
      { id: 'dry', label: 'Suche albo ściągnięte' },
    ],
  },
  {
    id: 'jaw',
    label: 'Broda i żuchwa',
    options: [
      { id: 'very', label: 'Bardzo się błyszczą' },
      { id: 'slightly', label: 'Trochę się błyszczą' },
      { id: 'none', label: 'Nie błyszczą się' },
      { id: 'dry', label: 'Suche albo ściągnięte' },
    ],
  },
];

export const afterWashOptions: Option<AfterWash>[] = [
  { id: 'tight', label: '**Ściągnięta** — od razu sięgam po krem' },
  { id: 'comfortable', label: '**Komfortowa**, bez ściągnięcia i błysku' },
  { id: 'shiny', label: 'Szybko zaczyna się **błyszczeć**' },
];

export const symptomOptions: Option<BarrierSymptom | typeof NONE>[] = [
  { id: 'flaking', label: 'Łuszczenie się' },
  { id: 'roughness', label: 'Szorstkość' },
  { id: 'tightness', label: 'Uczucie ściągnięcia' },
  { id: 'dullness', label: 'Matowość, szary koloryt' },
  { id: 'cracking', label: 'Pękanie, drobne ranki' },
  { id: NONE, label: 'Nic z tych rzeczy' },
];

export const reactionOptions: Option<ReactionFrequency>[] = [
  { id: 'never', label: 'Ani razu' },
  { id: 'rarely', label: 'Raz albo dwa' },
  { id: 'sometimes', label: 'Kilka razy' },
  { id: 'often', label: 'Prawie co tydzień albo częściej' },
];

export const triggerOptions: Option<Trigger | typeof NONE>[] = [
  { id: 'cosmetics', label: 'Nowe kosmetyki' },
  { id: 'temperature', label: 'Zmiany temperatury' },
  { id: 'wind', label: 'Wiatr i mróz' },
  { id: 'hard_water', label: 'Twarda woda' },
  { id: 'sun', label: 'Słońce' },
  { id: 'stress', label: 'Stres i niewyspanie' },
  { id: NONE, label: 'Nic nie zauważam' },
];

export const seasonalOptions: Option<SeasonalChange>[] = [
  { id: 'oilier_in_summer', label: 'Latem jest **bardziej tłusta**' },
  { id: 'drier_in_winter', label: 'Zimą jest **bardziej sucha**' },
  { id: 'both', label: 'Jedno i drugie' },
  { id: 'no_change', label: 'Nie widzę różnicy' },
];

export const avoidGroupOptions: Option<AvoidGroup>[] = [
  { id: 'fragrance', label: 'Zapachy', icon: SprayBottleIcon },
  { id: 'drying_alcohol', label: 'Wysuszające alkohole', icon: FlaskIcon },
  { id: 'fungal_acne', label: 'Wyzwalacze trądziku grzybiczego', icon: UmbrellaIcon },
  { id: 'parabens', label: 'Parabeny', icon: HexagonIcon },
  { id: 'sulfates', label: 'Siarczany', icon: AtomIcon },
  { id: 'silicones', label: 'Silikony', icon: CubeIcon },
  { id: 'eu_allergens', label: 'Alergeny UE', icon: HandPalmIcon },
];

/** O16 "Często unikane": display name → INCI name sent to the API. */
export const commonAvoidedIngredients: { name: string; inci: string }[] = [
  { name: 'Limonene', inci: 'LIMONENE' },
  { name: 'Linalool', inci: 'LINALOOL' },
  { name: 'Alcohol Denat.', inci: 'ALCOHOL DENAT.' },
  { name: 'Methylisothiazolinone', inci: 'METHYLISOTHIAZOLINONE' },
  { name: 'Sodium Lauryl Sulfate', inci: 'SODIUM LAURYL SULFATE' },
  { name: 'Olej kokosowy', inci: 'COCOS NUCIFERA OIL' },
  { name: 'Lanolina', inci: 'LANOLIN' },
  { name: 'Citral', inci: 'CITRAL' },
  { name: 'Eugenol', inci: 'EUGENOL' },
  { name: 'Retinol', inci: 'RETINOL' },
];

export const mustHaveOptions: Option<MustHave | typeof NONE>[] = [
  {
    id: 'vegan',
    label: 'Wegańskie',
    description: 'Bez składników pochodzenia zwierzęcego',
    icon: LeafIcon,
  },
  {
    id: 'cruelty_free',
    label: 'Bez testów na zwierzętach',
    description: 'Marka nie testuje na zwierzętach',
    icon: RabbitIcon,
  },
  {
    id: 'reef_safe',
    label: 'Bezpieczne dla raf',
    description: 'Filtry UV, które nie szkodzą koralowcom',
    icon: FishIcon,
  },
  { id: NONE, label: 'Brak wymagań', description: 'Liczy się tylko dopasowanie do skóry' },
];

export const spfOptions: Option<SpfUsage>[] = [
  { id: 'daily', label: 'Tak, **codziennie**' },
  { id: 'sometimes', label: '**Czasami**, gdy świeci słońce' },
  { id: 'rarely', label: '**Rzadko** albo wcale' },
];

export const budgetOptions: Option<Budget>[] = [
  { id: 'lt30', label: 'Do 30 zł' },
  { id: '30_70', label: '30–70 zł' },
  { id: '70_150', label: '70–150 zł' },
  { id: 'gt150', label: 'Powyżej 150 zł' },
];

// ─── O14 result ───

export const skinTypeCopy: Record<SkinType, { name: string; headline: string; advice: string }> = {
  dry: {
    name: 'sucha',
    headline: 'Skóra potrzebuje więcej nawilżenia',
    advice: 'Kremowe konsystencje i łagodne mycie, bez wysuszających alkoholi.',
  },
  normal: {
    name: 'zrównoważona',
    headline: 'Skóra jest w równowadze',
    advice: 'Lekkie nawilżenie i codzienny SPF wystarczą — nie przesadzaj z liczbą produktów.',
  },
  oily: {
    name: 'tłusta',
    headline: 'Skóra produkuje dużo sebum',
    advice: 'Lżejsze konsystencje: żele i fluidy, a w składzie niacynamid albo cynk.',
  },
  combination: {
    name: 'mieszana',
    headline: 'Strefa T się błyszczy, policzki w normie',
    advice: 'Lekkie żele na całą twarz, bogatszy krem tylko tam, gdzie skóra go potrzebuje.',
  },
};

export const barrierCopy: Record<1 | 2 | 3, string> = {
  1: 'Dobra',
  2: 'Osłabiona',
  3: 'Nadwerężona',
};

export const sensitivityCopy = [
  'Odporna',
  'Raczej odporna',
  'Lekko wrażliwa',
  'Wrażliwa',
  'Bardzo wrażliwa',
] as const;
