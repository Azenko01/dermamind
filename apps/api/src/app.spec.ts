import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AI_TRANSPORT } from './ai/ai-transport';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { setupApp } from './setup';

/** HTTP tests without a database: Prisma is replaced by a stub. DB-backed tests come with real endpoints. */
describe('API v1 (e2e)', () => {
  let app: INestApplication;
  const prisma = { $queryRaw: jest.fn(), $disconnect: jest.fn() };

  beforeAll(async () => {
    process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_SECRET ??= 'test-secret-that-is-at-least-32-characters-long';
    process.env.MIN_APP_VERSION = '0.2.0';
    process.env.LATEST_APP_VERSION = '0.3.0';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(AI_TRANSPORT)
      .useValue(null)
      .compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
  });

  afterAll(() => app.close());

  it('GET /v1/health → 200 when the DB answers', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    const res = await request(app.getHttpServer()).get('/v1/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'ok' });
  });

  it('GET /v1/health → 503 when the DB is down', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('connection refused'));
    await request(app.getHttpServer()).get('/v1/health').expect(503);
  });

  it('GET /v1/app-config returns versions from env and feature flags', async () => {
    const res = await request(app.getHttpServer()).get('/v1/app-config').expect(200);
    expect(res.body).toEqual({
      minAppVersion: '0.2.0',
      latestAppVersion: '0.3.0',
      features: { ai: false, scanner: false },
    });
  });

  it('routes are only available under /v1', async () => {
    await request(app.getHttpServer()).get('/health').expect(404);
  });
});
