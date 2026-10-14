import { ingredientForProfile } from '@dermamind/scoring';
import { Injectable, NotFoundException } from '@nestjs/common';
import { toListItem } from '../catalog/catalog.service';
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
      where: { isPublished: true, ingredients: { some: { ingredientId: id } } },
      include: scorableProductInclude,
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
      effects: i.effects.map((e) => ({ concern: e.concern.code, effect: e.effect })),
      forYou: profile ? ingredientForProfile(profile, toMatchIngredient(1, i)) : null,
      products: items,
    };
  }
}
