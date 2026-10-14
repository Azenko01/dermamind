import {
  aliasKey,
  computeMatchScore,
  type MatchIngredient,
  type MatchProfile,
  type MatchResult,
} from '@dermamind/scoring';
import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** What a product must be loaded with to be scored and shown. */
export const scorableProductInclude = {
  brand: true,
  ingredients: {
    orderBy: { position: 'asc' },
    include: {
      ingredient: {
        include: {
          effects: { include: { concern: true } },
          groups: { include: { group: true } },
        },
      },
    },
  },
} satisfies Prisma.ProductInclude;

export type ScorableProduct = Prisma.ProductGetPayload<{ include: typeof scorableProductInclude }>;
type LoadedIngredient = ScorableProduct['ingredients'][number]['ingredient'];

export function hasMetadata(i: LoadedIngredient): boolean {
  return (
    i.functions.length > 0 ||
    i.comedogenic !== null ||
    i.irritationRisk !== null ||
    i.isFragrance ||
    i.isAlcoholDrying ||
    i.isFungalAcneTrigger ||
    i.isEuAllergen ||
    i.isParaben ||
    i.isSulfate ||
    i.isSilicone ||
    i.isOil ||
    i.isAnimalDerived ||
    i.isReefHarmful
  );
}

/** Bridges the database and the pure algorithm in @dermamind/scoring (PLAN.md 2.1, 4). */
@Injectable()
export class ScoringService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The user's profile in the shape the algorithm needs, or null before the quiz. Avoided
   * ingredients are matched by name every time, so names typed in the quiz before an ingredient
   * was imported still count once it is in the catalogue.
   */
  async profileFor(userId: string | undefined): Promise<MatchProfile | null> {
    if (!userId) return null;
    const p = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        concerns: { include: { concern: true } },
        avoidedGroups: { include: { group: true } },
        avoidedIngredients: true,
      },
    });
    if (!p?.skinType) return null;

    const names = (
      (p.quizAnswers as { avoidIngredients?: string[] } | null)?.avoidIngredients ?? []
    ).filter((n) => typeof n === 'string');
    const byName = names.length
      ? await this.prisma.ingredient.findMany({
          where: {
            OR: [
              { inciName: { in: names } },
              { aliases: { some: { alias: { in: names.map(aliasKey) } } } },
            ],
          },
          select: { id: true },
        })
      : [];

    return {
      skinType: p.skinType,
      isSensitive: p.isSensitive,
      barrierLevel: p.barrierLevel,
      concerns: p.concerns.map((c) => ({ code: c.concern.code, priority: c.priority })),
      avoidedIngredientIds: new Set([
        ...p.avoidedIngredients.map((a) => a.ingredientId),
        ...byName.map((i) => i.id),
      ]),
      avoidedGroups: new Set(p.avoidedGroups.map((g) => g.group.code)),
    };
  }

  score(profile: MatchProfile, product: ScorableProduct): MatchResult {
    return computeMatchScore(profile, {
      inciComplete: product.inciComplete,
      ingredients: product.ingredients.map(({ position, ingredient: i }): MatchIngredient => ({
        id: i.id,
        name: i.displayName,
        position,
        comedogenic: i.comedogenic,
        irritationRisk: i.irritationRisk,
        isFragrance: i.isFragrance,
        isAlcoholDrying: i.isAlcoholDrying,
        groups: i.groups.map((g) => g.group.code),
        effects: i.effects.map((e) => ({ concern: e.concern.code, effect: e.effect })),
        hasMetadata: hasMetadata(i),
      })),
    });
  }
}
