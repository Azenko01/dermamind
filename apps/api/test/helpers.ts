import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup';

export async function createTestApp(): Promise<{
  app: INestApplication<App>;
  prisma: PrismaService;
}> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>({ logger: false });
  setupApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

/** Wipes user data and test catalogue rows; dictionaries from migrations stay. */
export async function resetDb(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "users", "ingredient_aliases", "ingredients", "products", "brands" RESTART IDENTITY CASCADE',
  );
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string | null; isGuest: boolean };
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function registerUser(
  app: INestApplication<App>,
  email = 'ola@example.com',
  password = 'correct-horse-1',
): Promise<Tokens> {
  const res = await request(app.getHttpServer())
    .post('/v1/auth/register')
    .send({ email, password })
    .expect(201);
  return res.body as Tokens;
}

export const sampleQuiz = {
  struggle: 'irritation',
  concerns: ['redness', 'breakouts'],
  shine: { tZone: 'very', cheeks: 'none', jaw: 'slightly' },
  afterWash: 'comfortable',
  symptoms: ['flaking', 'tightness'],
  reactionFrequency: 'sometimes',
  triggers: ['cosmetics'],
  seasonal: 'no_change',
  avoidGroups: ['fragrance', 'fungal_acne'],
  avoidIngredients: [' limonene ', 'Alcohol  Denat.'],
  mustHaves: ['vegan'],
  usesSpf: 'daily',
  budget: '30_70',
};
