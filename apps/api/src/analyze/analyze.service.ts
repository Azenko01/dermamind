import {
  computeMatchScore,
  inciLookupKeys,
  productFlags,
  splitInci,
  type MatchIngredient,
} from '@dermamind/scoring';
import { BadRequestException, Injectable } from '@nestjs/common';
import { toIngredientRow, toMatchDetail } from '../catalog/catalog.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ScoringService,
  scorableIngredientInclude,
  toMatchIngredient,
  type ScorableIngredient,
} from '../scoring/scoring.service';
import type { AnalyzeResultDto } from './analyze.dto';

const MAX_NAMES = 300;

/**
 * D3 "Analizuj skład": the same parser, alias matching and Match Score as the catalogue, for a
 * pasted list. Nothing is stored — the text may be anything the user copied.
 */
@Injectable()
export class AnalyzeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
  ) {}

  async analyzeInci(text: string, userId?: string): Promise<AnalyzeResultDto> {
    const seen = new Set<string>();
    const names = splitInci(text).filter((n) => !seen.has(n) && seen.add(n));
    if (names.length === 0) throw new BadRequestException('No ingredients found in the text');
    if (names.length > MAX_NAMES)
      throw new BadRequestException(`More than ${MAX_NAMES} ingredients`);

    const keysByName = new Map(names.map((n) => [n, inciLookupKeys(n)]));
    const allKeys = [...new Set([...keysByName.values()].flat())];
    const [aliases, direct, profile] = await Promise.all([
      this.prisma.ingredientAlias.findMany({
        where: { alias: { in: allKeys } },
        include: { ingredient: { include: scorableIngredientInclude } },
      }),
      this.prisma.ingredient.findMany({
        where: { inciName: { in: names } },
        include: scorableIngredientInclude,
      }),
      this.scoring.profileFor(userId),
    ]);
    const byKey = new Map<string, ScorableIngredient>(aliases.map((a) => [a.alias, a.ingredient]));
    const byInci = new Map(direct.map((i) => [i.inciName, i]));

    // A name maps to an ingredient once; a second name for the same one (Aqua + Water) is dropped.
    const used = new Set<number>();
    const rows: { position: number; input: string; ingredient: ScorableIngredient | null }[] = [];
    for (const input of names) {
      const hit =
        byInci.get(input) ??
        keysByName
          .get(input)!
          .map((k) => byKey.get(k))
          .find(Boolean) ??
        null;
      if (hit && used.has(hit.id)) continue;
      if (hit) used.add(hit.id);
      rows.push({ position: rows.length + 1, input, ingredient: hit });
    }
    const unknown = rows.filter((r) => !r.ingredient).map((r) => r.input);

    const matchIngredients: MatchIngredient[] = rows.map((r, i) =>
      r.ingredient
        ? toMatchIngredient(r.position, r.ingredient)
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
          ? toIngredientRow(r.position, r.ingredient, rating.get(r.ingredient.id) ?? null)
          : null,
      })),
      unknown,
      // an unknown name could be anything, so "free of X" is only certain when all are known
      flags: productFlags(known, unknown.length === 0, null),
      match: match ? toMatchDetail(match) : null,
    };
  }
}
