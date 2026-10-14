import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { AiRequest, AiResponse, AiTransport } from '../src/ai/ai-transport';
import { PrismaService } from '../src/prisma/prisma.service';
import { RULES_SUMMARY } from '../src/routines/routines.service';
import { auth, createTestApp, resetDb, sampleQuiz, type Tokens } from './helpers';

function reply(input: unknown): AiResponse {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'test-model',
    stop_reason: 'tool_use',
    stop_sequence: null,
    content: [{ type: 'tool_use', id: 'toolu_1', name: 'save_routine', input }],
    usage: { input_tokens: 1, output_tokens: 1 },
  } as unknown as AiResponse;
}

/**
 * Catalogue for routines. Everyone helps breakouts (+2 at position 1 → 70); the retinol serum and
 * the glycolic toner conflict (same time of day).
 */
async function seed(prisma: PrismaService) {
  const breakouts = await prisma.skinConcern.findUniqueOrThrow({ where: { code: 'breakouts' } });
  const helper = await prisma.ingredient.create({
    data: {
      inciName: 'NIACINAMIDE',
      displayName: 'Niacinamide',
      functions: ['skin_conditioning'],
      effects: { create: { concernId: breakouts.id, effect: 2 } },
    },
  });
  const retinol = await prisma.ingredient.create({
    data: { inciName: 'RETINOL', displayName: 'Retinol', functions: ['skin_conditioning'] },
  });
  const glycolic = await prisma.ingredient.create({
    data: { inciName: 'GLYCOLIC ACID', displayName: 'Glycolic Acid', functions: ['exfoliant'] },
  });
  await prisma.ingredientConflict.create({
    data: {
      aId: Math.min(retinol.id, glycolic.id),
      bId: Math.max(retinol.id, glycolic.id),
      severity: 2,
      noteKey: 'retinoid_exfoliant',
    },
  });
  const brand = await prisma.brand.create({ data: { name: 'Alpha' } });
  const make = (name: string, category: string, extra: number[] = [], helps = true) =>
    prisma.product.create({
      data: {
        name,
        brandId: brand.id,
        category: category as never,
        inciComplete: true,
        ingredients: {
          create: [
            ...(helps ? [{ ingredientId: helper.id, position: 1 }] : []),
            ...extra.map((ingredientId, i) => ({ ingredientId, position: i + 2 })),
          ],
        },
      },
    });
  return {
    cleanser: await make('Gentle Cleanser', 'cleanser'),
    toner: await make('Glycolic Toner', 'toner', [glycolic.id]),
    serum: await make('Retinol Serum', 'serum', [retinol.id]),
    plainSerum: await make('Plain Serum', 'serum', [], false), // 50 — still a candidate
    cream: await make('Daily Cream', 'moisturizer'),
    spf: await make('Sun Fluid', 'sunscreen'),
  };
}

describe('routines, shelves, today (e2e)', () => {
  const create = jest.fn<Promise<AiResponse>, [AiRequest]>();
  let app: INestApplication<App>;
  let noAiApp: INestApplication<App>;
  let prisma: PrismaService;
  let p: Awaited<ReturnType<typeof seed>>;
  let user: Tokens;
  const http = () => request(app.getHttpServer());
  const as = (req: request.Test) => req.set(auth(user.accessToken));

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp({ create } satisfies AiTransport));
    ({ app: noAiApp } = await createTestApp(null));
  });
  beforeEach(async () => {
    create.mockReset();
    await resetDb(prisma);
    p = await seed(prisma);
    user = (
      await http()
        .post('/v1/auth/register')
        .send({ email: 'ola@example.com', password: 'correct-horse-1' })
        .expect(201)
    ).body as Tokens;
    await as(http().put('/v1/me/quiz'))
      .send({
        ...sampleQuiz,
        reactionFrequency: 'never',
        triggers: [],
        concerns: ['breakouts'],
        avoidGroups: [],
        avoidIngredients: [],
      })
      .expect(200);
  });
  afterAll(async () => {
    await app.close();
    await noAiApp.close();
  });

  const steps = (
    body: { am: { steps: { step: string; product: { id: number } | null }[] } },
    time: 'am' | 'pm' = 'am',
  ) =>
    (
      body as unknown as Record<
        string,
        { steps: { step: string; product: { id: number } | null }[] }
      >
    )[time]!.steps.map((s) => [s.step, s.product?.id ?? null]);

  describe('GET/PUT /v1/me/routines', () => {
    it('starts empty with every slot listed and no score', async () => {
      const res = await as(http().get('/v1/me/routines')).expect(200);
      expect(steps(res.body)).toEqual([
        ['cleanse', null],
        ['tone', null],
        ['treat', null],
        ['moisturize', null],
        ['protect', null],
      ]);
      expect(res.body.pm.steps).toHaveLength(4);
      expect(res.body.score).toMatchObject({ score: null, productCount: 0, conflicts: [] });
      expect(res.body.disclaimer).toContain('dermatolog');
    });

    it('saves steps, scores the routine: average − 10 per conflict − 10 without morning SPF', async () => {
      const res = await as(http().put('/v1/me/routines'))
        .send({
          am: [
            { step: 'cleanse', productId: p.cleanser.id },
            { step: 'moisturize', productId: p.cream.id },
          ],
          pm: [
            { step: 'tone', productId: p.toner.id },
            { step: 'treat', productId: p.serum.id },
          ],
        })
        .expect(200);
      expect(steps(res.body)).toEqual([
        ['cleanse', p.cleanser.id],
        ['tone', null],
        ['treat', null],
        ['moisturize', p.cream.id],
        ['protect', null],
      ]);
      expect(res.body.am.steps[0].product.match.score).toBe(70);
      // all four products score 70; one conflict in the evening; no SPF in the morning
      expect(res.body.score).toMatchObject({
        score: 50,
        averageProductScore: 70,
        missingSpf: true,
        productCount: 4,
      });
      expect(res.body.score.conflicts).toEqual([
        expect.objectContaining({
          time: 'pm',
          severity: 2,
          noteKey: 'retinoid_exfoliant',
          a: { productId: p.toner.id, productName: 'Glycolic Toner', ingredient: 'Glycolic Acid' },
          b: { productId: p.serum.id, productName: 'Retinol Serum', ingredient: 'Retinol' },
        }),
      ]);
    });

    it('rejects steps outside the routine, duplicates and products that do not fit the step', async () => {
      const put = (body: object) =>
        as(http().put('/v1/me/routines')).send({ am: [], pm: [], ...body });
      await put({ pm: [{ step: 'protect', productId: p.spf.id }] }).expect(400);
      await put({
        am: [
          { step: 'cleanse', productId: p.cleanser.id },
          { step: 'cleanse', productId: null },
        ],
      }).expect(400);
      await put({ am: [{ step: 'cleanse', productId: p.cream.id }] }).expect(400);
      await put({ am: [{ step: 'cleanse', productId: 999999 }] }).expect(400);
      await put({ am: [{ step: 'scrub', productId: p.cleanser.id }] }).expect(400);
      await http().get('/v1/me/routines').expect(401);
    });
  });

  describe('POST /v1/me/routines/generate', () => {
    it('without AI: best candidate per step that avoids conflicts, fixed Polish text', async () => {
      const res = await request(noAiApp.getHttpServer())
        .post('/v1/me/routines/generate')
        .set(auth(user.accessToken))
        .send({})
        .expect(200);
      expect(res.body).toMatchObject({
        generatedBy: 'rules',
        fallbackReason: 'not_configured',
        emptySteps: [],
      });
      expect(res.body.am.summary).toBe(RULES_SUMMARY);
      const pm = Object.fromEntries(steps(res.body, 'pm'));
      expect(pm.tone).toBe(p.toner.id);
      // the retinol serum (70) would conflict with the toner → the plain serum (50) is used
      expect(pm.treat).toBe(p.plainSerum.id);
      expect(res.body.score.conflicts).toEqual([]);
      expect(res.body.score.missingSpf).toBe(false);
      expect(res.body.disclaimer).toContain('dermatolog');
      expect(JSON.stringify(res.body)).not.toContain('undefined');
    });

    it('uses a valid AI pick and its explanation', async () => {
      const summary =
        'Rano oczyszczanie, tonik, serum, krem i filtr. Wieczorem bez filtra; tonik z kwasem i retinol trzymamy osobno.';
      create.mockResolvedValueOnce(
        reply({
          am: [
            { step: 'cleanse', productId: p.cleanser.id },
            { step: 'tone', productId: p.toner.id },
            { step: 'treat', productId: p.plainSerum.id },
            { step: 'moisturize', productId: p.cream.id },
            { step: 'protect', productId: p.spf.id },
          ],
          pm: [
            { step: 'cleanse', productId: p.cleanser.id },
            { step: 'tone', productId: p.toner.id },
            { step: 'treat', productId: p.plainSerum.id },
            { step: 'moisturize', productId: p.cream.id },
          ],
          summary,
        }),
      );
      const res = await as(http().post('/v1/me/routines/generate')).send({}).expect(200);
      expect(res.body).toMatchObject({ generatedBy: 'ai', fallbackReason: null });
      expect(res.body.am.summary).toBe(summary);
      expect(res.body.am.generatedBy).toBe('ai');

      const params = create.mock.calls[0]![0];
      expect(params.model).toBe('test-smart-model');
      expect(JSON.stringify(params)).not.toContain('ola@example.com');
      expect(JSON.stringify(params)).not.toContain(user.user.id);
      expect(String(params.messages[0]!.content)).toContain('Retinol');
    });

    it.each([
      [
        'a product outside the candidates',
        (ids: { cream: number }) => ({ step: 'treat', productId: ids.cream }),
      ],
      ['a conflicting pair', (ids: { serum: number }) => ({ step: 'treat', productId: ids.serum })],
    ])('rejects %s and falls back to the rules', async (_, treat) => {
      create.mockResolvedValueOnce(
        reply({
          am: [],
          pm: [
            { step: 'cleanse', productId: p.cleanser.id },
            { step: 'tone', productId: p.toner.id },
            treat({ cream: p.cream.id, serum: p.serum.id }),
            { step: 'moisturize', productId: p.cream.id },
          ],
          summary: 'Wieczorna rutyna z tonikiem i serum, a na koniec krem nawilżający.',
        }),
      );
      const res = await as(http().post('/v1/me/routines/generate'))
        .send({ times: ['pm'] })
        .expect(200);
      expect(res.body).toMatchObject({ generatedBy: 'rules', fallbackReason: 'invalid_pick' });
      expect(res.body.pm.summary).toBe(RULES_SUMMARY);
      expect(Object.fromEntries(steps(res.body, 'pm')).treat).toBe(p.plainSerum.id);
      // the morning was not asked for and stays untouched (empty)
      expect(res.body.am.steps.every((s: { product: unknown }) => s.product === null)).toBe(true);
    });

    it('skips excluded products and products on the "Unikam" shelf; reports empty steps', async () => {
      await as(http().post('/v1/me/shelves/avoid/items')).send({ productId: p.spf.id }).expect(204);
      const res = await request(noAiApp.getHttpServer())
        .post('/v1/me/routines/generate')
        .set(auth(user.accessToken))
        .send({ times: ['am'] })
        .expect(200);
      expect(res.body.emptySteps).toEqual(['am:protect']);
      expect(res.body.score.missingSpf).toBe(true);
    });

    it('needs a skin profile', async () => {
      const other = (
        await http()
          .post('/v1/auth/register')
          .send({ email: 'b@example.com', password: 'correct-horse-1' })
          .expect(201)
      ).body as Tokens;
      await http()
        .post('/v1/me/routines/generate')
        .set(auth(other.accessToken))
        .send({})
        .expect(409);
    });

    it('a manual change afterwards clears the generated mark', async () => {
      await request(noAiApp.getHttpServer())
        .post('/v1/me/routines/generate')
        .set(auth(user.accessToken))
        .send({})
        .expect(200);
      const res = await as(http().put('/v1/me/routines'))
        .send({ am: [{ step: 'cleanse', productId: p.cleanser.id }], pm: [] })
        .expect(200);
      expect(res.body.am).toMatchObject({ generatedBy: null, summary: null });
    });
  });

  describe('shelves', () => {
    it('lists Mam, Lubię, Unikam; adding is idempotent; Lubię and Unikam exclude each other', async () => {
      await as(http().post('/v1/me/shelves/own/items')).send({ productId: p.cream.id }).expect(204);
      await as(http().post('/v1/me/shelves/own/items')).send({ productId: p.cream.id }).expect(204);
      await as(http().post('/v1/me/shelves/like/items'))
        .send({ productId: p.cream.id })
        .expect(204);
      let res = await as(http().get('/v1/me/shelves')).expect(200);
      expect(
        res.body.shelves.map((s: { kind: string; items: unknown[] }) => [s.kind, s.items.length]),
      ).toEqual([
        ['own', 1],
        ['like', 1],
        ['avoid', 0],
      ]);
      expect(res.body.shelves[0].items[0].product).toMatchObject({
        name: 'Daily Cream',
        match: { score: 70 },
      });

      await as(http().post('/v1/me/shelves/avoid/items'))
        .send({ productId: p.cream.id })
        .expect(204);
      res = await as(http().get('/v1/me/shelves')).expect(200);
      expect(res.body.shelves.map((s: { items: unknown[] }) => s.items.length)).toEqual([1, 0, 1]);

      await as(http().delete(`/v1/me/shelves/own/items/${p.cream.id}`)).expect(204);
      await as(http().delete(`/v1/me/shelves/own/items/${p.cream.id}`)).expect(204);
      res = await as(http().get('/v1/me/shelves')).expect(200);
      expect(res.body.shelves[0].items).toEqual([]);
    });

    it('"Unikam" makes the product excluded everywhere, and D1 knows the shelves', async () => {
      await as(http().post('/v1/me/shelves/avoid/items'))
        .send({ productId: p.cream.id })
        .expect(204);
      const detail = await as(http().get(`/v1/products/${p.cream.id}`)).expect(200);
      expect(detail.body.myShelves).toEqual(['avoid']);
      expect(detail.body.match).toMatchObject({
        status: 'excluded',
        score: 40,
        avoidedByUser: true,
      });
      const list = await as(http().get('/v1/products?q=daily')).expect(200);
      expect(list.body.items[0].match.status).toBe('excluded');
      expect((await http().get(`/v1/products/${p.cream.id}`).expect(200)).body.myShelves).toEqual(
        [],
      );
    });

    it('validates kind and product', async () => {
      await as(http().post('/v1/me/shelves/wishlist/items'))
        .send({ productId: p.cream.id })
        .expect(400);
      await as(http().post('/v1/me/shelves/own/items')).send({ productId: 999999 }).expect(404);
      await as(http().post('/v1/me/shelves/own/items')).send({}).expect(400);
    });
  });

  describe('today', () => {
    it('records mood and done steps for today, and shows the week', async () => {
      let res = await as(http().get('/v1/me/today')).expect(200);
      expect(res.body).toMatchObject({ mood: null, done: { am: [], pm: [] } });
      expect(res.body.week).toHaveLength(7);
      expect(res.body.week.map((d: { day: string }) => d.day)).toContain(res.body.day);

      await as(http().put('/v1/me/today/mood')).send({ mood: 4 }).expect(200);
      await as(http().put('/v1/me/routines'))
        .send({
          am: [
            { step: 'cleanse', productId: p.cleanser.id },
            { step: 'moisturize', productId: p.cream.id },
          ],
          pm: [],
        })
        .expect(200);
      res = await as(http().put('/v1/me/today/routine/am'))
        .send({ doneSteps: [4, 1] })
        .expect(200);
      expect(res.body).toMatchObject({ mood: 4, done: { am: [1, 4], pm: [] } });
      expect(res.body.week.find((d: { day: string }) => d.day === res.body.day).mood).toBe(4);

      res = await as(http().put('/v1/me/today/routine/am')).send({ doneSteps: [] }).expect(200);
      expect(res.body.done.am).toEqual([]);
    });

    it('validates mood, steps and the routine', async () => {
      await as(http().put('/v1/me/today/mood')).send({ mood: 6 }).expect(400);
      await as(http().put('/v1/me/today/routine/pm'))
        .send({ doneSteps: [1] })
        .expect(404);
      await as(http().put('/v1/me/routines'))
        .send({ am: [{ step: 'cleanse', productId: p.cleanser.id }], pm: [] })
        .expect(200);
      await as(http().put('/v1/me/today/routine/am'))
        .send({ doneSteps: [2] })
        .expect(400);
      await as(http().put('/v1/me/today/routine/noon')).send({ doneSteps: [] }).expect(400);
    });

    it('is deleted with the account', async () => {
      await as(http().put('/v1/me/today/mood')).send({ mood: 3 }).expect(200);
      await as(http().delete('/v1/me')).expect(204);
      expect(await prisma.skinCheckin.count()).toBe(0);
      expect(await prisma.routine.count()).toBe(0);
    });
  });
});
