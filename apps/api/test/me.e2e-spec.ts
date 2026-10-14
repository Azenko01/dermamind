import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, registerUser, resetDb, sampleQuiz } from './helpers';

describe('me (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => ({ app, prisma } = await createTestApp()));
  beforeEach(() => resetDb(prisma));
  afterAll(() => app.close());

  it('GET /v1/me returns an empty profile before the quiz', async () => {
    const user = await registerUser(app);
    const res = await http().get('/v1/me').set(auth(user.accessToken)).expect(200);
    expect(res.body).toMatchObject({
      id: user.user.id,
      email: 'ola@example.com',
      isGuest: false,
      profile: { skinType: null, concerns: [], quizAnswers: null, onboardedAt: null, locale: 'pl' },
    });
  });

  it('PUT /v1/me/quiz computes the skin profile on the server and stores everything', async () => {
    const limonene = await prisma.ingredient.create({
      data: { inciName: 'LIMONENE', displayName: 'Limonene' },
    });
    const alcohol = await prisma.ingredient.create({
      data: {
        inciName: 'ALCOHOL',
        displayName: 'Alcohol',
        aliases: { create: { alias: 'alcoholdenat' } },
      },
    });

    const user = await registerUser(app);
    const res = await http()
      .put('/v1/me/quiz')
      .set(auth(user.accessToken))
      .send({ ...sampleQuiz, avoidIngredients: [...sampleQuiz.avoidIngredients, 'UNKNOWN THING'] })
      .expect(200);

    expect(res.body.profile).toMatchObject({
      skinType: 'combination',
      oilLevel: 3,
      barrierLevel: 2,
      sensitivityLevel: 3,
      isSensitive: true,
      concerns: ['redness', 'breakouts'],
      mustHaves: ['vegan'],
      usesSpf: 'daily',
      budget: '30_70',
      avoidIngredients: ['LIMONENE', 'ALCOHOL DENAT.', 'UNKNOWN THING'],
    });
    expect(res.body.profile.avoidGroups.sort()).toEqual(['fragrance', 'fungal_acne']);
    expect(res.body.profile.onboardedAt).toEqual(expect.any(String));

    const concerns = await prisma.profileConcern.findMany({
      where: { userId: user.user.id },
      include: { concern: true },
      orderBy: { priority: 'asc' },
    });
    expect(concerns.map((c) => [c.concern.code, c.priority])).toEqual([
      ['redness', 1],
      ['breakouts', 2],
    ]);

    // known INCI names (directly or through an alias) are linked; unknown ones stay in quiz_answers
    const avoided = await prisma.avoidedIngredient.findMany({ where: { userId: user.user.id } });
    expect(avoided.map((a) => a.ingredientId).sort()).toEqual([limonene.id, alcohol.id].sort());
  });

  it('a second quiz replaces the previous answers', async () => {
    const user = await registerUser(app);
    await http().put('/v1/me/quiz').set(auth(user.accessToken)).send(sampleQuiz).expect(200);
    const res = await http()
      .put('/v1/me/quiz')
      .set(auth(user.accessToken))
      .send({
        ...sampleQuiz,
        concerns: ['hydration'],
        avoidGroups: [],
        shine: { tZone: 'dry', cheeks: 'dry', jaw: 'none' },
      })
      .expect(200);
    expect(res.body.profile).toMatchObject({
      skinType: 'dry',
      concerns: ['hydration'],
      avoidGroups: [],
    });
  });

  it.each([
    ['unknown enum value', { ...sampleQuiz, struggle: 'boredom' }],
    ['no concerns', { ...sampleQuiz, concerns: [] }],
    ['duplicate concerns', { ...sampleQuiz, concerns: ['pores', 'pores'] }],
    ['bad shine zone value', { ...sampleQuiz, shine: { ...sampleQuiz.shine, cheeks: 'sparkly' } }],
    ['missing field', { ...sampleQuiz, budget: undefined }],
    ['extra field', { ...sampleQuiz, skinType: 'oily' }],
    ['markup in ingredient', { ...sampleQuiz, avoidIngredients: ['<script>'] }],
  ])('PUT /v1/me/quiz rejects %s with 400', async (_, body) => {
    const user = await registerUser(app);
    await http().put('/v1/me/quiz').set(auth(user.accessToken)).send(body).expect(400);
  });

  it('each user only ever sees their own profile', async () => {
    const a = await registerUser(app, 'a@example.com');
    const b = await registerUser(app, 'b@example.com');
    await http().put('/v1/me/quiz').set(auth(a.accessToken)).send(sampleQuiz).expect(200);

    const res = await http().get('/v1/me').set(auth(b.accessToken)).expect(200);
    expect(res.body).toMatchObject({ id: b.user.id, profile: { skinType: null } });
  });

  it('DELETE /v1/me removes the account with all its data', async () => {
    const user = await registerUser(app);
    await http().put('/v1/me/quiz').set(auth(user.accessToken)).send(sampleQuiz).expect(200);

    await http().delete('/v1/me').set(auth(user.accessToken)).expect(204);

    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.profile.count()).toBe(0);
    expect(await prisma.profileConcern.count()).toBe(0);
    expect(await prisma.shelf.count()).toBe(0);
    expect(await prisma.refreshToken.count()).toBe(0);
    // the access token still verifies for up to 15 min, but the account is gone
    await http().get('/v1/me').set(auth(user.accessToken)).expect(401);
    await http().post('/v1/auth/refresh').send({ refreshToken: user.refreshToken }).expect(401);
  });
});
