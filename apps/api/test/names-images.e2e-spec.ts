import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, registerUser, resetDb, sampleQuiz } from './helpers';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xd9]);

describe('Polish names and own product photos (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let dir: string;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'dermamind-images-'));
    writeFileSync(join(dir, '5901234123457.jpg'), JPEG);
    process.env.PRODUCT_IMAGES_DIR = dir;
    ({ app, prisma } = await createTestApp());
  });
  beforeEach(() => resetDb(prisma));
  afterAll(async () => {
    delete process.env.PRODUCT_IMAGES_DIR;
    rmSync(dir, { recursive: true, force: true });
    await app.close();
  });

  it('avoided-ingredient chips get the Polish name, unknown names their typed form', async () => {
    await prisma.ingredient.create({
      data: {
        inciName: 'ALCOHOL DENAT.',
        displayName: 'Alcohol Denat.',
        namePl: 'Alkohol denaturowany',
        aliases: { create: [{ alias: 'alcoholdenat' }] },
      },
    });
    await prisma.ingredient.create({
      data: { inciName: 'BUTYLENE GLYCOL', displayName: 'Butylene Glycol' },
    });
    const user = await registerUser(app);
    const res = await http()
      .put('/v1/me/quiz')
      .set(auth(user.accessToken))
      .send({
        ...sampleQuiz,
        avoidIngredients: ['ALCOHOL DENAT.', 'BUTYLENE GLYCOL', 'MYSTERY THING'],
      })
      .expect(200);
    expect(res.body.profile.avoidIngredientNames).toEqual([
      { inci: 'ALCOHOL DENAT.', name: 'Alkohol denaturowany', ingredientId: expect.any(Number) },
      { inci: 'BUTYLENE GLYCOL', name: 'Butylene Glycol', ingredientId: expect.any(Number) },
      { inci: 'MYSTERY THING', name: 'Mystery Thing', ingredientId: null },
    ]);
  });

  it('serves our own photo and puts it before the imported one', async () => {
    const product = await prisma.product.create({
      data: {
        name: 'Krem',
        category: 'moisturizer',
        barcode: '5901234123457',
        imageUrl: 'https://images.openbeautyfacts.org/x.jpg',
        ownImage: '5901234123457.jpg',
      },
    });
    const detail = await http().get(`/v1/products/${product.id}`).expect(200);
    expect(detail.body.imageUrl).toBe('/v1/product-images/5901234123457.jpg');

    const img = await http().get('/v1/product-images/5901234123457.jpg').expect(200);
    expect(img.headers['content-type']).toBe('image/jpeg');
    expect(img.headers['cache-control']).toContain('max-age');
    expect(Buffer.from(img.body as Buffer).equals(JPEG)).toBe(true);

    await http().get('/v1/product-images/404.jpg').expect(404);
    await http().get('/v1/product-images/x.gif').expect(400);
    await http().get('/v1/product-images/..%2F.env').expect(400);

    await prisma.product.update({ where: { id: product.id }, data: { ownImage: null } });
    const imported = await http().get(`/v1/products/${product.id}`).expect(200);
    expect(imported.body.imageUrl).toBe('https://images.openbeautyfacts.org/x.jpg');
  });

  it('ingredient rows and the ingredient card carry the Polish name', async () => {
    const ing = await prisma.ingredient.create({
      data: { inciName: 'COCOS NUCIFERA OIL', displayName: 'Coconut Oil', namePl: 'Olej kokosowy' },
    });
    const product = await prisma.product.create({
      data: {
        name: 'Balsam',
        category: 'moisturizer',
        ingredients: { create: [{ ingredientId: ing.id, position: 1 }] },
      },
    });
    const detail = await http().get(`/v1/products/${product.id}`).expect(200);
    expect(detail.body.ingredients[0]).toMatchObject({ namePl: 'Olej kokosowy' });
    const card = await http().get(`/v1/ingredients/${ing.id}`).expect(200);
    expect(card.body).toMatchObject({ displayName: 'Coconut Oil', namePl: 'Olej kokosowy' });
  });
});
