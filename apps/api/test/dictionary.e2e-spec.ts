import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, registerUser, resetDb, sampleQuiz } from './helpers';

async function seed(prisma: PrismaService) {
  const breakouts = await prisma.skinConcern.findUniqueOrThrow({ where: { code: 'breakouts' } });
  const aqua = await prisma.ingredient.create({
    data: {
      inciName: 'AQUA',
      displayName: 'Aqua',
      aliases: { create: [{ alias: 'aqua' }, { alias: 'water' }] },
    },
  });
  const niacinamide = await prisma.ingredient.create({
    data: {
      inciName: 'NIACINAMIDE',
      displayName: 'Niacinamide',
      functions: ['skin_conditioning'],
      aliases: { create: [{ alias: 'niacinamide' }] },
      effects: { create: { concernId: breakouts.id, effect: 2 } },
    },
  });
  // reference row from the OBF taxonomy: no alias, only its canonical name
  const titanium = await prisma.ingredient.create({
    data: {
      inciName: 'CI 77891',
      displayName: 'CI 77891',
      source: 'obf_taxonomy',
      cosingRef: '32661',
      casNumbers: ['13463-67-7'],
      cosingFunctions: ['cosmetic-colorant'],
      annexRefs: ['IV/143'],
    },
  });
  const make = (name: string, category: 'serum' | 'oral_care', barcode: string) =>
    prisma.product.create({
      data: {
        name,
        category,
        barcode,
        source: 'obf',
        inciComplete: true,
        ingredients: {
          create: [
            { ingredientId: aqua.id, position: 1 },
            { ingredientId: niacinamide.id, position: 2 },
          ],
        },
      },
    });
  const serum = await make('Glow serum', 'serum', '5901234123457');
  const paste = await make('Glow toothpaste', 'oral_care', '4006381333931');
  return { niacinamide, titanium, serum, paste };
}

describe('ingredient dictionary, normaliser and categories (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let s: Awaited<ReturnType<typeof seed>>;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => ({ app, prisma } = await createTestApp()));
  beforeEach(async () => {
    await resetDb(prisma);
    s = await seed(prisma);
  });
  afterAll(() => app.close());

  it('D3: cleans the list, matches "A / B" names and marks a corrected typo as fuzzy', async () => {
    const user = await registerUser(app);
    await http()
      .put('/v1/me/quiz')
      .set(auth(user.accessToken))
      .send({ ...sampleQuiz, concerns: ['breakouts'] })
      .expect(200);
    const res = await http()
      .post('/v1/analyze/inci')
      .set(auth(user.accessToken))
      .send({ inci: 'Ingrédients : Aqua &amp; Water, Niacinamde 5%, CL 77891 / Titanium Dioxide.' })
      .expect(200);
    const rows = res.body.ingredients as {
      input: string;
      ingredient: { inciName: string; fuzzyFrom: string | null } | null;
    }[];
    expect(
      rows.map((r) => [r.input, r.ingredient?.inciName ?? null, r.ingredient?.fuzzyFrom ?? null]),
    ).toEqual([
      ['AQUA & WATER', null, null],
      ['NIACINAMDE', 'NIACINAMIDE', 'NIACINAMDE'],
      ['CL 77891 / TITANIUM DIOXIDE', 'CI 77891', null],
    ]);
    expect(res.body.match.confidence).toMatchObject({ fuzzyMatches: 1 });
  });

  it('ingredient card shows CosIng reference data and only face-care products', async () => {
    const card = await http().get(`/v1/ingredients/${s.titanium.id}`).expect(200);
    expect(card.body).toMatchObject({
      source: 'obf_taxonomy',
      cosingRef: '32661',
      casNumbers: ['13463-67-7'],
      annexRefs: ['IV/143'],
      isProhibited: false,
    });
    const nia = await http().get(`/v1/ingredients/${s.niacinamide.id}`).expect(200);
    expect(nia.body.products.map((p: { name: string }) => p.name)).toEqual(['Glow serum']);
  });

  it('search finds non-skincare products but lists face care first', async () => {
    const res = await http().get('/v1/products').query({ q: 'glow', sort: 'name' }).expect(200);
    expect(res.body.items.map((p: { category: string }) => p.category)).toEqual(
      expect.arrayContaining(['serum', 'oral_care']),
    );
  });

  it('a non-skincare product cannot be put in a routine', async () => {
    const user = await registerUser(app);
    const res = await http()
      .put('/v1/me/routines')
      .set(auth(user.accessToken))
      .send({ am: [{ step: 'moisturize', productId: s.paste.id }], pm: [] })
      .expect(400);
    expect(res.body.message).toMatch(/oral_care product does not fit/);
  });
});
