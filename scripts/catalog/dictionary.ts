/**
 * Ingredient dictionary for the import: canonical INCI name, aliases (common English and Polish
 * names, Sa.Sha's spellings), functions and flags for "Co jest w środku" / avoid groups.
 *
 * Rules for adding data here:
 * - flags only where the INCI name itself decides it (an EU allergen, a paraben, a silicone…);
 * - comedogenic ratings (0–5) only where the commonly cited tables based on Fulton (1989) agree,
 *   irritation risk only for well-known irritants;
 * - anything unsure stays empty — the Match Score marks missing data as low confidence.
 * Everything here is to be reviewed by a cosmetologist before the defence (PLAN.md 4.5).
 */
import { EXTRA_DICTIONARY } from './dictionary-extra';

export type IngredientFunction =
  | 'solvent'
  | 'humectant'
  | 'emollient'
  | 'occlusive'
  | 'skin_conditioning'
  | 'soothing'
  | 'exfoliant'
  | 'antioxidant'
  | 'fragrance'
  | 'preservative'
  | 'surfactant'
  | 'ph_adjuster'
  | 'uv_filter'
  | 'emulsifier'
  | 'sebum_regulating'
  | 'thickener'
  | 'chelating'
  | 'colorant'
  | 'film_forming'
  | 'absorbent'
  | 'brightening'
  | 'peptide'
  | 'probiotic'
  | 'plant_extract';

export interface DictionaryEntry {
  inci: string;
  display: string;
  aliases?: string[];
  functions?: IngredientFunction[];
  comedogenic?: number;
  irritationRisk?: number;
  isFragrance?: boolean;
  isAlcoholDrying?: boolean;
  isFungalAcneTrigger?: boolean;
  isEuAllergen?: boolean;
  isParaben?: boolean;
  isSulfate?: boolean;
  isSilicone?: boolean;
  isOil?: boolean;
  isAnimalDerived?: boolean;
  isReefHarmful?: boolean;
}

const BASE: DictionaryEntry[] = [
  // ─── Sa.Sha's 27 ingredients (data/final_db.sql) ───
  {
    inci: 'AQUA',
    display: 'Aqua (woda)',
    aliases: ['Water', 'Woda', 'Aqua/Water', 'Eau'],
    functions: ['solvent'],
  },
  {
    inci: 'GLYCERIN',
    display: 'Glycerin',
    aliases: ['Gliceryna', 'Glycerol'],
    functions: ['humectant'],
    comedogenic: 0,
  },
  {
    inci: 'NIACINAMIDE',
    display: 'Niacinamide',
    aliases: ['Niacynamid', 'Witamina B3', 'Vitamin B3'],
    functions: ['skin_conditioning', 'sebum_regulating'],
  },
  {
    inci: 'SALICYLIC ACID',
    display: 'Salicylic Acid',
    aliases: ['Kwas salicylowy', 'BHA'],
    functions: ['exfoliant'],
    irritationRisk: 1,
  },
  {
    inci: 'SODIUM HYALURONATE',
    display: 'Sodium Hyaluronate',
    aliases: ['Hialuronian sodu'],
    functions: ['humectant'],
  },
  {
    inci: 'PANTHENOL',
    display: 'Panthenol',
    aliases: ['Pantenol', 'D-Panthenol', 'Prowitamina B5', 'Provitamin B5'],
    functions: ['humectant', 'soothing'],
  },
  {
    inci: 'CITRIC ACID',
    display: 'Citric Acid',
    aliases: ['Kwas cytrynowy'],
    functions: ['ph_adjuster'],
  },
  {
    inci: 'ZINC PCA',
    display: 'Zinc PCA',
    aliases: ['PCA cynku'],
    functions: ['sebum_regulating', 'humectant'],
  },
  { inci: 'ALLANTOIN', display: 'Allantoin', aliases: ['Alantoina'], functions: ['soothing'] },
  {
    inci: 'CENTELLA ASIATICA EXTRACT',
    display: 'Centella Asiatica Extract',
    aliases: ['Wąkrota azjatycka', 'Cica', 'Centella'],
    functions: ['soothing', 'skin_conditioning'],
  },
  {
    inci: 'CERAMIDE NP',
    display: 'Ceramide NP',
    aliases: ['Ceramide 3', 'Ceramid NP'],
    functions: ['skin_conditioning'],
  },
  {
    inci: 'SQUALANE',
    display: 'Squalane',
    aliases: ['Skwalan'],
    functions: ['emollient'],
    comedogenic: 1,
  },
  {
    inci: 'BUTYROSPERMUM PARKII BUTTER',
    display: 'Shea Butter',
    aliases: [
      'Shea Butter',
      'Masło shea',
      'Butyrospermum Parkii (Shea) Butter',
      'Vitellaria Paradoxa Butter',
    ],
    functions: ['emollient', 'occlusive'],
  },
  {
    inci: 'GLYCOLIC ACID',
    display: 'Glycolic Acid',
    aliases: ['Kwas glikolowy', 'AHA'],
    functions: ['exfoliant'],
    irritationRisk: 2,
  },
  {
    inci: 'ALOE BARBADENSIS LEAF JUICE',
    display: 'Aloe Vera',
    aliases: ['Aloe Vera', 'Aloes', 'Sok z aloesu', 'Aloe Barbadensis (Aloe Vera) Leaf Juice'],
    functions: ['soothing', 'humectant'],
  },
  { inci: 'BETAINE', display: 'Betaine', aliases: ['Betaina'], functions: ['humectant'] },
  {
    inci: 'TOCOPHEROL',
    display: 'Tocopherol',
    aliases: ['Witamina E', 'Vitamin E', 'Tokoferol'],
    functions: ['antioxidant'],
  },
  {
    inci: 'PARFUM',
    display: 'Parfum',
    aliases: [
      'Fragrance',
      'Perfume',
      'Aroma',
      'Zapach',
      'Kompozycja zapachowa',
      'Parfum (Fragrance)',
    ],
    functions: ['fragrance'],
    isFragrance: true,
    irritationRisk: 2,
  },
  {
    inci: 'HYALURONIC ACID',
    display: 'Hyaluronic Acid',
    aliases: ['Kwas hialuronowy'],
    functions: ['humectant'],
  },
  {
    inci: 'LACTIC ACID',
    display: 'Lactic Acid',
    aliases: ['Kwas mlekowy'],
    functions: ['exfoliant', 'humectant'],
    irritationRisk: 1,
  },
  { inci: 'TREHALOSE', display: 'Trehalose', aliases: ['Trehaloza'], functions: ['humectant'] },
  {
    inci: 'CERAMIDE AP',
    display: 'Ceramide AP',
    aliases: ['Ceramide 6-II', 'Ceramid AP'],
    functions: ['skin_conditioning'],
  },
  {
    inci: 'CERAMIDE EOP',
    display: 'Ceramide EOP',
    aliases: ['Ceramide 1', 'Ceramid EOP'],
    functions: ['skin_conditioning'],
  },
  {
    inci: 'PHYTOSPHINGOSINE',
    display: 'Phytosphingosine',
    aliases: ['Fitosfingozyna'],
    functions: ['skin_conditioning'],
  },
  {
    inci: 'CHOLESTEROL',
    display: 'Cholesterol',
    aliases: ['Cholesterol'],
    functions: ['emollient'],
  },
  {
    inci: 'CAPRYLIC/CAPRIC TRIGLYCERIDE',
    display: 'Caprylic/Capric Triglyceride',
    functions: ['emollient'],
  },
  {
    inci: 'PROPANEDIOL',
    display: 'Propanediol',
    aliases: ['1,3-Propanediol'],
    functions: ['solvent', 'humectant'],
  },

  // ─── "Często unikane" from the quiz (O16) ───
  {
    inci: 'ALCOHOL DENAT.',
    display: 'Alcohol Denat.',
    aliases: ['Alcohol Denat', 'Denatured Alcohol', 'Alkohol denaturowany', 'SD Alcohol'],
    functions: ['solvent'],
    isAlcoholDrying: true,
    irritationRisk: 2,
  },
  {
    inci: 'METHYLISOTHIAZOLINONE',
    display: 'Methylisothiazolinone',
    aliases: ['MIT', 'MI'],
    functions: ['preservative'],
    irritationRisk: 3,
  },
  {
    inci: 'SODIUM LAURYL SULFATE',
    display: 'Sodium Lauryl Sulfate',
    aliases: ['SLS', 'Laurylosiarczan sodu'],
    functions: ['surfactant'],
    isSulfate: true,
    irritationRisk: 2,
  },
  {
    inci: 'COCOS NUCIFERA OIL',
    display: 'Coconut Oil',
    aliases: ['Coconut Oil', 'Olej kokosowy', 'Cocos Nucifera (Coconut) Oil'],
    functions: ['emollient'],
    isOil: true,
    comedogenic: 4,
    isFungalAcneTrigger: true,
  },
  {
    inci: 'LANOLIN',
    display: 'Lanolin',
    aliases: ['Lanolina'],
    functions: ['emollient', 'occlusive'],
    isAnimalDerived: true,
  },
  {
    inci: 'RETINOL',
    display: 'Retinol',
    aliases: ['Witamina A', 'Vitamin A'],
    functions: ['skin_conditioning'],
    irritationRisk: 2,
  },

  // ─── drying alcohols ───
  {
    inci: 'ALCOHOL',
    display: 'Alcohol (etanol)',
    aliases: ['Ethanol', 'Etanol', 'Ethyl Alcohol'],
    functions: ['solvent'],
    isAlcoholDrying: true,
    irritationRisk: 2,
  },
  {
    inci: 'ISOPROPYL ALCOHOL',
    display: 'Isopropyl Alcohol',
    aliases: ['Alkohol izopropylowy', 'Isopropanol'],
    functions: ['solvent'],
    isAlcoholDrying: true,
    irritationRisk: 2,
  },

  // ─── preservatives ───
  {
    inci: 'METHYLCHLOROISOTHIAZOLINONE',
    display: 'Methylchloroisothiazolinone',
    aliases: ['MCI'],
    functions: ['preservative'],
    irritationRisk: 3,
  },
  {
    inci: 'METHYLPARABEN',
    display: 'Methylparaben',
    aliases: ['Metyloparaben'],
    functions: ['preservative'],
    isParaben: true,
  },
  {
    inci: 'ETHYLPARABEN',
    display: 'Ethylparaben',
    aliases: ['Etyloparaben'],
    functions: ['preservative'],
    isParaben: true,
  },
  {
    inci: 'PROPYLPARABEN',
    display: 'Propylparaben',
    aliases: ['Propyloparaben'],
    functions: ['preservative'],
    isParaben: true,
  },
  {
    inci: 'BUTYLPARABEN',
    display: 'Butylparaben',
    aliases: ['Butyloparaben'],
    functions: ['preservative'],
    isParaben: true,
  },
  {
    inci: 'PHENOXYETHANOL',
    display: 'Phenoxyethanol',
    aliases: ['Fenoksyetanol'],
    functions: ['preservative'],
  },

  // ─── sulfates ───
  {
    inci: 'SODIUM LAURETH SULFATE',
    display: 'Sodium Laureth Sulfate',
    aliases: ['SLES', 'Laurethsiarczan sodu'],
    functions: ['surfactant'],
    isSulfate: true,
    irritationRisk: 1,
  },
  {
    inci: 'AMMONIUM LAURYL SULFATE',
    display: 'Ammonium Lauryl Sulfate',
    aliases: ['ALS'],
    functions: ['surfactant'],
    isSulfate: true,
    irritationRisk: 2,
  },
  {
    inci: 'SODIUM COCO-SULFATE',
    display: 'Sodium Coco-Sulfate',
    functions: ['surfactant'],
    isSulfate: true,
    irritationRisk: 1,
  },

  // ─── silicones ───
  {
    inci: 'DIMETHICONE',
    display: 'Dimethicone',
    aliases: ['Dimetykon'],
    functions: ['emollient', 'occlusive'],
    isSilicone: true,
  },
  {
    inci: 'CYCLOPENTASILOXANE',
    display: 'Cyclopentasiloxane',
    aliases: ['D5'],
    functions: ['emollient'],
    isSilicone: true,
  },
  {
    inci: 'CYCLOHEXASILOXANE',
    display: 'Cyclohexasiloxane',
    aliases: ['D6'],
    functions: ['emollient'],
    isSilicone: true,
  },
  { inci: 'DIMETHICONOL', display: 'Dimethiconol', functions: ['emollient'], isSilicone: true },
  { inci: 'AMODIMETHICONE', display: 'Amodimethicone', functions: ['emollient'], isSilicone: true },
  {
    inci: 'PHENYL TRIMETHICONE',
    display: 'Phenyl Trimethicone',
    functions: ['emollient'],
    isSilicone: true,
  },

  // ─── oils ───
  {
    inci: 'OLEA EUROPAEA FRUIT OIL',
    display: 'Olive Oil',
    aliases: ['Olive Oil', 'Oliwa z oliwek', 'Olej z oliwek'],
    functions: ['emollient'],
    isOil: true,
    isFungalAcneTrigger: true,
  },
  {
    inci: 'ARGANIA SPINOSA KERNEL OIL',
    display: 'Argan Oil',
    aliases: ['Argan Oil', 'Olej arganowy'],
    functions: ['emollient'],
    isOil: true,
  },
  {
    inci: 'HELIANTHUS ANNUUS SEED OIL',
    display: 'Sunflower Seed Oil',
    aliases: ['Sunflower Oil', 'Olej słonecznikowy'],
    functions: ['emollient'],
    isOil: true,
  },
  {
    inci: 'PRUNUS AMYGDALUS DULCIS OIL',
    display: 'Sweet Almond Oil',
    aliases: ['Sweet Almond Oil', 'Olej ze słodkich migdałów'],
    functions: ['emollient'],
    isOil: true,
  },
  {
    inci: 'SIMMONDSIA CHINENSIS SEED OIL',
    display: 'Jojoba Oil',
    aliases: ['Jojoba Oil', 'Olej jojoba'],
    functions: ['emollient'],
    isOil: true,
  },
  {
    inci: 'RICINUS COMMUNIS SEED OIL',
    display: 'Castor Oil',
    aliases: ['Castor Oil', 'Olej rycynowy'],
    functions: ['emollient'],
    isOil: true,
  },
  {
    inci: 'ROSA CANINA FRUIT OIL',
    display: 'Rosehip Oil',
    aliases: ['Rosehip Oil', 'Olej z dzikiej róży'],
    functions: ['emollient'],
    isOil: true,
  },
  {
    inci: 'PARAFFINUM LIQUIDUM',
    display: 'Paraffinum Liquidum',
    aliases: ['Mineral Oil', 'Olej mineralny', 'Parafina ciekła'],
    functions: ['emollient', 'occlusive'],
    isOil: true,
  },

  // ─── esters, fatty acids, polysorbates often listed as Malassezia triggers ───
  {
    inci: 'ISOPROPYL MYRISTATE',
    display: 'Isopropyl Myristate',
    aliases: ['IPM'],
    functions: ['emollient'],
    comedogenic: 5,
    isFungalAcneTrigger: true,
  },
  {
    inci: 'ISOPROPYL PALMITATE',
    display: 'Isopropyl Palmitate',
    aliases: ['IPP'],
    functions: ['emollient'],
    comedogenic: 4,
    isFungalAcneTrigger: true,
  },
  {
    inci: 'MYRISTYL MYRISTATE',
    display: 'Myristyl Myristate',
    functions: ['emollient'],
    comedogenic: 5,
    isFungalAcneTrigger: true,
  },
  {
    inci: 'LAURIC ACID',
    display: 'Lauric Acid',
    aliases: ['Kwas laurynowy'],
    functions: ['surfactant'],
    comedogenic: 4,
    isFungalAcneTrigger: true,
  },
  {
    inci: 'MYRISTIC ACID',
    display: 'Myristic Acid',
    functions: ['surfactant'],
    isFungalAcneTrigger: true,
  },
  {
    inci: 'PALMITIC ACID',
    display: 'Palmitic Acid',
    functions: ['emollient'],
    isFungalAcneTrigger: true,
  },
  {
    inci: 'STEARIC ACID',
    display: 'Stearic Acid',
    aliases: ['Kwas stearynowy'],
    functions: ['emulsifier'],
    isFungalAcneTrigger: true,
  },
  {
    inci: 'OLEIC ACID',
    display: 'Oleic Acid',
    aliases: ['Kwas oleinowy'],
    functions: ['emollient'],
    isFungalAcneTrigger: true,
  },
  {
    inci: 'GLYCERYL STEARATE',
    display: 'Glyceryl Stearate',
    functions: ['emulsifier'],
    isFungalAcneTrigger: true,
  },
  {
    inci: 'POLYSORBATE 20',
    display: 'Polysorbate 20',
    functions: ['emulsifier'],
    isFungalAcneTrigger: true,
  },
  {
    inci: 'POLYSORBATE 60',
    display: 'Polysorbate 60',
    functions: ['emulsifier'],
    isFungalAcneTrigger: true,
  },
  {
    inci: 'POLYSORBATE 80',
    display: 'Polysorbate 80',
    functions: ['emulsifier'],
    isFungalAcneTrigger: true,
  },

  // ─── animal-derived ───
  {
    inci: 'CERA ALBA',
    display: 'Beeswax',
    aliases: ['Beeswax', 'Wosk pszczeli'],
    functions: ['emollient', 'occlusive'],
    isAnimalDerived: true,
    comedogenic: 2,
  },
  {
    inci: 'MEL',
    display: 'Honey',
    aliases: ['Honey', 'Miód'],
    functions: ['humectant'],
    isAnimalDerived: true,
  },
  { inci: 'CI 75470', display: 'Carmine', aliases: ['Carmine', 'Karmin'], isAnimalDerived: true },
  {
    inci: 'SNAIL SECRETION FILTRATE',
    display: 'Snail Secretion Filtrate',
    aliases: ['Śluz ślimaka', 'Snail Mucin'],
    functions: ['skin_conditioning'],
    isAnimalDerived: true,
  },
  {
    inci: 'HYDROLYZED COLLAGEN',
    display: 'Hydrolyzed Collagen',
    aliases: ['Kolagen', 'Collagen'],
    functions: ['humectant'],
    isAnimalDerived: true,
  },

  // ─── UV filters considered harmful to reefs ───
  {
    inci: 'BENZOPHENONE-3',
    display: 'Oxybenzone',
    aliases: ['Oxybenzone', 'Oksybenzon'],
    functions: ['uv_filter'],
    isReefHarmful: true,
  },
  {
    inci: 'ETHYLHEXYL METHOXYCINNAMATE',
    display: 'Octinoxate',
    aliases: ['Octinoxate', 'Octyl Methoxycinnamate'],
    functions: ['uv_filter'],
    isReefHarmful: true,
  },
];

/** The 26 fragrance allergens that must be named on EU labels (Regulation 1223/2009, Annex III). */
const EU_ALLERGENS: [string, string, string[]?][] = [
  ['AMYL CINNAMAL', 'Amyl Cinnamal'],
  ['AMYLCINNAMYL ALCOHOL', 'Amylcinnamyl Alcohol'],
  ['ANISE ALCOHOL', 'Anise Alcohol', ['Anisyl Alcohol']],
  ['BENZYL ALCOHOL', 'Benzyl Alcohol', ['Alkohol benzylowy']],
  ['BENZYL BENZOATE', 'Benzyl Benzoate'],
  ['BENZYL CINNAMATE', 'Benzyl Cinnamate'],
  ['BENZYL SALICYLATE', 'Benzyl Salicylate'],
  ['CINNAMAL', 'Cinnamal'],
  ['CINNAMYL ALCOHOL', 'Cinnamyl Alcohol'],
  ['CITRAL', 'Citral'],
  ['CITRONELLOL', 'Citronellol'],
  ['COUMARIN', 'Coumarin', ['Kumaryna']],
  ['EUGENOL', 'Eugenol'],
  ['FARNESOL', 'Farnesol'],
  ['GERANIOL', 'Geraniol'],
  ['HEXYL CINNAMAL', 'Hexyl Cinnamal'],
  ['HYDROXYCITRONELLAL', 'Hydroxycitronellal'],
  [
    'HYDROXYISOHEXYL 3-CYCLOHEXENE CARBOXALDEHYDE',
    'Hydroxyisohexyl 3-Cyclohexene Carboxaldehyde',
    ['Lyral'],
  ],
  ['ISOEUGENOL', 'Isoeugenol'],
  ['BUTYLPHENYL METHYLPROPIONAL', 'Butylphenyl Methylpropional', ['Lilial']],
  ['LIMONENE', 'Limonene', ['Limonen', 'D-Limonene']],
  ['LINALOOL', 'Linalool'],
  ['METHYL 2-OCTYNOATE', 'Methyl 2-Octynoate'],
  ['ALPHA-ISOMETHYL IONONE', 'Alpha-Isomethyl Ionone'],
  ['EVERNIA PRUNASTRI EXTRACT', 'Evernia Prunastri Extract', ['Oakmoss Extract']],
  ['EVERNIA FURFURACEA EXTRACT', 'Evernia Furfuracea Extract', ['Treemoss Extract']],
];

export const DICTIONARY: DictionaryEntry[] = [
  ...BASE,
  ...EXTRA_DICTIONARY,
  ...EU_ALLERGENS.map(([inci, display, aliases]) => ({
    inci,
    display,
    aliases,
    functions: ['fragrance'] as IngredientFunction[],
    isEuAllergen: true,
    irritationRisk: 1,
  })),
];

/** Sa.Sha's skin_problems → our skin_concerns codes. */
export const PROBLEM_TO_CONCERN: Record<string, string> = {
  acne: 'breakouts',
  oily_skin: 'oiliness',
  dry_skin: 'dryness',
  sensitive_skin: 'sensitivity',
  dehydrated_skin: 'hydration',
  redness: 'redness',
  barrier_damage: 'barrier',
};

/** Sa.Sha's free-text categories → our product_category enum. */
export const CATEGORY_MAP: Record<string, string> = {
  cleanser: 'cleanser',
  micellar_water: 'cleanser',
  toner: 'toner',
  serum: 'serum',
  cream: 'moisturizer',
  spf: 'sunscreen',
  oil: 'oil',
};
