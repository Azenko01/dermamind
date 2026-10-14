import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AI_TRANSPORT, type AiTransport } from '../src/ai/ai-transport';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup';

/** The Claude transport is always replaced: null = "no API key", or a mock from the test. */
export async function createTestApp(aiTransport: AiTransport | null = null): Promise<{
  app: INestApplication<App>;
  prisma: PrismaService;
}> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AI_TRANSPORT)
    .useValue(aiTransport)
    .compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>({ logger: false });
  setupApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

/** Wipes user data and test catalogue rows; dictionaries from migrations stay. */
export async function resetDb(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "users", "ingredient_aliases", "ingredients", "products", "brands", "product_submissions", "ai_cache" RESTART IDENTITY CASCADE',
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
