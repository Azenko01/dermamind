import type { PrismaClient } from '../../apps/api/src/generated/prisma/client';
import type { Catalog } from './build';

export interface ImportCounts {
  removedIngredients: number;
  brands: number;
  products: number;
  ingredients: number;
  aliases: number;
  productIngredients: number;
  effects: number;
  groupMembers: number;
}

const GROUP_FLAGS = {
  fragrance: 'isFragrance',
  drying_alcohol: 'isAlcoholDrying',
  fungal_acne: 'isFungalAcneTrigger',
  parabens: 'isParaben',
  sulfates: 'isSulfate',
  silicones: 'isSilicone',
  eu_allergens: 'isEuAllergen',
} as const;

/** Applies the catalogue with upserts keyed by natural keys, so running it twice changes nothing. */
export async function writeCatalog(prisma: PrismaClient, catalog: Catalog): Promise<ImportCounts> {
  return prisma.$transaction(
    async (tx) => {
      // ingredients + aliases
      const ingredientId = new Map<string, number>();
      let aliases = 0;
      for (const ing of catalog.ingredients.values()) {
        const e = ing.entry;
        const data = {
          displayName: ing.display,
          functions: e?.functions ?? [],
          comedogenic: e?.comedogenic ?? null,
          irritationRisk: e?.irritationRisk ?? null,
          isFragrance: e?.isFragrance ?? false,
          isAlcoholDrying: e?.isAlcoholDrying ?? false,
          isFungalAcneTrigger: e?.isFungalAcneTrigger ?? false,
          isEuAllergen: e?.isEuAllergen ?? false,
          isParaben: e?.isParaben ?? false,
          isSulfate: e?.isSulfate ?? false,
          isSilicone: e?.isSilicone ?? false,
          isOil: e?.isOil ?? false,
          isAnimalDerived: e?.isAnimalDerived ?? false,
          isReefHarmful: e?.isReefHarmful ?? false,
        };
        const row = await tx.ingredient.upsert({
          where: { inciName: ing.inci },
          create: { inciName: ing.inci, ...data },
          update: data,
        });
        ingredientId.set(ing.inci, row.id);
        for (const alias of ing.aliases) {
          await tx.ingredientAlias.upsert({
            where: { alias },
            create: { alias, ingredientId: row.id },
            update: { ingredientId: row.id },
          });
          aliases++;
        }
      }
      const id = (inci: string) => {
        const v = ingredientId.get(inci);
        if (v === undefined) throw new Error(`No id for ${inci}`);
        return v;
      };

      // avoid groups, rebuilt from the flags every time
      const groups = await tx.ingredientGroup.findMany();
      await tx.ingredientGroupMember.deleteMany({});
      let groupMembers = 0;
      for (const group of groups) {
        const flag = GROUP_FLAGS[group.code as keyof typeof GROUP_FLAGS];
        if (!flag) continue;
        const members = [...catalog.ingredients.values()].filter((i) => i.entry?.[flag]);
        await tx.ingredientGroupMember.createMany({
          data: members.map((m) => ({ groupId: group.id, ingredientId: id(m.inci) })),
        });
        groupMembers += members.length;
      }

      // effects
      const concerns = new Map((await tx.skinConcern.findMany()).map((c) => [c.code, c.id]));
      for (const e of catalog.effects) {
        const concernId = concerns.get(e.concern);
        if (concernId === undefined) throw new Error(`Unknown concern ${e.concern}`);
        await tx.ingredientEffect.upsert({
          where: { ingredientId_concernId: { ingredientId: id(e.inci), concernId } },
          create: { ingredientId: id(e.inci), concernId, effect: e.effect, evidence: e.evidence },
          update: { effect: e.effect, evidence: e.evidence },
        });
      }

      // brands + products + their ingredient lists
      const brandIds = new Map<string, number>();
      for (const name of new Set(catalog.products.map((p) => p.brand))) {
        const b = await tx.brand.upsert({ where: { name }, create: { name }, update: {} });
        brandIds.set(name, b.id);
      }
      let productIngredients = 0;
      for (const p of catalog.products) {
        const data = {
          name: p.name,
          brandId: brandIds.get(p.brand)!,
          category: p.category as never,
          pricePln: p.pricePln,
          source: 'hebe',
          inciRaw: p.inciRaw,
          inciComplete: p.inciComplete,
        };
        const row = await tx.product.upsert({
          where: { sourceUrl: p.sourceUrl },
          create: { sourceUrl: p.sourceUrl, ...data },
          update: data,
        });
        await tx.productIngredient.deleteMany({ where: { productId: row.id } });
        await tx.productIngredient.createMany({
          data: p.ingredients.map((i) => ({
            productId: row.id,
            ingredientId: id(i.inci),
            position: i.position,
          })),
        });
        productIngredients += p.ingredients.length;
      }

      // Ingredients from earlier imports that are gone from the catalogue (e.g. a name the parser
      // used to split wrongly) — only if nothing points at them, so users' avoid lists stay intact.
      const stale = await tx.ingredient.deleteMany({
        where: {
          inciName: { notIn: [...catalog.ingredients.keys()] },
          products: { none: {} },
          avoidedBy: { none: {} },
        },
      });

      return {
        removedIngredients: stale.count,
        brands: brandIds.size,
        products: catalog.products.length,
        ingredients: catalog.ingredients.size,
        aliases,
        productIngredients,
        effects: catalog.effects.length,
        groupMembers,
      };
    },
    { timeout: 120_000 },
  );
}
