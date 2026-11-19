/**
 * Open Beauty Facts ingredients taxonomy (openfoodfacts-server, taxonomies/beauty/
 * ingredients-cosing-obf.txt, licence ODbL). It is built from the EU CosIng inventory: one block
 * per INCI name with the CosIng reference, CAS / EC numbers, functions, annex references and
 * names in other languages. Pure parser — no I/O.
 *
 * Block format (Open Food Facts taxonomy):
 *   < en: Parent                      ← optional parents
 *   en: AQUA, water, aqua / water     ← main line: name, synonyms
 *   fr: eau, aqua / eau               ← other languages
 *   cas:en: 7732-18-5                 ← properties
 *   inci:en: AQUA
 */
import { aliasKey, normalizeInciName } from '@dermamind/scoring';
import type { IngredientFunction } from './dictionary';

export interface TaxonomyEntry {
  /** canonical INCI name (normalised, upper case) */
  inci: string;
  /** other spellings: synonyms on the main line and names in other languages */
  synonyms: string[];
  cosingRef: string | null;
  cas: string[];
  ec: string[];
  /** CosIng function codes, e.g. "skin-conditioning" */
  cosingFunctions: string[];
  /** annex references as written, e.g. "III/202" */
  restrictions: string[];
  parents: string[];
}

/** Every CosIng function code we accept (the file has a few broken lines with commas in names). */
export const COSING_FUNCTIONS = new Set([
  'abrasive',
  'absorbent',
  'anticaking',
  'anticorrosive',
  'antidandruff',
  'antifoaming',
  'antimicrobial',
  'antioxidant',
  'antiperspirant',
  'antiplaque',
  'antiseborrhoeic',
  'antistatic',
  'astringent',
  'binding',
  'bleaching',
  'buffering',
  'bulking',
  'chelating',
  'cleansing',
  'cosmetic-colorant',
  'denaturant',
  'deodorant',
  'depilatory',
  'detangling',
  'emollient',
  'emulsifying',
  'emulsion-stabilising',
  'film-forming',
  'flavouring',
  'foam-boosting',
  'foaming',
  'gel-forming',
  'hair-conditioning',
  'hair-dyeing',
  'hair-fixing',
  'hair-waving-or-straightening',
  'humectant',
  'hydrotrope',
  'keratolytic',
  'light-stabilizer',
  'masking',
  'moisturising',
  'nail-conditioning',
  'opacifying',
  'oral-care',
  'oxidising',
  'pearlescent',
  'perfuming',
  'plasticiser',
  'preservative',
  'propellant',
  'reducing',
  'refatting',
  'refreshing',
  'skin-conditioning',
  'skin-protecting',
  'smoothing',
  'solvent',
  'soothing',
  'stabilising',
  'surfactant',
  'tanning',
  'tonic',
  'uv-absorber',
  'uv-filter',
  'viscosity-controlling',
]);

/**
 * CosIng functions → the functions the app shows. Only clear one-to-one meanings; "perfuming" is
 * deliberately not mapped to "fragrance" — CosIng lists it for glycerin too, and the fragrance
 * flag must come from our curated dictionary.
 */
const FUNCTION_MAP: Partial<Record<string, IngredientFunction>> = {
  solvent: 'solvent',
  humectant: 'humectant',
  moisturising: 'humectant',
  emollient: 'emollient',
  refatting: 'emollient',
  'skin-conditioning': 'skin_conditioning',
  'skin-protecting': 'skin_conditioning',
  soothing: 'soothing',
  keratolytic: 'exfoliant',
  abrasive: 'exfoliant',
  antioxidant: 'antioxidant',
  preservative: 'preservative',
  surfactant: 'surfactant',
  cleansing: 'surfactant',
  buffering: 'ph_adjuster',
  'uv-filter': 'uv_filter',
  'uv-absorber': 'uv_filter',
  emulsifying: 'emulsifier',
  'emulsion-stabilising': 'emulsifier',
  antiseborrhoeic: 'sebum_regulating',
  'viscosity-controlling': 'thickener',
  'gel-forming': 'thickener',
  chelating: 'chelating',
  'cosmetic-colorant': 'colorant',
  flavouring: 'flavouring',
  'film-forming': 'film_forming',
  absorbent: 'absorbent',
};

export function appFunctions(cosingFunctions: readonly string[]): IngredientFunction[] {
  return [...new Set(cosingFunctions.flatMap((f) => (FUNCTION_MAP[f] ? [FUNCTION_MAP[f]] : [])))];
}

const LANG_LINE = /^([a-z]{2}):\s*(.*)$/;
const PROP_LINE = /^([a-z_-]+):([a-z]{2}):\s*(.*)$/;

const splitNames = (s: string) =>
  s
    .split(/,\s+/)
    .map((x) => x.trim())
    .filter(Boolean);

/** Parses the whole file. Category nodes (parents of other entries) are left out. */
export function parseTaxonomy(text: string): TaxonomyEntry[] {
  const raw: (TaxonomyEntry & { mainLine: string })[] = [];
  for (const block of text.split(/\n\s*\n/)) {
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
    if (!lines.length || lines[0]!.startsWith('synonyms:') || lines[0]!.startsWith('stopwords:'))
      continue;

    const parents: string[] = [];
    const props = new Map<string, string[]>();
    let main: string | null = null;
    const other: string[] = [];
    for (const line of lines) {
      if (line.startsWith('<')) {
        parents.push(line.replace(/^<\s*[a-z]{2}:\s*/, ''));
        continue;
      }
      const prop = PROP_LINE.exec(line);
      if (prop) {
        const key = `${prop[1]}:${prop[2]}`;
        props.set(key, [...(props.get(key) ?? []), prop[3]!]);
        continue;
      }
      const lang = LANG_LINE.exec(line);
      if (!lang) continue;
      if (lang[1] === 'en' && main === null) main = lang[2]!;
      else other.push(lang[2]!);
    }
    if (!main) continue;

    const cosingRef = props.get('cosing:en')?.[0]?.trim() || null;
    const explicitInci = props.get('inci:en')?.[0]?.trim() || null;
    // A CosIng name may itself contain ", " ("CINNAMOMUM CAMPHORA WOOD OIL, DECAMPHORISED"):
    // without an explicit inci: line, the whole main line of a CosIng block is the name.
    const mainNames = explicitInci || !cosingRef ? splitNames(main) : [main];
    const inci = normalizeInciName(explicitInci ?? mainNames[0]!);
    const list = (k: string) =>
      (props.get(k) ?? []).flatMap(splitNames).filter((x) => x && x !== '-');

    raw.push({
      mainLine: main,
      inci,
      synonyms: [
        ...new Set(
          [
            ...mainNames,
            ...other.flatMap(splitNames),
            ...list('inn-name:en'),
            ...list('ph-eur-name:en'),
          ]
            .map((n) => n.trim())
            .filter((n) => n && normalizeInciName(n) !== inci),
        ),
      ],
      cosingRef,
      cas: list('cas:en').filter((c) => /^\d{2,7}-\d{2}-\d$/.test(c)),
      ec: [...list('einecs:en'), ...list('elincs:en')].filter((c) => /^\d{3}-\d{3}-\d$/.test(c)),
      cosingFunctions: list('inci_functions:en')
        .map((f) => f.replace(/^en:/, ''))
        .filter((f) => COSING_FUNCTIONS.has(f)),
      restrictions: (props.get('inci_restriction:en') ?? []).map((r) => r.trim()).filter(Boolean),
      parents,
    });
  }

  // category nodes like "Colorants" are parents of other entries, not ingredients
  const parentKeys = new Set(raw.flatMap((e) => e.parents.map(aliasKey)));
  return raw
    .filter((e) => e.cosingRef || !parentKeys.has(aliasKey(e.mainLine.split(/,\s+/)[0]!)))
    .map(({ mainLine: _mainLine, ...e }) => e);
}

/**
 * Annex flags from references like "III/202", "II/416", "Annex III/I/262 - Directive …":
 * II = prohibited, III = restricted, IV colorants, V preservatives, VI UV filters.
 */
export function annexFlags(refs: readonly string[]): {
  annexRefs: string[];
  isProhibited: boolean;
  isRestricted: boolean;
} {
  const annexRefs = [
    ...new Set(
      refs.flatMap((r) => {
        const m = /\b(VI|V|IV|III|II)\s*\/\s*([0-9a-z]+)/i.exec(r.replace(/^Annex\s+/i, ''));
        return m ? [`${m[1]!.toUpperCase()}/${m[2]}`] : [];
      }),
    ),
  ];
  return {
    annexRefs,
    isProhibited: annexRefs.some((r) => r.startsWith('II/')),
    isRestricted: annexRefs.some((r) => r.startsWith('III/')),
  };
}

export function titleCaseInci(inci: string): string {
  return inci
    .toLowerCase()
    .replace(/(^|[\s/(\-[])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
    .replace(/\bCi\b/g, 'CI')
    .replace(/\bPeg\b/g, 'PEG')
    .replace(/\bPpg\b/g, 'PPG');
}
