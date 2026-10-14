import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, registerUser, resetDb, sampleQuiz } from './helpers';

const EAN = '5901234123457';
const UNKNOWN_EAN = '4006381333931';

async function seed(prisma: PrismaService) {
  const breakouts = await prisma.skinConcern.findUniqueOrThrow({ where: { code: 'breakouts' } });
  const fragrance = await prisma.ingredientGroup.findUniqueOrThrow({
    where: { code: 'fragrance' },
  });
  const aqua = await prisma.ingredient.create({
    data: {
      inciName: 'AQUA',
      displayName: 'Aqua (woda)',
      functions: ['solvent'],
      aliases: { create: [{ alias: 'aqua' }, { alias: 'water' }, { alias: 'woda' }] },
    },
  });
  const niacinamide = await prisma.ingredient.create({
    data: {
      inciName: 'NIACINAMIDE',
      displayName: 'Niacinamide',
      functions: ['skin_conditioning'],
      aliases: { create: [{ alias: 'niacinamide' }, { alias: 'niacynamid' }] },
      effects: { create: { concernId: breakouts.id, effect: 2 } },
    },
  });
  const coconut = await prisma.ingredient.create({
    data: {
      inciName: 'COCOS NUCIFERA OIL',
      displayName: 'Coconut Oil',
      functions: ['emollient'],
      isOil: true,
      comedogenic: 4,
      aliases: { create: [{ alias: 'cocosnuciferaoil' }, { alias: 'olejkokosowy' }] },
    },
  });
  const parfum = await prisma.ingredient.create({
    data: {
      inciName: 'PARFUM',
      displayName: 'Parfum',
      functions: ['fragrance'],
      isFragrance: true,
      aliases: { create: [{ alias: 'parfum' }, { alias: 'fragrance' }] },
      groups: { create: { groupId: fragrance.id } },
    },
  });
  const hexanediol = await prisma.ingredient.create({
    data: {
      inciName: '1,2-HEXANEDIOL',
      displayName: '1,2-Hexanediol',
      functions: ['solvent'],
      aliases: { create: { alias: '12hexanediol' } },
    },
  });
  const brand = await prisma.brand.create({ data: { name: 'Alpha' } });
  const product = await prisma.product.create({
    data: {
      name: 'Calm Serum',
      brandId: brand.id,
      category: 'serum',
      barcode: EAN,
      inciComplete: true,
      ingredients: {
        create: [
          { ingredientId: aqua.id, position: 1 },
          { ingredientId: niacinamide.id, position: 2 },
        ],
      },
    },
  });
  return { product, aqua, niacinamide, coconut, parfum, hexanediol };
}

describe('scanner, analysis, ingredients, submissions (e2e)', () => {
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

  /** breakouts first, sensitive, avoids fragrance and coconut oil (typed in Polish) */
  const quizUser = async (email = 'ola@example.com') => {
    const user = await registerUser(app, email);
    await http()
      .put('/v1/me/quiz')
      .set(auth(user.accessToken))
      .send({
        ...sampleQuiz,
        concerns: ['breakouts'],
        avoidGroups: ['fragrance'],
        avoidIngredients: ['Olej kokosowy'],
      })
      .expect(200);
    return user;
  };

  describe('GET /v1/products/barcode/:ean', () => {
    it('finds the product, scores it and records the scan', async () => {
      const user = await quizUser();
      const res = await http()
        .get(`/v1/products/barcode/${EAN}`)
        .set(auth(user.accessToken))
        .expect(200);
      expect(res.body).toMatchObject({
        id: s.product.id,
        name: 'Calm Serum',
        match: { status: 'ok' },
      });

      const scans = await prisma.scanHistory.findMany();
      expect(scans).toEqual([expect.objectContaining({ barcode: EAN, productId: s.product.id })]);
    });

    it('accepts spaces and records unknown codes too', async () => {
      const user = await registerUser(app);
      await http()
        .get('/v1/products/barcode/590%201234%20123457')
        .set(auth(user.accessToken))
        .expect(200);
      await http()
        .get(`/v1/products/barcode/${UNKNOWN_EAN}`)
        .set(auth(user.accessToken))
        .expect(404);
      const scans = await prisma.scanHistory.findMany({ orderBy: { id: 'asc' } });
      expect(scans.map((x) => [x.barcode, x.productId])).toEqual([
        [EAN, s.product.id],
        [UNKNOWN_EAN, null],
      ]);
    });

    it('works without an account, but keeps no history', async () => {
      await http().get(`/v1/products/barcode/${EAN}`).expect(200);
      expect(await prisma.scanHistory.count()).toBe(0);
    });

    it('rejects codes with a wrong check digit or length', async () => {
      await http().get('/v1/products/barcode/5901234123458').expect(400);
      await http().get('/v1/products/barcode/12345').expect(400);
      await http().get('/v1/products/barcode/abcdefghijklm').expect(400);
    });
  });

  describe('GET /v1/me/scans', () => {
    it('lists my scans newest first, with the product or null, only mine', async () => {
      const me = await quizUser();
      const other = await registerUser(app, 'other@example.com');
      await http().get(`/v1/products/barcode/${UNKNOWN_EAN}`).set(auth(me.accessToken)).expect(404);
      await http().get(`/v1/products/barcode/${EAN}`).set(auth(me.accessToken)).expect(200);
      await http().get(`/v1/products/barcode/${EAN}`).set(auth(other.accessToken)).expect(200);

      const res = await http().get('/v1/me/scans').set(auth(me.accessToken)).expect(200);
      expect(res.body.total).toBe(2);
      expect(res.body.items.map((i: { barcode: string }) => i.barcode)).toEqual([EAN, UNKNOWN_EAN]);
      expect(res.body.items[0].product).toMatchObject({
        name: 'Calm Serum',
        match: { status: 'ok' },
      });
      expect(res.body.items[1].product).toBeNull();

      const page2 = await http()
        .get('/v1/me/scans?pageSize=1&page=2')
        .set(auth(me.accessToken))
        .expect(200);
      expect(page2.body.items.map((i: { barcode: string }) => i.barcode)).toEqual([UNKNOWN_EAN]);
    });

    it('needs a token and is removed with the account', async () => {
      await http().get('/v1/me/scans').expect(401);
      const me = await registerUser(app);
      await http().get(`/v1/products/barcode/${EAN}`).set(auth(me.accessToken)).expect(200);
      await http().delete('/v1/me').set(auth(me.accessToken)).expect(204);
      expect(await prisma.scanHistory.count()).toBe(0);
    });
  });

  describe('POST /v1/analyze/inci', () => {
    const analyze = (inci: string, token?: string) => {
      const req = http().post('/v1/analyze/inci').send({ inci });
      return token ? req.set(auth(token)) : req;
    };

    it('parses, matches Polish/English names and aliases, and lists unknown names', async () => {
      const res = await analyze(
        'Skład: Woda, Niacynamid, Water (Aqua), 1, 2-Hexanediol, Mystery Root Extract*. *organic',
      ).expect(200);
      expect(
        res.body.ingredients.map(
          (i: { position: number; input: string; ingredient: { inciName: string } | null }) => [
            i.position,
            i.input,
            i.ingredient?.inciName ?? null,
          ],
        ),
      ).toEqual([
        [1, 'WODA', 'AQUA'],
        [2, 'NIACYNAMID', 'NIACINAMIDE'],
        // "Water (Aqua)" is the same ingredient as "Woda" — listed once
        [3, '1,2-HEXANEDIOL', '1,2-HEXANEDIOL'],
        [4, 'MYSTERY ROOT EXTRACT', null],
      ]);
      expect(res.body.unknown).toEqual(['MYSTERY ROOT EXTRACT']);
      expect(res.body.match).toBeNull();
      // with an unknown name "free of silicones" can't be claimed
      expect(res.body.flags).toMatchObject({ silicone_free: null, fragrance_free: null });
    });

    it('scores the list for the user, including exclusions typed in Polish in the quiz', async () => {
      const user = await quizUser();
      const res = await analyze(
        'Aqua, Niacinamide, Olej kokosowy, Parfum',
        user.accessToken,
      ).expect(200);
      expect(res.body.unknown).toEqual([]);
      expect(res.body.flags).toMatchObject({
        fragrance_free: false,
        oil_free: false,
        silicone_free: true,
      });
      expect(res.body.match).toMatchObject({ status: 'excluded', lowConfidence: false });
      expect(res.body.match.score).toBeLessThanOrEqual(40);
      expect(
        res.body.match.excludedBy.map((e: { ingredient: string }) => e.ingredient).sort(),
      ).toEqual(['Coconut Oil', 'Parfum']);
      const ratings = Object.fromEntries(
        res.body.ingredients.map((i: { input: string; ingredient: { rating: string } }) => [
          i.input,
          i.ingredient.rating,
        ]),
      );
      expect(ratings).toMatchObject({ NIACINAMIDE: 'good', 'OLEJ KOKOSOWY': 'bad', PARFUM: 'bad' });
    });

    it('marks a list with many unknown names as low confidence', async () => {
      const user = await quizUser();
      const res = await analyze('Aqua, Foo Extract, Bar Extract', user.accessToken).expect(200);
      expect(res.body.match.lowConfidence).toBe(true);
    });

    it('rejects empty or huge input', async () => {
      await analyze('').expect(400);
      await analyze(' , ; ').expect(400);
      await analyze(Array.from({ length: 301 }, (_, i) => `Thing ${i}`).join(', ')).expect(400);
      await http()
        .post('/v1/analyze/inci')
        .send({ inci: 'x'.repeat(10_001) })
        .expect(400);
    });

    it('does not store anything', async () => {
      const before = await prisma.ingredient.count();
      await analyze('Brand New Extract, Aqua').expect(200);
      expect(await prisma.ingredient.count()).toBe(before);
    });
  });

  describe('GET /v1/ingredients/:id', () => {
    it('returns facts, products and what it means for me', async () => {
      const user = await quizUser();
      const res = await http()
        .get(`/v1/ingredients/${s.niacinamide.id}`)
        .set(auth(user.accessToken))
        .expect(200);
      expect(res.body).toMatchObject({
        inciName: 'NIACINAMIDE',
        functions: ['skin_conditioning'],
        effects: [{ concern: 'breakouts', effect: 2 }],
        forYou: { avoided: false, helps: ['breakouts'], hurts: [], cautions: [] },
      });
      expect(res.body.products.map((p: { name: string }) => p.name)).toEqual(['Calm Serum']);
    });

    it('explains an avoided ingredient and profile cautions', async () => {
      const user = await quizUser();
      const coconut = await http()
        .get(`/v1/ingredients/${s.coconut.id}`)
        .set(auth(user.accessToken))
        .expect(200);
      expect(coconut.body.forYou).toMatchObject({ avoided: true, cautions: ['comedogenic'] });
      const parfum = await http()
        .get(`/v1/ingredients/${s.parfum.id}`)
        .set(auth(user.accessToken))
        .expect(200);
      expect(parfum.body.forYou).toMatchObject({
        avoided: true,
        avoidedGroup: 'fragrance',
        cautions: ['fragrance_sensitive'],
      });
      expect(parfum.body.flags.isFragrance).toBe(true);
    });

    it('is public (no forYou without a profile) and 404s for unknown ids', async () => {
      const res = await http().get(`/v1/ingredients/${s.aqua.id}`).expect(200);
      expect(res.body.forYou).toBeNull();
      await http().get('/v1/ingredients/999999').expect(404);
      await http().get('/v1/ingredients/abc').expect(400);
    });
  });

  describe('POST /v1/product-submissions', () => {
    it('stores a pending submission for the user', async () => {
      const user = await registerUser(app);
      const res = await http()
        .post('/v1/product-submissions')
        .set(auth(user.accessToken))
        .send({
          barcode: '4006 3813 33931',
          name: '  Krem X ',
          brand: 'Beta',
          inciRaw: 'Aqua, Glycerin',
        })
        .expect(201);
      expect(res.body).toMatchObject({ status: 'pending' });
      const row = await prisma.productSubmission.findFirstOrThrow();
      expect(row).toMatchObject({
        userId: user.user.id,
        barcode: UNKNOWN_EAN,
        name: 'Krem X',
        brand: 'Beta',
        inciRaw: 'Aqua, Glycerin',
      });
    });

    it('validates input and needs an account', async () => {
      const user = await registerUser(app);
      const post = (body: object) =>
        http().post('/v1/product-submissions').set(auth(user.accessToken)).send(body);
      await post({ name: 'Krem', barcode: '4006381333932' }).expect(400);
      await post({ barcode: UNKNOWN_EAN }).expect(400);
      await post({ name: 'K' }).expect(400);
      await post({ name: 'Krem', status: 'approved' }).expect(400);
      await post({ name: 'Krem bez kodu' }).expect(201);
      await http().post('/v1/product-submissions').send({ name: 'Krem' }).expect(401);
    });

    it('keeps the submission but forgets the author when the account is deleted', async () => {
      const user = await registerUser(app);
      await http()
        .post('/v1/product-submissions')
        .set(auth(user.accessToken))
        .send({ name: 'Krem' })
        .expect(201);
      await http().delete('/v1/me').set(auth(user.accessToken)).expect(204);
      expect(await prisma.productSubmission.findFirstOrThrow()).toMatchObject({
        userId: null,
        name: 'Krem',
      });
    });
  });
});
