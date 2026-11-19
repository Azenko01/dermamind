import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, registerUser, resetDb, sampleQuiz, type Tokens } from './helpers';

/**
 * Profile survives every way into an account (the bug: an e-mail account without a skin profile).
 * The app keeps answers on the phone until O22, then a guest or e-mail account gets them.
 */
describe('skin profile across guest, register and login (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => ({ app, prisma } = await createTestApp()));
  beforeEach(() => resetDb(prisma));
  afterAll(() => app.close());

  const guestWithQuiz = async (): Promise<Tokens> => {
    const guest = (await http().post('/v1/auth/guest').expect(201)).body as Tokens;
    await http().put('/v1/me/quiz').set(auth(guest.accessToken)).send(sampleQuiz).expect(200);
    return guest;
  };
  const me = async (token: string) =>
    (await http().get('/v1/me').set(auth(token)).expect(200)).body as {
      id: string;
      isGuest: boolean;
      email: string | null;
      profile: { skinType: string | null; concerns: string[]; onboardedAt: string | null };
    };

  it('guest quiz → register keeps the same account and its profile', async () => {
    const guest = await guestWithQuiz();
    const before = await me(guest.accessToken);
    const reg = await http()
      .post('/v1/auth/register')
      .set(auth(guest.accessToken))
      .send({ email: 'ola@example.com', password: 'correct-horse-1' })
      .expect(201);
    const after = await me(reg.body.accessToken);
    expect(after).toMatchObject({ id: before.id, isGuest: false, email: 'ola@example.com' });
    expect(after.profile.skinType).toBe(before.profile.skinType);
    expect(after.profile.concerns).toEqual(['redness', 'breakouts']);
  });

  it('login on a fresh install loads the profile from the server', async () => {
    const user = await registerUser(app);
    await http().put('/v1/me/quiz').set(auth(user.accessToken)).send(sampleQuiz).expect(200);
    // new phone: no token at all
    const login = await http()
      .post('/v1/auth/login')
      .send({ email: 'ola@example.com', password: 'correct-horse-1' })
      .expect(200);
    const profile = (await me(login.body.accessToken)).profile;
    expect(profile.skinType).not.toBeNull();
    expect(profile.onboardedAt).not.toBeNull();
  });

  it('"Mam już konto" after the quiz: the guest profile and shelves move to an account without one', async () => {
    const account = await registerUser(app); // signed up earlier from the login screen, no quiz
    expect((await me(account.accessToken)).profile.skinType).toBeNull();

    const guest = await guestWithQuiz();
    const product = await prisma.product.create({
      data: { name: 'Krem', category: 'moisturizer' },
    });
    await http()
      .post('/v1/me/shelves/own/items')
      .set(auth(guest.accessToken))
      .send({ productId: product.id })
      .expect(204);

    const login = await http()
      .post('/v1/auth/login')
      .set(auth(guest.accessToken))
      .send({ email: 'ola@example.com', password: 'correct-horse-1' })
      .expect(200);
    const after = await me(login.body.accessToken);
    expect(after.id).toBe(account.user.id);
    expect(after.profile.skinType).not.toBeNull();
    expect(after.profile.concerns).toEqual(['redness', 'breakouts']);
    const shelves = await http()
      .get('/v1/me/shelves')
      .set(auth(login.body.accessToken))
      .expect(200);
    const own = shelves.body.shelves.find((s: { kind: string }) => s.kind === 'own');
    expect(own.items.map((i: { product: { id: number } }) => i.product.id)).toEqual([product.id]);
    // the guest account is gone
    expect(await prisma.user.count({ where: { id: guest.user.id } })).toBe(0);
  });

  it('never overwrites a profile the account already has', async () => {
    const account = await registerUser(app);
    await http()
      .put('/v1/me/quiz')
      .set(auth(account.accessToken))
      .send({ ...sampleQuiz, concerns: ['dark_spots'] })
      .expect(200);
    const guest = await guestWithQuiz();
    const login = await http()
      .post('/v1/auth/login')
      .set(auth(guest.accessToken))
      .send({ email: 'ola@example.com', password: 'correct-horse-1' })
      .expect(200);
    expect((await me(login.body.accessToken)).profile.concerns).toEqual(['dark_spots']);
  });

  describe('Ustawienia', () => {
    it('PATCH /v1/me changes and clears the name', async () => {
      const user = await registerUser(app);
      const res = await http()
        .patch('/v1/me')
        .set(auth(user.accessToken))
        .send({ displayName: '  Ola  ' })
        .expect(200);
      expect(res.body.profile.displayName).toBe('Ola');
      const cleared = await http()
        .patch('/v1/me')
        .set(auth(user.accessToken))
        .send({ displayName: '' })
        .expect(200);
      expect(cleared.body.profile.displayName).toBeNull();
      await http()
        .patch('/v1/me')
        .set(auth(user.accessToken))
        .send({ displayName: 'x'.repeat(51) })
        .expect(400);
    });

    it('changes the password and signs out other sessions', async () => {
      const user = await registerUser(app);
      await http()
        .post('/v1/auth/password/change')
        .set(auth(user.accessToken))
        .send({ currentPassword: 'wrong-password', newPassword: 'new-horse-22' })
        .expect(401);
      const res = await http()
        .post('/v1/auth/password/change')
        .set(auth(user.accessToken))
        .send({ currentPassword: 'correct-horse-1', newPassword: 'new-horse-22' })
        .expect(200);
      expect(res.body.accessToken).toEqual(expect.any(String));
      // the old refresh token no longer works, the new password does
      await http().post('/v1/auth/refresh').send({ refreshToken: user.refreshToken }).expect(401);
      await http()
        .post('/v1/auth/login')
        .send({ email: 'ola@example.com', password: 'new-horse-22' })
        .expect(200);
      await http()
        .post('/v1/auth/login')
        .send({ email: 'ola@example.com', password: 'correct-horse-1' })
        .expect(401);
    });

    it('a guest has no password to change', async () => {
      const guest = (await http().post('/v1/auth/guest').expect(201)).body as Tokens;
      await http()
        .post('/v1/auth/password/change')
        .set(auth(guest.accessToken))
        .send({ currentPassword: 'whatever-1', newPassword: 'new-horse-22' })
        .expect(403);
    });
  });
});
