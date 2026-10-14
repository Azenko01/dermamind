import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, registerUser, resetDb, sampleQuiz } from './helpers';

/**
 * A tiny catalogue:
 *  - Calm Serum (Alpha): niacinamide helps breakouts; full INCI, nothing bad
 *  - Shea Cream (Alpha): shea butter harms breakouts; full INCI
 *  - Perfumed Toner (Beta): parfum (fragrance group); key ingredients only
 *  - Hidden (unpublished)
 */
async function seedCatalog(prisma: PrismaService) {
  const concern = (code: string) => prisma.skinConcern.findUniqueOrThrow({ where: { code } });
  const breakouts = await concern('breakouts');
  const fragrance = await prisma.ingredientGroup.findUniqueOrThrow({
    where: { code: 'fragrance' },
  });

  const aqua = await prisma.ingredient.create({
    data: { inciName: 'AQUA', displayName: 'Aqua', functions: ['solvent'] },
  });
  const niacinamide = await prisma.ingredient.create({
    data: {
      inciName: 'NIACINAMIDE',
      displayName: 'Niacinamide',
      functions: ['skin_conditioning'],
      effects: { create: { concernId: breakouts.id, effect: 2 } },
    },
  });
  const shea = await prisma.ingredient.create({
    data: {
      inciName: 'BUTYROSPERMUM PARKII BUTTER',
      displayName: 'Shea Butter',
      functions: ['emollient'],
      aliases: { create: [{ alias: 'masłoshea' }, { alias: 'sheabutter' }] },
      effects: { create: { concernId: breakouts.id, effect: -1 } },
    },
  });
  const parfum = await prisma.ingredient.create({
    data: {
      inciName: 'PARFUM',
      displayName: 'Parfum',
      functions: ['fragrance'],
      isFragrance: true,
      irritationRisk: 2,
      groups: { create: { groupId: fragrance.id } },
    },
  });

  const alpha = await prisma.brand.create({ data: { name: 'Alpha', crueltyFree: true } });
  const beta = await prisma.brand.create({ data: { name: 'Beta' } });
  const product = (data: {
    name: string;
    brandId: number;
    category: 'serum' | 'moisturizer' | 'toner';
    price: number;
    complete: boolean;
    published?: boolean;
    ingredients: number[];
  }) =>
    prisma.product.create({
      data: {
        name: data.name,
        brandId: data.brandId,
        category: data.category,
        pricePln: data.price,
        inciComplete: data.complete,
        isPublished: data.published ?? true,
        ingredients: {
          create: data.ingredients.map((ingredientId, i) => ({ ingredientId, position: i + 1 })),
        },
      },
    });

  const serum = await product({
    name: 'Calm Serum',
    brandId: alpha.id,
    category: 'serum',
    price: 40,
    complete: true,
    ingredients: [aqua.id, niacinamide.id],
  });
  const cream = await product({
    name: 'Shea Cream',
    brandId: alpha.id,
    category: 'moisturizer',
    price: 25,
    complete: true,
    ingredients: [aqua.id, shea.id],
  });
  const toner = await product({
    name: 'Perfumed Toner',
    brandId: beta.id,
    category: 'toner',
    price: 30,
    complete: false,
    ingredients: [aqua.id, parfum.id],
  });
  const hidden = await product({
    name: 'Hidden Serum',
    brandId: beta.id,
    category: 'serum',
    price: 10,
    complete: true,
    published: false,
    ingredients: [aqua.id],
  });
  return { serum, cream, toner, hidden, shea, parfum };
}

describe('catalog (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let seed: Awaited<ReturnType<typeof seedCatalog>>;
  const http = () => request(app.getHttpServer());
  const names = (body: { items: { name: string }[] }) => body.items.map((i) => i.name);

  beforeAll(async () => ({ app, prisma } = await createTestApp()));
  beforeEach(async () => {
    await resetDb(prisma);
    seed = await seedCatalog(prisma);
  });
  afterAll(() => app.close());

  /** breakouts first, avoids fragrance, sensitive skin */
  const quizUser = async (overrides: Partial<typeof sampleQuiz> = {}) => {
    const user = await registerUser(app);
    await http()
      .put('/v1/me/quiz')
      .set(auth(user.accessToken))
      .send({
        ...sampleQuiz,
        concerns: ['breakouts'],
        avoidGroups: ['fragrance'],
        avoidIngredients: [],
        ...overrides,
      })
      .expect(200);
    return user;
  };

  describe('GET /v1/products', () => {
    it('is public: without a token there is no score and the list is sorted by name', async () => {
      const res = await http().get('/v1/products').expect(200);
      expect(names(res.body)).toEqual(['Calm Serum', 'Perfumed Toner', 'Shea Cream']);
      expect(res.body).toMatchObject({ total: 3, page: 1, pageSize: 20 });
      expect(res.body.items[0]).toMatchObject({
        brand: 'Alpha',
        category: 'serum',
        pricePln: 40,
        match: null,
      });
    });

    it('filters by category and searches name, brand and Polish category words', async () => {
      expect(names((await http().get('/v1/products?category=serum').expect(200)).body)).toEqual([
        'Calm Serum',
      ]);
      expect(names((await http().get('/v1/products?q=calm').expect(200)).body)).toEqual([
        'Calm Serum',
      ]);
      expect(names((await http().get('/v1/products?q=beta').expect(200)).body)).toEqual([
        'Perfumed Toner',
      ]);
      expect(names((await http().get('/v1/products?q=alpha%20cre').expect(200)).body)).toEqual([
        'Shea Cream',
      ]);
      expect(names((await http().get('/v1/products?q=tonik').expect(200)).body)).toEqual([
        'Perfumed Toner',
      ]);
      expect((await http().get('/v1/products?q=zzz').expect(200)).body.total).toBe(0);
    });

    it('sorts by price and paginates', async () => {
      const res = await http().get('/v1/products?sort=price_asc&pageSize=2&page=2').expect(200);
      expect(names(res.body)).toEqual(['Calm Serum']);
      expect(res.body.total).toBe(3);
    });

    it('validates the query', async () => {
      await http().get('/v1/products?category=lipstick').expect(400);
      await http().get('/v1/products?pageSize=500').expect(400);
      await http().get('/v1/products?sort=random').expect(400);
    });

    it('with a skin profile: scores every product and sorts best first', async () => {
      const user = await quizUser();
      const res = await http().get('/v1/products').set(auth(user.accessToken)).expect(200);
      expect(names(res.body)).toEqual(['Calm Serum', 'Shea Cream', 'Perfumed Toner']);
      const [serum, cream, toner] = res.body.items;
      // 50 + 10 × (niacinamide +2 × position 1.0 × main concern 1.0)
      expect(serum.match).toMatchObject({
        score: 70,
        status: 'ok',
        label: 'good',
        lowConfidence: false,
      });
      expect(serum.match.score).toBeGreaterThan(cream.match.score);
      expect(toner.match).toMatchObject({ status: 'excluded', lowConfidence: true });
      expect(toner.match.score).toBeLessThanOrEqual(40);
    });

    it('excludes avoided ingredients typed in Polish, even if imported after the quiz', async () => {
      // shea butter is not in the catalogue yet when the user takes the quiz
      await prisma.productIngredient.deleteMany({ where: { ingredientId: seed.shea.id } });
      await prisma.ingredient.delete({ where: { id: seed.shea.id } });
      const user = await quizUser({ avoidGroups: [], avoidIngredients: ['Masło shea'] });

      // the import adds shea butter later
      const shea = await prisma.ingredient.create({
        data: {
          inciName: 'BUTYROSPERMUM PARKII BUTTER',
          displayName: 'Shea Butter',
          aliases: { create: { alias: 'masłoshea' } },
        },
      });
      await prisma.productIngredient.create({
        data: { productId: seed.cream.id, ingredientId: shea.id, position: 2 },
      });

      const res = await http().get('/v1/products?q=shea').set(auth(user.accessToken)).expect(200);
      expect(res.body.items[0].match).toMatchObject({ status: 'excluded' });
    });

    it('a user who has not done the quiz gets no score', async () => {
      const user = await registerUser(app);
      const res = await http().get('/v1/products').set(auth(user.accessToken)).expect(200);
      expect(res.body.items.every((i: { match: unknown }) => i.match === null)).toBe(true);
    });

    it('never lists unpublished products', async () => {
      const res = await http().get('/v1/products?q=hidden').expect(200);
      expect(res.body.total).toBe(0);
    });
  });

  describe('GET /v1/products/:id', () => {
    it('returns ingredients in INCI order, flags and the full match with reasons', async () => {
      const user = await quizUser();
      const res = await http()
        .get(`/v1/products/${seed.serum.id}`)
        .set(auth(user.accessToken))
        .expect(200);
      expect(res.body).toMatchObject({ name: 'Calm Serum', brand: 'Alpha', inciComplete: true });
      expect(
        res.body.ingredients.map((i: { inciName: string; position: number; rating: string }) => [
          i.inciName,
          i.position,
          i.rating,
        ]),
      ).toEqual([
        ['AQUA', 1, 'neutral'],
        ['NIACINAMIDE', 2, 'good'],
      ]);
      expect(res.body.flags).toMatchObject({
        fragrance_free: true,
        vegan: true,
        cruelty_free: true,
      });
      expect(res.body.match.pros[0]).toMatchObject({
        ingredient: 'Niacinamide',
        concern: 'breakouts',
      });
      expect(res.body.match.excludedBy).toEqual([]);
    });

    it('with an incomplete INCI only certain flags are given, the rest is unknown', async () => {
      const res = await http().get(`/v1/products/${seed.toner.id}`).expect(200);
      expect(res.body.flags).toMatchObject({
        fragrance_free: false,
        silicone_free: null,
        cruelty_free: null,
      });
      expect(res.body.match).toBeNull();
      expect(res.body.ingredients[1]).toMatchObject({
        inciName: 'PARFUM',
        rating: null,
        isFragrance: true,
      });
    });

    it('explains an exclusion', async () => {
      const user = await quizUser();
      const res = await http()
        .get(`/v1/products/${seed.toner.id}`)
        .set(auth(user.accessToken))
        .expect(200);
      expect(res.body.match.excludedBy).toEqual([
        { ingredientId: seed.parfum.id, ingredient: 'Parfum', group: 'fragrance' },
      ]);
      expect(res.body.ingredients[1].rating).toBe('bad');
    });

    it('404 for unknown or unpublished products, 400 for a bad id', async () => {
      await http().get('/v1/products/999999').expect(404);
      await http().get(`/v1/products/${seed.hidden.id}`).expect(404);
      await http().get('/v1/products/abc').expect(400);
    });
  });
});
