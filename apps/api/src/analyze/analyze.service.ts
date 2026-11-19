import {
  computeMatchScore,
  inciLookupKeys,
  normalizeInciName,
  productFlags,
  fuzzyResolve,
  resolveInci,
  inciNameCandidates,
  splitInci,
  type MatchIngredient,
} from '@dermamind/scoring';
import { BadRequestException, Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { toIngredientRow, toMatchDetail } from '../catalog/catalog.service';
import { InciIndexService } from '../catalog/inci-index.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ScoringService,
  scorableIngredientInclude,
  toMatchIngredient,
  type ScorableIngredient,
} from '../scoring/scoring.service';
import type { AnalyzeResultDto } from './analyze.dto';

const MAX_NAMES = 300;
/** share of unknown names above which the AI parser is tried */
const AI_PARSE_THRESHOLD = 0.3;

type Row = {
  position: number;
  input: string;
  ingredient: ScorableIngredient | null;
  match: 'exact' | 'fuzzy' | null;
};

const dedupe = (names: string[]) => {
  const seen = new Set<string>();
  return names.filter((n) => n && !seen.has(n) && seen.add(n));
};

/**
 * D3 "Analizuj skład": the same parser, alias matching and Match Score as the catalogue, for a
 * pasted list. Nothing is stored — the text may be anything the user copied.
 */
@Injectable()
export class AnalyzeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
    private readonly ai: AiService,
    private readonly inciIndex: InciIndexService,
  ) {}

  async analyzeInci(text: string, userId?: string): Promise<AnalyzeResultDto> {
    const names = dedupe(splitInci(text));
    if (names.length === 0) throw new BadRequestException('No ingredients found in the text');
    if (names.length > MAX_NAMES)
      throw new BadRequestException(`More than ${MAX_NAMES} ingredients`);

    const profilePromise = this.scoring.profileFor(userId);
    let rows = await this.match(names);
    let parsedBy: 'rules' | 'ai' = 'rules';

    // ai-parse-inci (PLAN.md 5): only when the rules leave many names unknown, only for signed-in
    // users (daily limit), and only kept if it really recognises more.
    const unknownBefore = rows.filter((r) => !r.ingredient).length;
    if (userId && this.ai.available && unknownBefore / rows.length > AI_PARSE_THRESHOLD) {
      const aiNames = await this.ai.parseInci(text, userId);
      if (aiNames) {
        const aiRows = await this.match(dedupe(aiNames.map(normalizeInciName)).slice(0, MAX_NAMES));
        if (aiRows.filter((r) => !r.ingredient).length < unknownBefore) {
          rows = aiRows;
          parsedBy = 'ai';
        }
      }
    }
    const profile = await profilePromise;
    const unknown = rows.filter((r) => !r.ingredient).map((r) => r.input);

    const matchIngredients: MatchIngredient[] = rows.map((r, i) =>
      r.ingredient
        ? { ...toMatchIngredient(r.position, r.ingredient), fuzzy: r.match === 'fuzzy' }
        : {
            id: -(i + 1), // never collides with a real id, so it can't be "avoided"
            name: r.input,
            position: r.position,
            comedogenic: null,
            irritationRisk: null,
            isFragrance: false,
            isAlcoholDrying: false,
            groups: [],
            effects: [],
            hasMetadata: false,
          },
    );
    // The pasted list is the whole list; unknown names lower the confidence through unknownShare.
    const match = profile
      ? computeMatchScore(profile, { inciComplete: true, ingredients: matchIngredients })
      : null;
    const rating = new Map(match?.ingredients.map((i) => [i.ingredientId, i.rating]));
    const known = rows.flatMap((r) => (r.ingredient ? [r.ingredient] : []));

    return {
      ingredients: rows.map((r) => ({
        position: r.position,
        input: r.input,
        ingredient: r.ingredient
          ? toIngredientRow(
              r.position,
              r.ingredient,
              rating.get(r.ingredient.id) ?? null,
              r.match === 'fuzzy' ? r.input : null,
            )
          : null,
      })),
      unknown,
      // an unknown name could be anything, so "free of X" is only certain when all are known
      flags: productFlags(known, unknown.length === 0, null),
      match: match ? toMatchDetail(match) : null,
      parsedBy,
    };
  }

  /** Name → ingredient by INCI name or alias; a second name for the same ingredient is dropped. */
  private async match(names: string[]): Promise<Row[]> {
    const all = inciNameCandidates(names);
    const allKeys = [...new Set(all.flatMap(inciLookupKeys))];
    const [aliases, direct, fuzzyIds] = await Promise.all([
      this.prisma.ingredientAlias.findMany({
        where: { alias: { in: allKeys } },
        include: { ingredient: { include: scorableIngredientInclude } },
      }),
      this.prisma.ingredient.findMany({
        where: { inciName: { in: all } },
        include: scorableIngredientInclude,
      }),
      this.inciIndex.fuzzy(),
    ]);
    const byInci = new Map(direct.map((i) => [i.inciName, i]));
    const byAlias = new Map<string, ScorableIngredient>(
      aliases.map((a) => [a.alias, a.ingredient]),
    );

    // exact pass first; names still unknown get one typo-tolerant pass on the in-memory index
    const exact = resolveInci(names, { byInci, byAlias });
    const unknown = exact.filter((r) => !r.ingredient).map((r) => r.input);
    if (!unknown.length) return exact;
    const idByName = new Map(
      unknown.flatMap((n) => {
        const hit = fuzzyResolve(n, fuzzyIds);
        return hit ? [[n, hit.id] as const] : [];
      }),
    );
    if (!idByName.size) return exact;
    const full = new Map(
      (
        await this.prisma.ingredient.findMany({
          where: { id: { in: [...new Set(idByName.values())] } },
          include: scorableIngredientInclude,
        })
      ).map((i) => [i.id, i]),
    );
    const fuzzyByName = new Map(
      [...idByName].flatMap(([n, id]) => (full.has(id) ? [[n, full.get(id)!] as const] : [])),
    );
    return resolveInci(names, { byInci, byAlias, fuzzyByName });
  }
}
