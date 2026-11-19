import { ingredientForProfile, NON_SKINCARE_CATEGORIES } from '@dermamind/scoring';
import { Injectable, NotFoundException } from '@nestjs/common';
import { toListItem } from '../catalog/catalog.service';
import type { ProductCategory } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import {
  ScoringService,
  scorableIngredientInclude,
  scorableProductInclude,
  toMatchIngredient,
} from '../scoring/scoring.service';
import type { IngredientDetailDto } from './ingredients.dto';

/** D2 ingredient card: facts from the dictionary + what it means for this user. No AI text yet. */
@Injectable()
export class IngredientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
  ) {}

  async get(id: number, userId?: string): Promise<IngredientDetailDto> {
    const [i, profile] = await Promise.all([
      this.prisma.ingredient.findUnique({ where: { id }, include: scorableIngredientInclude }),
      this.scoring.profileFor(userId),
    ]);
    if (!i) throw new NotFoundException('Ingredient not found');

    const products = await this.prisma.product.findMany({
      // suggestions are face care only — no toothpaste or shampoo under "Produkty z tym składnikiem"
      where: {
        isPublished: true,
        category: { notIn: [...NON_SKINCARE_CATEGORIES] as ProductCategory[] },
        ingredients: { some: { ingredientId: id } },
      },
      include: scorableProductInclude,
      // "Aqua" is in thousands of Open Beauty Facts products: score a capped, curated-first set
      orderBy: [
        { source: 'asc' },
        { isPolishMarket: 'desc' },
        { inciComplete: 'desc' },
        { id: 'asc' },
      ],
      take: 200,
    });
    const items = products
      .map((p) => toListItem(p, profile ? this.scoring.score(profile, p) : null))
      .sort(
        (a, b) =>
          (b.match?.score ?? -1) - (a.match?.score ?? -1) || a.name.localeCompare(b.name, 'pl'),
      )
      .slice(0, 10);

    return {
      id: i.id,
      inciName: i.inciName,
      displayName: i.displayName,
      namePl: i.namePl,
      functions: i.functions,
      comedogenic: i.comedogenic,
      irritationRisk: i.irritationRisk,
      flags: {
        isFragrance: i.isFragrance,
        isAlcoholDrying: i.isAlcoholDrying,
        isFungalAcneTrigger: i.isFungalAcneTrigger,
        isEuAllergen: i.isEuAllergen,
        isParaben: i.isParaben,
        isSulfate: i.isSulfate,
        isSilicone: i.isSilicone,
        isOil: i.isOil,
        isAnimalDerived: i.isAnimalDerived,
        isReefHarmful: i.isReefHarmful,
      },
      groups: i.groups.map((g) => g.group.code),
      source: i.source,
      cosingRef: i.cosingRef,
      casNumbers: i.casNumbers,
      cosingFunctions: i.cosingFunctions,
      annexRefs: i.annexRefs,
      isProhibited: i.isProhibited,
      isRestricted: i.isRestricted,
      effects: i.effects.map((e) => ({ concern: e.concern.code, effect: e.effect })),
      forYou: profile ? ingredientForProfile(profile, toMatchIngredient(1, i)) : null,
      products: items,
    };
  }
}
