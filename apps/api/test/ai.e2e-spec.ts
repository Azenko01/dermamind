import Anthropic from '@anthropic-ai/sdk';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { AiRequest, AiResponse, AiTransport } from '../src/ai/ai-transport';
import { PROMPT_VERSION } from '../src/ai/prompts/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, resetDb, sampleQuiz, type Tokens } from './helpers';

/** A fake Claude answer: one tool call (or text only, or a refusal). */
function reply(
  tool: string | null,
  input: unknown = {},
  stop: AiResponse['stop_reason'] = tool ? 'tool_use' : 'end_turn',
): AiResponse {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'test-model',
    stop_reason: stop,
    stop_sequence: null,
    content: tool
      ? [{ type: 'tool_use', id: 'toolu_1', name: tool, input }]
      : [{ type: 'text', text: 'Sure, here you go.', citations: null }],
    usage: { input_tokens: 10, output_tokens: 10 },
  } as unknown as AiResponse;
}

const EXPLAIN = 'save_ingredient_explanation';
const SUMMARY = 'save_match_explanation';
const PARSE = 'save_inci_list';
const goodExplain = {
  summary: 'Niacynamid wspiera barierę skóry i pomaga regulować sebum.',
  caution: '',
};
const goodSummary = {
  summary: 'Produkt dobrze pasuje, bo zawiera niacynamid, który pomaga przy wypryskach.',
};

async function seed(prisma: PrismaService) {
  const breakouts = await prisma.skinConcern.findUniqueOrThrow({ where: { code: 'breakouts' } });
  const niacinamide = await prisma.ingredient.create({
    data: {
      inciName: 'NIACINAMIDE',
      displayName: 'Niacinamide',
      functions: ['skin_conditioning'],
      aliases: { create: { alias: 'niacinamide' } },
      effects: { create: { concernId: breakouts.id, effect: 2 } },
    },
  });
  const aqua = await prisma.ingredient.create({
    data: {
      inciName: 'AQUA',
      displayName: 'Aqua',
      functions: ['solvent'],
      aliases: { create: { alias: 'aqua' } },
    },
  });
  const brand = await prisma.brand.create({ data: { name: 'Alpha' } });
  const product = await prisma.product.create({
    data: {
      name: 'Calm Serum',
      brandId: brand.id,
      category: 'serum',
      inciComplete: true,
      ingredients: {
        create: [
          { ingredientId: aqua.id, position: 1 },
          { ingredientId: niacinamide.id, position: 2 },
        ],
      },
    },
  });
  return { niacinamide, aqua, product };
}

describe('ai (e2e, mocked Claude)', () => {
  const create = jest.fn<Promise<AiResponse>, [AiRequest]>();
  const transport: AiTransport = { create };
  let app: INestApplication<App>;
  let noKeyApp: INestApplication<App>;
  let prisma: PrismaService;
  let s: Awaited<ReturnType<typeof seed>>;
  let user: Tokens;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp(transport));
    ({ app: noKeyApp } = await createTestApp(null));
  });
  beforeEach(async () => {
    create.mockReset();
    await resetDb(prisma);
    s = await seed(prisma);
    const res = await http()
      .post('/v1/auth/register')
      .send({ email: 'ola@example.com', password: 'correct-horse-1', displayName: 'Ola Kowalska' })
      .expect(201);
    user = res.body as Tokens;
    await http()
      .put('/v1/me/quiz')
      .set(auth(user.accessToken))
      .send({ ...sampleQuiz, concerns: ['breakouts'], avoidGroups: [], avoidIngredients: [] })
      .expect(200);
  });
  afterAll(async () => {
    await app.close();
    await noKeyApp.close();
  });

  const explain = (id = s.niacinamide.id, lang = 'pl') =>
    http().get(`/v1/ai/ingredients/${id}/explain?lang=${lang}`).set(auth(user.accessToken));
  const summary = (id = s.product.id) =>
    http().get(`/v1/ai/products/${id}/summary`).set(auth(user.accessToken));

  describe('without an API key', () => {
    it('answers with the fixed Polish text, the app keeps working', async () => {
      const res = await request(noKeyApp.getHttpServer())
        .get(`/v1/ai/ingredients/${s.niacinamide.id}/explain`)
        .set(auth(user.accessToken))
        .expect(200);
      expect(res.body).toMatchObject({
        source: 'fallback',
        fallbackReason: 'not_configured',
        promptVersion: PROMPT_VERSION,
      });
      expect(res.body.text).toContain('chwilowo niedostępny');

      const sum = await request(noKeyApp.getHttpServer())
        .get(`/v1/ai/products/${s.product.id}/summary`)
        .set(auth(user.accessToken))
        .expect(200);
      expect(sum.body.source).toBe('fallback');
    });
  });

  describe('ai-ingredient-explain', () => {
    it('calls the fast model with a strict tool and no user data, then serves it from the cache', async () => {
      create.mockResolvedValueOnce(reply(EXPLAIN, goodExplain));
      const first = await explain().expect(200);
      expect(first.body).toMatchObject({ source: 'ai', text: goodExplain.summary, caution: null });

      const second = await explain().expect(200);
      expect(second.body).toMatchObject({ source: 'cache', text: goodExplain.summary });
      expect(create).toHaveBeenCalledTimes(1);

      const params = create.mock.calls[0]![0];
      expect(params.model).toBe('test-fast-model');
      expect(params.tool_choice).toEqual({ type: 'auto' });
      expect(params.tools?.[0]).toMatchObject({ name: EXPLAIN, strict: true });
      expect(String(params.system)).toMatch(/no diagnoses/i);
      expect(JSON.stringify(params.messages)).toContain('NIACINAMIDE');
      expect(JSON.stringify(params)).not.toMatch(/ola@example\.com|Kowalska|Ola/);
      expect(JSON.stringify(params)).not.toContain(user.user.id);

      // cache is per ingredient × language and shared between users
      expect(await prisma.aiCache.count()).toBe(1);
      create.mockResolvedValueOnce(
        reply(EXPLAIN, { ...goodExplain, summary: 'Niacinamide supports the skin barrier.' }),
      );
      expect((await explain(s.niacinamide.id, 'en').expect(200)).body.source).toBe('ai');
      expect(create).toHaveBeenCalledTimes(2);
      expect(String(create.mock.calls[1]![0].system)).toContain('Write in English');
    });

    it('retries once when the answer is missing or invalid', async () => {
      create.mockResolvedValueOnce(reply(null)).mockResolvedValueOnce(reply(EXPLAIN, goodExplain));
      expect((await explain().expect(200)).body.source).toBe('ai');
      expect(create).toHaveBeenCalledTimes(2);
    });

    it('falls back after two bad answers and caches nothing', async () => {
      create
        .mockResolvedValueOnce(reply(EXPLAIN, { summary: 'za krótko', caution: '' }))
        .mockResolvedValueOnce(reply(EXPLAIN, { summary: 42 }));
      const res = await explain().expect(200);
      expect(res.body).toMatchObject({ source: 'fallback', fallbackReason: 'error' });
      expect(create).toHaveBeenCalledTimes(2);
      expect(await prisma.aiCache.count()).toBe(0);
    });

    it('does not retry a refusal', async () => {
      create.mockResolvedValueOnce(reply(null, {}, 'refusal'));
      expect((await explain().expect(200)).body).toMatchObject({
        source: 'fallback',
        fallbackReason: 'refused',
      });
      expect(create).toHaveBeenCalledTimes(1);
    });

    it('retries a server error, but not a bad request', async () => {
      create
        .mockRejectedValueOnce(new Anthropic.InternalServerError(500, {}, 'boom', new Headers()))
        .mockResolvedValueOnce(reply(EXPLAIN, goodExplain));
      expect((await explain().expect(200)).body.source).toBe('ai');

      await prisma.aiCache.deleteMany();
      create
        .mockReset()
        .mockRejectedValueOnce(new Anthropic.BadRequestError(400, {}, 'bad', new Headers()));
      expect((await explain().expect(200)).body.fallbackReason).toBe('error');
      expect(create).toHaveBeenCalledTimes(1);
    });

    it('no credit (400) gives the fallback, caches nothing, and works right after a top-up', async () => {
      const noCredit = new Anthropic.BadRequestError(
        400,
        {
          type: 'error',
          error: {
            type: 'invalid_request_error',
            message: 'Your credit balance is too low to access the Anthropic API.',
          },
        },
        'credit balance too low',
        new Headers(),
      );
      create.mockRejectedValueOnce(noCredit);
      expect((await explain().expect(200)).body).toMatchObject({
        source: 'fallback',
        fallbackReason: 'error',
      });
      expect(await prisma.aiCache.count()).toBe(0);

      create.mockResolvedValueOnce(reply(EXPLAIN, goodExplain));
      expect((await explain().expect(200)).body).toMatchObject({
        source: 'ai',
        text: goodExplain.summary,
      });
      expect(create).toHaveBeenCalledTimes(2);
    });

    it('404 for an unknown ingredient, 401 without a token, 400 for a bad language', async () => {
      await explain(999999).expect(404);
      await http().get(`/v1/ai/ingredients/${s.niacinamide.id}/explain`).expect(401);
      await explain(s.niacinamide.id, 'de').expect(400);
    });
  });

  describe('daily limit', () => {
    it('stops calling Claude after 30 calls a day, but still serves the cache', async () => {
      create.mockResolvedValueOnce(reply(EXPLAIN, goodExplain));
      await explain().expect(200);
      expect(await prisma.aiUsage.findFirst()).toMatchObject({ calls: 1 });

      await prisma.aiUsage.updateMany({ data: { calls: 30 } });
      expect((await explain().expect(200)).body.source).toBe('cache');
      const res = await explain(s.aqua.id).expect(200);
      expect(res.body).toMatchObject({ source: 'fallback', fallbackReason: 'limit' });
      expect(res.body.text).toContain('limit');
      expect(create).toHaveBeenCalledTimes(1);
    });

    it('is removed with the account', async () => {
      create.mockResolvedValueOnce(reply(EXPLAIN, goodExplain));
      await explain().expect(200);
      await http().delete('/v1/me').set(auth(user.accessToken)).expect(204);
      expect(await prisma.aiUsage.count()).toBe(0);
    });
  });

  describe('ai-product-summary', () => {
    it('explains the rule-based score with only skin data, on the smart model', async () => {
      create.mockResolvedValueOnce(reply(SUMMARY, goodSummary));
      const res = await summary().expect(200);
      expect(res.body).toMatchObject({ source: 'ai', text: goodSummary.summary });

      const params = create.mock.calls[0]![0];
      expect(params.model).toBe('test-smart-model');
      const sent = String(params.messages[0]!.content);
      expect(sent).toContain('"type": "combination"');
      expect(sent).toContain('breakouts');
      expect(sent).toContain('"score": 70');
      expect(JSON.stringify(params)).not.toMatch(/ola@example\.com|Kowalska|Ola/);
      expect(JSON.stringify(params)).not.toContain(user.user.id);

      expect((await summary().expect(200)).body.source).toBe('cache');
      expect(create).toHaveBeenCalledTimes(1);
    });

    it('needs a skin profile; another profile gets its own text', async () => {
      const other = (
        await http()
          .post('/v1/auth/register')
          .send({ email: 'b@example.com', password: 'correct-horse-1' })
          .expect(201)
      ).body as Tokens;
      await http()
        .get(`/v1/ai/products/${s.product.id}/summary`)
        .set(auth(other.accessToken))
        .expect(409);

      await http()
        .put('/v1/me/quiz')
        .set(auth(other.accessToken))
        .send({ ...sampleQuiz, concerns: ['hydration'], avoidGroups: [], avoidIngredients: [] })
        .expect(200);
      create.mockResolvedValue(reply(SUMMARY, goodSummary));
      await summary().expect(200);
      await http()
        .get(`/v1/ai/products/${s.product.id}/summary`)
        .set(auth(other.accessToken))
        .expect(200);
      expect(create).toHaveBeenCalledTimes(2); // different profile hash → different cache entry
    });

    it('404 for an unknown product', async () => {
      await summary(999999).expect(404);
    });
  });

  describe('ai-parse-inci fallback in /v1/analyze/inci', () => {
    const messy = 'Woda destylowana z kwiatów, Witamina B3 (niacynamid) 5%, Ekstrakt z czegoś';

    it('kicks in when the rules leave many names unknown and keeps the better reading', async () => {
      create.mockResolvedValueOnce(
        reply(PARSE, { ingredients: ['Aqua', 'Niacinamide', 'Mystery Extract'] }),
      );
      const res = await http()
        .post('/v1/analyze/inci')
        .set(auth(user.accessToken))
        .send({ inci: messy })
        .expect(200);
      expect(res.body.parsedBy).toBe('ai');
      expect(res.body.unknown).toEqual(['MYSTERY EXTRACT']);
      expect(res.body.match).toMatchObject({ status: 'ok' });
      expect(create.mock.calls[0]![0].tools?.[0]).toMatchObject({ name: PARSE });
    });

    it('keeps the rules when AI does not recognise more', async () => {
      create.mockResolvedValueOnce(reply(PARSE, { ingredients: ['Foo', 'Bar', 'Baz'] }));
      const res = await http()
        .post('/v1/analyze/inci')
        .set(auth(user.accessToken))
        .send({ inci: messy })
        .expect(200);
      expect(res.body.parsedBy).toBe('rules');
    });

    it('is not used for clean lists or without an account', async () => {
      await http()
        .post('/v1/analyze/inci')
        .set(auth(user.accessToken))
        .send({ inci: 'Aqua, Niacinamide' })
        .expect(200);
      await http().post('/v1/analyze/inci').send({ inci: messy }).expect(200);
      expect(create).not.toHaveBeenCalled();
    });
  });
});
