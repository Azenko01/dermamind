import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, registerUser, resetDb, sampleQuiz, type Tokens } from './helpers';

describe('auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => ({ app, prisma } = await createTestApp()));
  beforeEach(() => resetDb(prisma));
  afterAll(() => app.close());

  describe('guest', () => {
    it('creates an anonymous account with a profile and 3 system shelves', async () => {
      const res = await http().post('/v1/auth/guest').expect(201);
      const body = res.body as Tokens & { expiresIn: number };
      expect(body.user).toMatchObject({ isGuest: true, email: null });
      expect(body.expiresIn).toBe(900);

      const shelves = await prisma.shelf.findMany({ where: { userId: body.user.id } });
      expect(shelves.map((s) => s.kind).sort()).toEqual(['avoid', 'like', 'own']);

      await http().get('/v1/me').set(auth(body.accessToken)).expect(200);
    });
  });

  describe('register / login', () => {
    it('registers with a normalised e-mail and stores only an argon2 hash', async () => {
      const res = await http()
        .post('/v1/auth/register')
        .send({ email: '  Ola@Example.COM ', password: 'correct-horse-1', displayName: 'Ola' })
        .expect(201);
      expect((res.body as Tokens).user).toMatchObject({ email: 'ola@example.com', isGuest: false });

      const user = await prisma.user.findUniqueOrThrow({
        where: { email: 'ola@example.com' },
        include: { profile: true },
      });
      expect(user.passwordHash).toMatch(/^\$argon2id\$/);
      expect(user.profile?.displayName).toBe('Ola');
    });

    it('rejects duplicate e-mails and invalid input', async () => {
      await registerUser(app);
      await http()
        .post('/v1/auth/register')
        .send({ email: 'OLA@example.com', password: 'another-pass-1' })
        .expect(409);
      await http()
        .post('/v1/auth/register')
        .send({ email: 'x@y.pl', password: 'short' })
        .expect(400);
      await http()
        .post('/v1/auth/register')
        .send({ email: 'nope', password: 'long-enough' })
        .expect(400);
      await http()
        .post('/v1/auth/register')
        .send({ email: 'a@b.pl', password: 'long-enough', role: 'admin' })
        .expect(400);
    });

    it('logs in with the right password only', async () => {
      await registerUser(app);
      await http()
        .post('/v1/auth/login')
        .send({ email: 'ola@example.com', password: 'correct-horse-1' })
        .expect(200);
      await http()
        .post('/v1/auth/login')
        .send({ email: 'ola@example.com', password: 'wrong-password' })
        .expect(401);
      await http()
        .post('/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'whatever-123' })
        .expect(401);
    });
  });

  describe('guest upgrade', () => {
    it('keeps the same account and quiz data when a guest registers', async () => {
      const guest = (await http().post('/v1/auth/guest').expect(201)).body as Tokens;
      await http().put('/v1/me/quiz').set(auth(guest.accessToken)).send(sampleQuiz).expect(200);

      const res = await http()
        .post('/v1/auth/register')
        .set(auth(guest.accessToken))
        .send({ email: 'ola@example.com', password: 'correct-horse-1' })
        .expect(201);
      const upgraded = res.body as Tokens;
      expect(upgraded.user).toMatchObject({ id: guest.user.id, isGuest: false });

      const me = await http().get('/v1/me').set(auth(upgraded.accessToken)).expect(200);
      expect(me.body).toMatchObject({ isGuest: false, profile: { skinType: 'combination' } });

      // the guest's refresh token is gone with the upgrade
      await http().post('/v1/auth/refresh').send({ refreshToken: guest.refreshToken }).expect(401);
    });

    it('refuses to register on top of a real account', async () => {
      const user = await registerUser(app);
      await http()
        .post('/v1/auth/register')
        .set(auth(user.accessToken))
        .send({ email: 'other@example.com', password: 'correct-horse-1' })
        .expect(409);
    });
  });

  describe('refresh rotation', () => {
    it('issues a new pair and makes the old refresh token unusable', async () => {
      const first = await registerUser(app);
      const res = await http()
        .post('/v1/auth/refresh')
        .send({ refreshToken: first.refreshToken })
        .expect(200);
      const second = res.body as Tokens;
      expect(second.refreshToken).not.toBe(first.refreshToken);
      await http().get('/v1/me').set(auth(second.accessToken)).expect(200);
    });

    it('revokes every session when a used refresh token comes back (theft detection)', async () => {
      const first = await registerUser(app);
      const second = (
        await http().post('/v1/auth/refresh').send({ refreshToken: first.refreshToken }).expect(200)
      ).body as Tokens;

      await http().post('/v1/auth/refresh').send({ refreshToken: first.refreshToken }).expect(401);
      await http().post('/v1/auth/refresh').send({ refreshToken: second.refreshToken }).expect(401);
    });

    it('rejects unknown and expired refresh tokens', async () => {
      const user = await registerUser(app);
      await http().post('/v1/auth/refresh').send({ refreshToken: 'made-up' }).expect(401);

      await prisma.refreshToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
      await http().post('/v1/auth/refresh').send({ refreshToken: user.refreshToken }).expect(401);
    });

    it('stores refresh tokens hashed', async () => {
      const user = await registerUser(app);
      const rows = await prisma.refreshToken.findMany();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.tokenHash).not.toContain(user.refreshToken);
      expect(rows[0]?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  it('logout revokes the refresh token', async () => {
    const user = await registerUser(app);
    await http().post('/v1/auth/logout').send({ refreshToken: user.refreshToken }).expect(204);
    await http().post('/v1/auth/refresh').send({ refreshToken: user.refreshToken }).expect(401);
  });

  it('password reset answers 202 for known and unknown e-mails alike', async () => {
    await registerUser(app);
    await http().post('/v1/auth/password/reset').send({ email: 'ola@example.com' }).expect(202);
    await http().post('/v1/auth/password/reset').send({ email: 'ghost@example.com' }).expect(202);
  });

  it('Apple and Google sign-in are not configured yet (501)', async () => {
    await http().post('/v1/auth/apple').send({ identityToken: 'x' }).expect(501);
    await http().post('/v1/auth/google').send({ idToken: 'x' }).expect(501);
  });

  it('protected routes need a valid access token', async () => {
    await http().get('/v1/me').expect(401);
    await http().get('/v1/me').set(auth('not-a-jwt')).expect(401);
    await http().get('/v1/me').set({ Authorization: 'Basic abc' }).expect(401);
  });
});
